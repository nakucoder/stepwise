import { describe, expect, it } from 'vitest'
import { answerAt, decisionIndexes, isRightChoice } from './decision'
import type { Frame } from './types'

const frame = (array: number[], fields: Partial<Frame> = {}): Frame => ({
  array,
  highlights: {},
  activeLine: null,
  explanation: { explorer: 'Look.', engineer: 'Look.' },
  stats: { comparisons: 0, swaps: 0 },
  ...fields,
})
const ask = (array: number[], pair: [number, number]) =>
  frame(array, { decision: { kind: 'trade-or-keep', pair } })

// 5 2 8: trade the first pair; then keep 5 and 8.
const FRAMES = [
  frame([5, 2, 8]),
  ask([5, 2, 8], [0, 1]),
  frame([2, 5, 8]),
  ask([2, 5, 8], [1, 2]),
  frame([2, 5, 8]),
]

describe('answerAt', () => {
  it('reads a trade from the next frame', () => {
    expect(answerAt(FRAMES, 1)).toEqual({ kind: 'trade', pair: [0, 1] })
  })

  it('reads a keep when the next frame is unchanged', () => {
    expect(answerAt(FRAMES, 3)).toEqual({ kind: 'keep' })
  })

  it('is null for frames that are not decisions, and for a decision with no answer', () => {
    expect(answerAt(FRAMES, 0)).toBeNull()
    expect(answerAt([ask([2, 1], [0, 1])], 0)).toBeNull()
  })

  it('is null when the next frame changes something else', () => {
    expect(answerAt([ask([3, 1, 2], [0, 1]), frame([2, 1, 3])], 0)).toBeNull()
    expect(answerAt([ask([3, 1, 2], [0, 1]), frame([1, 3, 9])], 0)).toBeNull()
  })
})

describe('isRightChoice', () => {
  it('accepts the right move, with the pair in either order', () => {
    expect(isRightChoice(FRAMES, 1, { kind: 'trade', pair: [0, 1] })).toBe(true)
    expect(isRightChoice(FRAMES, 1, { kind: 'trade', pair: [1, 0] })).toBe(true)
    expect(isRightChoice(FRAMES, 3, { kind: 'keep' })).toBe(true)
  })

  it('rejects the wrong move, and a trade of the wrong pair', () => {
    expect(isRightChoice(FRAMES, 1, { kind: 'keep' })).toBe(false)
    expect(isRightChoice(FRAMES, 3, { kind: 'trade', pair: [1, 2] })).toBe(false)
    expect(isRightChoice(FRAMES, 1, { kind: 'trade', pair: [1, 2] })).toBe(false)
  })

  it('rejects any move where there is no decision', () => {
    expect(isRightChoice(FRAMES, 0, { kind: 'keep' })).toBe(false)
  })
})

describe('decisionIndexes', () => {
  it('lists the decision frames in order', () => {
    expect(decisionIndexes(FRAMES)).toEqual([1, 3])
  })
})
