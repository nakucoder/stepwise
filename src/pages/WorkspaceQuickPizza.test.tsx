import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { quickSort } from '../algorithms/sorting/quickSort'
import { pizzaHoldMs } from '../characters/pizzaCart/steps'
import { CHARACTERS } from '../characters/registry'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import { answerAt, decisionIndexes } from '../engine/decision'
import { presetNumbers, rankNumbers } from '../engine/input'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import type { Look } from '../preferences/preferences'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { WorkspacePage } from './WorkspacePage'

// Testing Library drains pending work with a zero-length timer through a global `jest`.
const jestShim = { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) }

beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { jest: jestShim })
  // jsdom has no layout: every box is the desktop's stage field, so the scene draws.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 698,
    height: 163,
    top: 0,
    left: 0,
    right: 698,
    bottom: 163,
  } as DOMRect)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'jest')
})

type User = ReturnType<typeof userEvent.setup>

/** Shows the router's current search string, so tests can read the address. */
function Address() {
  return <output data-testid="address">{useLocation().search}</output>
}

function renderAt(
  level: Level,
  { mode = 'watch', numbers, look = 'character', path = 'quick-sort' } = {} as {
    mode?: 'watch' | 'do'
    numbers?: readonly number[]
    look?: Look
    path?: string
  },
) {
  localStorage.setItem(STORAGE_KEYS.level, level)
  localStorage.setItem(STORAGE_KEYS.look, look)
  const query = [numbers && `numbers=${numbers.join(',')}`, mode === 'do' && 'mode=do'].filter(
    Boolean,
  )
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(
    <PreferencesProvider>
      <MemoryRouter
        initialEntries={[`/sorting/${path}${query.length ? `?${query.join('&')}` : ''}`]}
      >
        <Routes>
          <Route
            path=":categoryId/:algorithmId"
            element={
              <>
                <WorkspacePage />
                <Address />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
  return user
}

const numbersInAddress = () =>
  (new URLSearchParams(screen.getByTestId('address').textContent).get('numbers') ?? '')
    .split(',')
    .filter(Boolean)
    .map(Number)
const isCart = () => document.querySelector('.stage-view')?.classList.contains('is-pizza-cart')
const barCount = () => document.querySelectorAll('.stage-bars .stage-bar').length
const notice = () => document.querySelector('.range-notice')
/** The stacks' digits, left to right (each stack keeps its own element as it moves). */
const stackDigits = () =>
  [...document.querySelectorAll<HTMLElement>('.pizza-stack')]
    .map((stack) => ({
      x: Number(/translate\((-?[\d.]+)px/.exec(stack.style.transform)?.[1]),
      value: Number(stack.querySelector('.pizza-digit')?.textContent),
    }))
    .sort((a, b) => a.x - b.x)
    .map(({ value }) => value)
const bar = () => screen.getByRole('group', { name: 'Your move' })
const button = (name: string) => within(bar()).getByRole('button', { name })
const question = () => document.querySelector('.do-it-question')?.textContent ?? null
const isDone = () => document.querySelector('.do-it-panel')?.classList.contains('is-done') === true
const values = () => within(screen.getByRole('group', { name: /^Values/ })).getAllByRole('button')
const action = () => document.querySelector<HTMLElement>('.pizza-cart')?.dataset.action
const step = () =>
  Number(/Step (\d+)/.exec(document.querySelector('.progress')?.textContent ?? '')?.[1])

const BIG = [42, 7, 19, 88, 3, 64, 25, 51, 13, 76, 30, 9]
const SPEC = [7, 2, 11, 5, 1, 9, 12, 4, 7, 10, 6, 8]

describe('quick sort with the pizza cart', () => {
  it('is quick sort’s character: Pizza cart on the Show as switch, drawn on the stage', () => {
    renderAt('explorer')
    expect(CHARACTERS.pizzaCart.name).toBe('Pizza cart')
    expect(CHARACTERS.pizzaCart.holdMs).toBe(pizzaHoldMs)
    expect(screen.getByRole('button', { name: /Pizza cart/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(isCart()).toBe(true)
    expect(stackDigits()).toEqual(DEFAULT_INPUT)
    expect(notice()).toBeNull()
  })

  it('switches to bars and back: same numbers, no message', async () => {
    const user = renderAt('engineer', { numbers: SPEC })
    await user.click(screen.getByRole('button', { name: 'Bars' }))
    expect(isCart()).toBe(false)
    expect(barCount()).toBe(12)
    await user.click(screen.getByRole('button', { name: /Pizza cart/ }))
    expect(isCart()).toBe(true)
    expect(stackDigits()).toEqual(SPEC)
  })
})

describe('the pizza look uses 1 to 12; bars keep 0 to 99', () => {
  it.each(['explorer', 'engineer'] as const)(
    '%s: big numbers from a link keep bars, with the message and the button',
    (level) => {
      renderAt(level, { numbers: BIG })
      expect(isCart()).toBe(false)
      expect(barCount()).toBe(12)
      expect(notice()).toHaveTextContent('The pizza cart carries 1 to 12 boxes.')
      expect(within(notice() as HTMLElement).getByRole('button')).toHaveTextContent(
        'Use 1–12, same order',
      )
      // The learner's numbers are kept, never swapped silently.
      expect(numbersInAddress()).toEqual(BIG)
    },
  )

  it('a 0 is outside the pizza look too', () => {
    renderAt('engineer', { numbers: [0, 3, 1] })
    expect(isCart()).toBe(false)
    expect(notice()).not.toBeNull()
  })

  it('switching to the pizza look with big numbers keeps bars and says why', async () => {
    const user = renderAt('engineer', { numbers: BIG, look: 'bars' })
    expect(notice()).toBeNull()
    await user.click(screen.getByRole('button', { name: /Pizza cart/ }))
    expect(screen.getByRole('button', { name: /Pizza cart/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(isCart()).toBe(false)
    expect(notice()).toHaveTextContent('The pizza cart carries 1 to 12 boxes.')
  })

  it('typed big numbers are kept, with bars and the message', async () => {
    const user = renderAt('explorer')
    const field = screen.getByRole('textbox', { name: 'Your numbers' })
    await user.clear(field)
    await user.type(field, '50 20 90{Enter}')
    expect(numbersInAddress()).toEqual([50, 20, 90])
    expect(isCart()).toBe(false)
    expect(notice()).not.toBeNull()
  })

  it('"Use 1–12, same order" swaps each number for its rank: the cart, same comparisons and swaps', async () => {
    const user = renderAt('engineer', { numbers: BIG })
    await user.click(screen.getByRole('button', { name: 'Use 1–12, same order' }))
    const ranks = rankNumbers(BIG)
    expect(numbersInAddress()).toEqual(ranks)
    expect(ranks).toEqual([8, 2, 5, 12, 1, 10, 6, 9, 4, 11, 7, 3])
    expect(isCart()).toBe(true)
    expect(notice()).toBeNull()
    // Focus stays on the page, not lost with the button.
    expect(document.getElementById('main')).toHaveFocus()
    const before = collectFrames(quickSort, BIG).frames
    const after = collectFrames(quickSort, ranks).frames
    expect(after.map((f) => f.stats)).toEqual(before.map((f) => f.stats))
    expect(after.map((f) => f.partition)).toEqual(before.map((f) => f.partition))
  })

  it('bars take any 0–99 with no message', () => {
    renderAt('engineer', { numbers: BIG, look: 'bars' })
    expect(barCount()).toBe(12)
    expect(notice()).toBeNull()
  })

  it('other sorts don’t change: bubble sort’s ducks carry big numbers', () => {
    renderAt('engineer', { numbers: BIG, path: 'bubble-sort' })
    expect(document.querySelector('.stage-view')).toHaveClass('is-ducks')
    expect(notice()).toBeNull()
  })
})

describe('presets pick from 1 to 12 for the pizza look', () => {
  const preset = (name: string) =>
    within(screen.getByRole('group', { name: /^(Presets|Or try)$/ })).getByRole('button', { name })

  it('Explorer: "Mixed up" is a shuffle of 1 to 12, "Already in order" a staircase', async () => {
    const user = renderAt('explorer', { numbers: SPEC })
    await user.click(preset('Mixed up'))
    expect([...numbersInAddress()].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 12 }, (_, k) => k + 1),
    )
    expect(isCart()).toBe(true)
    await user.click(preset('Already in order'))
    expect(numbersInAddress()).toEqual(Array.from({ length: 12 }, (_, k) => k + 1))
    await user.click(preset('Backwards'))
    expect(numbersInAddress()).toEqual(Array.from({ length: 12 }, (_, k) => 12 - k))
  })

  it('from big numbers, a preset brings the cart back', async () => {
    const user = renderAt('engineer', { numbers: BIG })
    await user.click(preset('Random'))
    expect(numbersInAddress().every((v) => v >= 1 && v <= 12)).toBe(true)
    expect(isCart()).toBe(true)
  })

  it('keeps the count, and picks from 1 to 99 with bars (as before)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const user = renderAt('engineer', { look: 'bars' })
    await user.click(preset('Random'))
    expect(numbersInAddress()).toEqual(presetNumbers('random', 6, () => 0.99))
    expect(Math.max(...numbersInAddress())).toBeGreaterThan(12)
    await user.click(screen.getByRole('button', { name: /Pizza cart/ }))
    await user.click(preset('Random'))
    expect(numbersInAddress()).toHaveLength(6)
    expect(numbersInAddress().every((v) => v >= 1 && v <= 12)).toBe(true)
  })
})

describe('playthroughs with the cart', () => {
  /** Plays the steps between questions until the next question, or the finish. */
  function playOn() {
    for (let k = 0; k < 50 && !question() && !isDone(); k++) {
      act(() => {
        vi.advanceTimersByTime(2000)
      })
    }
  }

  it.each(['explorer', 'engineer'] as const)(
    '%s, Watch: plays to the end, through every moment, waiting for "Delivered!"',
    async (level) => {
      const user = renderAt(level, { numbers: SPEC })
      const frames = collectFrames(quickSort, SPEC).frames
      const seen = new Set<string>()
      await user.click(screen.getByRole('button', { name: 'Play' }))
      for (let k = 0; k < 400 && step() < frames.length; k++) {
        const at = step()
        seen.add(action() ?? '')
        act(() => {
          vi.advanceTimersByTime(800)
        })
        // "Delivered!" holds its frame two steps at 1×.
        if (action() === 'deliver' && step() === at + 1) {
          act(() => {
            vi.advanceTimersByTime(800)
          })
          expect(step()).toBe(at + 1)
        }
      }
      seen.add(action() ?? '')
      expect([...seen].sort()).toEqual(
        ['carry', 'deliver', 'done', 'finale', 'idle', 'look', 'nudge', 'pick', 'stay'].sort(),
      )
      expect(document.querySelectorAll('.pizza-stack.is-sorted')).toHaveLength(12)
      expect(stackDigits()).toEqual([...SPEC].sort((a, b) => a - b))
    },
    // Every step of a 12-value run: about 1.5 s here, CI's runners are over 3 times slower.
    20_000,
  )

  /** Each decision in order: its pair (the wall and the value) and the side. */
  const DECISIONS = (() => {
    const { frames } = collectFrames(quickSort, SPEC)
    return decisionIndexes(frames).map((k) => {
      const ask = frames[k]
      const answer = answerAt(frames, k)
      if (ask?.decision?.kind !== 'left-or-right' || !answer) throw new Error('left or right')
      const [i, j] = ask.decision.pair
      return { i, j, left: answer.kind === 'trade', ask }
    })
  })()

  async function answerRight(user: User, level: Level, d: (typeof DECISIONS)[number]) {
    if (level === 'explorer') await user.keyboard(d.left ? 'l' : 'r')
    else if (!d.left) await user.click(button('Keep order'))
    else {
      await user.click(values()[d.j] as HTMLElement)
      await user.click(values()[d.i] as HTMLElement)
    }
  }

  it.each(['explorer', 'engineer'] as const)(
    '%s, Do it: every question right to the finish, the cart looking at each one',
    async (level) => {
      const user = renderAt(level, { numbers: SPEC, mode: 'do' })
      await user.click(button('Start'))
      playOn()
      for (const d of DECISIONS) {
        expect(question()).toBe(d.ask.explanation[level])
        expect(action()).toBe('look')
        await answerRight(user, level, d)
        // The cart's mood follows the learner's move.
        expect(['carry', 'nudge', 'stay']).toContain(action())
        playOn()
      }
      expect(isDone()).toBe(true)
      expect(isCart()).toBe(true)
      expect(document.querySelectorAll('.pizza-stack.is-sorted')).toHaveLength(12)
    },
    // Every answer of a 12-value run: about 2 s here, over 5 s on CI's runners.
    20_000,
  )
})
