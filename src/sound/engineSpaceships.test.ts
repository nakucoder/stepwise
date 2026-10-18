import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from './cues'
import { MAX_VOICES, SoundEngine } from './engine'
import { zipHz } from './spaceshipVoices'

const param = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
})

/** A source the fake context made: its kind, the buffer it plays, and its start and stops. */
interface Source {
  readonly kind: 'oscillator' | 'buffer'
  readonly frequency: ReturnType<typeof param>
  buffer: unknown
  startAt: number | null
  readonly stopAt: number[]
}

const QUACK = { duration: 0.225 } as unknown as AudioBuffer

/** Enough of AudioContext for the spaceship recipes: it records every source. */
function fakeContext() {
  const sources: Source[] = []
  const source = (kind: Source['kind']) => {
    const record: Source = { kind, frequency: param(), buffer: null, startAt: null, stopAt: [] }
    sources.push(record)
    return {
      connect: vi.fn(),
      type: '',
      set buffer(b: unknown) {
        record.buffer = b
      },
      playbackRate: param(),
      frequency: record.frequency,
      start: (when: number) => {
        record.startAt = when
      },
      stop: (when: number) => {
        record.stopAt.push(when)
      },
    }
  }
  const context = {
    currentTime: 10,
    sampleRate: 8000,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createGain: () => ({ connect: vi.fn(), gain: param() }),
    createDynamicsCompressor: () => ({ connect: vi.fn() }),
    createBiquadFilter: () => ({ connect: vi.fn(), type: '', Q: param(), frequency: param() }),
    createOscillator: () => source('oscillator'),
    createBufferSource: () => source('buffer'),
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
  }
  return { context, sources }
}

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
  const engine = new SoundEngine({
    createContext: () => fake.context as unknown as AudioContext,
    now: () => clock,
    loadQuack: () => Promise.resolve(QUACK),
    loadHonk: () => new Promise(() => {}),
    random: () => 0.5,
  })
  engine.setEnabled(true)
  return { engine, ...fake }
}

/** A source stopped early: a stop besides the one scheduled at its start. */
const cut = (source: Source | undefined) => (source?.stopAt.length ?? 0) > 1
/** Lets the next step through the engine's minimum gap between steps. */
const nextStep = () => {
  clock += 1000
}

const shut: Note = { voice: 'ship-gate-shut', at: 25, ringOut: true }
const blips: Note = { voice: 'ship-blips', at: 0 }

describe('the engine plays the spaceships’ sounds', () => {
  it('every voice plays, with no recording to wait for', () => {
    const { engine, sources } = setup()
    for (const voice of [
      'ship-peel',
      'ship-blips',
      'ship-zip',
      'ship-gate-flash',
      'ship-gate-shut',
      'ship-fanfare',
    ] as const) {
      const before = sources.length
      nextStep()
      engine.play([{ voice, at: 0 }])
      expect(sources.length, voice).toBeGreaterThan(before)
    }
  })

  it('the fly-by at the note’s pitch (its engine at f/2, from 1.15×), at its time', () => {
    const { engine, sources } = setup()
    engine.play([{ voice: 'ship-zip', at: 81, frequency: zipHz(1) }])
    const [saw] = sources.filter((s) => s.kind === 'oscillator')
    expect(saw?.startAt).toBeCloseTo(10.081)
    const [hz, t] = (saw?.frequency.setValueAtTime.mock.calls[0] ?? []) as number[]
    expect(hz).toBeCloseTo(140 * 1.15)
    expect(t).toBeCloseTo(10.081)
  })

  it('the gate shutting rings out: the next step forward doesn’t cut it, but cuts the rest', () => {
    const { engine, sources } = setup()
    engine.play([{ voice: 'ship-gate-flash', at: 0 }, shut])
    const [flash, ...rest] = sources
    const shoomp = rest.filter((s) => (s.startAt ?? 0) > 10.02)
    nextStep()
    engine.play([blips])
    // The flash doesn't ring out: the next step cuts it, like any other sound.
    expect(cut(flash)).toBe(true)
    expect(shoomp.length).toBeGreaterThan(0)
    for (const s of shoomp) expect(cut(s)).toBe(false)
  })

  it('a step back, a jump or Sound off cuts the ringing gate', () => {
    const { engine, sources } = setup()
    engine.play([shut])
    engine.stopAll()
    expect(sources.every(cut)).toBe(true)
  })

  it('a sound that doesn’t ring out (the zip) is cut by the next step', () => {
    const { engine, sources } = setup()
    engine.play([{ voice: 'ship-zip', at: 0 }])
    const zip = [...sources]
    nextStep()
    engine.play([blips])
    for (const s of zip) expect(cut(s)).toBe(true)
  })

  it('while the gate rings, it counts against the voice cap', () => {
    const { engine, sources } = setup()
    engine.play([shut])
    nextStep()
    const many = Array.from({ length: MAX_VOICES + 2 }, (_, k): Note => ({ ...blips, at: k }))
    const before = sources.length
    engine.play(many)
    // Each face-off (the lock-on) is four square beeps: MAX_VOICES − 1 fit beside the ringing gate.
    expect(sources.filter((s, k) => k >= before && s.kind === 'oscillator')).toHaveLength(
      (MAX_VOICES - 1) * 4,
    )
  })
})
