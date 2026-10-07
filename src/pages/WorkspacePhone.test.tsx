import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { setPhone } from '../test/matchMedia'
import { WorkspacePage } from './WorkspacePage'

beforeEach(() => {
  setPhone(true)
})

function renderAt(path: string, level: Level) {
  localStorage.setItem(STORAGE_KEYS.level, level)
  const user = userEvent.setup()
  render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
  return user
}

const pills = () => within(screen.getByRole('group', { name: 'Details' }))
const pill = (name: string) => pills().getByRole('button', { name })
const progress = () => screen.getByText(/^Step \d+ of \d+$/)
const idea = () => screen.queryByRole('region', { name: 'The idea' })
const explain = () => screen.getByRole('region', { name: "What's happening" })
const bars = () =>
  [...document.querySelectorAll('.stage-bar-label')].map((label) => label.textContent)

describe('phone workspace: always on screen', () => {
  it('keeps the bars and "What’s happening" together, with no sidebar or rail', () => {
    renderAt('/sorting/bubble-sort', 'engineer')
    expect(screen.getByRole('region', { name: 'Visualization' })).toBeInTheDocument()
    expect(explain()).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Topics' })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Step details' })).not.toBeInTheDocument()
  })

  it('Engineer: the caption carries the running counts', async () => {
    const user = renderAt('/sorting/bubble-sort', 'engineer')
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(explain()).toHaveTextContent('1 comparison, 1 swap')
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(explain()).toHaveTextContent('2 comparisons, 1 swap')
  })

  it('offers one button per sheet, named for the level', () => {
    renderAt('/sorting/bubble-sort', 'explorer')
    expect(
      pills()
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['The idea', 'Numbers', 'So far', 'Colors'])
  })

  it('keeps the band to the title: no numbers field or idea button there', () => {
    renderAt('/sorting/bubble-sort', 'engineer')
    expect(screen.queryByRole('textbox', { name: 'Your numbers' })).not.toBeInTheDocument()
    // The only "The idea" button is the sheet button.
    expect(screen.getAllByRole('button', { name: 'The idea' })).toEqual([pill('The idea')])
  })
})

describe('phone workspace: The idea', () => {
  it('opens at step 1 and Start moves on to step 2 with focus on the page', async () => {
    const user = renderAt('/sorting/bubble-sort', 'explorer')
    expect(idea()).toBeInTheDocument()
    expect(pill('The idea')).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('button', { name: 'Got it, let’s start' }))
    expect(progress()).toHaveTextContent(/^Step 2 of/)
    expect(idea()).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('folds away on the next step and comes back at step 1', async () => {
    const user = renderAt('/sorting/bubble-sort', 'engineer')
    await user.keyboard('{ArrowRight}')
    expect(idea()).not.toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(idea()).toBeInTheDocument()
  })
})

describe('phone workspace: sheets', () => {
  it('opens one sheet at a time, moves focus into it, and Close returns focus', async () => {
    const user = renderAt('/sorting/bubble-sort', 'engineer')
    await user.keyboard('{ArrowRight}{ArrowRight}')
    await user.click(pill('Trace'))
    const sheet = screen.getByRole('region', { name: 'Trace table' })
    expect(sheet).toHaveFocus()
    expect(within(sheet).getByRole('table')).toBeInTheDocument()
    expect(pill('Trace')).toHaveAttribute('aria-expanded', 'true')

    await user.click(pill('Code'))
    expect(screen.queryByRole('region', { name: 'Trace table' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Code' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('region', { name: 'Code' })).not.toBeInTheDocument()
    expect(pill('Code')).toHaveFocus()
  })

  it('shrinks the bars to a strip while a sheet is open, and keeps it open while stepping', async () => {
    const user = renderAt('/sorting/bubble-sort', 'engineer')
    await user.keyboard('{ArrowRight}')
    expect(document.querySelector('.stage.is-mini')).toBeNull()
    await user.click(pill('Trace'))
    expect(document.querySelector('.stage.is-mini')).not.toBeNull()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('region', { name: 'Trace table' })).toBeInTheDocument()
    expect(progress()).toHaveTextContent(/^Step 3 of/)
  })

  it('Explorer: Colors holds the color key and the counts', async () => {
    const user = renderAt('/sorting/bubble-sort', 'explorer')
    await user.click(pill('Colors'))
    const sheet = screen.getByRole('region', { name: 'What the colors mean' })
    expect(within(sheet).getByText('Trading places')).toBeInTheDocument()
    expect(within(sheet).getByText('Comparisons')).toBeInTheDocument()
  })

  it('Numbers: a mistake stays in the sheet; a good run closes it and shows the new bars', async () => {
    const user = renderAt('/sorting/bubble-sort', 'explorer')
    await user.click(pill('Numbers'))
    const field = screen.getByRole('textbox', { name: 'Your numbers' })
    await user.clear(field)
    await user.type(field, '4 x{Enter}')
    expect(screen.getByText('“x” isn’t a number. Use numbers like 7 3 12.')).toBeInTheDocument()

    await user.clear(field)
    await user.type(field, '7 3 12{Enter}')
    expect(bars()).toEqual(['7', '3', '12'])
    expect(screen.queryByRole('region', { name: 'Your numbers' })).not.toBeInTheDocument()
    expect(idea()).not.toBeInTheDocument()
    expect(document.querySelector('.stage.is-mini')).toBeNull()
  })
})

describe('phone workspace: controls', () => {
  it('has Back, Play, Step, a Speed button that cycles, and the step count', async () => {
    const user = renderAt('/sorting/bubble-sort', 'engineer')
    const controls = within(screen.getByRole('group', { name: 'Playback' }))
    expect(controls.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(controls.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(controls.getByRole('button', { name: 'Step' })).toBeInTheDocument()
    const speed = controls.getByRole('button', { name: /^Speed 1×/ })
    await user.click(speed)
    expect(controls.getByRole('button', { name: 'Speed 2×. Change to 4×' })).toBeInTheDocument()
    expect(progress()).toHaveTextContent('Step 1 of 34')
  })
})
