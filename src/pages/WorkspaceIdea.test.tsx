import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { WorkspacePage } from './WorkspacePage'

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

const idea = () => screen.queryByRole('region', { name: 'The idea' })
const explain = () => screen.queryByRole('region', { name: "What's happening" })
const ideaButton = () => screen.getByRole('button', { name: 'The idea' })
const progress = () => screen.getByText(/^Step \d+ of \d+$/)
const questions = () => [...document.querySelectorAll('.idea-point dt')].map((dt) => dt.textContent)

describe('The idea at step 1', () => {
  it('Explorer: fills the rail with the plain idea and its four questions', () => {
    renderAt('/sorting/bubble-sort', 'explorer')
    expect(idea()).toHaveTextContent(bubbleSort.idea.explorer.lead)
    expect(questions()).toEqual([
      'Why two at a time?',
      'Why start on the left?',
      'Why not three at a time?',
      'When do we stop?',
    ])
    expect(explain()).not.toBeInTheDocument()
    expect(ideaButton()).toHaveAttribute('aria-expanded', 'true')
  })

  it('Engineer: the precise version, including the early stop', () => {
    renderAt('/sorting/bubble-sort', 'engineer')
    expect(idea()).toHaveTextContent(bubbleSort.idea.engineer.lead)
    expect(questions()).toEqual([
      'Why adjacent pairs?',
      'Why left to right?',
      'Why not three at a time?',
      'Why stop early?',
    ])
    expect(idea()).toHaveTextContent('takes just one pass: O(n)')
  })

  it('Start goes on to step 2, shows the step panels and puts focus on the page', async () => {
    const user = renderAt('/sorting/bubble-sort', 'explorer')
    await user.click(screen.getByRole('button', { name: 'Got it, let’s start' }))
    expect(progress()).toHaveTextContent(/^Step 2 of/)
    expect(idea()).not.toBeInTheDocument()
    expect(explain()).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveFocus()
    expect(ideaButton()).toHaveAttribute('aria-expanded', 'false')
  })

  it('stepping forward folds it away, and coming back to step 1 shows it again', async () => {
    const user = renderAt('/sorting/bubble-sort', 'engineer')
    await user.keyboard('{ArrowRight}')
    expect(idea()).not.toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(idea()).toBeInTheDocument()
  })
})

describe('The idea button in the band', () => {
  it('reopens it at any step, pauses playback, and moves focus to it', async () => {
    const user = renderAt('/sorting/bubble-sort', 'engineer')
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
    await user.click(screen.getByRole('button', { name: /Play/ }))
    expect(screen.getByRole('button', { name: /Pause/ })).toBeInTheDocument()

    await user.click(ideaButton())
    expect(screen.getByRole('button', { name: /Play/ })).toBeInTheDocument()
    expect(progress()).toHaveTextContent(/^Step 4 of/)
    expect(idea()).toBeInTheDocument()
    expect(idea()).toHaveFocus()
    expect(ideaButton()).toHaveAttribute('aria-expanded', 'true')
  })

  it('"Back to the steps" closes it and returns focus to the button', async () => {
    const user = renderAt('/sorting/bubble-sort', 'explorer')
    await user.keyboard('{ArrowRight}{ArrowRight}')
    await user.click(ideaButton())
    await user.click(screen.getByRole('button', { name: 'Back to the steps' }))
    expect(idea()).not.toBeInTheDocument()
    expect(explain()).toBeInTheDocument()
    expect(progress()).toHaveTextContent(/^Step 3 of/)
    expect(ideaButton()).toHaveFocus()
  })

  it('stepping away closes it, and it stays closed when you step back there', async () => {
    const user = renderAt('/sorting/bubble-sort', 'engineer')
    await user.keyboard('{ArrowRight}{ArrowRight}')
    await user.click(ideaButton())
    await user.keyboard('{ArrowRight}')
    expect(idea()).not.toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(idea()).not.toBeInTheDocument()
  })

  it('is not offered for algorithms that aren’t built yet', () => {
    renderAt('/sorting/quick-sort', 'engineer')
    expect(screen.queryByRole('button', { name: 'The idea' })).not.toBeInTheDocument()
    expect(idea()).not.toBeInTheDocument()
  })
})
