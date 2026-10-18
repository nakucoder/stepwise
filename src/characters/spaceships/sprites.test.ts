import { describe, expect, it } from 'vitest'
import {
  bankRows,
  boostRects,
  FIGHTER_GRIDS,
  FIGHTERS,
  FIGHTERS_BANK_RIGHT,
  fighterPaths,
  fighterRows,
  trailRects,
} from './sprites'

const CODES = new Set(['o', 'h', 'w', 'd', 'c', 'a', 'r', '.'])
/** The colored inside of a ship: everything but the outline, the glow and empty space. */
const INSIDE = new Set(['h', 'w', 'd', 'c', 'a'])
const filled = (rows: readonly string[]) =>
  rows.reduce((n, row) => n + row.replace(/\./g, '').length, 0)
const count = (rows: readonly string[], code: string) =>
  rows.reduce((n, row) => n + row.split(code).length - 1, 0)

describe('the fighter family', () => {
  it('has a hand-drawn ship for every odd size from 9 × 9 to 25 × 25', () => {
    expect(FIGHTER_GRIDS).toEqual([9, 11, 13, 15, 17, 19, 21, 23, 25])
    expect(() => fighterRows(27)).toThrow()
  })

  it.each(FIGHTER_GRIDS)('%i: an exact square grid in the family’s codes', (g) => {
    const rows = fighterRows(g)
    expect(rows).toHaveLength(g)
    for (const row of rows) {
      expect(row).toHaveLength(g)
      for (let x = 0; x < row.length; x++) expect(CODES.has(row.charAt(x))).toBe(true)
    }
  })

  it.each(FIGHTER_GRIDS)(
    '%i × %i: symmetric, lit from the left (highlight left, shade right)',
    (g) => {
      for (const row of fighterRows(g)) {
        for (let x = 0; x < g; x++) {
          const left = row.charAt(x)
          const right = row.charAt(g - 1 - x)
          // The same shape both sides; a highlight on the left is a shade on the right.
          expect(left === '.').toBe(right === '.')
          if (left === 'w' && x < (g - 1) / 2) expect(right).toBe('d')
        }
      }
    },
  )

  it.each(FIGHTER_GRIDS)('%i: its outline is closed, so its size shows at a glance', (g) => {
    const rows = fighterRows(g)
    const at = (x: number, y: number) => rows[y]?.charAt(x) ?? '.'
    rows.forEach((row, y) => {
      for (let x = 0; x < g; x++) {
        if (!INSIDE.has(row.charAt(x))) continue
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          expect(at(x + dx, y + dy), `${String(g)}: (${String(x)}, ${String(y)})`).not.toBe('.')
        }
      }
    })
  })

  it.each(FIGHTER_GRIDS)('%i: a spaceship: nose, canopy, wing stripes, engines', (g) => {
    const rows = fighterRows(g)
    const centre = (g - 1) / 2
    // The nose tip, alone on top, centered.
    expect(rows[0]).toBe(`${'.'.repeat(centre)}o${'.'.repeat(centre)}`)
    expect(count(rows, 'c')).toBeGreaterThan(0)
    expect(count(rows, 'a')).toBeGreaterThanOrEqual(2)
    expect(count(rows, 'w')).toBeGreaterThan(0)
    expect(count(rows, 'd')).toBeGreaterThan(0)
    // The glow is the last row, and only there.
    expect(rows[g - 1]?.replace(/\./g, '')).toMatch(/^r+$/)
    expect(rows.slice(0, -1).some((row) => row.includes('r'))).toBe(false)
  })

  it('bigger is more detail: more pixels, and as many engines or more', () => {
    for (let k = 1; k < FIGHTER_GRIDS.length; k++) {
      const smaller = FIGHTERS[FIGHTER_GRIDS[k - 1] ?? 0] ?? []
      const bigger = FIGHTERS[FIGHTER_GRIDS[k] ?? 0] ?? []
      expect(filled(bigger)).toBeGreaterThan(filled(smaller))
      expect(count(bigger, 'r')).toBeGreaterThanOrEqual(count(smaller, 'r'))
    }
    // Scouts and fighters have two engines; heavy cruisers four.
    expect(count(fighterRows(9), 'r')).toBe(2)
    expect(count(fighterRows(25), 'r')).toBe(4)
  })

  it('has paths for each color, and a glow twice as long in flight', () => {
    const paths = fighterPaths(9)
    expect(paths.outline).toContain('M4 0h1v1h-1z')
    expect(paths.canopy).toBe('M4 2h1v1h-1z')
    expect(paths.glow).toBe('M3 8h1v1h-1zM5 8h1v1h-1z')
    expect(paths.glowLong).toBe('M3 8h1v1h-1zM5 8h1v1h-1zM3 9h1v1h-1zM5 9h1v1h-1z')
    expect(fighterPaths(9)).toBe(paths)
  })
})

