import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { collectFrames } from '../../engine/collect'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { boxPlan, firstRound, identities, LEAST_BOX, momentsOf, sceneOf } from './layout'
import { RobotDogMockupsPage } from './RobotDogMockupsPage'
import { BOW, CART_A, CART_B, SLICE } from './sprites'

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
  it.each(Object.entries({ CART_A, CART_B, SLICE, BOW }))(
    '%s is a rectangle of pixels',
    (_, rows: readonly string[]) => {
      const width = Math.max(...rows.map((row) => row.length))
      for (const row of rows) expect(row).toHaveLength(width)
    },
  )
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
      'J. Delivery cart and pizza boxes',
    ])
    expect(document.querySelectorAll('.dog-moment .mk-scene')).toHaveLength(9)
    expect(document.querySelectorAll('.dog-clip .mk-scene')).toHaveLength(1)
    // The leader carries its ribbon (a mark, not colour alone) once it is picked.
    expect(document.querySelectorAll('.is-leader .mk-ribbon').length).toBeGreaterThan(0)
  })
})
