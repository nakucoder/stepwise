import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUT } from '../data/defaultInput'
import {
  DEFAULT_PIVOT_RULE,
  parsePivotRule,
  PIVOT_RULES,
  describeProblem,
  formatNumbers,
  INPUT_LIMITS,
  numbersParam,
  parseNumbers,
  PRESETS,
  presetNumbers,
  type InputProblem,
  type PresetId,
  BAR_RANGE,
  fitsRange,
  rankNumbers,
  outsideRange,
  describeOutside,
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

describe('the pivot rule in the address (?pivot=)', () => {
  it('reads a known rule', () => {
    expect(PIVOT_RULES.map((rule) => parsePivotRule(rule))).toEqual([
      'first',
      'last',
      'middle',
      'random',
    ])
  })

  it.each([null, '', 'banana', 'Middle', 'median', ' last'])(
    'falls back to "last" for %j',
    (param) => {
      expect(parsePivotRule(param)).toBe(DEFAULT_PIVOT_RULE)
      expect(DEFAULT_PIVOT_RULE).toBe('last')
    },
  )
})

describe('a look’s range of values (the pizza look: 1 to 12)', () => {
  const PIZZA = { min: 1, max: 12 } as const

  it('keeps the bars’ 0–99 by default', () => {
    expect(BAR_RANGE).toEqual({ min: 0, max: 99 })
    expect(parseNumbers('0 99').ok).toBe(true)
  })

  it('parses and explains against a range', () => {
    expect(parseNumbers('1 12 7', PIZZA).ok).toBe(true)
    const big = parseNumbers('5 42', PIZZA)
    expect(big.ok ? null : big.problem).toEqual({ kind: 'outOfRange', token: '42', value: 42 })
    const zero = parseNumbers('0 5', PIZZA)
    expect(zero.ok).toBe(false)
    if (big.ok || zero.ok) return
    expect(describeProblem(big.problem, 'explorer', PIZZA)).toBe(
      '“42” is too big. Use numbers from 1 to 12.',
    )
    expect(describeProblem(zero.problem, 'explorer', PIZZA)).toBe(
      '“0” is less than 1. Use numbers from 1 to 12.',
    )
    expect(describeProblem(big.problem, 'engineer', PIZZA)).toBe(
      '“42” is out of range; values must be 1–12.',
    )
  })

  it('tells whether numbers fit', () => {
    expect(fitsRange([1, 12, 7], PIZZA)).toBe(true)
    expect(fitsRange([1, 13], PIZZA)).toBe(false)
    expect(fitsRange([0, 5], PIZZA)).toBe(false)
    expect(fitsRange([0, 99], BAR_RANGE)).toBe(true)
  })

  it('finds the typed numbers a look can’t draw, each once, in the order typed', () => {
    expect(outsideRange('5 2 31 1', PIZZA)).toEqual([31])
    expect(outsideRange('40, 0 40 13', PIZZA)).toEqual([40, 0, 13])
    expect(outsideRange('1 12 7', PIZZA)).toEqual([])
    // What isn't a whole number is parseNumbers' to explain.
    expect(outsideRange('5 x 2.5 31', PIZZA)).toEqual([31])
    expect(outsideRange('', PIZZA)).toEqual([])
  })

  it('says, at the input, that those numbers show as bars, per level', () => {
    const cart = { name: 'Pizza cart', note: 'The pizza cart carries 1 to 12 boxes.', range: PIZZA }
    expect(describeOutside([31], 'explorer', cart)).toBe(
      'The pizza cart carries 1 to 12 boxes. With 31, you’ll see bars instead. Use 1 to 12 to see the pizza cart.',
    )
    expect(describeOutside([13, 31, 0], 'explorer', cart)).toContain('With 13, 31 and 0,')
    expect(describeOutside([31], 'engineer', cart)).toBe(
      '31 is outside the pizza cart look’s 1–12, so the stage shows bars. It still runs.',
    )
    expect(describeOutside([13, 99], 'engineer', cart)).toBe(
      '13 and 99 are outside the pizza cart look’s 1–12, so the stage shows bars. It still runs.',
    )
    expect(findJargon(describeOutside([13, 31], 'explorer', cart))).toBeNull()
  })

  it('ranks numbers: the same order, so every comparison comes out the same', () => {
    expect(rankNumbers([42, 7, 88])).toEqual([2, 1, 3])
    expect(rankNumbers([50, 50, 3, 99])).toEqual([2, 2, 1, 3])
    const big = [42, 7, 19, 88, 3, 64, 25, 51, 13, 76, 30, 9]
    const ranks = rankNumbers(big)
    expect(fitsRange(ranks, PIZZA)).toBe(true)
    big.forEach((a, x) => {
      big.forEach((b, y) => {
        expect(Math.sign(a - b)).toBe(Math.sign((ranks[x] ?? 0) - (ranks[y] ?? 0)))
      })
    })
  })

  it.each(PRESETS.map((preset) => preset.id))('%s: picks from 1 to 12, the count kept', (id) => {
    for (const count of [2, 6, 12]) {
      for (const edge of [0, 0.5, 0.999]) {
        const list = presetNumbers(id, count, () => edge, PIZZA)
        expect(list).toHaveLength(count)
        expect(new Set(list).size).toBe(count)
        expect(fitsRange(list, PIZZA)).toBe(true)
      }
    }
  })

  it('makes "Mixed up" a shuffle of 1 to 12 and "Already in order" a staircase', () => {
    const twelve = Array.from({ length: 12 }, (_, k) => k + 1)
    expect([...presetNumbers('random', 12, seeded(3), PIZZA)].sort((a, b) => a - b)).toEqual(twelve)
    expect(presetNumbers('sorted', 12, seeded(3), PIZZA)).toEqual(twelve)
  })

  it('leaves the bars’ presets exactly as they were', () => {
    for (const id of PRESETS.map((preset) => preset.id)) {
      expect(presetNumbers(id, 6, seeded(5), BAR_RANGE)).toEqual(presetNumbers(id, 6, seeded(5)))
    }
  })
})
