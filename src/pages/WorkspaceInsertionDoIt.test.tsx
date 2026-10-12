import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { insertionSort } from '../algorithms/sorting/insertionSort'
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
      <MemoryRouter
        initialEntries={[`/sorting/insertion-sort?numbers=${numbers.join(',')}&mode=do`]}
      >
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
const value = (k: number) =>
  within(screen.getByRole('group', { name: /^Values/ })).getAllByRole('button')[k] as HTMLElement
const labels = () =>
  [...document.querySelectorAll('.stage-bar-label')].map((label) => label.textContent)

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
  const { frames } = collectFrames(insertionSort, numbers)
  return decisionIndexes(frames).map((k) => {
    const ask = frames[k]
    const answer = answerAt(frames, k)
    if (!ask?.decision || !answer) throw new Error('every decision is answered')
    return { decision: ask.decision, answer, question: ask.explanation }
  })
}

/** Makes the right move the way a learner would: Explorer's buttons, Engineer's tap or K. */
async function answerRight(
  user: User,
  level: Level,
  { decision, answer }: ReturnType<typeof decisionsFor>[number],
) {
  if (level === 'explorer') {
    await user.click(button(answer.kind === 'keep' ? 'Stop here' : 'Slide it right'))
  } else if (answer.kind === 'trade') {
    await user.click(value(decision.pair[0]))
  } else {
    await user.keyboard('k')
  }
}

