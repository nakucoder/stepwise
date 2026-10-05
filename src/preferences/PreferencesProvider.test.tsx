import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../lib/storage'
import { setSystemDark } from '../test/matchMedia'
import { usePreferences } from './preferences'
import { PreferencesProvider } from './PreferencesProvider'

function Probe() {
  const { level, setLevel, theme, setTheme, look, setLook, sound, setSound } = usePreferences()
  return (
    <div>
      <output aria-label="level">{level ?? 'none'}</output>
      <output aria-label="theme">{theme}</output>
      <output aria-label="look">{look}</output>
      <output aria-label="sound">{sound ? 'on' : 'off'}</output>
      <button
        onClick={() => {
          setSound(!sound)
        }}
      >
        toggle sound
      </button>
      <button
        onClick={() => {
          setLevel('engineer')
        }}
      >
        engineer
      </button>
      <button
        onClick={() => {
          setLook('bars')
        }}
      >
        bars
      </button>
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

  it('draws ducks for Explorer and bars for Engineer until the learner chooses', async () => {
    const user = userEvent.setup()
    renderProbe()
    expect(screen.getByLabelText('look')).toHaveTextContent('bars')
    await user.click(screen.getByRole('button', { name: 'explorer' }))
    expect(screen.getByLabelText('look')).toHaveTextContent('ducks')
    await user.click(screen.getByRole('button', { name: 'engineer' }))
    expect(screen.getByLabelText('look')).toHaveTextContent('bars')
    expect(localStorage.getItem(STORAGE_KEYS.look)).toBeNull()
  })

  it('keeps a chosen look in both levels, and saves it', async () => {
    const user = userEvent.setup()
    localStorage.setItem(STORAGE_KEYS.level, 'explorer')
    renderProbe()
    await user.click(screen.getByRole('button', { name: 'bars' }))
    expect(screen.getByLabelText('look')).toHaveTextContent('bars')
    expect(localStorage.getItem(STORAGE_KEYS.look)).toBe('bars')
  })

  it('restores a saved look and ignores an unknown one', () => {
    localStorage.setItem(STORAGE_KEYS.level, 'engineer')
    localStorage.setItem(STORAGE_KEYS.look, 'ducks')
    const { unmount } = renderProbe()
    expect(screen.getByLabelText('look')).toHaveTextContent('ducks')
    unmount()
    localStorage.setItem(STORAGE_KEYS.look, 'sprites')
    renderProbe()
    expect(screen.getByLabelText('look')).toHaveTextContent('bars')
  })

  it('is muted until the user turns sound on, and saves the choice either way', async () => {
    const user = userEvent.setup()
    renderProbe()
    expect(screen.getByLabelText('sound')).toHaveTextContent('off')
    expect(localStorage.getItem(STORAGE_KEYS.sound)).toBeNull()
    await user.click(screen.getByRole('button', { name: 'toggle sound' }))
    expect(screen.getByLabelText('sound')).toHaveTextContent('on')
    expect(localStorage.getItem(STORAGE_KEYS.sound)).toBe('on')
    await user.click(screen.getByRole('button', { name: 'toggle sound' }))
    expect(localStorage.getItem(STORAGE_KEYS.sound)).toBe('off')
  })

  it('restores saved sound and ignores an unknown value', () => {
    localStorage.setItem(STORAGE_KEYS.sound, 'on')
    const { unmount } = renderProbe()
    expect(screen.getByLabelText('sound')).toHaveTextContent('on')
    unmount()
    localStorage.setItem(STORAGE_KEYS.sound, 'loud')
    renderProbe()
    expect(screen.getByLabelText('sound')).toHaveTextContent('off')
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
