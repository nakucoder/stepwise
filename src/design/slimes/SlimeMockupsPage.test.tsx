import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { HOP, shapesOf, slimeLayout, type Design, type Shape } from './layout'
import { SlimeMockupsPage } from './SlimeMockupsPage'
import { MOMENTS } from './steps'

const DESIGNS: readonly Design[] = ['jelly', 'tubes', 'mountain']
const SIZES = [
  [366, 382],
  [479, 53],
  [479, 90],
  [640, 360],
] as const

const geoFor = (width: number, height: number) => slimeLayout({ width, height }, 6, 9)

/** The top of a shape, as high as it ever goes: a slime's hop, a value's arc between rows. */
function highest(shape: Shape, before: readonly Shape[], s: number): number {
  let top = shape.kind === 'text' ? shape.y - 12 : shape.y
  if (shape.kind === 'slime') top -= HOP * s
  const old = before.find((b) => b.part === shape.part && b.kind === shape.kind)
  if (old && shape.part.startsWith('v-') && old.y !== shape.y) {
    // Mid-move the value is halfway between its two places, lifted by two hops.
    top = Math.min(
      top,
      (old.y + shape.y) / 2 - 2 * HOP * s - (shape.kind === 'slime' ? HOP * s : 0),
    )
  }
  return top
}

describe('slime mockups: the fit', () => {
  it.each(SIZES)('%i × %i: every design draws inside the field, at rest and mid-move', (w, h) => {
    const geo = geoFor(w, h)
    for (const design of DESIGNS) {
      for (const moment of MOMENTS) {
        const before = shapesOf(design, moment.before, geo)
        for (const state of [moment.before, moment.after]) {
          for (const shape of shapesOf(design, state, geo)) {
            const where = `${design} ${moment.id} ${shape.part} ${shape.className}`
            expect(shape.x, where).toBeGreaterThanOrEqual(0)
            expect(shape.x + shape.w, where).toBeLessThanOrEqual(w)
            expect(highest(shape, before, geo.s), where).toBeGreaterThanOrEqual(0)
            expect(shape.y + shape.h, where).toBeLessThanOrEqual(h)
          }
        }
      }
    }
  })

  it('two full rows on a phone upright, on its side in Do it, and on a desktop; chips at 479 × 53', () => {
    expect(SIZES.map(([w, h]) => geoFor(w, h).compact)).toEqual([false, true, false, false])
  })

  it('the chips kick in when half the field is shorter than a column, its slime and a hop', () => {
    // At sprite scale 1, each half (after the 4 px gap) needs a 2 px floor, a 15 px column and
    // 12 px for the slime, a hop and a pixel: (h − 4) / 2 ≥ 29, so h ≥ 62.
    expect(geoFor(479, 62).compact).toBe(false)
    expect(geoFor(479, 61).compact).toBe(true)
  })

  it.each(SIZES)('%i × %i: every value keeps its column and a readable number', (w, h) => {
    const geo = geoFor(w, h)
    for (const design of DESIGNS) {
      for (const moment of MOMENTS) {
        const shapes = shapesOf(design, moment.after, geo)
        const rows = [moment.after.main, ...(moment.after.buffer ? [moment.after.buffer] : [])]
        rows.forEach((row) => {
          row.forEach((value, k) => {
            if (value === null) return
            const body = shapes.find(
              (sh) =>
                sh.part === `v-${String(value)}` &&
                sh.kind === 'rect' &&
                /goo|chip/.test(sh.className),
            )
            expect(body, `${design} ${moment.id} ${String(value)}`).toBeDefined()
            expect(
              Math.abs((body?.x ?? 0) + (body?.w ?? 0) / 2 - geo.center(k)),
            ).toBeLessThanOrEqual(1)
            const number = shapes.find(
              (sh) => sh.part === `v-${String(value)}` && sh.kind === 'text',
            )
            expect(number?.text).toBe(String(value))
            expect(geo.font).toBeGreaterThanOrEqual(10)
          })
        })
      }
    }
  })

  it('no role color on a slime: only the fronts (looking) and, at the end, sorted', () => {
    for (const design of DESIGNS) {
      for (const moment of MOMENTS) {
        const marks = shapesOf(design, moment.after, geoFor(366, 382)).filter((sh) =>
          sh.className.startsWith('mark-'),
        )
        if (moment.id === 'finale')
          expect(marks.every((m) => m.className === 'mark-final')).toBe(true)
        else if (moment.after.compare)
          expect(marks.map((m) => m.className)).toEqual(['mark-compare', 'mark-compare'])
        else expect(marks).toEqual([])
      }
    }
  })
})

describe('slime mockups: the page', () => {
  const page = () =>
    render(
      <PreferencesProvider>
        <SlimeMockupsPage />
      </PreferencesProvider>,
    )

  it('shows A, B and C, each with its idea, special move and sounds, beside the two-row bars', () => {
    page()
    for (const name of ['A. Jelly towers', 'B. Goo tubes', 'C. Slime mountain']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    expect(screen.getAllByText('Special move')).toHaveLength(3)
    expect(screen.getAllByText('Sounds (a sketch, no audio yet)')).toHaveLength(3)
    // The compare moment: both halves wait in the buffer row, under the empty main row.
    fireEvent.click(screen.getByRole('button', { name: 'Compare the fronts' }))
    expect(document.querySelectorAll('.stage-bars.is-buffer')).toHaveLength(3)
    expect(document.querySelectorAll('.slime-scene')).toHaveLength(3)
  })

  it('every moment, at the tightest size: the waiting row is number chips', () => {
    page()
    fireEvent.click(screen.getByRole('button', { name: 'Phone on its side, 130% text' }))
    for (const moment of MOMENTS) {
      fireEvent.click(
        within(screen.getByRole('group', { name: 'Moment' })).getByRole('button', {
          name: moment.label,
        }),
      )
      expect(document.querySelectorAll('.slime-scene')).toHaveLength(3)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Compare the fronts' }))
    expect(document.querySelectorAll('.slime-scene .chip').length).toBeGreaterThan(0)
    expect(screen.getByText(/the waiting row shrinks to number chips/)).toBeInTheDocument()
  })
})
