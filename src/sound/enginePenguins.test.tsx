import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { insertionSort } from '../algorithms/sorting/insertionSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Note } from './cues'
import { MAX_VOICES, SoundEngine } from './engine'
import { CALL_MS } from './penguinVoices'
import { SoundContext, type SoundPlayer } from './SoundContext'
import { useStepSounds } from './useStepSounds'

/** A source the fake context made: its kind, the buffer it plays, and its start and stops. */
interface Source {
  readonly kind: 'oscillator' | 'buffer'
  buffer: unknown
  startAt: number | null
  readonly stopAt: number[]
}

const HONK = { duration: CALL_MS / 1000 } as unknown as AudioBuffer
const QUACK = { duration: 0.225 } as unknown as AudioBuffer

/** Enough of AudioContext for the penguin recipes: it records every source. */
function fakeContext() {
  const sources: Source[] = []
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  })
  const source = (kind: Source['kind']) => {
    const record: Source = { kind, buffer: null, startAt: null, stopAt: [] }
    sources.push(record)
    return {
      connect: vi.fn(),
      type: '',
      set buffer(b: unknown) {
        record.buffer = b
      },
      playbackRate: param(),
      frequency: param(),
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

function setup(loadHonk: () => Promise<AudioBuffer> = () => Promise.resolve(HONK)) {
  const fake = fakeContext()
  const loadHonkSpy = vi.fn(loadHonk)
  const engine = new SoundEngine({
    createContext: () => fake.context as unknown as AudioContext,
    now: () => clock,
    loadQuack: () => Promise.resolve(QUACK),
    loadHonk: loadHonkSpy,
    random: () => 0.5,
  })
  return { engine, loadHonk: loadHonkSpy, ...fake }
}

async function enable(engine: SoundEngine) {
  engine.setEnabled(true)
  await vi.waitFor(() => {
    expect(engine.hasHonk).toBe(true)
  })
}

const call: Note = { voice: 'penguin-call', at: 0, ringOut: true }
const whoosh: Note = { voice: 'penguin-whoosh', at: 0 }
const tap: Note = { voice: 'penguin-tap', at: 0 }
/** The recording's sources: the calls. */
const calls = (sources: readonly Source[]) => sources.filter((s) => s.buffer === HONK)
/** A source stopped early: a stop besides the one scheduled at its start. */
const cut = (source: Source | undefined) => (source?.stopAt.length ?? 0) > 1

/** Lets the next step through the engine's minimum gap between steps. */
const nextStep = () => {
  clock += 1000
}

describe('the engine and the penguin call recording', () => {
  it('fetches the recording once, when Sound is turned on, like the quack', async () => {
    const { engine, loadHonk } = setup()
    expect(loadHonk).not.toHaveBeenCalled()
    await enable(engine)
    engine.setEnabled(false)
    engine.setEnabled(true)
    expect(loadHonk).toHaveBeenCalledTimes(1)
  })

  it('not loaded yet: the call is skipped, the whoosh still plays', () => {
    const { engine, sources } = setup(() => new Promise(() => {}))
    engine.setEnabled(true)
    engine.play([whoosh, { ...call, at: 900 }])
    expect(calls(sources)).toHaveLength(0)
    expect(sources.filter((s) => s.kind === 'buffer')).toHaveLength(1) // the whoosh's noise
  })

  it('loaded: the call plays the recording', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    engine.play([call])
    expect(calls(sources)).toHaveLength(1)
  })
})

describe('the slide’s call rings out', () => {
  it('the next step forward doesn’t cut it; it does cut the step’s other sounds', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    engine.play([whoosh, call])
    const [ringing] = calls(sources)
    const noise = sources.find((s) => s.kind === 'buffer' && s.buffer !== HONK)
    nextStep()
    engine.play([tap])
    expect(cut(ringing)).toBe(false)
    expect(cut(noise)).toBe(true)
    // Nor does a step with no sound of its own.
    nextStep()
    engine.play([])
    expect(cut(ringing)).toBe(false)
  })

  it('stopAll cuts it: a step back, a jump, a reset, leaving the page', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    engine.play([call])
    engine.stopAll()
    expect(cut(calls(sources)[0])).toBe(true)
  })

  it('turning Sound off cuts it', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    engine.play([call])
    engine.setEnabled(false)
    expect(cut(calls(sources)[0])).toBe(true)
  })

  it('a call that doesn’t ring out (already in place) is cut by the next step like anything else', async () => {
    const { engine, sources } = setup()
    await enable(engine)
    engine.play([{ voice: 'penguin-call-short', at: 0 }])
    nextStep()
    engine.play([tap])
    expect(cut(calls(sources)[0])).toBe(true)
  })

  it('once it has ended, it no longer counts; while it rings, it counts against the voice cap', async () => {
    const { engine, sources, context } = setup()
    await enable(engine)
    engine.play([call])
    nextStep()
    const many = Array.from({ length: MAX_VOICES + 2 }, (_, k): Note => ({ ...tap, at: k }))
    const before = sources.length
    engine.play(many)
    // Each tap is two sines: MAX_VOICES − 1 taps fit beside the ringing call.
    expect(sources.length - before).toBe((MAX_VOICES - 1) * 2)
    context.currentTime += 1
    nextStep()
    const after = sources.length
    engine.play(many)
    expect(sources.length - after).toBe(MAX_VOICES * 2)
  })
})

describe('useStepSounds: only a step forward lets a sound ring out', () => {
  const FRAMES = collectFrames(insertionSort, DEFAULT_INPUT).frames

  function steps(path: readonly number[], frames = FRAMES) {
    const stopAll = vi.fn()
    const engine: SoundPlayer = { isEnabled: true, setEnabled: vi.fn(), play: vi.fn(), stopAll }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SoundContext value={engine}>{children}</SoundContext>
    )
    const view = renderHook(
      ({ index, run }: { index: number; run: typeof frames }) => {
        useStepSounds({ frames: run, index, look: 'penguins', stepDelayMs: 800, enabled: true })
      },
      { wrapper, initialProps: { index: path[0] ?? 0, run: frames } },
    )
    const stops: number[] = []
    for (const index of path.slice(1)) {
      const before = stopAll.mock.calls.length
      view.rerender({ index, run: frames })
      stops.push(stopAll.mock.calls.length - before)
    }
    return { stops, view, stopAll }
  }

  it('forward: no stopAll (the call may ring on)', () => {
    expect(steps([3, 4, 5, 6]).stops).toEqual([0, 0, 0])
  })

  it('a step back: stopAll', () => {
    expect(steps([5, 4]).stops).toEqual([1])
  })

  it('a jump: stopAll', () => {
    expect(steps([5, 0]).stops).toEqual([1])
    expect(steps([2, 9]).stops).toEqual([1])
  })

  it('new numbers (a reset): stopAll', () => {
    const { view, stopAll } = steps([4, 5])
    const before = stopAll.mock.calls.length
    view.rerender({ index: 5, run: collectFrames(insertionSort, [3, 1, 2]).frames })
    expect(stopAll.mock.calls.length - before).toBe(1)
  })

  it('leaving the page: stopAll', () => {
    const { view, stopAll } = steps([4, 5])
    const before = stopAll.mock.calls.length
    view.unmount()
    expect(stopAll.mock.calls.length - before).toBe(1)
  })
})
