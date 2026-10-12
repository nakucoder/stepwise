import { describe, expect, it } from 'vitest'
import { insertionSort } from '../../algorithms/sorting/insertionSort'
import { DEFAULT_INPUT } from '../../data/defaultInput'
import { collectFrames } from '../../engine/collect'
import {
  finaleHopAt,
  flapAt,
  frostTiming,
  inPlaceMs,
  isSlide,
  penguinHoldMs,
  penguinMoves,
  penguinPoses,
  slideMs,
  type PenguinMove,
} from './steps'

const framesFor = (input: readonly number[]) => collectFrames(insertionSort, input).frames
const FRAMES = framesFor(DEFAULT_INPUT)
const POSES = penguinPoses(FRAMES)
const DELAYS = [1600, 800, 400, 200] as const
const kinds = (moves: readonly PenguinMove[]) => moves.map((m) => m.kind)

const INPUTS: readonly (readonly number[])[] = [
  DEFAULT_INPUT,
  [],
  [7],
  [2, 1],
  [1, 2],
  [2, 2],
  [3, 1, 3, 2, 1],
  [1, 2, 3, 4, 5],
  [5, 4, 3, 2, 1],
  [42, -7, 0, 99, 13, 13, 1],
]

describe('penguin poses', () => {
  it('follow each tower through the run: its value is always the frame’s', () => {
    for (const input of INPUTS) {
      const frames = framesFor(input)
      penguinPoses(frames).forEach((pose, k) => {
        expect(pose.order.map((tower) => input[tower])).toEqual(frames[k]?.array)
        expect([...pose.order].sort((a, b) => a - b)).toEqual(input.map((_, x) => x))
      })
    }
  })

  it('the key waits in the lane from its round’s start until it is put back', () => {
    // 5 2 8 1 9 3: frames 1–3 are round 1 (take 2, compare, shift); frame 4 puts it back.
    expect(POSES.slice(0, 6).map((p) => p.key)).toEqual([
      null,
      { tower: 1, slot: 1, waitAt: 1 },
      { tower: 1, slot: 1, waitAt: 1 },
      { tower: 1, slot: 0, waitAt: 1 },
      null,
      { tower: 2, slot: 2, waitAt: 2 },
    ])
  })

  it('the frosted shelf grows a round at a time; green only at the very end', () => {
    expect(POSES.map((p) => p.inOrder)).toEqual(FRAMES.map((f) => f.variables?.inOrder))
    expect(POSES.map((p) => p.final)).toEqual(FRAMES.map((_, k) => k === FRAMES.length - 1))
  })

  it('the compare marks follow the frame’s comparing pair', () => {
    POSES.forEach((pose, k) => {
      const comparing = FRAMES[k]?.highlights.comparing
      expect(pose.compare).toEqual(comparing?.length === 2 ? comparing : null)
    })
  })
})

