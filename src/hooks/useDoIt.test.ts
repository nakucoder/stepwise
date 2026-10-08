import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { collectFrames } from '../engine/collect'
import { ANSWER_HOLD_MS, BETWEEN_MS, useDoIt } from './useDoIt'

const FRAMES = collectFrames(bubbleSort, [5, 2, 8]).frames
const OTHER = collectFrames(bubbleSort, [2, 1]).frames

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useDoIt', () => {
  it('starts at the challenge and plays on to the first question on a timer', () => {
    const { result } = renderHook(() => useDoIt(FRAMES, true))
    expect(result.current.state.phase).toBe('intro')
    act(() => {
      result.current.start()
    })
    // Frame 0 is the start; the first question is frame 1.
    expect(result.current.state.phase).toBe('playing')
    act(() => {
      vi.advanceTimersByTime(BETWEEN_MS)
    })
    expect(result.current.state).toMatchObject({ phase: 'asking', index: 1 })
    expect(result.current.frame?.decision?.pair).toEqual([0, 1])
  })

  it('holds a right answer on screen long enough to read, then moves on', () => {
    const { result } = renderHook(() => useDoIt(FRAMES, true))
    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(BETWEEN_MS)
    })
    expect(result.current.state.phase).toBe('asking')
    act(() => {
      result.current.choose({ kind: 'trade', pair: [0, 1] })
    })
    expect(result.current.state.last).toBe('right')
    const answerIndex = result.current.state.index
    act(() => {
      vi.advanceTimersByTime(ANSWER_HOLD_MS - 1)
    })
    expect(result.current.state.index).toBe(answerIndex)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.state.index).toBe(answerIndex + 1)
  })

  it('does nothing on its own while not in Do it mode', () => {
    const { result } = renderHook(() => useDoIt(FRAMES, false))
    act(() => {
      result.current.start()
      vi.advanceTimersByTime(10_000)
    })
    expect(result.current.state).toMatchObject({ phase: 'playing', index: 0 })
  })

  it('new numbers start over at the challenge', () => {
    const { result, rerender } = renderHook(({ frames }) => useDoIt(frames, true), {
      initialProps: { frames: FRAMES },
    })
    act(() => {
      result.current.start()
    })
    rerender({ frames: OTHER })
    expect(result.current.state.phase).toBe('intro')
    expect(result.current.frame).toBe(OTHER[0])
  })
})

describe('useDoIt: a right answer whose move takes longer (the robots’ carry)', () => {
  it('holds the answer until its move is done, never less than the reading time', () => {
    const answer = 2 // 5 2 8: frame 1 asks about 5 and 2, frame 2 swaps them.
    const { result } = renderHook(() =>
      useDoIt(FRAMES, true, (index) => (index === answer ? 3400 : 100)),
    )
    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(BETWEEN_MS)
    })
    act(() => {
      result.current.choose({ kind: 'trade', pair: [0, 1] })
    })
    expect(result.current.state.index).toBe(answer)
    act(() => {
      vi.advanceTimersByTime(3399)
    })
    expect(result.current.state.index).toBe(answer)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.state.index).toBe(answer + 1)
  })
})
