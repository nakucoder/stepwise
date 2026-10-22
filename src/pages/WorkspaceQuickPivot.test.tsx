import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  setPhone(false)
})

/** Shows the router's current search string, so tests can read the address. */
function Address() {
  return <output data-testid="address">{useLocation().search}</output>
}

function renderAt(path: string, level: Level) {
  localStorage.setItem(STORAGE_KEYS.level, level)
  localStorage.setItem(STORAGE_KEYS.look, 'bars')
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
        </Routes>
        <Address />
      </MemoryRouter>
    </PreferencesProvider>,
  )
  return user
}

const SORTED_12 = '1,2,3,4,5,6,7,8,9,10,11,12'
const address = () => screen.getByTestId('address').textContent
const picker = (name: 'Leader' | 'Pivot') => screen.getByRole('group', { name })
const choices = (name: 'Leader' | 'Pivot') =>
  within(picker(name))
    .getAllByRole('button')
    .map((b) => `${b.getAttribute('aria-pressed') === 'true' ? '✓ ' : ''}${b.textContent}`)
const panel = () => document.querySelector('.do-it-panel')
const question = () => document.querySelector('.do-it-question')?.textContent ?? null
const isDone = () => panel()?.classList.contains('is-done') === true
const answerBar = () => screen.getByRole('group', { name: 'Your move' })
const progress = () => screen.getByText(/^Step \d+ of \d+$/)

function playOn() {
  for (let k = 0; k < 50 && !question() && !isDone(); k++) {
    act(() => {
      vi.advanceTimersByTime(2000)
    })
  }
}

