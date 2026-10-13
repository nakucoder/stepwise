import { describe, expect, it } from 'vitest'
import type { Algorithm, BufferRow, Frame } from './types'
import { validateFrames } from './validateFrames'

const ALGORITHM: Pick<Algorithm, 'source' | 'trace'> = { source: { python: 'a\nb\nc' } }

/** A hand-made frame (not merge sort): 4 columns, optionally a buffer and empty main slots. */
const frame = (extra: Partial<Frame> = {}): Frame => ({
  array: [5, 2, 8, 1],
  highlights: {},
  activeLine: null,
  explanation: { explorer: 'Look at these two.', engineer: 'Compare a[0] and a[1].' },
  stats: { comparisons: 0, swaps: 0 },
  ...extra,
})

const buffer = (values: BufferRow['values'], rest: Partial<BufferRow> = {}): BufferRow => ({
  values,
  ...rest,
})

describe('validateFrames: the optional buffer row', () => {
  it('a frame without a buffer is checked exactly as before', () => {
    expect(validateFrames([frame()], ALGORITHM)).toEqual([])
  })

  it('a buffer with numbers and blanks, marks in range, and empty main slots: valid', () => {
    const frames = [
      frame(),
      frame({
        buffer: buffer([5, 2, null, null], {
          highlights: { comparing: [0, 1] },
          pointers: { i: 0, j: 1 },
        }),
        vacant: [0, 1],
      }),
      frame({ buffer: buffer([null, null, null, null]) }),
    ]
    expect(validateFrames(frames, ALGORITHM)).toEqual([])
  })

  it('one slot per column', () => {
    expect(validateFrames([frame({ buffer: buffer([5, 2]) })], ALGORITHM)).toEqual([
      'frame 0: buffer has 2 slots, expected 4 (one per column)',
    ])
  })

  it('a slot is a finite number or a blank', () => {
    expect(validateFrames([frame({ buffer: buffer([5, NaN, null, 1]) })], ALGORITHM)).toEqual([
      'frame 0: buffer contains a value that is neither a finite number nor a blank',
    ])
  })

  it('its highlights and pointers stay on the row', () => {
    expect(
      validateFrames(
        [
          frame({
            buffer: buffer([5, 2, 8, 1], {
              highlights: { comparing: [3, 4] },
              pointers: { i: -1, j: 2 },
            }),
          }),
        ],
        ALGORITHM,
      ),
    ).toEqual([
      'frame 0: buffer comparing highlight 4 is out of bounds',
      'frame 0: buffer pointer i = -1 is out of bounds',
    ])
  })

  it('empty main slots must be columns of the main row', () => {
    expect(validateFrames([frame({ vacant: [1, 4] })], ALGORITHM)).toEqual([
      'frame 0: vacant position 4 is out of bounds',
    ])
  })
})
