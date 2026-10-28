import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { heapSort } from '../algorithms/sorting/heapSort'
import { collectFrames } from '../engine/collect'
import type { Frame, Level } from '../engine/types'
import { HeapTree } from './HeapTree'
import {
  NODE_R,
  STAGE_NODE,
  describeTree,
  nodeAt,
  stageHeight,
  stageNodeAt,
  treeBox,
  treeRows,
} from './heapTree'
import { Stage } from './Stage'

// [5, 2, 8, 1, 9, 3]: frame 3 asks whether 9 (at 4) climbs past 2 (at 1); frame 4 is the climb;
// frame 11 takes 9 to the end (heap of 5); frame 28 is the last extract (all final).
const { frames } = collectFrames(heapSort, [5, 2, 8, 1, 9, 3])
const at = (k: number) => {
  const frame = frames[k]
  if (!frame) throw new Error(`no frame ${String(k)}`)
  return frame
}

function tree(frame: Frame, level: Level = 'engineer', placement: 'stage' | 'sheet' = 'stage') {
  return render(<HeapTree frame={frame} level={level} stepDelayMs={800} placement={placement} />)
    .container
}
const round = (n: number) => Math.round(n * 1e6) / 1e6
/**
 * Each circle's value, role and center: in the drawing's units in a sheet; over the bars, in the
 * lines' drawing (1000 by 1000 across the box) from the circle's place in percent.
 */
const nodes = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('.heap-tree-node')].map((node) => {
    const circle = node.querySelector('circle')
    return {
      value: Number(node.querySelector('.heap-tree-value')?.textContent),
      role: node.classList.contains('is-comparing')
        ? 'comparing'
        : node.classList.contains('is-swapping')
          ? 'swapping'
          : 'plain',
      x: round(circle ? Number(circle.getAttribute('cx')) : parseFloat(node.style.left) * 10),
      y: round(circle ? Number(circle.getAttribute('cy')) : parseFloat(node.style.top) * 10),
    }
  })
const edges = (root: HTMLElement) =>
  [...root.querySelectorAll('.heap-tree-edge')].map((edge) => ({
    kind: edge.getAttribute('class')?.replace('heap-tree-edge', '').trim() || 'plain',
    from: [round(Number(edge.getAttribute('x1'))), round(Number(edge.getAttribute('y1')))],
    to: [round(Number(edge.getAttribute('x2'))), round(Number(edge.getAttribute('y2')))],
  }))

