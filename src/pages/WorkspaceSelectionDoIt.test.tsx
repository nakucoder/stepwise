import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { selectionSort } from '../algorithms/sorting/selectionSort'
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
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(
    <PreferencesProvider>
      <MemoryRouter
        initialEntries={[`/sorting/selection-sort?numbers=${numbers.join(',')}&mode=do`]}
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
  const { frames } = collectFrames(selectionSort, numbers)
  return decisionIndexes(frames).map((k) => {
    const ask = frames[k]
    const answer = answerAt(frames, k)
    if (!ask?.decision || !answer) throw new Error('every decision is answered')
    return { decision: ask.decision, answer, question: ask.explanation }
  })
}

/** Makes the right move the way a learner would: Explorer's buttons, Engineer's taps or K. */
async function answerRight(
  user: User,
  level: Level,
  { decision, answer }: ReturnType<typeof decisionsFor>[number],
) {
  if (level === 'explorer') {
    const act = decision.kind === 'new-smallest' ? 'New smallest' : 'Trade places'
    const keep = decision.kind === 'new-smallest' ? 'Keep looking' : 'Keep them'
    await user.click(button(answer.kind === 'keep' ? keep : act))
  } else if (answer.kind === 'pick') {
    await user.click(value(answer.index))
  } else if (answer.kind === 'trade') {
    await user.click(value(answer.pair[1]))
    await user.click(value(answer.pair[0]))
  } else {
    await user.keyboard('k')
  }
}

