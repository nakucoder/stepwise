import { describe, expect, it } from 'vitest'
import { collectFrames } from '../../engine/collect'
import { answerAt } from '../../engine/decision'
import { buildTraceRows, groupCaption } from '../../engine/trace'
import type { Frame, Level, PivotRule } from '../../engine/types'
import { validateFrames } from '../../engine/validateFrames'
import { randomArrays } from '../../test/random'
import { choosePivot, QUICK_SORT_LINES, quickSort, randomPivot } from './quickSort'

const RULES: readonly PivotRule[] = ['first', 'last', 'middle', 'random']

const framesFor = (input: readonly number[], pivot?: PivotRule): readonly Frame[] => {
  const { frames, truncated } = collectFrames(quickSort, input, pivot && { options: { pivot } })
  expect(truncated).toBe(false)
  return frames
}

const last = (frames: readonly Frame[]): Frame => {
  const frame = frames.at(-1)
  if (!frame) throw new Error('no frames')
  return frame
}

const sortedCopy = (input: readonly number[]) => [...input].sort((x, y) => x - y)
const sourceLine = (n: number) => quickSort.source.python.split('\n')[n - 1]?.trim()
const events = (frames: readonly Frame[]) => frames.map((f) => f.partition?.event ?? null)
const caption = (frame: Frame | undefined, level: Level) =>
  frame ? groupCaption(frame, quickSort.trace, level) : undefined

const DEFAULT = [5, 2, 8, 1, 9, 3]
const TWELVE = [42, 7, 19, 88, 3, 64, 25, 51, 13, 76, 30, 9]
const RANDOM_INPUTS = randomArrays(20261019, 300, { maxLength: 12, min: 0, max: 99 })
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

describe('quick sort: correctness', () => {
  it.each(NAMED_INPUTS)('%s: the last frame is in order, all done, nothing waiting', (_, input) => {
    for (const rule of RULES) {
      const end = last(framesFor(input, rule))
      expect(end.array, rule).toEqual(sortedCopy(input))
      expect(end.highlights.sorted, rule).toEqual(
        input.length > 0 ? input.map((_, k) => k) : undefined,
      )
      expect(end.pending, rule).toEqual([])
      expect(end.partition, rule).toBeUndefined()
    }
  })

  it('sorts 300 random lists with every pivot rule', () => {
    for (const input of RANDOM_INPUTS) {
      for (const rule of RULES)
        expect(last(framesFor(input, rule)).array).toEqual(sortedCopy(input))
    }
  })

  it('never changes its input', () => {
    for (const input of ALL_INPUTS) {
      for (const rule of RULES) {
        const copy = [...input]
        framesFor(input, rule)
        expect(input).toEqual(copy)
      }
    }
  })

  it('every frame is valid (validateFrames), for every pivot rule', () => {
    for (const input of ALL_INPUTS) {
      for (const rule of RULES) {
        expect(validateFrames(framesFor(input, rule), quickSort), rule).toEqual([])
      }
    }
  })

  it('uses the last value as the pivot when no rule is given (Watch)', () => {
    for (const input of ALL_INPUTS) expect(framesFor(input)).toEqual(framesFor(input, 'last'))
  })

  it('every frame is the one before with at most one swap', () => {
    for (const input of ALL_INPUTS) {
      for (const rule of RULES) {
        const frames = framesFor(input, rule)
        frames.forEach((f, k) => {
          const before = frames[k - 1]
          if (!before) return
          const changed = f.array.flatMap((v, c) => (v === before.array[c] ? [] : [c]))
          const swapped = f.stats.swaps - before.stats.swaps
          expect(swapped).toBe(changed.length > 0 ? 1 : swapped)
          expect(changed.length === 0 || changed.length === 2).toBe(true)
          if (changed.length === 2) {
            const [x = 0, y = 0] = changed
            expect([f.array[x], f.array[y]]).toEqual([before.array[y], before.array[x]])
            expect(f.highlights.swapping).toEqual(changed)
          }
        })
      }
    }
  })
})

