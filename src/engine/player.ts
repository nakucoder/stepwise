/**
 * Player state for stepping through collected frames.
 *
 * Pure data and a pure reducer, with no timers and no React: in Step 5 a hook drives it
 * with useReducer and sends `tick` on a timer while playing. Every action is safe to send
 * at any time; actions that would change nothing return the same state object, so React
 * can skip re-rendering.
 */

export const SPEEDS = [0.5, 1, 2, 4] as const
export type Speed = (typeof SPEEDS)[number]

export type PlayerStatus = 'paused' | 'playing'

export interface PlayerState {
  /** Number of collected frames. 0 means there is nothing to show. */
  readonly frameCount: number
  /** The frame on screen, always within [0, frameCount - 1] (0 when there are no frames). */
  readonly index: number
  readonly status: PlayerStatus
  readonly speed: Speed
}

export type PlayerAction =
  /** New frames were collected (e.g. new input): start over, paused, keeping the speed. */
  | { readonly type: 'load'; readonly frameCount: number }
  | { readonly type: 'play' }
  | { readonly type: 'pause' }
  | { readonly type: 'togglePlay' }
  | { readonly type: 'stepForward' }
  | { readonly type: 'stepBack' }
  | { readonly type: 'toStart' }
  | { readonly type: 'toEnd' }
  | { readonly type: 'seek'; readonly index: number }
  | { readonly type: 'setSpeed'; readonly speed: Speed }
  /** Sent by a timer while playing: advance one frame, pausing on the last one. */
  | { readonly type: 'tick' }

/** Milliseconds between frames at 1× speed. */
export const BASE_STEP_DELAY_MS = 800

export function createPlayerState(frameCount: number, speed: Speed = 1): PlayerState {
  return { frameCount: Math.max(0, Math.trunc(frameCount)), index: 0, status: 'paused', speed }
}

export function lastIndex(state: PlayerState): number {
  return Math.max(0, state.frameCount - 1)
}

export function isAtStart(state: PlayerState): boolean {
  return state.index === 0
}

export function isAtEnd(state: PlayerState): boolean {
  return state.index === lastIndex(state)
}

/** Delay a timer should wait between ticks at this speed. */
export function stepDelayMs(speed: Speed): number {
  return BASE_STEP_DELAY_MS / speed
}

function isSpeed(value: number): value is Speed {
  return (SPEEDS as readonly number[]).includes(value)
}

function clampIndex(state: PlayerState, index: number): number {
  return Math.min(lastIndex(state), Math.max(0, Math.round(index)))
}

/** Returns `state` itself when nothing changes, so React can skip a re-render. */
function update(state: PlayerState, changes: Partial<PlayerState>): PlayerState {
  const next = { ...state, ...changes }
  return next.index === state.index &&
    next.status === state.status &&
    next.speed === state.speed &&
    next.frameCount === state.frameCount
    ? state
    : next
}

/** Manual navigation always pauses, so the learner takes control. */
function goTo(state: PlayerState, index: number): PlayerState {
  return update(state, { index: clampIndex(state, index), status: 'paused' })
}

function play(state: PlayerState): PlayerState {
  // With fewer than two frames there is nothing to animate.
  if (state.frameCount < 2) return update(state, { status: 'paused' })
  // Pressing play on the last frame replays from the beginning.
  return update(state, { status: 'playing', index: isAtEnd(state) ? 0 : state.index })
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'load':
      return createPlayerState(action.frameCount, state.speed)
    case 'play':
      return play(state)
    case 'pause':
      return update(state, { status: 'paused' })
    case 'togglePlay':
      return state.status === 'playing' ? update(state, { status: 'paused' }) : play(state)
    case 'stepForward':
      return goTo(state, state.index + 1)
    case 'stepBack':
      return goTo(state, state.index - 1)
    case 'toStart':
      return goTo(state, 0)
    case 'toEnd':
      return goTo(state, lastIndex(state))
    case 'seek':
      return Number.isFinite(action.index) ? goTo(state, action.index) : state
    case 'setSpeed':
      return isSpeed(action.speed) ? update(state, { speed: action.speed }) : state
    case 'tick': {
      if (state.status !== 'playing') return state
      const index = Math.min(state.index + 1, lastIndex(state))
      return update(state, { index, status: index === lastIndex(state) ? 'paused' : 'playing' })
    }
  }
}
