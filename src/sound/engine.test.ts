import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tradeQuackMs, VOICE_MS, type Note } from './cues'
import {
  capVoices,
  FADE_MS,
  LEVELS,
  MAX_VOICES,
  MIN_GAP_MS,
  QUACK_VARY_SEMITONES,
  SoundEngine,
} from './engine'

/** Enough of AudioContext to record what would play, when, and how it fades. */
interface FakeSource {
  readonly kind: 'oscillator' | 'buffer'
  buffer: unknown
  rate: number
  startAt: number | null
  stopAt: number[]
  /** The level changes on this sound's gain: [kind, value, time]. */
  gain: [string, number, number][]
}

const QUACK = { duration: 0.225 } as unknown as AudioBuffer

function fakeContext() {
  const sources: FakeSource[] = []
  const param = (log?: [string, number, number][]) => ({
    value: 0,
    setValueAtTime: vi.fn((v: number, t: number) => log?.push(['set', v, t])),
    linearRampToValueAtTime: vi.fn((v: number, t: number) => log?.push(['linear', v, t])),
    exponentialRampToValueAtTime: vi.fn((v: number, t: number) => log?.push(['exp', v, t])),
    cancelScheduledValues: vi.fn(),
  })
  // Each gain node is created just before its source; the source takes over its log.
  let lastGainLog: [string, number, number][] = []
  const source = (kind: FakeSource['kind']) => {
    const record: FakeSource = {
      kind,
      buffer: null,
      rate: 1,
      startAt: null,
      stopAt: [],
      gain: lastGainLog,
    }
    sources.push(record)
    return {
      connect: vi.fn(),
      type: '',
      set buffer(b: unknown) {
        record.buffer = b
      },
      playbackRate: {
        set value(v: number) {
          record.rate = v
        },
      },
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
    createGain: () => {
      lastGainLog = []
      return { connect: vi.fn(), gain: param(lastGainLog) }
    },
    createDynamicsCompressor: () => ({ connect: vi.fn() }),
    createBiquadFilter: () => ({ connect: vi.fn(), type: '', Q: param(), frequency: param() }),
    createOscillator: () => source('oscillator'),
    createBufferSource: () => source('buffer'),
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
  }
  return { context: context as unknown as AudioContext, sources, resume }
}

const blip = (at: number, frequency = 440): Note => ({ voice: 'blip', frequency, at })
const quack = (at: number, rate = 1, duration?: number): Note => ({
  voice: 'quack',
  rate,
  at,
  ...(duration === undefined ? {} : { duration }),
})

let clock = 0
beforeEach(() => {
  vi.useFakeTimers()
  clock = 1000
})
afterEach(() => {
  vi.useRealTimers()
})

function setup(
  load: () => Promise<AudioBuffer> = () => Promise.resolve(QUACK),
  random: () => number = () => 0.5,
) {
  const fake = fakeContext()
  const createContext = vi.fn(() => fake.context)
  const loadQuack = vi.fn(load)
  const engine = new SoundEngine({ createContext, now: () => clock, loadQuack, random })
  return { engine, createContext, loadQuack, ...fake }
}

/** Turns sound on and lets the quack finish loading. */
async function enable(engine: SoundEngine) {
  engine.setEnabled(true)
  await vi.waitFor(() => {
    expect(engine.hasQuack).toBe(true)
  })
}

describe('SoundEngine: on and off', () => {
  it('is silent by default and sets nothing up until sound is turned on', () => {
    const { engine, createContext, loadQuack, sources } = setup()
    engine.play([blip(0)])
    expect(engine.isEnabled).toBe(false)
    expect(createContext).not.toHaveBeenCalled()
    expect(loadQuack).not.toHaveBeenCalled()
    expect(sources).toHaveLength(0)
  })

  it('creates the audio and loads the quack once, when first turned on', async () => {
    const { engine, createContext, resume, loadQuack } = setup()
    await enable(engine)
    engine.setEnabled(false)
    engine.setEnabled(true)
    expect(createContext).toHaveBeenCalledTimes(1)
    expect(loadQuack).toHaveBeenCalledTimes(1)
    expect(resume).toHaveBeenCalledTimes(2)
  })

  it('schedules each note at its time after the step', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    engine.play([blip(0), quack(70), { voice: 'splash', at: 200 }])
    // The splash is noise plus a low plunk.
    expect(sources.map((s) => s.kind)).toEqual(['oscillator', 'buffer', 'buffer', 'oscillator'])
    expect(sources.map((s) => s.startAt)).toEqual([10, 10.07, 10.2, 10.2])
    expect(sources[1]?.buffer).toBe(QUACK)
  })

  it('turning sound off fades everything out at once', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    engine.play([blip(0), quack(70)])
    engine.setEnabled(false)
    for (const source of sources) {
      expect(source.stopAt).toContain(10 + FADE_MS / 1000)
      expect(source.gain).toContainEqual(['linear', 0, 10 + FADE_MS / 1000])
    }
    engine.play([blip(0)])
    expect(sources).toHaveLength(2)
  })
})

