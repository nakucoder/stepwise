import { describe, expect, it } from 'vitest'
import { builtFirst, isAlgorithmBuilt, isCategoryBuilt } from './availability'
import { CATEGORIES, findCategory } from './categories'

describe('availability', () => {
  it('knows bubble sort and selection sort are built and the rest of sorting is not yet', () => {
    const sorting = findCategory('sorting')
    if (!sorting) throw new Error('no sorting')
    const built = sorting.algorithms.filter((a) => isAlgorithmBuilt(sorting, a)).map((a) => a.id)
    expect(built).toEqual(['bubble-sort', 'selection-sort'])
    expect(isCategoryBuilt(sorting)).toBe(true)
  })

  it('knows a topic with nothing built yet', () => {
    const searching = findCategory('searching')
    if (!searching) throw new Error('no searching')
    expect(isCategoryBuilt(searching)).toBe(false)
  })

  it('puts built items first and keeps each group in its original order', () => {
    const built = new Set(['c', 'e'])
    expect(builtFirst(['a', 'b', 'c', 'd', 'e'], (x) => built.has(x))).toEqual([
      'c',
      'e',
      'a',
      'b',
      'd',
    ])
    expect(builtFirst([], () => true)).toEqual([])
  })

  it('every topic is either built or coming soon, with sorting built today', () => {
    expect(CATEGORIES.filter(isCategoryBuilt).map((c) => c.id)).toEqual(['sorting'])
  })
})
