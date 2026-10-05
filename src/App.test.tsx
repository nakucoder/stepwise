import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { STORAGE_KEYS } from './lib/storage'

const picker = () => screen.queryByRole('heading', { name: 'How do you want to learn?' })
// The cards in <main>; once a level is saved, the header's level toggle has buttons of the same names.
const choice = (name: 'Explorer' | 'Engineer') =>
  within(screen.getByRole('main')).getByRole('button', { name })

describe('first visit', () => {
  it('shows the level picker instead of the page when no level is saved', () => {
    render(<App />)
    expect(picker()).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    // The header keeps the logo and theme toggle but not the level toggle or Topics.
    expect(screen.queryByRole('group', { name: 'Level' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Topics' })).not.toBeInTheDocument()
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

describe('welcome screen', () => {
  const topicsHeading = () =>
    screen.queryByRole('heading', { level: 1, name: 'What do you want to watch run?' })
  const start = (path: string, level?: 'explorer' | 'engineer') => {
    if (level) localStorage.setItem(STORAGE_KEYS.level, level)
    window.history.pushState({}, '', path)
    render(<App />)
    return userEvent.setup()
  }

  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('opens from the logo even when a level is saved', async () => {
    const user = start('/sorting/bubble-sort', 'explorer')
    await user.click(screen.getByRole('link', { name: 'Stepwise' }))
    expect(window.location.pathname).toBe('/start')
    expect(picker()).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('marks the saved level as the current one, and only that one', () => {
    start('/start', 'engineer')
    expect(screen.getByText('✓ Current level')).toBeInTheDocument()
    expect(choice('Engineer')).toHaveAccessibleDescription(/^✓ Current level/)
    expect(choice('Explorer')).not.toHaveAccessibleDescription(/Current level/)
    expect(screen.getByText(/Keep your level or switch/)).toBeInTheDocument()
  })

  it('saves a new choice and goes to the topics', async () => {
    const user = start('/start', 'engineer')
    await user.click(choice('Explorer'))
    expect(localStorage.getItem(STORAGE_KEYS.level)).toBe('explorer')
    expect(window.location.pathname).toBe('/')
    expect(topicsHeading()).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('keeping the current level also goes to the topics', async () => {
    const user = start('/start', 'explorer')
    await user.click(choice('Explorer'))
    expect(localStorage.getItem(STORAGE_KEYS.level)).toBe('explorer')
    expect(window.location.pathname).toBe('/')
    expect(topicsHeading()).toBeInTheDocument()
  })

  it('on a first visit straight to /start, choosing goes to the topics', async () => {
    const user = start('/start')
    expect(picker()).toBeInTheDocument()
    expect(screen.queryByText('✓ Current level')).not.toBeInTheDocument()
    await user.click(choice('Explorer'))
    expect(window.location.pathname).toBe('/')
    expect(topicsHeading()).toBeInTheDocument()
  })

  it('the Topics link goes to the home tiles and is marked there', async () => {
    const user = start('/sorting/bubble-sort', 'explorer')
    const topics = screen.getByRole('link', { name: 'Topics' })
    expect(topics).not.toHaveAttribute('aria-current')
    await user.click(topics)
    expect(window.location.pathname).toBe('/')
    expect(topicsHeading()).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Topics' })).toHaveAttribute('aria-current', 'page')
  })
})
