import { describe, expect, it } from 'vitest'
import { findJargon } from '../engine/jargon'
import tokensCss from '../styles/tokens.css?raw'
import { CATEGORIES, findAlgorithm, findCategory } from './categories'

const URL_SAFE = /^[a-z0-9]+(-[a-z0-9]+)*$/

describe('category data', () => {
  it('has the eight categories numbered 1 to 8 in order', () => {
    expect(CATEGORIES.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(8)
  })

  it.each(CATEGORIES)('$name: ids are URL-safe and unique', (category) => {
    expect(category.id).toMatch(URL_SAFE)
    const ids = category.algorithms.map((a) => a.id)
    expect(category.algorithms.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(URL_SAFE)
  })

  it.each(CATEGORIES)('$name: has text for both levels, with no jargon for Explorer', (c) => {
    expect(c.description.explorer.trim()).not.toBe('')
    expect(c.description.engineer.trim()).not.toBe('')
    expect(findJargon(c.description.explorer)).toBeNull()
    expect(c.algorithmSummary.trim()).not.toBe('')
  })

  it.each(CATEGORIES)('$name: every algorithm has a distinct, jargon-free Explorer name', (c) => {
    const explorerNames = c.algorithms.map((a) => a.explorerName)
    expect(new Set(explorerNames).size).toBe(explorerNames.length)
    for (const algorithm of c.algorithms) {
      expect(algorithm.explorerName.trim(), algorithm.id).not.toBe('')
      expect(findJargon(algorithm.explorerName), algorithm.id).toBeNull()
    }
  })

  it.each(CATEGORIES)('$name: colors are tokens that exist in tokens.css', (category) => {
    for (const value of [category.color, category.onColor]) {
      const token = /^var\((--[\w-]+)\)$/.exec(value)?.[1]
      expect(token, value).toBeDefined()
      expect(tokensCss).toContain(`${String(token)}:`)
    }
    expect(category.color).toBe(`var(--cat-${category.id})`)
  })

  it('finds categories and algorithms by id', () => {
    const sorting = findCategory('sorting')
    expect(sorting?.name).toBe('Sorting')
    expect(sorting && findAlgorithm(sorting, 'bubble-sort')?.name).toBe('Bubble sort')
    expect(findCategory('nope')).toBeUndefined()
    expect(findCategory(undefined)).toBeUndefined()
    expect(sorting && findAlgorithm(sorting, 'nope')).toBeUndefined()
  })
})
