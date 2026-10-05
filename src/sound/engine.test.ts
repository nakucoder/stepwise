import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VOICE_MS, type Note } from './cues'
import { capVoices, MAX_VOICES, MIN_GAP_MS, SoundEngine } from './engine'

/** Enough of AudioContext to record what would play, and when. */
interface FakeSource {
  readonly kind: 'oscillator' | 'noise'
  startAt: number | null
  stopAt: number[]
}

function fakeContext() {
  const sources: FakeSource[] = []
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  })
  const node = () => ({ connect: vi.fn() })
  const source = (kind: FakeSource['kind']) => {
    const record: FakeSource = { kind, startAt: null, stopAt: [] }
    sources.push(record)
    return {
      ...node(),
      type: '',
      buffer: null,
      frequency: param(),
      start: (when: number) => {
        record.startAt = when
      },
      stop: (when: number) => {
        record.stopAt.push(when)
      },
    }
  }
  const resume = vi.fn(() => Promise.resolve())
  const context = {
    currentTime: 10,
    sampleRate: 8000,
    destination: {},
    resume,
    createGain: () => ({ ...node(), gain: param() }),
    createDynamicsCompressor: () => node(),
    createBiquadFilter: () => ({ ...node(), type: '', Q: param(), frequency: param() }),
    createOscillator: () => source('oscillator'),
    createBufferSource: () => source('noise'),
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
  }
  return { context: context as unknown as AudioContext, sources, resume }
}

const squeak = (at: number, frequency = 440): Note => ({ voice: 'squeak', frequency, at })

let clock = 0
beforeEach(() => {
  vi.useFakeTimers()
  clock = 1000
})
afterEach(() => {
  vi.useRealTimers()
})

function setup() {
  const fake = fakeContext()
  const createContext = vi.fn(() => fake.context)
  const engine = new SoundEngine({ createContext, now: () => clock })
  return { engine, createContext, ...fake }
}

describe('SoundEngine: on and off', () => {
  it('is silent by default and sets nothing up until sound is turned on', () => {
    const { engine, createContext, sources } = setup()
    engine.play([squeak(0)])
    expect(engine.isEnabled).toBe(false)
    expect(createContext).not.toHaveBeenCalled()
    expect(sources).toHaveLength(0)
  })

  it('creates the audio once, when first turned on, and resumes it every time', () => {
    const { engine, createContext, resume } = setup()
    engine.setEnabled(true)
    engine.setEnabled(false)
    engine.setEnabled(true)
    expect(createContext).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(2)
  })

  it('schedules each note at its time after the step', () => {
    const { engine, sources } = setup()
    engine.setEnabled(true)
    engine.play([squeak(0), squeak(70), { voice: 'splash', at: 200 }])
    expect(sources.map((s) => s.kind)).toEqual(['oscillator', 'oscillator', 'noise'])
    expect(sources.map((s) => s.startAt)).toEqual([10, 10.07, 10.2])
  })

  it('turning sound off stops everything at once', () => {
    const { engine, sources } = setup()
    engine.setEnabled(true)
    engine.play([squeak(0), squeak(70)])
    engine.setEnabled(false)
    for (const source of sources) expect(source.stopAt).toContain(10)
    engine.play([squeak(0)])
    expect(sources).toHaveLength(2)
  })
})

describe('SoundEngine: never piling up', () => {
  it('a new step stops what the last step was still playing', () => {
    const { engine, sources } = setup()
    engine.setEnabled(true)
    engine.play([squeak(0), squeak(70)])
    clock += 200
    engine.play([squeak(0)])
    expect(sources[0]?.stopAt).toContain(10)
    expect(sources[1]?.stopAt).toContain(10)
    expect(sources).toHaveLength(3)
  })

  it('steps closer than the gap: only the newest plays, once the gap has passed', () => {
    const { engine, sources } = setup()
    engine.setEnabled(true)
    engine.play([squeak(0, 300)])
    clock += 20
    engine.play([squeak(0, 400)])
    clock += 20
    engine.play([squeak(0, 500)])
    expect(sources).toHaveLength(1)
    clock += MIN_GAP_MS
    vi.advanceTimersByTime(MIN_GAP_MS)
    expect(sources).toHaveLength(2)
  })

  it('caps how many sound at once', () => {
    const chord = Array.from({ length: 8 }, (_, k) => squeak(0, 300 + k * 50))
    expect(capVoices(chord)).toHaveLength(MAX_VOICES)
  })

  it('lets the sorted scale through: its notes barely overlap', () => {
    const scale = Array.from({ length: 12 }, (_, k) => squeak(k * 110))
    expect(capVoices(scale)).toHaveLength(12)
  })

  it('at 4× speed (a step every 200ms), every step’s sounds end before the next begins', () => {
    const { engine, sources } = setup()
    engine.setEnabled(true)
    for (let step = 0; step < 10; step++) {
      engine.play([squeak(0), squeak(70)])
      clock += 200
    }
    const longest = 70 + VOICE_MS.squeak
    expect(longest).toBeLessThan(200)
    expect(sources).toHaveLength(20)
    // Each step stopped the previous step's two voices.
    for (const source of sources.slice(0, 18)) expect(source.stopAt.length).toBeGreaterThan(1)
  })
})
