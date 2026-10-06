import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { SoundContext, type SoundPlayer } from '../sound/SoundContext'
import { setPhone, setReducedMotion } from '../test/matchMedia'
import { WorkspacePage } from './WorkspacePage'

// Testing Library drains pending work with a zero-length timer through a global `jest`.
const jestShim = { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) }

beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { jest: jestShim })
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(globalThis, 'jest')
})

interface Options {
  readonly level?: Level
  readonly path?: string
  readonly sound?: boolean
}

function renderDoIt({
  level = 'explorer',
  path = '/sorting/bubble-sort',
  sound = false,
}: Options = {}) {
  localStorage.setItem(STORAGE_KEYS.level, level)
  if (sound) localStorage.setItem(STORAGE_KEYS.sound, 'on')
  const play = vi.fn<SoundPlayer['play']>()
  const engine: SoundPlayer = {
    isEnabled: true,
    setEnabled: vi.fn(),
    play,
    stopAll: vi.fn(),
  }
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
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
  return { user, play }
}

const modeButton = (name: 'Watch' | 'Do it') =>
  within(screen.getByRole('group', { name: 'Mode' })).getByRole('button', { name })
const bar = () => screen.getByRole('group', { name: 'Your move' })
const answer = (name: string) => within(bar()).getByRole('button', { name })
const panel = () => document.querySelector('.do-it-panel')
const question = () => document.querySelector('.do-it-question')?.textContent ?? null
const numbersOnStage = () => document.querySelector('.stage-view > .visually-hidden')?.textContent
const liveRegion = () => document.querySelector('.visually-hidden[aria-live="polite"][aria-atomic]')

/** Lets the steps between questions play, until a question (or the finish) is on screen. */
function playOn() {
  for (let k = 0; k < 50 && !question() && !panel()?.classList.contains('is-done'); k++) {
    act(() => {
      vi.advanceTimersByTime(2000)
    })
  }
}

/** The right answer to the question on screen, from its numbers. */
function rightKey(): 't' | 'k' {
  const match = /Is (-?\d+) bigger than (-?\d+)\?/.exec(question() ?? '')
  if (!match) throw new Error(`no question on screen: ${String(panel()?.textContent)}`)
  return Number(match[1]) > Number(match[2]) ? 't' : 'k'
}

/** Answers every question by keyboard; `wrongAt` makes one wrong move first at those questions. */
async function answerAll(user: ReturnType<typeof userEvent.setup>, wrongAt: number[] = []) {
  for (let q = 0; q < 100; q++) {
    playOn()
    if (panel()?.classList.contains('is-done')) return
    const right = rightKey()
    if (wrongAt.includes(q)) await user.keyboard(right === 't' ? 'k' : 't')
    await user.keyboard(right)
  }
}

async function startDoIt(options: Options = {}) {
  const rendered = renderDoIt({ path: '/sorting/bubble-sort?mode=do', ...options })
  await rendered.user.click(answer('Start'))
  playOn()
  return rendered
}

describe('Do it: the switch', () => {
  it('Explorer: Watch and Do it on every built page, Watch first', () => {
    renderDoIt()
    expect(modeButton('Watch')).toHaveAttribute('aria-pressed', 'true')
    expect(modeButton('Do it')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('group', { name: 'Playback' })).toBeInTheDocument()
  })

  it('switching to Do it shows the challenge and swaps the playback bar for the answers', async () => {
    const { user } = renderDoIt()
    await user.click(modeButton('Do it'))
    expect(modeButton('Do it')).toHaveAttribute('aria-pressed', 'true')
    expect(panel()).toHaveTextContent('Put these 6 numbers in order, one question at a time.')
    expect(panel()).toHaveTextContent(
      'Bubble sort needs 7 trades for these numbers. Can you find them all?',
    )
    expect(screen.queryByRole('group', { name: 'Playback' })).toBeNull()
    expect(answer('Start')).toBeInTheDocument()
  })

  it('keeps the learner’s numbers', async () => {
    const { user } = renderDoIt({ path: '/sorting/bubble-sort?numbers=3,1,2' })
    await user.click(modeButton('Do it'))
    expect(panel()).toHaveTextContent('Put these 3 numbers in order')
  })

  it('is not offered on algorithms that aren’t built, nor (yet) for Engineer', () => {
    renderDoIt({ path: '/sorting/quick-sort?mode=do' })
    expect(screen.queryByRole('group', { name: 'Mode' })).toBeNull()
  })

  it('Engineer: no switch yet, and ?mode=do stays in Watch mode', () => {
    renderDoIt({ level: 'engineer', path: '/sorting/bubble-sort?mode=do' })
    expect(screen.queryByRole('group', { name: 'Mode' })).toBeNull()
    expect(screen.getByRole('group', { name: 'Playback' })).toBeInTheDocument()
  })

  it('Watch it, at the finish, goes back to Watch mode', async () => {
    const { user } = await startDoIt()
    await answerAll(user)
    await user.click(answer('Watch it'))
    expect(modeButton('Watch')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('group', { name: 'Playback' })).toBeInTheDocument()
  })
})

