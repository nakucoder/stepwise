import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUT } from '../data/defaultInput'
import {
  describeProblem,
  formatNumbers,
  INPUT_LIMITS,
  numbersParam,
  parseNumbers,
  PRESETS,
  presetNumbers,
  type InputProblem,
  type PresetId,
} from './input'
import { findJargon } from './jargon'
import type { Level } from './types'

const values = (text: string) => {
  const result = parseNumbers(text)
  if (!result.ok) throw new Error(`expected ${text} to parse, got ${result.problem.kind}`)
  return result.values
}
const problem = (text: string) => {
  const result = parseNumbers(text)
  if (result.ok) throw new Error(`expected ${text} to be rejected`)
  return result.problem
}

/** A small seeded generator (mulberry32), so preset tests are repeatable. */
function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('parseNumbers: accepted input', () => {
  it.each([
    ['5 2 8', [5, 2, 8]],
    ['5,2,8', [5, 2, 8]],
    ['5, 2, 8', [5, 2, 8]],
    ['  5   2\t8\n', [5, 2, 8]],
    ['5,,2 , 8,', [5, 2, 8]],
    ['07 3', [7, 3]],
  ])('reads %j', (text, expected) => {
    expect(values(text)).toEqual(expected)
  })

  it('accepts the limits exactly: 0 and 99, 2 and 12 numbers', () => {
    expect(values('0 99')).toEqual([0, 99])
    expect(values(Array.from({ length: 12 }, (_, k) => k).join(' '))).toHaveLength(12)
  })

  it('accepts duplicates', () => {
    expect(values('4 4 1 4')).toEqual([4, 4, 1, 4])
  })

  it('accepts the default numbers every workspace starts with', () => {
    expect(values(formatNumbers(DEFAULT_INPUT))).toEqual(DEFAULT_INPUT)
  })
})

describe('parseNumbers: rejected input', () => {
  it.each([
    ['', { kind: 'empty' }],
    ['  , , ', { kind: 'empty' }],
    ['5 x 8', { kind: 'notANumber', token: 'x' }],
    ['5 3a', { kind: 'notANumber', token: '3a' }],
    ['5 +3', { kind: 'notANumber', token: '+3' }],
    ['5 1e2', { kind: 'notANumber', token: '1e2' }],
    ['5 2.5', { kind: 'notWhole', token: '2.5' }],
    ['5 2.0', { kind: 'notWhole', token: '2.0' }],
    ['5 100', { kind: 'outOfRange', token: '100', value: 100 }],
    ['5 -1', { kind: 'outOfRange', token: '-1', value: -1 }],
    ['7', { kind: 'tooFew', count: 1 }],
    [Array.from({ length: 13 }, (_, k) => k).join(' '), { kind: 'tooMany', count: 13 }],
  ])('rejects %j', (text, expected) => {
    expect(problem(text)).toEqual(expected)
  })

  it('reports the first bad number, before counting', () => {
    expect(problem('x 200')).toEqual({ kind: 'notANumber', token: 'x' })
    expect(problem('200')).toEqual({ kind: 'outOfRange', token: '200', value: 200 })
  })
})

describe('describeProblem', () => {
  const problems: InputProblem[] = [
    { kind: 'empty' },
    { kind: 'notANumber', token: 'x' },
    { kind: 'notWhole', token: '2.5' },
    { kind: 'outOfRange', token: '100', value: 100 },
    { kind: 'outOfRange', token: '-1', value: -1 },
    { kind: 'tooFew', count: 1 },
    { kind: 'tooMany', count: 13 },
  ]
  const levels: Level[] = ['explorer', 'engineer']

  it('explains every problem at both levels', () => {
    for (const p of problems) {
      for (const level of levels) {
        expect(describeProblem(p, level).trim(), `${p.kind} / ${level}`).not.toBe('')
      }
    }
  })

  it('keeps Explorer messages free of jargon', () => {
    for (const p of problems) {
      const text = describeProblem(p, 'explorer')
      expect(findJargon(text), text).toBeNull()
    }
  })

  it('names the bad entry and the rule to follow', () => {
    expect(describeProblem({ kind: 'notANumber', token: 'x' }, 'explorer')).toBe(
      '“x” isn’t a number. Use numbers like 7 3 12.',
    )
    expect(describeProblem({ kind: 'outOfRange', token: '100', value: 100 }, 'explorer')).toBe(
      '“100” is too big. Use numbers from 0 to 99.',
    )
    expect(describeProblem({ kind: 'outOfRange', token: '-1', value: -1 }, 'explorer')).toBe(
      '“-1” is less than 0. Use numbers from 0 to 99.',
    )
    expect(describeProblem({ kind: 'tooMany', count: 13 }, 'engineer')).toBe(
      'Got 13 values; the limit is 12.',
    )
    expect(describeProblem({ kind: 'notWhole', token: '2.5' }, 'engineer')).toContain(
      '“2.5” is not an integer.',
    )
  })

  it('shortens a long pasted entry', () => {
    const text = describeProblem({ kind: 'notANumber', token: 'a'.repeat(200) }, 'explorer')
    expect(text).toContain(`“${'a'.repeat(11)}…”`)
    expect(text.length).toBeLessThan(80)
  })
})

