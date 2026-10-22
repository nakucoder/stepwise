import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { quickSort } from '../algorithms/sorting/quickSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import { answerAt, decisionIndexes } from '../engine/decision'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
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

type User = ReturnType<typeof userEvent.setup>

function renderAt(level: Level, numbers: readonly number[] = DEFAULT_INPUT) {
  localStorage.setItem(STORAGE_KEYS.level, level)
  localStorage.setItem(STORAGE_KEYS.look, 'bars')
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[`/sorting/quick-sort?numbers=${numbers.join(',')}&mode=do`]}>
        <Routes>
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
  return user
}

const bar = () => screen.getByRole('group', { name: 'Your move' })
const button = (name: string) => within(bar()).getByRole('button', { name })
const panel = () => document.querySelector('.do-it-panel')
const question = () => document.querySelector('.do-it-question')?.textContent ?? null
const rungs = () => [...document.querySelectorAll('.hint-rungs li')].map((li) => li.textContent)
const isDone = () => panel()?.classList.contains('is-done') === true
const values = () => within(screen.getByRole('group', { name: /^Values/ })).getAllByRole('button')
const value = (k: number) => values()[k] as HTMLElement
const numbersOnStage = () =>
  [...document.querySelectorAll('.stage-bars .stage-bar-label')].map((label) => label.textContent)

/** Plays the steps between questions until the next question, or the finish. */
function playOn() {
  for (let k = 0; k < 50 && !question() && !isDone(); k++) {
    act(() => {
      vi.advanceTimersByTime(2000)
    })
  }
}

async function start(level: Level, numbers: readonly number[] = DEFAULT_INPUT) {
  const user = renderAt(level, numbers)
  await user.click(button('Start'))
  playOn()
  return user
}

/** Each decision in order: its pair (the wall and the value), the side, and its question. */
function decisionsFor(numbers: readonly number[]) {
  const { frames } = collectFrames(quickSort, numbers)
  return decisionIndexes(frames).map((k) => {
    const ask = frames[k]
    const answer = answerAt(frames, k)
    if (ask?.decision?.kind !== 'left-or-right' || !answer) throw new Error('left or right')
    const [i, j] = ask.decision.pair
    return { i, j, side: answer.kind === 'trade' ? 'left' : 'right', question: ask.explanation }
  })
}

/** Makes the right move the way a learner would: Explorer's buttons, Engineer's taps. */
async function answerRight(
  user: User,
  level: Level,
  { i, j, side }: ReturnType<typeof decisionsFor>[number],
) {
  if (level === 'explorer') {
    await user.click(button(side === 'left' ? 'Left side' : 'Right side'))
  } else if (side === 'right') {
    await user.click(button('Keep order'))
  } else {
    // a[j], then its slot a[i] (a[j] again when it is its own slot).
    await user.click(value(j))
    await user.click(value(i))
  }
}