describe('penguin moves', () => {
  it('on the default numbers: each step’s move, in order', () => {
    const all = FRAMES.map((_, k) => kinds(penguinMoves(FRAMES, k, POSES)).join('+'))
    // From the frames (see the insertion sort tests): 32 frames, 10 comparisons, 7 shifts.
    expect(all).toEqual([
      '', // the first frame: nothing before it
      'start', // round 1: take 2, out onto its sled
      'compare', // 5 > 2?
      'shift', // yes: 5 glides right
      'slide', // 2 slides into the front
      'start', // round 2: take 8
      'compare', // 5 > 8?
      '', // no: stop (the marks stay)
      'in-place', // 8 steps back in, and hops
      'start', // round 3: take 1
      'compare',
      'shift', // 8
      'compare',
      'shift', // 5
      'compare',
      'shift', // 2
      'slide', // 1 slides to the front
      'start', // round 4: take 9
      'compare',
      '',
      'in-place', // 9 is already in place
      'start', // round 5: take 3
      'compare',
      'shift', // 9
      'compare',
      'shift', // 8
      'compare',
      'shift', // 5
      'compare', // 2 > 3?
      '', // no: stop
      'slide', // 3 slides into its gap
      'finale',
    ])
  })

  it('a shift moves the bigger tower one slot right, into the gap the key left', () => {
    const shift = penguinMoves(FRAMES, 3, POSES)[0]
    expect(shift).toEqual({ kind: 'shift', tower: 0, from: 0, to: 1 })
  })

  it('the slide goes from where the key waits to its gap, and frosts the newest slot', () => {
    expect(penguinMoves(FRAMES, 4, POSES)).toEqual([
      { kind: 'slide', tower: 1, from: 1, to: 0, frost: 1 },
    ])
    expect(penguinMoves(FRAMES, 8, POSES)).toEqual([
      { kind: 'in-place', tower: 2, from: 2, to: 2, frost: 2 },
    ])
  })

  it('equal values stop: the key steps back in place, never slides', () => {
    const frames = framesFor([2, 2])
    const all = frames.flatMap((_, k) => penguinMoves(frames, k))
    expect(kinds(all)).toEqual(['start', 'compare', 'in-place', 'finale'])
  })

  it('already sorted: every round is in place; reversed: every round slides', () => {
    const roundEnds = (input: readonly number[]) => {
      const frames = framesFor(input)
      return frames
        .flatMap((_, k) => penguinMoves(frames, k))
        .filter((m) => m.kind === 'slide' || m.kind === 'in-place')
        .map((m) => m.kind)
    }
    expect(roundEnds([1, 2, 3, 4, 5])).toEqual(Array(4).fill('in-place'))
    expect(roundEnds([5, 4, 3, 2, 1])).toEqual(Array(4).fill('slide'))
  })

  it('one number, or none: only the finale (or nothing)', () => {
    const one = framesFor([7])
    expect(one.flatMap((_, k) => kinds(penguinMoves(one, k)))).toEqual(['finale'])
    const none = framesFor([])
    expect(none.flatMap((_, k) => kinds(penguinMoves(none, k)))).toEqual([])
  })

  it('every input: one start and one landing per round, one finale', () => {
    for (const input of INPUTS) {
      const frames = framesFor(input)
      const all = kinds(frames.flatMap((_, k) => penguinMoves(frames, k)))
      const rounds = Math.max(0, input.length - 1)
      expect(all.filter((k) => k === 'start')).toHaveLength(rounds)
      expect(all.filter((k) => k === 'slide' || k === 'in-place')).toHaveLength(rounds)
      expect(all.filter((k) => k === 'finale')).toHaveLength(input.length > 0 ? 1 : 0)
    }
  })
})

describe('penguin timing', () => {
  it('the slide: 1.6 s at 0.5× and 1×, divided by the speed above', () => {
    expect(DELAYS.map(slideMs)).toEqual([1600, 1600, 800, 400])
  })

  it('already in place: the step back and the hop fit the step together, 4 : 3', () => {
    expect(DELAYS.map(inPlaceMs)).toEqual([
      { back: 400, hop: 300 },
      { back: 400, hop: 300 },
      { back: (360 * 4) / 7, hop: 360 - (360 * 4) / 7 },
      { back: (180 * 4) / 7, hop: 180 - (180 * 4) / 7 },
    ])
  })

  it('the frost fades in during the last 350 ms of the move (all of a shorter one)', () => {
    expect(frostTiming(1600)).toEqual({ delay: 1250, duration: 350 })
    expect(frostTiming(700)).toEqual({ delay: 350, duration: 350 })
    expect(frostTiming(180)).toEqual({ delay: 0, duration: 180 })
  })

  it('the finale: flippers up 400 ms in, 110 ms apart; then all hop', () => {
    expect([0, 1, 5].map(flapAt)).toEqual([400, 510, 950])
    expect(finaleHopAt(6)).toBe(1180)
  })

  it('only a slide frame holds the player, for exactly the slide, at every speed', () => {
    const slides = FRAMES.flatMap((_, k) => (isSlide(FRAMES, k) ? [k] : []))
    expect(slides).toEqual([4, 16, 30])
    for (const d of DELAYS) {
      FRAMES.forEach((_, k) => {
        expect(penguinHoldMs(FRAMES, k, d)).toBe(slides.includes(k) ? slideMs(d) : 0)
      })
    }
  })
})
