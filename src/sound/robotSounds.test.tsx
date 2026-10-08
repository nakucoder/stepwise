import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { selectionSort } from '../algorithms/sorting/selectionSort'
import { CARRY_AT, CARRY_MS, DANCE_DELAY_MS, isCarry } from '../characters/robot/steps'
import type { StageLook } from '../characters/registry'
import { collectFrames } from '../engine/collect'
import type { Frame } from '../engine/types'
import { setReducedMotion } from '../test/matchMedia'
import { cuesForStep, rightMoveCues, CHIME_LEAD_MS, type Note } from './cues'
import { robotCuesForStep } from './robotCues'
import { CLANK_HIT_MS, isRobotVoice, playRobotVoice, ROBOT_GAINS } from './robotVoices'
import { SoundContext, type SoundPlayer } from './SoundContext'
import { useStepSounds } from './useStepSounds'

const SELECTION = collectFrames(selectionSort, [5, 2, 8, 1, 9, 3]).frames
const BUBBLE = collectFrames(bubbleSort, [5, 2, 8, 1, 9, 3]).frames
const CARRY = SELECTION.findIndex((_, k) => isCarry(SELECTION, k))

const forward = (k: number, stepDelayMs = 800, reduced = false) =>
  robotCuesForStep(SELECTION, k, 'forward', stepDelayMs, reduced)
const voices = (notes: readonly Note[]) => notes.map((n) => n.voice)

describe('robot cues: each robot event makes its sound', () => {
  it('scan at every comparison, once (the ask), in place of the blip', () => {
    SELECTION.forEach((frame, k) => {
      const notes = forward(k)
      if (frame.decision?.kind === 'new-smallest') {
        expect(notes).toEqual([{ voice: 'robot-scan', at: 0 }])
      }
      expect(voices(notes)).not.toContain('blip')
    })
    const scans = SELECTION.flatMap((_, k) => voices(forward(k))).filter((v) => v === 'robot-scan')
    expect(scans).toHaveLength(SELECTION.at(-1)?.stats.comparisons ?? 0)
  })

  it('lock-on when a new smallest is found, and only then', () => {
    SELECTION.forEach((frame, k) => {
      const found =
        SELECTION[k - 1]?.decision?.kind === 'new-smallest' &&
        frame.pointers?.min === frame.pointers?.j
      expect(voices(forward(k)).includes('robot-lock')).toBe(found)
    })
  })

  it('the claw on the carry: whine as the hook goes down, CLANK on the grip, whirr on the lift', () => {
    const notes = forward(CARRY)
    const at = (voice: string) => notes.find((n) => n.voice === voice)?.at
    expect(voices(notes)).toEqual(['claw-whine', 'claw-clank', 'claw-whirr'])
    expect(at('claw-whine')).toBe(CARRY_MS * CARRY_AT.hookDown)
    // The clank part's loud hit lands on the grip.
    expect((at('claw-clank') ?? 0) + CLANK_HIT_MS).toBe(CARRY_MS * CARRY_AT.grip)
    expect(at('claw-whirr')).toBe(CARRY_MS * CARRY_AT.lift)
  })

  it.each([
    [2, 400],
    [4, 200],
  ])('at %d×, the claw keeps in step with the faster carry', (speed, stepDelayMs) => {
    const notes = forward(CARRY, stepDelayMs)
    const carry = CARRY_MS / speed
    const at = (voice: string) => notes.find((n) => n.voice === voice)?.at ?? -1
    expect(at('claw-whine')).toBe(Math.round(carry * CARRY_AT.hookDown))
    expect(at('claw-clank') + CLANK_HIT_MS).toBe(Math.round(carry * CARRY_AT.grip))
    // The whine stops where the clank begins, so the two never pile up.
    const whine = notes.find((n) => n.voice === 'claw-whine')
    expect((whine?.at ?? 0) + (whine?.duration ?? 260)).toBeLessThanOrEqual(at('claw-clank'))
  })

  it('the finale with the dance (400 ms in), once', () => {
    const last = SELECTION.length - 1
    expect(forward(last)).toEqual([{ voice: 'robot-finale', at: DANCE_DELAY_MS }])
    const finales = SELECTION.flatMap((_, k) => voices(forward(k))).filter(
      (v) => v === 'robot-finale',
    )
    expect(finales).toHaveLength(1)
  })

  it('reduced motion: each sound at its step’s moment, the claw as its recipe spaces it', () => {
    expect(forward(CARRY, 800, true).map((n) => n.at)).toEqual([0, 280, 460])
    expect(forward(SELECTION.length - 1, 800, true)).toEqual([{ voice: 'robot-finale', at: 0 }])
  })

  it('jumps are silent; one step back only replays a comparison’s scan', () => {
    expect(robotCuesForStep(SELECTION, CARRY, 'jump', 800, false)).toEqual([])
    expect(robotCuesForStep(SELECTION, CARRY, 'back', 800, false)).toEqual([])
    const ask = SELECTION.findIndex((f) => f.decision?.kind === 'new-smallest')
    expect(robotCuesForStep(SELECTION, ask, 'back', 800, false)).toEqual([
      { voice: 'robot-scan', at: 0 },
    ])
  })

  it('Do it: a right lock-on waits for the chime, like the quack', () => {
    const lock = SELECTION.findIndex((_, k) => voices(forward(k)).includes('robot-lock'))
    const notes = rightMoveCues(forward(lock))
    expect(notes.find((n) => n.voice === 'robot-lock')?.at).toBe(CHIME_LEAD_MS)
    expect(voices(notes).slice(0, 2)).toEqual(['chime', 'chime'])
  })
})

