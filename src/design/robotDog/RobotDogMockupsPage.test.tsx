import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { collectFrames } from '../../engine/collect'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { boxPlan, firstRound, identities, LEAST_BOX, momentsOf, sceneOf } from './layout'
import { RobotDogMockupsPage } from './RobotDogMockupsPage'
import { BOW, CART_A, CART_B, drawCart, SLICE } from './sprites'
import {
  BANG,
  BOX_A,
  BOX_B,
  BOX_C,
  fittedFrames,
  GLYPHS,
  LABEL_H,
  LABEL_W,
  MOOD_ORDER,
  MOODS,
  moodMs,
  pizzaStack,
  wordFits,
} from './studies'

const MIXED = [2, 42, 7, 88, 1, 64, 25, 51, 3, 76, 30, 9]
const SMALL = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8]
const TIGHTEST = { width: 479, height: 60 }
const BOXES = [
  TIGHTEST,
  { width: 479, height: 75 },
  { width: 612, height: 140 },
  { width: 366, height: 324 },
  { width: 698, height: 163 },
]

describe('delivery cart mockup: sprites', () => {
  it.each(Object.entries({ CART_A, CART_B, SLICE, BOW, BANG, BOX_A, BOX_B, BOX_C }))(
    '%s is a rectangle of pixels',
    (_, rows: readonly string[]) => {
      const width = Math.max(...rows.map((row) => row.length))
      for (const row of rows) expect(row).toHaveLength(width)
    },
  )
})

describe('delivery cart mockup: PIZZA on box 2', () => {
  it('every glyph is 3 × 5', () => {
    for (const glyph of Object.values(GLYPHS)) {
      expect(glyph).toHaveLength(5)
      for (const row of glyph) expect(row).toHaveLength(3)
    }
  })

  it('the stack is exactly as tall as its value, word or not', () => {
    for (const mode of ['top', 'every'] as const) {
      const { rows } = pizzaStack(34, [12, 9, 14], 4, mode)
      // The boxes plus one outline row above and below.
      expect(rows).toHaveLength(12 + 9 + 14 + 2)
    }
  })

  it('the word shows only where its label fits, at 1 px a pixel', () => {
    expect(wordFits(LABEL_W, LABEL_H)).toBe(true)
    expect(wordFits(LABEL_W - 1, LABEL_H)).toBe(false)
    expect(wordFits(LABEL_W, LABEL_H - 1)).toBe(false)
    // Boxes of 9 px (8 under the seam) carry it; of 7 px they don't.
    expect(pizzaStack(34, [9, 9, 13], 4, 'every').words).toBe(3)
    expect(pizzaStack(34, [9, 9, 13], 4, 'top').words).toBe(1)
    expect(pizzaStack(34, [7, 7, 7], 3, 'every').words).toBe(0)
    expect(pizzaStack(20, [12, 12], 3, 'every').words).toBe(0)
  })
})

describe('delivery cart mockup: the cart’s moods', () => {
  it('every pose draws a cart of the same size', () => {
    for (const id of MOOD_ORDER) {
      for (const f of MOODS[id].frames) {
        const rows = drawCart({ face: f.face, antenna: f.antenna, flag: f.flag })
        expect(rows).toHaveLength(CART_A.length)
        for (const row of rows) expect(row).toHaveLength(CART_A[0]?.length ?? 0)
      }
    }
  })

  it.each([1, 2, 4])(
    'at %s×, frequent moods fit inside the step and every frame shows',
    (speed) => {
      const budget = (800 / speed) * 0.9
      for (const id of MOOD_ORDER) {
        const spec = MOODS[id]
        const frames = fittedFrames(spec, speed)
        const total = moodMs({ ...spec, frames })
        if (spec.timing === 'fit') expect(total).toBeLessThanOrEqual(budget + 1e-9)
        if (spec.timing === 'special') expect(total).toBeLessThanOrEqual(moodMs(spec))
        if (spec.timing === 'full') expect(total).toBe(moodMs(spec))
        // Every frame but the held last one lasts at least one screen frame (60 Hz).
        for (const f of frames.slice(0, -1)) expect(f.ms).toBeGreaterThanOrEqual(1000 / 60)
      }
    },
  )

  it('staying right is calm: one blink, no antenna or flag moving', () => {
    for (const f of MOODS.stay.frames) {
      expect(f.antenna ?? 'up').toBe('up')
      expect(f.flag ?? 'a').toBe('a')
      expect(f.bang).toBeFalsy()
    }
    expect(MOODS.stay.frames.filter((f) => f.face === 'blink')).toHaveLength(1)
  })
})

