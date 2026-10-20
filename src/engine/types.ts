/**
 * Core engine types. Framework-agnostic: nothing in src/engine may import React or the DOM.
 *
 * An algorithm is a generator that yields one Frame per step. The player collects every
 * frame into an array up front, so stepping forward, backward, or scrubbing is just
 * indexing into that array.
 */

/** Languages that algorithm source code can be shown in. */
export type Language = 'python'

/**
 * Top-level topics, in the order most people learn them. Each id is also the URL segment
 * (`/sorting`) and the suffix of its color tokens (`--cat-sorting`).
 */
export type Category =
  | 'sorting'
  | 'searching'
  | 'linked-lists'
  | 'trees'
  | 'graphs'
  | 'hashing'
  | 'pattern-matching'
  | 'dynamic-programming'

/**
 * How explanations are pitched. Chosen by the user, never derived from age.
 * - explorer: plain, friendly language for kids and beginners, no jargon
 * - engineer: precise technical language
 */
export type Level = 'explorer' | 'engineer'

/** The role an index plays in the current step. Each role gets its own color in the UI. */
export type HighlightRole = 'comparing' | 'swapping' | 'sorted' | 'pivot'

/**
 * The characters that can draw an algorithm's values instead of bars (docs/ROADMAP.md, "A
 * character for every algorithm"): bubble sort's ducks, and selection sort's robot (named only;
 * its renderer comes later). The names and icons are in src/characters/registry.ts.
 */
export type CharacterId = 'ducks' | 'robot' | 'penguins' | 'spaceships'

/** A value that can appear in the trace panel. `null` renders as "—" (not yet assigned). */
export type TraceValue = number | string | boolean | null

/** Running operation counts, cumulative from the first frame up to and including this one. */
export interface FrameStats {
  readonly comparisons: number
  readonly swaps: number
}

/**
 * A point where the learner could make a choice (Do it mode). It sits on the ask frame; the
 * frame right after it is the correct move (CLAUDE.md, rule 3). The answer is read from that
 * frame (see answerAt), so the algorithm's logic lives in one place.
 *
 * - trade-or-keep (bubble sort): trade the two neighbors at `pair`, or keep them.
 * - new-smallest (selection sort): is the value at `pair[1]` smaller than the smallest so far,
 *   at `pair[0]`? The next frame's `min` pointer answers: on `pair[1]` it is the new smallest,
 *   still on `pair[0]` it is not. Equal values are not smaller.
 * - to-front (selection sort, end of a pass): move the smallest, at `pair[1]`, to the front of
 *   the unsorted part, `pair[0]`? When it is already there (`pair[0] === pair[1]`), keep.
 * - shift-or-stop (insertion sort): shift a[j], at `pair[0]`, right past the key, or stop.
 * - which-next (merge sort): which of the two fronts in the buffer row goes next, the left
 *   half's at `pair[0]` or the right half's at `pair[1]` (buffer columns)? The next frame empties
 *   that buffer slot: `pick` it. Equal fronts take the left one.
 */
export interface Decision {
  readonly kind: 'trade-or-keep' | 'new-smallest' | 'to-front' | 'shift-or-stop' | 'which-next'
  /** The two positions in question, left first (to-front: the same position when it's there). */
  readonly pair: readonly [number, number]
}

/** A move the learner makes at a decision. */
export type Choice =
  | { readonly kind: 'trade'; readonly pair: readonly [number, number] }
  | { readonly kind: 'keep' }
  /** new-smallest: this value is the new smallest so far. */
  | { readonly kind: 'pick'; readonly index: number }

/**
 * A second row of values on the same columns as a frame's `array`: merge sort's buffer, where the
 * two halves wait while they are merged back. Array-only, like the frame.
 */
export interface BufferRow {
  /** One slot per column, the same length as the frame's `array`; null is an empty slot. */
  readonly values: readonly (number | null)[]
  /** Highlighted slots by role (indices into `values`). */
  readonly highlights?: Readonly<Partial<Record<HighlightRole, readonly number[]>>>
  /** Named markers on this row (e.g. i, j), drawn under it. */
  readonly pointers?: Readonly<Record<string, number>>
}

