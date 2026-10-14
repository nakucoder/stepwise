import { describe, expect, it } from 'vitest'
import { DO_IT_KINDS } from '../../components/doItKinds'
import { collectFrames } from '../../engine/collect'
import { answerAt, decisionIndexes, isRightChoice } from '../../engine/decision'
import { buildTraceRows, groupCaption } from '../../engine/trace'
import type { Frame, Level } from '../../engine/types'
import { validateFrames } from '../../engine/validateFrames'
import { randomArrays } from '../../test/random'
import { MERGE_SORT_LINES, mergeSort } from './mergeSort'

const framesFor = (input: readonly number[]): readonly Frame[] => {
  const { frames, truncated } = collectFrames(mergeSort, input)
  expect(truncated).toBe(false)
  return frames
}

const last = (frames: readonly Frame[]): Frame => {
  const frame = frames.at(-1)
  if (!frame) throw new Error('no frames')
  return frame
}

const sortedCopy = (input: readonly number[]) => [...input].sort((x, y) => x - y)
const sourceLine = (n: number) => mergeSort.source.python.split('\n')[n - 1]?.trim()
const events = (frames: readonly Frame[]) => frames.map((f) => f.span?.event ?? null)
const caption = (frame: Frame | undefined, level: Level) =>
  frame ? groupCaption(frame, mergeSort.trace, level) : undefined

/** Every merge's size, hi − lo: the values written back over the whole run. */
const mergeSizes = (n: number): number[] => {
  if (n < 2) return []
  const half = Math.floor(n / 2)
  return [n, ...mergeSizes(half), ...mergeSizes(n - half)]
}

/**
 * Follows every value by identity (its first position) through the frames: into the buffer when
 * a merge copies its part down, and back up to place `k` when its buffer slot empties. Returns
 * each final position's first position.
 */
function finalIdentities(frames: readonly Frame[], n: number): number[] {
  const main = Array.from({ length: n }, (_, k) => k)
  const below: (number | null)[] = Array.from({ length: n }, () => null)
  frames.forEach((f, k) => {
    const before = frames[k - 1]?.buffer?.values
    const after = f.buffer?.values
    if (!before || !after) return
    after.forEach((v, c) => {
      if (before[c] === null && v !== null) below[c] = main[c] ?? null
      if (before[c] !== null && v === null) {
        const to = f.pointers?.k
        if (to === undefined) throw new Error(`frame ${String(k)}: a value moved up with no k`)
        main[to] = below[c] ?? -1
        below[c] = null
      }
    })
  })
  return main
}

const DEFAULT = [5, 2, 8, 1, 9, 3]
const TWELVE = [42, 7, 19, 88, 3, 64, 25, 51, 13, 76, 30, 9]
const RANDOM_INPUTS = randomArrays(20261014, 300, { maxLength: 12, min: 0, max: 99 })
const NAMED_INPUTS: [string, number[]][] = [
  ['empty', []],
  ['one number', [7]],
  ['two numbers', [2, 1]],
  ['two in order', [1, 2]],
  ['default', DEFAULT],
  ['already sorted', [1, 2, 3, 4, 5, 6]],
  ['reverse sorted', [6, 5, 4, 3, 2, 1]],
  ['duplicates', [3, 1, 3, 2, 1, 3]],
  ['all equal', [4, 4, 4, 4]],
  ['twelve numbers', TWELVE],
  ['negatives and zero', [0, -3, 5, -3, 0]],
]
const ALL_INPUTS = [...NAMED_INPUTS.map(([, input]) => input), ...RANDOM_INPUTS]

describe('merge sort: correctness', () => {
  it.each(NAMED_INPUTS)(
    '%s: the last frame is in order, every value back, nothing waiting',
    (_, input) => {
      const end = last(framesFor(input))
      expect(end.array).toEqual(sortedCopy(input))
      expect(end.highlights.sorted).toEqual(input.length > 0 ? input.map((_, k) => k) : undefined)
      expect(end.buffer?.values.every((v) => v === null)).toBe(true)
      expect(end.vacant).toBeUndefined()
    },
  )

  it('sorts 300 random lists', () => {
    for (const input of RANDOM_INPUTS)
      expect(last(framesFor(input)).array).toEqual(sortedCopy(input))
  })

  it('never changes its input', () => {
    for (const input of ALL_INPUTS) {
      const copy = [...input]
      framesFor(input)
      expect(input).toEqual(copy)
    }
  })

  it('every frame is valid (validateFrames)', () => {
    for (const input of ALL_INPUTS) expect(validateFrames(framesFor(input), mergeSort)).toEqual([])
  })

  it('every value is always on stage exactly once: in the main row, or waiting in the buffer', () => {
    for (const input of ALL_INPUTS) {
      for (const f of framesFor(input)) {
        const vacant = new Set(f.vacant ?? [])
        const shown = [
          ...f.array.filter((_, k) => !vacant.has(k)),
          ...(f.buffer?.values.filter((v): v is number => v !== null) ?? []),
        ]
        expect(sortedCopy(shown)).toEqual(sortedCopy(input))
      }
    }
  })
})

