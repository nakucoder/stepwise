/**
 * Core engine types. Framework-agnostic: nothing in src/engine may import React or the DOM.
 *
 * An algorithm is a generator that yields one Frame per step. The player collects every
 * frame into an array up front, so stepping forward, backward, or scrubbing is just
 * indexing into that array.
 */

/** Languages that algorithm source code can be shown in. */
export type Language = 'python'

/** Top-level grouping used by the category sidebar. Grows as new categories are added. */
export type Category = 'sorting'

/**
 * How explanations are pitched. Chosen by the user, never derived from age.
 * - explorer: plain, friendly language for kids and beginners, no jargon
 * - engineer: precise technical language
 */
export type Level = 'explorer' | 'engineer'

/** The role an index plays in the current step. Each role gets its own color in the UI. */
export type HighlightRole = 'comparing' | 'swapping' | 'sorted' | 'pivot'

/** A value that can appear in the trace panel. `null` renders as "—" (not yet assigned). */
export type TraceValue = number | string | boolean | null

/** Running operation counts, cumulative from the first frame up to and including this one. */
export interface FrameStats {
  readonly comparisons: number
  readonly swaps: number
}

/**
 * A snapshot of one step of an algorithm.
 *
 * Array-only for now. When trees and graphs are added this becomes a discriminated union
 * (e.g. `ArrayFrame | TreeFrame | GraphFrame` keyed on a `kind` field).
 */
export interface Frame {
  /** The full array state at this step. */
  readonly array: readonly number[]
  /** Indices highlighted by role. A role that is absent has no highlighted indices. */
  readonly highlights: Readonly<Partial<Record<HighlightRole, readonly number[]>>>
  /** Named index markers (e.g. i, j, low, mid, high), drawn as labeled arrows. */
  readonly pointers?: Readonly<Record<string, number>>
  /**
   * Trace-table values for this step (e.g. i, temp, a, b), shown as one row per step in the
   * trace panel. Unlike `pointers`, these are not drawn on the array.
   */
  readonly variables?: Readonly<Record<string, TraceValue>>
  /** 1-based line number in the algorithm's source code, or null when no line is active. */
  readonly activeLine: number | null
  /** One short sentence per learning level describing what this step does. Neither may be empty. */
  readonly explanation: Readonly<Record<Level, string>>
  /** Running totals so learners can watch complexity grow. */
  readonly stats: FrameStats
}

/** Big-O complexity, written as display strings such as "O(n log n)". */
export interface Complexity {
  readonly time: {
    readonly best: string
    readonly average: string
    readonly worst: string
  }
  readonly space: string
}

/** A visualizable algorithm. */
export interface Algorithm {
  /** Stable, URL-safe identifier, e.g. "bubble-sort". */
  readonly id: string
  /** Display name, e.g. "Bubble Sort". */
  readonly name: string
  readonly category: Category
  readonly complexity: Complexity
  /** Source code per language. `Frame.activeLine` refers to lines in this code. */
  readonly source: Readonly<Record<Language, string>>
  /** Yields one Frame per step. Must not mutate `input`. */
  readonly run: (input: readonly number[]) => Generator<Frame, void, undefined>
}
