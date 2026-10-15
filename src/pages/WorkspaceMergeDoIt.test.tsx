import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mergeSort } from '../algorithms/sorting/mergeSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import { answerAt, decisionIndexes } from '../engine/decision'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { setPhone } from '../test/matchMedia'
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
      <MemoryRouter initialEntries={[`/sorting/merge-sort?numbers=${numbers.join(',')}&mode=do`]}>
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
/** The main row's numbers (an empty place has none). */
const mainRow = () =>
  [...document.querySelectorAll('.stage-bars:not(.is-buffer) .stage-bar-label')].map(
    (label) => label.textContent,
  )

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

/** Each decision in order: its ask frame and the right move, read from the frames. */
function decisionsFor(numbers: readonly number[]) {
  const { frames } = collectFrames(mergeSort, numbers)
  return decisionIndexes(frames).map((k) => {
    const ask = frames[k]
    const answer = answerAt(frames, k)
    if (!ask?.decision || answer?.kind !== 'pick') throw new Error('every decision is a pick')
    const side = answer.index === ask.decision.pair[0] ? 'left' : 'right'
    return { decision: ask.decision, index: answer.index, side, question: ask.explanation }
  })
}

/** Makes the right move the way a learner would: Explorer's buttons, Engineer's tap. */
async function answerRight(
  user: User,
  level: Level,
  { side, index }: ReturnType<typeof decisionsFor>[number],
) {
  if (level === 'explorer') await user.click(button(side === 'left' ? 'Left one' : 'Right one'))
  else await user.click(value(index))
}

