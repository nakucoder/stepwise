import { answerAt } from './decision'
import { findJargon } from './jargon'
import type { Algorithm, Frame, HighlightRole, Level } from './types'

const LEVELS: readonly Level[] = ['explorer', 'engineer']

function isIndexIn(value: number, length: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < length
}

/** The buffer row's own checks: one slot per column, numbers or blanks, marks in range. */
function bufferProblems(frame: Frame, at: string): string[] {
  const problems: string[] = []
  const buffer = frame.buffer
  if (!buffer) return problems
  const { length } = frame.array
  if (buffer.values.length !== length) {
    problems.push(
      `${at}: buffer has ${String(buffer.values.length)} slots, expected ${String(length)} (one per column)`,
    )
  }
  if (buffer.values.some((value) => value !== null && !Number.isFinite(value))) {
    problems.push(`${at}: buffer contains a value that is neither a finite number nor a blank`)
  }
  for (const [role, indices] of Object.entries(buffer.highlights ?? {}) as [
    HighlightRole,
    readonly number[] | undefined,
  ][]) {
    for (const index of indices ?? []) {
      if (!isIndexIn(index, buffer.values.length)) {
        problems.push(`${at}: buffer ${role} highlight ${String(index)} is out of bounds`)
      }
    }
  }
  for (const [name, index] of Object.entries(buffer.pointers ?? {})) {
    if (!isIndexIn(index, buffer.values.length)) {
      problems.push(`${at}: buffer pointer ${name} = ${String(index)} is out of bounds`)
    }
  }
  return problems
}

const PARTITION_EVENTS: readonly string[] = [
  'range',
  'pick',
  'compare',
  'left',
  'right',
  'place',
  'done',
]

/**
 * Quick sort's partition and pending ranges: inside the array, the zones in order
 * (lo <= wall <= next < hi, the pivot inside the range), and no two ranges overlapping.
 */
function partitionProblems(frame: Frame, at: string): string[] {
  const problems: string[] = []
  const { length } = frame.array
  const whole = (v: number) => Number.isInteger(v)
  const isRange = (lo: number, hi: number) =>
    whole(lo) && whole(hi) && 0 <= lo && lo < hi && hi <= length
  const name = (lo: number, hi: number) => `[${String(lo)}, ${String(hi)})`
  const ranges: (readonly [number, number])[] = []

  const partition = frame.partition
  if (partition) {
    const { event, lo, hi, depth, pivot, wall, next } = partition
    if (!PARTITION_EVENTS.includes(event)) {
      problems.push(`${at}: partition event ${event} is not one of ${PARTITION_EVENTS.join(', ')}`)
    }
    if (!isRange(lo, hi)) {
      problems.push(`${at}: partition range ${name(lo, hi)} is not lo < hi inside the array`)
    } else {
      ranges.push([lo, hi])
      if (![pivot, wall, next].every(whole) || !(lo <= wall && wall <= next && next < hi)) {
        problems.push(
          `${at}: partition zones (wall ${String(wall)}, next ${String(next)}) are not lo <= wall <= next < hi`,
        )
      }
      if (!whole(pivot) || pivot < lo || pivot >= hi) {
        problems.push(`${at}: partition pivot ${String(pivot)} is outside ${name(lo, hi)}`)
      }
    }
    if (!whole(depth) || depth < 0) {
      problems.push(`${at}: partition depth ${String(depth)} is not a non-negative whole number`)
    }
  }

  for (const [lo, hi] of frame.pending ?? []) {
    if (!isRange(lo, hi)) {
      problems.push(`${at}: pending range ${name(lo, hi)} is not lo < hi inside the array`)
      continue
    }
    const overlap = ranges.find(([l, h]) => lo < h && l < hi)
    if (overlap) {
      problems.push(`${at}: pending range ${name(lo, hi)} overlaps ${name(overlap[0], overlap[1])}`)
    }
    ranges.push([lo, hi])
  }
  return problems
}

const HEAP_PHASES: readonly string[] = ['build', 'extract']
const HEAP_EVENTS: readonly string[] = [
  'start',
  'ask',
  'climb',
  'stop',
  'settles',
  'extract',
  'done',
]

/**
 * Heap sort's step: a heap size inside the array, the parent inside the heap, and its children
 * exactly its children there (2·parent + 1, 2·parent + 2, while < size), left first.
 */