describe('insertion sort: Do it', () => {
  it.each(['explorer', 'engineer'] as const)(
    '%s: a ?mode=do link opens Do it, with the Watch | Do it switch, on bars',
    (level) => {
      renderAt(level)
      expect(screen.getByRole('group', { name: 'Mode' })).toBeInTheDocument()
      expect(button('Start')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument()
      expect(document.querySelectorAll('.stage-bar')).toHaveLength(6)
      expect(screen.getByRole('group', { name: 'Show as' })).toBeInTheDocument()
    },
  )

  it('Explorer: asks at each comparison, never when a round starts or at the front', async () => {
    const user = await start('explorer')
    // 5 2 8 1 9 3, round 1: 2 is the new one.
    expect(question()).toBe('Is 5 bigger than 2, the one we’re placing?')
    expect(button('Slide it right')).toHaveAttribute('aria-keyshortcuts', 'S')
    expect(button('Stop here')).toHaveAttribute('aria-keyshortcuts', 'K')
    expect(panel()).toHaveTextContent('If it is, it slides right to make room.')
    // Slide it right shows a right arrow; Stop here, the keep bars.
    const icon = (name: string) => button(name).querySelector('path')?.getAttribute('d')
    expect(icon('Slide it right')).toBe('M4 12h15M14 7l5 5-5 5')
    expect(icon('Stop here')).toBe('M4 9h16M4 15h16')
    await user.keyboard('s')
    playOn()
    // 2 reached the front: no question there. Round 2 asks straight away about 8.
    expect(labels()).toEqual(['2', '5', '8', '1', '9', '3'])
    expect(question()).toBe('Is 5 bigger than 8, the one we’re placing?')
    await user.keyboard('k')
    playOn()
    expect(question()).toBe('Is 8 bigger than 1, the one we’re placing?')
  })

  it('Explorer: the help ladder, then Show me makes the move', async () => {
    const user = await start('explorer', [5, 3])
    await user.click(button('Help'))
    expect(rungs()).toEqual(['Look at 5 and the one we’re placing, 3.'])
    await user.click(screen.getByRole('button', { name: 'More help' }))
    expect(rungs()).toEqual([
      'Look at 5 and the one we’re placing, 3.',
      'Bigger ones slide right to make room; stop when the one on the left isn’t bigger.',
    ])
    await user.click(screen.getByRole('button', { name: 'Show me' }))
    expect(panel()).toHaveTextContent('Here’s the answer')
    expect(panel()).toHaveTextContent('Yes: 5 slides right to make room.')
  })

  it('Explorer: a wrong move opens the nudge calmly and asks again', async () => {
    const user = await start('explorer', [5, 3])
    await user.keyboard('k') // wrong: 5 is bigger than 3
    expect(panel()).toHaveTextContent('Not this time. Have another look.')
    expect(rungs()).toEqual(['Look at 5 and the one we’re placing, 3.'])
    expect(question()).toBe('Is 5 bigger than 3, the one we’re placing?')
    await user.keyboard('s')
    playOn()
    expect(isDone()).toBe(true)
  })

  it('equal values: Slide it right is wrong, Stop here is right', async () => {
    const user = await start('explorer', [2, 2])
    expect(question()).toBe('Is 2 bigger than 2, the one we’re placing?')
    await user.keyboard('s')
    expect(panel()).toHaveTextContent('Not this time.')
    await user.keyboard('h')
    await user.keyboard('h')
    await user.click(screen.getByRole('button', { name: 'Show me' }))
    expect(panel()).toHaveTextContent(
      'No: they’re both 2, so 2 stops here (equal ones keep their order).',
    )
  })

  it('already in order: every answer is Stop here', async () => {
    const numbers = [1, 2, 3, 4]
    const decisions = decisionsFor(numbers)
    expect(decisions.map((d) => d.answer)).toEqual(Array(3).fill({ kind: 'keep' }))
    const user = await start('explorer', numbers)
    for (const d of decisions) {
      await user.keyboard('s')
      expect(panel()).toHaveTextContent('Not this time.')
      await answerRight(user, 'explorer', d)
      playOn()
    }
    expect(isDone()).toBe(true)
  })

  it('reversed: every answer is Slide it right', async () => {
    const numbers = [4, 3, 2, 1]
    const decisions = decisionsFor(numbers)
    expect(decisions.map((d) => d.answer.kind)).toEqual(Array(6).fill('trade'))
    const user = await start('explorer', numbers)
    for (const d of decisions) {
      await answerRight(user, 'explorer', d)
      playOn()
    }
    expect(isDone()).toBe(true)
    expect(labels()).toEqual(['1', '2', '3', '4'])
    expect(panel()).toHaveTextContent('All 6 on the first try! A perfect run.')
  })

  it('Engineer: tap a[j] to shift it, or Insert here (K); other taps are calmly wrong', async () => {
    const user = await start('engineer', [5, 3, 4])
    expect(question()).toBe('a[0] = 5 > key = 3?')
    expect(panel()).toHaveTextContent('Shift: tap a[j]. Not bigger (or equal): Insert here (K).')
    expect(button('Insert here')).toHaveAttribute('aria-keyshortcuts', 'K')
    expect(within(bar()).queryByRole('button', { name: 'Shift' })).not.toBeInTheDocument()
    await user.keyboard('k') // wrong: 5 > 3
    expect(panel()).toHaveTextContent('Not the move the algorithm makes here.')
    await user.click(value(2)) // not part of this comparison
    expect(panel()).toHaveTextContent('Not the move the algorithm makes here.')
    await user.click(value(0)) // shift a[0]
    playOn()
    expect(labels()).toEqual(['3', '5', '4'])
    expect(question()).toBe('a[1] = 5 > key = 4?')
    await user.click(value(1))
    playOn()
    expect(question()).toBe('a[0] = 3 > key = 4?')
    await user.click(button('Insert here'))
    playOn()
    expect(isDone()).toBe(true)
    expect(labels()).toEqual(['3', '4', '5'])
  })

  it.each(['explorer', 'engineer'] as const)(
    '%s: a full playthrough to the finish, with the first-try count only there',
    async (level) => {
      const user = await start(level)
      const decisions = decisionsFor(DEFAULT_INPUT)
      // 10 comparisons, 7 of them shifts; one wrong move on the first question.
      expect(decisions).toHaveLength(10)
      expect(decisions.filter((d) => d.answer.kind === 'trade')).toHaveLength(7)
      await user.keyboard('k')
      for (const d of decisions) {
        expect(question()).toBe(d.question[level])
        expect(panel()).not.toHaveTextContent(/first (try|time)/)
        await answerRight(user, level, d)
        playOn()
      }
      expect(isDone()).toBe(true)
      expect(document.querySelector('.stage-view > .visually-hidden')).toHaveTextContent(
        /: 1, 2, 3, 5, 8, 9\./,
      )
      expect(panel()).toHaveTextContent(
        level === 'explorer' ? '9 of 10 on the first try!' : '9 of 10 decisions right first time.',
      )
    },
  )

  it('phones: the answers replace the player controls', async () => {
    setPhone(true)
    const user = await start('explorer')
    expect(button('Slide it right')).toBeInTheDocument()
    expect(within(bar()).getByText('Question 1 of 10')).toBeInTheDocument()
    await user.keyboard('s')
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument()
    setPhone(false)
  })
})
