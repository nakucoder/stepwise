import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mergeSort } from '../algorithms/sorting/mergeSort'
import { collectFrames } from '../engine/collect'
import type { Frame, Level } from '../engine/types'
import { Stage } from './Stage'

const { frames } = collectFrames(mergeSort, [5, 2, 8, 1, 9, 3])
const find = (event: string, lo: number, hi: number) => {
  const frame = frames.find((f) => f.span?.event === event && f.span.lo === lo && f.span.hi === hi)
  if (!frame) throw new Error(`no ${event} ${String(lo)}-${String(hi)}`)
  return frame
}

function stage(frame: Frame, level: Level = 'engineer') {
  return render(<Stage frame={frame} level={level} stepDelayMs={800} />).container
}
const brackets = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('.stage-span')].map((el) => ({
    kind: el.className.replace('stage-span ', ''),
    columns: el.style.gridColumn,
  }))
const description = (root: HTMLElement) => root.querySelector('.visually-hidden')?.textContent

describe('Stage: merge sort’s split and merge brackets', () => {
  it('a split: a dashed bracket under each half, and no value changes', () => {
    const root = stage(find('split', 0, 6))
    expect(brackets(root)).toEqual([
      { kind: 'is-split', columns: '1 / 4' },
      { kind: 'is-split', columns: '4 / 7' },
    ])
  })

  it('a merge: one bracket under the whole part, at every step of it', () => {
    for (const event of ['compare', 'move', 'merged']) {
      expect(brackets(stage(find(event, 3, 6)))).toEqual([{ kind: 'is-merge', columns: '4 / 7' }])
    }
  })

  it('the bracket row is there on every merge sort frame (so nothing jumps), empty at the start', () => {
    const root = stage(frames[0] as Frame)
    expect(root.querySelector('.stage-spans')).not.toBeNull()
    expect(brackets(root)).toEqual([])
  })

  it('says it for screen readers, at both levels', () => {
    expect(description(stage(find('split', 0, 6), 'explorer'))).toContain('Split 6 into 3 and 3.')
    expect(description(stage(find('split', 0, 6), 'engineer'))).toContain('Split [0..6) at 3.')
    expect(description(stage(find('compare', 0, 6), 'explorer'))).toContain(
      'Putting 3 and 3 back together.',
    )
    expect(description(stage(find('compare', 0, 6), 'engineer'))).toContain(
      'Merging [0..3) and [3..6).',
    )
  })

  it('marks a two-row stage (has-rows) so a short screen can pack the rows tighter', () => {
    expect(stage(find('compare', 0, 6)).querySelector('.stage-view')).toHaveClass('has-rows')
  })

  it('the one-row sorts get no bracket row', () => {
    const plain: Frame = {
      array: [5, 2, 8],
      highlights: {},
      activeLine: null,
      explanation: { explorer: 'Look.', engineer: 'Look.' },
      stats: { comparisons: 0, swaps: 0 },
    }
    const root = stage(plain)
    expect(root.querySelector('.stage-spans')).toBeNull()
    expect(root.querySelector('.stage-view')).not.toHaveClass('has-rows')
  })
})
