/**
 * TEMPORARY (design/penguins, never merged): the seven moments every penguin mockup shows, from
 * one run of insertion sort (shift version) on the default numbers 5 2 8 1 9 3. Each step has the
 * scene before and after it (the move plays between them) and the frame the real bars draw
 * beside the penguins.
 *
 * The frames are permutations: the key is drawn in the gap it would leave, so bars and checks
 * work as they do today. The penguin scenes show the shift story instead: the key steps out of
 * the line and waits, the bigger ones slide right, then the key slides into its gap.
 */
import type { Frame } from '../../engine/types'

export type StepId = 'start' | 'compare' | 'shift' | 'slide' | 'inplace' | 'shelf' | 'finale'

export interface SceneState {
  /** The values in the line, slot by slot. The key's own slot holds its value. */
  readonly array: readonly number[]
  /** The key: its value's slot in the line (the gap it waits for), and where it waits out of line. */
  readonly key: { readonly slot: number; readonly out: boolean; readonly waitAt: number } | null
  /** How many at the front are in order so far (the frosted shelf). */
  readonly inOrder: number
  /** Everything final: the green platform and the dance. */
  readonly final: boolean
  /** The two being compared (slots): the key's and its left neighbor's. */
  readonly compare: readonly [number, number] | null
}

export interface MockStep {
  readonly id: StepId
  readonly label: string
  /** What the learner should see, in one sentence. */
  readonly caption: string
  /** The stage caption, as the real stage would show it. */
  readonly stage: string
  readonly before: SceneState
  readonly after: SceneState
  /** The bars' frame for the same step. */
  readonly frame: Frame
}

const frame = (
  array: readonly number[],
  highlights: Frame['highlights'],
  pointers: Frame['pointers'] = {},
): Frame => ({
  array,
  highlights,
  pointers,
  activeLine: null,
  explanation: { explorer: '', engineer: '' },
  stats: { comparisons: 0, swaps: 0 },
})

// After rounds 1 and 2 (2 slid in front of 5; 8 already in place): 2 5 8 | 1 9 3.
const ROUND3 = [2, 5, 8, 1, 9, 3] as const
const AFTER_ROUND3 = [1, 2, 5, 8, 9, 3] as const

export const STEPS: readonly MockStep[] = [
  {
    id: 'start',
    label: 'Round start',
    caption: 'Round 3: 1 is the next one to place. It steps out of the line and waits.',
    stage: 'round 3: the first 3 are in order',
    before: {
      array: ROUND3,
      key: { slot: 3, out: false, waitAt: 3 },
      inOrder: 3,
      final: false,
      compare: null,
    },
    after: {
      array: ROUND3,
      key: { slot: 3, out: true, waitAt: 3 },
      inOrder: 3,
      final: false,
      compare: null,
    },
    frame: frame(ROUND3, {}, { key: 3 }),
  },
  {
    id: 'compare',
    label: 'Compare',
    caption: 'Is 8 bigger than 1, the one we’re placing?',
    stage: 'round 3: the first 3 are in order',
    before: {
      array: ROUND3,
      key: { slot: 3, out: true, waitAt: 3 },
      inOrder: 3,
      final: false,
      compare: [2, 3],
    },
    after: {
      array: ROUND3,
      key: { slot: 3, out: true, waitAt: 3 },
      inOrder: 3,
      final: false,
      compare: [2, 3],
    },
    frame: frame(ROUND3, { comparing: [2, 3] }, { j: 2, key: 3 }),
  },
  {
    id: 'shift',
    label: 'Shift',
    caption: 'Yes: 8 slides right to make room. 1 keeps waiting.',
    stage: 'round 3: the first 3 are in order',
    before: {
      array: ROUND3,
      key: { slot: 3, out: true, waitAt: 3 },
      inOrder: 3,
      final: false,
      compare: null,
    },
    after: {
      array: [2, 5, 1, 8, 9, 3],
      key: { slot: 2, out: true, waitAt: 3 },
      inOrder: 3,
      final: false,
      compare: null,
    },
    frame: frame([2, 5, 1, 8, 9, 3], { swapping: [2, 3] }, { j: 2, key: 2 }),
  },
  {
    id: 'slide',
    label: 'Slide into place',
    caption:
      '5 and 2 slid right too; nothing is left to check, so 1 slides into its gap at the front.',
    stage: 'round 3: the first 4 are in order',
    before: {
      array: AFTER_ROUND3,
      key: { slot: 0, out: true, waitAt: 3 },
      inOrder: 3,
      final: false,
      compare: null,
    },
    after: { array: AFTER_ROUND3, key: null, inOrder: 4, final: false, compare: null },
    frame: frame(AFTER_ROUND3, {}, { key: 0 }),
  },
  {
    id: 'inplace',
    label: 'Already in place',
    caption: 'Round 4: 8 isn’t bigger than 9, so 9 is already in its place. It steps back in.',
    stage: 'round 4: the first 5 are in order',
    before: {
      array: AFTER_ROUND3,
      key: { slot: 4, out: true, waitAt: 4 },
      inOrder: 4,
      final: false,
      compare: [3, 4],
    },
    after: { array: AFTER_ROUND3, key: null, inOrder: 5, final: false, compare: null },
    frame: frame(AFTER_ROUND3, { comparing: [3, 4] }, { j: 3, key: 4 }),
  },
  {
    id: 'shelf',
    label: 'Frosted shelf',
    caption: 'The first 5 are in order so far (not final yet: 3 still has to fit in).',
    stage: 'round 5: the first 5 are in order',
    before: { array: AFTER_ROUND3, key: null, inOrder: 4, final: false, compare: null },
    after: { array: AFTER_ROUND3, key: null, inOrder: 5, final: false, compare: null },
    frame: frame(AFTER_ROUND3, {}),
  },
  {
    id: 'finale',
    label: 'Finale',
    caption: 'Everything is in order: the penguins celebrate.',
    stage: 'all in order',
    before: { array: [1, 2, 3, 5, 8, 9], key: null, inOrder: 6, final: false, compare: null },
    after: { array: [1, 2, 3, 5, 8, 9], key: null, inOrder: 6, final: true, compare: null },
    frame: frame([1, 2, 3, 5, 8, 9], { sorted: [0, 1, 2, 3, 4, 5] }),
  },
]

export const POINTER_LABELS = {
  key: { engineer: 'key', explorer: 'new one' },
  j: { engineer: 'j', explorer: 'checking' },
}
