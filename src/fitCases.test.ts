import { describe, expect, it } from 'vitest'
import { FIT_SCREEN, FIT_SORTS, fitCases, fitUrl, TWELVE } from '../scripts/fitCases'
import { ALGORITHMS } from './algorithms'
import { drawnCharacter } from './characters/registry'
import { INPUT_LIMITS } from './engine/input'

describe('check:fit covers every sort, in Watch and in Do it', () => {
  it('lists every algorithm, whether it has Do it, and checks its character when one is drawn', () => {
    const expected = Object.entries(ALGORITHMS).map(([path, algorithm]) => ({
      path,
      character: drawnCharacter(algorithm) !== undefined,
      doIt: algorithm.doIt === true,
    }))
    expect([...FIT_SORTS].sort((a, b) => a.path.localeCompare(b.path))).toEqual(
      expected.sort((a, b) => a.path.localeCompare(b.path)),
    )
  })

  it('plays Watch and Do it, each look, both levels, the default numbers and the most allowed', () => {
    expect(TWELVE).toHaveLength(INPUT_LIMITS.maxCount)
    const cases = fitCases()
    // 4 sorts, each with bars and its character: 2 modes x 8 looks x 2 levels x 2 inputs.
    expect(cases).toHaveLength(64)
    expect(cases.filter((c) => c.mode === 'watch')).toHaveLength(32)
    expect(cases.filter((c) => c.path === 'sorting/merge-sort').map((c) => c.look)).toContain(
      'character',
    )
    expect(cases[1] && fitUrl('http://x', cases[1])).toBe(
      `http://x/sorting/bubble-sort?numbers=${TWELVE.join(',')}`,
    )
    const doIt = cases.find((c) => c.mode === 'do' && c.numbers !== null)
    expect(doIt && fitUrl('http://x', doIt)).toBe(
      `http://x/sorting/bubble-sort?mode=do&numbers=${TWELVE.join(',')}`,
    )
    // A sort without Do it is played in Watch only.
    expect(fitCases([{ path: 'sorting/x', character: false, doIt: false }])).toHaveLength(4)
    expect(FIT_SCREEN).toEqual({ width: 740, height: 300, textScale: '130%' })
  })
})
