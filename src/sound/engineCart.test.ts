import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from './cues'
import { MAX_VOICES, SoundEngine } from './engine'
import { CART_VOICE_MS } from './cartVoices'

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

/** Enough of AudioContext for the pizza cart's recipes: it records every source. */
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

const VOICES = Object.keys(CART_VOICE_MS) as (keyof typeof CART_VOICE_MS)[]

describe('the engine plays the pizza cart’s sounds', () => {
  it('every voice plays at its time, with no recording to wait for', () => {
    const { engine, sources } = setup()
    for (const voice of VOICES) {
      const before = sources.length
      nextStep()
      engine.play([{ voice, at: 40 }])
      const mine = sources.slice(before)
      expect(mine.length, voice).toBeGreaterThan(0)
      expect(Math.min(...mine.map((s) => s.startAt ?? Infinity)), voice).toBeCloseTo(10.04)
      expect(mine.every((s) => s.buffer !== QUACK)).toBe(true)
    }
  })

  it('the next step cuts what is still sounding; a step back or Sound off cuts everything', () => {
    const { engine, sources } = setup()
    engine.play([{ voice: 'cart-fanfare', at: 0 }])
    const fanfare = [...sources]
    nextStep()
    engine.play([{ voice: 'cart-look', at: 0 }])
    for (const s of fanfare) expect(cut(s)).toBe(true)
    engine.stopAll()
    expect(sources.every(cut)).toBe(true)
  })

  it('at most MAX_VOICES at once', () => {
    const { engine, sources } = setup()
    const many = Array.from({ length: MAX_VOICES + 2 }, (_, k): Note => ({
      voice: 'cart-stay',
      at: k,
    }))
    engine.play(many)
    // The hush is one noise source.
    expect(sources.filter((s) => s.kind === 'buffer')).toHaveLength(MAX_VOICES)
  })
})
