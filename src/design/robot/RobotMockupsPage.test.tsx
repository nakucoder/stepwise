/** TEMPORARY (design/robot, never merged): the mockups page renders every design at every step. */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../../lib/storage'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { RobotMockupsPage } from './RobotMockupsPage'
import {
  CLAW_CLOSED,
  CLAW_OPEN,
  HOPPER,
  HOPPER_HAPPY,
  HOOK,
  ROVER,
  ROVER_HAPPY,
  TROLLEY,
  TROLLEY_HAPPY,
  TROLLEY_SMALL,
} from './spriteData'
import { SOUND_VARIANTS } from './sounds'
import { STEPS } from './steps'

describe('RobotMockupsPage', () => {
  it('shows E, F, D, A, B and C beside the bars, at every step', () => {
    localStorage.setItem(STORAGE_KEYS.level, 'engineer')
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <RobotMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    for (const name of [
      'E. Scout and crane',
      'F. Hopper with a crane arm',
      'D. Hopper + claw',
      'A. Gantry',
      'B. Hopper',
      'C. Rover',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    for (const step of STEPS) {
      fireEvent.click(screen.getByRole('button', { name: step.label }))
      expect(screen.getByRole('button', { name: step.label })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(
        screen.getAllByRole('img', { name: new RegExp(step.caption.slice(0, 20)) }),
      ).toHaveLength(6)
    }
  })

  it('offers Old, V1, V2 and V3 of every sound, each described, and a whole round', () => {
    localStorage.setItem(STORAGE_KEYS.level, 'engineer')
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <RobotMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    for (const sound of ['scan', 'lock', 'claw', 'finale'] as const) {
      const versions = SOUND_VARIANTS[sound]
      expect(versions.map((variant) => variant.id)).toEqual(['old', 'v1', 'v2', 'v3'])
      for (const variant of versions) expect(variant.summary).not.toBe('')
    }
    expect(screen.getByRole('button', { name: /Play a round/ })).toBeInTheDocument()
    // Tapping a version picks it (no AudioContext in tests, so it stays silent).
    const scan = screen.getByRole('group', { name: /^Scan/ })
    const v3 = within(scan).getByRole('button', { name: 'V3' })
    fireEvent.click(v3)
    expect(v3).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the hard and extra hard carries for E only', () => {
    localStorage.setItem(STORAGE_KEYS.level, 'engineer')
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <RobotMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Hard case' }))
    expect(screen.getByRole('button', { name: 'Carry' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('img', { name: /Hard case/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Extra hard' }))
    expect(screen.getAllByRole('img', { name: /Extra hard/ })).toHaveLength(1)
  })

  it('picks V3 of every sound by default', () => {
    localStorage.setItem(STORAGE_KEYS.level, 'engineer')
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <RobotMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    for (const name of [/^Scan/, /^Lock-on/, /^Claw/, /^Finale/]) {
      const group = screen.getByRole('group', { name })
      expect(within(group).getByRole('button', { name: 'V3' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    }
  })

  it('draws every sprite as a full grid (all rows the same width)', () => {
    for (const sprite of [
      TROLLEY,
      TROLLEY_HAPPY,
      TROLLEY_SMALL,
      HOOK,
      CLAW_OPEN,
      CLAW_CLOSED,
      HOPPER,
      HOPPER_HAPPY,
      ROVER,
      ROVER_HAPPY,
    ]) {
      expect(new Set(sprite.map((row) => row.length)).size).toBe(1)
    }
  })
})
