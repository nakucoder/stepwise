import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { heapSort } from '../algorithms/sorting/heapSort'
import { collectFrames } from '../engine/collect'
import { answerAt, askedAt, decisionIndexes } from '../engine/decision'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import type { Look } from '../preferences/preferences'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { setPhone } from '../test/matchMedia'
import { WorkspacePage } from './WorkspacePage'

/*
 * Heap sort with the builder beaver (design/mockups/builder-beaver/README.md): its look on the
 * stage and the switch, its dam (beside the stacks on a desktop, over the band on a phone), the
 * log look's 1 to 12 (the message, "Use 1–12, same order", the field's tag, the presets), and a
 * whole run in Watch and in Do it at both levels.
 */

// Testing Library drains pending work with a zero-length timer through a global `jest`.
const jestShim = { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) }

beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { jest: jestShim })
  setPhone(false)
  // jsdom has no layout: every box is the desktop's stage field, so the scene and its dam draw.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 436,
    height: 253,
    top: 0,
    left: 0,
    right: 436,
    bottom: 253,
  } as DOMRect)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'jest')
})

type User = ReturnType<typeof userEvent.setup>

/** The spec's numbers: 1 to 12, mixed up. */
const SPEC = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8]

function Address() {
  return <output data-testid="address">{useLocation().search}</output>
}

