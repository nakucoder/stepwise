import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Frame } from '../engine/types'
import { usePlayer } from './usePlayer'

function makeFrames(count: number): Frame[] {
  return Array.from({ length: count }, (_, step) => ({
    array: [step],
    highlights: {},
    activeLine: null,
    explanation: { explorer: `Step ${String(step)}`, engineer: `Step ${String(step)}` },
    stats: { comparisons: step, swaps: 0 },
  }))
}

const FIVE = makeFrames(5)

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** Advances fake time inside act so React applies the resulting updates. */
function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('usePlayer', () => {
  it('starts on the first frame, paused', () => {
    const { result } = renderHook(() => usePlayer(FIVE))
    expect(result.current.state).toMatchObject({ index: 0, status: 'paused', frameCount: 5 })
    expect(result.current.frame).toBe(FIVE[0])
    expect(result.current.isAtStart).toBe(true)
  })

  it('advances one frame per 800ms at 1×', () => {
    const { result } = renderHook(() => usePlayer(FIVE))
    act(() => {
      result.current.play()
    })
    wait(799)
    expect(result.current.state.index).toBe(0)
    wait(1)
    expect(result.current.state.index).toBe(1)
    wait(800)
    expect(result.current.frame).toBe(FIVE[2])
  })

  it.each([
    [0.5, 1600],
    [2, 400],
    [4, 200],
  ] as const)('at %s× it advances every %sms', (speed, delay) => {
    const { result } = renderHook(() => usePlayer(FIVE))
    act(() => {
      result.current.setSpeed(speed)
      result.current.play()
    })
    wait(delay - 1)
    expect(result.current.state.index).toBe(0)
    wait(1)
    expect(result.current.state.index).toBe(1)
  })

  it('uses the new delay right away when the speed changes mid-play', () => {
    const { result } = renderHook(() => usePlayer(FIVE))
    act(() => {
      result.current.play()
    })
    wait(500)
    act(() => {
      result.current.setSpeed(4)
    })
    wait(200)
    expect(result.current.state.index).toBe(1)
  })

  it('stops on the last frame and leaves no timer running', () => {
    const { result } = renderHook(() => usePlayer(FIVE))
    act(() => {
      result.current.play()
    })
    // Each tick is scheduled after the previous one renders, so advance step by step.
    for (let k = 0; k < 10; k++) wait(800)
    expect(result.current.state).toMatchObject({ index: 4, status: 'paused' })
    expect(result.current.isAtEnd).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels the pending tick on pause', () => {
    const { result } = renderHook(() => usePlayer(FIVE))
    act(() => {
      result.current.play()
    })
    wait(500)
    act(() => {
      result.current.pause()
    })
    wait(5_000)
    expect(result.current.state.index).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('pauses and cancels the pending tick when the learner steps', () => {
    const { result } = renderHook(() => usePlayer(FIVE))
    act(() => {
      result.current.play()
    })
    wait(500)
    act(() => {
      result.current.stepForward()
    })
    expect(result.current.state).toMatchObject({ index: 1, status: 'paused' })
    wait(5_000)
    expect(result.current.state.index).toBe(1)
  })

  it('jumps, seeks and steps back', () => {
    const { result } = renderHook(() => usePlayer(FIVE))
    act(() => {
      result.current.toEnd()
    })
    expect(result.current.state.index).toBe(4)
    act(() => {
      result.current.stepBack()
    })
    expect(result.current.state.index).toBe(3)
    act(() => {
      result.current.seek(1)
    })
    expect(result.current.state.index).toBe(1)
    act(() => {
      result.current.toStart()
    })
    expect(result.current.state.index).toBe(0)
  })

  it('replays from the start when played on the last frame', () => {
    const { result } = renderHook(() => usePlayer(FIVE))
    act(() => {
      result.current.toEnd()
    })
    act(() => {
      result.current.togglePlay()
    })
    expect(result.current.state).toMatchObject({ index: 0, status: 'playing' })
  })

  it('clears the timer when the component unmounts', () => {
    const { result, unmount } = renderHook(() => usePlayer(FIVE))
    act(() => {
      result.current.play()
    })
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('starts over, paused, keeping the speed, when given new frames', () => {
    const { result, rerender } = renderHook(({ frames }) => usePlayer(frames), {
      initialProps: { frames: FIVE },
    })
    act(() => {
      result.current.setSpeed(2)
      result.current.seek(3)
      result.current.play()
    })
    const three = makeFrames(3)
    rerender({ frames: three })
    expect(result.current.state).toMatchObject({
      frameCount: 3,
      index: 0,
      status: 'paused',
      speed: 2,
    })
    expect(result.current.frame).toBe(three[0])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps the frame in range while new, shorter frames load', () => {
    const { result, rerender } = renderHook(({ frames }) => usePlayer(frames), {
      initialProps: { frames: FIVE },
    })
    act(() => {
      result.current.toEnd()
    })
    const two = makeFrames(2)
    rerender({ frames: two })
    expect(two).toContain(result.current.frame)
  })

  it('does nothing with no frames', () => {
    const { result } = renderHook(() => usePlayer([]))
    act(() => {
      result.current.play()
      result.current.stepForward()
    })
    expect(result.current.frame).toBeNull()
    expect(result.current.state).toMatchObject({ index: 0, status: 'paused' })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps the same control functions across renders', () => {
    const { result, rerender } = renderHook(() => usePlayer(FIVE))
    const { play, stepForward } = result.current
    rerender()
    expect(result.current.play).toBe(play)
    expect(result.current.stepForward).toBe(stepForward)
  })
})

describe('usePlayer: a frame that holds (selection sort’s robots carrying a crate)', () => {
  it('waits for the hold on that frame only, and the step everywhere else', () => {
    // Frame 1 holds for 3.4 s; the rest move on after the 800 ms step.
    const { result } = renderHook(() =>
      usePlayer(FIVE, (index, delay) => (index === 1 ? 3400 : delay / 2)),
    )
    act(() => {
      result.current.play()
    })
    wait(800)
    expect(result.current.state.index).toBe(1)
    wait(3399)
    expect(result.current.state.index).toBe(1)
    wait(1)
    expect(result.current.state.index).toBe(2)
    // A hold shorter than the step never hurries it.
    wait(799)
    expect(result.current.state.index).toBe(2)
    wait(1)
    expect(result.current.state.index).toBe(3)
  })
})
