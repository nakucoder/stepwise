import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Registry from '../characters/registry'
import type { SceneProps } from '../characters/registry'
import type { Level } from '../engine/types'
import { STORAGE_KEYS } from '../lib/storage'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { WorkspacePage } from './WorkspacePage'

/** A stand-in for the ducks: it says what the workspace gives a scene. */
function PropsScene({ level, asking, index }: SceneProps) {
  return (
    <p data-testid="scene-props">{`${level} | asking ${String(asking)} | step ${String(index)}`}</p>
  )
}

vi.mock('../characters/registry', async (importOriginal) => {
  const original = await importOriginal<typeof Registry>()
  return {
    ...original,
    CHARACTERS: {
      ...original.CHARACTERS,
      ducks: { ...original.CHARACTERS.ducks, scene: { Scene: PropsScene, className: 'is-ducks' } },
    },
  }
})

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

function renderAt(level: Level, search: string) {
  localStorage.setItem(STORAGE_KEYS.level, level)
  localStorage.setItem(STORAGE_KEYS.look, 'character')
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  render(
    <PreferencesProvider>
      <MemoryRouter initialEntries={[`/sorting/bubble-sort${search}`]}>
        <Routes>
          <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </PreferencesProvider>,
  )
  return user
}

const props = () => screen.getByTestId('scene-props').textContent

describe('the workspace gives a character’s scene the level and the question', () => {
  it.each(['explorer', 'engineer'] as const)(
    '%s, Do it: asking only while a question waits for the learner',
    async (level) => {
      const user = renderAt(level, '?mode=do')
      expect(props()).toBe(`${level} | asking false | step 0`)
      const bar = screen.getByRole('group', { name: 'Your move' })
      await user.click(within(bar).getByRole('button', { name: 'Start' }))
      for (let k = 0; k < 20 && !props().includes('asking true'); k++) {
        act(() => {
          vi.advanceTimersByTime(1000)
        })
      }
      expect(props()).toMatch(new RegExp(`^${level} \\| asking true \\| step \\d+$`))
      // The move is made (Help, then Show me): no question waits while the answer plays.
      await user.keyboard('h')
      await user.click(screen.getByRole('button', { name: 'Show me' }))
      expect(props()).toContain('asking false')
    },
  )

  it('Watch: never asking', () => {
    renderAt('explorer', '')
    expect(props()).toBe('explorer | asking false | step 0')
  })
})