describe('delivery cart mockup: layout', () => {
  it('follows every value through the swaps', () => {
    for (const input of [MIXED, SMALL]) {
      const { frames } = collectFrames(quickSort, input)
      const ids = identities(frames)
      frames.forEach((frame, k) => {
        frame.array.forEach((value, col) => {
          expect(input[ids[k]?.[col] ?? -1]).toBe(value)
        })
      })
    }
  })

  it('every frame fits the stage, and a bigger number always stands taller', () => {
    for (const input of [MIXED, SMALL, [5, 2, 8, 1, 9, 3]]) {
      const { frames } = collectFrames(quickSort, input)
      const ids = identities(frames)
      for (const box of BOXES) {
        frames.forEach((_, k) => {
          const scene = sceneOf(frames, k, box, ids)
          for (const piece of scene.pieces) {
            // The open lid stays inside the field; the stack stands on its dolly at the curb.
            expect(piece.top - scene.lidRise).toBeGreaterThanOrEqual(0)
            expect(piece.top + piece.h + scene.dollyH).toBeCloseTo(scene.laneTop)
            expect(piece.cx).toBeGreaterThan(0)
            expect(piece.cx).toBeLessThan(box.width)
            expect(piece.boxes).toBeGreaterThanOrEqual(1)
          }
          const byValue = [...scene.pieces].sort((a, b) => a.value - b.value)
          byValue.forEach((piece, j) => {
            const next = byValue[j + 1]
            if (next && next.value > piece.value) expect(next.h).toBeGreaterThan(piece.h)
          })
          // The dolly holds the digit and no more.
          expect(scene.dollyH).toBe(scene.font + 2)
          expect(scene.actor.x).toBeGreaterThanOrEqual(0)
          expect(scene.actor.x + scene.actorW).toBeLessThanOrEqual(box.width + 0.5)
        })
      }
    }
  })

  it('boxes are flat, and never thinner than the target', () => {
    expect(boxPlan(20, 8)).toEqual({ unit: 1 / 2, boxPx: 10 })
    expect(boxPlan(8, 8)).toEqual({ unit: 1, boxPx: 8 })
    expect(boxPlan(2.8, 8).unit).toBe(5)
    expect(boxPlan(0.4, 8).unit).toBe(20)
    for (const ppc of [0.1, 0.39, 1, 2.83, 4.9, 6, 13, 30]) {
      expect(boxPlan(ppc, 8).boxPx).toBeGreaterThanOrEqual(8)
    }
  })

  it('on the tightest stage, 1 to 12 still stand apart by height', () => {
    for (const [input, least] of [
      [SMALL, 2.5],
      [MIXED, 0.3],
    ] as const) {
      const { frames } = collectFrames(quickSort, input)
      const scene = sceneOf(frames, 0, TIGHTEST)
      const lo = Math.min(...input)
      const hi = Math.max(...input)
      const h = (v: number) => scene.pieces.find((p) => p.value === v)?.h ?? 0
      const perCount = (h(hi) - h(lo)) / (hi - lo)
      console.info(
        `479x60, ${String(hi)} max: ${perCount.toFixed(2)} px a count, the 1 is ${h(lo).toFixed(1)} px, box ${scene.boxPx.toFixed(1)} px (${String(scene.unit)} counts), dolly ${String(scene.dollyH)} px`,
      )
      expect(perCount).toBeGreaterThanOrEqual(least)
      expect(h(lo)).toBeGreaterThanOrEqual(LEAST_BOX)
    }
  })

  it('finds all nine moments in the 12 mixed numbers, and one full round', () => {
    const { frames } = collectFrames(quickSort, MIXED)
    const moments = momentsOf(frames)
    for (const k of Object.values(moments)) expect(k).not.toBeNull()
    expect(frames[moments.nudge ?? 0]?.partition?.event).toBe('left')
    expect(frames[moments.moveLeft ?? 0]?.partition?.event).toBe('left')
    expect(frames[moments.place ?? 0]?.partition?.event).toBe('place')
    const [from, to] = firstRound(frames)
    expect(frames[from]?.partition?.event).toBe('range')
    expect(frames[to - 1]?.partition?.event).toBe('place')
  })
})

describe('delivery cart mockup: the page', () => {
  it('shows the cart only, nine moments and a clip, marked DO NOT MERGE', () => {
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <RobotDogMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DO NOT MERGE')
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Box 2 with “PIZZA”: on the top box, or on every box',
      'One pizza box: three versions',
      'The cart’s faces and wiggles',
      'J. Delivery cart and pizza boxes',
    ])
    // Three boxes, and the word's two options.
    expect(document.querySelectorAll('.study-box')).toHaveLength(5)
    expect(document.querySelectorAll('.study-mood')).toHaveLength(7)
    expect(document.querySelectorAll('.dog-moment .mk-scene')).toHaveLength(9)
    expect(document.querySelectorAll('.dog-clip .mk-scene')).toHaveLength(1)
    // The leader carries its ribbon (a mark, not colour alone) once it is picked.
    expect(document.querySelectorAll('.is-leader .mk-ribbon').length).toBeGreaterThan(0)
  })
})