/**
 * Divide and conquer (merge sort): the part of the array a step works on, and what happens
 * there. The part is `[lo, hi)`, split at `mid`; `depth` is how many splits deep it is (0: the
 * whole array). A renderer can rebuild the groups on stage by replaying these from the first
 * frame (design/mockups/spaceships/README.md).
 *
 * - split: `[lo, hi)` is cut at `mid` (no value changes)
 * - compare: the two fronts are compared (the ask frame)
 * - move: the smaller front moved up into the main row (its answer)
 * - rest: one half ran out, so the other's next value moved up with no comparison
 * - merged: `[lo, hi)` is back together, in order
 */
export interface SpanStep {
  readonly event: 'split' | 'compare' | 'move' | 'rest' | 'merged'
  readonly lo: number
  readonly mid: number
  readonly hi: number
  readonly depth: number
}

/**
 * Quick sort (Lomuto): the range a step works on and where its zones are. The range is
 * `[lo, hi)` and `depth` is how many partitions deep it is (0: the whole array). While it is
 * partitioned the pivot waits at `hi - 1`: `[lo, wall)` holds the values <= pivot, `[wall, next)`
 * the bigger ones, and `[next, hi - 1)` the ones not checked yet.
 *
 * - range: work starts on `[lo, hi)`; the pivot is chosen, at `pivot` (wall = next = lo)
 * - pick: the pivot is swapped to the end of the range (`pivot` = hi - 1)
 * - compare: the value at `next` is compared with the pivot (the ask frame)
 * - left: it was <= pivot: it joined the left zone (the wall moved one place right)
 * - right: it was bigger: it stays, and the bigger zone grows
 * - place: the pivot is swapped to `wall`, its final place (`pivot` = wall)
 * - done: a range of one value, already in place
 */
export interface PartitionStep {
  readonly event: 'range' | 'pick' | 'compare' | 'left' | 'right' | 'place' | 'done'
  readonly lo: number
  readonly hi: number
  readonly depth: number
  /** Where the pivot is now. */
  readonly pivot: number
  /** The end of the left zone (values <= pivot) and the start of the bigger zone. */
  readonly wall: number
  /** The first value not checked yet (the one compared, at `compare`). */
  readonly next: number
}

/** A range `[lo, hi)` still waiting to be sorted (quick sort's pending calls). */
export type PendingRange = readonly [lo: number, hi: number]

/** How to choose quick sort's pivot in each range. `random` is seeded by the input: pure. */
export type PivotRule = 'first' | 'last' | 'middle' | 'random'

