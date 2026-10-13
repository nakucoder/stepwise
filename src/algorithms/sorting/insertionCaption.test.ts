import { describe, expect, it } from 'vitest'
import { collectFrames } from '../../engine/collect'
import { groupCaption } from '../../engine/trace'
import { insertionSort } from './insertionSort'

const INPUTS: readonly (readonly [string, readonly number[]])[] = [
  ['the default numbers', [5, 2, 8, 1, 9, 3]],
  ['already sorted', [1, 2, 3, 4, 5]],
  ['reversed', [5, 4, 3, 2, 1]],
  ['duplicates', [3, 1, 3, 2, 1]],
  ['one number', [7]],
  ['two numbers', [2, 1]],
]

const caption = (input: readonly number[], k: number, level: 'explorer' | 'engineer') => {
  const { frames } = collectFrames(insertionSort, input)
  const frame = k < 0 ? frames.at(k) : frames[k]
  if (!frame) throw new Error('a frame')
  return groupCaption(frame, insertionSort.trace, level)
}

describe('insertion sort’s stage caption at the end', () => {
  it.each(INPUTS)('%s: the last frame says "all in order", in both levels', (_, input) => {
    expect(caption(input, -1, 'explorer')).toBe('all in order')
    expect(caption(input, -1, 'engineer')).toBe('all in order')
  })

  it('before the first round there is still no caption', () => {
    for (const [, input] of INPUTS) {
      expect(caption(input, 0, 'explorer')).toBeNull()
      expect(caption(input, 0, 'engineer')).toBeNull()
    }
  })
})
