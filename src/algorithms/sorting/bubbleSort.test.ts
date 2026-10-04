import { describe, expect, it } from 'vitest'
import { collectFrames } from '../../engine/collect'
import { findJargon } from '../../engine/jargon'
import { buildTraceRows } from '../../engine/trace'
import type { Frame } from '../../engine/types'
import { validateFrames } from '../../engine/validateFrames'
import { randomArrays } from '../../test/random'
import { BUBBLE_SORT_LINES, bubbleSort } from './bubbleSort'

const framesFor = (input: readonly number[]): readonly Frame[] => {
  const { frames, truncated } = collectFrames(bubbleSort, input)
  expect(truncated).toBe(false)
  return frames
}

const last = (frames: readonly Frame[]): Frame => {
  const frame = frames.at(-1)
  if (!frame) throw new Error('no frames')
  return frame
}

const sortedCopy = (input: readonly number[]) => [...input].sort((x, y) => x - y)
const isAsk = (f: Frame) => f.variables?.['swap?'] === '?'
const isSwap = (f: Frame) => f.activeLine === BUBBLE_SORT_LINES.swap
const sourceLine = (n: number) => bubbleSort.source.python.split('\n')[n - 1]?.trim()

const RANDOM_INPUTS = randomArrays(20261003, 300, { maxLength: 15, min: -50, max: 50 })
const NAMED_INPUTS: [string, number[]][] = [
  ['empty', []],
  ['one element', [7]],
  ['two in order', [1, 2]],
  ['two reversed', [2, 1]],
  ['duplicates', [3, 1, 3, 2, 1, 3]],
  ['all equal', [4, 4, 4, 4]],
  ['negatives', [0, -5, 12, -1, -5, 3]],
  ['already sorted', [1, 2, 3, 4, 5, 6]],
  ['reverse sorted', [6, 5, 4, 3, 2, 1]],
  ['design D example', [5, 2, 8, 1, 9, 3]],
]
const ALL_INPUTS: [string, number[]][] = [
  ...NAMED_INPUTS,
  ...RANDOM_INPUTS.map((input, k): [string, number[]] => [`random #${String(k)}`, input]),
]

describe('bubble sort: results', () => {
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

  it('exits after one pass when the input is already sorted', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const frames = framesFor(input)
    expect(last(frames).stats).toEqual({ comparisons: input.length - 1, swaps: 0 })
    expect(frames.some((f) => f.activeLine === BUBBLE_SORT_LINES.earlyExit)).toBe(true)
  })

  it('does every comparison and swap on reverse-sorted input', () => {
    const n = 6
    const frames = framesFor([6, 5, 4, 3, 2, 1])
    const pairs = (n * (n - 1)) / 2
    expect(last(frames).stats).toEqual({ comparisons: pairs, swaps: pairs })
  })

  it('handles empty and single-element input with a start and a finish frame', () => {
    for (const input of [[], [42]]) {
      const frames = framesFor(input)
      expect(frames.map((f) => f.activeLine)).toEqual([
        BUBBLE_SORT_LINES.start,
        BUBBLE_SORT_LINES.done,
      ])
    }
  })

  it('stays well under the frame cap for the largest inputs the UI will allow', () => {
    const twenty = Array.from({ length: 20 }, (_, k) => 20 - k)
    expect(framesFor(twenty).length).toBeLessThan(500)
  })
})

describe('bubble sort: every frame follows the rules in CLAUDE.md', () => {
  it.each(ALL_INPUTS)('%s', (_name, input) => {
    expect(validateFrames(framesFor(input), bubbleSort)).toEqual([])
  })
})

