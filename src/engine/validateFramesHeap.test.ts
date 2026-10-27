import { describe, expect, it } from 'vitest'
import type { Algorithm, Frame, HeapStep } from './types'
import { validateFrames } from './validateFrames'

const ALGORITHM: Pick<Algorithm, 'source' | 'trace'> = { source: { python: 'a\nb\nc' } }

/** A hand-made frame (not heap sort): 6 columns, optionally a heap step. */
const frame = (heap?: Partial<HeapStep>): Frame => ({
  array: [9, 5, 8, 1, 2, 3],
  highlights: {},
  activeLine: null,
  explanation: { explorer: 'Look at this one.', engineer: 'Compare a[1] with its children.' },
  stats: { comparisons: 0, swaps: 0 },
  ...(heap && {
    heap: {
      phase: 'build',
      event: 'ask',
      size: 6,
      parent: 1,
      value: 5,
      children: [3, 4],
      ...heap,
    },
  }),
})

describe('validateFrames: heap sort’s heap step', () => {
  it('a parent inside the heap with its children there: valid', () => {
    expect(
      validateFrames(
        [
          frame(),
          frame({ parent: 2, children: [5] }),
          frame({ event: 'start', parent: null, value: null, children: [] }),
          frame({ phase: 'extract', event: 'extract', size: 4, parent: 0, children: [1, 2] }),
          frame({ event: 'settles', size: 3, parent: 2, children: [] }),
          frame({
            phase: 'extract',
            event: 'done',
            size: 0,
            parent: null,
            value: null,
            children: [],
          }),
        ],
        ALGORITHM,
      ),
    ).toEqual([])
  })

  it('reports a size outside the array, a parent outside the heap, and wrong children', () => {
    const problems = validateFrames(
      [
        frame({ size: 7 }),
        frame({ size: 1 }),
        frame({ children: [3] }),
        frame({ size: 4, children: [3, 4] }),
        frame({ parent: null, children: [1] }),
        frame({ event: 'jump' as HeapStep['event'] }),
      ],
      ALGORITHM,
    )
    expect(problems).toEqual([
      'frame 0: heap size 7 is not 0 to 6',
      'frame 1: heap parent 1 is outside the heap [0, 1)',
      'frame 2: heap children [3] of 1 are not [3, 4] in a heap of 6',
      'frame 3: heap children [3, 4] of 1 are not [3] in a heap of 4',
      'frame 4: heap children without a parent',
      'frame 5: heap event jump is not one of start, ask, climb, stop, settles, extract, done',
    ])
  })
})
