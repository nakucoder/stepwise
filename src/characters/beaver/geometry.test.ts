import { describe, expect, it } from 'vitest'
import { stageNodeAt } from '../../components/heapTree'
import { BEAVER_LOGS, beaverLayout, damLayout, MAX_COUNT } from './geometry'
import { BEAVER_PAWS, BEAVER_W } from './sprites'

/**
 * The spec's table (design/mockups/builder-beaver/README.md, "Layout per screen"): each stage's
 * field with 12 numbers, its column gap, and what the beaver, one log, a stack and the number come
 * to. With 6 numbers only the stacks get wider.
 */
const SCREENS = [
  // Desktop, the dam beside the stacks: 3x beaver, 14 px logs (the height decides), 26 / 44 px stacks.
  {
    name: 'desktop',
    box: { width: 436, height: 253, gap: 8 },
    s: 3,
    log: 14,
    w: [26, 44],
    font: 15,
  },
  // Phone upright, under the dam.
  {
    name: 'upright',
    box: { width: 366, height: 156, gap: 8 },
    s: 2,
    log: 8,
    w: [21, 44],
    font: 13,
  },
  // Phone on its side, 844 × 390 at 100%: Watch, then Do it.
  {
    name: 'side Watch',
    box: { width: 612, height: 159, gap: 8 },
    s: 2,
    log: 8,
    w: [39, 44],
    font: 16,
  },
  {
    name: 'side Do it',
    box: { width: 612, height: 131, gap: 8 },
    s: 2,
    log: 6,
    w: [39, 44],
    font: 16,
  },
  // The tightest, 740 × 300 at 130%, option A: 76 px.
  {
    name: 'tightest',
    box: { width: 468, height: 76, gap: 10.4 },
    s: 1,
    log: 3,
    w: [27, 44],
    font: 12,
  },
] as const

/** The gap between columns for `count` numbers: clamp(0.25rem, 6rem / count, 0.875rem). */
const gapFor = (rem: number, count: number) =>
  Math.min(0.875 * rem, Math.max(0.25 * rem, (6 * rem) / count))

