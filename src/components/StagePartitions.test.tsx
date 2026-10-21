import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mergeSort } from '../algorithms/sorting/mergeSort'
import { quickSort } from '../algorithms/sorting/quickSort'
import { collectFrames } from '../engine/collect'
import type { Frame, Level } from '../engine/types'
import { Stage } from './Stage'

// [5, 2, 8, 1, 9, 3], last as pivot: 3 lands at 2; then [0..2) with [3..6) waiting.
const { frames } = collectFrames(quickSort, [5, 2, 8, 1, 9, 3])
const find = (event: string, lo: number, hi: number) => {
  const frame = frames.find(
    (f) => f.partition?.event === event && f.partition.lo === lo && f.partition.hi === hi,
  )
  if (!frame) throw new Error(`no ${event} ${String(lo)}-${String(hi)}`)
  return frame
}

function stage(frame: Frame, level: Level = 'engineer', partitions = true) {
  return render(<Stage frame={frame} level={level} stepDelayMs={800} partitions={partitions} />)
    .container
}
const brackets = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('.stage-part')].map((el) => ({
    kind: el.className.replace('stage-part ', ''),
    columns: el.style.gridColumn,
  }))
const note = (root: HTMLElement) => root.querySelector('.stage-part-note')?.textContent
const barClasses = (root: HTMLElement) =>
  [...root.querySelectorAll('.stage-bars .stage-bar')].map((el) =>
    el.className.replace('stage-bar', '').trim(),
  )
const description = (root: HTMLElement) => root.querySelector('.visually-hidden')?.textContent

describe('Stage: quick sort’s range brackets', () => {
  it('the whole list: one solid bracket, nothing waiting, nothing dimmed', () => {
    const root = stage(find('compare', 0, 6))
    expect(brackets(root)).toEqual([{ kind: 'is-active', columns: '1 / 7' }])
    expect(note(root)).toBe('')
    expect(root.querySelectorAll('.is-outside')).toHaveLength(0)
  })

  it('a side: solid under it, dashed under the range waiting, the rest dimmed or green', () => {
    const root = stage(find('compare', 0, 2))
    expect(brackets(root)).toEqual([
      { kind: 'is-active', columns: '1 / 3' },
      { kind: 'is-pending', columns: '4 / 7' },
    ])
    // 2 is looking, 1 is the leader, 3 is in its final spot; 5, 9 and 8 wait their turn.
    expect(barClasses(root)).toEqual([
      'is-comparing',
      'is-pivot',
      'is-sorted',
      'is-outside',
      'is-outside',
      'is-outside',
    ])
  })

  it('names what waits: the ranges to do in Engineer, how many in Explorer', () => {
    expect(note(stage(find('compare', 0, 2), 'engineer'))).toBe('to do: [3..6)')
    expect(note(stage(find('compare', 0, 2), 'explorer'))).toBe('next up: 1 more group (dashed)')
  })

  it('the bracket row is there on every frame of the run (so nothing jumps)', () => {
    for (const frame of [frames[0], frames.at(-1)] as Frame[]) {
      const root = stage(frame)
      expect(root.querySelector('.stage-parts')).not.toBeNull()
      expect(brackets(root)).toEqual([])
      expect(note(root)).toBe('')
    }
  })

  it('the other sorts have no bracket row and no dimmed bars', () => {
    const merge = collectFrames(mergeSort, [5, 2, 8, 1, 9, 3]).frames
    for (const frame of merge) {
      const root = stage(frame, 'engineer', false)
      expect(root.querySelector('.stage-parts')).toBeNull()
      expect(root.querySelector('.is-outside')).toBeNull()
    }
  })

  it('says it for screen readers, at both levels', () => {
    expect(description(stage(find('compare', 0, 2), 'explorer'))).toContain(
      'Working on 2 numbers. Next up: 1 more group.',
    )
    expect(description(stage(find('compare', 0, 2), 'engineer'))).toContain(
      'Range [0..2). To do: [3..6).',
    )
  })
})
