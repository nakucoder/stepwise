import { describe, expect, it } from 'vitest'
import type { Algorithm, Frame, PartitionStep } from './types'
import { validateFrames } from './validateFrames'

const ALGORITHM: Pick<Algorithm, 'source' | 'trace'> = { source: { python: 'a\nb\nc' } }

/** A hand-made frame (not quick sort): 6 columns, optionally a partition and pending ranges. */
const frame = (extra: Partial<Frame> = {}): Frame => ({
  array: [5, 2, 8, 1, 9, 3],
  highlights: {},
  activeLine: null,
  explanation: { explorer: 'Look at this one.', engineer: 'Compare a[0] with the pivot.' },
  stats: { comparisons: 0, swaps: 0 },
  ...extra,
})

const partition = (extra: Partial<PartitionStep> = {}): PartitionStep => ({
  event: 'compare',
  lo: 0,
  hi: 6,
  depth: 0,
  pivot: 5,
  wall: 1,
  next: 2,
  ...extra,
})

describe('validateFrames: quick sort’s partition and pending ranges', () => {
  it('zones in order, the pivot in the range, and pending ranges beside it: valid', () => {
    const frames = [
      frame({ partition: partition() }),
      frame({ partition: partition({ event: 'range', pivot: 2, wall: 0, next: 0 }) }),
      frame({ partition: partition({ event: 'left', wall: 5, next: 5 }) }),
      frame({
        partition: partition({ event: 'done', lo: 0, hi: 1, depth: 1, pivot: 0, wall: 0, next: 0 }),
        pending: [
          [2, 4],
          [5, 6],
        ],
      }),
      frame({ pending: [] }),
    ]
    expect(validateFrames(frames, ALGORITHM)).toEqual([])
  })

  it.each<[string, Partial<PartitionStep>]>([
    ['an empty range', { lo: 3, hi: 3, pivot: 3, wall: 3, next: 3 }],
    ['a range past the end', { hi: 7 }],
    ['the wall after next', { wall: 3, next: 2 }],
    ['next on the range’s end', { wall: 6, next: 6 }],
    ['the pivot outside the range', { lo: 0, hi: 4, pivot: 5, wall: 0, next: 0 }],
    ['a fractional depth', { depth: 0.5 }],
  ])('reports %s', (_, extra) => {
    expect(validateFrames([frame({ partition: partition(extra) })], ALGORITHM)).toHaveLength(1)
  })

  it('reports a pending range that is empty, out of bounds, or overlaps another', () => {
    const problems = validateFrames(
      [
        frame({
          partition: partition({ lo: 0, hi: 3, pivot: 2, wall: 0, next: 0 }),
          pending: [
            [4, 4],
            [5, 8],
            [2, 5],
            [3, 6],
          ],
        }),
      ],
      ALGORITHM,
    )
    expect(problems).toEqual([
      'frame 0: pending range [4, 4) is not lo < hi inside the array',
      'frame 0: pending range [5, 8) is not lo < hi inside the array',
      'frame 0: pending range [2, 5) overlaps [0, 3)',
      'frame 0: pending range [3, 6) overlaps [2, 5)',
    ])
  })
})
