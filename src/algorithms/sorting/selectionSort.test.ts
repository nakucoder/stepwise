import { describe, expect, it } from 'vitest'
import { collectFrames } from '../../engine/collect'
import { answerAt, isRightChoice } from '../../engine/decision'
import { findJargon } from '../../engine/jargon'
import { buildTraceRows } from '../../engine/trace'
import type { Frame } from '../../engine/types'
import { validateFrames } from '../../engine/validateFrames'
import { randomArrays } from '../../test/random'
import { SELECTION_SORT_LINES, selectionSort } from './selectionSort'

const framesFor = (input: readonly number[]): readonly Frame[] => {
  const { frames, truncated } = collectFrames(selectionSort, input)
  expect(truncated).toBe(false)
  return frames
}

const last = (frames: readonly Frame[]): Frame => {
  const frame = frames.at(-1)
  if (!frame) throw new Error('no frames')
  return frame
}

const sortedCopy = (input: readonly number[]) => [...input].sort((x, y) => x - y)
const isSwap = (f: Frame) => f.activeLine === SELECTION_SORT_LINES.swap
const sourceLine = (n: number) => selectionSort.source.python.split('\n')[n - 1]?.trim()

const RANDOM_INPUTS = randomArrays(20261007, 300, { maxLength: 15, min: -50, max: 50 })
const NAMED_INPUTS: [string, number[]][] = [
  ['empty', []],
  ['one number', [7]],
  ['two in order', [1, 2]],
  ['two reversed', [2, 1]],
  ['duplicates', [3, 1, 3, 2, 1, 3]],
  ['all equal', [4, 4, 4, 4]],
  ['negatives', [0, -5, 12, -1, -5, 3]],
  ['already sorted', [1, 2, 3, 4, 5, 6]],
  ['reversed', [6, 5, 4, 3, 2, 1]],
  ['the default numbers', [5, 2, 8, 1, 9, 3]],
]
const ALL_INPUTS: [string, number[]][] = [
  ...NAMED_INPUTS,
  ...RANDOM_INPUTS.map((input, k): [string, number[]] => [`random #${String(k)}`, input]),
]

describe('selection sort: results', () => {
  it.each(ALL_INPUTS)('sorts %s like the built-in sort', (_name, input) => {
    expect(last(framesFor(input)).array).toEqual(sortedCopy(input))
  })

  it('never mutates the input', () => {
    for (const [, input] of ALL_INPUTS) {
      const frozen = Object.freeze([...input])
      expect(() => framesFor(frozen)).not.toThrow()
      expect(frozen).toEqual(input)
    }
  })

  it.each(ALL_INPUTS)(
    'always makes n(n−1)/2 comparisons and at most n − 1 swaps: %s',
    (_, input) => {
      const n = input.length
      const { comparisons, swaps } = last(framesFor(input)).stats
      // (0 × −1 / 2 is −0, which toBe tells apart from 0.)
      expect(comparisons).toBe(n < 2 ? 0 : (n * (n - 1)) / 2)
      expect(swaps).toBeLessThanOrEqual(Math.max(0, n - 1))
    },
  )

  it('makes no swaps when the input is already sorted, or all equal', () => {
    for (const input of [
      [1, 2, 3, 4, 5, 6],
      [4, 4, 4, 4],
      [1, 1, 2, 2],
    ]) {
      const frames = framesFor(input)
      expect(last(frames).stats.swaps).toBe(0)
      expect(frames.some(isSwap)).toBe(false)
      expect(last(frames).stats.comparisons).toBe((input.length * (input.length - 1)) / 2)
    }
  })

  it('reversed: one swap per pass until the middle', () => {
    expect(last(framesFor([6, 5, 4, 3, 2, 1])).stats.swaps).toBe(3)
  })

  it('one and two numbers', () => {
    expect(last(framesFor([7])).stats).toEqual({ comparisons: 0, swaps: 0 })
    expect(last(framesFor([1, 2])).stats).toEqual({ comparisons: 1, swaps: 0 })
    expect(last(framesFor([2, 1])).stats).toEqual({ comparisons: 1, swaps: 1 })
    expect(last(framesFor([2, 1])).array).toEqual([1, 2])
  })
})

