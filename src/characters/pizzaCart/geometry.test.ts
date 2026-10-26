import { describe, expect, it } from 'vitest'
import { stableHeight } from '../pixel'
import { LID_FROM, MAX_BOX, MAX_COUNT, pizzaLayout } from './geometry'
import { wordFits } from './sprites'

/** The real stage fields with 12 numbers (design/mockups/pizza-cart/README.md). */
const STAGES = {
  side130: { width: 479, height: 60 },
  sideExplorer: { width: 479, height: 75 },
  side100: { width: 612, height: 140 },
  upright: { width: 366, height: 324 },
  desktop: { width: 698, height: 163 },
} as const

describe('pizzaLayout: the spec’s table', () => {
  it.each([
    // stage, one box, lid, stripes, "PIZZA", a 12 stands
    ['side130', 3, false, false, false, 36],
    ['sideExplorer', 4, false, false, false, 48],
    ['side100', 7, true, true, false, 84],
    ['upright', 12, true, true, true, 144],
    ['desktop', 8, true, true, true, 96],
  ] as const)('%s: %i px boxes', (stage, box, lid, stripes, word, twelve) => {
    const geo = pizzaLayout(STAGES[stage], 12)
    expect(geo.boxPx).toBe(box)
    expect(geo.lid > 0).toBe(lid)
    expect(!geo.plain).toBe(stripes)
    expect(wordFits(geo.stackW, geo.boxPx - 1)).toBe(word)
    expect(geo.heightOf(12)).toBe(twelve)
  })

  it('draws the cart at whole pixels, 1× on the sideways phones, never more than 3×', () => {
    expect(pizzaLayout(STAGES.side130, 12).s).toBe(1)
    expect(pizzaLayout(STAGES.sideExplorer, 12).s).toBe(1)
    for (const box of Object.values(STAGES)) {
      const { s } = pizzaLayout(box, 12)
      expect(Number.isInteger(s)).toBe(true)
      expect(s).toBeGreaterThanOrEqual(1)
      expect(s).toBeLessThanOrEqual(3)
    }
  })

  it('fits the tallest stack, its lid and its dolly above the lane, on every stage', () => {
    for (const box of Object.values(STAGES)) {
      const geo = pizzaLayout(box, 12)
      expect(geo.base - geo.heightOf(MAX_COUNT) - geo.lid).toBeGreaterThanOrEqual(0)
      expect(geo.laneTop).toBe(box.height - 11 * geo.s)
      expect(geo.base).toBe(geo.laneTop - geo.dollyH)
      expect(geo.cartY + geo.cartH).toBe(box.height)
    }
  })

  it('sizes a box for 12, whatever the run’s count and values: a 7 is the same on every run', () => {
    const six = pizzaLayout(STAGES.upright, 6)
    const twelve = pizzaLayout(STAGES.upright, 12)
    expect(six.boxPx).toBe(twelve.boxPx)
    expect(six.heightOf(7)).toBe(twelve.heightOf(7))
    // Fewer numbers, wider stacks (up to 48 px).
    expect(six.stackW).toBeGreaterThan(twelve.stackW)
    expect(pizzaLayout(STAGES.desktop, 2).stackW).toBe(48)
  })

  it('never makes a box taller than 12 px, and gives the lid only to boxes of 6 px and up', () => {
    const tall = pizzaLayout({ width: 900, height: 900 }, 12)
    expect(tall.boxPx).toBe(MAX_BOX)
    for (let height = 40; height <= 400; height += 7) {
      const geo = pizzaLayout({ width: 600, height }, 12)
      expect(geo.boxPx).toBeLessThanOrEqual(MAX_BOX)
      expect(geo.lid > 0).toBe(geo.boxPx >= LID_FROM)
      expect(geo.plain).toBe(geo.boxPx < LID_FROM)
    }
  })

  it('one box per count: a stack is its value times the box', () => {
    const geo = pizzaLayout(STAGES.desktop, 12)
    for (let v = 1; v <= 12; v++) expect(geo.heightOf(v)).toBe(v * geo.boxPx)
  })

  it('writes the digit at 10 to 16 px, on a dolly just tall enough for it', () => {
    for (const box of Object.values(STAGES)) {
      const geo = pizzaLayout(box, 12)
      expect(geo.font).toBeGreaterThanOrEqual(10)
      expect(geo.font).toBeLessThanOrEqual(16)
      expect(geo.dollyH).toBe(geo.font + 2)
    }
    expect(pizzaLayout(STAGES.desktop, 12).font).toBe(16)
  })

  it('stands the stacks on the bars’ columns (their gap included), the cart inside the field', () => {
    const geo = pizzaLayout({ width: 479, height: 60, gap: 4 }, 12)
    expect(geo.colW).toBeCloseTo((479 - 11 * 4) / 12)
    expect(geo.cx(0)).toBeCloseTo(geo.colW / 2)
    expect(geo.cx(11)).toBeCloseTo(479 - geo.colW / 2)
    expect(geo.stackW).toBeLessThanOrEqual(geo.colW)
    for (let col = 0; col < 12; col++) {
      expect(geo.cartX(col)).toBeGreaterThanOrEqual(0)
      expect(geo.cartX(col) + geo.cartW).toBeLessThanOrEqual(479)
    }
  })

  it('takes its sizes from the shortest field in the run, so nothing changes size between steps', () => {
    let memory = null
    const boxes: number[] = []
    for (const height of [63, 60, 63, 60, 63]) {
      const next = stableHeight(memory, 479, height)
      memory = next.memory
      const geo = pizzaLayout({ width: 479, height }, 12, next.sizeHeight)
      boxes.push(geo.boxPx)
      // It still stands on the field's own bottom.
      expect(geo.cartY + geo.cartH).toBe(height)
    }
    expect(new Set(boxes).size).toBe(1)
  })

  it('a sheet beside the field (a phone on its side) changes no size: they come from the stage', () => {
    // 915x340: the field is 683 px wide, 317 with The idea or Numbers beside it (366 px).
    for (const count of [6, 7, 12]) {
      const wide = pizzaLayout({ width: 683, height: 127 }, count)
      const beside = pizzaLayout({ width: 317, height: 127 }, count, 127, 683)
      expect([beside.boxPx, beside.lid, beside.s, beside.dollyH, beside.laneTop]).toEqual([
        wide.boxPx,
        wide.lid,
        wide.s,
        wide.dollyH,
        wide.laneTop,
      ])
      // The stacks fit the narrower field, and so does the digit on its dolly.
      expect(beside.stackW).toBeLessThanOrEqual(beside.colW)
      expect(beside.font).toBeLessThanOrEqual(Math.max(10, Math.floor((317 / 12) * 0.42)))
      expect(beside.font + 2).toBeLessThanOrEqual(beside.dollyH)
      expect(beside.base - beside.heightOf(MAX_COUNT) - beside.lid).toBeGreaterThanOrEqual(0)
    }
  })
})
