import { act, render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { insertionSort } from '../algorithms/sorting/insertionSort'
import { isSlide } from '../characters/penguins/steps'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import { answerAt, decisionIndexes } from '../engine/decision'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { SoundContext, type SoundPlayer } from '../sound/SoundContext'
import { useStepSounds } from '../sound/useStepSounds'
import { setPhone } from '../test/matchMedia'
import { WorkspacePage } from './WorkspacePage'

const FRAMES = collectFrames(insertionSort, DEFAULT_INPUT).frames
const SLIDE = FRAMES.findIndex((_, k) => isSlide(FRAMES, k))

// Testing Library drains pending work with a zero-length timer through a global `jest`.
const jestShim = { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) }

beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { jest: jestShim })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  Reflect.deleteProperty(globalThis, 'jest')
})

function renderAt(level: Level, look?: 'bars' | 'character', query = '') {
  localStorage.setItem(STORAGE_KEYS.level, level)
  if (look) localStorage.setItem(STORAGE_KEYS.look, look)
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[`/sorting/insertion-sort${query}`]}>
        <Routes>
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
  return user
}

const penguins = () => document.querySelector('.penguin-field')
const lookButton = (name: string) =>
  within(screen.getByRole('group', { name: 'Show as' })).getByRole('button', { name })
const wait = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}
const step = () =>
  Number(/^Step (\d+) of/.exec(screen.getByText(/^Step \d+ of \d+$/).textContent)?.[1])

describe('insertion sort: the penguins', () => {
  it('Explorer sees the penguins by default, with Bars / Penguins under "Show as"', () => {
    renderAt('explorer')
    expect(penguins()).not.toBeNull()
    expect(document.querySelectorAll('.stage-bar')).toHaveLength(0)
    expect(lookButton('Penguins')).toHaveAttribute('aria-pressed', 'true')
    expect(lookButton('Bars')).toHaveAttribute('aria-pressed', 'false')
    expect(document.querySelector('.look-toggle-icon .pixel-penguin')).not.toBeNull()
  })

  it('Engineer sees bars by default and can switch to the penguins', async () => {
    const user = renderAt('engineer')
    expect(penguins()).toBeNull()
    expect(document.querySelectorAll('.stage-bar')).toHaveLength(6)
    // jsdom lays nothing out: give the field a phone's size so the towers are drawn.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 342,
      height: 300,
      top: 0,
      left: 0,
      right: 342,
      bottom: 300,
    } as DOMRect)
    await user.click(lookButton('Penguins'))
    expect(penguins()).not.toBeNull()
    expect(document.querySelectorAll('[data-part^="tower-"]')).toHaveLength(6)
  })

  it('phones: the penguins on the stage, the switch in the Menu', () => {
    setPhone(true)
    renderAt('explorer')
    expect(penguins()).not.toBeNull()
    expect(screen.queryByRole('group', { name: 'Show as' })).not.toBeInTheDocument()
    setPhone(false)
  })

  it.each([
    ['character', 1600],
    ['bars', 800],
  ] as const)(
    'with %s, the slide into place keeps the frame on screen for %i ms at 1×',
    async (look, ms) => {
      const user = renderAt('explorer', look)
      await user.click(
        within(screen.getByRole('group', { name: 'Playback' })).getByRole('button', {
          name: 'Play',
        }),
      )
      for (let k = 0; k < 400 && step() < SLIDE + 1; k++) wait(50)
      expect(step()).toBe(SLIDE + 1)
      wait(ms - 100)
      expect(step()).toBe(SLIDE + 1)
      wait(200)
      expect(step()).toBe(SLIDE + 2)
    },
  )
})

describe('insertion sort: Do it with the penguins', () => {
  const panel = () => document.querySelector('.do-it-panel')
  const question = () => document.querySelector('.do-it-question')?.textContent ?? null
  const isDone = () => panel()?.classList.contains('is-done') === true
  const bar = () => screen.getByRole('group', { name: 'Your move' })
  function playOn() {
    for (let k = 0; k < 50 && !question() && !isDone(); k++) wait(2000)
  }

  it('Explorer plays a whole run on the penguins, to the finish', async () => {
    const user = renderAt('explorer', undefined, '?mode=do')
    expect(penguins()).not.toBeNull()
    await user.click(within(bar()).getByRole('button', { name: 'Start' }))
    playOn()
    for (const k of decisionIndexes(FRAMES)) {
      const answer = answerAt(FRAMES, k)
      await user.keyboard(answer?.kind === 'keep' ? 'k' : 's')
      playOn()
    }
    expect(isDone()).toBe(true)
    expect(panel()).toHaveTextContent('All 10 on the first try!')
  })

  it('Engineer picks a[j] over the towers to shift it', async () => {
    const user = renderAt('engineer', 'character', '?mode=do&numbers=5,3')
    expect(penguins()).not.toBeNull()
    await user.click(within(bar()).getByRole('button', { name: 'Start' }))
    playOn()
    expect(question()).toBe('a[0] = 5 > key = 3?')
    const values = within(screen.getByRole('group', { name: /^Values/ })).getAllByRole('button')
    expect(values).toHaveLength(2)
    await user.click(values[0] as HTMLElement)
    playOn()
    expect(isDone()).toBe(true)
  })
})

describe('insertion sort: the penguins’ sounds, until they have their own', () => {
  it('play exactly the bars’ sounds at every step', () => {
    const played = (look: 'bars' | 'penguins') => {
      const play = vi.fn<SoundPlayer['play']>()
      const engine: SoundPlayer = { isEnabled: true, setEnabled: vi.fn(), play, stopAll: vi.fn() }
      const wrapper = ({ children }: { children: ReactNode }) => (
        <SoundContext value={engine}>{children}</SoundContext>
      )
      const view = renderHook(
        ({ index }: { index: number }) => {
          useStepSounds({ frames: FRAMES, index, look, stepDelayMs: 800, enabled: true })
        },
        { wrapper, initialProps: { index: 0 } },
      )
      for (let k = 1; k < FRAMES.length; k++) view.rerender({ index: k })
      view.unmount()
      return play.mock.calls
    }
    expect(played('penguins')).toEqual(played('bars'))
  })
})