describe('SoundEngine: the quack', () => {
  it('plays the recording at its rate, full length by default', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    engine.play([quack(0, 1.5)])
    const [played] = sources
    expect(played?.rate).toBe(1.5)
    // 0.225 s played 1.5× as fast lasts 0.15 s, then fades to silence (no click).
    expect(played?.gain.at(-1)).toEqual(['linear', 0, 10.15])
  })

  it('a quack cut short (4×) fades out cleanly at its cut', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    const first = tradeQuackMs(200)
    engine.play([quack(0, 1, first)])
    const gain = sources[0]?.gain ?? []
    const end = 10 + first / 1000
    const [lastKind, lastValue, lastAt] = gain.at(-1) ?? []
    expect([lastKind, lastValue]).toEqual(['linear', 0])
    expect(lastAt).toBeCloseTo(end, 6)
    const [holdKind, holdValue, holdAt] = gain.at(-2) ?? []
    expect([holdKind, holdValue]).toEqual(['set', LEVELS.quack])
    expect(holdAt).toBeCloseTo(end - FADE_MS / 1000, 6)
  })

  it('a varied quack moves its pitch and speed a little, within the limit', async () => {
    const top = 2 ** (QUACK_VARY_SEMITONES / 12)
    for (const [random, rate] of [
      [0, 1 / top],
      [0.5, 1],
      [0.999999, top],
    ] as const) {
      const { engine, sources } = setup(undefined, () => random)
      await enable(engine)
      engine.play([{ ...quack(0), vary: true }])
      expect(sources[0]?.rate).toBeCloseTo(rate, 4)
    }
  })

  it('the finale’s quacks are never varied, so the scale always rises', async () => {
    const { engine, sources } = setup(undefined, () => 0.999)
    await enable(engine)
    engine.play([quack(0, 0.75), quack(110, 0.84)])
    expect(sources.map((s) => s.rate)).toEqual([0.75, 0.84])
  })

  it('the splash is louder than the quack, and the plip is quiet', async () => {
    expect(LEVELS.splash).toBeGreaterThan(LEVELS.quack)
    expect(LEVELS.plip).toBeLessThan(LEVELS.quack)
    const { engine, sources } = setup()
    await enable(engine)
    engine.play([
      { voice: 'plip', frequency: 600, at: 0 },
      { voice: 'splash', at: 100 },
    ])
    // A plip is one tone; a splash is noise plus a low plunk, starting together.
    expect(sources.map((s) => [s.kind, s.startAt])).toEqual([
      ['oscillator', 10],
      ['buffer', 10.1],
      ['oscillator', 10.1],
    ])
    expect(sources[0]?.gain).toContainEqual(['linear', LEVELS.plip, 10.005])
    expect(sources[1]?.gain).toContainEqual(['linear', LEVELS.splash, 10.106])
  })

  it('before the recording has loaded, quacks are skipped and the rest still plays', () => {
    const { engine, sources } = setup(() => new Promise(() => undefined))
    engine.setEnabled(true)
    engine.play([quack(0), { voice: 'splash', at: 100 }])
    expect(sources.some((s) => s.buffer === QUACK)).toBe(false)
    expect(sources.map((s) => s.kind)).toEqual(['buffer', 'oscillator'])
  })

  it('if loading fails, nothing breaks, and it tries again next time', async () => {
    let calls = 0
    const { engine, loadQuack } = setup(() =>
      ++calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(QUACK),
    )
    engine.setEnabled(true)
    await vi.waitFor(() => {
      expect(loadQuack).toHaveBeenCalledTimes(1)
    })
    // Let the failed load settle.
    for (let k = 0; k < 5; k++) await Promise.resolve()
    expect(engine.hasQuack).toBe(false)
    engine.setEnabled(false)
    await enable(engine)
    expect(loadQuack).toHaveBeenCalledTimes(2)
  })
})

describe('SoundEngine: never piling up', () => {
  it('a new step fades out what the last step was still playing', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    engine.play([quack(0), quack(255)])
    clock += 800
    engine.play([blip(0)])
    expect(sources[0]?.stopAt).toContain(10 + FADE_MS / 1000)
    expect(sources[1]?.stopAt).toContain(10 + FADE_MS / 1000)
    expect(sources).toHaveLength(3)
  })

  it('steps closer than the gap: only the newest plays, once the gap has passed', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    engine.play([blip(0, 300)])
    clock += 20
    engine.play([blip(0, 400)])
    clock += 20
    engine.play([blip(0, 500)])
    expect(sources).toHaveLength(1)
    clock += MIN_GAP_MS
    vi.advanceTimersByTime(MIN_GAP_MS)
    expect(sources).toHaveLength(2)
  })

  it('caps how many sound at once, counting each note’s own length', () => {
    const chord = Array.from({ length: 8 }, (_, k) => blip(0, 300 + k * 50))
    expect(capVoices(chord)).toHaveLength(MAX_VOICES)
    // Short cut quacks don't overlap, so all of them play.
    const cut = Array.from({ length: 6 }, (_, k) => quack(k * 100, 1, 90))
    expect(capVoices(cut)).toHaveLength(6)
  })

  it('lets the finale through: its quacks overlap at most three at a time', () => {
    const scale = Array.from({ length: 12 }, (_, k) => quack(k * 110))
    expect(capVoices(scale)).toHaveLength(12)
  })

  it('at 4× speed (a step every 200ms), every step’s sounds end inside the step', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    for (let step = 0; step < 10; step++) {
      engine.play([
        { ...quack(0, 1, tradeQuackMs(200)), vary: true },
        { voice: 'plip', frequency: 600, at: 100 },
      ])
      clock += 200
    }
    for (const source of sources) {
      const end = source.gain.at(-1)?.[2] ?? Infinity
      expect(end - 10).toBeLessThanOrEqual(0.2)
    }
    expect(VOICE_MS.plip + 100).toBeLessThan(200)
  })
})