function heapProblems(frame: Frame, at: string): string[] {
  const problems: string[] = []
  const heap = frame.heap
  if (!heap) return problems
  const { phase, event, size, parent, value, children } = heap
  const { length } = frame.array
  if (!HEAP_PHASES.includes(phase)) {
    problems.push(`${at}: heap phase ${phase} is not one of ${HEAP_PHASES.join(', ')}`)
  }
  if (!HEAP_EVENTS.includes(event)) {
    problems.push(`${at}: heap event ${event} is not one of ${HEAP_EVENTS.join(', ')}`)
  }
  if (!Number.isInteger(size) || size < 0 || size > length) {
    problems.push(`${at}: heap size ${String(size)} is not 0 to ${String(length)}`)
    return problems
  }
  if (value !== null && !Number.isFinite(value)) {
    problems.push(`${at}: heap value is neither a finite number nor null`)
  }
  if (parent === null) {
    if (children.length > 0) problems.push(`${at}: heap children without a parent`)
    return problems
  }
  if (!isIndexIn(parent, size)) {
    problems.push(`${at}: heap parent ${String(parent)} is outside the heap [0, ${String(size)})`)
    return problems
  }
  const expected = [2 * parent + 1, 2 * parent + 2].filter((c) => c < size)
  if (children.length !== expected.length || children.some((c, k) => c !== expected[k])) {
    problems.push(
      `${at}: heap children [${children.join(', ')}] of ${String(parent)} are not [${expected.join(', ')}] in a heap of ${String(size)}`,
    )
  }
  return problems
}

/**
 * Checks frames against the rules every algorithm must follow (CLAUDE.md, rules 2 and 3) and
 * returns a readable list of problems; an empty list means the frames are valid.
 * Algorithm-specific checks (e.g. "a swap exchanges exactly two values") live in that
 * algorithm's own tests.
 */
export function validateFrames(
  frames: readonly Frame[],
  algorithm: Pick<Algorithm, 'source' | 'trace'>,
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

    for (const index of frame.vacant ?? []) {
      if (!isIndexIn(index, frame.array.length)) {
        problems.push(`${at}: vacant position ${String(index)} is out of bounds`)
      }
    }

    if (frame.buffer) problems.push(...bufferProblems(frame, at))

    if (frame.span) {
      const { lo, mid, hi, depth } = frame.span
      const whole = (v: number) => Number.isInteger(v)
      if (
        ![lo, mid, hi].every(whole) ||
        lo < 0 ||
        !(lo < mid && mid < hi) ||
        hi > frame.array.length
      ) {
        problems.push(
          `${at}: span [${String(lo)}, ${String(mid)}, ${String(hi)}) is not lo < mid < hi inside the array`,
        )
      }
      if (!whole(depth) || depth < 0) {
        problems.push(`${at}: span depth ${String(depth)} is not a non-negative whole number`)
      }
    }

    if (frame.partition || frame.pending) problems.push(...partitionProblems(frame, at))
    if (frame.heap) problems.push(...heapProblems(frame, at))

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

    if (frame.variables && algorithm.trace) {
      for (const column of algorithm.trace.columns) {
        if (!(column.variable in frame.variables)) {
          problems.push(`${at}: trace column ${column.variable} is missing from variables`)
        }
      }
    }

    if (frame.decision) {
      const [i, j] = frame.decision.pair
      // to-front may name one position (the smallest is already at the front: keep), and so
      // may left-or-right (a value that goes left can swap with itself).
      const onePositionAllowed =
        frame.decision.kind === 'to-front' || frame.decision.kind === 'left-or-right'
      if (
        !isIndexIn(i, frame.array.length) ||
        !isIndexIn(j, frame.array.length) ||
        (onePositionAllowed ? i > j : i >= j)
      ) {
        problems.push(
          `${at}: decision pair [${String(i)}, ${String(j)}] is not two positions, left first`,
        )
      } else if (k === frames.length - 1) {
        problems.push(`${at}: decision is the last frame; the next frame must answer it`)
      } else if (!answerAt(frames, k)) {
        problems.push(
          frame.decision.kind === 'new-smallest'
            ? `${at}: the next frame's min pointer is on neither position of the decision pair, or the values changed`
            : frame.decision.kind === 'which-next'
              ? `${at}: the next frame moves neither front of the decision pair up from the buffer`
              : frame.decision.kind === 'left-or-right'
                ? `${at}: the pair is not the partition's wall and next, or the next frame's wall neither moved one place nor stayed`
                : `${at}: the next frame neither trades nor keeps the decision pair`,
        )
      }
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
