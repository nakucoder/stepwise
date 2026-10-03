import { findJargon } from './jargon'
import type { Algorithm, Frame, HighlightRole, Level } from './types'

const LEVELS: readonly Level[] = ['explorer', 'engineer']

function isIndexIn(value: number, length: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < length
}

/**
 * Checks frames against the rules every algorithm must follow (CLAUDE.md, rule 2) and
 * returns a readable list of problems; an empty list means the frames are valid.
 * Algorithm-specific checks (e.g. "a swap exchanges exactly two values") live in that
 * algorithm's own tests.
 */
export function validateFrames(
  frames: readonly Frame[],
  algorithm: Pick<Algorithm, 'source'>,
): string[] {
  const problems: string[] = []
  if (frames.length === 0) return ['no frames: every algorithm yields at least one']

  const lineCounts = Object.entries(algorithm.source).map(
    ([language, code]) => [language, code.split('\n').length] as const,
  )
  const length = frames[0]?.array.length ?? 0

  frames.forEach((frame, k) => {
    const at = `frame ${String(k)}`

    if (frame.array.length !== length) {
      problems.push(`${at}: array length ${String(frame.array.length)}, expected ${String(length)}`)
    }
    if (frame.array.some((value) => !Number.isFinite(value))) {
      problems.push(`${at}: array contains a value that is not a finite number`)
    }

    for (const [role, indices] of Object.entries(frame.highlights) as [
      HighlightRole,
      readonly number[] | undefined,
    ][]) {
      for (const index of indices ?? []) {
        if (!isIndexIn(index, frame.array.length)) {
          problems.push(`${at}: ${role} highlight ${String(index)} is out of bounds`)
        }
      }
    }

    for (const [name, index] of Object.entries(frame.pointers ?? {})) {
      if (!isIndexIn(index, frame.array.length)) {
        problems.push(`${at}: pointer ${name} = ${String(index)} is out of bounds`)
      }
    }

    if (frame.activeLine !== null) {
      for (const [language, lines] of lineCounts) {
        if (
          !Number.isInteger(frame.activeLine) ||
          frame.activeLine < 1 ||
          frame.activeLine > lines
        ) {
          problems.push(
            `${at}: activeLine ${String(frame.activeLine)} is not a line of the ${language} source (1-${String(lines)})`,
          )
        }
      }
    }

    for (const level of LEVELS) {
      if (frame.explanation[level].trim() === '') {
        problems.push(`${at}: ${level} explanation is empty`)
      }
    }
    const jargon = findJargon(frame.explanation.explorer)
    if (jargon) problems.push(`${at}: explorer explanation uses jargon "${jargon}"`)

    for (const [name, value] of Object.entries(frame.stats)) {
      if (!Number.isInteger(value) || value < 0) {
        problems.push(`${at}: ${name} = ${String(value)} is not a non-negative whole number`)
      }
    }
    const previous = frames[k - 1]
    if (previous) {
      if (frame.stats.comparisons < previous.stats.comparisons) {
        problems.push(`${at}: comparisons went down`)
      }
      if (frame.stats.swaps < previous.stats.swaps) problems.push(`${at}: swaps went down`)
    }

    for (const [name, value] of Object.entries(frame.variables ?? {})) {
      const ok =
        value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))
      if (!ok) problems.push(`${at}: trace variable ${name} has an unsupported value`)
    }
  })

  return problems
}