/** Options for an algorithm's run. Only quick sort reads one so far (`pivot`). */
export interface RunOptions {
  readonly pivot?: PivotRule
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
  /** Set on ask frames only: the choice the learner faces here (Do it mode). */
  readonly decision?: Decision
  /**
   * An optional second row, drawn under the main one on the same columns (merge sort's buffer).
   * The sorts that work in place never set it.
   */
  readonly buffer?: BufferRow
  /** Main-row positions whose value has moved out to the buffer: drawn as empty slots. */
  readonly vacant?: readonly number[]
  /** Divide and conquer (merge sort): the part this step works on and what happens there. */
  readonly span?: SpanStep
  /** Quick sort: the range this step partitions and its zones. The other sorts never set it. */
  readonly partition?: PartitionStep
  /** Quick sort: the ranges waiting their turn, the next one first. */
  readonly pending?: readonly PendingRange[]
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

/** One column of the trace table. */
export interface TraceColumn {
  /** The `Frame.variables` key shown in this column. */
  readonly variable: string
  readonly label: Readonly<Record<Level, string>>
  /** Added to numbers in Explorer, e.g. 1 so rounds and spots count from 1. */
  readonly explorerOffset?: number
  /** Shown only at these levels (absent: both), so a wide table can stay narrow for Explorer. */
  readonly levels?: readonly Level[]
}

/**
 * How frame variables become rows of the trace table (see buildTraceRows).
 * Frames that share the rowKey values update the same row, so a question frame can add a
 * row with "?" and its answer frame fill it in.
 */
export interface TraceSpec {
  readonly columns: readonly TraceColumn[]
  /** Variables that identify a row. A frame with any of them null adds no row. */
  readonly rowKey: readonly string[]
  /** Narrower cell padding, for a table with many columns (it must fit a phone's sheet). */
  readonly dense?: boolean
  /** What one row stands for, shown beside the table title, e.g. "one row per comparison". */
  readonly rowDescription?: Readonly<Record<Level, string>>
  /** A change in this variable starts a new group of rows (e.g. a new pass). */
  readonly group?: {
    readonly variable: string
    /** Shown on the stage, e.g. "pass i = 1" (Engineer) or "round 2" (Explorer). */
    readonly name: Readonly<Record<Level, string>>
    /** A note after the name, e.g. "round 3: the first 3 are in order" (insertion sort); on a
     * frame outside any group, the note alone ("all in order"). */
    readonly note?: (frame: Frame, level: Level) => string | null
  }
}

/** A visualizable algorithm. */
/**
 * "The idea": why the algorithm works the way it does, shown before step 1. A lead sentence,
 * then the questions a beginner actually asks (why pairs? why this direction? when do we
 * stop?), each with a short answer.
 */
export interface Idea {
  readonly lead: string
  readonly points: readonly { readonly question: string; readonly answer: string }[]
}

/**
 * The help ladder at a decision, one step at a time (docs/ROADMAP.md, "Hint ladder"):
 * the nudge (where to look), the concept (the rule that applies), and show me (this step's
 * answer, said in words before the site makes the move).
 */
export interface Hints {
  readonly nudge: string
  readonly concept: string
  readonly showMe: string
}

export interface Algorithm {
  /** Stable, URL-safe identifier, e.g. "bubble-sort". */
  readonly id: string
  /** Display name, e.g. "Bubble sort". */
  readonly name: string
  /** Jargon-free name shown in Explorer mode, e.g. "Bubble the biggest to the end". */
  readonly explorerName: string
  readonly category: Category
  readonly complexity: Complexity
  /**
   * When to reach for this algorithm. Engineer is a short phrase the UI shows after
   * "Best for:" (e.g. "small or nearly sorted lists"); Explorer is a full plain sentence
   * (e.g. "Fast for short lists that are almost in order.").
   */
  readonly bestFor: Readonly<Record<Level, string>>
  /** Why it works this way, per level. Explorer text must pass the jargon check. */
  readonly idea: Readonly<Record<Level, Idea>>
  /** Source code per language. `Frame.activeLine` refers to lines in this code. */
  readonly source: Readonly<Record<Language, string>>
  /**
   * How each pointer name is shown under the bars, per level (e.g. "j" for Engineer,
   * "left" for Explorer). Pointers without an entry show their name as-is.
   */
  readonly pointerLabels?: Readonly<Record<string, Readonly<Record<Level, string>>>>
  /**
   * Explorer: a shorter word for a pointer whose word is long ("smallest" → "small"), shown
   * where a value's column is too narrow for the full word (a phone). Short words need none.
   */
  readonly pointerShortLabels?: Readonly<Record<string, string>>
  /**
   * The word for the second counter (`stats.swaps`), when it counts something else: insertion
   * sort shifts. Absent: "swap" / "swaps".
   */
  readonly countWord?: { readonly one: string; readonly many: string }
  /** How the trace panel turns frame variables into table rows. */
  readonly trace?: TraceSpec
  /** The character that can draw this algorithm's values (the "Show as" switch); none: bars only. */
  readonly character?: CharacterId
  /** Whether Do it mode is built for this algorithm; until then it has Watch only. */
  readonly doIt?: boolean
  /**
   * The help ladder for a decision frame, per level, built from the frame and its answer (the
   * frame after it). Explorer text must pass the jargon check.
   */
  readonly hints: (ask: Frame, answer: Frame) => Readonly<Record<Level, Hints>>
  /** Yields one Frame per step. Must not mutate `input`. `options` may change the run (quick
   * sort's pivot rule); without them it is the algorithm's default. */
  readonly run: (
    input: readonly number[],
    options?: RunOptions,
  ) => Generator<Frame, void, undefined>
}
