import { describe, expect, it } from 'vitest'
import { findJargon } from '../engine/jargon'
import type { PivotRule } from '../engine/types'
import { PIVOT_NAMES, pivotChoices, pivotComparison } from './pivotWords'

// Questions for 1..12 already in order, by rule (quick sort, from the frames).
const SORTED_12: Record<PivotRule, number> = { first: 66, last: 66, middle: 25, random: 31 }
// And for the default numbers 5 2 8 1 9 3: the last one is already the fewest.
const DEFAULT: Record<PivotRule, number> = { first: 9, last: 8, middle: 9, random: 9 }

describe('the pivot rule in words', () => {
  it('Explorer chooses from three, Engineer from four', () => {
    expect(pivotChoices('explorer', 'last')).toEqual(['last', 'middle', 'random'])
    expect(pivotChoices('engineer', 'last')).toEqual(['first', 'last', 'middle', 'random'])
  })

  it('a rule Explorer doesn’t offer, from a link, still shows, first', () => {
    expect(pivotChoices('explorer', 'first')).toEqual(['first', 'last', 'middle', 'random'])
  })

  it('Explorer’s names are plain words', () => {
    expect(PIVOT_NAMES.explorer).toEqual({
      first: 'the first one',
      last: 'the last one',
      middle: 'the middle one',
      random: 'a surprise one',
    })
    for (const name of Object.values(PIVOT_NAMES.explorer)) expect(findJargon(name)).toBeNull()
  })
})

describe('the finish’s comparison', () => {
  it('suggests the rule with the fewest questions, when it really is fewer', () => {
    expect(pivotComparison('explorer', 'last', SORTED_12)).toBe(
      'With the last one as leader: 66 questions. Try the middle one: 25!',
    )
    expect(pivotComparison('engineer', 'last', SORTED_12)).toBe(
      'Pivot last: 66 comparisons. Middle would take 25.',
    )
    expect(pivotComparison('explorer', 'random', SORTED_12)).toBe(
      'With a surprise one as leader: 31 questions. Try the middle one: 25!',
    )
  })

  it('says the count alone when no other rule takes fewer', () => {
    expect(pivotComparison('explorer', 'middle', SORTED_12)).toBe(
      'With the middle one as leader: 25 questions.',
    )
    expect(pivotComparison('explorer', 'last', DEFAULT)).toBe(
      'With the last one as leader: 8 questions.',
    )
    expect(pivotComparison('engineer', 'last', DEFAULT)).toBe('Pivot last: 8 comparisons.')
  })

  it('only suggests a rule the level offers (Explorer has no "first")', () => {
    const firstIsBest: Record<PivotRule, number> = { first: 3, last: 10, middle: 9, random: 12 }
    expect(pivotComparison('explorer', 'last', firstIsBest)).toBe(
      'With the last one as leader: 10 questions. Try the middle one: 9!',
    )
    expect(pivotComparison('engineer', 'last', firstIsBest)).toBe(
      'Pivot last: 10 comparisons. First would take 3.',
    )
  })

  it('a tie is not a suggestion, and one question is singular', () => {
    expect(pivotComparison('explorer', 'last', { last: 1, middle: 1, random: 1 })).toBe(
      'With the last one as leader: 1 question.',
    )
    expect(pivotComparison('explorer', 'last', {})).toBeNull()
  })

  it('phones: a suggestion also says where to change the rule; no suggestion, no pointer', () => {
    expect(pivotComparison('explorer', 'last', SORTED_12, 'Numbers')).toBe(
      'With the last one as leader: 66 questions. Try the middle one: 25! Change it in Numbers.',
    )
    expect(pivotComparison('engineer', 'last', SORTED_12, 'Numbers')).toBe(
      'Pivot last: 66 comparisons. Middle would take 25. Change it in Numbers.',
    )
    expect(pivotComparison('explorer', 'middle', SORTED_12, 'Numbers')).toBe(
      'With the middle one as leader: 25 questions.',
    )
  })

  it('Explorer’s sentences pass the jargon check', () => {
    for (const rule of ['last', 'middle', 'random'] as const) {
      expect(findJargon(pivotComparison('explorer', rule, SORTED_12) ?? '')).toBeNull()
    }
  })
})
