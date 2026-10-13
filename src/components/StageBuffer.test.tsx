import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Frame, Level } from '../engine/types'
import { Stage } from './Stage'

/**
 * Hand-made two-row frames (not merge sort): the main row 5 2 8 1, with its first two values
 * moved up into the buffer while they are compared.
 */
const ONE_ROW: Frame = {
  array: [5, 2, 8, 1],
  highlights: { comparing: [2, 3] },
  pointers: { k: 2 },
  activeLine: null,
  explanation: { explorer: 'Look at these two.', engineer: 'Compare.' },
  stats: { comparisons: 0, swaps: 0 },
}
const TWO_ROWS: Frame = {
  ...ONE_ROW,
  highlights: { sorted: [3] },
  pointers: { k: 0 },
  vacant: [0, 1],
  buffer: {
    values: [5, 2, null, null],
    highlights: { comparing: [0, 1] },
    pointers: { i: 0, j: 1 },
  },
}

function stage(frame: Frame, level: Level = 'engineer', look: 'bars' | 'ducks' = 'bars') {
  return render(<Stage frame={frame} level={level} stepDelayMs={800} look={look} />).container
}

const rows = (root: HTMLElement) => [...root.querySelectorAll('.stage-bars')]
const labels = (row: Element | undefined) =>
  [...(row?.querySelectorAll('.stage-slot') ?? [])].map(
    (slot) => slot.querySelector('.stage-bar-label')?.textContent ?? '·',
  )
const description = (root: HTMLElement) => root.querySelector('.visually-hidden')?.textContent

describe('Stage: a second row, only when a frame has one', () => {
  it('a frame without a buffer: one row, as always', () => {
    const root = stage(ONE_ROW)
    expect(rows(root)).toHaveLength(1)
    expect(root.querySelectorAll('.stage-axis')).toHaveLength(1)
    expect(root.querySelector('.is-buffer')).toBeNull()
    expect(root.querySelectorAll('.stage-bar.is-empty')).toHaveLength(0)
  })

  it('a frame with a buffer: a second row under the first, on the same columns', () => {
    const root = stage(TWO_ROWS)
    const [main, buffer] = rows(root)
    expect(buffer).toHaveClass('is-buffer')
    expect(main?.querySelectorAll('.stage-slot')).toHaveLength(4)
    expect(buffer?.querySelectorAll('.stage-slot')).toHaveLength(4)
    // The two moved-out values leave empty slots on the main row; the buffer shows them.
    expect(labels(main)).toEqual(['·', '·', '8', '1'])
    expect(labels(buffer)).toEqual(['5', '2', '·', '·'])
    expect(main?.querySelectorAll('.stage-bar.is-empty')).toHaveLength(2)
    expect(buffer?.querySelectorAll('.stage-bar.is-empty')).toHaveLength(2)
  })

  it('each row has its own roles and pointers', () => {
    const root = stage(TWO_ROWS)
    const [main, buffer] = rows(root)
    expect(main?.querySelectorAll('.stage-bar.is-sorted')).toHaveLength(1)
    expect(buffer?.querySelectorAll('.stage-bar.is-comparing')).toHaveLength(2)
    const [mainMarks, bufferMarks] = [...root.querySelectorAll('.stage-axis')]
    expect(bufferMarks).toHaveClass('is-buffer')
    const pointersIn = (axis: Element | undefined) =>
      [...(axis?.querySelectorAll('.stage-mark-slot') ?? [])].map((slot) =>
        [...slot.querySelectorAll('.stage-pointer')].map((p) => p.textContent).join(' '),
      )
    expect(pointersIn(mainMarks)).toEqual(['k', '', '', ''])
    expect(pointersIn(bufferMarks)).toEqual(['i', 'j', '', ''])
    expect(bufferMarks?.querySelectorAll('.stage-role.is-comparing')).toHaveLength(2)
  })

  it('bars on both rows are scaled against the biggest value on either', () => {
    const tall: Frame = { ...TWO_ROWS, buffer: { values: [20, null, null, null] } }
    const root = stage(tall)
    const [main, buffer] = rows(root)
    const h = (bar: Element | null | undefined) =>
      Number((bar as HTMLElement | null)?.style.getPropertyValue('--h'))
    expect(h(buffer?.querySelector('.stage-bar:not(.is-empty)'))).toBe(1)
    expect(h(main?.querySelectorAll('.stage-bar:not(.is-empty)')[0])).toBe(8 / 20)
  })

  it('the screen-reader text names the buffer and the empty slots only when present', () => {
    expect(description(stage(ONE_ROW))).toBe('Array: 5, 2, 8, 1. Comparing 8 and 1.')
    expect(description(stage(TWO_ROWS))).toBe(
      'Array: empty, empty, 8, 1. In their final spots: 1. Buffer: 5, 2, empty, empty. Comparing 5 and 2 in it.',
    )
    expect(description(stage(TWO_ROWS, 'explorer'))).toBe(
      'Numbers: empty, empty, 8, 1. In their final spots: 1. Waiting row: 5, 2, empty, empty. Looking at 5 and 2 in it.',
    )
  })

  it('the characters ignore the buffer: the ducks draw one row, every value, as always', () => {
    const root = stage(TWO_ROWS, 'explorer', 'ducks')
    expect(rows(root)).toHaveLength(1)
    expect(root.querySelector('.is-buffer')).toBeNull()
    expect(root.querySelectorAll('.stage-bar.is-empty')).toHaveLength(0)
    expect(root.querySelectorAll('.duck-column')).toHaveLength(4)
    // And the words say what the ducks show.
    expect(description(root)).toBe('Numbers: 5, 2, 8, 1. In their final spots: 1.')
  })
})
