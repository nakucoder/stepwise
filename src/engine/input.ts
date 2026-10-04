/**
 * The learner's own numbers: parsing what they type (or what's in the address), explaining
 * mistakes at their level, and the one-click presets. Framework-agnostic, like the rest of
 * the engine.
 */
import type { Level } from './types'

/** 2–12 whole numbers from 0 to 99: two digits fit the bar labels, 12 bars fit a phone. */
export const INPUT_LIMITS = { minCount: 2, maxCount: 12, minValue: 0, maxValue: 99 } as const

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
export function parseNumbers(text: string): ParseResult {
  const tokens = text.split(/[\s,]+/).filter((token) => token !== '')
  if (tokens.length === 0) return { ok: false, problem: { kind: 'empty' } }

  const values: number[] = []
  for (const token of tokens) {
    if (!NUMBER.test(token)) return { ok: false, problem: { kind: 'notANumber', token } }
    if (token.includes('.')) return { ok: false, problem: { kind: 'notWhole', token } }
    const value = Number(token)
    if (value < INPUT_LIMITS.minValue || value > INPUT_LIMITS.maxValue) {
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

const { minCount, maxCount, minValue, maxValue } = INPUT_LIMITS
const EXAMPLE = '7 3 12'

/** One short sentence saying what's wrong and how to fix it, in the learner's level. */
export function describeProblem(problem: InputProblem, level: Level): string {
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
 * `count` different numbers from 1 to 99 (0 makes a bar too small to compare by eye), in the
 * preset's order. `random` returns a number in [0, 1), like Math.random; tests pass a seeded one.
 */
export function presetNumbers(
  id: PresetId,
  count: number,
  random: () => number = Math.random,
): number[] {
  const n = Math.min(maxCount, Math.max(minCount, Math.round(count)))
  const pick = (below: number) => Math.min(below - 1, Math.floor(random() * below))

  // A partial Fisher–Yates shuffle of 1..99: the first n are distinct and in random order.
  const pool = Array.from({ length: maxValue }, (_, k) => k + 1)
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
