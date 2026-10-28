import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { heapSort } from '../algorithms/sorting/heapSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import { answerAt, askedAt, decisionIndexes } from '../engine/decision'
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
      <MemoryRouter initialEntries={[`/sorting/heap-sort?numbers=${numbers.join(',')}&mode=do`]}>
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
const tiles = () => document.querySelector('.stats.challenge')
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

/** Each question asked at this level, in order: the parent, the child, climb or stop, the words. */
function decisionsFor(level: Level, numbers: readonly number[] = DEFAULT_INPUT) {
  const frames = askedAt(collectFrames(heapSort, numbers).frames, level)
  return decisionIndexes(frames).map((k) => {
    const ask = frames[k]
    const answer = answerAt(frames, k)
    if (ask?.decision?.kind !== 'sift-or-stop' || !answer) throw new Error('sift or stop')
    const [parent, child] = ask.decision.pair
    return { parent, child, climbs: answer.kind === 'trade', question: ask.explanation[level] }
  })
}

/** Makes the right move the way a learner would: Explorer's buttons, Engineer's taps or Stop. */
async function answerRight(
  user: User,
  level: Level,
  { child, climbs }: ReturnType<typeof decisionsFor>[number],
) {
  if (level === 'explorer') await user.click(button(climbs ? 'Climb up' : 'Stay on top'))
  else if (climbs) await user.click(value(child))
  else await user.click(button('Stop'))
}

describe('heap sort: Do it', () => {
  it.each(['explorer', 'engineer'] as const)(
    '%s: a ?mode=do link opens Do it, with the Watch | Do it switch',
    (level) => {
      renderAt(level)
      expect(screen.getByRole('group', { name: 'Mode' })).toBeInTheDocument()
      expect(button('Start')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument()
    },
  )

  it('Explorer watches the build: the first question comes once the pyramid is built and its top has gone to the end', async () => {
    const user = await start('explorer')
    // Built: 9 5 8 1 2 3; then 9 trades places with 3, the last one.
    expect(numbersOnStage()).toEqual(['3', '5', '8', '1', '2', '9'])
    expect(question()).toBe('Does 8, the bigger one under 3, climb up?')
    expect(tiles()).toHaveTextContent('Questions0 of 5')
    expect(button('Climb up')).toHaveAttribute('aria-keyshortcuts', 'T')
    expect(button('Stay on top')).toHaveAttribute('aria-keyshortcuts', 'K')
    // Right answers move on.
    await user.keyboard('t')
    playOn()
    expect(numbersOnStage()).toEqual(['2', '5', '3', '1', '8', '9'])
    expect(question()).toBe('Does 5, the bigger one under 2, climb up?')
    expect(tiles()).toHaveTextContent('Questions1 of 5')
    // Every trade counts, asked or not: 2 in the build, 9 to the end, 8 climbing up, 2 to the end.
    expect(tiles()).toHaveTextContent('Trades5 of 11')
  })

  it('Engineer answers both phases: the first question is the build’s, 9 in all', async () => {
    await start('engineer')
    expect(question()).toBe('only child a[5] = 3 > a[2] = 8?')
    expect(numbersOnStage()).toEqual(['5', '2', '8', '1', '9', '3'])
    expect(tiles()).toHaveTextContent('Sift steps0 of 9')
    expect(panel()).toHaveTextContent(
      'a[largest] > a[i]: tap the child that climbs. Otherwise Stop (K).',
    )
    expect(button('Stop')).toHaveAttribute('aria-keyshortcuts', 'K')
  })

  it('a wrong answer opens the nudge calmly and asks again; the ladder ends with Show me', async () => {
    const user = await start('explorer')
    const first = question()
    await user.keyboard('k') // wrong: 8 is bigger than 3
    expect(panel()).toHaveTextContent('Not this time. Have another look.')
    expect(rungs()).toEqual(['Look at 3 and the bigger one under it, 8.'])
    expect(question()).toBe(first)
    expect(numbersOnStage()).toEqual(['3', '5', '8', '1', '2', '9'])
    await user.click(screen.getByRole('button', { name: 'More help' }))
    expect(rungs()).toEqual([
      'Look at 3 and the bigger one under it, 8.',
      'In the pyramid, each number must be at least as big as the two under it. The bigger one climbs up only if it is bigger than the one on top; the same or smaller, the top stays.',
    ])
    await user.click(screen.getByRole('button', { name: 'Show me' }))
    expect(panel()).toHaveTextContent('Here’s the answer')
    expect(panel()).toHaveTextContent('Yes: 8 is bigger, so it climbs up and 3 goes down.')
    playOn()
    expect(numbersOnStage()).toEqual(['2', '5', '3', '1', '8', '9'])
  })

  it('Engineer: tapping the smaller child is rejected; the bigger child climbs; K stops', async () => {
    const user = await start('engineer')
    await user.keyboard('k') // 3 is smaller than 8: stop
    playOn()
    // heapify(a, 1, 6): children a[3] = 1 and a[4] = 9; 9 is the bigger.
    expect(values().map((b) => b.getAttribute('aria-label'))).toEqual([
      'a[0] = 5',
      'a[1] = 2, comparing',
      'a[2] = 8',
      'a[3] = 1',
      'a[4] = 9, comparing',
      'a[5] = 3',
    ])
    await user.click(value(3)) // the smaller child
    expect(panel()).toHaveTextContent('Not the move the algorithm makes here.')
    expect(numbersOnStage()).toEqual(['5', '2', '8', '1', '9', '3'])
    await user.click(value(4))
    playOn()
    expect(numbersOnStage()).toEqual(['5', '9', '8', '1', '2', '3'])
    expect(tiles()).toHaveTextContent('Sift steps2 of 9')
  })

  it('the tree highlights the same values as the bars at a question', async () => {
    await start('explorer')
    const marked = (selector: string, label: string) =>
      [...document.querySelectorAll(selector)].map((el) => el.querySelector(label)?.textContent)
    expect(marked('.stage-bar.is-comparing', '.stage-bar-label')).toEqual(['3', '8'])
    expect(marked('.heap-tree-node.is-comparing', '.heap-tree-value')).toEqual(['3', '8'])
  })

  it.each(['explorer', 'engineer'] as const)(
    '%s: a full playthrough to the finish, with the first-try count only there',
    async (level) => {
      const user = await start(level)
      const decisions = decisionsFor(level)
      expect(decisions).toHaveLength(level === 'explorer' ? 5 : 9)
      // One wrong move on the first question.
      if (level === 'explorer') await user.keyboard('k')
      else await user.click(value(4)) // not a child of a[2]: wrong
      for (const d of decisions) {
        expect(question()).toBe(d.question)
        expect(panel()).not.toHaveTextContent(/first (try|time)/)
        await answerRight(user, level, d)
        playOn()
      }
      expect(isDone()).toBe(true)
      expect(numbersOnStage()).toEqual(['1', '2', '3', '5', '8', '9'])
      expect(panel()).toHaveTextContent(
        level === 'explorer' ? '4 of 5 on the first try!' : '8 of 9 decisions right first time.',
      )
    },
  )
})
