/**
 * The learner's own numbers: parsing what they type (or what's in the address), explaining
 * mistakes at their level, and the one-click presets. Framework-agnostic, like the rest of
 * the engine.
 */
import type { Level, PivotRule } from './types'

/** 2–12 whole numbers from 0 to 99: two digits fit the bar labels, 12 bars fit a phone. */
export const INPUT_LIMITS = { minCount: 2, maxCount: 12, minValue: 0, maxValue: 99 } as const

/**
 * The values a look can draw. Bars take 0–99 (the default everywhere); a character may take
 * fewer (the pizza cart carries 1 to 12 boxes: its registry entry's `range`).
 */
export interface ValueRange {
  readonly min: number
  readonly max: number
}

export const BAR_RANGE: ValueRange = { min: INPUT_LIMITS.minValue, max: INPUT_LIMITS.maxValue }

/** Whether every value is inside the range. */
export function fitsRange(values: readonly number[], range: ValueRange): boolean {
  return values.every((value) => value >= range.min && value <= range.max)
}

/**
 * Each value replaced by its rank, the smallest 1, equal values sharing one (42 7 88 → 2 1 3):
 * every comparison comes out the same, so a sort makes the same comparisons and swaps.
 */
export function rankNumbers(values: readonly number[]): number[] {
  const distinct = [...new Set(values)].sort((a, b) => a - b)
  return values.map((value) => distinct.indexOf(value) + 1)
}

/** Why some text isn't a usable list. The first problem found is reported. */
export type InputProblem =
  | { readonly kind: 'empty' }
  | { readonly kind: 'notANumber'; readonly token: string }
  | { readonly kind: 'notWhole'; readonly token: string }
  | { readonly kind: 'outOfRange'; readonly token: string; readonly value: number }
  | { readonly kind: 'tooFew'; readonly count: number }
  | { readonly kind: 'tooMany'; readonly count: number }

export type ParseResult =
  | { readonly ok: true; readonly values: readonly number[] }
  | { readonly ok: false; readonly problem: InputProblem }

const NUMBER = /^-?\d+(\.\d+)?$/

/**
 * Reads numbers separated by spaces and/or commas, e.g. "5 2 8", "5,2,8" or "5, 2, 8".
 * Problems with a single number are reported before problems with how many there are.
 */
export function parseNumbers(text: string, range: ValueRange = BAR_RANGE): ParseResult {
  const tokens = text.split(/[\s,]+/).filter((token) => token !== '')
  if (tokens.length === 0) return { ok: false, problem: { kind: 'empty' } }

  const values: number[] = []
  for (const token of tokens) {
    if (!NUMBER.test(token)) return { ok: false, problem: { kind: 'notANumber', token } }
    if (token.includes('.')) return { ok: false, problem: { kind: 'notWhole', token } }
    const value = Number(token)
    if (value < range.min || value > range.max) {
      return { ok: false, problem: { kind: 'outOfRange', token, value } }
    }
    values.push(value)
  }

  if (values.length < INPUT_LIMITS.minCount) {
    return { ok: false, problem: { kind: 'tooFew', count: values.length } }
  }
  if (values.length > INPUT_LIMITS.maxCount) {
    return { ok: false, problem: { kind: 'tooMany', count: values.length } }
  }
  return { ok: true, values }
}

/** Long junk is shortened, so a pasted paragraph doesn't fill the message. */
function quote(token: string): string {
  return `“${token.length > 12 ? `${token.slice(0, 11)}…` : token}”`
}

const { minCount, maxCount } = INPUT_LIMITS
const EXAMPLE = '7 3 12'

/** One short sentence saying what's wrong and how to fix it, in the learner's level. */
export function describeProblem(
  problem: InputProblem,
  level: Level,
  range: ValueRange = BAR_RANGE,
): string {
  const { min: minValue, max: maxValue } = range
  if (level === 'explorer') {
    switch (problem.kind) {
      case 'empty':
        return `Type some numbers first, like ${EXAMPLE}.`
      case 'notANumber':
        return `${quote(problem.token)} isn’t a number. Use numbers like ${EXAMPLE}.`
      case 'notWhole':
        return `${quote(problem.token)} isn’t a whole number. Use numbers like ${EXAMPLE}.`
      case 'outOfRange':
        return problem.value > maxValue
          ? `${quote(problem.token)} is too big. Use numbers from ${String(minValue)} to ${String(maxValue)}.`
          : `${quote(problem.token)} is less than ${String(minValue)}. Use numbers from ${String(minValue)} to ${String(maxValue)}.`
      case 'tooFew':
        return `You need at least ${String(minCount)} numbers to put in order.`
      case 'tooMany':
        return `That’s ${String(problem.count)} numbers. Use ${String(maxCount)} or fewer so they all fit.`
    }
  }

  const rule = `Enter ${String(minCount)}–${String(maxCount)} integers from ${String(minValue)} to ${String(maxValue)}, separated by spaces or commas.`
  switch (problem.kind) {
    case 'empty':
      return rule
    case 'notANumber':
    case 'notWhole':
      return `${quote(problem.token)} is not an integer. ${rule}`
    case 'outOfRange':
      return `${quote(problem.token)} is out of range; values must be ${String(minValue)}–${String(maxValue)}.`
    case 'tooFew':
      return `Got ${String(problem.count)} value; at least ${String(minCount)} are needed.`
    case 'tooMany':
      return `Got ${String(problem.count)} values; the limit is ${String(maxCount)}.`
  }
}

