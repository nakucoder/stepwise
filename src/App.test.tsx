import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { STORAGE_KEYS } from './lib/storage'

const picker = () => screen.queryByRole('heading', { name: 'How do you want to learn?' })
const choice = (name: 'Explorer' | 'Engineer') => screen.getByRole('button', { name })

describe('first visit', () => {
  it('shows the level picker instead of the page when no level is saved', () => {
    render(<App />)
    expect(picker()).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    // The header keeps the logo and theme toggle but not the level toggle.
    expect(screen.queryByRole('group', { name: 'Level' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /switch to (dark|light) theme/i }),
    ).toBeInTheDocument()
  })

  it('describes each choice in plain words, without asking for an age', () => {
    render(<App />)
    expect(choice('Explorer')).toHaveAccessibleDescription(/plain words/i)
    expect(choice('Engineer')).toHaveAccessibleDescription(/code, big o/i)
    expect(screen.queryByText(/\bage\b|years old|how old/i)).not.toBeInTheDocument()
  })

  it('skips the picker when a level is already saved', () => {
    localStorage.setItem(STORAGE_KEYS.level, 'engineer')
    render(<App />)
    expect(picker()).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Eight topics, in the order most people learn them',
      }),
    ).toBeInTheDocument()
  })

  it('shows the picker again if the saved level is not a real level', () => {
    localStorage.setItem(STORAGE_KEYS.level, 'expert')
    render(<App />)
    expect(picker()).toBeInTheDocument()
  })

  it('saves the choice and continues to the page (mouse)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(choice('Explorer'))

    expect(picker()).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'What do you want to watch run?' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.level)).toBe('explorer')
    expect(document.documentElement.dataset.level).toBe('explorer')
    const levelGroup = screen.getByRole('group', { name: 'Level' })
    expect(within(levelGroup).getByRole('button', { name: 'Explorer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('starts focus on the picker, then works by keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('main')).toHaveFocus()

    await user.tab()
    expect(choice('Explorer')).toHaveFocus()
    await user.tab()
    expect(choice('Engineer')).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(picker()).not.toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.level)).toBe('engineer')
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('keeps the address the visitor came to, so a deep link opens after picking', async () => {
    window.history.pushState({}, '', '/sorting/bubble-sort')
    const user = userEvent.setup()
    render(<App />)
    await user.click(choice('Engineer'))
    expect(window.location.pathname).toBe('/sorting/bubble-sort')
    expect(screen.getByRole('heading', { level: 1, name: 'Bubble sort' })).toBeInTheDocument()
    window.history.pushState({}, '', '/')
  })
})