describe('HeapTree: the shape, for 1 to 12 values', () => {
  for (const placement of ['stage', 'sheet'] as const) {
    for (let count = 1; count <= 12; count++) {
      it(`${placement}, ${String(count)} value${count === 1 ? '' : 's'}: every value in its place, each linked to its parent`, () => {
        const values = Array.from({ length: count }, (_, k) => 20 + k)
        const root = tree(collectFrames(heapSort, values).frames[0] as Frame, 'engineer', placement)
        const drawn = nodes(root)
        // The whole array is the heap at the start: one circle per value, in order.
        expect(drawn.map((n) => n.value)).toEqual(values)
        // Rows: 1, 2, 4, 8... from the top, as many as the count needs.
        expect(new Set(drawn.map((n) => n.y)).size).toBe(treeRows(count))
        const box = treeBox(count)
        for (const [k, node] of drawn.entries()) {
          if (placement === 'sheet') {
            expect(node).toMatchObject(nodeAt(k, count))
            // Inside the drawing, whole.
            expect(node.x - NODE_R).toBeGreaterThanOrEqual(0)
            expect(node.x + NODE_R).toBeLessThanOrEqual(box.width)
            expect(node.y - NODE_R).toBeGreaterThanOrEqual(0)
            expect(node.y + NODE_R).toBeLessThanOrEqual(box.height)
          } else {
            const at = stageNodeAt(k, count)
            expect(node).toMatchObject({ x: round(at.x * 1000), y: round(at.y * 1000) })
            // Across the box, each row's places spread evenly; up and down, whole in the box.
            expect(at.x).toBeGreaterThan(0)
            expect(at.x).toBeLessThan(1)
            const r = STAGE_NODE / 2 / stageHeight(count)
            expect(at.y - r).toBeGreaterThanOrEqual(0)
            expect(at.y + r).toBeLessThanOrEqual(1)
          }
        }
        // Neighbors in a row never touch; a left child is left of its parent, a right one right.
        for (let k = 1; k < count; k++) {
          const node = drawn[k]
          const before = drawn[k - 1]
          if (placement === 'sheet' && node && before && node.y === before.y) {
            expect(node.x - before.x).toBeGreaterThan(2 * NODE_R)
          }
          const parent = drawn[Math.floor((k - 1) / 2)]
          if (node && parent) {
            expect(node.y).toBeGreaterThan(parent.y)
            if (k % 2 === 1) expect(node.x).toBeLessThan(parent.x)
            else expect(node.x).toBeGreaterThan(parent.x)
          }
        }
        // One line per child, from its parent's center to its own.
        expect(edges(root).map((e) => [e.from, e.to])).toEqual(
          drawn.slice(1).map((node, j) => {
            const parent = drawn[Math.floor(j / 2)]
            return [
              [parent?.x, parent?.y],
              [node.x, node.y],
            ]
          }),
        )
        // The box's height, for the CSS: the drawing's in a sheet, tree units over the bars.
        const figure = root.querySelector<HTMLElement>('.heap-tree')
        if (placement === 'sheet') {
          expect(root.querySelector('svg')?.getAttribute('viewBox')).toBe(
            `0 0 ${String(box.width)} ${String(box.height)}`,
          )
          expect(figure?.style.getPropertyValue('--tree-units')).toBe(String(box.height))
        } else {
          expect(figure?.style.getPropertyValue('--tree-h')).toBe(String(stageHeight(count)))
        }
      })
    }
  }

  it('rows: 1 → 1, 2–3 → 2, 4–7 → 3, 8–12 → 4', () => {
    expect([1, 2, 3, 4, 7, 8, 12].map(treeRows)).toEqual([1, 2, 2, 3, 3, 4, 4])
  })

  it('over the bars, each row spreads across the width: the top at the middle, the bottom row’s slots evenly', () => {
    expect([0, 1, 2].map((k) => stageNodeAt(k, 6).x)).toEqual([0.5, 0.25, 0.75])
    expect([7, 8, 11].map((k) => stageNodeAt(k, 12).x)).toEqual([1 / 16, 3 / 16, 9 / 16])
  })

  it('every position keeps its place through the run (the layout is the run’s, not the heap’s)', () => {
    for (const placement of ['stage', 'sheet'] as const) {
      const placed = (frame: Frame) =>
        nodes(tree(frame, 'engineer', placement)).map(({ x, y }) => `${String(x)},${String(y)}`)
      const start = placed(at(0))
      for (const frame of frames) {
        expect(start.slice(0, placed(frame).length)).toEqual(placed(frame))
      }
    }
  })
})

describe('HeapTree: the same highlights as the bars', () => {
  it('the ask: the parent and the bigger child are "looking", and the lines to its family', () => {
    const root = tree(at(3))
    expect(nodes(root).map((n) => `${String(n.value)} ${n.role}`)).toEqual([
      '5 plain',
      '2 comparing',
      '8 plain',
      '1 plain',
      '9 comparing',
      '3 plain',
    ])
    // Lines to children 1..5: the parent at 1 has children 3 and 4.
    expect(edges(root).map((e) => e.kind)).toEqual([
      'plain',
      'plain',
      'is-looking',
      'is-looking',
      'plain',
    ])
  })

  it('the climb: both values "trading", the line to the child that climbs too', () => {
    const root = tree(at(4))
    expect(nodes(root).map((n) => `${String(n.value)} ${n.role}`)).toEqual([
      '5 plain',
      '9 swapping',
      '8 plain',
      '1 plain',
      '2 swapping',
      '3 plain',
    ])
    expect(edges(root).map((e) => e.kind)).toEqual([
      'plain',
      'plain',
      'plain',
      'is-trading',
      'plain',
    ])
  })

  it('a step that looks at no family marks nothing', () => {
    const root = tree(at(0))
    expect(nodes(root).every((n) => n.role === 'plain')).toBe(true)
    expect(edges(root).every((e) => e.kind === 'plain')).toBe(true)
  })

  it('follows the frame’s highlights at every step', () => {
    for (const frame of frames) {
      const root = tree(frame)
      for (const [k, node] of nodes(root).entries()) {
        const expected = frame.highlights.swapping?.includes(k)
          ? 'swapping'
          : frame.highlights.comparing?.includes(k)
            ? 'comparing'
            : 'plain'
        expect(node.role).toBe(expected)
        expect(node.value).toBe(frame.array[k])
      }
    }
  })
})

