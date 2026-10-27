import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ALGORITHMS } from '../algorithms'
import { heapSort } from '../algorithms/sorting/heapSort'
import { collectFrames } from '../engine/collect'
import type { Frame, Level } from '../engine/types'
import { Stage } from './Stage'

// [5, 2, 8, 1, 9, 3]: frame 3 asks whether 9 (at 4) climbs past 2 (at 1); frame 4 is the climb;
// frame 11 takes 9 to the end (heap of 5); frame 28 is the last extract (all final).
const { frames } = collectFrames(heapSort, [5, 2, 8, 1, 9, 3])
const at = (k: number) => {
  const frame = frames[k]
  if (!frame) throw new Error(`no frame ${String(k)}`)
  return frame
}

function stage(frame: Frame, level: Level = 'engineer', heaps = true) {
  return render(<Stage frame={frame} level={level} stepDelayMs={800} heaps={heaps} />).container
}
const arcs = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('.stage-heap-arc')].map((el) => ({
    kind: el.className.replace('stage-heap-arc ', ''),
    columns: el.style.gridColumn,
    span: el.style.getPropertyValue('--span'),
  }))
const tags = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('.stage-heap-row')].map(
    (el) => `${el.querySelector('.stage-heap-word')?.textContent ?? ''} ${el.style.gridColumn}`,
  )
const zones = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('.stage-heap-zone')].map(
    (el) => `${el.className.replace('stage-heap-zone ', '')} ${el.style.gridColumn}`,
  )
const description = (root: HTMLElement) => root.querySelector('.visually-hidden')?.textContent

describe('Stage: heap sort’s pyramid', () => {
  it('the ask: arcs from the parent to both children, all "looking" while the family is compared', () => {
    expect(arcs(stage(at(3)))).toEqual([
      { kind: 'is-left is-looking', columns: '2 / 5', span: '3' },
      { kind: 'is-right is-looking', columns: '2 / 6', span: '4' },
    ])
  })

  it('the climb: the arc to the child that climbs is "trading", the other plain', () => {
    expect(arcs(stage(at(4)))).toEqual([
      { kind: 'is-left', columns: '2 / 5', span: '3' },
      { kind: 'is-right is-trading', columns: '2 / 6', span: '4' },
    ])
  })

  it('after the top leaves, its new family is linked but not looked at yet: plain arcs', () => {
    expect(arcs(stage(at(11))).map((a) => a.kind)).toEqual(['is-left', 'is-right'])
  })

  it('a parent with one child inside the heap has one arc', () => {
    expect(arcs(stage(at(1)))).toEqual([
      { kind: 'is-left is-looking', columns: '3 / 7', span: '4' },
    ])
  })

  it('tags each row of the pyramid inside the heap: the top, then two, then the rest', () => {
    expect(tags(stage(at(3)))).toEqual(['top 1 / 2', 'row 2 2 / 4', 'row 3 4 / 7'])
    expect(tags(stage(at(3), 'explorer'))).toEqual(['top 1 / 2', 'row 2 2 / 4', 'row 3 4 / 7'])
    // A heap of 5: the last row stops at the sorted part.
    expect(tags(stage(at(11)))).toEqual(['top 1 / 2', 'row 2 2 / 4', 'row 3 4 / 6'])
  })

  it('tints the pyramid and the sorted part apart', () => {
    expect(zones(stage(at(3)))).toEqual(['is-heap 1 / 7'])
    expect(zones(stage(at(11)))).toEqual(['is-heap 1 / 6', 'is-done 6 / -1'])
    // The last extract: the last one left is final too, so no pyramid is left.
    expect(zones(stage(at(28)))).toEqual(['is-done 1 / -1'])
    expect(tags(stage(at(28)))).toEqual([])
  })

  it('the band is there on every frame, with no arcs where no parent is looked at', () => {
    for (const frame of [at(0), at(10), frames.at(-1)] as Frame[]) {
      const root = stage(frame)
      expect(root.querySelector('.stage-heap')).not.toBeNull()
      expect(arcs(root)).toEqual([])
    }
  })

  it('says it for screen readers, at both levels', () => {
    expect(description(stage(at(3), 'explorer'))).toContain(
      'The pyramid: the first 6 numbers. Under 2: two numbers.',
    )
    expect(description(stage(at(11), 'engineer'))).toContain(
      'Heap a[0..5). Parent 0, children 1 and 2.',
    )
  })

  it('the other sorts have no band, no tints and the same description', () => {
    for (const algorithm of Object.values(ALGORITHMS)) {
      if (algorithm === heapSort) continue
      for (const frame of collectFrames(algorithm, [5, 2, 8, 1, 9, 3]).frames) {
        const root = stage(frame, 'engineer', false)
        expect(root.querySelector('.stage-heap, .stage-heap-zones, .has-heap')).toBeNull()
        expect(description(root)).not.toMatch(/pyramid|Heap/)
      }
    }
  })
})