/**
 * The whole numbers in `text` that a look can't draw (outside `range`), each once, in the order
 * typed. Read from what is typed so far, so a note can appear before Run; anything that isn't a
 * whole number is left to `parseNumbers`.
 */
export function outsideRange(text: string, range: ValueRange): number[] {
  const values = text
    .split(/[\s,]+/)
    .filter((token) => /^-?\d+$/.test(token))
    .map(Number)
  return [...new Set(values.filter((value) => value < range.min || value > range.max))]
}

/** "31", "13 and 31", "13, 31 and 40". */
function listOf(values: readonly number[]): string {
  const words = values.map(String)
  return words.length < 2
    ? words.join('')
    : `${words.slice(0, -1).join(', ')} and ${words.at(-1) ?? ''}`
}

/**
 * At the input, while a character with fewer values than the bars is on (the pizza cart's 1–12):
 * a friendly note that these numbers show as bars. They can still be run. `note` is the
 * character's own sentence ("The pizza cart carries 1 to 12 boxes.").
 */
export function describeOutside(
  outside: readonly number[],
  level: Level,
  look: { readonly name: string; readonly note: string; readonly range: ValueRange },
): string {
  const { min, max } = look.range
  const list = listOf(outside)
  const name = look.name.toLowerCase()
  if (level === 'explorer') {
    return `${look.note} With ${list}, you’ll see bars instead. Use ${String(min)} to ${String(max)} to see the ${name}.`
  }
  const verb = outside.length === 1 ? 'is' : 'are'
  return `${list} ${verb} outside the ${name} look’s ${String(min)}–${String(max)}, so the stage shows bars. It still runs.`
}

/** For the input field: "5 2 8". */
export function formatNumbers(values: readonly number[]): string {
  return values.join(' ')
}

/** For the address, `?numbers=5,2,8`. `parseNumbers` reads it back. */
export function numbersParam(values: readonly number[]): string {
  return values.join(',')
}

export type PresetId = 'random' | 'sorted' | 'reversed' | 'nearlySorted'

export interface Preset {
  readonly id: PresetId
  readonly label: Readonly<Record<Level, string>>
}

/**
 * One-click lists. Sorted and reversed show bubble sort's best and worst cases without any
 * typing; nearly sorted shows why it's good on almost-ordered lists.
 */
export const PRESETS: readonly Preset[] = [
  { id: 'random', label: { explorer: 'Mixed up', engineer: 'Random' } },
  { id: 'sorted', label: { explorer: 'Already in order', engineer: 'Already sorted' } },
  { id: 'reversed', label: { explorer: 'Backwards', engineer: 'Reversed' } },
  { id: 'nearlySorted', label: { explorer: 'Almost in order', engineer: 'Nearly sorted' } },
]

/**
 * `count` different numbers from the range (1 to 99 by default: 0 makes a bar too small to
 * compare by eye), in the preset's order. `random` returns a number in [0, 1), like Math.random;
 * tests pass a seeded one. The pizza look's range, 1 to 12, makes "Mixed up" a shuffle and
 * "Already in order" a staircase.
 */
export function presetNumbers(
  id: PresetId,
  count: number,
  random: () => number = Math.random,
  range: ValueRange = BAR_RANGE,
): number[] {
  const low = Math.max(1, range.min)
  const n = Math.min(maxCount, range.max - low + 1, Math.max(minCount, Math.round(count)))
  const pick = (below: number) => Math.min(below - 1, Math.floor(random() * below))

  // A partial Fisher–Yates shuffle of the range: the first n are distinct and in random order.
  const pool = Array.from({ length: range.max - low + 1 }, (_, k) => k + low)
  for (let k = 0; k < n; k++) {
    const other = k + pick(pool.length - k)
    ;[pool[k], pool[other]] = [pool[other] as number, pool[k] as number]
  }
  const values = pool.slice(0, n)
  if (id === 'random') return values

  values.sort((a, b) => a - b)
  if (id === 'reversed') return values.reverse()
  if (id === 'nearlySorted') {
    // Exactly one neighboring pair out of order.
    const k = pick(n - 1)
    ;[values[k], values[k + 1]] = [values[k + 1] as number, values[k] as number]
  }
  return values
}

/** Quick sort's pivot rules, in the order Engineer sees them. */
export const PIVOT_RULES: readonly PivotRule[] = ['first', 'last', 'middle', 'random']

/** The rule when the address has none, or one that isn't a rule. */
export const DEFAULT_PIVOT_RULE: PivotRule = 'last'

/** Reads `?pivot=` from the address: a known rule, or the default. */
export function parsePivotRule(param: string | null): PivotRule {
  return PIVOT_RULES.find((rule) => rule === param) ?? DEFAULT_PIVOT_RULE
}
