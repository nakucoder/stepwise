/**
 * The spaceships' fighter (design/mockups/spaceships/README.md, "Sprites"): one rule for any odd
 * grid size g, so every size is whole-pixel pixel art. It faces up. Codes: `o` outline, `h`
 * hull, `a` wing stripe, `r` engine glow, `.` empty.
 */
import { spritePath } from '../pixel'

/** The fighter's rows for an odd grid size g (at least 9). */
export function fighterRows(g: number): string[] {
  const half = (g - 1) / 2
  // Nose and wings: row y is filled from half − min(y, half) to half + min(y, half), for rows
  // 0 to g − 3; row g − 2 is the base, so the body's last row has the base under it.
  const filled = (x: number, y: number): boolean => {
    if (x < 0 || x >= g || y < 0) return false
    if (y === g - 2) return true
    if (y > g - 2) return false
    const reach = Math.min(y, half)
    return x >= half - reach && x <= half + reach
  }
  const rows: string[] = []
  for (let y = 0; y <= g - 3; y++) {
    let row = ''
    for (let x = 0; x < g; x++) {
      if (!filled(x, y)) {
        row += '.'
        continue
      }
      const edge =
        x === 0 ||
        x === g - 1 ||
        y === 0 ||
        !filled(x - 1, y) ||
        !filled(x + 1, y) ||
        !filled(x, y - 1) ||
        !filled(x, y + 1)
      // The wing stripe, on row half + 1, just inside each wing tip.
      const stripe = y === half + 1 && (x === 1 || x === g - 2)
      row += stripe ? 'a' : edge ? 'o' : 'h'
    }
    rows.push(row)
  }
  // The base: all outline, but two nozzle gaps; the glow under the nozzles.
  rows.push(
    Array.from({ length: g }, (_, x) => (x === 2 || x === g - 3 ? '.' : 'o')).join(''),
    Array.from({ length: g }, (_, x) => (x === 2 || x === g - 3 ? 'r' : '.')).join(''),
  )
  return rows
}

export interface FighterPaths {
  readonly outline: string
  readonly hull: string
  readonly wing: string
  readonly glow: string
  /** The glow while the ship flies: twice as long, one more pixel under each nozzle. */
  readonly glowLong: string
}

const cache = new Map<number, FighterPaths>()

/** The fighter's SVG paths for grid size g, in sprite pixels (scale them by p). */
export function fighterPaths(g: number): FighterPaths {
  let paths = cache.get(g)
  if (!paths) {
    const rows = fighterRows(g)
    const long = [...rows, rows[g - 1] ?? '']
    paths = {
      outline: spritePath(rows, 'o'),
      hull: spritePath(rows, 'h'),
      wing: spritePath(rows, 'a'),
      glow: spritePath(rows, 'r'),
      glowLong: spritePath(long, 'r'),
    }
    cache.set(g, paths)
  }
  return paths
}
