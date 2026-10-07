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

describe('new-smallest (selection sort): the answer is the min pointer', () => {
  const ask = frame([5, 2, 8], {
    pointers: { min: 0, j: 1 },
    decision: { kind: 'new-smallest', pair: [0, 1] },
  })

  it('picks the candidate when the min pointer moves onto it', () => {
    const frames = [ask, frame([5, 2, 8], { pointers: { min: 1, j: 1 } })]
    expect(answerAt(frames, 0)).toEqual({ kind: 'pick', index: 1 })
    expect(isRightChoice(frames, 0, { kind: 'pick', index: 1 })).toBe(true)
    expect(isRightChoice(frames, 0, { kind: 'pick', index: 0 })).toBe(false)
    expect(isRightChoice(frames, 0, { kind: 'keep' })).toBe(false)
    expect(validateFrames(frames, algorithm)).toEqual([])
  })

  it('keeps when the min pointer stays on the smallest so far', () => {
    const frames = [ask, frame([5, 2, 8], { pointers: { min: 0, j: 1 } })]
    expect(answerAt(frames, 0)).toEqual({ kind: 'keep' })
    expect(isRightChoice(frames, 0, { kind: 'keep' })).toBe(true)
    expect(isRightChoice(frames, 0, { kind: 'pick', index: 1 })).toBe(false)
  })

  it('reports a next frame with the pointer elsewhere, or with changed values', () => {
    const elsewhere = [ask, frame([5, 2, 8], { pointers: { min: 2 } })]
    const changed = [ask, frame([2, 5, 8], { pointers: { min: 1 } })]
    for (const frames of [elsewhere, changed]) {
      expect(answerAt(frames, 0)).toBeNull()
      expect(validateFrames(frames, algorithm)[0]).toMatch(/min pointer/)
    }
  })
})

describe('to-front (selection sort, end of a pass)', () => {
  it('trades the front and the smallest, which can be far apart', () => {
    const ask = frame([5, 2, 1], { decision: { kind: 'to-front', pair: [0, 2] } })
    const frames = [ask, frame([1, 2, 5])]
    expect(answerAt(frames, 0)).toEqual({ kind: 'trade', pair: [0, 2] })
    expect(isRightChoice(frames, 0, { kind: 'trade', pair: [2, 0] })).toBe(true)
    expect(validateFrames(frames, algorithm)).toEqual([])
  })

  it('may name one position when the smallest is already at the front: keep', () => {
    const ask = frame([1, 2, 5], { decision: { kind: 'to-front', pair: [0, 0] } })
    const frames = [ask, frame([1, 2, 5])]
    expect(answerAt(frames, 0)).toEqual({ kind: 'keep' })
    expect(validateFrames(frames, algorithm)).toEqual([])
  })

  it('still reports a pair that is not left first', () => {
    const ask = frame([1, 2, 5], { decision: { kind: 'to-front', pair: [2, 0] } })
    expect(validateFrames([ask, frame([1, 2, 5])], algorithm)[0]).toMatch(/decision pair/)
  })
})
