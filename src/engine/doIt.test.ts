import { describe, expect, it } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { randomArrays } from '../test/random'
import { collectFrames } from './collect'
import { answerAt } from './decision'
import { challengeOf, doItReducer, initialDoIt, type DoItAction, type DoItState } from './doIt'
import type { Choice, Frame } from './types'

const framesFor = (input: readonly number[]) => collectFrames(bubbleSort, input).frames
// 5 2 8 1 9 3: the first question is 5 vs 2 (trade), then 5 vs 8 (keep).
const FRAMES = framesFor([5, 2, 8, 1, 9, 3])
const TRADE: Choice = { kind: 'trade', pair: [0, 1] }
const KEEP: Choice = { kind: 'keep' }

function play(frames: readonly Frame[], actions: readonly DoItAction[], from = initialDoIt) {
  const reduce = doItReducer(frames)
  return actions.reduce(reduce, from)
}

/** Plays through the steps between decisions, as the UI's timer does. */
function advanceToDecision(frames: readonly Frame[], state: DoItState): DoItState {
  const reduce = doItReducer(frames)
  let s = state
  while (s.phase === 'playing') s = reduce(s, { type: 'advance' })
  return s
}

/** The right move at the current decision. */
const rightMove = (frames: readonly Frame[], s: DoItState): Choice => {
  const answer = answerAt(frames, s.index)
  if (!answer) throw new Error(`no decision at ${String(s.index)}`)
  return answer
}

/** A whole run: `wrongFirst` makes one wrong move at each decision before the right one. */
function runThrough(frames: readonly Frame[], wrongFirst: boolean): DoItState {
  const reduce = doItReducer(frames)
  let s = reduce(initialDoIt, { type: 'start' })
  for (let guard = 0; guard < 10_000 && s.phase !== 'done'; guard++) {
    s = advanceToDecision(frames, s)
    if (s.phase !== 'asking') continue
    const right = rightMove(frames, s)
    if (wrongFirst) {
      const wrong: Choice = right.kind === 'keep' ? { kind: 'trade', pair: [0, 1] } : KEEP
      const after = reduce(s, { type: 'choose', choice: wrong })
      expect(after.index).toBe(s.index)
      s = after
    }
    s = reduce(s, { type: 'choose', choice: right })
  }
  return s
}

