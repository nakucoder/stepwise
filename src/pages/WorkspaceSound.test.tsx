import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { SoundContext, type SoundPlayer } from '../sound/SoundContext'
import { setPhone } from '../test/matchMedia'
import { WorkspacePage } from './WorkspacePage'

function renderAt(level: Level, path = '/sorting/bubble-sort') {
  localStorage.setItem(STORAGE_KEYS.level, level)
  let enabled = false
  const play = vi.fn<SoundPlayer['play']>()
  const setEnabled = vi.fn((on: boolean) => {
    enabled = on
  })
  const engine: SoundPlayer = {
    get isEnabled() {
      return enabled
    },
    setEnabled,
    play,
    stopAll: vi.fn(),
  }
  const user = userEvent.setup()
  render(
    <SoundContext value={engine}>
      <PreferencesProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
          </Routes>
        </MemoryRouter>
      </PreferencesProvider>
    </SoundContext>,
  )
  return { user, play, setEnabled }
}

const soundButton = () => screen.getByRole('button', { name: 'Sound' })
const playback = () => screen.getByRole('group', { name: 'Playback' })

describe('Sound button', () => {
  it('is off until the learner turns it on', () => {
    renderAt('explorer')
    expect(soundButton()).toHaveAttribute('aria-pressed', 'false')
  })

  it('desktop: sits on the stage beside Bars / Ducks, not in the controls', () => {
    renderAt('engineer')
    const tools = screen.getByRole('group', { name: 'Show as' }).closest('.stage-tools')
    expect(tools).toContainElement(soundButton())
    expect(within(playback()).queryByRole('button', { name: 'Sound' })).toBeNull()
  })

  it('phones: sits in the controls', () => {
    setPhone(true)
    renderAt('explorer')
    expect(within(playback()).getByRole('button', { name: 'Sound' })).toBeInTheDocument()
  })

  it('turning it on starts the audio in the click, saves the choice, and steps sound', async () => {
    const { user, play, setEnabled } = renderAt('explorer')
    await user.click(soundButton())
    expect(soundButton()).toHaveAttribute('aria-pressed', 'true')
    expect(setEnabled).toHaveBeenLastCalledWith(true)
    expect(localStorage.getItem(STORAGE_KEYS.sound)).toBe('on')

    await user.click(screen.getByRole('button', { name: /Step/ }))
    expect(play).toHaveBeenCalledTimes(1)
    // The first step compares two ducks: two squeaks.
    expect(play.mock.lastCall?.[0].map((note) => note.voice)).toEqual(['squeak', 'squeak'])
  })

  it('turning it off stops the audio and saves that too', async () => {
    localStorage.setItem(STORAGE_KEYS.sound, 'on')
    const { user, play, setEnabled } = renderAt('engineer')
    expect(soundButton()).toHaveAttribute('aria-pressed', 'true')
    await user.click(soundButton())
    expect(setEnabled).toHaveBeenLastCalledWith(false)
    expect(localStorage.getItem(STORAGE_KEYS.sound)).toBe('off')
    await user.click(screen.getByRole('button', { name: /Step/ }))
    expect(play).not.toHaveBeenCalled()
  })

  it('is not offered for algorithms that aren’t built yet', () => {
    renderAt('explorer', '/sorting/quick-sort')
    expect(screen.queryByRole('button', { name: 'Sound' })).toBeNull()
  })
})