describe('selection sort: frames', () => {
  it.each(ALL_INPUTS)('pass the shared checks (rules 2 and 3): %s', (_, input) => {
    expect(validateFrames(framesFor(input), selectionSort)).toEqual([])
  })

  it('has no jargon in any Explorer explanation', () => {
    for (const [, input] of NAMED_INPUTS) {
      for (const frame of framesFor(input)) {
        expect(findJargon(frame.explanation.explorer), frame.explanation.explorer).toBeNull()
      }
    }
  })

  it.each(ALL_INPUTS)('swaps exchange exactly the front and the smallest: %s', (_, input) => {
    const frames = framesFor(input)
    frames.forEach((frame, k) => {
      if (!isSwap(frame)) return
      const before = frames[k - 1]
      if (!before) throw new Error('a swap is never the first frame')
      const [i, min] = frame.highlights.swapping ?? []
      if (i === undefined || min === undefined) throw new Error('a swap highlights two values')
      expect(i).toBeLessThan(min)
      expect(frame.array[i]).toBe(before.array[min])
      expect(frame.array[min]).toBe(before.array[i])
      expect(frame.array.filter((_, x) => x !== i && x !== min)).toEqual(
        before.array.filter((_, x) => x !== i && x !== min),
      )
      // The value moved to the front is the smallest of the unsorted part.
      expect(frame.array[i]).toBe(Math.min(...before.array.slice(i)))
    })
  })

  it.each(ALL_INPUTS)('compares the smallest so far with each value: %s', (_, input) => {
    for (const frame of framesFor(input)) {
      if (frame.decision?.kind !== 'new-smallest') continue
      expect(frame.highlights.comparing).toEqual([...frame.decision.pair])
      expect(frame.pointers?.min).toBe(frame.decision.pair[0])
      expect(frame.pointers?.j).toBe(frame.decision.pair[1])
    }
  })

  it.each(ALL_INPUTS)('the sorted part only grows, from the front: %s', (_, input) => {
    let before = 0
    for (const frame of framesFor(input)) {
      const sorted = frame.highlights.sorted ?? []
      expect(sorted).toEqual(Array.from({ length: sorted.length }, (_, k) => k))
      expect(sorted.length).toBeGreaterThanOrEqual(before)
      before = sorted.length
    }
  })

  it('points activeLine at the matching code', () => {
    expect(sourceLine(SELECTION_SORT_LINES.compare)).toBe('if a[j] < a[min_i]:')
    expect(sourceLine(SELECTION_SORT_LINES.newMin)).toBe('min_i = j')
    expect(sourceLine(SELECTION_SORT_LINES.guard)).toBe('if min_i != i:')
    expect(sourceLine(SELECTION_SORT_LINES.swap)).toBe('a[i], a[min_i] = a[min_i], a[i]')
  })
})