describe('Do it: questions and moves', () => {
  it('Start asks the first question and puts focus on the answers', async () => {
    await startDoIt()
    expect(question()).toBe('Is 5 bigger than 2?')
    expect(answer('Trade places')).toHaveFocus()
  })

  it('a right move: the trade happens, the page says so, then the next question', async () => {
    const { user } = await startDoIt()
    await user.click(answer('Trade places'))
    expect(panel()).toHaveTextContent('Right!')
    expect(panel()).toHaveTextContent('Yes! 5 is bigger, so they trade places.')
    expect(numbersOnStage()).toContain('2, 5, 8, 1, 9, 3')
    playOn()
    expect(question()).toBe('Is 5 bigger than 8?')
  })

  it('a wrong move: nothing moves, and help opens at the nudge', async () => {
    const { user } = await startDoIt()
    await user.click(answer('Keep them'))
    expect(numbersOnStage()).toContain('5, 2, 8, 1, 9, 3')
    expect(question()).toBe('Is 5 bigger than 2?')
    expect(panel()).toHaveTextContent('Not this time. Have another look.')
    expect(panel()).toHaveTextContent('Look at the two numbers marked in yellow: 5 and 2.')
    expect(panel()).not.toHaveTextContent('If the left number is bigger')
  })

  it('More help adds the rule; Show me says the answer and makes the move', async () => {
    const { user } = await startDoIt()
    await user.click(answer('Keep them'))
    await user.click(screen.getByRole('button', { name: 'More help' }))
    expect(panel()).toHaveTextContent('If the left number is bigger, they trade places.')
    expect(screen.queryByRole('button', { name: 'More help' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Show me' }))
    expect(panel()).toHaveTextContent('Here’s the answer')
    expect(numbersOnStage()).toContain('2, 5, 8, 1, 9, 3')
  })

  it('Help before answering gives the nudge, kindly', async () => {
    const { user } = await startDoIt()
    await user.click(answer('Help'))
    expect(panel()).toHaveTextContent('Here’s a hint.')
    expect(panel()).not.toHaveTextContent('Not this time')
  })

  it('between questions the answers wait (and keep focus), and do nothing', async () => {
    const { user } = await startDoIt()
    await user.click(answer('Trade places'))
    expect(answer('Trade places')).toHaveAttribute('aria-disabled', 'true')
    await user.click(answer('Keep them'))
    expect(panel()).not.toHaveTextContent('Not this time')
  })

  it('keys: T trades, K keeps, H helps; Space and the arrows don’t step', async () => {
    const { user } = await startDoIt()
    // Space on a focused button presses it, as everywhere; with focus elsewhere it does nothing.
    act(() => {
      answer('Trade places').blur()
    })
    await user.keyboard(' ')
    await user.keyboard('{ArrowRight}')
    expect(question()).toBe('Is 5 bigger than 2?')
    await user.keyboard('h')
    expect(panel()).toHaveTextContent('Here’s a hint.')
    await user.keyboard('t')
    expect(panel()).toHaveTextContent('Right!')
    playOn()
    await user.keyboard('k')
    expect(panel()).toHaveTextContent('Right!')
    expect(panel()).toHaveTextContent('No, 5 is smaller, so they stay put.')
  })

  it('the challenge counters count trades found and questions answered', async () => {
    const { user } = await startDoIt()
    await user.keyboard('t')
    expect(screen.getByText('Trades found').nextElementSibling).toHaveTextContent('1 of 7')
    expect(screen.getByText('Questions').nextElementSibling).toHaveTextContent('1 of 14')
  })
})

describe('Do it: the finish', () => {
  it('a perfect run says so, with the ducks’ result, and focus moves to Play again', async () => {
    const { user } = await startDoIt()
    await answerAll(user)
    expect(panel()).toHaveTextContent('You sorted it!')
    expect(panel()).toHaveTextContent('7 trades, the same as bubble sort.')
    expect(panel()).toHaveTextContent('All 14 on the first try! A perfect run.')
    expect(answer('Play again')).toHaveFocus()
  })

  it('asking for help is free; a wrong move costs only its first try', async () => {
    const { user } = await startDoIt()
    await user.keyboard('h')
    await answerAll(user, [3])
    expect(panel()).toHaveTextContent('13 of 14 on the first try!')
    expect(panel()).toHaveTextContent('Play again and go for a perfect run?')
  })

  it('Play again starts over at the challenge', async () => {
    const { user } = await startDoIt()
    await answerAll(user)
    await user.click(answer('Play again'))
    expect(answer('Start')).toHaveFocus()
    expect(numbersOnStage()).toContain('5, 2, 8, 1, 9, 3')
  })

  it('numbers already in order: the challenge says so, and keeping them all wins', async () => {
    const { user } = await startDoIt({ path: '/sorting/bubble-sort?numbers=1,2,3&mode=do' })
    expect(question()).toBe('Is 1 bigger than 2?')
    await answerAll(user)
    expect(panel()).toHaveTextContent('0 trades, the same as bubble sort.')
  })
})

describe('Do it: screen readers, sound, motion, phones', () => {
  it('announces the challenge, each question, every result and help, and the finish', async () => {
    const { user } = renderDoIt({ path: '/sorting/bubble-sort?mode=do' })
    expect(liveRegion()).toHaveTextContent('Bubble sort needs 7 trades')
    await user.click(answer('Start'))
    playOn()
    expect(liveRegion()).toHaveTextContent('Is 5 bigger than 2?')
    await user.keyboard('k')
    expect(liveRegion()).toHaveTextContent(
      'Not this time. Have another look. Look at the two numbers marked in yellow',
    )
    await user.keyboard('t')
    expect(liveRegion()).toHaveTextContent('Right! Yes! 5 is bigger, so they trade places.')
    await answerAll(user)
    expect(liveRegion()).toHaveTextContent('You sorted it!')
  })

  it('sound on: a right trade chimes, then the duck quacks; a wrong move hums softly', async () => {
    const { user, play } = await startDoIt({ sound: true })
    play.mockClear()
    await user.keyboard('k')
    expect(play.mock.lastCall?.[0].map((n) => n.voice)).toEqual(['hum'])
    await user.keyboard('t')
    expect(play.mock.lastCall?.[0].map((n) => n.voice)).toEqual(['chime', 'chime', 'quack', 'drop'])
  })

  it('muted: no sound at all, and every result is still in words', async () => {
    const { user, play } = await startDoIt({ sound: false })
    await user.keyboard('k')
    await user.keyboard('t')
    expect(play).not.toHaveBeenCalled()
    expect(panel()).toHaveTextContent('Right!')
  })

  it('reduced motion: plays the same, with nothing animated', async () => {
    setReducedMotion(true)
    const animate = vi.fn()
    Object.assign(HTMLElement.prototype, { animate })
    const { user } = await startDoIt()
    await user.keyboard('t')
    expect(numbersOnStage()).toContain('2, 5, 8, 1, 9, 3')
    expect(animate).not.toHaveBeenCalled()
    Reflect.deleteProperty(HTMLElement.prototype, 'animate')
  })

  it('phones: Sound stays in reach, in the answer bar, and turning it on works', async () => {
    setPhone(true)
    const { user } = renderDoIt({ path: '/sorting/bubble-sort?mode=do' })
    // On the challenge screen too, not only during play.
    expect(answer('Sound')).toHaveAttribute('aria-pressed', 'false')
    await user.click(answer('Start'))
    playOn()
    await user.click(answer('Sound'))
    expect(answer('Sound')).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem(STORAGE_KEYS.sound)).toBe('on')
    // It sits apart from the answers: not one of the buttons that answer the question.
    expect(answer('Sound')).not.toHaveClass('answer')
  })

  it('desktop: Sound stays on the stage in Do it mode', async () => {
    await startDoIt()
    const sound = screen.getByRole('button', { name: 'Sound' })
    expect(sound.closest('.stage-tools')).not.toBeNull()
    expect(within(bar()).queryByRole('button', { name: 'Sound' })).toBeNull()
  })

  it('phones: the answers sit at the bottom with the question count', async () => {
    setPhone(true)
    await startDoIt()
    expect(within(bar()).getByText('Question 1 of 14')).toBeInTheDocument()
    expect(answer('Trade places')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Playback' })).toBeNull()
  })
})