describe('the engine trail', () => {
  /** Each engine's column (its glow) in a fighter's last row. */
  const engines = (g: number) => {
    const glow = fighterRows(g)[g - 1] ?? ''
    const xs: number[] = []
    for (let x = 0; x < glow.length; x++) if (glow.charAt(x) === 'r') xs.push(x)
    return xs
  }

  it.each(FIGHTER_GRIDS)('%i: under every engine, a flame as long as the trail', (g) => {
    for (const units of [3, 8, 20, 34]) {
      const rects = trailRects(g, units)
      for (const e of engines(g)) {
        const middle = rects.filter((r) => r.x === e && r.y < units)
        expect(middle.reduce((n, r) => n + r.h, 0)).toBe(units)
        // White at the nozzle, then orange, then red, top to bottom.
        const order = [...middle].sort((a, b) => a.y - b.y).map((r) => r.part)
        expect(order[0]).toBe('core')
        expect(order.at(-1)).toBe(units > 2 ? 'tip' : order.at(-1))
      }
    }
  })

  it.each(FIGHTER_GRIDS)(
    '%i: the sides are shorter (a taper), and every flame stays inside the fighter’s columns',
    (g) => {
      const units = 20
      const rects = trailRects(g, units)
      for (const e of engines(g)) {
        for (const dx of [-1, 1]) {
          // How far down the side column's flame reaches (two engines may share one).
          const side = Math.max(0, ...rects.filter((r) => r.x === e + dx).map((r) => r.y + r.h))
          expect(side).toBeGreaterThan(0)
          expect(side).toBeLessThan(units)
        }
      }
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(0)
        expect(r.x).toBeLessThan(g)
      }
    },
  )

  it('a longer trail for more units; none for none', () => {
    const lengthOf = (units: number) => Math.max(...trailRects(25, units).map((r) => r.y + r.h))
    expect(lengthOf(10)).toBeGreaterThan(lengthOf(5))
    expect(lengthOf(30)).toBeGreaterThan(lengthOf(10))
    expect(trailRects(25, 0)).toEqual([])
  })

  it('a spark one unit past the tip of every other flame', () => {
    const rects = trailRects(25, 10)
    const sparks = rects.filter((r) => r.y === 11)
    expect(sparks.map((r) => r.x)).toEqual([engines(25)[0], engines(25)[2]])
  })
})