describe('quick sort: pivot rules', () => {
  it('first, last and middle choose the range’s first, last and middle value', () => {
    expect(choosePivot('first', [], 2, 7)).toBe(2)
    expect(choosePivot('last', [], 2, 7)).toBe(6)
    expect(choosePivot('middle', [], 2, 7)).toBe(4)
    expect(choosePivot('middle', [], 2, 6)).toBe(3)
  })

  it('random is pure: the same input and range always give the same pivot, inside the range', () => {
    for (const input of ALL_INPUTS) {
      for (let lo = 0; lo < input.length; lo++) {
        for (let hi = lo + 1; hi <= input.length; hi++) {
          const p = randomPivot(input, lo, hi)
          expect(p).toBeGreaterThanOrEqual(lo)
          expect(p).toBeLessThan(hi)
          expect(randomPivot([...input], lo, hi)).toBe(p)
        }
      }
    }
  })

  it('seeded random gives identical frames on repeat runs', () => {
    for (const input of ALL_INPUTS)
      expect(framesFor(input, 'random')).toEqual(framesFor(input, 'random'))
  })

  it('random does not always choose the same place', () => {
    const places = RANDOM_INPUTS.filter((input) => input.length >= 4).map(
      (input) => randomPivot(input, 0, input.length) / input.length,
    )
    expect(new Set(places.map((x) => Math.floor(x * 4))).size).toBe(4)
  })

  it('a pivot not already at the end swaps there in a frame of its own', () => {
    const frames = framesFor(DEFAULT, 'first')
    const range = frames.findIndex((f) => f.partition?.event === 'range')
    const pick = frames[range + 1]
    expect(frames[range]?.partition?.pivot).toBe(0)
    expect(frames[range]?.highlights.pivot).toEqual([0])
    expect(pick?.partition?.event).toBe('pick')
    expect(pick?.partition?.pivot).toBe(5)
    expect(pick?.array).toEqual([3, 2, 8, 1, 9, 5])
    expect(pick?.highlights.swapping).toEqual([0, 5])
    expect(pick?.activeLine).toBe(QUICK_SORT_LINES.toEnd)
  })

  it('the last rule never has a pick frame', () => {
    for (const input of ALL_INPUTS) expect(events(framesFor(input))).not.toContain('pick')
  })

  it('sorted input is slow with the last as pivot, and fast with the middle', () => {
    const sorted = sortedCopy(TWELVE)
    const comparisons = (rule: PivotRule) => last(framesFor(sorted, rule)).stats.comparisons
    expect(comparisons('last')).toBe(66)
    expect(comparisons('first')).toBe(66)
    expect(comparisons('middle')).toBeLessThan(30)
  })
})

