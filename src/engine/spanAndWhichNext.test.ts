import { describe, expect, it } from 'vitest'
import { answerAt, isRightChoice } from './decision'
import type { Frame } from './types'
import { validateFrames } from './validateFrames'

const frame = (array: number[], extra: Partial<Frame> = {}): Frame => ({
  array,
  highlights: {},
  activeLine: null,
  explanation: { explorer: 'Step.', engineer: 'Step.' },
  stats: { comparisons: 0, swaps: 0 },
  ...extra,
})
const algorithm = { source: { python: 'pass' } }

/**
 * Hand-made two-row frames (not merge sort): merging [5] and [2, 8]. The main row's three places
 * are empty; the fronts wait in the buffer at columns 0 (left) and 1 (right).
 */
const ask = frame([5, 2, 8], {
  vacant: [0, 1, 2],
  buffer: { values: [5, 2, 8] },
  decision: { kind: 'which-next', pair: [0, 1] },
})
const tookRight = frame([2, 2, 8], { vacant: [1, 2], buffer: { values: [5, null, 8] } })
const tookLeft = frame([5, 2, 8], { vacant: [1, 2], buffer: { values: [null, 2, 8] } })

describe('which-next (merge sort): the answer is the front that moved up', () => {
  it('picks the right front when its slot empties and its value arrives in the main row', () => {
    const frames = [ask, tookRight]
    expect(answerAt(frames, 0)).toEqual({ kind: 'pick', index: 1 })
    expect(isRightChoice(frames, 0, { kind: 'pick', index: 1 })).toBe(true)
    expect(isRightChoice(frames, 0, { kind: 'pick', index: 0 })).toBe(false)
    expect(isRightChoice(frames, 0, { kind: 'keep' })).toBe(false)
    expect(validateFrames(frames, algorithm)).toEqual([])
  })

  it('picks the left front the same way', () => {
    expect(answerAt([ask, tookLeft], 0)).toEqual({ kind: 'pick', index: 0 })
  })

  it('reports a next frame that moves neither front up, or both', () => {
    const neither = frame([5, 2, 8], { vacant: [0, 1, 2], buffer: { values: [5, 2, 8] } })
    const both = frame([5, 2, 8], { vacant: [2], buffer: { values: [null, null, 8] } })
    const noBuffer = frame([2, 5, 8])
    for (const next of [neither, both, noBuffer]) {
      expect(answerAt([ask, next], 0)).toBeNull()
      expect(validateFrames([ask, next], algorithm)).toEqual([
        'frame 0: the next frame moves neither front of the decision pair up from the buffer',
      ])
    }
  })

  it('a slot that empties without its value arriving in an empty place is no answer', () => {
    const lost = frame([5, 2, 8], { vacant: [0, 1, 2], buffer: { values: [5, null, 8] } })
    expect(answerAt([ask, lost], 0)).toBeNull()
  })
})

describe('span: a split or merge’s part must lie inside the array', () => {
  it('accepts lo < mid < hi within the array and a whole depth', () => {
    const f = frame([5, 2, 8], { span: { event: 'split', lo: 0, mid: 1, hi: 3, depth: 0 } })
    expect(validateFrames([f], algorithm)).toEqual([])
  })

  it.each([
    [{ lo: 0, mid: 0, hi: 3 }, 'lo = mid'],
    [{ lo: 0, mid: 3, hi: 3 }, 'mid = hi'],
    [{ lo: -1, mid: 1, hi: 3 }, 'below 0'],
    [{ lo: 0, mid: 2, hi: 4 }, 'past the end'],
    [{ lo: 0, mid: 1.5, hi: 3 }, 'not whole'],
  ])('reports %o (%s)', (part) => {
    const f = frame([5, 2, 8], { span: { event: 'merged', depth: 0, ...part } })
    expect(validateFrames([f], algorithm)).toEqual([
      `frame 0: span [${String(part.lo)}, ${String(part.mid)}, ${String(part.hi)}) is not lo < mid < hi inside the array`,
    ])
  })

  it('reports a depth that is not a whole number from 0', () => {
    const f = frame([5, 2, 8], { span: { event: 'split', lo: 0, mid: 1, hi: 3, depth: -1 } })
    expect(validateFrames([f], algorithm)).toEqual([
      'frame 0: span depth -1 is not a non-negative whole number',
    ])
  })
})
