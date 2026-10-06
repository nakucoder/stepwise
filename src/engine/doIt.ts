/**
 * Do it mode: the learner makes each decision and the site checks it. A pure reducer over the
 * collected frames, like playerReducer: no React, no timers (the UI sends `advance` on a timer
 * while the steps between decisions play).
 *
 * - `intro`: the challenge is shown; `start` begins.
 * - `playing`: steps with nothing to decide play on, one `advance` at a time.
 * - `asking`: a decision frame waits for the learner's move. A right move shows the answer
 *   frame and plays on; a wrong move changes nothing and opens the help ladder.
 * - `done`: the last frame; the finish shows the first-try count.
 *
 * Never punishing: wrong moves have no limit and cost nothing but the first try. Asking for
 * help is free; only a wrong move or Show me means a decision wasn't right on the first try.
 */
import { answerAt, decisionIndexes, isRightChoice } from './decision'
import type { Choice, Frame } from './types'

export type DoItPhase = 'intro' | 'playing' | 'asking' | 'done'

/**
 * How many help steps are open at the current decision: 0 none, 1 the nudge, 2 the concept.
 * The last step, Show me, says the answer and makes the move (the `showMe` action).
 */
export type HintLevel = 0 | 1 | 2

export interface DoItState {
  readonly phase: DoItPhase
  /** The frame on screen. */
  readonly index: number
  readonly hint: HintLevel
  /** The current decision has had a wrong move or Show me, so it won't count as a first try. */
  readonly missed: boolean
  /** Decisions answered so far, and how many of them right on the first try. */
  readonly answered: number
  readonly firstTry: number
  /** What the last move did, for the feedback line, the sound and the screen reader. */
  readonly last: 'right' | 'wrong' | 'shown' | null
  /** Counts every move (and Show me), so two wrong moves in a row are two events. */
  readonly moves: number
}

export type DoItAction =
  | { readonly type: 'start' }
  | { readonly type: 'advance' }
  | { readonly type: 'choose'; readonly choice: Choice }
  | { readonly type: 'help' }
  | { readonly type: 'showMe' }
  | { readonly type: 'restart' }

export const initialDoIt: DoItState = {
  phase: 'intro',
  index: 0,
  hint: 0,
  missed: false,
  answered: 0,
  firstTry: 0,
  last: null,
  moves: 0,
}

/** The challenge for these frames: how many decisions, and how many of them are trades. */
export interface Challenge {
  readonly decisions: number
  readonly trades: number
}

export function challengeOf(frames: readonly Frame[]): Challenge {
  const decisions = decisionIndexes(frames)
  return {
    decisions: decisions.length,
    trades: decisions.filter((k) => answerAt(frames, k)?.kind === 'trade').length,
  }
}

/** Where a frame leaves the learner: at a decision, at the end, or still playing. */
function arriveAt(frames: readonly Frame[], index: number): DoItPhase {
  if (frames[index]?.decision) return 'asking'
  return index >= frames.length - 1 ? 'done' : 'playing'
}

/** Moves on from a decision to its answer frame. */
function answer(frames: readonly Frame[], state: DoItState, last: 'right' | 'shown'): DoItState {
  const index = state.index + 1
  const firstTry = last === 'right' && !state.missed
  return {
    ...state,
    index,
    phase: arriveAt(frames, index),
    hint: 0,
    missed: false,
    answered: state.answered + 1,
    firstTry: state.firstTry + (firstTry ? 1 : 0),
    last,
    moves: state.moves + 1,
  }
}

/** Builds the reducer for one list of frames (new numbers make a new reducer and a fresh state). */
export function doItReducer(frames: readonly Frame[]) {
  return (state: DoItState, action: DoItAction): DoItState => {
    switch (action.type) {
      case 'start':
        if (state.phase !== 'intro') return state
        return { ...state, phase: arriveAt(frames, 0), last: null }
      case 'advance': {
        if (state.phase !== 'playing') return state
        const index = state.index + 1
        return { ...state, index, phase: arriveAt(frames, index), last: null }
      }
      case 'choose':
        if (state.phase !== 'asking') return state
        if (isRightChoice(frames, state.index, action.choice)) {
          return answer(frames, state, 'right')
        }
        return {
          ...state,
          missed: true,
          hint: state.hint === 0 ? 1 : state.hint,
          last: 'wrong',
          moves: state.moves + 1,
        }
      case 'help':
        // One more step of help, up to the concept; Show me is its own action.
        if (state.phase !== 'asking') return state
        return { ...state, hint: state.hint >= 2 ? state.hint : ((state.hint + 1) as HintLevel) }
      case 'showMe':
        if (state.phase !== 'asking') return state
        return answer(frames, { ...state, missed: true }, 'shown')
      case 'restart':
        return initialDoIt
    }
  }
}
