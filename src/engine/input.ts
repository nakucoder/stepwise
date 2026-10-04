/**
 * The learner's own numbers: parsing what they type (or what's in the address), explaining
 * mistakes at their level. Framework-agnostic, like the rest of
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
