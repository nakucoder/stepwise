import { describe, expect, it } from 'vitest'
import { buildTraceRows, formatTraceValue, groupCaption } from './trace'
import type { Frame, TraceSpec, TraceValue } from './types'

const trace: TraceSpec = {
  columns: [
    { variable: 'i', label: { engineer: 'i', explorer: 'round' }, explorerOffset: 1 },
    { variable: 'j', label: { engineer: 'j', explorer: 'spot' }, explorerOffset: 1 },
    { variable: 'swap?', label: { engineer: 'swap?', explorer: 'swap?' } },
  ],
  rowKey: ['i', 'j'],
  group: { variable: 'i', name: { engineer: 'pass', explorer: 'round' } },
}

function frame(variables: Record<string, TraceValue>): Frame {
  return {
    array: [1, 2],
    highlights: {},
    activeLine: null,
    explanation: { explorer: 'x', engineer: 'x' },
    stats: { comparisons: 0, swaps: 0 },
    variables,
  }
}

// start, ask (0,0), answer (0,0), ask (0,1), answer (0,1), pass end, ask (1,0), answer (1,0)
const FRAMES = [
  frame({ i: null, j: null, 'swap?': null }),
  frame({ i: 0, j: 0, 'swap?': '?' }),
  frame({ i: 0, j: 0, 'swap?': 'yes' }),
  frame({ i: 0, j: 1, 'swap?': '?' }),
  frame({ i: 0, j: 1, 'swap?': 'no' }),
  frame({ i: 0, j: null, 'swap?': null }),
  frame({ i: 1, j: 0, 'swap?': '?' }),
  frame({ i: 1, j: 0, 'swap?': 'no' }),
]

const cellsAt = (index: number) => buildTraceRows(FRAMES, index, trace).map((r) => r.cells)

describe('buildTraceRows', () => {
  it('has no rows before the first question', () => {
    expect(buildTraceRows(FRAMES, 0, trace)).toEqual([])
  })

  it('adds a row with "?" when a question is asked', () => {
    expect(cellsAt(1)).toEqual([[0, 0, '?']])
  })

  it('fills in the same row when the answer arrives, without a duplicate', () => {
    expect(cellsAt(2)).toEqual([[0, 0, 'yes']])
    expect(cellsAt(4)).toEqual([
      [0, 0, 'yes'],
      [0, 1, 'no'],
    ])
  })

  it('removes rows when stepping back', () => {
    expect(cellsAt(3)).toHaveLength(2)
    expect(cellsAt(1)).toHaveLength(1)
    expect(cellsAt(0)).toHaveLength(0)
  })

  it('ignores frames whose row key is incomplete', () => {
    expect(cellsAt(5)).toEqual(cellsAt(4))
  })

  it('marks the row the current frame touched', () => {
    expect(buildTraceRows(FRAMES, 3, trace).map((r) => r.isCurrent)).toEqual([false, true])
    // A frame that touches no row (the pass end) marks none.
    expect(buildTraceRows(FRAMES, 5, trace).some((r) => r.isCurrent)).toBe(false)
  })

  it('starts a new group when the group variable changes', () => {
    expect(buildTraceRows(FRAMES, 7, trace).map((r) => r.startsGroup)).toEqual([false, false, true])
  })

  it('treats an index past the end as the last frame', () => {
    expect(buildTraceRows(FRAMES, 99, trace)).toEqual(buildTraceRows(FRAMES, 7, trace))
  })

  it('handles no frames', () => {
    expect(buildTraceRows([], 0, trace)).toEqual([])
  })
})

describe('formatTraceValue', () => {
  const column = (variable: string) => {
    const found = trace.columns.find((c) => c.variable === variable)
    if (!found) throw new Error(`no column ${variable}`)
    return found
  }
  const i = column('i')
  const swap = column('swap?')

  it('counts from 1 in Explorer where the column says so', () => {
    expect(formatTraceValue(0, i, 'engineer')).toBe('0')
    expect(formatTraceValue(0, i, 'explorer')).toBe('1')
  })

  it('leaves other columns alone and shows missing values as a dash', () => {
    expect(formatTraceValue('?', swap, 'explorer')).toBe('?')
    expect(formatTraceValue(null, i, 'explorer')).toBe('—')
    expect(formatTraceValue(true, swap, 'engineer')).toBe('yes')
  })
})

describe('groupCaption', () => {
  it('names the current group for each level', () => {
    const asking = FRAMES[6] as Frame
    expect(groupCaption(asking, trace, 'engineer')).toBe('pass i = 1')
    expect(groupCaption(asking, trace, 'explorer')).toBe('round 2')
  })

  it('is null when the frame has no group value or the algorithm no trace', () => {
    expect(groupCaption(FRAMES[0] as Frame, trace, 'engineer')).toBeNull()
    expect(groupCaption(FRAMES[1] as Frame, undefined, 'engineer')).toBeNull()
  })
})
