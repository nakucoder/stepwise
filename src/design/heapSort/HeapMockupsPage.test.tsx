import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { heapSort } from '../../algorithms/sorting/heapSort'
import { collectFrames } from '../../engine/collect'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { HeapMockupsPage } from './HeapMockupsPage'
import { clipRange, identities, momentsOf } from './model'
import {
  clumpRows,
  countCrates,
  crateRows,
  crateStack,
  crateWidth,
  MONKEY_DESIGNS,
  MONKEY_H,
  MONKEY_W,
  monkeyRows,
  treeLayout,
  treeRows,
} from './studies'

const MIXED = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8]
const DUPES = [9, 4, 9, 2, 7, 4, 12, 1, 7, 3, 9, 5]

const isRectangle = (rows: readonly string[]) =>
  rows.every((row) => row.length === (rows[0]?.length ?? 0))

describe('heap sort mockup, round two: the pieces', () => {
  it('every monkey design is the same size in every pose, and only the poses on a vine have one', () => {
    for (const { id } of MONKEY_DESIGNS) {
      for (const pose of ['idle', 'swing', 'hold'] as const) {
        const rows = monkeyRows(id, pose)
        expect(isRectangle(rows)).toBe(true)
        expect([rows.length, rows[0]?.length]).toEqual([MONKEY_H, MONKEY_W])
        expect(rows.join('').includes('v')).toBe(pose !== 'idle')
        expect(rows.join('').includes('e')).toBe(true)
      }
    }
  })

  it('a stack of crates has exactly as many crates as its value, all the same height', () => {
    for (const h of [3, 4, 5, 8, 12]) {
      for (let count = 1; count <= 12; count++) {
        const rows = crateStack(count, h)
        expect(isRectangle(rows)).toBe(true)
        expect(rows[0]).toHaveLength(crateWidth(h))
        expect(rows).toHaveLength(count * h + 1)
        expect(countCrates(rows)).toBe(count)
      }
    }
  })

  it('a crate has its banana label only from 7 px', () => {
    expect(crateRows(6).join('').includes('L')).toBe(false)
    expect(crateRows(7).join('').includes('L')).toBe(true)
    expect(crateRows(12).join('').includes('y')).toBe(true)
  })

  it('the clump and the tree are drawn with an outline, a trunk and every clump', () => {
    const clump = clumpRows(26)
    expect(isRectangle(clump)).toBe(true)
    expect(clump.join('').includes('o')).toBe(true)
    const layout = treeLayout(7, 150, 24, 30)
    const tree = treeRows(layout)
    expect(tree).toHaveLength(layout.h)
    expect(tree.join('').includes('T')).toBe(true)
    // Every node's center is leaves.
    for (const node of layout.nodes) {
      expect('abc').toContain(tree[Math.round(node.y)]?.charAt(Math.round(node.x)))
    }
  })
})

describe('heap sort mockup: following the run (for the full scenes)', () => {
  it('each value keeps its identity: at every frame the ids hold the frame’s values', () => {
    const frames = collectFrames(heapSort, DUPES).frames
    const ids = identities(frames)
    frames.forEach((frame, index) => {
      const at = ids[index] ?? []
      expect([...at].sort((a, b) => a - b)).toEqual(DUPES.map((_, k) => k))
      at.forEach((id, k) => {
        expect(frame.array[k]).toBe(DUPES[id])
      })
    })
  })

  it('finds every moment in the 12-number run, and a short clip', () => {
    const frames = collectFrames(heapSort, MIXED).frames
    const moments = momentsOf(frames)
    for (const index of Object.values(moments)) expect(index).not.toBeNull()
    expect(frames[moments.climb ?? 0]?.heap?.event).toBe('climb')
    expect(frames[moments.leave ?? 0]?.heap?.event).toBe('extract')
    const [from, to] = clipRange(frames)
    expect(to - from).toBeLessThan(40)
  })
})

describe('heap sort mockup: the page', () => {
  it('says it is not to be merged and shows the three monkeys, the crates and the tree', () => {
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <HeapMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DO NOT MERGE')
    for (const { name } of MONKEY_DESIGNS) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { name: /Banana crates/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /The tree/ })).toBeInTheDocument()
  })
})
