import { describe, expect, it } from 'vitest'
import { fighterPaths, fighterRows } from './sprites'

// design/mockups/spaceships/README.md, "The fighter": g = 9 and g = 13, exactly.
const G9 = [
  '....o....',
  '...oho...',
  '..ohhho..',
  '.ohhhhho.',
  'ohhhhhhho',
  'oahhhhhao',
  'ohhhhhhho',
  'oo.ooo.oo',
  '..r...r..',
]

const G13 = [
  '......o......',
  '.....oho.....',
  '....ohhho....',
  '...ohhhhho...',
  '..ohhhhhhho..',
  '.ohhhhhhhhho.',
  'ohhhhhhhhhhho',
  'oahhhhhhhhhao',
  'ohhhhhhhhhhho',
  'ohhhhhhhhhhho',
  'ohhhhhhhhhhho',
  'oo.ooooooo.oo',
  '..r.......r..',
]

describe('the fighter', () => {
  it('is the spec’s grid at g = 9 and g = 13', () => {
    expect(fighterRows(9)).toEqual(G9)
    expect(fighterRows(13)).toEqual(G13)
  })

  it.each([9, 11, 13, 15, 25, 37])('g = %i: a square, symmetric grid by the same rule', (g) => {
    const rows = fighterRows(g)
    const half = (g - 1) / 2
    expect(rows).toHaveLength(g)
    for (const row of rows) {
      expect(row).toHaveLength(g)
      expect(row).toBe(
        Array.from({ length: row.length }, (_, x) => row.charAt(row.length - 1 - x)).join(''),
      )
    }
    // A 45° nose: the tip alone on top, full width from row half down to the base.
    expect(rows[0]).toBe(`${'.'.repeat(half)}o${'.'.repeat(half)}`)
    expect(rows[half]?.includes('.')).toBe(false)
    // The stripe on row half + 1, just inside each wing tip.
    expect(rows[half + 1]?.slice(0, 2)).toBe('oa')
    // The base with its two nozzles, and the glow under them.
    expect(rows[g - 2]?.[2]).toBe('.')
    expect(rows[g - 1]?.replace(/\./g, '')).toBe('rr')
    expect(rows[g - 1]?.indexOf('r')).toBe(2)
  })

  it('has paths for each color, and a glow twice as long in flight', () => {
    const paths = fighterPaths(9)
    expect(paths.outline).toContain('M4 0h1v1h-1z')
    expect(paths.wing).toBe('M1 5h1v1h-1zM7 5h1v1h-1z')
    expect(paths.glow).toBe('M2 8h1v1h-1zM6 8h1v1h-1z')
    expect(paths.glowLong).toBe('M2 8h1v1h-1zM6 8h1v1h-1zM2 9h1v1h-1zM6 9h1v1h-1z')
    expect(fighterPaths(9)).toBe(paths)
  })
})
