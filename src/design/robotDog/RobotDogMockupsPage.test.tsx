import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { collectFrames } from '../../engine/collect'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { firstRound, identities, momentsOf, sceneOf, type Design } from './layout'
import { RobotDogMockupsPage } from './RobotDogMockupsPage'
import {
  CART_A,
  CART_B,
  DOG_JUMP,
  DOG_STAND,
  DOG_TROT1,
  DOG_TROT2,
  DOG_WAG,
  SPARKLE,
} from './sprites'

const MIXED = [2, 42, 7, 88, 1, 64, 25, 51, 3, 76, 30, 9]
const SMALL = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8]
const DESIGNS: readonly Design[] = ['balloons', 'pizza']
const BOXES = [
  { width: 479, height: 60 },
  { width: 479, height: 75 },
  { width: 612, height: 140 },
  { width: 366, height: 324 },
  { width: 698, height: 163 },
]

describe('robot dog mockups: sprites', () => {
  it.each(
    Object.entries({ DOG_STAND, DOG_WAG, DOG_TROT1, DOG_TROT2, DOG_JUMP, CART_A, CART_B, SPARKLE }),
  )('%s is a rectangle of pixels', (_, rows) => {
    const width = Math.max(...rows.map((row) => row.length))
    for (const row of rows) expect(row).toHaveLength(width)
  })
})

describe('robot dog mockups: layout', () => {
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

  it('every frame fits the stage, and a bigger number always stands at least as tall', () => {
    for (const input of [MIXED, SMALL, [5, 2, 8, 1, 9, 3]]) {
      const { frames } = collectFrames(quickSort, input)
      const ids = identities(frames)
      for (const design of DESIGNS) {
        for (const box of BOXES) {
          frames.forEach((_, k) => {
            const scene = sceneOf(design, frames, k, box, ids)
            for (const piece of scene.pieces) {
              expect(piece.top).toBeGreaterThanOrEqual(0)
              expect(piece.cx).toBeGreaterThan(0)
              expect(piece.cx).toBeLessThan(box.width)
              // The value never reaches into the character's lane: it is never hidden.
              if (design === 'balloons') {
                expect(scene.ground - piece.h).toBeLessThanOrEqual(scene.laneTop - 2)
              } else {
                expect(piece.top + piece.h + scene.dollyH).toBeCloseTo(scene.laneTop)
              }
            }
            const byValue = [...scene.pieces].sort((a, b) => a.value - b.value)
            byValue.forEach((piece, j) => {
              const next = byValue[j + 1]
              if (next) expect(next.h).toBeGreaterThanOrEqual(piece.h)
              if (next && next.value > piece.value) expect(next.h).toBeGreaterThan(piece.h)
            })
            expect(scene.actor.x).toBeGreaterThanOrEqual(0)
            expect(scene.actor.x + scene.actorW).toBeLessThanOrEqual(box.width + 0.5)
            expect(scene.actor.y).toBeGreaterThanOrEqual(0)
          })
        }
      }
    }
  })

  it.each(DESIGNS)(
    '%s: on the tightest stage, every count of 1 to 12 still stands apart',
    (design) => {
      const box = { width: 479, height: 60 }
      for (const [input, least] of [
        [SMALL, 1.5],
        [MIXED, 0.2],
      ] as const) {
        const { frames } = collectFrames(quickSort, input)
        const scene = sceneOf(design, frames, 0, box)
        const max = Math.max(...input)
        const perCount =
          ((scene.pieces.find((p) => p.value === max)?.h ?? 0) -
            (scene.pieces.find((p) => p.value === Math.min(...input))?.h ?? 0)) /
          (max - Math.min(...input))
        console.info(
          `${design} 479x60, ${String(max)} max: ${perCount.toFixed(2)} px a count, s=${String(scene.s)}, unit=${String(scene.unit)}, box=${scene.boxPx.toFixed(1)}px`,
        )
        expect(perCount).toBeGreaterThanOrEqual(least)
      }
    },
  )

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

describe('robot dog mockups: the page', () => {
  it('shows two designs, nine moments and a clip each, marked DO NOT MERGE', () => {
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <RobotDogMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DO NOT MERGE')
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'I. Robot dog and balloons',
      'J. Delivery cart and pizza boxes',
    ])
    expect(document.querySelectorAll('.dog-moment')).toHaveLength(18)
    expect(document.querySelectorAll('.dog-moment .mk-scene')).toHaveLength(18)
    expect(document.querySelectorAll('.dog-clip .mk-scene')).toHaveLength(2)
  })
})
