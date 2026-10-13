import { describe, expect, it } from 'vitest'
import { insertionSort } from '../algorithms/sorting/insertionSort'
import { penguinMoves } from '../characters/penguins/steps'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import { CHIME_LEAD_MS, CORRECT, rightMoveCues, type Note } from './cues'
import { penguinCuesForStep } from './penguinCues'

const FRAMES = collectFrames(insertionSort, DEFAULT_INPUT).frames
const kinds = (k: number) => penguinMoves(FRAMES, k).map((m) => m.kind)
const first = (kind: string) => FRAMES.findIndex((_, k) => kinds(k).includes(kind as never))
const COMPARE = first('compare')
const SHIFT = first('shift')
const SLIDE = first('slide')
const IN_PLACE = first('in-place')
const FINALE = FRAMES.length - 1
const START = first('start')
/** The four speeds, as step delays: 0.5×, 1×, 2×, 4×. */
const DELAYS = [1600, 800, 400, 200] as const

const forward = (k: number, delay = 800, reduced = false) =>
  penguinCuesForStep(FRAMES, k, 'forward', delay, reduced)

describe('penguin cues: each move makes its sound', () => {
  it('tap at every comparison, swish at every shift, both at once and in full', () => {
    for (const d of DELAYS) {
      expect(forward(COMPARE, d)).toEqual([{ voice: 'penguin-tap', at: 0 }])
      expect(forward(SHIFT, d)).toEqual([{ voice: 'penguin-swish', at: 0 }])
    }
  })

  it('a round’s start and a stop make no sound of their own', () => {
    expect(forward(START)).toEqual([])
    // The stop answer: the comparison stays on screen; nothing new happens.
    const stop = FRAMES.findIndex(
      (f, k) => k > 0 && f.highlights.comparing && FRAMES[k - 1]?.decision && kinds(k).length === 0,
    )
    expect(stop).toBeGreaterThan(0)
    expect(forward(stop)).toEqual([])
  })

  it('the slide: whoosh ending as the sled reaches the gap, the call (ringing out) at 0.9 T', () => {
    expect(DELAYS.map((d) => forward(SLIDE, d))).toEqual([
      // 0.5× and 1×: T = 1600; the whoosh 348–1248 in full, the call at 1440.
      [
        { voice: 'penguin-whoosh', at: 348 },
        { voice: 'penguin-call', at: 1440, ringOut: true },
      ],
      [
        { voice: 'penguin-whoosh', at: 348 },
        { voice: 'penguin-call', at: 1440, ringOut: true },
      ],
      // 2×: T = 800; the whoosh from 0, cut at the call (720).
      [
        { voice: 'penguin-whoosh', at: 0, duration: 720 },
        { voice: 'penguin-call', at: 720, ringOut: true },
      ],
      // 4×: T = 400; the call at 360.
      [
        { voice: 'penguin-whoosh', at: 0, duration: 360 },
        { voice: 'penguin-call', at: 360, ringOut: true },
      ],
    ])
  })

  it('already in place: the short call with the hop, cut to fit a fast step (step − 10 − start)', () => {
    expect(DELAYS.map((d) => forward(IN_PLACE, d))).toEqual([
      [{ voice: 'penguin-call-short', at: 400 }],
      [{ voice: 'penguin-call-short', at: 400 }],
      // The hop starts at 360 × 4/7 ≈ 206; 400 − 10 − 206 = 184 left.
      [{ voice: 'penguin-call-short', at: 206, duration: 184 }],
      // 180 × 4/7 ≈ 103; 200 − 10 − 103 = 87 left.
      [{ voice: 'penguin-call-short', at: 103, duration: 87 }],
    ])
  })

  it('the finale with the flipper wave, 400 ms in, in full at every speed', () => {
    for (const d of DELAYS)
      expect(forward(FINALE, d)).toEqual([{ voice: 'penguin-finale', at: 400 }])
  })
})

describe('penguin cues: reduced motion', () => {
  it('the whoosh at once and the call at min(0.9 s, 0.9 T): the spec’s at 0.5× and 1×', () => {
    expect(DELAYS.map((d) => forward(SLIDE, d, true))).toEqual([
      [
        { voice: 'penguin-whoosh', at: 0 },
        { voice: 'penguin-call', at: 900, ringOut: true },
      ],
      [
        { voice: 'penguin-whoosh', at: 0 },
        { voice: 'penguin-call', at: 900, ringOut: true },
      ],
      [
        { voice: 'penguin-whoosh', at: 0, duration: 720 },
        { voice: 'penguin-call', at: 720, ringOut: true },
      ],
      [
        { voice: 'penguin-whoosh', at: 0, duration: 360 },
        { voice: 'penguin-call', at: 360, ringOut: true },
      ],
    ])
  })

  it('the short call and the finale at the step’s start; tap and swish as ever', () => {
    expect(forward(IN_PLACE, 800, true)).toEqual([{ voice: 'penguin-call-short', at: 0 }])
    expect(forward(IN_PLACE, 200, true)).toEqual([
      { voice: 'penguin-call-short', at: 0, duration: 190 },
    ])
    expect(forward(FINALE, 800, true)).toEqual([{ voice: 'penguin-finale', at: 0 }])
    expect(forward(COMPARE, 800, true)).toEqual([{ voice: 'penguin-tap', at: 0 }])
    expect(forward(SHIFT, 800, true)).toEqual([{ voice: 'penguin-swish', at: 0 }])
  })
})

describe('penguin cues: back, jump, Do it', () => {
  it('jumps are silent; one step back only replays a comparison’s tap', () => {
    for (let k = 0; k < FRAMES.length; k++) {
      expect(penguinCuesForStep(FRAMES, k, 'jump', 800, false)).toEqual([])
      const back = penguinCuesForStep(FRAMES, k, 'back', 800, false)
      expect(back).toEqual(FRAMES[k]?.decision ? [{ voice: 'penguin-tap', at: 0 }] : [])
    }
  })

  it('Do it: a right shift’s swish waits for the chime, like the quack and the lock-on', () => {
    const notes: Note[] = forward(SHIFT)
    expect(rightMoveCues(notes)).toEqual([
      ...CORRECT,
      { voice: 'penguin-swish', at: CHIME_LEAD_MS },
    ])
    // A cut swish is shortened by the same.
    expect(rightMoveCues([{ voice: 'penguin-swish', at: 0, duration: 150 }])).toEqual([
      ...CORRECT,
      { voice: 'penguin-swish', at: CHIME_LEAD_MS, duration: 30 },
    ])
  })

  it('Do it: the tap, the slide and the short call are never on an answer frame', () => {
    // Answer frames are the ones right after a question: a shift (swish) or a stop (nothing).
    const answers = FRAMES.flatMap((_, k) => (FRAMES[k - 1]?.decision ? [k] : []))
    for (const k of answers) {
      for (const note of forward(k)) expect(note.voice).toBe('penguin-swish')
    }
  })
})
