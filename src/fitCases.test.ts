import { describe, expect, it } from 'vitest'
import { FIT_SCREEN, FIT_SORTS, fitCases, fitUrl, TWELVE } from '../scripts/fitCases'
import { ALGORITHMS } from './algorithms'
import { drawnCharacter } from './characters/registry'
import { INPUT_LIMITS } from './engine/input'

describe('check:fit covers every sort in Do it', () => {
  it('lists every algorithm with Do it, and checks its character when one is drawn', () => {
    const expected = Object.entries(ALGORITHMS)
      .filter(([, algorithm]) => algorithm.doIt === true)
      .map(([path, algorithm]) => ({ path, character: drawnCharacter(algorithm) !== undefined }))
    expect([...FIT_SORTS].sort((a, b) => a.path.localeCompare(b.path))).toEqual(
      expected.sort((a, b) => a.path.localeCompare(b.path)),
    )
  })

  it('plays each look, both levels, the default numbers and the most numbers allowed', () => {
    expect(TWELVE).toHaveLength(INPUT_LIMITS.maxCount)
    const cases = fitCases()
    // 4 sorts, each with bars and its character: 8 looks x 2 levels x 2 inputs.
    expect(cases).toHaveLength(32)
    expect(cases.filter((c) => c.path === 'sorting/merge-sort').map((c) => c.look)).toContain(
      'character',
    )
    expect(cases[1] && fitUrl('http://x', cases[1])).toBe(
      `http://x/sorting/bubble-sort?mode=do&numbers=${TWELVE.join(',')}`,
    )
    expect(FIT_SCREEN).toEqual({ width: 740, height: 300, textScale: '130%' })
  })
})