describe('quick sort: Do it', () => {
  it.each(['explorer', 'engineer'] as const)(
    '%s: a ?mode=do link opens Do it, with the Watch | Do it switch',
    (level) => {
      renderAt(level)
      expect(screen.getByRole('group', { name: 'Mode' })).toBeInTheDocument()
      expect(button('Start')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument()
    },
  )

  it('asks at every comparison on the default input: 8 questions, in this order', () => {
    const decisions = decisionsFor(DEFAULT_INPUT)
    expect(decisions.map((d) => d.question.explorer)).toEqual([
      'Does 5 go left or right of the leader, 3?',
      'Does 2 go left or right of the leader, 3?',
      'Does 8 go left or right of the leader, 3?',
      'Does 1 go left or right of the leader, 3?',
      'Does 9 go left or right of the leader, 3?',
      'Does 2 go left or right of the leader, 1?',
      'Does 5 go left or right of the leader, 8?',
      'Does 9 go left or right of the leader, 8?',
    ])
    expect(decisions.map((d) => d.side)).toEqual([
      'right',
      'left',
      'right',
      'left',
      'right',
      'right',
      'left',
      'right',
    ])
    // The wall and the value; the 7th is a value that is its own slot (5 swaps with itself).
    expect(decisions.map((d) => [d.i, d.j])).toEqual([
      [0, 0],
      [0, 1],
      [1, 2],
      [1, 3],
      [2, 4],
      [0, 0],
      [3, 3],
      [4, 4],
    ])
  })

  it('Explorer: Left side (L) and Right side (R); right answers move on', async () => {
    const user = await start('explorer')
    expect(question()).toBe('Does 5 go left or right of the leader, 3?')
    expect(button('Left side')).toHaveAttribute('aria-keyshortcuts', 'L')
    expect(button('Right side')).toHaveAttribute('aria-keyshortcuts', 'R')
    expect(panel()).toHaveTextContent('Smaller than the leader, or the same: left. Bigger: right.')
    await user.keyboard('r')
    playOn()
    expect(question()).toBe('Does 2 go left or right of the leader, 3?')
    await user.click(button('Left side'))
    playOn()
    expect(question()).toBe('Does 8 go left or right of the leader, 3?')
    // 2 traded places with 5, the first bigger one.
    expect(numbersOnStage()).toEqual(['2', '5', '8', '1', '9', '3'])
  })

  it('a wrong answer opens the nudge calmly and asks again', async () => {
    const user = await start('explorer')
    await user.keyboard('l') // wrong: 5 is bigger than 3
    expect(panel()).toHaveTextContent('Not this time. Have another look.')
    expect(rungs()).toEqual(['Look at 5 and the leader, 3.'])
    expect(question()).toBe('Does 5 go left or right of the leader, 3?')
    expect(numbersOnStage()).toEqual(['5', '2', '8', '1', '9', '3'])
    await user.keyboard('R')
    playOn()
    expect(question()).toBe('Does 2 go left or right of the leader, 3?')
  })

  it('the help ladder, then Show me makes the move', async () => {
    const user = await start('explorer', [2, 1])
    await user.click(button('Help'))
    expect(rungs()).toEqual(['Look at 2 and the leader, 1.'])
    await user.click(screen.getByRole('button', { name: 'More help' }))
    expect(rungs()).toEqual([
      'Look at 2 and the leader, 1.',
      'Smaller than the leader, or the same: left side. Bigger: right side, where it already is.',
    ])
    await user.click(screen.getByRole('button', { name: 'Show me' }))
    expect(panel()).toHaveTextContent('Here’s the answer')
    expect(panel()).toHaveTextContent('Right: 2 is bigger, so it stays on the right side.')
    playOn()
    expect(isDone()).toBe(true)
    expect(numbersOnStage()).toEqual(['1', '2'])
  })

  it.each(['explorer', 'engineer'] as const)(
    '%s: a value that goes left by swapping with itself is accepted',
    async (level) => {
      // 1 <= 2 with nothing bigger yet: the values don't change, but the answer is left.
      const user = await start(level, [1, 2])
      if (level === 'explorer') {
        expect(question()).toBe('Does 1 go left or right of the leader, 2?')
        await user.click(button('Right side')) // wrong
        expect(panel()).toHaveTextContent('Not this time.')
        await user.keyboard('l')
      } else {
        expect(question()).toBe('a[0] = 1 <= pivot 2?')
        await user.click(button('Keep order')) // wrong
        expect(panel()).toHaveTextContent('Not the move the algorithm makes here.')
        // a[0], then its own slot: a[0] again.
        await user.click(value(0))
        expect(panel()).toHaveTextContent('a[0] = 1 picked. Pick its slot a[i] (itself if i == j)')
        await user.click(value(0))
      }
      playOn()
      expect(isDone()).toBe(true)
      expect(numbersOnStage()).toEqual(['1', '2'])
    },
  )

  it('the leader’s placement and a range of one play on by themselves, never asked', async () => {
    const user = await start('explorer')
    const answered = () => document.querySelector('.stats.challenge')
    const decisions = decisionsFor(DEFAULT_INPUT)
    for (const d of decisions.slice(0, 5)) {
      await answerRight(user, 'explorer', d)
      playOn()
    }
    // The leader 3 trades places with 8 and lands in its spot without a question; the next
    // question is the next group's.
    expect(question()).toBe('Does 2 go left or right of the leader, 1?')
    expect(answered()).toHaveTextContent('Questions5 of 8')
    expect(numbersOnStage()).toEqual(['2', '1', '3', '5', '9', '8'])
    expect(document.querySelectorAll('.stage-bars .stage-bar.is-sorted')).toHaveLength(1)
    await answerRight(user, 'explorer', decisions[5] as (typeof decisions)[number])
    playOn()
    // 1 lands, then 2 alone (a range of one) is in place: still no question until the next
    // group's leader, 8.
    expect(question()).toBe('Does 5 go left or right of the leader, 8?')
    expect(answered()).toHaveTextContent('Questions6 of 8')
    expect(document.querySelectorAll('.stage-bars .stage-bar.is-sorted')).toHaveLength(3)
  })

  it('the counters: swaps out of every swap in the run, and questions answered', async () => {
    const user = await start('explorer')
    const tiles = () => document.querySelector('.stats.challenge')
    expect(tiles()).toHaveTextContent('Trades0 of 5')
    expect(tiles()).toHaveTextContent('Questions0 of 8')
    await user.keyboard('r')
    playOn()
    await user.keyboard('l')
    playOn()
    expect(tiles()).toHaveTextContent('Trades1 of 5')
    expect(tiles()).toHaveTextContent('Questions2 of 8')
  })

  it('Engineer: a[j], then its slot a[i], or Keep order; another slot is not the move', async () => {
    const user = await start('engineer')
    expect(question()).toBe('a[0] = 5 <= pivot 3?')
    expect(panel()).toHaveTextContent(
      'a[j] <= pivot: tap a[j], then its slot a[i]. Otherwise Keep order (K).',
    )
    expect(values().map((b) => b.getAttribute('aria-label'))).toEqual([
      'a[0] = 5, comparing',
      'a[1] = 2',
      'a[2] = 8',
      'a[3] = 1',
      'a[4] = 9',
      'a[5] = 3, pivot',
    ])
    // Keep order is K for Engineer (R is Explorer's right side, and does nothing here).
    expect(button('Keep order')).toHaveAttribute('aria-keyshortcuts', 'K')
    await user.keyboard('r')
    expect(question()).toBe('a[0] = 5 <= pivot 3?')
    expect(panel()).not.toHaveTextContent('Not the move')
    await user.keyboard('k')
    playOn()
    expect(question()).toBe('a[1] = 2 <= pivot 3?')
    // Tapping a[1] twice is not the move here: its slot is a[0].
    await user.click(value(1))
    await user.click(value(1))
    expect(panel()).not.toHaveTextContent('Not the move')
    await user.click(value(1))
    await user.click(value(2)) // wrong slot
    expect(panel()).toHaveTextContent('Not the move the algorithm makes here.')
    // Either order: the slot first, then the value.
    await user.click(value(0))
    await user.click(value(1))
    playOn()
    expect(question()).toBe('a[2] = 8 <= pivot 3?')
    expect(numbersOnStage()).toEqual(['2', '5', '8', '1', '9', '3'])
  })

  it.each(['explorer', 'engineer'] as const)(
    '%s: a full playthrough to the finish, with the first-try count only there',
    async (level) => {
      const user = await start(level)
      const decisions = decisionsFor(DEFAULT_INPUT)
      // One wrong move on the first question: left, where 5 stays right.
      if (level === 'explorer') await user.keyboard('l')
      else {
        await user.click(value(0))
        await user.click(value(0))
      }
      for (const d of decisions) {
        expect(question()).toBe(d.question[level])
        expect(panel()).not.toHaveTextContent(/first (try|time)/)
        await answerRight(user, level, d)
        playOn()
      }
      expect(isDone()).toBe(true)
      expect(numbersOnStage()).toEqual(['1', '2', '3', '5', '8', '9'])
      expect(panel()).toHaveTextContent(
        level === 'explorer' ? '7 of 8 on the first try!' : '7 of 8 decisions right first time.',
      )
    },
  )
})