describe('HeapTree: sorted values leave the tree', () => {
  it('the top leaves for the end: 9 is gone, the five left keep their places', () => {
    const root = tree(at(11))
    expect(nodes(root).map((n) => n.value)).toEqual([3, 5, 8, 1, 2])
    expect(edges(root)).toHaveLength(4)
  })

  it('a value is drawn only while it is in the heap, at every step', () => {
    for (const frame of frames) {
      const sorted = new Set(frame.highlights.sorted ?? [])
      const drawn = nodes(tree(frame))
      expect(drawn.length).toBe(
        frame.array.filter((_, k) => !sorted.has(k) && k < (frame.heap?.size ?? 0)).length,
      )
    }
  })

  it('when every value is final the tree is empty, and says so', () => {
    for (const frame of [at(28), at(29)]) {
      const root = tree(frame, 'explorer')
      expect(nodes(root)).toEqual([])
      expect(root.querySelector('[role="img"]')).toHaveAccessibleName(
        'The pyramid is empty: every number is in its place.',
      )
    }
  })
})

describe('HeapTree: names and words', () => {
  it('Explorer calls it the pyramid, Engineer the heap (tree), in its corner on the stage', () => {
    expect(tree(at(0), 'explorer').querySelector('figcaption')).toHaveTextContent('The pyramid')
    expect(tree(at(0), 'engineer').querySelector('figcaption')).toHaveTextContent('The heap (tree)')
  })

  it('in a sheet it has no corner name (the sheet’s title says it)', () => {
    expect(tree(at(0), 'explorer', 'sheet').querySelector('figcaption')).toBeNull()
  })

  it('reads row by row for screen readers', () => {
    expect(describeTree([9, 5, 8, 1, 2, 3], 'explorer')).toBe(
      'The pyramid, from the top: 9; then 5, 8; then 1, 2, 3.',
    )
    expect(describeTree([9, 5, 8, 1, 2, 3], 'engineer')).toBe(
      'The heap (tree), row by row: 9; 5, 8; 1, 2, 3.',
    )
  })
})

describe('Stage: the tree is heap sort’s only', () => {
  it('draws the tree over the band and the bars with heaps', () => {
    const root = render(<Stage frame={at(3)} level="engineer" stepDelayMs={800} heaps />).container
    const view = root.querySelector('.stage-view')
    const children = [...(view?.children ?? [])].map((el) => el.className)
    expect(children.indexOf('heap-tree is-stage')).toBeLessThan(children.indexOf('stage-plot'))
  })

  it('no tree without heaps', () => {
    const root = render(<Stage frame={at(3)} level="engineer" stepDelayMs={800} />).container
    expect(root.querySelector('.heap-tree')).toBeNull()
  })
})

describe('Stage: the tree and the bars agree (mutation audit)', () => {
  const role = (el: Element) =>
    el.classList.contains('is-swapping')
      ? 'swapping'
      : el.classList.contains('is-comparing')
        ? 'comparing'
        : 'plain'

  it('at every frame, each circle shows its bar’s value and its bar’s highlight', () => {
    for (const input of [
      [5, 2, 8, 1, 9, 3],
      [42, 7, 19, 88, 3, 64, 25, 51, 13, 76, 30, 9],
    ]) {
      const run = collectFrames(heapSort, input).frames
      for (const frame of run) {
        const root = render(
          <Stage frame={frame} level="engineer" stepDelayMs={800} heaps />,
        ).container
        const bars = [...root.querySelectorAll('.stage-bars:not(.is-buffer) .stage-bar')]
        const circles = [...root.querySelectorAll('.heap-tree-node')]
        expect(bars).toHaveLength(input.length)
        // The tree holds the heap, a[0..end): one circle per bar there.
        expect(circles.length).toBeLessThanOrEqual(bars.length)
        if (frame === run[0]) expect(circles).toHaveLength(input.length)
        circles.forEach((circle, k) => {
          const bar = bars[k]
          if (!bar) throw new Error(`no bar ${String(k)}`)
          expect(circle.querySelector('.heap-tree-value')?.textContent).toBe(
            bar.querySelector('.stage-bar-label')?.textContent,
          )
          expect(role(circle)).toBe(role(bar))
        })
      }
    }
  })
})