describe('quick sort: frames', () => {
  it('the default input, last as pivot: the expected events', () => {
    const frames = framesFor(DEFAULT)
    expect(frames).toHaveLength(27)
    expect(events(frames)).toEqual([
      null,
      // [0..6), pivot 3: 5 right, 2 left (trade with 5), 8 right, 1 left (trade with 5), 9 right
      'range',
      ...['compare', 'right', 'compare', 'left', 'compare', 'right', 'compare', 'left'],
      ...['compare', 'right', 'place'],
      // [0..2), pivot 1: 2 right; 1 trades with 2
      ...['range', 'compare', 'right', 'place'],
      'done',
      // [3..6), pivot 8: 5 left (already there), 9 right; 8 trades with 9
      ...['range', 'compare', 'left', 'compare', 'right', 'place'],
      'done',
      'done',
      null,
    ])
    expect(last(frames).stats).toEqual({ comparisons: 8, swaps: 5 })
  })

  it('a range of one value gets one "already in place" frame, and turns green', () => {
    const frames = framesFor([7])
    expect(events(frames)).toEqual([null, 'done', null])
    expect(frames[1]?.highlights.sorted).toEqual([0])
    expect(frames[1]?.activeLine).toBe(QUICK_SORT_LINES.one)
    expect(sourceLine(QUICK_SORT_LINES.one)).toBe('return a')
  })

  it('a range of two is one comparison, then the pivot lands', () => {
    expect(events(framesFor([2, 1]))).toEqual([
      null,
      'range',
      'compare',
      'right',
      'place',
      'done',
      null,
    ])
    expect(events(framesFor([1, 2]))).toEqual([
      null,
      'range',
      'compare',
      'left',
      'place',
      'done',
      null,
    ])
  })

  it('values equal to the pivot go left', () => {
    const frames = framesFor([4, 4, 4, 4])
    const answers = frames.filter(
      (f) => f.partition?.event === 'left' || f.partition?.event === 'right',
    )
    expect(answers.every((f) => f.partition?.event === 'left')).toBe(true)
    expect(answers.every((f) => f.variables?.side === 'left')).toBe(true)
  })

  it('every compare is followed by its answer, left or right, on the next value', () => {
    for (const input of ALL_INPUTS) {
      const frames = framesFor(input)
      frames.forEach((f, k) => {
        if (f.partition?.event !== 'compare') return
        const answer = frames[k + 1]?.partition
        expect(['left', 'right']).toContain(answer?.event)
        expect(answer?.next).toBe(f.partition.next + 1)
        const v = f.array[f.partition.next] ?? 0
        const pivot = f.array[f.partition.pivot] ?? 0
        expect(answer?.event).toBe(v <= pivot ? 'left' : 'right')
        expect(answer?.wall).toBe(f.partition.wall + (v <= pivot ? 1 : 0))
      })
    }
  })

  it('the zones hold what they say: <= pivot left of the wall, bigger from the wall to next', () => {
    for (const input of ALL_INPUTS) {
      for (const rule of RULES) {
        for (const f of framesFor(input, rule)) {
          const p = f.partition
          if (!p || !['compare', 'left', 'right'].includes(p.event)) continue
          expect(p.pivot).toBe(p.hi - 1)
          const pivot = f.array[p.pivot] ?? 0
          for (let c = p.lo; c < p.wall; c++) expect(f.array[c]).toBeLessThanOrEqual(pivot)
          for (let c = p.wall; c < p.next; c++) expect(f.array[c]).toBeGreaterThan(pivot)
        }
      }
    }
  })

  it('a placed pivot is final: everything left of it is <= it, everything right is bigger', () => {
    for (const input of ALL_INPUTS) {
      for (const rule of RULES) {
        const frames = framesFor(input, rule)
        const end = last(frames).array
        for (const f of frames) {
          if (f.partition?.event !== 'place') continue
          const { lo, hi, pivot } = f.partition
          expect(f.array[pivot]).toBe(end[pivot])
          expect(f.highlights.sorted).toContain(pivot)
          for (let c = lo; c < pivot; c++)
            expect(f.array[c]).toBeLessThanOrEqual(f.array[pivot] ?? 0)
          for (let c = pivot + 1; c < hi; c++)
            expect(f.array[c]).toBeGreaterThan(f.array[pivot] ?? 0)
        }
      }
    }
  })

  it('sorted values never change and never stop being sorted', () => {
    for (const input of ALL_INPUTS) {
      const frames = framesFor(input)
      const end = last(frames).array
      frames.forEach((f, k) => {
        for (const c of frames[k - 1]?.highlights.sorted ?? [])
          expect(f.highlights.sorted).toContain(c)
        for (const c of f.highlights.sorted ?? []) expect(f.array[c]).toBe(end[c])
      })
    }
  })

  it('pending ranges are worked on in order: each range is the next pending one or inside the last', () => {
    for (const input of ALL_INPUTS) {
      for (const rule of RULES) {
        const frames = framesFor(input, rule)
        // Every value outside the active range and the pending ones is sorted.
        for (const f of frames) {
          if (!f.partition) continue
          const covered = new Set<number>()
          for (const [lo, hi] of [
            [f.partition.lo, f.partition.hi] as const,
            ...(f.pending ?? []),
          ]) {
            for (let c = lo; c < hi; c++) covered.add(c)
          }
          f.array.forEach((_, c) => {
            if (!covered.has(c)) expect(f.highlights.sorted).toContain(c)
          })
        }
        // A range starts either inside the one before or as the first pending one.
        frames.forEach((f, k) => {
          const p = f.partition
          const before = frames.slice(0, k).findLast((x) => x.partition)
          if (!p || !before?.partition || (p.event !== 'range' && p.event !== 'done')) return
          const { lo, hi } = before.partition
          const inside = lo <= p.lo && p.hi <= hi
          const next = before.pending?.[0]
          expect(inside || (next?.[0] === p.lo && next[1] === p.hi)).toBe(true)
        })
      }
    }
    // Every input with every rule: about 1.1 s here, CI's runners are over 3 times slower.
  }, 20_000)

  it('every changing line points at the code it describes', () => {
    expect(sourceLine(QUICK_SORT_LINES.choose)).toBe('p = choose_pivot(a, lo, hi)')
    expect(sourceLine(QUICK_SORT_LINES.toEnd)).toBe('a[p], a[hi - 1] = a[hi - 1], a[p]')
    expect(sourceLine(QUICK_SORT_LINES.compare)).toBe('if a[j] <= pivot:')
    expect(sourceLine(QUICK_SORT_LINES.left)).toBe('a[i], a[j] = a[j], a[i]')
    expect(sourceLine(QUICK_SORT_LINES.right)).toBe('for j in range(lo, hi - 1):')
    expect(sourceLine(QUICK_SORT_LINES.place)).toBe('a[i], a[hi - 1] = a[hi - 1], a[i]')
    expect(sourceLine(QUICK_SORT_LINES.done)).toBe('return a')
  })

  it('asks left or right at every comparison, and nothing else (Do it)', () => {
    expect(quickSort.doIt).toBe(true)
    for (const input of ALL_INPUTS) {
      for (const rule of RULES) {
        const frames = framesFor(input, rule)
        for (const f of frames) {
          // Every compare frame asks, about the wall and the value; no other frame does.
          expect(f.decision !== undefined, f.partition?.event ?? 'no partition').toBe(
            f.partition?.event === 'compare',
          )
          if (f.decision && f.partition) {
            expect(f.decision).toEqual({
              kind: 'left-or-right',
              pair: [f.partition.wall, f.partition.next],
            })
          }
        }
      }
    }
  })

  it('reads the answer from the wall: a value that swaps with itself is still "left"', () => {
    // [1, 2]: 1 <= 2 with i == j, so the values don't change, yet the answer is left.
    const frames = framesFor([1, 2])
    const k = frames.findIndex((f) => f.decision)
    expect(frames[k]?.decision?.pair).toEqual([0, 0])
    expect(frames[k + 1]?.array).toEqual(frames[k]?.array)
    expect(answerAt(frames, k)).toEqual({ kind: 'trade', pair: [0, 0] })
    // [2, 1]: 2 > 1 stays right.
    const other = framesFor([2, 1])
    expect(
      answerAt(
        other,
        other.findIndex((f) => f.decision),
      ),
    ).toEqual({ kind: 'keep' })
  })

  it('the default input asks 8 questions: the leader’s placement and ranges of one are never asked', () => {
    const frames = framesFor(DEFAULT)
    const asked = frames.filter((f) => f.decision)
    expect(asked).toHaveLength(8)
    expect(asked.map((f) => f.explanation.explorer)).toEqual([
      'Does 5 go left or right of the leader, 3?',
      'Does 2 go left or right of the leader, 3?',
      'Does 8 go left or right of the leader, 3?',
      'Does 1 go left or right of the leader, 3?',
      'Does 9 go left or right of the leader, 3?',
      'Does 2 go left or right of the leader, 1?',
      'Does 5 go left or right of the leader, 8?',
      'Does 9 go left or right of the leader, 8?',
    ])
    expect(frames.filter((f) => f.partition?.event === 'place').some((f) => f.decision)).toBe(false)
    expect(frames.filter((f) => f.partition?.event === 'done').some((f) => f.decision)).toBe(false)
  })
})