describe('bubble sort: frames', () => {
  it.each(ALL_INPUTS)('%s: every question is answered by the next frame', (_name, input) => {
    const frames = framesFor(input)
    frames.forEach((ask, k) => {
      if (!isAsk(ask)) return
      const answer = frames[k + 1]
      const left = ask.variables?.['a[j]'] as number
      const right = ask.variables?.['a[j+1]'] as number
      // Same comparison, now answered.
      expect(answer?.variables).toMatchObject({
        i: ask.variables?.i,
        j: ask.variables?.j,
        'a[j]': left,
        'a[j+1]': right,
        'swap?': left > right ? 'yes' : 'no',
      })
      expect(answer?.pointers).toEqual(ask.pointers)
      expect(answer && isSwap(answer)).toBe(left > right)
    })
  })

  it.each(ALL_INPUTS)('%s: the array changes only on swap frames, by that pair', (_n, input) => {
    const frames = framesFor(input)
    expect(frames[0]?.array).toEqual(input)
    frames.slice(1).forEach((frame, k) => {
      const before = frames[k]?.array ?? []
      if (!isSwap(frame)) {
        expect(frame.array).toEqual(before)
        return
      }
      const [x, y] = frame.highlights.swapping ?? []
      const expected = [...before]
      ;[expected[x ?? 0], expected[y ?? 0]] = [before[y ?? 0] ?? 0, before[x ?? 0] ?? 0]
      expect(y).toBe((x ?? 0) + 1)
      expect(frame.array).toEqual(expected)
    })
  })

  it.each(ALL_INPUTS)('%s: questions match the array, pointers and code', (_name, input) => {
    for (const frame of framesFor(input).filter(isAsk)) {
      const j = frame.variables?.j as number
      expect(frame.pointers).toEqual({ j, 'j+1': j + 1 })
      expect(frame.highlights.comparing).toEqual([j, j + 1])
      expect(frame.variables?.['a[j]']).toBe(frame.array[j])
      expect(frame.variables?.['a[j+1]']).toBe(frame.array[j + 1])
      expect(frame.explanation.explorer).toMatch(/\?$/)
      expect(sourceLine(frame.activeLine ?? 0)).toBe('if a[j] > a[j + 1]:')
    }
  })

  it.each(ALL_INPUTS)('%s: stats count exactly the questions and swaps', (_name, input) => {
    const frames = framesFor(input)
    let comparisons = 0
    let swaps = 0
    for (const frame of frames) {
      if (isAsk(frame)) comparisons++
      if (isSwap(frame)) swaps++
      expect(frame.stats).toEqual({ comparisons, swaps })
    }
  })

  it.each(ALL_INPUTS)('%s: sorted positions only grow, ending with all', (_name, input) => {
    const frames = framesFor(input)
    let previous = new Set<number>()
    for (const frame of frames) {
      const current = new Set(frame.highlights.sorted ?? [])
      for (const index of previous) expect(current.has(index)).toBe(true)
      // A position marked sorted already holds its final value.
      for (const index of current) expect(frame.array[index]).toBe(sortedCopy(input)[index])
      previous = current
    }
    expect([...previous].sort((x, y) => x - y)).toEqual(input.map((_, k) => k))
  })

  it('points each moment at the right line of code', () => {
    expect(sourceLine(BUBBLE_SORT_LINES.start)).toBe('n = len(a)')
    expect(sourceLine(BUBBLE_SORT_LINES.swap)).toBe('a[j], a[j + 1] = a[j + 1], a[j]')
    expect(sourceLine(BUBBLE_SORT_LINES.passCheck)).toBe('if not swapped:')
    expect(sourceLine(BUBBLE_SORT_LINES.earlyExit)).toBe('break')
    expect(sourceLine(BUBBLE_SORT_LINES.done)).toBe('return a')
  })
})

