/** TEMPORARY (design/robot, never merged): the mockups page renders every design at every step. */
import { fireEvent, render, screen } from '@testing-library/react'
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
  ROVER,
  ROVER_HAPPY,
  TROLLEY,
  TROLLEY_HAPPY,
} from './spriteData'
import { STEPS } from './steps'

describe('RobotMockupsPage', () => {
  it('shows A, B and C beside the bars, at every step', () => {
    localStorage.setItem(STORAGE_KEYS.level, 'engineer')
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <RobotMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    for (const name of ['A. Gantry', 'B. Hopper', 'C. Rover']) {
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
      ).toHaveLength(3)
    }
  })

  it('draws every sprite as a full grid (all rows the same width)', () => {
    for (const sprite of [
      TROLLEY,
      TROLLEY_HAPPY,
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
