import { describe, expect, it } from 'vitest'
import { findAlgorithm, findCategory } from '../data/categories'
import { ALGORITHMS, findImplementation } from './index'

describe('algorithm registry', () => {
  it.each(Object.entries(ALGORITHMS))('%s matches its entry in the category data', (key, alg) => {
    const category = findCategory(alg.category)
    const entry = category && findAlgorithm(category, alg.id)
    expect(entry, `${key} is missing from src/data/categories.ts`).toBeDefined()
    expect(alg.name).toBe(entry?.name)
    expect(alg.explorerName).toBe(entry?.explorerName)
    expect(key).toBe(`${alg.category}/${alg.id}`)
  })

  it('finds implementations by URL segments', () => {
    expect(findImplementation('sorting', 'bubble-sort')?.name).toBe('Bubble sort')
    expect(findImplementation('sorting', 'quick-sort')).toBeUndefined()
    expect(findImplementation(undefined, undefined)).toBeUndefined()
  })
})