function renderAt(
  level: Level,
  { mode = 'watch', numbers, look = 'character' } = {} as {
    mode?: 'watch' | 'do'
    numbers?: readonly number[]
    look?: Look
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
        initialEntries={[`/sorting/heap-sort${query.length ? `?${query.join('&')}` : ''}`]}
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
const isBeaver = () => document.querySelector('.stage-view')?.classList.contains('is-beaver')
const notice = () => document.querySelector<HTMLElement>('.range-notice')
const rankButton = () => screen.queryByRole('button', { name: 'Use 1–12, same order' })
const field = () => screen.getByRole('textbox', { name: 'Your numbers' })
const presets = () => screen.getByRole('group', { name: /^(Presets|Or try)$/ })
/** The numbers on the plates, column by column (the stacks are drawn stack by stack). */
const plates = () =>
  [...document.querySelectorAll<HTMLElement>('.beaver-stack')]
    .sort((a, b) => Number(a.dataset.col) - Number(b.dataset.col))
    .map((stack) => Number(stack.querySelector('.beaver-plate')?.textContent))
const damLogs = () =>
  [...document.querySelectorAll<HTMLElement>('.beaver-dam-log')]
    .filter((log) => log.style.opacity !== '0')
    .map((log) => Number(log.dataset.value))
const action = () => document.querySelector<HTMLElement>('.beaver')?.dataset.action
const answers = () => screen.getByRole('group', { name: 'Your move' })
const button = (name: string) => within(answers()).getByRole('button', { name })
const question = () => document.querySelector('.do-it-question')?.textContent ?? null
const isDone = () => document.querySelector('.do-it-panel')?.classList.contains('is-done')
const step = () =>
  Number(/Step (\d+) of/.exec(document.querySelector('.progress')?.textContent ?? '')?.[1] ?? 0)

async function typeNumbers(user: User, text: string) {
  await user.clear(field())
  await user.type(field(), `${text}{Enter}`)
}

function expectBarsWithMessage() {
  expect(isBeaver()).toBe(false)
  expect(document.querySelectorAll('.stage-bars .stage-bar').length).toBeGreaterThan(0)
  expect(notice()).toHaveTextContent('The beaver carries 1 to 12 logs.')
  expect(rankButton()).toBeInTheDocument()
}

describe('heap sort’s builder beaver', () => {
  it('is heap sort’s character: Beaver on the Show as switch, drawn on the stage', () => {
    renderAt('explorer', { numbers: SPEC })
    expect(screen.getByRole('button', { name: /Beaver/ })).toHaveAttribute('aria-pressed', 'true')
    expect(isBeaver()).toBe(true)
    expect(plates()).toEqual(SPEC)
  })

  it('stands its dam beside the stacks on a desktop, in place of the site’s tree', () => {
    renderAt('engineer', { numbers: SPEC })
    const slot = document.querySelector('[data-tree-slot]')
    expect(slot).toHaveAttribute('data-tree-slot', 'beside')
    expect(slot?.closest('.stage-split')).not.toBeNull()
    expect(damLogs()).toEqual(SPEC)
    expect(screen.getByRole('img', { name: /^The heap \(tree\), row by row: 7; 2, 11/ })).toBe(slot)
  })

  it('stands its dam over the band on an upright phone', () => {
    setPhone(true)
    renderAt('explorer', { numbers: SPEC })
    const slot = document.querySelector('[data-tree-slot]')
    expect(slot).toHaveAttribute('data-tree-slot', 'over')
    // And a slot beside the stacks, which shows on a phone on its side (HeapTree.css).
    expect(document.querySelector('.stage-split [data-tree-slot="beside"]')).not.toBeNull()
    expect(damLogs()).toEqual(SPEC)
  })

  it('bars keep the site’s tree over the band, and 0 to 99', () => {
    renderAt('engineer', { numbers: [42, 7, 88], look: 'bars' })
    expect(document.querySelector('[data-tree-slot]')).toBeNull()
    expect(document.querySelector('.heap-tree.is-stage')).not.toBeNull()
    expect(notice()).toBeNull()
  })
})

describe('the log look uses 1 to 12', () => {
  it.each(['explorer', 'engineer'] as const)(
    '%s: big numbers keep bars with the message; "Use 1–12, same order" brings the beaver back',
    async (level) => {
      const user = renderAt(level)
      expect(isBeaver()).toBe(true)
      await typeNumbers(user, '5 2 31 1 40 3')
      expect(numbersInAddress()).toEqual([5, 2, 31, 1, 40, 3])
      expectBarsWithMessage()
      await user.click(rankButton() as HTMLElement)
      // Each number by its rank: the same order, so the same comparisons and swaps.
      expect(numbersInAddress()).toEqual([4, 2, 5, 1, 6, 3])
      expect(isBeaver()).toBe(true)
      expect(notice()).toBeNull()
    },
  )

  it('switching to the beaver with big numbers keeps them, with bars and the message', () => {
    renderAt('engineer', { numbers: [42, 7, 88] })
    expectBarsWithMessage()
    expect(numbersInAddress()).toEqual([42, 7, 88])
  })

  it('a link’s big numbers in Do it: bars and the message there too', () => {
    renderAt('explorer', { numbers: [42, 7, 88], mode: 'do' })
    expectBarsWithMessage()
  })

  it.each(['explorer', 'engineer'] as const)(
    '%s: the field says "Beaver: 1 to 12" and reads it with it',
    (level) => {
      renderAt(level)
      const tag = screen.getByText('Beaver: 1 to 12')
      expect(field().getAttribute('aria-describedby')).toContain(tag.id)
    },
  )

  it('Explorer: a number outside 1 to 12 gets a friendly note while it is typed', async () => {
    const user = renderAt('explorer')
    await user.clear(field())
    await user.type(field(), '5 2 31')
    expect(document.querySelector('.numbers-message')?.textContent).toBe(
      'The beaver carries 1 to 12 logs. With 31, you’ll see bars instead. Use 1 to 12 to see the beaver.',
    )
  })

  it.each(['explorer', 'engineer'] as const)(
    '%s: every preset picks from 1 to 12, bringing the beaver back from big numbers',
    async (level) => {
      const user = renderAt(level, { numbers: [42, 7, 88] })
      const names =
        level === 'explorer'
          ? ['Mixed up', 'Already in order', 'Backwards', 'Almost in order']
          : ['Random', 'Already sorted', 'Reversed', 'Nearly sorted']
      for (const name of names) {
        await typeNumbers(user, '42 7 88')
        expectBarsWithMessage()
        await user.click(within(presets()).getByRole('button', { name }))
        expect(numbersInAddress().every((v) => v >= 1 && v <= 12)).toBe(true)
        expect(isBeaver()).toBe(true)
      }
    },
  )

  it('with bars, the presets and the field keep 0 to 99', () => {
    renderAt('engineer', { look: 'bars' })
    expect(screen.queryByText(/1 to 12/)).toBeNull()
  })
})

describe('a whole run with the beaver', () => {
  it.each(['explorer', 'engineer'] as const)(
    '%s, Watch: plays to the end through every moment, waiting for each haul to the woodpile',
    async (level) => {
      const user = renderAt(level, { numbers: SPEC })
      const frames = collectFrames(heapSort, SPEC).frames
      const seen = new Set<string>()
      await user.click(screen.getByRole('button', { name: 'Play' }))
      for (let k = 0; k < 400 && step() < frames.length; k++) {
        const at = step()
        seen.add(action() ?? '')
        // The stacks show the frame, and the dam its pyramid.
        expect(plates()).toEqual(frames[at - 1]?.array)
        expect(damLogs()).toEqual(plates().slice(0, damLogs().length))
        expect(damLogs().length).toBeLessThanOrEqual(
          document.querySelectorAll('.beaver-stack:not(.is-sorted)').length,
        )
        act(() => {
          vi.advanceTimersByTime(800)
        })
        // The haul holds its frame for its full 2 s at 1×: the next step waits.
        if (action() === 'haul' && step() === at + 1) {
          act(() => {
            vi.advanceTimersByTime(800)
          })
          expect(step()).toBe(at + 1)
          act(() => {
            vi.advanceTimersByTime(400)
          })
        }
      }
      seen.add(action() ?? '')
      expect([...seen].sort()).toEqual(
        ['climb', 'finale', 'handover', 'haul', 'look', 'settle', 'start', 'stop'].sort(),
      )
      expect(document.querySelectorAll('.beaver-stack.is-sorted')).toHaveLength(12)
      expect(plates()).toEqual([...SPEC].sort((a, b) => a - b))
      expect(damLogs()).toEqual([])
    },
    // Every step of a 12-value run: a couple of seconds here, CI's runners are slower.
    30_000,
  )

  it.each(['explorer', 'engineer'] as const)(
    '%s, Do it: every question right to the finish; the beaver looks, then its mood follows the move',
    async (level) => {
      const user = renderAt(level, { numbers: SPEC, mode: 'do' })
      const frames = askedAt(collectFrames(heapSort, SPEC).frames, level)
      const decisions = decisionIndexes(frames).map((k) => {
        const ask = frames[k]
        const answer = answerAt(frames, k)
        if (ask?.decision?.kind !== 'sift-or-stop' || !answer) throw new Error('sift or stop')
        return { child: ask.decision.pair[1], climbs: answer.kind === 'trade', ask }
      })
      const playOn = () => {
        for (let k = 0; k < 80 && !question() && !isDone(); k++) {
          act(() => {
            vi.advanceTimersByTime(2000)
          })
        }
      }
      await user.click(button('Start'))
      playOn()
      for (const d of decisions) {
        expect(question()).toBe(d.ask.explanation[level])
        expect(action()).toBe('look')
        if (level === 'explorer') await user.click(button(d.climbs ? 'Climb up' : 'Stay on top'))
        else if (d.climbs) {
          const values = within(screen.getByRole('group', { name: /^Values/ })).getAllByRole(
            'button',
          )
          await user.click(values[d.child] as HTMLElement)
        } else await user.click(button('Stop'))
        expect(action()).toBe(d.climbs ? 'climb' : 'stop')
        playOn()
      }
      expect(isDone()).toBe(true)
      expect(isBeaver()).toBe(true)
      expect(document.querySelectorAll('.beaver-stack.is-sorted')).toHaveLength(12)
    },
    30_000,
  )
})