describe('merge sort: Do it', () => {
  it.each(['explorer', 'engineer'] as const)(
    '%s: a ?mode=do link opens Do it, with the Watch | Do it switch, on two rows',
    (level) => {
      renderAt(level)
      expect(screen.getByRole('group', { name: 'Mode' })).toBeInTheDocument()
      expect(button('Start')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument()
      expect(document.querySelectorAll('.stage-bars.is-buffer .stage-slot')).toHaveLength(6)
    },
  )

  it('asks at every comparison on the default input: 10 questions, in this order', () => {
    const decisions = decisionsFor(DEFAULT_INPUT)
    expect(decisions.map((d) => d.question.explorer)).toEqual([
      'Which goes next, 2 or 8?',
      'Which goes next, 5 or 2?',
      'Which goes next, 5 or 8?',
      'Which goes next, 9 or 3?',
      'Which goes next, 1 or 3?',
      'Which goes next, 2 or 1?',
      'Which goes next, 2 or 3?',
      'Which goes next, 5 or 3?',
      'Which goes next, 5 or 9?',
      'Which goes next, 8 or 9?',
    ])
    expect(decisions.map((d) => d.side)).toEqual([
      'left',
      'right',
      'left',
      'right',
      'left',
      'right',
      'left',
      'right',
      'left',
      'left',
    ])
    // The two fronts are the pair; the answer is the one that moves up.
    expect(decisions.map((d) => d.decision.pair)).toEqual([
      [1, 2],
      [0, 1],
      [0, 2],
      [4, 5],
      [3, 4],
      [0, 3],
      [0, 4],
      [1, 4],
      [1, 5],
      [2, 5],
    ])
  })

  it('Explorer: no question at the splits; Left one (L) and Right one (R), alike', async () => {
    const user = await start('explorer')
    // Three splits play by themselves, then the first merge asks.
    expect(question()).toBe('Which goes next, 2 or 8?')
    expect(button('Left one')).toHaveAttribute('aria-keyshortcuts', 'L')
    expect(button('Right one')).toHaveAttribute('aria-keyshortcuts', 'R')
    expect(panel()).toHaveTextContent('Smaller one first. Same? Left one first.')
    // Both answers look exactly alike: the same icon.
    const icon = (name: string) => button(name).querySelector('svg')?.innerHTML
    expect(icon('Left one')).toBe(icon('Right one'))
    await user.keyboard('l')
    playOn()
    expect(question()).toBe('Which goes next, 5 or 2?')
  })

  it('L and R keys answer; a wrong key opens the nudge calmly and asks again', async () => {
    const user = await start('explorer')
    await user.keyboard('r') // wrong: 2 is smaller than 8
    expect(panel()).toHaveTextContent('Not this time. Have another look.')
    expect(rungs()).toEqual(['Look at the first one in each pile: 2 on the left, 8 on the right.'])
    expect(question()).toBe('Which goes next, 2 or 8?')
    await user.keyboard('L')
    playOn()
    expect(question()).toBe('Which goes next, 5 or 2?')
    await user.keyboard('l') // wrong: 2 is smaller
    expect(panel()).toHaveTextContent('Not this time.')
    await user.keyboard('r')
    playOn()
    expect(question()).toBe('Which goes next, 5 or 8?')
  })

  it('Explorer: the help ladder, then Show me makes the move', async () => {
    const user = await start('explorer', [5, 3])
    await user.click(button('Help'))
    expect(rungs()).toEqual(['Look at the first one in each pile: 5 on the left, 3 on the right.'])
    await user.click(screen.getByRole('button', { name: 'More help' }))
    expect(rungs()).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Show me' }))
    expect(panel()).toHaveTextContent('Here’s the answer')
    expect(panel()).toHaveTextContent('3 is smaller, so it goes up next.')
    playOn()
    expect(isDone()).toBe(true)
    expect(mainRow()).toEqual(['3', '5'])
  })

  it('equal values: the left one is right, the right one is wrong', async () => {
    const user = await start('explorer', [2, 2])
    expect(question()).toBe('Which goes next, 2 or 2?')
    await user.click(button('Right one'))
    expect(panel()).toHaveTextContent('Not this time.')
    await user.keyboard('h')
    await user.keyboard('h')
    await user.click(screen.getByRole('button', { name: 'Show me' }))
    expect(panel()).toHaveTextContent(
      'They’re both 2: the left one goes first, so equal ones keep their order.',
    )
  })

  it('equal values: Left one first time is a perfect run', async () => {
    const user = await start('explorer', [2, 2])
    await user.click(button('Left one'))
    playOn()
    expect(isDone()).toBe(true)
    expect(panel()).toHaveTextContent('All 1 on the first try! A perfect run.')
  })

  it('a half running out: the rest moves up with no question', async () => {
    // 1 2 3 | 4 5 6 in order: each merge's left half runs out first, so its right half's rest
    // moves up by itself.
    const numbers = [1, 2, 3, 4, 5, 6]
    const decisions = decisionsFor(numbers)
    expect(decisions).toHaveLength(7)
    expect(decisions.every((d) => d.side === 'left')).toBe(true)
    const { frames } = collectFrames(mergeSort, numbers)
    expect(frames.filter((f) => f.span?.event === 'rest').length).toBeGreaterThan(0)
    expect(frames.filter((f) => f.span?.event === 'rest').every((f) => !f.decision)).toBe(true)

    const user = await start('explorer', numbers)
    for (const d of decisions) {
      expect(question()).toBe(d.question.explorer)
      await answerRight(user, 'explorer', d)
      playOn()
    }
    // The last merge's left half ran out after three questions: 4 5 6 moved up unasked.
    expect(isDone()).toBe(true)
    expect(mainRow()).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(panel()).toHaveTextContent('All 7 on the first try! A perfect run.')
  })

  it('the counters: questions answered, and values moved up out of every move', async () => {
    const user = await start('explorer')
    const tiles = () => document.querySelector('.stats.challenge')
    expect(tiles()).toHaveTextContent('Moved up0 of 16')
    expect(tiles()).toHaveTextContent('Questions0 of 10')
    await user.keyboard('l')
    playOn()
    // 2 moved up after the answer, then 8 with no question.
    expect(tiles()).toHaveTextContent('Moved up2 of 16')
    expect(tiles()).toHaveTextContent('Questions1 of 10')
  })

  it('Engineer: taps the front itself in the second row; no answer button or R key', async () => {
    const user = await start('engineer')
    expect(question()).toBe('left[0] = 2 <= right[0] = 8?')
    expect(panel()).toHaveTextContent(
      'Tap the front that goes next: left[i] if left[i] <= right[j], else right[j].',
    )
    // Help is the only answer in the bar.
    expect(within(bar()).queryByRole('button', { name: /Take/ })).not.toBeInTheDocument()
    expect(bar()).toHaveClass('is-help-only')
    // One button per column of the second row, named by its half; empty places can't be picked.
    expect(values().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Column 0, empty',
      'left[0] = 2, comparing',
      'right[0] = 8, comparing',
      'Column 3, empty',
      'Column 4, empty',
      'Column 5, empty',
    ])
    expect(value(0)).toHaveAttribute('aria-disabled', 'true')
    expect(value(1)).toHaveAttribute('aria-disabled', 'false')
    await user.click(value(0)) // an empty place: nothing happens
    await user.keyboard('r') // no key for Engineer's answers
    expect(panel()).not.toHaveTextContent('Not the move')
    expect(question()).toBe('left[0] = 2 <= right[0] = 8?')
    await user.click(value(2)) // wrong: 2 <= 8
    expect(panel()).toHaveTextContent('Not the move the algorithm makes here.')
    await user.click(value(1))
    playOn()
    expect(question()).toBe('left[0] = 5 <= right[0] = 2?')
    await user.click(value(1)) // right[0] = 2
    playOn()
    expect(question()).toBe('left[0] = 5 <= right[1] = 8?')
  })

  it('Engineer: a value behind a front is never the move', async () => {
    // 4 3 | 2 1: the last merge waits as 3 4 | 1 2, fronts 3 and 1.
    const user = await start('engineer', [4, 3, 2, 1])
    await user.click(value(1))
    playOn()
    await user.click(value(3))
    playOn()
    expect(question()).toBe('left[0] = 3 <= right[0] = 1?')
    expect(value(1)).toHaveAttribute('aria-label', 'left[1] = 4')
    await user.click(value(1)) // 4 is behind the left front
    expect(panel()).toHaveTextContent('Not the move the algorithm makes here.')
    await user.click(value(2))
    playOn()
    expect(question()).toBe('left[0] = 3 <= right[1] = 2?')
  })

  it('Engineer: the buttons lie over the second row, placed at its top', async () => {
    const user = await start('engineer')
    const picks = screen.getByRole('group', { name: /^Values/ })
    // jsdom has no layout: the row is placed by the second row's measured top (0 here).
    expect(picks.style.top).toBe('0px')
    await user.click(value(1))
    playOn()
    expect(screen.getByRole('group', { name: /^Values/ }).style.top).toBe('0px')
  })

  it.each(['explorer', 'engineer'] as const)(
    '%s: a full playthrough to the finish, with the first-try count only there',
    async (level) => {
      const user = await start(level)
      const decisions = decisionsFor(DEFAULT_INPUT)
      // One wrong move on the first question: the other front.
      if (level === 'explorer') await user.keyboard('r')
      else await user.click(value(2))
      for (const d of decisions) {
        expect(question()).toBe(d.question[level])
        expect(panel()).not.toHaveTextContent(/first (try|time)/)
        await answerRight(user, level, d)
        playOn()
      }
      expect(isDone()).toBe(true)
      expect(mainRow()).toEqual(['1', '2', '3', '5', '8', '9'])
      expect(panel()).toHaveTextContent(
        level === 'explorer' ? '9 of 10 on the first try!' : '9 of 10 decisions right first time.',
      )
    },
  )

  it('phones: the answers replace the player controls; Engineer has Help only', async () => {
    setPhone(true)
    const user = await start('explorer')
    expect(button('Left one')).toBeInTheDocument()
    expect(within(bar()).getByText('Question 1 of 10')).toBeInTheDocument()
    await user.keyboard('l')
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument()
    setPhone(false)
  })

  it('phones, Engineer: Help is the one answer, and the second row is still tappable', async () => {
    setPhone(true)
    const user = await start('engineer')
    // Sound sits in the bar's top row on phones; Help is the only answer.
    expect(
      within(bar())
        .getAllByRole('button')
        .map((b) => b.textContent.trim()),
    ).toEqual(['Sound', 'Help'])
    await user.click(value(1))
    playOn()
    expect(question()).toBe('left[0] = 5 <= right[0] = 2?')
    setPhone(false)
  })
})