describe('selection sort: decisions (Do it builds on these)', () => {
  it.each(ALL_INPUTS)('the answer at every comparison matches the min pointer: %s', (_, input) => {
    const frames = framesFor(input)
    frames.forEach((frame, k) => {
      if (frame.decision?.kind !== 'new-smallest') return
      const [min, j] = frame.decision.pair
      const next = frames[k + 1]
      const answer = answerAt(frames, k)
      const smaller = (frame.array[j] ?? 0) < (frame.array[min] ?? 0)
      expect(answer).toEqual(smaller ? { kind: 'pick', index: j } : { kind: 'keep' })
      expect(next?.pointers?.min).toBe(smaller ? j : min)
      expect(
        isRightChoice(frames, k, smaller ? { kind: 'pick', index: j } : { kind: 'keep' }),
      ).toBe(true)
    })
  })

  it('equal values: keep looking (the first of equal minimums is kept)', () => {
    const frames = framesFor([2, 5, 2])
    const asks = frames.flatMap((f, k) => (f.decision?.kind === 'new-smallest' ? [k] : []))
    const atEqual = asks.find((k) => {
      const [min, j] = frames[k]?.decision?.pair ?? [0, 0]
      return frames[k]?.array[min] === frames[k]?.array[j]
    })
    if (atEqual === undefined) throw new Error('expected a comparison of equal values')
    expect(answerAt(frames, atEqual)).toEqual({ kind: 'keep' })
  })

  it.each(ALL_INPUTS)(
    'every pass ends by asking to move the smallest to the front: %s',
    (_, input) => {
      const frames = framesFor(input)
      const passes = Math.max(0, input.length - 1)
      const asks = frames.flatMap((f, k) => (f.decision?.kind === 'to-front' ? [k] : []))
      expect(asks).toHaveLength(passes)
      for (const k of asks) {
        const [i, min] = frames[k]?.decision?.pair ?? [0, 0]
        expect(answerAt(frames, k)).toEqual(
          i === min ? { kind: 'keep' } : { kind: 'trade', pair: [i, min] },
        )
      }
    },
  )

  it('no swap when the smallest is already at the front: the answer is keep', () => {
    const frames = framesFor([1, 3, 2])
    const firstPassEnd = frames.findIndex((f) => f.decision?.kind === 'to-front')
    expect(frames[firstPassEnd]?.decision?.pair).toEqual([0, 0])
    expect(answerAt(frames, firstPassEnd)).toEqual({ kind: 'keep' })
    expect(isSwap(frames[firstPassEnd + 1] ?? last(frames))).toBe(false)
  })

  it.each(NAMED_INPUTS)(
    'hints fill every rung at every decision, in both levels: %s',
    (_, input) => {
      const frames = framesFor(input)
      frames.forEach((frame, k) => {
        const next = frames[k + 1]
        if (!frame.decision || !next) return
        const hints = selectionSort.hints(frame, next)
        for (const level of ['explorer', 'engineer'] as const) {
          const { nudge, concept, showMe } = hints[level]
          for (const rung of [nudge, concept, showMe]) expect(rung.trim()).not.toBe('')
        }
        const { nudge, concept, showMe } = hints.explorer
        for (const rung of [nudge, concept, showMe]) expect(findJargon(rung), rung).toBeNull()
      })
    },
  )
})

describe('selection sort: trace', () => {
  it.each(ALL_INPUTS)(
    'min and a[min] agree with the min pointer, i and j with theirs: %s',
    (_, input) => {
      for (const frame of framesFor(input)) {
        const v = frame.variables ?? {}
        for (const name of ['i', 'j', 'min'] as const) {
          const pointer = frame.pointers?.[name]
          if (pointer !== undefined) expect(v[name]).toBe(pointer)
        }
        const min = frame.pointers?.min
        const i = frame.pointers?.i
        if (min === undefined) continue
        // On a swap the row keeps the values compared: a[min] is the smallest, which has just
        // moved to the front (like bubble sort's answer frames). Everywhere else a[min] is the
        // value at the min pointer.
        if (isSwap(frame) && i !== undefined) expect(v['a[min]']).toBe(frame.array[i])
        else expect(v['a[min]']).toBe(frame.array[min])
      }
    },
  )

  it('one row per comparison; the end of each pass fills in its last row’s swap?', () => {
    const input = [5, 2, 8, 1, 9, 3]
    const frames = framesFor(input)
    const trace = selectionSort.trace
    if (!trace) throw new Error('selection sort has a trace')
    const rows = buildTraceRows(frames, frames.length - 1, trace)
    expect(rows).toHaveLength((6 * 5) / 2)
    const swapColumn = trace.columns.findIndex((c) => c.variable === 'swap?')
    // The last row of each pass says whether it swapped: passes 0, 2 and 4 swap, 1 and 3 don't.
    const ends = [4, 8, 11, 13, 14].map((r) => rows[r]?.cells[swapColumn])
    expect(ends).toEqual(['yes', 'no', 'yes', 'no', 'yes'])
  })
})