describe('quick sort: trace', () => {
  it('variables agree with the frame: i and j match their pointers, a[j] and pivot the values', () => {
    for (const input of ALL_INPUTS) {
      for (const f of framesFor(input)) {
        const v = f.variables
        if (!v) continue
        for (const name of ['i', 'j'] as const) {
          if (v[name] !== null && f.pointers?.[name] !== undefined)
            expect(v[name]).toBe(f.pointers[name])
        }
        const p = f.partition
        if (p?.event === 'compare') {
          expect(v['a[j]']).toBe(f.array[p.next])
          expect(v.pivot).toBe(f.array[p.pivot])
        }
        if (p && p.event !== 'done' && p.event !== 'range' && p.event !== 'pick') {
          expect(v.pivot).toBe(f.array[p.pivot])
        }
      }
    }
  })

  it('one row per comparison: the question adds "?", the answer fills in the side', () => {
    const frames = framesFor(DEFAULT)
    const rows = buildTraceRows(
      frames,
      frames.length - 1,
      quickSort.trace ?? { columns: [], rowKey: [] },
    )
    expect(rows).toHaveLength(8)
    const sideColumn = quickSort.trace?.columns.findIndex((c) => c.variable === 'side') ?? -1
    expect(rows.map((r) => r.cells[sideColumn])).toEqual([
      'right',
      'left',
      'right',
      'left',
      'right',
      'right',
      'left',
      'right',
    ])
    const ask = frames.findIndex((f) => f.partition?.event === 'compare')
    const asked = buildTraceRows(frames, ask, quickSort.trace ?? { columns: [], rowKey: [] })
    expect(asked.at(-1)?.cells[sideColumn]).toBe('?')
  })

  it('the caption names the range: the call and its depth in Engineer', () => {
    const frames = framesFor(DEFAULT)
    const second = frames.find((f) => f.partition?.event === 'range' && f.partition.depth === 1)
    expect(caption(second, 'engineer')).toBe('quick_sort(a, 0, 2), depth 1')
    expect(caption(second, 'explorer')).toBe('working on 2 numbers')
    expect(caption(frames[0], 'engineer')).toBeNull()
    expect(caption(last(frames), 'explorer')).toBe('all in order')
  })
})
