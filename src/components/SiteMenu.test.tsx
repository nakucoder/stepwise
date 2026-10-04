import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { setPhone } from '../test/matchMedia'
import { AppHeader } from './AppHeader'

function renderHeader(path: string, { phone = true, level = 'engineer' } = {}) {
  setPhone(phone)
  if (level) localStorage.setItem(STORAGE_KEYS.level, level)
  const user = userEvent.setup()
  render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppHeader />
        <Routes>
          <Route path="*" element={<p>page</p>} />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
  return user
}

const menuButton = () => screen.getByRole('button', { name: 'Menu' })

beforeEach(() => {
  setPhone(false)
})

describe('phone header menu', () => {
  it('replaces the header switches on phones, closed to start', () => {
    renderHeader('/sorting/bubble-sort')
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('group', { name: 'Level' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /switch to/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Topics' })).toBeInTheDocument()
  })

  it('opens with the level and theme switches and the topics, current page marked', async () => {
    const user = renderHeader('/sorting/bubble-sort')
    await user.click(menuButton())
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('group', { name: 'Level' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument()
    const topics = screen.getByRole('navigation', { name: 'Topics' })
    expect(within(topics).getByRole('link', { name: 'Bubble sort' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('switching the level from the menu works and keeps the menu open', async () => {
    const user = renderHeader('/sorting/bubble-sort')
    await user.click(menuButton())
    await user.click(screen.getByRole('button', { name: 'Explorer' }))
    expect(localStorage.getItem(STORAGE_KEYS.level)).toBe('explorer')
    expect(screen.getByRole('navigation', { name: 'Topics' })).toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the button', async () => {
    const user = renderHeader('/')
    await user.click(menuButton())
    await user.keyboard('{Escape}')
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
    expect(menuButton()).toHaveFocus()
  })

  it('closes when a link in it goes somewhere', async () => {
    const user = renderHeader('/')
    await user.click(menuButton())
    await user.click(screen.getByRole('link', { name: /Searching/ }))
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: 'Topics' })).not.toBeInTheDocument()
  })

  it('on the first visit (no level yet) shows only the theme switch, no menu', () => {
    renderHeader('/', { level: '' })
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument()
  })

  it('wider screens keep the switches in the header and have no menu', () => {
    renderHeader('/', { phone: false })
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Level' })).toBeInTheDocument()
  })
})
