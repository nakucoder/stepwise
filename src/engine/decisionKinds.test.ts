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

describe('left-or-right (quick sort): the answer is the partition’s wall', () => {
  const part = (wall: number, next: number, event: 'compare' | 'left' | 'right') => ({
    event,
    lo: 0,
    hi: 4,
    depth: 0,
    pivot: 3,
    wall,
    next,
  })
  // [5, 2, 8, 3], pivot 3: a[1] = 2 is checked, with the wall at 1 (5 is in the bigger zone).
  const ask = frame([5, 2, 8, 3], {
    partition: part(1, 1, 'compare'),
    decision: { kind: 'left-or-right', pair: [1, 1] },
  })

  it('left when the wall moves one place, even when the value swaps with itself', () => {
    const frames = [ask, frame([5, 2, 8, 3], { partition: part(2, 2, 'left') })]
    expect(answerAt(frames, 0)).toEqual({ kind: 'trade', pair: [1, 1] })
    expect(isRightChoice(frames, 0, { kind: 'trade', pair: [1, 1] })).toBe(true)
    expect(isRightChoice(frames, 0, { kind: 'keep' })).toBe(false)
    expect(validateFrames(frames, algorithm)).toEqual([])
  })

  it('left with a real swap: the pair in either order', () => {
    const swapAsk = frame([5, 2, 8, 3], {
      partition: part(0, 1, 'compare'),
      decision: { kind: 'left-or-right', pair: [0, 1] },
    })
    const frames = [swapAsk, frame([2, 5, 8, 3], { partition: part(1, 2, 'left') })]
    expect(isRightChoice(frames, 0, { kind: 'trade', pair: [1, 0] })).toBe(true)
    expect(validateFrames(frames, algorithm)).toEqual([])
  })

  it('right when the wall stays', () => {
    const frames = [ask, frame([5, 2, 8, 3], { partition: part(1, 2, 'right') })]
    expect(answerAt(frames, 0)).toEqual({ kind: 'keep' })
    expect(isRightChoice(frames, 0, { kind: 'trade', pair: [1, 1] })).toBe(false)
  })

  it('reports a wall that moves two places, a pair that isn’t the wall and next, or no partition', () => {
    const jumped = [ask, frame([5, 2, 8, 3], { partition: part(3, 2, 'left') })]
    const wrongPair = [
      frame([5, 2, 8, 3], {
        partition: part(1, 1, 'compare'),
        decision: { kind: 'left-or-right', pair: [0, 1] },
      }),
      frame([5, 2, 8, 3], { partition: part(2, 2, 'left') }),
    ]
    const none = [ask, frame([5, 2, 8, 3])]
    for (const frames of [jumped, wrongPair, none]) {
      expect(answerAt(frames, 0)).toBeNull()
      expect(validateFrames(frames, algorithm).join('\n')).toMatch(/wall neither moved/)
    }
  })
})