describe('the beaver’s sizes per screen (the spec’s table)', () => {
  it.each(SCREENS)('$name: beaver $s×, $log px logs, the number $font px', (screen) => {
    const geo = beaverLayout(screen.box, 12)
    expect(geo.s).toBe(screen.s)
    expect(geo.logPx).toBe(screen.log)
    expect(geo.stackW).toBe(screen.w[0])
    expect(geo.font).toBe(screen.font)
    expect(geo.plate).toBe(screen.font + 2)
    // The lane holds the beaver, its curb under the stacks; a carried stack is lifted 2s.
    expect(geo.lane).toBe(16 * screen.s + 2)
    expect(geo.laneTop).toBe(screen.box.height - geo.lane)
    expect(geo.lift).toBe(2 * screen.s)
    // A stack of 12, its closing line, its plate and its lift fit over the lane.
    expect(geo.heightOf(12) + geo.plate + geo.lift + geo.lane).toBeLessThanOrEqual(
      screen.box.height,
    )
  })

  it.each(SCREENS)('$name: with 6 numbers only the stacks get wider', (screen) => {
    const rem = screen.box.gap / 0.5
    const twelve = beaverLayout(screen.box, 12)
    const six = beaverLayout({ ...screen.box, gap: gapFor(rem, 6) }, 6)
    expect(six.stackW).toBe(screen.w[1])
    expect([six.s, six.logPx, six.font]).toEqual([twelve.s, twelve.logPx, twelve.font])
  })

  it.each([
    // [field, its log, a stack of 12's share of the field, the beaver's scale] at 1440x900,
    // 1920x1080, 2560x1440, Explorer (as measured on the page).
    [{ width: 436, height: 305, gap: 8 }, 16, 0.63, 3],
    [{ width: 916, height: 477, gap: 8 }, 30, 0.75, 5],
    [{ width: 1556, height: 837, gap: 8 }, 54, 0.77, 9],
  ] as const)(
    'on a big desktop a stack of 12 fills most of the field (%j)',
    (box, log, share, s) => {
      const geo = beaverLayout(box, 12)
      expect(geo.logPx).toBe(log)
      // The beaver grows with the logs, in whole screen pixels, about BEAVER_LOGS logs tall.
      expect(geo.s).toBe(s)
      if (s > 3) expect(geo.beaverH).toBeLessThanOrEqual(BEAVER_LOGS * geo.logPx)
      expect(geo.heightOf(12) / box.height).toBeGreaterThanOrEqual(share - 0.01)
      // A log stays well wider than tall: about 0.6 of its stack’s width at most.
      expect(geo.logPx).toBeLessThanOrEqual(geo.stackW * 0.62)
      // Fewer numbers: the same logs, wider stacks.
      expect(beaverLayout({ ...box, gap: 14 }, 6).logPx).toBe(log)
    },
  )

  it('holds a log back by the grid of 12’s width on a tall, narrow stage', () => {
    const geo = beaverLayout({ width: 436, height: 900, gap: 8 }, 12)
    expect(geo.logPx).toBe(Math.floor(((436 + 8) / 12) * 0.45))
  })

  it('never sizes from the numbers: one log per count', () => {
    const geo = beaverLayout({ width: 612, height: 159, gap: 8 }, 12)
    expect(geo.heightOf(1)).toBe(geo.logPx + 1)
    expect(geo.heightOf(7)).toBe(7 * geo.logPx + 1)
    expect(geo.heightOf(MAX_COUNT)).toBe(12 * geo.logPx + 1)
    expect(geo.heightOf(0)).toBe(0)
  })

  it('sizes from the height it is given (the run’s shortest, or a phone’s floor), not the field’s', () => {
    const box = { width: 366, height: 201, gap: 8 }
    expect(beaverLayout(box, 12).logPx).toBe(12)
    expect(beaverLayout(box, 12, 140).logPx).toBe(7)
    // A sheet beside the field (a phone on its side) doesn't change a size.
    const narrow = { width: 400, height: 159, gap: 8 }
    expect(beaverLayout(narrow, 12, 159, 612).s).toBe(beaverLayout({ ...narrow, width: 612 }, 12).s)
  })

  it('stands the beaver with its paws under its column, only its tail ever past the edge', () => {
    const geo = beaverLayout({ width: 436, height: 253, gap: 8 }, 12)
    const middle = 5
    expect(geo.beaverX(middle) + BEAVER_PAWS * geo.s).toBeCloseTo(geo.cx(middle))
    expect(geo.beaverX(middle, true) + (BEAVER_W - BEAVER_PAWS) * geo.s).toBeCloseTo(geo.cx(middle))
    expect(geo.beaverX(0)).toBeGreaterThanOrEqual(-10 * geo.s)
    expect(geo.beaverX(11, true) + geo.beaverW).toBeLessThanOrEqual(geo.width + 10 * geo.s)
    expect(geo.beaverX(11) + geo.beaverW).toBeLessThanOrEqual(geo.width)
  })
})

describe('the dam', () => {
  it('beside the stacks on a desktop: 28 px log ends for 12, standing on the ground', () => {
    const dam = damLayout({ width: 250, height: 203 }, 12, 'beside')
    expect(dam.d).toBe(28)
    // The bottom row rests on the ground, every row a little closer than a log's size.
    expect(dam.at(7).y + dam.d / 2 + 6).toBeCloseTo(203)
    expect(dam.at(1).y - dam.at(0).y).toBeCloseTo(dam.d * 1.15)
    expect(dam.at(0).x).toBe(125)
  })

  it('over the band on an upright phone: 33 px log ends, each where the site’s tree puts it', () => {
    const dam = damLayout({ width: 366, height: 148 }, 12, 'over')
    expect(dam.d).toBe(33)
    for (let k = 0; k < 12; k++) {
      const site = stageNodeAt(k, 12)
      expect(dam.at(k).x).toBeCloseTo(site.x * 366)
      expect(dam.at(k).y).toBeCloseTo(site.y * 148)
    }
  })

  it('puts its numbers right on the wood, about 0.42 of a log end', () => {
    expect(damLayout({ width: 250, height: 203 }, 12, 'beside').font).toBe(12)
  })
})

