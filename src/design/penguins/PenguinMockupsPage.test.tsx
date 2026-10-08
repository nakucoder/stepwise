/** TEMPORARY (design/penguins, never merged): the mockups page, and the proof that it fits. */
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../../lib/storage'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { layout, spotOf, type Design } from './layout'
import { PenguinMockupsPage } from './PenguinMockupsPage'
import { SOUND_VARIANTS } from './sounds'
import { PENGUIN, PENGUIN_FLAP, PENGUIN_H, PENGUIN_SLIDE, PENGUIN_W } from './sprites'
import { STEPS } from './steps'

const renderPage = () => {
  localStorage.setItem(STORAGE_KEYS.level, 'engineer')
  render(
    <PreferencesProvider>
      <MemoryRouter>
        <PenguinMockupsPage />
      </MemoryRouter>
    </PreferencesProvider>,
  )
}

describe('PenguinMockupsPage', () => {
  it('shows A, B and C beside the bars, at every step', () => {
    renderPage()
    for (const name of ['A. Ice pillars', 'B. Snow-brick towers', 'C. Ice shelf']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    for (const step of STEPS) {
      fireEvent.click(screen.getByRole('button', { name: step.label }))
      expect(
        screen.getAllByRole('img', { name: new RegExp(step.caption.slice(0, 15)) }),
      ).toHaveLength(3)
    }
  })

  it('offers three versions of every sound, each described, and a whole round', () => {
    renderPage()
    for (const [sound, variants] of Object.entries(SOUND_VARIANTS)) {
      // The honks have a fourth version from a CC0 recording.
      const honk = sound === 'slide' || sound === 'inplace'
      expect(variants.map((v) => v.label)).toEqual(
        honk ? ['V1', 'V2', 'V3', 'V4 (CC0 honk)'] : ['V1', 'V2', 'V3'],
      )
      for (const v of variants) expect(v.summary.length).toBeGreaterThan(5)
    }
    expect(screen.getByRole('button', { name: /Play a round/ })).toBeInTheDocument()
  })
})

describe('the sprites', () => {
  it('are rectangles of pixels, with no yellow code', () => {
    for (const sprite of [PENGUIN, PENGUIN_FLAP, PENGUIN_SLIDE]) {
      const width = sprite[0].length
      for (const row of sprite) {
        expect(row).toHaveLength(width)
        expect(row).toMatch(/^[okwbfe.]+$/)
      }
    }
    // Facing us and symmetric, so a penguin centers on its pillar exactly.
    for (const row of PENGUIN) expect(row.split('').reverse().join('')).toBe(row)
  })
})

describe('everything fits the stage box, at every step, in every design', () => {
  const SIZES = [
    [340, 240],
    [479, 55], // a phone on its side at 130% text (Watch)
    [479, 90], // the same in Do it
    [640, 360],
  ] as const
  const DESIGNS: readonly Design[] = ['pillars', 'bricks', 'shelf']

  it.each(SIZES)('%d × %d', (w, h) => {
    for (const design of DESIGNS) {
      for (const step of STEPS) {
        for (const state of [step.before, step.after]) {
          const geo = layout(w, h, state.array.length, design, Math.max(...state.array))
          for (const value of state.array) {
            const spot = spotOf(state, value, geo, design)
            const top = spot.bottom - geo.height(value)
            const penguinTop = top - PENGUIN_H * geo.s
            const where = `${design} ${step.id} ${String(value)}`
            expect(penguinTop, where).toBeGreaterThanOrEqual(0)
            expect(spot.bottom, where).toBeLessThanOrEqual(h)
            expect(spot.x, where).toBeGreaterThanOrEqual(0)
            expect(spot.x + geo.pillarW, where).toBeLessThanOrEqual(w)
            // The penguin is centered on its pillar (to the half pixel).
            const penguinLeft = spot.x + Math.round(geo.pillarW / 2) - (PENGUIN_W / 2) * geo.s
            expect(
              Math.abs(penguinLeft + (PENGUIN_W / 2) * geo.s - (spot.x + geo.pillarW / 2)),
              where,
            ).toBeLessThanOrEqual(0.5)
          }
        }
      }
    }
  })
})
