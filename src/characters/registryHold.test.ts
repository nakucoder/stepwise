import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { selectionSort } from '../algorithms/sorting/selectionSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import { STORAGE_KEYS } from '../lib/storage'
import { WorkspacePage } from '../pages/WorkspacePage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { CHARACTERS } from './registry'
import { CARRY_MS, isCarry, robotHoldMs } from './robot/steps'

/** The four speeds, as step delays: 0.5×, 1×, 2×, 4×. */
const DELAYS = [1600, 800, 400, 200] as const

describe('hold times from the character registry', () => {
  it('the robots’ hold is their carry rule, unchanged, for every frame at every speed', () => {
    const hold = CHARACTERS.robot.holdMs
    if (!hold) throw new Error('the robots hold for the carry')
    expect(hold).toBe(robotHoldMs)
    for (const input of [DEFAULT_INPUT, [3, 1, 2], [1, 2, 3, 4], [9, 8, 7, 6, 5], [2, 2, 1], [7]]) {
      const frames = collectFrames(selectionSort, input).frames
      for (const d of DELAYS) {
        frames.forEach((_, k) => {
          expect(hold(frames, k, d)).toBe(robotHoldMs(frames, k, d))
        })
      }
    }
  })

  it('the ducks have no special move, so they never hold the player', () => {
    expect(CHARACTERS.ducks.holdMs).toBeUndefined()
  })
})

// ---------- The page waits for the carry with the robots, and only with them ----------

const jestShim = { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) }

beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { jest: jestShim })
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(globalThis, 'jest')
})

const FRAMES = collectFrames(selectionSort, DEFAULT_INPUT).frames
const CARRY = FRAMES.findIndex((_, k) => isCarry(FRAMES, k))

function renderSelection(look: 'character' | 'bars') {
  localStorage.setItem(STORAGE_KEYS.level, 'explorer')
  localStorage.setItem(STORAGE_KEYS.look, look)
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(
    createElement(
      PreferencesProvider,
      null,
      createElement(
        MemoryRouter,
        { initialEntries: ['/sorting/selection-sort'] },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: ':categoryId/:algorithmId',
            element: createElement(WorkspacePage),
          }),
        ),
      ),
    ),
  )
  return user
}

const step = () =>
  Number(/^Step (\d+) of/.exec(screen.getByText(/^Step \d+ of \d+$/).textContent)?.[1])
const wait = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

/** Plays from the start until the carry frame is on screen (steps count from 1). */
async function playToCarry(look: 'character' | 'bars') {
  const user = renderSelection(look)
  await user.click(
    within(screen.getByRole('group', { name: 'Playback' })).getByRole('button', { name: 'Play' }),
  )
  for (let k = 0; k < 400 && step() < CARRY + 1; k++) wait(100)
  expect(step()).toBe(CARRY + 1)
}

describe('the page reads the hold from the registry', () => {
  it('robots: the carry frame stays its full 3.4 s at 1×, then the player moves on', async () => {
    await playToCarry('character')
    wait(CARRY_MS - 200)
    expect(step()).toBe(CARRY + 1)
    wait(400)
    expect(step()).toBe(CARRY + 2)
  })

  it('bars: the same frame moves on after the 800 ms step', async () => {
    await playToCarry('bars')
    wait(900)
    expect(step()).toBe(CARRY + 2)
  })
})
