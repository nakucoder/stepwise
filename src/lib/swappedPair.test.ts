import { describe, expect, it } from 'vitest'
import { swappedPair } from './swappedPair'

describe('swappedPair', () => {
  it('finds two neighbours that traded places', () => {
    expect(swappedPair([5, 2, 8], [2, 5, 8])).toEqual([0, 1])
  })

  it('finds a swap between distant positions', () => {
    expect(swappedPair([1, 2, 3, 4], [4, 2, 3, 1])).toEqual([0, 3])
  })

  it('works in both directions (stepping back un-swaps)', () => {
    expect(swappedPair([2, 5, 8], [5, 2, 8])).toEqual([0, 1])
  })

  it.each<[string, number[], number[]]>([
    ['no change', [1, 2, 3], [1, 2, 3]],
    ['one value changed', [1, 2, 3], [1, 9, 3]],
    ['two values changed but not exchanged', [1, 2, 3], [7, 8, 3]],
    ['three positions changed (a jump)', [3, 1, 2], [1, 2, 3]],
    ['different lengths', [1, 2], [2, 1, 3]],
    ['empty arrays', [], []],
  ])('returns null for %s', (_name, previous, next) => {
    expect(swappedPair(previous, next)).toBeNull()
  })

  it('treats equal values as no change', () => {
    expect(swappedPair([4, 4, 1], [4, 4, 1])).toBeNull()
  })
})