describe('merge sort: the default six (5 2 8 1 9 3)', () => {
  const frames = framesFor(DEFAULT)

  it('has 38 frames: start, 5 splits, 10 questions and their answers, 6 rest moves, 5 merges, the end', () => {
    expect(frames).toHaveLength(38)
    const count = (e: string) => events(frames).filter((x) => x === e).length
    expect(count('split')).toBe(5)
    expect(count('compare')).toBe(10)
    expect(count('move')).toBe(10)
    expect(count('rest')).toBe(6)
    expect(count('merged')).toBe(5)
  })

  it('splits top-down, left first, then merges each part once its halves are sorted', () => {
    const shape = frames
      .filter((f) => f.span?.event === 'split' || f.span?.event === 'merged')
      .map(
        (f) =>
          `${String(f.span?.event)} ${String(f.span?.lo)}-${String(f.span?.mid)}-${String(f.span?.hi)} d${String(f.span?.depth)}`,
      )
    expect(shape).toEqual([
      'split 0-3-6 d0',
      'split 0-1-3 d1',
      'split 1-2-3 d2',
      'merged 1-2-3 d2',
      'merged 0-1-3 d1',
      'split 3-4-6 d1',
      'split 4-5-6 d2',
      'merged 4-5-6 d2',
      'merged 3-4-6 d1',
      'merged 0-3-6 d0',
    ])
  })

  it('counts 10 comparisons and 16 moves (every value written back, once per level)', () => {
    expect(last(frames).stats).toEqual({ comparisons: 10, swaps: 16 })
    expect(mergeSort.countWord).toEqual({ one: 'move', many: 'moves' })
  })

  it('a split changes no values and fills no buffer', () => {
    frames.forEach((f, k) => {
      if (f.span?.event !== 'split') return
      expect(f.array).toEqual(frames[k - 1]?.array)
      expect(f.buffer?.values.every((v) => v === null)).toBe(true)
      expect(f.activeLine).toBe(MERGE_SORT_LINES.split)
    })
  })

  it('the first question of the last merge: the halves wait below, the main row is empty', () => {
    const ask = frames.find(
      (f) => f.span?.event === 'compare' && f.span.lo === 0 && f.span.hi === 6,
    )
    expect(ask?.buffer?.values).toEqual([2, 5, 8, 1, 3, 9])
    expect(ask?.vacant).toEqual([0, 1, 2, 3, 4, 5])
    expect(ask?.buffer?.pointers).toEqual({ i: 0, j: 3 })
    expect(ask?.pointers).toEqual({ k: 0 })
    expect(ask?.buffer?.highlights).toEqual({ comparing: [0, 3] })
    expect(ask?.decision).toEqual({ kind: 'which-next', pair: [0, 3] })
    expect(ask?.explanation.explorer).toBe(
      'Now put a pile of 3 and a pile of 3 back together: they wait in the row below. Which goes next, 2 or 1?',
    )
    expect(ask?.explanation.engineer).toBe(
      'Merge a[0..3) + a[3..6): left = [2, 5, 8], right = [1, 3, 9]. left[0] = 2 <= right[0] = 1?',
    )
  })

  it('its answer: 1 moves up into the first place; the right front is now 3', () => {
    const k = frames.findIndex(
      (f) => f.span?.event === 'compare' && f.span.lo === 0 && f.span.hi === 6,
    )
    const answer = frames[k + 1]
    expect(answer?.span?.event).toBe('move')
    expect(answer?.array[0]).toBe(1)
    expect(answer?.vacant).toEqual([1, 2, 3, 4, 5])
    expect(answer?.buffer?.values).toEqual([2, 5, 8, null, 3, 9])
    expect(answer?.buffer?.pointers).toEqual({ i: 0, j: 4 })
    expect(answer?.explanation).toEqual({
      explorer: '1 is smaller, so it goes up next.',
      engineer: '2 > 1: a[0] = right[0] = 1; j = 1.',
    })
    expect(answer?.activeLine).toBe(MERGE_SORT_LINES.takeRight)
  })

  it('when a half runs out, the rest moves up with no question', () => {
    const rests = frames.filter((f) => f.span?.event === 'rest')
    expect(rests.map((f) => f.explanation.explorer)).toEqual([
      'The left pile is empty, so 8 goes up next, no question.',
      'The left pile is empty, so 8 goes up next, no question.',
      'The right pile is empty, so 9 goes up next, no question.',
      'The left pile is empty, so 3 goes up next, no question.',
      'The left pile is empty, so 9 goes up next, no question.',
      'The left pile is empty, so 9 goes up next, no question.',
    ])
    for (const f of rests) expect(f.decision).toBeUndefined()
  })

  it('a finished merge says what is back together', () => {
    const merged = frames.filter((f) => f.span?.event === 'merged')
    expect(merged.map((f) => f.explanation.explorer)).toEqual([
      'These 2 are back together, in order: 2 8.',
      'These 3 are back together, in order: 2 5 8.',
      'These 2 are back together, in order: 3 9.',
      'These 3 are back together, in order: 1 3 9.',
      'These 6 are back together, in order: 1 2 3 5 8 9.',
    ])
    expect(merged.at(-1)?.explanation.engineer).toBe('a[0..6) merged: [1, 2, 3, 5, 8, 9].')
  })

  it('the code panel follows: each active line is the line the step runs', () => {
    expect(sourceLine(MERGE_SORT_LINES.split)).toBe('mid = (lo + hi) // 2')
    expect(sourceLine(MERGE_SORT_LINES.compare)).toBe(
      'if j == len(right) or (i < len(left) and left[i] <= right[j]):',
    )
    expect(sourceLine(MERGE_SORT_LINES.takeLeft)).toBe('a[k] = left[i]')
    expect(sourceLine(MERGE_SORT_LINES.takeRight)).toBe('a[k] = right[j]')
    expect(sourceLine(MERGE_SORT_LINES.merged)).toBe('return a')
  })
})

