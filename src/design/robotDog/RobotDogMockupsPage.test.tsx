import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { collectFrames } from '../../engine/collect'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { firstRound, identities, momentsOf, sceneOf, type Design } from './layout'
import { RobotDogMockupsPage } from './RobotDogMockupsPage'
import { BALL, BOT, DOG, DOG_SIT, DOG_SNIFF, SHEEP } from './sprites'

const MIXED = [2, 42, 7, 88, 1, 64, 25, 51, 3, 76, 30, 9]
const SMALL = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8]
const DESIGNS: readonly Design[] = ['sheep', 'bones', 'bots']
const BOXES = [
  { width: 479, height: 60 },
  { width: 479, height: 75 },
  { width: 612, height: 140 },
  { width: 366, height: 324 },
  { width: 698, height: 163 },
]

describe('robot dog mockups: sprites', () => {
  it.each(Object.entries({ DOG, DOG_SNIFF, DOG_SIT, SHEEP, BOT, BALL }))(
    '%s is a rectangle of pixels',
    (_, rows) => {
      const width = rows[0].length
      for (const row of rows) expect(row).toHaveLength(width)
    },
  )
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
              expect(piece.top + piece.h).toBeCloseTo(scene.ground)
              expect(piece.cx).toBeGreaterThan(0)
              expect(piece.cx).toBeLessThan(box.width)
            }
            const byValue = [...scene.pieces].sort((a, b) => a.value - b.value)
            byValue.forEach((piece, j) => {
              const next = byValue[j + 1]
              if (next) expect(next.h).toBeGreaterThanOrEqual(piece.h)
            })
            expect(scene.dog.x).toBeGreaterThanOrEqual(0)
            expect(scene.dog.x + DOG[0].length * scene.dogS).toBeLessThanOrEqual(box.width + 0.5)
            if (scene.ball) expect(scene.ball.y).toBeGreaterThanOrEqual(0)
          })
        }
      }
    }
  })

  it('small numbers stand apart when they are the list (1 to 12): about 2px a count on the tightest stage', () => {
    const { frames } = collectFrames(quickSort, SMALL)
    const scene = sceneOf('sheep', frames, 0, { width: 479, height: 60 })
    const h = (v: number) => scene.pieces.find((p) => p.value === v)?.h ?? 0
    expect(h(2) - h(1)).toBeGreaterThanOrEqual(1.5)
    expect(h(3) - h(2)).toBeGreaterThanOrEqual(1.5)
  })

  it('finds all nine moments in the 12 mixed numbers, and one full round', () => {
    const { frames } = collectFrames(quickSort, MIXED)
    const moments = momentsOf(frames)
    for (const k of Object.values(moments)) expect(k).not.toBeNull()
    expect(frames[moments.nudge ?? 0]?.partition?.event).toBe('left')
    expect(frames[moments.place ?? 0]?.partition?.event).toBe('place')
    const [from, to] = firstRound(frames)
    expect(frames[from]?.partition?.event).toBe('range')
    expect(frames[to - 1]?.partition?.event).toBe('place')
  })
})

describe('robot dog mockups: the page', () => {
  it('shows three designs, nine moments and a clip each, marked DO NOT MERGE', () => {
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <RobotDogMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DO NOT MERGE')
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'A. Sheepdog: sheep on wool towers',
      'B. Fetch: bones planted in the yard',
      'C. Hover-bots on light beams',
    ])
    expect(document.querySelectorAll('.dog-moment')).toHaveLength(27)
    expect(document.querySelectorAll('.dog-moment .dog-scene')).toHaveLength(27)
    expect(document.querySelectorAll('.dog-clip .dog-scene')).toHaveLength(3)
  })
})