describe('Do it: the flow', () => {
  it('starts at the challenge, then plays on to the first question', () => {
    expect(initialDoIt.phase).toBe('intro')
    const s = advanceToDecision(FRAMES, play(FRAMES, [{ type: 'start' }]))
    expect(s.phase).toBe('asking')
    expect(s.index).toBe(1)
  })

  it('a right move shows the answer, then plays on to the next question', () => {
    const asked = advanceToDecision(FRAMES, play(FRAMES, [{ type: 'start' }]))
    const s = play(FRAMES, [{ type: 'choose', choice: TRADE }], asked)
    expect(s).toMatchObject({ index: 2, last: 'right', answered: 1, firstTry: 1, hint: 0 })
    expect(FRAMES[2]?.array.slice(0, 2)).toEqual([2, 5])
    const next = advanceToDecision(FRAMES, s)
    expect(next.phase).toBe('asking')
    expect(FRAMES[next.index]?.decision?.pair).toEqual([1, 2])
  })

  it('a wrong move changes nothing on the stage and opens the nudge', () => {
    const asked = advanceToDecision(FRAMES, play(FRAMES, [{ type: 'start' }]))
    const s = play(FRAMES, [{ type: 'choose', choice: KEEP }], asked)
    expect(s).toMatchObject({ index: 1, phase: 'asking', last: 'wrong', hint: 1, missed: true })
    // Another wrong move (the wrong pair) still costs nothing more.
    const again = play(FRAMES, [{ type: 'choose', choice: { kind: 'trade', pair: [2, 3] } }], s)
    expect(again).toMatchObject({ index: 1, hint: 1, answered: 0, moves: s.moves + 1 })
  })

  it('then right: moves on, but not as a first try', () => {
    const asked = advanceToDecision(FRAMES, play(FRAMES, [{ type: 'start' }]))
    const s = play(
      FRAMES,
      [
        { type: 'choose', choice: KEEP },
        { type: 'choose', choice: TRADE },
      ],
      asked,
    )
    expect(s).toMatchObject({ index: 2, answered: 1, firstTry: 0, missed: false, last: 'right' })
  })

  it('help opens one step at a time, up to the concept, and is free', () => {
    const asked = advanceToDecision(FRAMES, play(FRAMES, [{ type: 'start' }]))
    const help = play(FRAMES, [{ type: 'help' }], asked)
    expect(help.hint).toBe(1)
    expect(play(FRAMES, [{ type: 'help' }, { type: 'help' }], help).hint).toBe(2)
    const s = play(FRAMES, [{ type: 'choose', choice: TRADE }], help)
    expect(s.firstTry).toBe(1)
  })

  it('Show me makes the move for the learner, and it is not a first try', () => {
    const asked = advanceToDecision(FRAMES, play(FRAMES, [{ type: 'start' }]))
    const s = play(FRAMES, [{ type: 'showMe' }], asked)
    expect(s).toMatchObject({ index: 2, last: 'shown', answered: 1, firstTry: 0, hint: 0 })
  })

  it('ignores moves when there is no question, and steps while one is waiting', () => {
    const intro = play(FRAMES, [{ type: 'choose', choice: TRADE }, { type: 'advance' }])
    expect(intro).toEqual(initialDoIt)
    const asked = advanceToDecision(FRAMES, play(FRAMES, [{ type: 'start' }]))
    expect(play(FRAMES, [{ type: 'advance' }], asked)).toBe(asked)
  })

  it('restart goes back to the challenge', () => {
    const s = play(FRAMES, [{ type: 'start' }, { type: 'advance' }, { type: 'restart' }])
    expect(s).toEqual(initialDoIt)
  })
})

describe('Do it: whole runs', () => {
  const INPUTS: number[][] = [
    [],
    [7],
    [1, 2],
    [2, 1],
    [3, 1, 3, 2, 1, 3],
    [4, 4, 4, 4],
    [1, 2, 3, 4, 5, 6],
    [6, 5, 4, 3, 2, 1],
    [5, 2, 8, 1, 9, 3],
    ...randomArrays(20261005, 60, { maxLength: 12, min: 0, max: 99 }),
  ]

  it.each(INPUTS.map((input) => [input.join(' ') || 'empty', input] as const))(
    'right every time: done, every question right first try, same trades: %s',
    (_, input) => {
      const frames = framesFor(input)
      const challenge = challengeOf(frames)
      const s = runThrough(frames, false)
      expect(s.phase).toBe('done')
      expect(s.index).toBe(frames.length - 1)
      expect(s.answered).toBe(challenge.decisions)
      expect(s.firstTry).toBe(challenge.decisions)
      expect(frames[s.index]?.stats.swaps).toBe(challenge.trades)
    },
  )

  it.each(INPUTS.map((input) => [input.join(' ') || 'empty', input] as const))(
    'one wrong move at every question: still done, no first tries: %s',
    (_, input) => {
      const frames = framesFor(input)
      const s = runThrough(frames, true)
      expect(s.phase).toBe('done')
      expect(s.answered).toBe(challengeOf(frames).decisions)
      expect(s.firstTry).toBe(0)
    },
  )
})

describe('challengeOf', () => {
  it('counts the questions and the trades bubble sort makes', () => {
    expect(challengeOf(FRAMES)).toEqual({
      decisions: FRAMES.filter((f) => f.decision).length,
      trades: FRAMES.at(-1)?.stats.swaps,
    })
    expect(challengeOf(framesFor([1, 2, 3]))).toEqual({ decisions: 2, trades: 0 })
  })
})
