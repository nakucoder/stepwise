import { describe, expect, it } from 'vitest'
import { findJargon } from './jargon'
import type { Frame } from './types'
import { validateFrames } from './validateFrames'

const algorithm = { source: { python: 'line 1\nline 2\nline 3' } }

const valid: Frame = {
  array: [3, 1, 2],
  highlights: { comparing: [0, 1], sorted: [2] },
  pointers: { j: 0, 'j+1': 1 },
  variables: { i: 0, j: 0, 'swap?': '?', done: false, temp: null },
  activeLine: 2,
  explanation: {
    explorer: 'Is 3 bigger than 1?',
    engineer: 'Compare a[0] = 3 with a[1] = 1.',
  },
  stats: { comparisons: 1, swaps: 0 },
}

/** Validates a sequence of [valid, broken] so stats can be compared across frames. */
const problemsFor = (broken: Partial<Frame>) =>
  validateFrames([valid, { ...valid, ...broken }], algorithm)

describe('validateFrames', () => {
  it('accepts valid frames', () => {
    expect(validateFrames([valid, { ...valid, activeLine: null }], algorithm)).toEqual([])
  })

  it('requires at least one frame', () => {
    expect(validateFrames([], algorithm)).toEqual([
      'no frames: every algorithm yields at least one',
    ])
  })

  it.each<[string, Partial<Frame>, string]>([
    ['array length changes', { array: [1, 2] }, 'frame 1: array length 2, expected 3'],
    ['non-finite values', { array: [1, Number.NaN, 2] }, 'not a finite number'],
    [
      'highlight out of bounds',
      { highlights: { sorted: [3] } },
      'sorted highlight 3 is out of bounds',
    ],
    ['negative highlight', { highlights: { comparing: [-1] } }, 'comparing highlight -1'],
    ['pointer out of bounds', { pointers: { j: 5 } }, 'pointer j = 5 is out of bounds'],
    ['fractional pointer', { pointers: { mid: 1.5 } }, 'pointer mid = 1.5'],
    [
      'activeLine past the source',
      { activeLine: 4 },
      'activeLine 4 is not a line of the python source (1-3)',
    ],
    ['activeLine zero', { activeLine: 0 }, 'activeLine 0'],
    [
      'empty explorer text',
      { explanation: { explorer: '  ', engineer: 'ok' } },
      'explorer explanation is empty',
    ],
    [
      'empty engineer text',
      { explanation: { explorer: 'ok', engineer: '' } },
      'engineer explanation is empty',
    ],
    [
      'jargon in explorer text',
      { explanation: { explorer: 'Move the pointer to index 2.', engineer: 'ok' } },
      'explorer explanation uses jargon "pointer"',
    ],
    [
      'comparisons decrease',
      { stats: { comparisons: 0, swaps: 0 } },
      'frame 1: comparisons went down',
    ],
    ['negative stat', { stats: { comparisons: 1, swaps: -1 } }, 'swaps = -1'],
    ['bad trace value', { variables: { x: Number.POSITIVE_INFINITY } }, 'trace variable x'],
  ])('reports %s', (_name, broken, message) => {
    expect(problemsFor(broken).join('\n')).toContain(message)
  })

  it('reports a trace column the frames never provide', () => {
    const traced = {
      ...algorithm,
      trace: {
        columns: [{ variable: 'held', label: { engineer: 'held', explorer: 'held' } }],
        rowKey: ['held'],
      },
    }
    expect(validateFrames([valid], traced)).toContain(
      'frame 0: trace column held is missing from variables',
    )
    expect(
      validateFrames([{ ...valid, variables: { ...valid.variables, held: 3 } }], traced),
    ).toEqual([])
  })

  it('reports swaps going down', () => {
    const first = { ...valid, stats: { comparisons: 1, swaps: 2 } }
    expect(validateFrames([first, valid], algorithm)).toContain('frame 1: swaps went down')
  })
})

describe('findJargon', () => {
  it.each([
    'Look at index 3.',
    'The ALGORITHM finishes.',
    'This is O(n) work.',
    'Each node points on.',
    'The loop runs again.',
  ])('finds jargon in "%s"', (text) => {
    expect(findJargon(text)).not.toBeNull()
  })

  it.each([
    'Is 5 bigger than 3? Yes! They trade places.',
    'Round 2 is done: 8 is in its final spot.',
    'Pick a topic and watch it run.',
  ])('accepts plain words: "%s"', (text) => {
    expect(findJargon(text)).toBeNull()
  })
})
