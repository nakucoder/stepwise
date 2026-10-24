import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { collectFrames } from '../../engine/collect'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { firstRound, identities, LID_FROM, MAX_BOX, momentsOf, sceneOf, TRIM_BELOW } from './layout'
import { RobotDogMockupsPage } from './RobotDogMockupsPage'
import { BOW, CART_A, CART_B, drawCart, MINI_CART } from './sprites'
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

const MIXED = [7, 2, 11, 5, 1, 9, 12, 4, 7, 10, 6, 8]
const SORTED = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const TIGHTEST = { width: 479, height: 60 }
const BOXES = [
  TIGHTEST,
  { width: 479, height: 75 },
  { width: 612, height: 140 },
  { width: 366, height: 324 },
  { width: 698, height: 163 },
]

describe('delivery cart mockup: sprites', () => {
  it.each(Object.entries({ CART_A, CART_B, MINI_CART, BOW, BANG, BOX_A, BOX_B, BOX_C }))(
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
      for (const look of [mode, { mode, leader: true }, { mode, open: true }]) {
        const { rows } = pizzaStack(34, [12, 9, 14], 4, look)
        // Every outline is inside the boxes' own heights.
        expect(rows).toHaveLength(12 + 9 + 14)
      }
    }
  })

  it('the word shows only where its label fits, at 1 px a pixel', () => {
    expect(wordFits(LABEL_W, LABEL_H)).toBe(true)
    expect(wordFits(LABEL_W - 1, LABEL_H)).toBe(false)
    expect(wordFits(LABEL_W, LABEL_H - 1)).toBe(false)
    // Boxes of 8 px (7 under the line) carry it; of 7 px they don't (the top one carries the lid).
    expect(pizzaStack(34, [8, 8, 12], 4, 'every').words).toBe(3)
    expect(pizzaStack(34, [8, 8, 12], 4, 'top').words).toBe(1)
    expect(pizzaStack(34, [7, 7, 10], 3, 'every').words).toBe(0)
    expect(pizzaStack(20, [12, 12], 3, 'every').words).toBe(0)
    // No lid: the box's front only, still exactly its height.
    expect(pizzaStack(34, [4, 4, 4], 0, 'every').rows).toHaveLength(12)
  })

  it('every box is outlined: a dark line where each box meets the next, edge to edge', () => {
    const { rows } = pizzaStack(34, [10, 9, 13], 4, 'every')
    // The lid's line (row 4) and the lines between boxes (the dolly closes the bottom one).
    for (const y of [4, 13, 22]) {
      const row = rows[y] ?? ''
      expect(row.slice(1, 35).replace(/o/g, '')).toBe('')
    }
    for (const row of rows.slice(5)) expect(row.charAt(0)).toBe('o')
  })
})

describe('delivery cart mockup: the cart’s moods', () => {
  it('every pose draws a cart of the same size', () => {
    for (const id of MOOD_ORDER) {
      for (const f of MOODS[id].frames) {
        for (const compact of [false, true]) {
          const rows = drawCart({ face: f.face, antenna: f.antenna, flag: f.flag, compact })
          const like = compact ? MINI_CART : CART_A
          expect(rows).toHaveLength(like.length)
          for (const row of rows) expect(row).toHaveLength(like[0]?.length ?? 0)
        }
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
    for (const input of [MIXED, SORTED]) {
      const { frames } = collectFrames(quickSort, input)
      const ids = identities(frames)
      frames.forEach((frame, k) => {
        frame.array.forEach((value, col) => {
          expect(input[ids[k]?.[col] ?? -1]).toBe(value)
        })
      })
    }
  })

  it('one box = one: every box alike, sized for 12, whole pixels, capped; every frame fits', () => {
    for (const input of [MIXED, SORTED, [5, 2, 8, 1, 9, 3]]) {
      const { frames } = collectFrames(quickSort, input)
      const ids = identities(frames)
      for (const box of BOXES) {
        frames.forEach((_, k) => {
          const scene = sceneOf(frames, k, box, ids)
          expect(Number.isInteger(scene.boxPx)).toBe(true)
          expect(scene.boxPx).toBeLessThanOrEqual(MAX_BOX)
          // The lid only where a box is tall enough for it.
          if (scene.lid > 0) expect(scene.boxPx).toBeGreaterThanOrEqual(LID_FROM)
          for (const piece of scene.pieces) {
            expect(piece.boxes).toBe(piece.value)
            expect(piece.h).toBe(piece.value * scene.boxPx)
            // A 12 with its lid stays inside the field; the stack stands on its dolly.
            expect(piece.top - scene.lid).toBeGreaterThanOrEqual(0)
            expect(piece.top + piece.h + scene.dollyH).toBe(scene.dollyBottom)
          }
          // The same box on every run: sized for 12, not for this list's biggest.
          const twelve = sceneOf(collectFrames(quickSort, SORTED).frames, 0, box)
          expect(scene.boxPx).toBe(twelve.boxPx)
          expect(scene.actor.x).toBeGreaterThanOrEqual(0)
          expect(scene.actor.x + scene.actorW).toBeLessThanOrEqual(box.width + 0.5)
        })
      }
    }
  })

  it('box heights on every stage (sized for 12), trimmed and not', () => {
    const { frames } = collectFrames(quickSort, SORTED)
    const at = (box: { width: number; height: number }, trim: boolean) => {
      const sc = sceneOf(frames, 0, box, undefined, trim)
      return `${String(sc.boxPx)} px${sc.lid ? ', lid' : ''}`
    }
    for (const box of BOXES) {
      console.info(
        `${String(box.width)}x${String(box.height)}: ${at(box, true)}` +
          (box.height < TRIM_BELOW ? ` (before the trim: ${at(box, false)})` : ''),
      )
    }
    // The trim wins height on both sideways stages, and keeps the cart and digits in view.
    for (const box of BOXES.filter((b) => b.height < TRIM_BELOW)) {
      const before = sceneOf(frames, 0, box, undefined, false)
      const after = sceneOf(frames, 0, box)
      expect(after.compact).toBe(true)
      expect(after.boxPx).toBeGreaterThan(before.boxPx)
      expect(after.dollyH).toBeGreaterThanOrEqual(after.font)
      expect(after.ground - after.laneTop).toBeGreaterThanOrEqual(6)
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
  it('shows the cart on every stage size, light and dark, marked DO NOT MERGE', () => {
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
    // Every stage size: nine moments and a clip each, light and dark.
    // (and the trim's before and after).
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6)
    expect(document.querySelectorAll('.dog-moment .mk-scene')).toHaveLength(5 * 9 * 2)
    expect(document.querySelectorAll('.dog-size .dog-clip .mk-scene')).toHaveLength(
      5 * 2 + 2 * 2 * 2,
    )
    // The leader carries its bow (a mark, not colour alone) once it is picked.
    expect(document.querySelectorAll('.is-leader .mk-bow').length).toBeGreaterThan(0)
  })
})
