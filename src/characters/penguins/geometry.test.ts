import { describe, expect, it } from 'vitest'
import {
  GROUND,
  HOP,
  LANE,
  MARGIN,
  minTowerHeight,
  mortar,
  numberFont,
  penguinLayout,
  penguinScale,
  SLED,
  TOP_ROOM,
  towerShare,
} from './geometry'
import {
  FLAP_PATHS,
  PENGUIN,
  PENGUIN_FLAP,
  PENGUIN_H,
  PENGUIN_SLIDE,
  PENGUIN_W,
  rimPath,
  SLIDE_H,
  SLIDE_PATHS,
  SLIDE_W,
  STANDING_PATHS,
} from './sprites'

describe('penguin sprites', () => {
  it('are the spec’s sizes: standing and flippers up 12 × 14, the belly slide 16 × 8', () => {
    for (const rows of [PENGUIN, PENGUIN_FLAP]) {
      expect(rows).toHaveLength(PENGUIN_H)
      for (const row of rows) expect(row).toHaveLength(PENGUIN_W)
    }
    expect(PENGUIN_SLIDE).toHaveLength(SLIDE_H)
    for (const row of PENGUIN_SLIDE) expect(row).toHaveLength(SLIDE_W)
  })

  it('standing and flippers up are exactly symmetric, so they center to the pixel', () => {
    for (const rows of [PENGUIN, PENGUIN_FLAP]) {
      for (const row of rows)
        expect(Array.from(row, (_, x) => row.charAt(row.length - 1 - x)).join('')).toBe(row)
    }
  })

  it('use only the spec’s codes: no yellow anywhere', () => {
    for (const rows of [PENGUIN, PENGUIN_FLAP, PENGUIN_SLIDE]) {
      for (const row of rows) expect(row).toMatch(/^[.okwbfe]+$/)
    }
  })

  it('every sprite has each part', () => {
    for (const paths of [STANDING_PATHS, FLAP_PATHS, SLIDE_PATHS]) {
      for (const d of [
        paths.rim,
        paths.outline,
        paths.back,
        paths.belly,
        paths.orange,
        paths.eye,
      ]) {
        expect(d).not.toBe('')
      }
    }
  })

  it('the rim is the empty pixels touching the sprite on any side, outside the grid too', () => {
    expect(rimPath(['o'])).toBe('M0 -1h1v1h-1zM-1 0h1v1h-1zM1 0h1v1h-1zM0 1h1v1h-1z')
    // Diagonal neighbors are not rim.
    expect(rimPath(['o.', '..'])).not.toContain('M1 1h1')
    expect(rimPath([])).toBe('')
  })
})

