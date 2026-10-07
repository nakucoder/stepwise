/**
 * TEMPORARY (design/robot, never merged): the five moments every mockup shows, on bubble
 * sort's default numbers (5 2 8 1 9 3), as selection sort would play them. Each step also has
 * the frame the real bars draw beside the robot.
 */
import type { Frame } from '../../engine/types'

export type StepId = 'compare' | 'lock' | 'grab' | 'sorted' | 'finale'

export interface MockStep {
  readonly id: StepId
  readonly label: string
  /** What the learner should see, in one sentence. */
  readonly caption: string
  readonly array: readonly number[]
  /** The front of the unsorted part (the gate sits just left of it). */
  readonly front: number | null
  /** The value being checked by the beam. */
  readonly checking: number | null
  /** The smallest so far (locked on). */
  readonly smallest: number | null
  /** How many values at the start are in their final spot. */
  readonly sortedCount: number
  /** Grab and carry: the smallest moves from `from` to `to`, the front value the other way. */
  readonly carry?: { readonly from: number; readonly to: number }
}

export const STEPS: readonly MockStep[] = [
  {
    id: 'compare',
    label: 'Compare',
    caption: 'The beam checks 1 against the smallest so far, 2.',
    array: [5, 2, 8, 1, 9, 3],
    front: 0,
    checking: 3,
    smallest: 1,
    sortedCount: 0,
  },
  {
    id: 'lock',
    label: 'Lock-on',
    caption: '1 is smaller, so the robot locks on: 1 is the new smallest so far.',
    array: [5, 2, 8, 1, 9, 3],
    front: 0,
    checking: 3,
    smallest: 3,
    sortedCount: 0,
  },
  {
    id: 'grab',
    label: 'Carry',
    caption: 'The robot grabs 1 and carries it to the front; 5 moves to the spot 1 came from.',
    array: [1, 2, 8, 5, 9, 3],
    front: 0,
    checking: null,
    smallest: 0,
    sortedCount: 1,
    carry: { from: 3, to: 0 },
  },
  {
    id: 'sorted',
    label: 'Sorted',
    caption: '1, 2 and 3 are final, behind the gate. The next round starts at 5.',
    array: [1, 2, 3, 5, 9, 8],
    front: 3,
    checking: 4,
    smallest: 3,
    sortedCount: 3,
  },
  {
    id: 'finale',
    label: 'Finale',
    caption: 'Everything is in order: the robot celebrates.',
    array: [1, 2, 3, 5, 8, 9],
    front: null,
    checking: null,
    smallest: null,
    sortedCount: 6,
  },
]

const range = (n: number) => Array.from({ length: n }, (_, k) => k)

/** The frame the real bars draw for this step. */
export function barsFrame(step: MockStep): Frame {
  const sorted = range(step.sortedCount)
  const pointers: Record<string, number> = {}
  if (step.front !== null && step.id !== 'finale') pointers.i = step.front
  if (step.checking !== null) pointers.j = step.checking
  if (step.smallest !== null && step.id !== 'grab') pointers.min = step.smallest
  const comparing =
    step.checking !== null && step.smallest !== null
      ? [...new Set([step.smallest, step.checking])]
      : []
  return {
    array: step.array,
    highlights: {
      ...(comparing.length ? { comparing } : {}),
      ...(step.carry ? { swapping: [step.carry.to, step.carry.from] } : {}),
      ...(sorted.length ? { sorted } : {}),
    },
    pointers,
    activeLine: null,
    explanation: { explorer: step.caption, engineer: step.caption },
    stats: { comparisons: 0, swaps: 0 },
  }
}

export const POINTER_LABELS = {
  i: { engineer: 'i', explorer: 'front' },
  j: { engineer: 'j', explorer: 'checking' },
  min: { engineer: 'min', explorer: 'smallest' },
} as const
