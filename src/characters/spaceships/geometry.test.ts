import { describe, expect, it } from 'vitest'
import {
  bracketAt,
  digitFont,
  gateAt,
  shipAt,
  smallestGrid,
  spaceshipLayout,
  treeDepth,
} from './geometry'

const SIX = [5, 2, 8, 1, 9, 3]
const ONE_TO_NINE = [1, 2, 3, 4, 5, 6, 7, 8, 9]

describe('the spec’s numbers', () => {
  it('a tree of ceil(log2 n) + 1 rows', () => {
    expect([1, 2, 3, 6, 8, 9, 12].map(treeDepth)).toEqual([0, 1, 2, 3, 3, 4, 4])
  })

  it('digits of 7 units, never under 10 px; the smallest grid fits its digit', () => {
    expect([1, 2, 3].map(digitFont)).toEqual([10, 14, 21])
    expect([1, 2, 3].map(smallestGrid)).toEqual([13, 9, 9])
  })

  // The fit table, on fields with no gap between columns (the spec's colW = w / n).
  it('390 × 844 phone, 366 × 382: the full tree, s 2, 14 px, 4 rows of 92, 9 sizes', () => {
    const geo = spaceshipLayout({ width: 366, height: 382, gap: 0 }, SIX)
    expect(geo).toMatchObject({ plan: 'tree', s: 2, font: 14, rows: 4, rowH: 92, sizes: 9 })
    expect(ONE_TO_NINE.map(geo.side)).toEqual([18, 22, 26, 30, 34, 38, 42, 46, 50])
  })

  it('desktop, about 640 × 360: the full tree, s 2, 4 rows of 87, 15 sizes, 22 to 74 px', () => {
    const geo = spaceshipLayout({ width: 640, height: 360, gap: 0 }, SIX)
    expect(geo).toMatchObject({ plan: 'tree', s: 2, font: 14, rows: 4, rowH: 87, sizes: 15 })
    expect(geo.side(1)).toBe(22)
    expect(geo.side(9)).toBe(74)
  })

  it('740 × 300 at 130%, Do it, 479 × 90: zoom, 2 rows of 43, s 1, 10 px, 13 sizes, 15 to 37', () => {
    const geo = spaceshipLayout({ width: 479, height: 90, gap: 0 }, SIX)
    expect(geo).toMatchObject({ plan: 'zoom', s: 1, font: 10, rows: 2, rowH: 43, sizes: 13 })
    expect(geo.side(1)).toBe(15)
    expect(geo.side(9)).toBe(37)
  })

  it('740 × 300 at 130%, Watch, 479 × 53: zoom, 2 rows of 24, four sizes 13 to 19', () => {
    const geo = spaceshipLayout({ width: 479, height: 53, gap: 0 }, SIX)
    expect(geo).toMatchObject({ plan: 'zoom', s: 1, rows: 2, rowH: 24, sizes: 4 })
    // Levels ceil(4 v / 9): 1 1 2 2 3 3 4 4 4.
    expect(ONE_TO_NINE.map(geo.side)).toEqual([13, 13, 15, 15, 17, 17, 19, 19, 19])
    expect(new Set(ONE_TO_NINE.map(geo.side))).toEqual(new Set([13, 15, 17, 19]))
  })

  it('a size depends only on the value and the input (12 values: next to a 99, small ones share)', () => {
    const geo = spaceshipLayout({ width: 366, height: 382, gap: 0 }, [99, 1, 2, 3, 50, 52])
    expect(geo.side(1)).toBe(geo.side(3))
    expect(geo.side(99)).toBeGreaterThan(geo.side(52))
  })

  it('never fewer than one size, and ships never vanish on a tiny field', () => {
    const geo = spaceshipLayout({ width: 120, height: 20, gap: 0 }, SIX)
    expect(geo.sizes).toBe(1)
    expect(geo.s).toBe(1)
    expect(geo.side(9)).toBe(13)
  })
})

describe('the bars’ columns, with their gap', () => {
  it('centers on the grid; the pitch is the column plus the gap', () => {
    const geo = spaceshipLayout({ width: 366, height: 382, gap: 14 }, SIX)
    expect(geo.colW).toBeCloseTo((366 - 5 * 14) / 6)
    expect(geo.pitch).toBeCloseTo(geo.colW + 14)
    expect(geo.center(0)).toBeCloseTo(geo.colW / 2)
    expect(geo.center(5)).toBeCloseTo(366 - geo.colW / 2)
  })

  it('a ship centered on its column, on its row’s floor; a lead lifted 2 units', () => {
    const geo = spaceshipLayout({ width: 366, height: 382, gap: 0 }, SIX)
    const [x, y] = shipAt(geo, 9, 4, 1)
    expect(x).toBe(Math.round(geo.center(4) - 25))
    expect(y).toBe(geo.rowTop(1) + 92 - 2 - 50)
    expect(shipAt(geo, 9, 4, 1, true)[1]).toBe(y - 4)
    // Whole pixels everywhere.
    expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true)
  })

  it('the gate over [lo, hi) across the top of the halves’ row, posts 3 units above', () => {
    const geo = spaceshipLayout({ width: 366, height: 382, gap: 0 }, SIX)
    const { bar, posts } = gateAt(geo, 0, 3, 1)
    expect(bar).toMatchObject({ y: geo.rowTop(1), height: 4 })
    expect(bar.x).toBe(Math.round(0.04 * 61))
    expect(bar.x + bar.width).toBe(Math.round(3 * 61 - 0.04 * 61))
    expect(posts).toEqual([
      { x: bar.x, y: bar.y - 6, width: 4, height: 16 },
      { x: bar.x + bar.width - 4, y: bar.y - 6, width: 4, height: 16 },
    ])
  })

  it('a squadron’s bracket along its floor, 0.08 of a column inside each end', () => {
    const geo = spaceshipLayout({ width: 366, height: 382, gap: 0 }, SIX)
    const bracket = bracketAt(geo, 3, 5, 2)
    expect(bracket).toEqual({
      x: Math.round(3 * 61 + 0.08 * 61),
      y: geo.floor(2),
      width: Math.round(6 * 61 - 0.08 * 61) - Math.round(3 * 61 + 0.08 * 61),
      height: 2,
    })
  })
})