describe('bubble sort: explanations', () => {
  const frames = framesFor([5, 2, 8, 1, 9, 3])
  const explorer = frames.map((f) => f.explanation.explorer)

  it('asks, then answers, in everyday words', () => {
    expect(explorer).toContain('Is 5 bigger than 2?')
    expect(explorer).toContain('Yes! 5 is bigger, so they trade places.')
    expect(explorer).toContain('Is 5 bigger than 8?')
    expect(explorer).toContain('No, 5 is smaller, so they stay put.')
  })

  it('counts rounds from 1 for Explorer, while the code’s i counts from 0', () => {
    const firstPassEnd = frames.find((f) => f.activeLine === BUBBLE_SORT_LINES.passCheck)
    expect(firstPassEnd?.explanation.explorer).toBe('Round 1 is done: 9 is in its final spot.')
    expect(firstPassEnd?.explanation.engineer).toContain('Pass i = 0')
  })

  it('says when two equal numbers stay put', () => {
    const equal = framesFor([4, 4]).map((f) => f.explanation.explorer)
    expect(equal).toContain('No, they’re both 4, so they stay put.')
  })

  it('reports the totals at the end for Engineer', () => {
    expect(last(frames).explanation.engineer).toBe(
      `Return the sorted array after ${String(last(frames).stats.comparisons)} comparisons and ${String(last(frames).stats.swaps)} swaps.`,
    )
  })
})

describe('bubble sort: trace table', () => {
  const trace = bubbleSort.trace
  if (!trace) throw new Error('bubble sort declares a trace')

  it.each(ALL_INPUTS)('%s: one finished row per comparison at the end', (_name, input) => {
    const frames = framesFor(input)
    const rows = buildTraceRows(frames, frames.length - 1, trace)
    expect(rows).toHaveLength(last(frames).stats.comparisons)
    for (const row of rows) expect(['yes', 'no']).toContain(row.cells[4])
  })

  it('matches design D’s table for its example, with a new group each pass', () => {
    const frames = framesFor([5, 2, 8, 1, 9, 3])
    const rows = buildTraceRows(frames, frames.length - 1, trace)
    expect(rows.slice(0, 6).map((r) => r.cells)).toEqual([
      [0, 0, 5, 2, 'yes'],
      [0, 1, 5, 8, 'no'],
      [0, 2, 8, 1, 'yes'],
      [0, 3, 8, 9, 'no'],
      [0, 4, 9, 3, 'yes'],
      [1, 0, 2, 5, 'no'],
    ])
    expect(rows.filter((r) => r.startsGroup).length).toBe(Number(rows.at(-1)?.cells[0]))
  })
})

describe('bubble sort: metadata', () => {
  it('labels every pointer it uses, for both levels', () => {
    const used = new Set(
      framesFor([5, 2, 8, 1, 9, 3]).flatMap((f) => Object.keys(f.pointers ?? {})),
    )
    expect([...used].sort()).toEqual(['j', 'j+1'])
    for (const name of used) {
      const labels = bubbleSort.pointerLabels?.[name]
      expect(labels?.engineer, name).toBeTruthy()
      expect(labels?.explorer, name).toBeTruthy()
    }
    expect(bubbleSort.pointerLabels?.j?.explorer).toBe('left')
    expect(bubbleSort.pointerLabels?.['j+1']?.explorer).toBe('right')
  })

  it('says what it’s best for, in plain words for Explorer', () => {
    expect(bubbleSort.bestFor.engineer).toBe('small or nearly sorted lists')
    expect(bubbleSort.bestFor.explorer).toMatch(/\.$/)
    expect(findJargon(bubbleSort.bestFor.explorer)).toBeNull()
  })

  it('answers the beginner’s questions in its idea, at both levels', () => {
    expect(bubbleSort.idea.explorer.points.map((p) => p.question)).toEqual([
      'Why two at a time?',
      'Why start on the left?',
      'Why not three at a time?',
      'When do we stop?',
    ])
    expect(bubbleSort.idea.engineer.points.map((p) => p.question)).toEqual([
      'Why adjacent pairs?',
      'Why left to right?',
      'Why not three at a time?',
      'Why stop early?',
    ])
    // Engineer also says what each pass guarantees, and why sorted input is O(n).
    const engineer = bubbleSort.idea.engineer.points.map((p) => p.answer).join(' ')
    expect(engineer).toContain('maximum of the unsorted part to its final position')
    expect(engineer).toContain('O(n)')
  })

  it('has the expected complexity and a Python source of 11 lines', () => {
    expect(bubbleSort.complexity).toEqual({
      time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
      space: 'O(1)',
    })
    expect(bubbleSort.source.python.split('\n')).toHaveLength(11)
  })
})