describe('the dam beside the stacks', () => {
  // [the split's width, band top to field bottom, the field's measured size] as on the page.
  const DESKTOPS = [
    ['1440x900', 698, 320, { width: 472, height: 295, gap: 8 }, 18, 24],
    ['1920x1080', 1178, 502, { width: 872, height: 477, gap: 8 }, 30, 30],
    ['2560x1440', 1818, 862, { width: 1352, height: 837, gap: 8 }, 51, 51],
  ] as const

  it.each(DESKTOPS)(
    '%s: its log ends the size of the logs (24 px at least), its column holding eight across',
    (_, total, height, box, log, d) => {
      const geo = beaverLayout(box, 12, box.height, box.width, { total, height })
      expect(geo.logPx).toBe(log)
      expect(geo.dam).toEqual({ width: Math.ceil((8 * d) / 0.9), d })
      // The stacks left beside it keep logs well wider than tall (about 0.6 of their width).
      expect(geo.logPx).toBeLessThanOrEqual(geo.stackW * 0.65)
    },
  )

  it('never changes with the run’s count or the dam’s own width (the split decides)', () => {
    const [, total, height, box] = DESKTOPS[1]
    const twelve = beaverLayout(box, 12, box.height, box.width, { total, height })
    const six = beaverLayout({ ...box, width: 600, gap: 14 }, 6, box.height, 600, {
      total,
      height,
    })
    expect([six.logPx, six.s, six.dam]).toEqual([twelve.logPx, twelve.s, twelve.dam])
  })

  it('fits on a phone on its side where four rows of 24 px log ends do, else goes to the sheet', () => {
    // 844x390: Watch and Do it fit; the tightest (740x300 at 130%) doesn't.
    const watch = beaverLayout({ width: 386, height: 159, gap: 8 }, 12, 159, 386, {
      total: 612,
      height: 179,
    })
    expect(watch.dam).toEqual({ width: 214, d: 24 })
    expect(watch.logPx).toBe(8)
    const doIt = beaverLayout({ width: 386, height: 131, gap: 8 }, 12, 131, 386, {
      total: 612,
      height: 151,
    })
    expect(doIt.dam?.d).toBe(24)
    expect(doIt.logPx).toBe(6)
    const tightest = beaverLayout({ width: 468, height: 77, gap: 10.4 }, 12, 77, 468, {
      total: 468,
      height: 90,
    })
    expect(tightest.dam).toBeNull()
    expect(tightest.logPx).toBe(3)
  })

  it('stands the pyramid centred in its column, its rows spread from under its name to the ground', () => {
    const dam = damLayout({ width: 300, height: 200 }, 12, 'beside', 30, 20)
    expect(dam.d).toBe(30)
    expect(dam.at(0).x).toBeCloseTo(150)
    expect(dam.at(7).x - dam.at(8).x).toBeCloseTo(-30 / 0.9)
    // The top log just under the name, the foot on the ground, the rows evenly apart.
    expect(dam.at(0).y - 15).toBeCloseTo(21)
    expect(dam.at(7).y + 15 + 6).toBeCloseTo(200)
    expect(dam.at(3).y - dam.at(1).y).toBeCloseTo(dam.at(1).y - dam.at(0).y)
    // A short run's pyramid is as wide and as tall: its lowest row on the ground, as spread as
    // that row of a full one.
    const short = damLayout({ width: 300, height: 200 }, 5, 'beside', 30, 20)
    expect([short.at(0).y, short.at(3).x, short.at(3).y]).toEqual([
      dam.at(0).y,
      dam.at(3).x,
      dam.at(7).y,
    ])
  })

  it('in a sheet, each log end rests on the two under it', () => {
    const dam = damLayout({ width: 300, height: 200 }, 12, 'beside')
    expect(dam.at(7).y - dam.at(3).y).toBeCloseTo(dam.d * 1.15)
  })
})