describe('quick sort: picking the leader', () => {
  it('Explorer: three choices before Start, the last one by default', () => {
    renderAt(`/sorting/quick-sort?numbers=${SORTED_12}&mode=do`, 'explorer')
    expect(choices('Leader')).toEqual(['✓ The last one', 'The middle one', 'A surprise one'])
    expect(panel()).toHaveTextContent('There are 66 questions.')
  })

  it('Engineer: four choices before Start', () => {
    renderAt(`/sorting/quick-sort?numbers=${SORTED_12}&mode=do`, 'engineer')
    expect(choices('Pivot')).toEqual(['First', '✓ Last', 'Middle', 'Random'])
    expect(panel()).toHaveTextContent('Quick sort makes 66 comparisons here.')
  })

  it('reads ?pivot= from the address', () => {
    renderAt(`/sorting/quick-sort?numbers=${SORTED_12}&mode=do&pivot=middle`, 'explorer')
    expect(choices('Leader')).toEqual(['The last one', '✓ The middle one', 'A surprise one'])
    expect(panel()).toHaveTextContent('There are 25 questions.')
  })

  it.each(['banana', '', 'MIDDLE'])('falls back to the last one for ?pivot=%s', (value) => {
    renderAt(`/sorting/quick-sort?numbers=${SORTED_12}&mode=do&pivot=${value}`, 'engineer')
    expect(choices('Pivot')).toEqual(['First', '✓ Last', 'Middle', 'Random'])
    expect(panel()).toHaveTextContent('66 comparisons')
  })

  it('a rule Explorer doesn’t offer, from a link, still shows and stays chosen', () => {
    renderAt(`/sorting/quick-sort?numbers=${SORTED_12}&mode=do&pivot=first`, 'explorer')
    expect(choices('Leader')).toEqual([
      '✓ The first one',
      'The last one',
      'The middle one',
      'A surprise one',
    ])
  })

  it('a choice writes ?pivot= and keeps the numbers and the mode; the challenge follows', async () => {
    const user = renderAt(`/sorting/quick-sort?numbers=${SORTED_12}&mode=do`, 'explorer')
    expect(address()).toBe(`?numbers=${SORTED_12}&mode=do`)
    await user.click(within(picker('Leader')).getByRole('button', { name: 'The middle one' }))
    expect(address()).toBe(`?numbers=${SORTED_12}&mode=do&pivot=middle`)
    expect(panel()).toHaveTextContent('There are 25 questions.')
    // Switching to Watch keeps the rule.
    await user.click(
      within(screen.getByRole('group', { name: 'Mode' })).getByRole('button', { name: 'Watch' }),
    )
    expect(address()).toBe(`?numbers=${SORTED_12}&pivot=middle`)
    expect(choices('Leader')).toEqual(['The last one', '✓ The middle one', 'A surprise one'])
  })

  it('Watch: a new rule starts the run over, with its own steps', async () => {
    const user = renderAt('/sorting/quick-sort?numbers=1,2,3,4,5,6', 'engineer')
    expect(progress()).toHaveTextContent('Step 1 of 43')
    await user.click(screen.getByRole('button', { name: /Step/ }))
    await user.click(screen.getByRole('button', { name: /Step/ }))
    expect(progress()).toHaveTextContent('Step 3 of 43')
    await user.click(within(picker('Pivot')).getByRole('button', { name: 'Middle' }))
    expect(address()).toBe('?numbers=1,2,3,4,5,6&pivot=middle')
    // Middle: fewer questions, and a visible move to the end, so a different run.
    expect(progress()).toHaveTextContent(/^Step 1 of (?!43)\d+$/)
  })

  it('Do it: Start hides the choice; the finish compares the rules, never a grade', async () => {
    // 1 2 3 with the last as leader: 3 questions (all left); the middle one takes 2.
    const user = renderAt('/sorting/quick-sort?numbers=1,2,3&mode=do', 'explorer')
    await user.click(within(answerBar()).getByRole('button', { name: 'Start' }))
    playOn()
    expect(screen.queryByRole('group', { name: 'Leader' })).not.toBeInTheDocument()
    for (let k = 0; k < 3; k++) {
      await user.keyboard('l')
      playOn()
    }
    expect(isDone()).toBe(true)
    expect(panel()).toHaveTextContent('All 3 on the first try! A perfect run.')
    expect(panel()).toHaveTextContent(
      'With the last one as leader: 3 questions. Try the middle one: 2!',
    )
  })

  it('Do it: no suggestion when the chosen rule is already the fewest', async () => {
    const user = renderAt('/sorting/quick-sort?numbers=1,2,3&mode=do&pivot=middle', 'explorer')
    await user.click(within(answerBar()).getByRole('button', { name: 'Start' }))
    playOn()
    // 1 goes left, then 3 stays right.
    await user.keyboard('l')
    playOn()
    await user.keyboard('r')
    playOn()
    expect(isDone()).toBe(true)
    expect(panel()).toHaveTextContent('With the middle one as leader: 2 questions.')
    expect(panel()).not.toHaveTextContent('Try')
  })

  it.each([true, false])(
    'phone %s: the finish says where to change the leader only on a phone',
    async (phone) => {
      setPhone(phone)
      const user = renderAt('/sorting/quick-sort?numbers=1,2,3&mode=do', 'explorer')
      await user.click(within(answerBar()).getByRole('button', { name: 'Start' }))
      playOn()
      for (let k = 0; k < 3; k++) {
        await user.keyboard('l')
        playOn()
      }
      expect(isDone()).toBe(true)
      expect(panel()).toHaveTextContent(
        phone
          ? 'With the last one as leader: 3 questions. Try the middle one: 2! Change it in Numbers.'
          : 'With the last one as leader: 3 questions. Try the middle one: 2!',
      )
      if (!phone) expect(panel()).not.toHaveTextContent('Change it in')
    },
  )

  it('phones: the choice is in the Numbers sheet', async () => {
    setPhone(true)
    const user = renderAt('/sorting/quick-sort?mode=do', 'explorer')
    const pills = within(screen.getByRole('group', { name: 'Details' }))
    await user.click(pills.getByRole('button', { name: 'Numbers' }))
    const sheet = document.querySelector('.sheet') as HTMLElement
    expect(within(sheet).getByRole('group', { name: 'Leader' })).toBeInTheDocument()
  })
})

describe('the other sorts: no pivot to choose', () => {
  it.each(['bubble-sort', 'selection-sort', 'insertion-sort', 'merge-sort'])(
    '%s shows no choice in Watch or Do it, and ignores ?pivot=',
    async (sort) => {
      const user = renderAt(`/sorting/${sort}?pivot=middle`, 'explorer')
      expect(document.querySelector('.pivot-picker')).toBeNull()
      await user.click(
        within(screen.getByRole('group', { name: 'Mode' })).getByRole('button', { name: 'Do it' }),
      )
      expect(document.querySelector('.pivot-picker')).toBeNull()
      // Never written back for a sort without pivot rules.
      expect(address()).toBe('?mode=do')
    },
  )
})