describe('banking into a turn', () => {
  /** The leftmost and rightmost filled columns of a sprite. */
  const span = (rows: readonly string[]) => {
    const xs = rows.flatMap((row) => [...row.matchAll(/[^.]/g)].map((m) => m.index))
    return [Math.min(...xs), Math.max(...xs)] as const
  }

  it('every fighter in the family has a frame banking right', () => {
    expect(Object.keys(FIGHTERS_BANK_RIGHT).map(Number)).toEqual(FIGHTER_GRIDS)
    expect(() => bankRows(27, 'right')).toThrow()
  })

  it.each(FIGHTER_GRIDS)('%i: the same square grid and codes, whole pixels', (g) => {
    for (const bank of ['left', 'right'] as const) {
      const rows = bankRows(g, bank)
      expect(rows).toHaveLength(g)
      for (const row of rows) {
        expect(row).toHaveLength(g)
        for (let x = 0; x < row.length; x++) expect(CODES.has(row.charAt(x))).toBe(true)
      }
    }
  })

  it.each(FIGHTER_GRIDS)(
    '%i: banking right, the right wing pulls in (shorter) and the left keeps its span; the nose and the engines stay put',
    (g) => {
      const level = fighterRows(g)
      const right = bankRows(g, 'right')
      const [levelLeft, levelRight] = span(level)
      const [bankLeft, bankRight] = span(right)
      expect(bankLeft).toBe(levelLeft)
      expect(bankRight).toBeLessThan(levelRight)
      // The nose on the center column and the engines' row are the level ship's, so it stays
      // centered on its value and its trail hangs from the same place.
      expect(right[0]).toBe(level[0])
      expect(right[g - 1]).toBe(level[g - 1])
    },
  )

  it.each(FIGHTER_GRIDS)(
    '%i: the dipped wing in shade, and more light on the hull’s raised flank',
    (g) => {
      const right = bankRows(g, 'right')
      const level = fighterRows(g)
      // More shade than the level ship, and the light widens on the hull's left flank.
      expect(count(right, 'd')).toBeGreaterThan(count(level, 'd'))
      expect(count(right, 'w')).toBeGreaterThan(count(level, 'w'))
    },
  )

  it.each(FIGHTER_GRIDS)('%i: banking left is the mirror of banking right', (g) => {
    const right = bankRows(g, 'right')
    expect(bankRows(g, 'left')).toEqual(right.map((row) => row.split('').reverse().join('')))
  })

  it('has paths for each pose, kept apart', () => {
    expect(fighterPaths(25, 'right').outline).not.toBe(fighterPaths(25).outline)
    expect(fighterPaths(25, 'left').outline).not.toBe(fighterPaths(25, 'right').outline)
    expect(fighterPaths(25, 'right')).toBe(fighterPaths(25, 'right'))
  })
})

describe('the thrust burst', () => {
  const reach = (rects: readonly { y: number; h: number }[]) =>
    Math.max(0, ...rects.map((r) => r.y + r.h))
  const columns = (rects: readonly { x: number }[]) => new Set(rects.map((r) => r.x)).size
  const white = (rects: readonly { h: number; part: string }[]) =>
    rects.filter((r) => r.part === 'core').reduce((n, r) => n + r.h, 0)

  it.each(FIGHTER_GRIDS)(
    '%i: exactly as long as the trail, in both frames, so the value still reads',
    (g) => {
      for (const units of [1, 2, 3, 8, 20, 34]) {
        for (const frame of [0, 1] as const) {
          const rects = boostRects(g, units, frame)
          expect(reach(rects)).toBe(units)
          for (const r of rects) {
            expect(r.y).toBeGreaterThanOrEqual(0)
            expect(r.y + r.h).toBeLessThanOrEqual(units)
            expect(r.x).toBeGreaterThanOrEqual(0)
            expect(r.x).toBeLessThan(g)
          }
        }
      }
    },
  )

  it.each(FIGHTER_GRIDS)('%i: wider and brighter than the trail', (g) => {
    for (const units of [3, 8, 20]) {
      const trail = trailRects(g, units)
      for (const frame of [0, 1] as const) {
        const boost = boostRects(g, units, frame)
        expect(columns(boost)).toBeGreaterThan(columns(trail))
        expect(white(boost)).toBeGreaterThan(white(trail))
        // No red at the end of the middle column: it burns orange to the tip.
        expect(boost.filter((r) => r.part === 'tip').every((r) => r.y + r.h < units)).toBe(true)
      }
    }
  })

  it('two different frames to flicker between, red drawn first and white last', () => {
    const a = boostRects(25, 20, 0)
    const b = boostRects(25, 20, 1)
    expect(a).not.toEqual(b)
    const rank = { tip: 0, flame: 1, core: 2 } as const
    for (const rects of [a, b]) {
      const ranks = rects.map((r) => rank[r.part])
      expect(ranks).toEqual([...ranks].sort((x, y) => x - y))
    }
    expect(boostRects(25, 0, 0)).toEqual([])
  })
})
