import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../lib/storage'
import { setSystemDark } from '../test/matchMedia'
import { usePreferences } from './preferences'
import { PreferencesProvider } from './PreferencesProvider'

function Probe() {
  const { level, setLevel, theme, setTheme } = usePreferences()
  return (
    <div>
      <output aria-label="level">{level ?? 'none'}</output>
      <output aria-label="theme">{theme}</output>
      <button
        onClick={() => {
          setLevel('explorer')
        }}
      >
        explorer
      </button>
      <button
        onClick={() => {
          setTheme('dark')
        }}
      >
        dark
      </button>
    </div>
  )
}

function renderProbe() {
  return render(
    <PreferencesProvider>
      <Probe />
    </PreferencesProvider>,
  )
}

const root = document.documentElement

describe('PreferencesProvider', () => {
  it('starts with no level and the system theme when nothing is saved', () => {
    renderProbe()
    expect(screen.getByLabelText('level')).toHaveTextContent('none')
    expect(screen.getByLabelText('theme')).toHaveTextContent('light')
    expect(root.dataset.level).toBeUndefined()
    expect(root.dataset.theme).toBeUndefined()
  })

  it('restores a saved level and theme', () => {
    localStorage.setItem(STORAGE_KEYS.level, 'explorer')
    localStorage.setItem(STORAGE_KEYS.theme, 'dark')
    renderProbe()
    expect(screen.getByLabelText('level')).toHaveTextContent('explorer')
    expect(screen.getByLabelText('theme')).toHaveTextContent('dark')
    expect(root.dataset.level).toBe('explorer')
    expect(root.dataset.theme).toBe('dark')
  })

  it('ignores unexpected saved values', () => {
    localStorage.setItem(STORAGE_KEYS.level, 'expert')
    localStorage.setItem(STORAGE_KEYS.theme, 'sepia')
    renderProbe()
    expect(screen.getByLabelText('level')).toHaveTextContent('none')
    expect(screen.getByLabelText('theme')).toHaveTextContent('light')
  })

  it('saves changes and mirrors them onto <html>', async () => {
    const user = userEvent.setup()
    renderProbe()
    await user.click(screen.getByRole('button', { name: 'explorer' }))
    await user.click(screen.getByRole('button', { name: 'dark' }))
    expect(localStorage.getItem(STORAGE_KEYS.level)).toBe('explorer')
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')
    expect(root.dataset.level).toBe('explorer')
    expect(root.dataset.theme).toBe('dark')
  })

  it('follows the system theme live until the user chooses one', async () => {
    const user = userEvent.setup()
    renderProbe()
    act(() => {
      setSystemDark(true)
    })
    expect(screen.getByLabelText('theme')).toHaveTextContent('dark')
    act(() => {
      setSystemDark(false)
    })
    expect(screen.getByLabelText('theme')).toHaveTextContent('light')

    await user.click(screen.getByRole('button', { name: 'dark' }))
    act(() => {
      setSystemDark(false)
    })
    expect(screen.getByLabelText('theme')).toHaveTextContent('dark')
  })

  it('keeps working in memory when localStorage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    const user = userEvent.setup()
    renderProbe()
    await user.click(screen.getByRole('button', { name: 'explorer' }))
    expect(screen.getByLabelText('level')).toHaveTextContent('explorer')
    vi.restoreAllMocks()
  })
})
