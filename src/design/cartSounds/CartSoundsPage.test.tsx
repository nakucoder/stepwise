import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CartSoundsPage } from './CartSoundsPage'
import { roundSchedule } from './round'
import { OPTIONS, SLOT_INFO, SLOTS, VERSIONS } from './voices'

describe('the pizza cart sound options (temporary)', () => {
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

  it('plays every sound in a full round, none cut short even at 4×', () => {
    for (const speed of [1, 4] as const) {
      const round = roundSchedule(speed, 1000)
      expect(new Set(round.notes.map((n) => n.slot))).toEqual(new Set(SLOTS))
      for (const note of round.notes) {
        for (const v of VERSIONS) expect(OPTIONS[note.slot][v].ms).toBeLessThanOrEqual(note.room)
      }
    }
  })

  it('shows a play button per option and a full round per set', () => {
    render(<CartSoundsPage />)
    expect(screen.getAllByRole('button', { name: /^▶ [ABC]\. / })).toHaveLength(21)
    for (const v of VERSIONS) {
      expect(screen.getByRole('button', { name: `▶ Round, all ${v}` })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '▶ Round, my mix' })).toBeInTheDocument()
  })
})
