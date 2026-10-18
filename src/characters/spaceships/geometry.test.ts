import { describe, expect, it } from 'vitest'
import {
  bracketAt,
  digitFont,
  gateAt,
  HEADROOM,
  LIFT,
  MAX_FONT,
  MIN_FONT,
  plateAt,
  plateHeight,
  RING,
  shipAt,
  spaceshipLayout,
  stableHeight,
  TREE_FONT,
  treeDepth,
  type SizeMemory,
  type SpaceshipLayout,
} from './geometry'
import { FIGHTER_GRIDS } from './sprites'

const SIX = [5, 2, 8, 1, 9, 3]
const EIGHT = [1, 2, 3, 5, 8, 9, 15, 22]
const TWELVE = [42, 7, 19, 88, 3, 64, 25, 51, 13, 76, 30, 9]

describe('the rows and the digit', () => {
  it('a tree of ceil(log2 n) + 1 rows', () => {
    expect([1, 2, 3, 6, 8, 9, 12].map(treeDepth)).toEqual([0, 1, 2, 3, 3, 4, 4])
  })

  it('the tree’s digit is a fifth of the row, from 16 to 18 px', () => {
    expect([24, 60, 81, 85, 90, 200].map(digitFont)).toEqual([16, 16, 16, 17, 18, 18])
    expect([TREE_FONT, MAX_FONT, MIN_FONT]).toEqual([16, 18, 13])
  })
})

