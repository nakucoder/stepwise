import { useEffect, useMemo, useReducer, useRef } from 'react'
import {
  createPlayerState,
  isAtEnd,
  isAtStart,
  playerReducer,
  stepDelayMs,
  type PlayerState,
  type Speed,
} from '../engine/player'
import type { Frame } from '../engine/types'

export interface PlayerControls {
  readonly play: () => void
  readonly pause: () => void
  readonly togglePlay: () => void
  readonly stepForward: () => void
  readonly stepBack: () => void
  readonly toStart: () => void
  readonly toEnd: () => void
  readonly seek: (index: number) => void
  readonly setSpeed: (speed: Speed) => void
}

export interface Player extends PlayerControls {
  readonly state: PlayerState
  /** The frame on screen, or null when there are no frames. */
  readonly frame: Frame | null
  readonly isAtStart: boolean
  readonly isAtEnd: boolean
}

/**
 * Drives the engine's playerReducer for a list of frames. While playing, it schedules one
 * `tick` after the speed's delay; the timer restarts whenever the frame or speed changes and
 * is cleared on pause, at the last frame (the reducer pauses there), and on unmount.
 * New frames (a new array) start over, paused, keeping the speed. `holdMs(index, delay)`, if
 * given, keeps a frame on screen longer than the step.
 */
export function usePlayer(
  frames: readonly Frame[],
  holdMs?: (index: number, stepDelayMs: number) => number,
): Player {
  const [state, dispatch] = useReducer(playerReducer, frames.length, (count: number) =>
    createPlayerState(count),
  )

  const loadedFrames = useRef(frames)
  useEffect(() => {
    if (loadedFrames.current === frames) return
    loadedFrames.current = frames
    dispatch({ type: 'load', frameCount: frames.length })
  }, [frames])

  // A frame can ask to stay longer than the step, so its move finishes (selection sort's
  // robots: the carry). Read through a ref: a new function must not restart the timer.
  const holdRef = useRef(holdMs)
  useEffect(() => {
    holdRef.current = holdMs
  })

  useEffect(() => {
    if (state.status !== 'playing') return
    const delay = stepDelayMs(state.speed)
    const timer = window.setTimeout(
      () => {
        dispatch({ type: 'tick' })
      },
      Math.max(delay, holdRef.current?.(state.index, delay) ?? 0),
    )
    return () => {
      window.clearTimeout(timer)
    }
  }, [state.status, state.index, state.speed])

  const controls = useMemo<PlayerControls>(
    () => ({
      play: () => {
        dispatch({ type: 'play' })
      },
      pause: () => {
        dispatch({ type: 'pause' })
      },
      togglePlay: () => {
        dispatch({ type: 'togglePlay' })
      },
      stepForward: () => {
        dispatch({ type: 'stepForward' })
      },
      stepBack: () => {
        dispatch({ type: 'stepBack' })
      },
      toStart: () => {
        dispatch({ type: 'toStart' })
      },
      toEnd: () => {
        dispatch({ type: 'toEnd' })
      },
      seek: (index: number) => {
        dispatch({ type: 'seek', index })
      },
      setSpeed: (speed: Speed) => {
        dispatch({ type: 'setSpeed', speed })
      },
    }),
    [],
  )

  // Until the load effect runs after a frames change, keep the index within the new frames.
  const frame = frames[Math.min(state.index, frames.length - 1)] ?? null

  return {
    ...controls,
    state,
    frame,
    isAtStart: isAtStart(state),
    isAtEnd: isAtEnd(state),
  }
}