describe('selection sort: Do it', () => {
  it.each(['explorer', 'engineer'] as const)(
    '%s: a ?mode=do link opens Do it, with the Watch | Do it switch',
    (level) => {
      renderAt(level)
      expect(screen.getByRole('group', { name: 'Mode' })).toBeInTheDocument()
      expect(button('Start')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument()
      expect(document.querySelectorAll('.stage-bar')).toHaveLength(6)
    },
  )

  it('Explorer: asks each comparison, then each round’s move, with their own answers', async () => {
    const user = await start('explorer')
    // 5 2 8 1 9 3: is 2 smaller than 5? Yes.
    expect(question()).toBe('Is 2 smaller than 5, the smallest so far?')
    expect(button('New smallest')).toHaveAttribute('aria-keyshortcuts', 'S')
    expect(button('Keep looking')).toHaveAttribute('aria-keyshortcuts', 'K')
    expect(panel()).toHaveTextContent('If it is, it becomes the new smallest.')
    await user.keyboard('s')
    playOn()
    // Is 8 smaller than 2? No: keep looking.
    expect(question()).toBe('Is 8 smaller than 2, the smallest so far?')
    await user.keyboard('k')
    playOn()
    await user.keyboard('s') // 1
    playOn()
    await user.keyboard('k') // 9
    playOn()
    await user.keyboard('k') // 3
    playOn()
    expect(question()).toBe('The smallest is 1. Move 1 to the front?')
    expect(button('Trade places')).toHaveAttribute('aria-keyshortcuts', 'T')
    expect(button('Keep them')).toBeInTheDocument()
    await user.keyboard('t')
    playOn()
    expect(question()).toBe('Is 8 smaller than 2, the smallest so far?')
  })

  it('Explorer: the help ladder at a comparison, then Show me makes the move', async () => {
    const user = await start('explorer')
    await user.click(button('Help'))
    expect(rungs()).toEqual(['Look at 2 and at the smallest so far, 5.'])
    await user.click(screen.getByRole('button', { name: 'More help' }))
    expect(rungs()).toEqual([
      'Look at 2 and at the smallest so far, 5.',
      'The smaller one becomes the new smallest. If they’re equal, keep looking.',
    ])
    await user.click(screen.getByRole('button', { name: 'Show me' }))
    expect(panel()).toHaveTextContent('Here’s the answer')
    expect(panel()).toHaveTextContent('Yes! 2 is smaller, so 2 is the new smallest.')
  })

  it('Explorer: a wrong move opens the nudge calmly; the help ladder at a round’s move', async () => {
    const user = await start('explorer', [3, 1, 2])
    await user.keyboard('k') // wrong: 1 is smaller than 3
    expect(panel()).toHaveTextContent('Not this time. Have another look.')
    expect(rungs()).toEqual(['Look at 1 and at the smallest so far, 3.'])
    expect(question()).toBe('Is 1 smaller than 3, the smallest so far?')
    await user.keyboard('s')
    playOn()
    await user.keyboard('k') // 2 is not smaller than 1
    playOn()
    expect(question()).toBe('The smallest is 1. Move 1 to the front?')
    await user.keyboard('h')
    expect(rungs()).toEqual([
      'Look at the front spot and at the smallest, 1. Is it already at the front?',
    ])
    await user.keyboard('h')
    expect(rungs()[1]).toBe(
      'The smallest trades places with the front number, unless it’s already there.',
    )
    await user.click(screen.getByRole('button', { name: 'Show me' }))
    expect(panel()).toHaveTextContent('Yes: 1 moves to the front, and 3 takes its old spot.')
  })

  it('equal values: New smallest is wrong, Keep looking is right', async () => {
    const user = await start('explorer', [2, 5, 2])
    await user.keyboard('k') // 5 is not smaller than 2
    playOn()
    expect(question()).toBe('Is 2 smaller than 2, the smallest so far?')
    await user.keyboard('s')
    expect(panel()).toHaveTextContent('Not this time.')
    await user.keyboard('k')
    playOn()
    expect(panel()).not.toHaveTextContent('Not this time.')
    expect(question()).toBe('The smallest is 2. Move 2 to the front?')
  })

  it('already in order: every round’s answer is Keep them', async () => {
    const numbers = [1, 2, 3, 4]
    const toFront = decisionsFor(numbers).filter((d) => d.decision.kind === 'to-front')
    expect(toFront).toHaveLength(3)
    for (const d of toFront) expect(d.answer).toEqual({ kind: 'keep' })
    const user = await start('explorer', numbers)
    for (const d of decisionsFor(numbers)) {
      if (d.decision.kind === 'to-front') {
        await user.keyboard('t')
        expect(panel()).toHaveTextContent('Not this time.')
      }
      await answerRight(user, 'explorer', d)
      playOn()
    }
    expect(isDone()).toBe(true)
  })

  it('Engineer: tap a[j] for a new min, K or the min so far to keep; any two values to swap', async () => {
    const user = await start('engineer', [3, 1, 2])
    expect(panel()).toHaveTextContent('New min: pick a[j]. Not smaller (or equal): Keep min (K).')
    // a[1] = 1 < a[0] = 3: tapping the min so far is a keep, so it's wrong here.
    await user.click(value(0))
    expect(panel()).toHaveTextContent('Not the move the algorithm makes here.')
    await user.click(value(1))
    playOn()
    // a[2] = 2 ≥ a[1] = 1: tapping the min so far keeps it.
    expect(question()).toMatch(/^Is a\[2\] = 2 < a\[min_i\] = a\[1\] = 1\?$/)
    await user.click(value(1))
    playOn()
    expect(panel()).not.toHaveTextContent('Not the move')
    // End of pass 0: swap a[0] and a[1], tapped in either order; Keep order is wrong.
    expect(question()).toMatch(/^End of pass: min_i = 1/)
    expect(button('Keep order')).toBeInTheDocument()
    await user.keyboard('k')
    expect(panel()).toHaveTextContent('Not the move the algorithm makes here.')
    await user.click(value(1))
    await user.click(value(0))
    playOn()
    expect(document.querySelectorAll('.stage-bar-label')[0]).toHaveTextContent('1')
  })

  it.each(['explorer', 'engineer'] as const)(
    '%s: a full playthrough to the finish, with the first-try count only there',
    async (level) => {
      const user = await start(level)
      const decisions = decisionsFor(DEFAULT_INPUT)
      // 15 comparisons and 5 rounds; one wrong move on the first question.
      expect(decisions).toHaveLength(20)
      await user.keyboard('k')
      for (const d of decisions) {
        expect(question()).toBe(d.question[level])
        expect(panel()).not.toHaveTextContent(/first (try|time)/)
        await answerRight(user, level, d)
        playOn()
      }
      expect(isDone()).toBe(true)
      expect(document.querySelectorAll('.stage-bar-label')).toHaveLength(6)
      expect(
        [...document.querySelectorAll('.stage-bar-label')].map((label) => label.textContent),
      ).toEqual(['1', '2', '3', '5', '8', '9'])
      expect(panel()).toHaveTextContent(
        level === 'explorer'
          ? '19 of 20 on the first try!'
          : '19 of 20 decisions right first time.',
      )
    },
  )

  it('phones: the answers replace the player controls', async () => {
    setPhone(true)
    const user = await start('explorer')
    expect(button('New smallest')).toBeInTheDocument()
    expect(within(bar()).getByText('Question 1 of 20')).toBeInTheDocument()
    await user.keyboard('s')
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument()
    setPhone(false)
  })
})
