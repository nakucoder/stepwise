import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { setSystemDark } from '../test/matchMedia'
import { AppHeader } from './AppHeader'

function renderHeader({ savedLevel }: { savedLevel?: 'explorer' | 'engineer' } = {}) {
  if (savedLevel) localStorage.setItem(STORAGE_KEYS.level, savedLevel)
  return render(
    <PreferencesProvider>
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>
    </PreferencesProvider>,
  )
}

const levelButtons = () => {
  const group = screen.getByRole('group', { name: 'Level' })
  return {
    explorer: within(group).getByRole('button', { name: 'Explorer' }),
    engineer: within(group).getByRole('button', { name: 'Engineer' }),
  }
}

describe('AppHeader', () => {
  it('shows the logo linking home and a skip link to the main content', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Stepwise' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
  })

  it('skips to the main content without changing the address', async () => {
    const user = userEvent.setup()
    renderHeader()
    const main = document.createElement('main')
    main.id = 'main'
    main.tabIndex = -1
    document.body.append(main)

    await user.tab()
    await user.keyboard('{Enter}')
    expect(main).toHaveFocus()
    expect(window.location.hash).toBe('')
    main.remove()
  })

  describe('level toggle', () => {
    it('is hidden until a level is chosen (the level picker asks instead)', () => {
      renderHeader()
      expect(screen.queryByRole('group', { name: 'Level' })).not.toBeInTheDocument()
    })

    it('marks the saved level as selected', () => {
      renderHeader({ savedLevel: 'engineer' })
      expect(levelButtons().engineer).toHaveAttribute('aria-pressed', 'true')
      expect(levelButtons().explorer).toHaveAttribute('aria-pressed', 'false')
    })

    it('selects and saves a level by mouse', async () => {
      const user = userEvent.setup()
      renderHeader({ savedLevel: 'engineer' })
      await user.click(levelButtons().explorer)
      expect(levelButtons().explorer).toHaveAttribute('aria-pressed', 'true')
      expect(levelButtons().engineer).toHaveAttribute('aria-pressed', 'false')
      expect(localStorage.getItem(STORAGE_KEYS.level)).toBe('explorer')
    })

    it('selects a level by keyboard with Enter and Space', async () => {
      const user = userEvent.setup()
      renderHeader({ savedLevel: 'engineer' })
      await user.tab() // skip link
      await user.tab() // logo
      await user.tab()
      expect(levelButtons().explorer).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(levelButtons().explorer).toHaveAttribute('aria-pressed', 'true')

      await user.tab()
      expect(levelButtons().engineer).toHaveFocus()
      await user.keyboard(' ')
      expect(levelButtons().engineer).toHaveAttribute('aria-pressed', 'true')
      expect(levelButtons().explorer).toHaveAttribute('aria-pressed', 'false')
    })

    it('restores the saved level on the next visit', async () => {
      const user = userEvent.setup()
      const { unmount } = renderHeader({ savedLevel: 'explorer' })
      await user.click(levelButtons().engineer)
      unmount()

      renderHeader()
      expect(levelButtons().engineer).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('theme toggle', () => {
    it('offers the opposite of the system theme when none is chosen', () => {
      setSystemDark(true)
      renderHeader()
      expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
    })

    it('switches and saves the theme by mouse', async () => {
      const user = userEvent.setup()
      renderHeader()
      await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
      expect(document.documentElement.dataset.theme).toBe('dark')
      expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')
      expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
    })

    it('switches the theme by keyboard', async () => {
      const user = userEvent.setup()
      renderHeader()
      screen.getByRole('button', { name: 'Switch to dark theme' }).focus()
      await user.keyboard('{Enter}')
      expect(document.documentElement.dataset.theme).toBe('dark')
      await user.keyboard(' ')
      expect(document.documentElement.dataset.theme).toBe('light')
    })

    it('keeps the chosen theme over the system setting on the next visit', async () => {
      const user = userEvent.setup()
      const { unmount } = renderHeader()
      await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
      unmount()

      setSystemDark(false)
      renderHeader()
      expect(document.documentElement.dataset.theme).toBe('dark')
      expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
    })
  })
})
