import { useEffect, useMemo, useReducer, useRef } from 'react'
import { doItReducer, initialDoIt, type DoItAction, type DoItState } from '../engine/doIt'
import { stepDelayMs } from '../engine/player'
import type { Choice, Frame } from '../engine/types'

/** How long a right answer (or Show me) stays on screen before play moves on: time to read it. */
export const ANSWER_HOLD_MS = 1500
/** The pace of the steps between questions: the same as Watch mode at 1×. */
export const BETWEEN_MS = stepDelayMs(1)

export interface DoIt {
  readonly state: DoItState
  /** The frame on screen in Do it mode. */
  readonly frame: Frame | null
  readonly start: () => void
  readonly choose: (choice: Choice) => void
  readonly help: () => void
  readonly showMe: () => void
  readonly restart: () => void
}

/**
 * Drives the engine's Do it reducer for a list of frames. While steps play between questions
 * it sends `advance` on a timer, only when `active` (the page is in Do it mode). New frames (new
 * numbers) start over at the challenge.
 */
export function useDoIt(frames: readonly Frame[], active: boolean): DoIt {
  const reducer = useMemo(() => doItReducer(frames), [frames])
  const [state, dispatch] = useReducer(
    (s: DoItState, a: DoItAction | { readonly type: 'reset' }) =>
      a.type === 'reset' ? initialDoIt : reducer(s, a),
    initialDoIt,
  )

  const loadedFrames = useRef(frames)
  useEffect(() => {
    if (loadedFrames.current === frames) return
    loadedFrames.current = frames
    dispatch({ type: 'reset' })
  }, [frames])

  useEffect(() => {
    if (!active || state.phase !== 'playing') return
    const hold = state.last === 'right' || state.last === 'shown' ? ANSWER_HOLD_MS : BETWEEN_MS
    const timer = window.setTimeout(() => {
      dispatch({ type: 'advance' })
    }, hold)
    return () => {
      window.clearTimeout(timer)
    }
  }, [active, state.phase, state.index, state.last])

  const actions = useMemo(
    () => ({
      start: () => {
        dispatch({ type: 'start' })
      },
      choose: (choice: Choice) => {
        dispatch({ type: 'choose', choice })
      },
      help: () => {
        dispatch({ type: 'help' })
      },
      showMe: () => {
        dispatch({ type: 'showMe' })
      },
      restart: () => {
        dispatch({ type: 'restart' })
      },
    }),
    [],
  )

  const frame = frames[Math.min(state.index, frames.length - 1)] ?? null
  return { ...actions, state, frame }
}
