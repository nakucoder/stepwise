import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { insertionSort } from '../algorithms/sorting/insertionSort'
import { selectionSort } from '../algorithms/sorting/selectionSort'
import { CHARACTERS, type StageLook } from '../characters/registry'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import { answerAt } from '../engine/decision'
import type { Algorithm, Frame } from '../engine/types'
import { useDoIt } from './useDoIt'

/** The four speeds, as step delays: 0.5×, 1×, 2×, 4×. */
const DELAYS = [1600, 800, 400, 200] as const

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

/** The hold the page gives useDoIt for this look (WorkspacePage), at this step delay. */
function holdFor(frames: readonly Frame[], look: StageLook, stepDelayMs: number) {
  const holdMs = look === 'bars' ? undefined : CHARACTERS[look].holdMs
  return holdMs && ((index: number) => holdMs(frames, index, stepDelayMs))
}

/**
 * Plays a whole Do it run, answering every question right, and records every wait Do it
 * schedules before moving on: the frame on screen, what the last move was, and how long.
 */
function holdsOf(frames: readonly Frame[], hold?: (index: number) => number) {
  const timers = vi.spyOn(window, 'setTimeout')
  const { result } = renderHook(() => useDoIt(frames, true, hold))
  act(() => {
    result.current.start()
  })
  const waits: { index: number; last: string; ms: number }[] = []
  for (let guard = 0; guard < 1000 && result.current.state.phase !== 'done'; guard++) {
    const { phase, index, last } = result.current.state
    if (phase === 'asking') {
      const answer = answerAt(frames, index)
      if (!answer) throw new Error('every question is answered')
      act(() => {
        result.current.choose(answer)
      })
      continue
    }
    // Do it's own timer: the latest one that sends `advance`.
    const call = timers.mock.calls.findLast(([fn]) => String(fn).includes('advance'))
    const ms = Number(call?.[1])
    waits.push({ index, last: last ?? '-', ms })
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }
  expect(result.current.state.phase).toBe('done')
  return waits
}

const CASES: readonly (readonly [string, Algorithm, StageLook])[] = [
  ['bubble sort, ducks', bubbleSort, 'ducks'],
  ['bubble sort, bars', bubbleSort, 'bars'],
  ['selection sort, robots', selectionSort, 'robot'],
  ['selection sort, bars', selectionSort, 'bars'],
  ['insertion sort, bars', insertionSort, 'bars'],
]

describe('Do it: every hold, for every look but the penguins (unchanged by the slide fix)', () => {
  for (const [name, algorithm, look] of CASES) {
    for (const delay of DELAYS) {
      it(`${name}, holds built at ${String(delay)} ms`, () => {
        const frames = collectFrames(algorithm, DEFAULT_INPUT).frames
        const waits = holdsOf(frames, holdFor(frames, look, delay))
        expect(
          waits.map(({ index, last, ms }) => `#${String(index)} ${last} ${String(ms)}`).join('\n'),
        ).toMatchSnapshot()
      })
    }
  }
})
