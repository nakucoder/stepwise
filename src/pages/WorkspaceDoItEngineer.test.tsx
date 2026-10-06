import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function renderEngineer(path = '/sorting/bubble-sort') {
  localStorage.setItem(STORAGE_KEYS.level, 'engineer')
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
  return user
}

const bar = () => screen.getByRole('group', { name: 'Your move' })
const values = () => screen.getByRole('group', { name: /^Values/ })
const value = (k: number) => within(values()).getAllByRole('button')[k] as HTMLElement
const panel = () => document.querySelector('.do-it-panel')
const question = () => document.querySelector('.do-it-question')?.textContent ?? null
const numbersOnStage = () => document.querySelector('.stage-view > .visually-hidden')?.textContent
const liveRegion = () => document.querySelector('.visually-hidden[aria-live="polite"][aria-atomic]')

function playOn() {
  for (let k = 0; k < 50 && !question() && !panel()?.classList.contains('is-done'); k++) {
    act(() => {
      vi.advanceTimersByTime(2000)
    })
  }
}

async function start(path = '/sorting/bubble-sort?mode=do') {
  const user = renderEngineer(path)
  await user.click(within(bar()).getByRole('button', { name: 'Start' }))
  playOn()
  return user
}

/** The comparison on screen: positions and values. */
function current() {
  const m = /Compare a\[(\d+)\] = (-?\d+) with a\[(\d+)\] = (-?\d+)/.exec(question() ?? '')
  if (!m) throw new Error(`no comparison on screen: ${String(panel()?.textContent)}`)
  return { i: Number(m[1]), left: Number(m[2]), j: Number(m[3]), right: Number(m[4]) }
}

/** Makes every decision by picking (swaps) or K (keeps); `wrongAt` keeps once where a swap is due. */
async function decideAll(user: ReturnType<typeof userEvent.setup>, wrongAt: number[] = []) {
  for (let q = 0; q < 100; q++) {
    playOn()
    if (panel()?.classList.contains('is-done')) return
    const { i, j, left, right } = current()
    if (left > right) {
      if (wrongAt.includes(q)) await user.keyboard('k')
      await user.click(value(i))
      await user.click(value(j))
    } else {
      await user.keyboard('k')
    }
  }
}

