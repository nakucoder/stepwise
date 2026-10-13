/**
 * TEMPORARY (design/slimes, never merged): the seven moments every slime mockup shows, from one
 * run of top-down merge sort on the default numbers 5 2 8 1 9 3. Each has the scene before and
 * after it (the move plays between them) and the two-row bars frame for the same moment
 * (#74: the main row on top, the buffer row below, on one column grid).
 */
import type { Frame } from '../../engine/types'

export type MomentId = 'start' | 'split' | 'compare' | 'move' | 'runout' | 'merged' | 'finale'

/** A half-open run of columns, [lo, hi), that belongs together (a slime group). */
export type Group = readonly [number, number]

export interface SlimeState {
  /** The main row, column by column; null is an empty slot (its value moved to the buffer). */
  readonly main: readonly (number | null)[]
  /** The buffer row, or null when there is none at this moment. */
  readonly buffer: readonly (number | null)[] | null
  /** Groups on the main row (one slime group each) and on the buffer row. */
  readonly groups: readonly Group[]
  readonly bufferGroups: readonly Group[]
  /** The two fronts being compared, as buffer columns (the left half's and the right half's). */
  readonly compare: readonly [number, number] | null
  /** Everything final: green under every value, the celebration. */
  readonly final: boolean
}

export interface Moment {
  readonly id: MomentId
  readonly label: string
  /** What the learner should see, in one sentence. */
  readonly caption: string
  /** The stage caption, as the real stage would show it. */
  readonly stage: string
  readonly before: SlimeState
  readonly after: SlimeState
  /** The bars' frame for the same moment (two rows when there is a buffer). */
  readonly frame: Frame
}

const START = [5, 2, 8, 1, 9, 3] as const
const none: readonly (number | null)[] = [null, null, null, null, null, null]

const state = (s: Partial<SlimeState> & Pick<SlimeState, 'main'>): SlimeState => ({
  buffer: null,
  groups: [[0, 6]],
  bufferGroups: [],
  compare: null,
  final: false,
  ...s,
})

/** The bars for a state: empty main slots keep the value they last held (memory), drawn empty. */
function frameOf(s: SlimeState, stale: readonly number[]): Frame {
  const vacant = s.main.flatMap((v, k) => (v === null ? [k] : []))
  return {
    array: s.main.map((v, k) => v ?? stale[k] ?? 0),
    highlights: s.final ? { sorted: [0, 1, 2, 3, 4, 5] } : {},
    ...(vacant.length > 0 ? { vacant } : {}),
    ...(s.buffer
      ? {
          buffer: {
            values: s.buffer,
            ...(s.compare
              ? {
                  highlights: { comparing: [...s.compare] },
                  pointers: { i: s.compare[0], j: s.compare[1] },
                }
              : {}),
          },
        }
      : {}),
    activeLine: null,
    explanation: { explorer: '-', engineer: '-' },
    stats: { comparisons: 0, swaps: 0 },
  }
}

// The last merge: 2 5 8 | 1 3 9, copied down into the buffer, merged back up.
const HALVES = [2, 5, 8, 1, 3, 9] as const

const MOMENTS_RAW: readonly Omit<Moment, 'frame'>[] = [
  {
    id: 'start',
    label: 'Start',
    caption: 'Six numbers, one big group.',
    stage: 'split 6 into 3 + 3',
    before: state({ main: START }),
    after: state({ main: START }),
  },
  {
    id: 'split',
    label: 'Split',
    caption: 'The group of 6 splits into two groups of 3.',
    stage: 'split 6 into 3 + 3',
    before: state({ main: START }),
    after: state({
      main: START,
      groups: [
        [0, 3],
        [3, 6],
      ],
    }),
  },
  {
    id: 'compare',
    label: 'Compare the fronts',
    caption:
      'The last merge: both halves wait in the bottom row. Which goes next, 2 (left) or 1 (right)?',
    stage: 'putting 2 piles of 3 back together',
    before: state({
      main: none,
      buffer: HALVES,
      groups: [],
      bufferGroups: [
        [0, 3],
        [3, 6],
      ],
    }),
    after: state({
      main: none,
      buffer: HALVES,
      groups: [],
      bufferGroups: [
        [0, 3],
        [3, 6],
      ],
      compare: [0, 3],
    }),
  },
  {
    id: 'move',
    label: 'Move up',
    caption: '1 is smaller, so it goes up into the first empty spot.',
    stage: 'putting 2 piles of 3 back together',
    before: state({
      main: none,
      buffer: HALVES,
      groups: [],
      bufferGroups: [
        [0, 3],
        [3, 6],
      ],
      compare: [0, 3],
    }),
    after: state({
      main: [1, null, null, null, null, null],
      buffer: [2, 5, 8, null, 3, 9],
      groups: [[0, 1]],
      bufferGroups: [
        [0, 3],
        [4, 6],
      ],
    }),
  },
  {
    id: 'runout',
    label: 'One half runs out',
    caption: 'The left half is empty, so the rest (9) goes up without a question.',
    stage: 'putting 2 piles of 3 back together',
    before: state({
      main: [1, 2, 3, 5, 8, null],
      buffer: [null, null, null, null, null, 9],
      groups: [[0, 5]],
      bufferGroups: [[5, 6]],
    }),
    after: state({ main: [1, 2, 3, 5, 8, 9], buffer: none, groups: [[0, 6]] }),
  },
  {
    id: 'merged',
    label: 'Merge finished',
    caption: '1 and 3 9 were merged: two small groups became one group of 3.',
    stage: 'putting 1 and 2 back together',
    before: state({
      main: HALVES,
      groups: [
        [0, 3],
        [3, 4],
        [4, 6],
      ],
    }),
    after: state({
      main: HALVES,
      groups: [
        [0, 3],
        [3, 6],
      ],
    }),
  },
  {
    id: 'finale',
    label: 'Finale',
    caption: 'Everything is in order: the slimes celebrate.',
    stage: 'all in order',
    before: state({ main: [1, 2, 3, 5, 8, 9] }),
    after: state({ main: [1, 2, 3, 5, 8, 9], final: true }),
  },
]

export const MOMENTS: readonly Moment[] = MOMENTS_RAW.map((m) => ({
  ...m,
  frame: frameOf(m.after, m.id === 'start' || m.id === 'split' ? START : HALVES),
}))

export const POINTER_LABELS = {
  i: { engineer: 'i', explorer: 'left' },
  j: { engineer: 'j', explorer: 'right' },
}