describe('formatting for the field and the address', () => {
  it('round-trips through both', () => {
    const list = [5, 0, 99, 5]
    expect(formatNumbers(list)).toBe('5 0 99 5')
    expect(numbersParam(list)).toBe('5,0,99,5')
    expect(values(formatNumbers(list))).toEqual(list)
    expect(values(numbersParam(list))).toEqual(list)
  })
})

describe('presets', () => {
  const ids: PresetId[] = ['random', 'sorted', 'reversed', 'nearlySorted']
  const isAscending = (list: readonly number[]) =>
    list.every((v, k) => k === 0 || (list[k - 1] ?? -Infinity) < v)

  it('labels every preset for both levels, without jargon for Explorer', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(ids)
    expect(PRESETS.map((p) => p.label.explorer)).toEqual([
      'Mixed up',
      'Already in order',
      'Backwards',
      'Almost in order',
    ])
    expect(PRESETS.map((p) => p.label.engineer)).toEqual([
      'Random',
      'Already sorted',
      'Reversed',
      'Nearly sorted',
    ])
    for (const p of PRESETS) expect(findJargon(p.label.explorer)).toBeNull()
  })

  it.each(ids)('%s: the right count of different numbers from 1 to 99, valid input', (id) => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const count of [2, 6, 12]) {
        const list = presetNumbers(id, count, seeded(seed))
        expect(list).toHaveLength(count)
        expect(new Set(list).size).toBe(count)
        for (const v of list) expect(v >= 1 && v <= 99 && Number.isInteger(v)).toBe(true)
        expect(values(formatNumbers(list))).toEqual(list)
      }
    }
  })

  it('sorted is ascending and reversed is descending', () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(isAscending(presetNumbers('sorted', 8, seeded(seed)))).toBe(true)
      expect(isAscending(presetNumbers('reversed', 8, seeded(seed)).reverse())).toBe(true)
    }
  })

  it('nearly sorted has exactly one neighboring pair out of order', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const list = presetNumbers('nearlySorted', 8, seeded(seed))
      const outOfOrder = list.filter((v, k) => k > 0 && (list[k - 1] ?? -Infinity) > v)
      expect(outOfOrder).toHaveLength(1)
      expect(isAscending([...list].sort((a, b) => a - b))).toBe(true)
    }
  })

  it('keeps the count within the limits', () => {
    expect(presetNumbers('random', 1, seeded(1))).toHaveLength(INPUT_LIMITS.minCount)
    expect(presetNumbers('random', 40, seeded(1))).toHaveLength(INPUT_LIMITS.maxCount)
  })

  it('copes with a random source that returns its extremes', () => {
    for (const edge of [0, 0.9999999999]) {
      for (const id of ids) {
        const list = presetNumbers(id, 6, () => edge)
        expect(new Set(list).size).toBe(6)
      }
    }
  })

  it('is repeatable with the same seed and varies between seeds', () => {
    expect(presetNumbers('random', 6, seeded(7))).toEqual(presetNumbers('random', 6, seeded(7)))
    expect(presetNumbers('random', 6, seeded(7))).not.toEqual(presetNumbers('random', 6, seeded(8)))
  })
})
