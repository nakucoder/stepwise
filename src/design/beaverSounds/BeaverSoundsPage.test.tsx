import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BeaverSoundsPage } from './BeaverSoundsPage'
import { placeNote, roundSchedule } from './round'
import { HAUL_LAND_MS, HAUL_TAIL_MS, OPTIONS, SLOT_INFO, SLOTS, VERSIONS } from './voices'

describe('the builder beaver sound options (temporary)', () => {
  it('has three versions of each of the seven sounds, each fitting its moment at 4×', () => {
    for (const slot of SLOTS) {
      for (const v of VERSIONS) {
        const option = OPTIONS[slot][v]
        expect(option.name).not.toBe('')
        expect(option.line).not.toBe('')
        expect(option.ms).toBeLessThanOrEqual(SLOT_INFO[slot].budgetMs)
        expect(option.gain).toBeGreaterThan(0)
      }
    }
  })

  it('lands each haul’s thud on the set-down, with room for what follows it at 4×', () => {
    for (const v of VERSIONS) {
      const { hitMs, ms } = OPTIONS.haul[v]
      expect(hitMs).toBeDefined()
      expect(hitMs).toBeLessThanOrEqual(HAUL_LAND_MS)
      expect(ms - (hitMs ?? 0)).toBeLessThanOrEqual(HAUL_TAIL_MS)
    }
  })

  it('plays every sound in a full round, none cut short at any speed, Watch and Do it', () => {
    for (const speed of [0.5, 1, 2, 4] as const) {
      const watch = roundSchedule(speed, 1600, 'watch')
      const doit = roundSchedule(speed, 1600, 'doit')
      expect(new Set(watch.notes.map((n) => n.slot))).toEqual(
        new Set(SLOTS.filter((s) => s !== 'turn')),
      )
      expect(new Set(doit.notes.map((n) => n.slot))).toEqual(new Set(SLOTS))
      for (const note of doit.notes) {
        for (const v of VERSIONS) {
          const option = OPTIONS[note.slot][v]
          const { start, room } = placeNote(note, option.hitMs)
          expect(start).toBeGreaterThanOrEqual(note.earliest)
          expect(option.ms).toBeLessThanOrEqual(room)
        }
      }
    }
  })

  it('shows a play button per option, a full round per set and my mix', () => {
    render(<BeaverSoundsPage />)
    expect(screen.getAllByRole('button', { name: /^▶ [ABC]\. / })).toHaveLength(21)
    for (const v of VERSIONS) {
      expect(screen.getByRole('button', { name: `▶ Round, all ${v}` })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '▶ Round, my mix' })).toBeInTheDocument()
  })
})
