import { describe, expect, it } from 'vitest'
import { FIGHTER_GRIDS, FIGHTERS, fighterPaths, fighterRows, LARGEST_GRID } from './sprites'

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
    expect(LARGEST_GRID).toBe(25)
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