describe('bars and ducks are unaffected', () => {
  it.each(['bars', 'ducks'] as const)('%s: no robot sound, on either algorithm', (look) => {
    for (const frames of [SELECTION, BUBBLE]) {
      frames.forEach((frame, k) => {
        const notes = cuesForStep(frame, frames[k - 1] ?? null, 'forward', look, 800)
        for (const note of notes) expect(isRobotVoice(note.voice)).toBe(false)
      })
    }
  })
})

// ---------- The hook: robots sound only when the robots show ----------

function fakeEngine() {
  const play = vi.fn<SoundPlayer['play']>()
  const engine: SoundPlayer = {
    isEnabled: true,
    setEnabled: vi.fn(),
    play,
    stopAll: vi.fn(),
  }
  return { engine, play }
}

function stepTo(frames: readonly Frame[], to: number, look: StageLook) {
  const { engine, play } = fakeEngine()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SoundContext value={engine}>{children}</SoundContext>
  )
  const view = renderHook(
    ({ index }: { index: number }) => {
      useStepSounds({ frames, index, look, stepDelayMs: 800, enabled: true })
    },
    { wrapper, initialProps: { index: to - 1 } },
  )
  view.rerender({ index: to })
  return play.mock.calls.at(-1)?.[0] ?? []
}

describe('useStepSounds picks the robots’ sounds only for the robots', () => {
  it('selection sort with robots: the claw on the carry', () => {
    expect(voices(stepTo(SELECTION, CARRY, 'robot'))).toEqual([
      'claw-whine',
      'claw-clank',
      'claw-whirr',
    ])
  })

  it('selection sort with bars: today’s swap blips on the same step', () => {
    expect(voices(stepTo(SELECTION, CARRY, 'bars'))).toEqual(['blip', 'blip'])
  })

  it('bubble sort with ducks: the quack and the drop, as before', () => {
    const trade = BUBBLE.findIndex((f) => (f.highlights.swapping ?? []).length === 2)
    expect(voices(stepTo(BUBBLE, trade, 'ducks'))).toEqual(['quack', 'drop'])
  })

  it('reduced motion: the claw plays as its recipe spaces it', () => {
    setReducedMotion(true)
    expect(stepTo(SELECTION, CARRY, 'robot').map((n) => n.at)).toEqual([0, 280, 460])
    setReducedMotion(false)
  })
})

// ---------- The recipes, scheduled exactly ----------

function recordingContext() {
  const started: { type: string; at: number }[] = []
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  })
  const node = () => ({ connect: vi.fn() })
  const source = (kind: 'osc' | 'noise') => {
    const record = {
      connect: vi.fn(),
      // An oscillator's type, as set (an LFO left unset is a sine, the Web Audio default).
      type: '',
      frequency: param(),
      buffer: null as unknown,
      start: (at: number) => {
        started.push({ type: kind === 'osc' ? record.type || 'sine' : 'noise', at })
      },
      stop: vi.fn(),
    }
    return record
  }
  const context = {
    sampleRate: 8000,
    createGain: () => ({ ...node(), gain: param() }),
    createBiquadFilter: () => ({ ...node(), type: '', Q: param(), frequency: param() }),
    createOscillator: () => source('osc'),
    createBufferSource: () => source('noise'),
    createBuffer: (_: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
  }
  return { context: context as unknown as BaseAudioContext, started }
}

describe('the robot recipes (design/mockups/robot/README.md)', () => {
  const startsOf = (voice: Parameters<typeof playRobotVoice>[2]) => {
    const { context, started } = recordingContext()
    const sound = playRobotVoice(context, {} as AudioNode, voice, 1)
    return { sound, starts: started.map((s) => [s.type, Math.round((s.at - 1) * 1000)]) }
  }

  it('each sound has its own gain from the recipe: scan 2.3, lock 0.82, claw 0.8, finale 1.1', () => {
    expect(ROBOT_GAINS).toMatchObject({
      'robot-scan': 2.3,
      'robot-lock': 0.82,
      'claw-whine': 0.8,
      'claw-clank': 0.8,
      'claw-whirr': 0.8,
      'robot-finale': 1.1,
    })
    expect(startsOf('robot-lock').sound.gain.gain.value).toBe(0.82)
  })

  it('lock-on: three square bips at 0, 40 and 80 ms, then the triangle at 130 ms', () => {
    expect(startsOf('robot-lock').starts).toEqual([
      ['square', 0],
      ['square', 40],
      ['square', 80],
      ['sine', 130], // the tremolo's LFO
      ['triangle', 130],
    ])
  })

  it('scan: a noise swipe and a sine sweep, together', () => {
    expect(startsOf('robot-scan').starts).toEqual([
      ['noise', 0],
      ['sine', 0],
    ])
  })

  it('the clank: two struck metals 30 ms apart (three partials each) and the latch', () => {
    const { starts } = startsOf('claw-clank')
    expect(starts.filter(([type]) => type === 'sine').map(([, at]) => at)).toEqual([
      0, 0, 0, 30, 30, 30,
    ])
    expect(starts.filter(([type]) => type === 'noise')).toEqual([['noise', 30]])
  })

  it('the finale: the arpeggio, three bleep-bloops, "bee", then "DOO!" at 820 ms', () => {
    const tones = startsOf('robot-finale').starts.filter(([type]) => type !== 'sine')
    expect(tones.map(([, at]) => at)).toEqual([0, 60, 120, 180, 240, 360, 450, 540, 700, 820])
  })
})
