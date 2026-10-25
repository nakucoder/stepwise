import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import type { Look } from '../preferences/preferences'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { setPhone } from '../test/matchMedia'
import { WorkspacePage } from './WorkspacePage'

/*
 * Changing the numbers with the pizza look on (it carries 1 to 12): numbers outside it always show
 * bars with the message and its button, in Watch and Do it, on a desktop and on a phone; numbers
 * inside it always keep the cart; and the field says "Pizza cart: 1 to 12", with a note while
 * numbers outside it are typed.
 */

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
type Mode = 'watch' | 'do'

function Address() {
  return <output data-testid="address">{useLocation().search}</output>
}

function renderAt(
  level: Level,
  { mode = 'watch', numbers, look = 'character', path = 'quick-sort' } = {} as {
    mode?: Mode
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
const notice = () => document.querySelector<HTMLElement>('.range-notice')
const rankButton = () => screen.queryByRole('button', { name: 'Use 1–12, same order' })
const field = () => screen.getByRole('textbox', { name: 'Your numbers' })
const message = () => document.querySelector('.numbers-message')?.textContent ?? ''
const presets = () => screen.getByRole('group', { name: /^(Presets|Or try)$/ })
const answers = () => screen.getByRole('group', { name: 'Your move' })

/** On a phone the field is in the Numbers sheet: open it if it's closed. */
async function openNumbers(user: User) {
  if (screen.queryByRole('textbox', { name: 'Your numbers' })) return
  await user.click(
    within(screen.getByRole('group', { name: 'Details' })).getByRole('button', {
      name: 'Numbers',
    }),
  )
}

/** Types `text` into the numbers field and runs it (on a phone, from the Numbers sheet). */
async function typeNumbers(user: User, text: string, run = true) {
  await openNumbers(user)
  await user.clear(field())
  await user.type(field(), run ? `${text}{Enter}` : text)
}

/** Out of the 1–12 the cart carries: bars, the message and its button. */
function expectBarsWithMessage() {
  expect(isCart()).toBe(false)
  expect(document.querySelectorAll('.stage-bars .stage-bar').length).toBeGreaterThan(0)
  expect(notice()).toHaveTextContent('The pizza cart carries 1 to 12 boxes.')
  expect(rankButton()).toBeInTheDocument()
}

function expectCart() {
  expect(isCart()).toBe(true)
  expect(notice()).toBeNull()
}

const LEVELS = ['explorer', 'engineer'] as const
const CASES = LEVELS.flatMap((level) =>
  (['watch', 'do'] as const).map((mode): [Level, Mode] => [level, mode]),
)

describe.each([false, true])('the pizza look meets numbers (phone: %s)', (phone) => {
  beforeEach(() => {
    setPhone(phone)
  })

  it.each(CASES)(
    '%s, %s: editing a number to 31 shows bars, the message and the button',
    async (level, mode) => {
      const user = renderAt(level, { mode })
      expectCart()
      await typeNumbers(user, '5 2 11 1 31 3')
      expect(numbersInAddress()).toEqual([5, 2, 11, 1, 31, 3])
      expectBarsWithMessage()
    },
  )

  it.each(CASES)(
    '%s, %s: adding a number above 12 shows the message; removing it brings the cart back',
    async (level, mode) => {
      const user = renderAt(level, { mode })
      await typeNumbers(user, '5 2 8 1 9 3 40')
      expectBarsWithMessage()
      await typeNumbers(user, '5 2 8 1 9 3')
      expectCart()
    },
  )

  it.each(CASES)(
    '%s, %s: removing a number keeps the message while another is still too big',
    async (level, mode) => {
      const user = renderAt(level, { mode, numbers: [5, 2, 11, 1, 31, 13] })
      expectBarsWithMessage()
      await typeNumbers(user, '5 2 11 31 13')
      expectBarsWithMessage()
    },
  )

  it.each(CASES)(
    '%s, %s: each preset brings the cart back from big numbers',
    async (level, mode) => {
      const user = renderAt(level, { mode, numbers: [5, 2, 11, 1, 31, 3] })
      const names =
        level === 'explorer'
          ? ['Mixed up', 'Already in order', 'Backwards', 'Almost in order']
          : ['Random', 'Already sorted', 'Reversed', 'Nearly sorted']
      for (const name of names) {
        await typeNumbers(user, '5 2 11 1 31 3')
        expectBarsWithMessage()
        await openNumbers(user)
        await user.click(within(presets()).getByRole('button', { name }))
        expect(numbersInAddress().every((v) => v >= 1 && v <= 12)).toBe(true)
        expectCart()
      }
    },
  )

  it.each(CASES)(
    '%s, %s: numbers within 1 to 12 keep the cart, adding and removing',
    async (level, mode) => {
      const user = renderAt(level, { mode })
      await typeNumbers(user, '5 2 8 1 9 3 12')
      expectCart()
      await typeNumbers(user, '5 2 8 1')
      expectCart()
      await typeNumbers(user, '12 1')
      expectCart()
    },
  )

  it.each(CASES)('%s, %s: "Use 1–12, same order" brings the cart back', async (level, mode) => {
    const user = renderAt(level, { mode })
    await typeNumbers(user, '5 2 11 1 31 3')
    await user.click(rankButton() as HTMLElement)
    expect(numbersInAddress()).toEqual([4, 2, 5, 1, 6, 3])
    expectCart()
  })

  it.each(LEVELS)(
    '%s, Do it: the message stays through the run, and after a change mid-run',
    async (level) => {
      const user = renderAt(level, { mode: 'do', numbers: [5, 2, 11, 1, 31, 3] })
      expectBarsWithMessage()
      await user.click(within(answers()).getByRole('button', { name: /Start/ }))
      // The steps before the first question play on.
      for (let k = 0; k < 50 && !document.querySelector('.do-it-question'); k++) {
        act(() => {
          vi.advanceTimersByTime(2000)
        })
      }
      expect(document.querySelector('.do-it-question')).not.toBeNull()
      expectBarsWithMessage()
      await user.click(within(answers()).getByRole('button', { name: /Help/ }))
      expectBarsWithMessage()
      // New big numbers mid-run: back to the challenge, still bars with the message.
      await typeNumbers(user, '40 3 9')
      expect(numbersInAddress()).toEqual([40, 3, 9])
      expectBarsWithMessage()
    },
  )
})

describe('where the message sits', () => {
  it('on a desktop: on the stage, in the row that stays on screen while the page scrolls', () => {
    setPhone(false)
    renderAt('explorer', { mode: 'do', numbers: [5, 31] })
    const stage = screen.getByRole('region', { name: 'Visualization' })
    expect(within(stage).getByRole('button', { name: 'Use 1–12, same order' })).toBeVisible()
    expect(notice()?.closest('.stage-top')).toHaveClass('has-notice')
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveClass('visually-hidden')
  })

  it('on a phone: in the band, in place of the title (still read aloud), so the stage keeps its height', () => {
    setPhone(true)
    renderAt('engineer', { mode: 'do', numbers: [5, 31] })
    const band = document.querySelector('.band') as HTMLElement
    expect(within(band).getByRole('button', { name: 'Use 1–12, same order' })).toBeVisible()
    expect(notice()?.closest('.stage')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Quick sort' })).toHaveClass(
      'visually-hidden',
    )
  })

  it('without the message, the title shows as before', () => {
    setPhone(true)
    renderAt('engineer', { mode: 'do' })
    expect(notice()).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveClass('visually-hidden')
    expect(document.querySelector('.band-title')).not.toHaveClass('has-notice')
  })
})

describe('the Numbers field with the pizza look', () => {
  it.each(LEVELS)(
    '%s: says "Pizza cart: 1 to 12" beside the field, and reads it with it',
    (level) => {
      setPhone(false)
      renderAt(level)
      const tag = screen.getByText('Pizza cart: 1 to 12')
      expect(field().getAttribute('aria-describedby')).toContain(tag.id)
    },
  )

  it('says nothing about 1 to 12 with bars, or for another sort', () => {
    setPhone(false)
    renderAt('engineer', { look: 'bars' })
    expect(screen.queryByText(/1 to 12/)).toBeNull()
  })

  it('says nothing about 1 to 12 for a sort whose character carries 0 to 99', () => {
    setPhone(false)
    renderAt('explorer', { path: 'bubble-sort' })
    expect(screen.queryByText(/1 to 12/)).toBeNull()
  })

  it('Explorer: a number outside 1 to 12 gets a friendly note while it is typed, and can still run', async () => {
    setPhone(false)
    const user = renderAt('explorer')
    await typeNumbers(user, '5 2 31', false)
    expect(message()).toBe(
      'The pizza cart carries 1 to 12 boxes. With 31, you’ll see bars instead. Use 1 to 12 to see the pizza cart.',
    )
    expect(field()).not.toHaveAttribute('aria-invalid', 'true')
    await user.type(field(), ' 0')
    expect(message()).toContain('With 31 and 0, you’ll see bars instead.')
    await user.type(field(), '{Enter}')
    expect(numbersInAddress()).toEqual([5, 2, 31, 0])
    // Running, the stage says it: the field's note steps back.
    expect(message()).toBe('')
    expectBarsWithMessage()
  })

  it('Engineer: the note names the numbers outside the range', async () => {
    setPhone(false)
    const user = renderAt('engineer')
    await typeNumbers(user, '13 2 99', false)
    expect(message()).toBe(
      '13 and 99 are outside the pizza cart look’s 1–12, so the stage shows bars. It still runs.',
    )
  })

  it('the note goes when the numbers fit again, and a typing mistake comes first', async () => {
    setPhone(false)
    const user = renderAt('explorer')
    await typeNumbers(user, '5 31', false)
    expect(message()).toContain('With 31')
    await user.clear(field())
    await user.type(field(), '5 12')
    expect(message()).toBe('')
    await user.clear(field())
    await user.type(field(), '5 31 x{Enter}')
    expect(message()).toBe('“x” isn’t a number. Use numbers like 7 3 12.')
  })

  it('on a phone, the Numbers sheet says it too', async () => {
    setPhone(true)
    const user = renderAt('explorer', { mode: 'do' })
    await typeNumbers(user, '5 2 31', false)
    expect(screen.getByText('Pizza cart: 1 to 12')).toBeInTheDocument()
    expect(message()).toContain('With 31, you’ll see bars instead.')
  })
})