describe('one ship for every value; the value is its trail', () => {
  it('the phone (366 × 336, 6 values): the 25 × 25 cruiser at 1×, 4 rows of 81, 16 px digits', () => {
    const geo = spaceshipLayout({ width: 366, height: 336, gap: 0 }, SIX)
    expect(geo).toMatchObject({ plan: 'tree', rows: 4, rowH: 81, grid: 25, s: 1, side: 25 })
    expect(geo).toMatchObject({ font: 16, plateH: plateHeight(16), beside: false })
    // The trail's room: the row, less the headroom, the ship, a pixel, the plate, the bottom line.
    expect(geo.trailMax).toBe(81 - HEADROOM - 25 - 1 - geo.plateH - 1)
  })

  it('the phone as it is at a compare (366 × 315): 16 px digits, the ship a size down', () => {
    const geo = spaceshipLayout({ width: 366, height: 315, gap: 0 }, SIX)
    expect(geo).toMatchObject({ plan: 'tree', grid: 23, s: 1, font: 16 })
    expect(geo.trailMax).toBeGreaterThanOrEqual(geo.side)
  })

  it('the phone with 8 values: the same cruiser', () => {
    const geo = spaceshipLayout({ width: 366, height: 336, gap: 0 }, EIGHT)
    expect(geo).toMatchObject({ plan: 'tree', grid: 25, s: 1 })
  })

  it('a wide, tall desktop stage: bigger pixels, the same ship for every value, 18 px digits', () => {
    const geo = spaceshipLayout({ width: 1100, height: 700, gap: 0 }, SIX)
    expect(geo).toMatchObject({ plan: 'tree', grid: 25, font: 18 })
    expect(geo.s).toBeGreaterThan(1)
  })

  it('a short stage zooms to two rows with no trails: the digit takes the room, to 17 px', () => {
    const geo = spaceshipLayout({ width: 479, height: 88, gap: 0 }, SIX)
    expect(geo).toMatchObject({ plan: 'zoom', beside: false, trailMax: 0, grid: 15, font: 17 })
    expect(SIX.map(geo.trail)).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('a very short zoom (479 × 53): the plate beside the ship, 16 px, no trails', () => {
    const geo = spaceshipLayout({ width: 479, height: 53, gap: 0 }, SIX)
    expect(geo).toMatchObject({ plan: 'zoom', beside: true, s: 1, font: 16, trailMax: 0 })
  })

  it('beside the ships when that gives a bigger digit (479 × 69: 16 px, not 14 under)', () => {
    const geo = spaceshipLayout({ width: 479, height: 69, gap: 0 }, SIX)
    expect(geo).toMatchObject({ plan: 'zoom', beside: true, font: 16 })
  })

  it('12 values on the 740 × 300 zoom (479 × 49): 14 px, never under 13', () => {
    const geo = spaceshipLayout({ width: 479, height: 49, gap: 0 }, TWELVE)
    expect(geo).toMatchObject({ plan: 'zoom', font: 14 })
  })

  it('every value flies the same fighter, from the family', () => {
    for (const box of [
      { width: 366, height: 336 },
      { width: 479, height: 88 },
      { width: 678, height: 125 },
    ]) {
      const geo = spaceshipLayout({ ...box, gap: 0 }, TWELVE)
      expect(FIGHTER_GRIDS).toContain(geo.grid)
      expect(geo.side).toBe(geo.grid * geo.s)
    }
  })

  it.each([
    ['5 2 8 1 9 3', SIX],
    ['1 2 3 5 8 9 15 22', EIGHT],
    ['12 numbers', TWELVE],
  ] as const)('%s: a larger value has a trail as long or longer, proportional', (_, input) => {
    const geo = spaceshipLayout({ width: 366, height: 336, gap: 0 }, input)
    expect(geo.plan).toBe('tree')
    const sorted = [...input].sort((a, b) => a - b)
    for (let k = 1; k < sorted.length; k++) {
      expect(geo.trail(sorted[k] ?? 0)).toBeGreaterThanOrEqual(geo.trail(sorted[k - 1] ?? 0))
    }
    const largest = Math.max(...input)
    expect(geo.trail(largest)).toBe(geo.trailMax)
    // Proportional to the largest (to the pixel), never under a 2-unit puff.
    for (const v of input) {
      const exact = (geo.trailMax * v) / largest
      expect(geo.trail(v)).toBeGreaterThanOrEqual(Math.min(2 * geo.s, geo.trailMax))
      if (exact > 2 * geo.s) expect(Math.abs(geo.trail(v) - exact)).toBeLessThanOrEqual(geo.s)
    }
  })

  it('on 5 2 8 1 9 3, every value’s trail is a different length', () => {
    const geo = spaceshipLayout({ width: 366, height: 336, gap: 0 }, SIX)
    expect(new Set(SIX.map(geo.trail)).size).toBe(6)
  })
})

/** Realistic fields: phones (portrait, landscape, larger text), desktops, and the zoom. */
const FIELDS = [
  { width: 366, height: 336 },
  { width: 366, height: 382 },
  { width: 366, height: 246 },
  { width: 342, height: 300 },
  { width: 479, height: 88 },
  { width: 479, height: 53 },
  { width: 479, height: 40 },
  { width: 678, height: 125 },
  { width: 698, height: 291 },
  { width: 1100, height: 700 },
]

/** The phones' and desktops' fields, where the tree fits with 16 px digits. */
const TREE_FIELDS = [
  ['the phone, 366 × 336', { width: 366, height: 336 }],
  ['the phone at a compare, 366 × 315', { width: 366, height: 315 }],
  ['the phone, 366 × 382', { width: 366, height: 382 }],
  ['a desktop, 1100 × 700', { width: 1100, height: 700 }],
] as const

/** What a ship covers in row r and column c: its ring (lifted), its trail, and its plate. */
function boxes(geo: SpaceshipLayout, value: number, column: number, row: number) {
  const [x, y] = shipAt(geo, column, row, true)
  const ring = RING * geo.s
  const plate = plateAt(geo, value, column, row)
  const [, rest] = shipAt(geo, column, row)
  return {
    ring: {
      top: y - ring,
      bottom: y + geo.side + ring,
      left: x - ring,
      right: x + geo.side + ring,
    },
    trailBottom: rest + geo.side + geo.trail(value),
    plate: {
      top: plate.y,
      bottom: plate.y + plate.height,
      left: plate.x,
      right: plate.x + plate.width,
    },
  }
}

describe('nothing crosses rows, and the digits stay inside the stage', () => {
  it.each(
    FIELDS.flatMap((f) =>
      [SIX, EIGHT, TWELVE].map(
        (v) =>
          [`${String(f.width)} × ${String(f.height)}, ${String(v.length)} values`, f, v] as const,
      ),
    ),
  )('%s', (_, field, input) => {
    const geo = spaceshipLayout({ ...field, gap: 0 }, input)
    for (let row = 0; row < geo.rows; row++) {
      const top = geo.rowTop(row)
      const bottom = geo.floor(row)
      for (let column = 0; column < input.length; column++) {
        for (const value of input) {
          const b = boxes(geo, value, column, row)
          // A lead lifted, with its ring, stays under the gate's bar at its row's top.
          expect(b.ring.top).toBeGreaterThanOrEqual(top + (HEADROOM - LIFT - RING) * geo.s)
          expect(b.trailBottom).toBeLessThanOrEqual(bottom)
          expect(b.plate.bottom).toBeLessThanOrEqual(bottom)
          expect(b.plate.top).toBeGreaterThanOrEqual(top)
          // The digit: inside the stage, and at least 13 px.
          expect(b.plate.left).toBeGreaterThanOrEqual(0)
          expect(b.plate.right).toBeLessThanOrEqual(geo.width)
          expect(geo.font).toBeGreaterThanOrEqual(MIN_FONT)
        }
      }
    }
    // The rows fit the field.
    expect(geo.rowTop(geo.rows - 1) + geo.rowH).toBeLessThanOrEqual(geo.height)
    // The tree's trails; the zoom has none.
    if (geo.plan === 'zoom') expect(geo.trailMax).toBe(0)
    else expect(geo.trailMax).toBeGreaterThanOrEqual(geo.side)
  })

  it.each(TREE_FIELDS)('%s: digits of 16 px or more on the tree', (_, field) => {
    for (const input of [SIX, EIGHT, TWELVE]) {
      const geo = spaceshipLayout({ ...field, gap: 0 }, input)
      expect(geo.plan).toBe('tree')
      expect(geo.font).toBeGreaterThanOrEqual(TREE_FONT)
    }
  })
})

describe('sizes that never change between steps', () => {
  /** Measures the heights in turn at one width; the size height after each. */
  const sizesFor = (heights: readonly number[]) => {
    let memory: SizeMemory | null = null
    return heights.map((height) => {
      const next = stableHeight(memory, 366, height)
      memory = next.memory
      return next.sizeHeight
    })
  }

  it('come from the shortest the field has been at this width', () => {
    expect(sizesFor([336, 314, 336])).toEqual([336, 314, 314])
  })

  it('ignore a field under half the tallest (the strip beside an open sheet)', () => {
    expect(sizesFor([72, 336, 72, 330])).toEqual([72, 336, 72, 330])
  })

  it('start afresh at a new width', () => {
    const { memory } = stableHeight(null, 366, 300)
    expect(stableHeight(memory, 500, 340).sizeHeight).toBe(340)
  })

  it('size the ship and the trails from that height, while the rows fill the field', () => {
    const tall = spaceshipLayout({ width: 366, height: 382, gap: 0 }, SIX)
    const sized = spaceshipLayout({ width: 366, height: 382, gap: 0 }, SIX, 336)
    expect(sized.rowH).toBe(tall.rowH)
    expect(sized.trailMax).toBeLessThan(tall.trailMax)
  })
})

describe('the bars’ columns, the ship, its plate, the gate and the brackets', () => {
  const geo = spaceshipLayout({ width: 366, height: 336, gap: 0 }, SIX)

  it('centers on the grid; the pitch is the column plus the gap', () => {
    const gapped = spaceshipLayout({ width: 366, height: 336, gap: 14 }, SIX)
    expect(gapped.colW).toBeCloseTo((366 - 5 * 14) / 6)
    expect(gapped.pitch).toBeCloseTo(gapped.colW + 14)
    expect(gapped.center(0)).toBeCloseTo(gapped.colW / 2)
  })

  it('a ship centered on its column at the top of its row; a lead lifted 2 units', () => {
    const [x, y] = shipAt(geo, 4, 1)
    expect(x).toBe(Math.round(geo.center(4) - geo.side / 2) + geo.shift)
    expect(geo.shift).toBe(0)
    expect(y).toBe(geo.rowTop(1) + HEADROOM * geo.s)
    expect(shipAt(geo, 4, 1, true)[1]).toBe(y - LIFT * geo.s)
  })

  it('the digit’s plate at the end of the trail, centered on the column', () => {
    const plate = plateAt(geo, 8, 2, 0)
    const [, y] = shipAt(geo, 2, 0)
    expect(plate.y).toBe(y + geo.side + geo.trail(8) + 1)
    expect(Math.abs(plate.x + plate.width / 2 - geo.center(2))).toBeLessThanOrEqual(1)
  })

  it('the gate over [lo, hi) across the top of the halves’ row, posts 3 units above', () => {
    const { bar, posts } = gateAt(geo, 0, 3, 1)
    expect(bar).toMatchObject({ y: geo.rowTop(1), height: 2 * geo.s })
    expect(posts).toHaveLength(2)
    expect(posts[0]).toMatchObject({ x: bar.x, y: bar.y - 3 * geo.s })
  })

  it('a squadron’s bracket on its row’s bottom line, 0.08 of a column inside each end', () => {
    const bracket = bracketAt(geo, 3, 5, 2)
    expect(bracket.y).toBe(geo.floor(2))
    expect(bracket.x).toBe(Math.round(3 * geo.pitch + 0.08 * geo.pitch))
  })
})