describe('merge sort: captions name the split or merge in progress', () => {
  const frames = framesFor(DEFAULT)
  const at = (event: string, lo: number, hi: number) =>
    frames.find((f) => f.span?.event === event && f.span.lo === lo && f.span.hi === hi)

  it('Explorer: "split 6 into 3 + 3", "putting 2 piles of 3 back together"', () => {
    expect(caption(at('split', 0, 6), 'explorer')).toBe('split 6 into 3 + 3')
    expect(caption(at('split', 0, 3), 'explorer')).toBe('split 3 into 1 + 2')
    expect(caption(at('compare', 0, 6), 'explorer')).toBe('putting 2 piles of 3 back together')
    expect(caption(at('move', 0, 6), 'explorer')).toBe('putting 2 piles of 3 back together')
    expect(caption(at('compare', 0, 3), 'explorer')).toBe(
      'putting a pile of 1 and a pile of 2 back together',
    )
    expect(caption(at('merged', 1, 3), 'explorer')).toBe('putting 2 piles of 1 back together')
  })

  it('Engineer: "split [0..6) at 3", "merge [0..3) + [3..6)"', () => {
    expect(caption(at('split', 0, 6), 'engineer')).toBe('split [0..6) at 3')
    expect(caption(at('split', 0, 3), 'engineer')).toBe('split [0..3) at 1')
    expect(caption(at('compare', 0, 6), 'engineer')).toBe('merge [0..3) + [3..6)')
    expect(caption(at('rest', 3, 6), 'engineer')).toBe('merge [3..4) + [4..6)')
  })

  it('no caption at the start; "all in order" at the end, at both levels', () => {
    for (const level of ['explorer', 'engineer'] as const) {
      expect(caption(frames[0], level)).toBeNull()
      expect(caption(last(frames), level)).toBe('all in order')
    }
  })
})