describe('Engineer Do it: the switch and the challenge', () => {
  it('Engineer gets the Watch / Do it switch too', async () => {
    const user = renderEngineer()
    const modes = screen.getByRole('group', { name: 'Mode' })
    await user.click(within(modes).getByRole('button', { name: 'Do it' }))
    expect(panel()).toHaveTextContent(
      'You make every decision for these 6 values: swap the pair, or keep its order.',
    )
    expect(panel()).toHaveTextContent('Bubble sort makes 7 swaps here. Can you find every one?')
  })

  it('a question names the comparison; the values are buttons; there is no Trade button', async () => {
    await start()
    expect(question()).toBe('Compare a[0] = 5 with a[1] = 2: is a[j] > a[j+1]?')
    expect(
      within(values())
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual([
      'a[0] = 5, comparing',
      'a[1] = 2, comparing',
      'a[2] = 8',
      'a[3] = 1',
      'a[4] = 9',
      'a[5] = 3',
    ])
    expect(within(bar()).queryByRole('button', { name: /Trade/ })).toBeNull()
    expect(within(bar()).getByRole('button', { name: /Keep order/ })).toBeInTheDocument()
    expect(screen.getByText('Swaps').nextElementSibling).toHaveTextContent('0 of 7')
  })
})

describe('Engineer Do it: picking and swapping', () => {
  it('pick a value, then its neighbor: the swap is checked and made', async () => {
    const user = await start()
    await user.click(value(0))
    expect(value(0)).toHaveAttribute('aria-pressed', 'true')
    expect(panel()).toHaveTextContent('a[0] = 5 picked. Pick a neighbor to swap with it')
    await user.click(value(1))
    expect(panel()).toHaveTextContent('Correct.')
    expect(panel()).toHaveTextContent('5 > 2, so swap a[0] and a[1]; swapped = True.')
    expect(numbersOnStage()).toContain('2, 5, 8, 1, 9, 3')
  })

  it('picking a value that is not a neighbor moves the pick; the same value lets go', async () => {
    const user = await start()
    await user.click(value(0))
    await user.click(value(3))
    expect(value(0)).toHaveAttribute('aria-pressed', 'false')
    expect(value(3)).toHaveAttribute('aria-pressed', 'true')
    expect(panel()).not.toHaveTextContent('Not the move')
    await user.click(value(3))
    expect(value(3)).toHaveAttribute('aria-pressed', 'false')
  })

  it('Escape lets go of a picked value', async () => {
    const user = await start()
    await user.click(value(1))
    await user.keyboard('{Escape}')
    expect(value(1)).toHaveAttribute('aria-pressed', 'false')
  })

  it('swapping the wrong pair is a wrong move: nothing moves, the nudge opens', async () => {
    const user = await start()
    await user.click(value(1))
    await user.click(value(2))
    expect(numbersOnStage()).toContain('5, 2, 8, 1, 9, 3')
    expect(panel()).toHaveTextContent('Not the move the algorithm makes here.')
    expect(panel()).toHaveTextContent('Only a[j] and a[j+1] matter here: a[0] = 5 and a[1] = 2.')
  })

  it('Keep order where a swap is due is a wrong move too; More help gives the rule', async () => {
    const user = await start()
    await user.click(within(bar()).getByRole('button', { name: /Keep order/ }))
    expect(panel()).toHaveTextContent('Not the move the algorithm makes here.')
    await user.click(screen.getByRole('button', { name: 'More help' }))
    expect(panel()).toHaveTextContent('Swap when a[j] > a[j+1].')
  })

  it('between questions the values wait (aria-disabled) and do nothing', async () => {
    const user = await start()
    await user.click(value(0))
    await user.click(value(1))
    expect(value(2)).toHaveAttribute('aria-disabled', 'true')
    await user.click(value(2))
    expect(value(2)).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('Engineer Do it: keyboard and screen readers', () => {
  it('the values are one tab stop: arrows move, Enter picks; K keeps; T does nothing', async () => {
    const user = await start()
    expect(
      within(values())
        .getAllByRole('button')
        .filter((b) => b.tabIndex === 0),
    ).toHaveLength(1)
    act(() => {
      value(0).focus()
    })
    await user.keyboard('t')
    expect(panel()).not.toHaveTextContent('Correct.')
    await user.keyboard('{Enter}')
    expect(value(0)).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{ArrowRight}')
    expect(value(1)).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(panel()).toHaveTextContent('Correct.')
    playOn()
    // 5 vs 8: keep.
    await user.keyboard('k')
    expect(panel()).toHaveTextContent('Correct.')
  })

  it('announces the pick, each result and the finish', async () => {
    const user = await start()
    await user.click(value(0))
    expect(liveRegion()).toHaveTextContent('a[0] = 5 picked.')
    await user.click(value(1))
    expect(liveRegion()).toHaveTextContent('Correct. 5 > 2, so swap a[0] and a[1]')
    await decideAll(user)
    expect(liveRegion()).toHaveTextContent('Sorted.')
  })
})

describe('Engineer Do it: the finish', () => {
  it('a perfect run: the swaps and comparisons, bubble sort’s exact path', async () => {
    const user = await start()
    await decideAll(user)
    expect(panel()).toHaveTextContent('Sorted.')
    expect(panel()).toHaveTextContent('7 swaps and 14 comparisons: exactly bubble sort’s path.')
    expect(panel()).toHaveTextContent('All 14 decisions right first time. A perfect run.')
  })

  it('with a miss: the first-time count, and an invitation, never a grade', async () => {
    const user = await start()
    await decideAll(user, [0])
    expect(panel()).toHaveTextContent('13 of 14 decisions right first time.')
    expect(panel()).toHaveTextContent('Run it again for a perfect run?')
  })
})

describe('Engineer Do it: phones', () => {
  it('Keep order and Help at the bottom, the switch in the band, values on the stage', async () => {
    setPhone(true)
    await start()
    expect(within(bar()).getByRole('button', { name: /Keep order/ })).toBeInTheDocument()
    expect(within(bar()).getByRole('button', { name: /Help/ })).toBeInTheDocument()
    expect(within(bar()).queryByRole('button', { name: /Trade/ })).toBeNull()
    expect(screen.getByRole('group', { name: 'Mode' })).toBeInTheDocument()
    expect(within(values()).getAllByRole('button')).toHaveLength(6)
  })
})
