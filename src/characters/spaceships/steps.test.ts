import { describe, expect, it } from 'vitest'
import { mergeSort } from '../../algorithms/sorting/mergeSort'
import { DEFAULT_INPUT } from '../../data/defaultInput'
import { collectFrames } from '../../engine/collect'
import type { Frame } from '../../engine/types'
import {
  familyChanged,
  openAndCompareMs,
  shutMs,
  spaceshipHoldMs,
  spaceshipMoves,
  spaceshipPoses,
  takeoffAt,
  type SpaceshipMove,
} from './steps'

const framesFor = (input: readonly number[]) => collectFrames(mergeSort, input).frames
const FRAMES = framesFor(DEFAULT_INPUT)
const POSES = spaceshipPoses(FRAMES)

/** A small seeded generator, so the random inputs are the same every run. */
function randomInputs(seed: number, count: number): number[][] {
  let x = seed
  const next = () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }
  return Array.from({ length: count }, () =>
    Array.from({ length: 1 + Math.floor(next() * 12) }, () => Math.floor(next() * 5)),
  )
}

const INPUTS = [
  DEFAULT_INPUT,
  [],
  [7],
  [2, 1],
  [1, 2, 3, 4, 5, 6],
  [6, 5, 4, 3, 2, 1],
  [3, 1, 3, 2, 1, 3],
  [42, 7, 19, 88, 3, 64, 25, 51, 13, 76, 30, 9],
  ...randomInputs(7, 60),
]

describe('poses: every ship followed through the run', () => {
  it('starts as one squadron on the top row', () => {
    const start = POSES[0]
    expect(start?.ships).toEqual(DEFAULT_INPUT.map((_, column) => ({ column, row: 0 })))
    expect(start?.squadrons).toEqual([{ first: 0, last: 5, row: 0 }])
    expect(start?.family).toEqual({ lo: 0, hi: 6, depth: 0 })
  })

  it('a split drops both halves a row, each a squadron', () => {
    expect(FRAMES[1]?.span).toMatchObject({ event: 'split', lo: 0, mid: 3, hi: 6, depth: 0 })
    expect(POSES[1]?.ships.every((ship) => ship.row === 1)).toBe(true)
    expect(POSES[1]?.squadrons).toEqual([
      { first: 0, last: 2, row: 1 },
      { first: 3, last: 5, row: 1 },
    ])
  })

  it.each(INPUTS.map((input) => [input.join(' ') || '(none)', input] as const))(
    '%s: each ship is where the frame holds its value, and equal values keep their order',
    (_, input) => {
      const frames = framesFor(input)
      const poses = spaceshipPoses(frames)
      frames.forEach((frame, k) => {
        const pose = poses[k]
        if (!pose) throw new Error('no pose')
        const vacant = new Set(frame.vacant ?? [])
        const places = new Set<string>()
        pose.ships.forEach((ship, id) => {
          places.add(`${String(ship.column)},${String(ship.row)}`)
          const inHalves =
            pose.gate !== null &&
            ship.row === pose.gate.row &&
            ship.column >= pose.gate.lo &&
            ship.column < pose.gate.hi
          if (inHalves) expect(frame.buffer?.values[ship.column]).toBe(input[id])
          else {
            expect(vacant.has(ship.column)).toBe(false)
            expect(frame.array[ship.column]).toBe(input[id])
          }
        })
        // One ship to a place.
        expect(places.size).toBe(input.length)
      })
      const last = poses.at(-1)
      if (input.length > 0) {
        expect(last?.final).toBe(true)
        expect(last?.ships.every((ship) => ship.row === 0)).toBe(true)
        expect(last?.squadrons).toEqual([{ first: 0, last: input.length - 1, row: 0 }])
        // Stable: equal values in their first order, left to right.
        const byColumn = [...(last?.ships ?? [])]
          .map((ship, id) => ({ id, column: ship.column }))
          .sort((a, b) => a.column - b.column)
        for (let c = 1; c < byColumn.length; c++) {
          const a = byColumn[c - 1]
          const b = byColumn[c]
          if (a && b && input[a.id] === input[b.id]) expect(b.id).toBeGreaterThan(a.id)
        }
      }
    },
  )

  it('during a merge: the gate over the halves, the forming squadron’s empty slots, the leads', () => {
    const ask = FRAMES.findIndex((frame) => frame.decision)
    const pose = POSES[ask]
    // The first question: [1, 2, 3) at depth 2, 2 (column 1) or 8 (column 2).
    expect(pose?.gate).toEqual({ lo: 1, hi: 3, row: 3 })
    expect(pose?.forming).toEqual({ first: 1, last: 2, row: 2, empty: [1, 2] })
    expect(pose?.leads).toEqual([1, 2])
    expect(POSES[ask + 1]?.leads).toBeNull()
  })
})