describe('penguin geometry', () => {
  it('the sprite scale: min(h / 144, pitch / 32), rounded, 1 to 3', () => {
    expect(penguinScale(55, 80)).toBe(1)
    expect(penguinScale(300, 57)).toBe(2)
    expect(penguinScale(450, 166)).toBe(3)
    expect(penguinScale(2000, 2000)).toBe(3)
    expect(penguinScale(10, 5)).toBe(1)
  })

  it('heights follow the crates’ rule: 10 + 9 × value of 132, the tallest 69%', () => {
    expect(towerShare(1, 9)).toBeCloseTo(19 / 132)
    expect(towerShare(9, 9)).toBeCloseTo(91 / 132)
    expect(towerShare(9, 3)).toBeCloseTo(91 / 132)
    expect(towerShare(20, 20)).toBeCloseTo(91 / 132)
  })

  it('a tower is never shorter than its number needs', () => {
    expect(numberFont(1)).toBe(10)
    expect(numberFont(2)).toBe(18)
    expect(minTowerHeight(1)).toBe(15)
    const geo = penguinLayout({ width: 479, height: 55, gap: 0 }, [1, 9])
    expect(geo.heightOf(1)).toBe(minTowerHeight(geo.s))
  })

  it('without a gap, slots are the spec’s: centers round(pitch × (k + 0.5)), towers 72%', () => {
    const geo = penguinLayout({ width: 390, height: 300, gap: 0 }, [5, 2, 8, 1, 9, 3])
    expect(geo.pitch).toBe(65)
    expect(geo.s).toBe(2)
    expect([0, 1, 5].map(geo.center)).toEqual([33, 98, 358])
    expect(geo.towerW).toBe(Math.round(Math.min(65 - 4, 65 * 0.72)))
    expect(geo.floorY).toBe(300 - 11 * 2)
    expect(geo.laneBase).toBe(300 - 2)
    expect(geo.sledTop).toBe(300 - 2 - SLED * 2)
  })

  it('with the bars’ gap, a slot is centered on its column', () => {
    const geo = penguinLayout({ width: 342, height: 300, gap: 10 }, [5, 2, 8, 1, 9, 3])
    const colW = (342 - 50) / 6
    expect(geo.center(2)).toBe(Math.round(2 * (colW + 10) + colW / 2))
    expect(geo.towerW).toBeLessThanOrEqual(colW)
  })

  it('every penguin is centered on its tower to the pixel, standing or lying', () => {
    const geo = penguinLayout({ width: 390, height: 300, gap: 0 }, [5, 2, 8, 1, 9, 3])
    for (let k = 0; k < 6; k++) {
      expect(geo.towerX(k) + geo.standAt[0] + (PENGUIN_W / 2) * geo.s).toBe(geo.center(k))
      expect(geo.towerX(k) + geo.lieAt[0] + (SLIDE_W / 2) * geo.s).toBe(geo.center(k))
    }
    expect(geo.standAt[1]).toBe(-PENGUIN_H * geo.s)
    expect(geo.lieAt[1]).toBe(-SLIDE_H * geo.s)
  })

  it('brick mortar: a line every 6 units, joints at the middle and the quarter in turn', () => {
    const { lines, joints } = mortar(40, 40, 2)
    expect(lines).toEqual([12, 24, 36])
    expect(joints).toEqual([
      [20, 2],
      [10, 14],
      [20, 26],
    ])
  })

  // The tightest stage: a phone on its side at 130% text (Watch 479 × 55, Do it 479 × 90), and
  // the phones' portrait and landscape fields.
  it.each([
    [479, 55],
    [479, 90],
    [342, 300],
    [744, 160],
    [1000, 450],
  ])('everything fits a %i × %i field, at rest, waiting, hopping and lying', (width, height) => {
    for (const values of [
      [5, 2, 8, 1, 9, 3],
      [1, 1],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 9, 8, 7],
      [42, 7, 99, 1],
    ]) {
      const geo = penguinLayout({ width, height, gap: 0 }, values)
      const { s } = geo
      expect(geo.laneBase + MARGIN * s).toBe(height)
      expect(geo.floorY).toBe(height - (MARGIN + LANE + GROUND) * s)
      for (const value of values) {
        const h = geo.heightOf(value)
        // In the line, its penguin on top, hopping.
        expect(geo.floorY - h - TOP_ROOM * s + 2 * s - HOP * s).toBeGreaterThanOrEqual(0)
        // Waiting on its sled in the lane, its penguin on top.
        expect(geo.sledTop - h - PENGUIN_H * s).toBeGreaterThanOrEqual(0)
      }
      // Across: the first and last towers, and the lying penguin (the widest sprite).
      expect(geo.towerX(0)).toBeGreaterThanOrEqual(0)
      expect(geo.towerX(values.length - 1) + geo.towerW).toBeLessThanOrEqual(width)
      expect(geo.towerX(0) + geo.lieAt[0]).toBeGreaterThanOrEqual(0)
      expect(geo.towerX(values.length - 1) + geo.lieAt[0] + SLIDE_W * s).toBeLessThanOrEqual(width)
      // The sled's runner sticks out 2 units each side of its tower.
      expect(geo.towerX(0) - 2 * s).toBeGreaterThanOrEqual(0)
      expect(geo.towerX(values.length - 1) + geo.towerW + 2 * s).toBeLessThanOrEqual(width)
    }
  })
})