describe('merge sort: the trace, one row per comparison', () => {
  const frames = framesFor(DEFAULT)
  const columns = (level: Level) =>
    mergeSort.trace?.columns.filter((c) => !c.levels || c.levels.includes(level)) ?? []

  it('Engineer: lo..hi, i, j, k, left[i], right[j], left <= right?, take', () => {
    expect(columns('engineer').map((c) => c.label.engineer)).toEqual([
      'lo..hi',
      'i',
      'j',
      'k',
      'left[i]',
      'right[j]',
      'left <= right?',
      'take',
    ])
  })

  it('Explorer: four columns, left one, right one, smaller?, goes next', () => {
    expect(columns('explorer').map((c) => c.label.explorer)).toEqual([
      'left one',
      'right one',
      'smaller?',
      'goes next',
    ])
  })

  it('a question adds its row with "?"; the answer fills it in', () => {
    const ask = frames.findIndex((f) => f.span?.event === 'compare')
    const asked = buildTraceRows(frames, ask, mergeSort.trace ?? { columns: [], rowKey: [] })
    expect(asked.at(-1)?.cells).toEqual(['1..3', 0, 0, 1, 2, 8, '?', '?', '?', '?'])
    const answered = buildTraceRows(frames, ask + 1, mergeSort.trace ?? { columns: [], rowKey: [] })
    expect(answered).toHaveLength(1)
    expect(answered.at(-1)?.cells).toEqual(['1..3', 0, 0, 1, 2, 8, 'yes', 'left', 'left', 2])
  })

  it('ends with exactly one row per comparison, a new group for each merge', () => {
    const rows = buildTraceRows(
      frames,
      frames.length - 1,
      mergeSort.trace ?? { columns: [], rowKey: [] },
    )
    expect(rows).toHaveLength(10)
    expect(rows.filter((r) => r.startsGroup)).toHaveLength(4)
    expect(rows.map((r) => r.cells[0])).toEqual([
      '1..3',
      '0..3',
      '0..3',
      '4..6',
      '3..6',
      '0..6',
      '0..6',
      '0..6',
      '0..6',
      '0..6',
    ])
  })

  it('an equal pair says "same" to Explorer and takes the left', () => {
    const f = framesFor([3, 3])
    const rows = buildTraceRows(f, f.length - 1, mergeSort.trace ?? { columns: [], rowKey: [] })
    expect(rows.at(-1)?.cells).toEqual(['0..2', 0, 0, 0, 3, 3, 'yes', 'left', 'same', 3])
  })
})

describe('merge sort: the frame data a renderer needs', () => {
  it('the trace variables agree with the pointers and the buffer, at every question and answer', () => {
    for (const input of ALL_INPUTS) {
      for (const f of framesFor(input)) {
        const span = f.span
        if (span?.event !== 'compare' && span?.event !== 'move') continue
        const v = f.variables ?? {}
        expect(v['lo..hi']).toBe(`${String(span.lo)}..${String(span.hi)}`)
        expect(f.pointers?.k).toBe(v.k)
        if (span.event === 'compare') {
          expect(f.buffer?.pointers?.i).toBe(span.lo + Number(v.i))
          expect(f.buffer?.pointers?.j).toBe(span.mid + Number(v.j))
          expect(f.buffer?.values[span.lo + Number(v.i)]).toBe(v['left[i]'])
          expect(f.buffer?.values[span.mid + Number(v.j)]).toBe(v['right[j]'])
        }
      }
    }
  })

  it('while a part is merged, exactly its places from k on are empty, and its rest waits below', () => {
    for (const input of ALL_INPUTS) {
      for (const f of framesFor(input)) {
        const span = f.span
        if (span?.event !== 'compare') continue
        const k = f.pointers?.k ?? -1
        expect(f.vacant).toEqual(Array.from({ length: span.hi - k }, (_, d) => k + d))
        expect(f.buffer?.values.filter((v) => v !== null)).toHaveLength(span.hi - k)
      }
    }
  })

  it('depth: 0 for the whole list, one more for each split below it (12 → 6 → 3 → 2: depth 3)', () => {
    const f = framesFor(TWELVE)
    const depths = f.filter((x) => x.span?.event === 'split').map((x) => x.span?.depth)
    expect(Math.max(...depths.map(Number))).toBe(3)
    expect(f.find((x) => x.span?.event === 'split')?.span).toEqual({
      event: 'split',
      lo: 0,
      mid: 6,
      hi: 12,
      depth: 0,
    })
  })

  it('every frame has the second row (empty when nothing waits), so the stage never jumps', () => {
    for (const input of ALL_INPUTS) {
      for (const f of framesFor(input)) expect(f.buffer?.values).toHaveLength(input.length)
    }
  })
})