describe('moves', () => {
  const all = FRAMES.flatMap((_, k) => spaceshipMoves(FRAMES, k, POSES))
  const count = (kind: SpaceshipMove['kind']) => all.filter((m) => m.kind === kind).length

  it('on 5 2 8 1 9 3: 5 splits, 5 gates open and shut, 10 compares, 16 takes, 1 finale', () => {
    expect(count('split')).toBe(5)
    expect(count('gate-open')).toBe(5)
    expect(count('shut')).toBe(5)
    expect(count('compare')).toBe(10)
    expect(count('take')).toBe(16)
    expect(count('finale')).toBe(1)
    expect(spaceshipMoves(FRAMES, 0, POSES)).toEqual([])
  })

  it('a take after a compare eases the other lead back; after a rest, nothing', () => {
    const ask = FRAMES.findIndex((frame) => frame.decision)
    const take = spaceshipMoves(FRAMES, ask + 1, POSES)
    // 2 (ship 1) flies up to column 1 of row 2; 8 (ship 2) eases back.
    expect(take).toEqual([
      { kind: 'take', ship: 1, from: { column: 1, row: 3 }, to: { column: 1, row: 2 }, back: 2 },
    ])
    const rest = spaceshipMoves(FRAMES, ask + 2, POSES)
    expect(FRAMES[ask + 2]?.span?.event).toBe('rest')
    expect(rest).toEqual([
      { kind: 'take', ship: 2, from: { column: 2, row: 3 }, to: { column: 2, row: 2 }, back: null },
    ])
  })

  it('the first compare of a merge opens the gate; later compares don’t', () => {
    const firsts = FRAMES.flatMap((_, k) =>
      spaceshipMoves(FRAMES, k, POSES).some((m) => m.kind === 'gate-open') ? [k] : [],
    )
    for (const k of firsts) {
      expect(FRAMES[k]?.span?.event).toBe('compare')
      expect(FRAMES[k - 1]?.span?.event).not.toMatch(/compare|move|rest/)
    }
  })

  it('a merge’s end shuts its gate, over the halves’ row', () => {
    const k = FRAMES.findIndex((frame) => frame.span?.event === 'merged')
    expect(spaceshipMoves(FRAMES, k, POSES)).toEqual([{ kind: 'shut', lo: 1, hi: 3, row: 3 }])
  })

  it('the zoom fades in a new family; within a merge it stays', () => {
    const ask = FRAMES.findIndex((frame) => frame.decision)
    // The first split is the whole list's, as at the start: it flies. The next is a new family.
    expect(familyChanged(POSES, 1)).toBe(false)
    expect(FRAMES[2]?.span).toMatchObject({ event: 'split', lo: 0, hi: 3 })
    expect(familyChanged(POSES, 2)).toBe(true)
    expect(familyChanged(POSES, ask + 1)).toBe(false)
  })
})

describe('timing', () => {
  it('the step waits for the gate’s flash and shut: 900 ms at 1×, divided above, never less below', () => {
    const shuts = FRAMES.flatMap((frame: Frame, k) => (frame.span?.event === 'merged' ? [k] : []))
    expect(shuts).toHaveLength(5)
    for (let k = 0; k < FRAMES.length; k++) {
      const hold = spaceshipHoldMs(FRAMES, k, 800)
      expect(hold).toBe(shuts.includes(k) ? 900 : 0)
    }
    const k = shuts[0] ?? -1
    expect(spaceshipHoldMs(FRAMES, k, 400)).toBe(450)
    expect(spaceshipHoldMs(FRAMES, k, 1600)).toBe(900)
    expect(shutMs(200)).toBe(225)
  })

  it('the gate opens, then the first compare, fitted together inside the step', () => {
    expect(openAndCompareMs(800)).toEqual({ open: 300, compare: 200 })
    const fast = openAndCompareMs(400)
    expect(fast.open + fast.compare).toBeCloseTo(360)
    expect(fast.open / fast.compare).toBeCloseTo(1.5)
  })

  it('the finale: take-offs from 400 ms, 80 ms apart, about 2 s for 6', () => {
    expect([0, 1, 5].map(takeoffAt)).toEqual([400, 480, 800])
    expect(takeoffAt(5) + 500 + 700).toBe(2000)
  })
})
