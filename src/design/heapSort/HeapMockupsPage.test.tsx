import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { heapSort } from '../../algorithms/sorting/heapSort'
import { collectFrames } from '../../engine/collect'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { HeapMockupsPage } from './HeapMockupsPage'
import { clipRange, identities, momentsOf } from './model'
import {
  BEAVER_H,
  BEAVER_W,
  beaverRows,
  BEAVERS,
  clumpRows,
  countUnits,
  damRows,
  EAGLE_H,
  EAGLE_W,
  eagleRows,
  EAGLES,
  logEndRows,
  stackRows,
  treeLayout,
  treeRows,
  UNIT_STAGES,
  unitRows,
} from './studies'

const MIXED = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8]
const DUPES = [9, 4, 9, 2, 7, 4, 12, 1, 7, 3, 9, 5]

const isRectangle = (rows: readonly string[]) =>
  rows.every((row) => row.length === (rows[0]?.length ?? 0))

describe('heap sort mockup, round three: the pieces', () => {
  it('every variant of each character is the same size in every pose', () => {
    for (const [variants, rows, w, h] of [
      [BEAVERS, beaverRows, BEAVER_W, BEAVER_H],
      [EAGLES, eagleRows, EAGLE_W, EAGLE_H],
    ] as const) {
      for (const { id } of variants) {
        for (const pose of ['idle', 'move', 'carry'] as const) {
          const grid = rows(id, pose)
          expect(isRectangle(grid)).toBe(true)
          expect([grid.length, grid[0]?.length]).toEqual([h, w])
          expect(grid.join('')).toContain('e')
        }
      }
    }
  })

  it('a stack has exactly as many units as its value, every unit the same', () => {
    for (const kind of ['log', 'sticks'] as const) {
      for (const h of [2, 3, 4, 5, 7, 9, 11, 12]) {
        for (let count = 1; count <= 12; count++) {
          const grid = stackRows(kind, count, h, 32)
          expect(isRectangle(grid)).toBe(true)
          expect(grid).toHaveLength(count * h + 1)
          expect(countUnits(grid)).toBe(count)
        }
      }
      // At 1 px a stack is the plain column, one row a unit.
      expect(stackRows(kind, 12, 1, 32)).toHaveLength(12)
    }
  })

  it('a log shows its rings, and a bundle its twine, only where they fit', () => {
    expect(unitRows('log', 9, 41).join('')).toContain('R')
    expect(unitRows('log', 5, 44).join('')).not.toContain('R')
    expect(unitRows('sticks', 4, 32).join('')).toContain('K')
    expect(unitRows('sticks', 3, 32).join('')).not.toContain('K')
  })

  it('every stage gets a unit sized for 12 that fits its field with the number under it', () => {
    for (const { size, h } of UNIT_STAGES) {
      expect(h).toBeGreaterThanOrEqual(1)
      expect(12 * h + 14).toBeLessThanOrEqual(size.height)
    }
  })

  it('the nodes and tree views draw every node', () => {
    for (const node of [logEndRows(26), clumpRows(26)]) {
      expect(isRectangle(node)).toBe(true)
      expect(node.join('')).toContain('o')
    }
    const layout = treeLayout(7, 150, 24, 30)
    const tree = treeRows(layout)
    const dam = damRows(treeLayout(7, 150, 24, 24))
    expect(tree).toHaveLength(layout.h)
    expect(tree.join('')).toContain('T')
    expect(dam.join('')).toContain('M')
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
  it('says it is not to be merged and shows both designs and every variant', () => {
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <HeapMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DO NOT MERGE')
    expect(screen.getByRole('heading', { name: 'B. Beaver and logs' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'E. Eagle and stick bundles' })).toBeInTheDocument()
    for (const { name } of [...BEAVERS, ...EAGLES]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
  })
})
