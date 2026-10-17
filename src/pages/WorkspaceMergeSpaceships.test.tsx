import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mergeSort } from '../algorithms/sorting/mergeSort'
import { CHARACTERS } from '../characters/registry'
import { spaceshipHoldMs } from '../characters/spaceships/steps'
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
  // jsdom has no layout: every box is a phone's stage field, so the scene draws.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 366,
    height: 382,
    top: 0,
    left: 0,
    right: 366,
    bottom: 382,
  } as DOMRect)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'jest')
})

type User = ReturnType<typeof userEvent.setup>

function renderAt(level: Level, mode: 'do' | 'watch' = 'do') {
  localStorage.setItem(STORAGE_KEYS.level, level)
  localStorage.setItem(STORAGE_KEYS.look, 'character')
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[`/sorting/merge-sort${mode === 'do' ? '?mode=do' : ''}`]}>
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
const question = () => document.querySelector('.do-it-question')?.textContent ?? null
const isDone = () => document.querySelector('.do-it-panel')?.classList.contains('is-done') === true
const badges = () => [...document.querySelectorAll('.space-badge')].map((b) => b.textContent)
const values = () => within(screen.getByRole('group', { name: /^Values/ })).getAllByRole('button')

function playOn() {
  for (let k = 0; k < 50 && !question() && !isDone(); k++) {
    act(() => {
      vi.advanceTimersByTime(2000)
    })
  }
}

async function start(level: Level) {
  const user = renderAt(level)
  await user.click(button('Start'))
  playOn()
  return user
}

const DECISIONS = (() => {
  const { frames } = collectFrames(mergeSort, DEFAULT_INPUT)
  return decisionIndexes(frames).map((k) => {
    const ask = frames[k]
    const answer = answerAt(frames, k)
    if (!ask?.decision || answer?.kind !== 'pick') throw new Error('every decision is a pick')
    return { index: answer.index, left: answer.index === ask.decision.pair[0], ask }
  })
})()

async function answerRight(user: User, level: Level, d: (typeof DECISIONS)[number]) {
  if (level === 'explorer') await user.keyboard(d.left ? 'l' : 'r')
  else await user.click(values()[d.index] as HTMLElement)
}

describe('merge sort with the spaceships', () => {
  it('is merge sort’s character: Spaceships on the Show as switch, drawn on the stage', () => {
    renderAt('explorer', 'watch')
    expect(CHARACTERS.spaceships.name).toBe('Spaceships')
    expect(CHARACTERS.spaceships.holdMs).toBe(spaceshipHoldMs)
    expect(screen.getByRole('button', { name: /Spaceships/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(document.querySelector('.stage-view')).toHaveClass('is-spaceships')
    expect(document.querySelectorAll('[data-part^="ship-"]')).toHaveLength(6)
  })

  it('Explorer, Do it: L and R badges above the leads while a question waits', async () => {
    const user = await start('explorer')
    expect(question()).toBe('Which goes next, 2 or 8?')
    expect(badges()).toEqual(['L', 'R'])
    await user.keyboard('l')
    // The answer plays: no question waits, no badges.
    expect(badges()).toEqual([])
    playOn()
    expect(question()).toBe('Which goes next, 5 or 2?')
    expect(badges()).toEqual(['L', 'R'])
  })

  it('Engineer, Do it: no badges; tapping the right lead’s column answers', async () => {
    const user = await start('engineer')
    expect(badges()).toEqual([])
    expect(values().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Column 0, empty',
      'left[0] = 2, comparing',
      'right[0] = 8, comparing',
      'Column 3, empty',
      'Column 4, empty',
      'Column 5, empty',
    ])
    await user.click(values()[2] as HTMLElement) // wrong: 2 <= 8
    expect(document.querySelector('.do-it-panel')).toHaveTextContent('Not the move')
    await user.click(values()[1] as HTMLElement)
    playOn()
    expect(question()).toBe('left[0] = 5 <= right[0] = 2?')
  })

  it.each(['explorer', 'engineer'] as const)(
    '%s: a full run to the finish, every question right, the ships in order',
    async (level) => {
      const user = await start(level)
      for (const d of DECISIONS) {
        expect(question()).toBe(d.ask.explanation[level])
        await answerRight(user, level, d)
        playOn()
      }
      expect(isDone()).toBe(true)
      expect(document.querySelectorAll('.space-ring.is-sorted')).toHaveLength(6)
    },
  )

  it('the tags under the stage show both rows: the fronts with their role', async () => {
    await start('engineer')
    const marks = [...document.querySelectorAll('.stage-axis .stage-marks')].map((m) =>
      [...m.querySelectorAll('.stage-pointer, .stage-role')].map((t) => t.textContent),
    )
    expect(marks[1]).toEqual(['k', 'i', 'comparing'])
    expect(marks[2]).toEqual(['j', 'comparing'])
  })
})