describe('merge sort: stability and Do it’s question (defined, hidden)', () => {
  it('equal fronts take the left, so equal values keep their order', () => {
    const dupes = randomArrays(7, 200, { maxLength: 12, min: 0, max: 3 })
    let ties = 0
    for (const input of dupes) {
      const frames = framesFor(input)
      frames.forEach((f, k) => {
        if (!f.decision) return
        const [i, j] = f.decision.pair
        if (f.buffer?.values[i] !== f.buffer?.values[j]) return
        ties++
        expect(answerAt(frames, k)).toEqual({ kind: 'pick', index: i })
      })
    }
    expect(ties).toBeGreaterThan(100)
  })

  it('keeps equal values in order: each value, followed by identity, ends after any equal one before it', () => {
    for (const input of [
      ...randomArrays(11, 200, { maxLength: 12, min: 0, max: 3 }),
      [3, 1, 3, 2, 1, 3],
    ]) {
      const frames = framesFor(input)
      const ids = finalIdentities(frames, input.length)
      const end = last(frames).array
      // A permutation that carries each value with it...
      expect(sortedCopy(ids)).toEqual(input.map((_, k) => k))
      ids.forEach((id, p) => {
        expect(input[id]).toBe(end[p])
      })
      // ...and keeps equal values in their first order.
      for (let p = 1; p < ids.length; p++) {
        if (end[p] === end[p - 1]) expect(ids[p]).toBeGreaterThan(ids[p - 1] ?? -1)
      }
    }
  })

  it('asks at every comparison and nowhere else: never at a split, never when a half is empty', () => {
    for (const input of ALL_INPUTS) {
      const frames = framesFor(input)
      for (const k of decisionIndexes(frames)) expect(frames[k]?.span?.event).toBe('compare')
      for (const f of frames) {
        if (f.span?.event === 'compare') expect(f.decision?.kind).toBe('which-next')
      }
      expect(decisionIndexes(frames)).toHaveLength(last(frames).stats.comparisons)
    }
  })

  it('the right answer is the smaller front: Left (L) or Right (R)', () => {
    const spec = DO_IT_KINDS['which-next']
    expect(spec.keys).toEqual({ act: 'L', keep: 'R' })
    expect(spec.words.explorer.act).toBe('Left one')
    expect(spec.words.explorer.keep).toBe('Right one')
    for (const input of ALL_INPUTS) {
      const frames = framesFor(input)
      for (const k of decisionIndexes(frames)) {
        const ask = frames[k]
        const decision = ask?.decision
        if (!ask || !decision) continue
        const [i, j] = decision.pair
        const left = ask.buffer?.values[i] ?? 0
        const right = ask.buffer?.values[j] ?? 0
        const answer = left <= right ? 'act' : 'keep'
        expect(isRightChoice(frames, k, spec.choice(answer, decision))).toBe(true)
        expect(
          isRightChoice(frames, k, spec.choice(answer === 'act' ? 'keep' : 'act', decision)),
        ).toBe(false)
      }
    }
  })

  it('Do it stays hidden for now: Watch only', () => {
    expect(mergeSort.doIt).toBe(false)
    expect(mergeSort.character).toBeUndefined()
  })
})

describe('merge sort: size', () => {
  it('12 numbers: 2 + 2 (n − 1) + comparisons + moves frames; 44 moves', () => {
    for (const input of [TWELVE, ...RANDOM_INPUTS.filter((x) => x.length === 12)]) {
      const frames = framesFor(input)
      const { comparisons, swaps } = last(frames).stats
      expect(swaps).toBe(44)
      expect(mergeSizes(12).reduce((a, b) => a + b, 0)).toBe(44)
      expect(frames).toHaveLength(2 + 2 * 11 + comparisons + swaps)
    }
  })

  it('12 numbers in order: 20 comparisons (each merge stops when its left half runs out), 88 frames', () => {
    const frames = framesFor(Array.from({ length: 12 }, (_, k) => k + 1))
    expect(last(frames).stats.comparisons).toBe(20)
    expect(frames).toHaveLength(88)
  })

  it('12 numbers reversed: 24 comparisons (each merge runs until its right half runs out), 92 frames', () => {
    const frames = framesFor(Array.from({ length: 12 }, (_, k) => 12 - k))
    expect(last(frames).stats.comparisons).toBe(24)
    expect(frames).toHaveLength(92)
  })

  it('a twelve-number example (42 7 19 88 3 64 25 51 13 76 30 9): 100 frames', () => {
    const frames = framesFor(TWELVE)
    expect(last(frames).stats).toEqual({ comparisons: 32, swaps: 44 })
    expect(frames).toHaveLength(100)
  })
})
