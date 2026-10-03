import { describe, expect, it } from 'vitest'
import {
  createPlayerState,
  isAtEnd,
  isAtStart,
  lastIndex,
  playerReducer,
  SPEEDS,
  stepDelayMs,
  type PlayerAction,
  type PlayerState,
  type Speed,
} from './player'

/** Applies actions in order and returns the final state. */
function run(state: PlayerState, ...actions: PlayerAction[]): PlayerState {
  return actions.reduce(playerReducer, state)
}

const at = (index: number, frameCount = 5): PlayerState => ({
  ...createPlayerState(frameCount),
  index,
})
const playing = (index: number, frameCount = 5): PlayerState => ({
  ...at(index, frameCount),
  status: 'playing',
})

describe('createPlayerState', () => {
  it('starts at the first frame, paused, at 1×', () => {
    expect(createPlayerState(5)).toEqual({ frameCount: 5, index: 0, status: 'paused', speed: 1 })
  })

  it('treats a negative or fractional frame count safely', () => {
    expect(createPlayerState(-3).frameCount).toBe(0)
    expect(createPlayerState(2.7).frameCount).toBe(2)
  })
})

describe('stepping', () => {
  it('steps forward and back one frame', () => {
    expect(run(at(2), { type: 'stepForward' }).index).toBe(3)
    expect(run(at(2), { type: 'stepBack' }).index).toBe(1)
  })

  it('stays on the last frame when stepping past the end', () => {
    expect(run(at(4), { type: 'stepForward' }).index).toBe(4)
  })

  it('stays on the first frame when stepping before the start', () => {
    expect(run(at(0), { type: 'stepBack' }).index).toBe(0)
  })

  it('jumps to the start and the end', () => {
    expect(run(at(2), { type: 'toStart' }).index).toBe(0)
    expect(run(at(2), { type: 'toEnd' }).index).toBe(4)
  })

  it('pauses when the learner steps or jumps while playing', () => {
    for (const type of ['stepForward', 'stepBack', 'toStart', 'toEnd'] as const) {
      expect(run(playing(2), { type }).status, type).toBe('paused')
    }
  })
})

describe('seek', () => {
  it('goes to any frame', () => {
    expect(run(at(0), { type: 'seek', index: 3 }).index).toBe(3)
  })

  it('clamps out-of-range targets to the first or last frame', () => {
    expect(run(at(2), { type: 'seek', index: 99 }).index).toBe(4)
    expect(run(at(2), { type: 'seek', index: -7 }).index).toBe(0)
  })

  it('rounds fractional targets and ignores non-numbers', () => {
    expect(run(at(0), { type: 'seek', index: 2.6 }).index).toBe(3)
    const state = at(2)
    expect(run(state, { type: 'seek', index: Number.NaN })).toBe(state)
  })

  it('pauses when seeking while playing', () => {
    expect(run(playing(1), { type: 'seek', index: 3 })).toMatchObject({
      index: 3,
      status: 'paused',
    })
  })
})

describe('play and pause', () => {
  it('plays from the current frame and pauses', () => {
    const state = run(at(2), { type: 'play' })
    expect(state).toMatchObject({ index: 2, status: 'playing' })
    expect(run(state, { type: 'pause' }).status).toBe('paused')
  })

  it('toggles between playing and paused', () => {
    const once = run(at(1), { type: 'togglePlay' })
    expect(once.status).toBe('playing')
    expect(run(once, { type: 'togglePlay' }).status).toBe('paused')
  })

  it('restarts from the beginning when playing on the last frame', () => {
    expect(run(at(4), { type: 'play' })).toMatchObject({ index: 0, status: 'playing' })
    expect(run(at(4), { type: 'togglePlay' })).toMatchObject({ index: 0, status: 'playing' })
  })
})

describe('tick', () => {
  it('advances one frame while playing', () => {
    expect(run(playing(1), { type: 'tick' })).toMatchObject({ index: 2, status: 'playing' })
  })

  it('stops automatically on the last frame', () => {
    const state = run(playing(0), ...Array<PlayerAction>(10).fill({ type: 'tick' }))
    expect(state).toMatchObject({ index: 4, status: 'paused' })
  })

  it('pauses as soon as it reaches the last frame, not one tick later', () => {
    expect(run(playing(3), { type: 'tick' })).toMatchObject({ index: 4, status: 'paused' })
  })

  it('does nothing while paused', () => {
    const state = at(2)
    expect(run(state, { type: 'tick' })).toBe(state)
  })
})

describe('speed', () => {
  it.each(SPEEDS)('sets speed %s× without changing position or status', (speed) => {
    expect(run(playing(2), { type: 'setSpeed', speed })).toMatchObject({
      speed,
      index: 2,
      status: 'playing',
    })
  })

  it('ignores a speed that is not one of the options', () => {
    const state = at(2)
    expect(run(state, { type: 'setSpeed', speed: 3 as Speed })).toBe(state)
  })

  it('maps speeds to step delays', () => {
    expect(SPEEDS.map(stepDelayMs)).toEqual([1600, 800, 400, 200])
  })
})

describe('load', () => {
  it('starts over, paused, keeping the chosen speed', () => {
    const state = run(playing(3), { type: 'setSpeed', speed: 2 }, { type: 'load', frameCount: 9 })
    expect(state).toEqual({ frameCount: 9, index: 0, status: 'paused', speed: 2 })
  })
})

describe('edge cases', () => {
  const everyAction: PlayerAction[] = [
    { type: 'play' },
    { type: 'togglePlay' },
    { type: 'stepForward' },
    { type: 'stepBack' },
    { type: 'toStart' },
    { type: 'toEnd' },
    { type: 'seek', index: 3 },
    { type: 'tick' },
  ]

  it('with no frames, nothing moves and nothing plays', () => {
    const empty = createPlayerState(0)
    for (const action of everyAction) {
      expect(playerReducer(empty, action), action.type).toEqual(empty)
    }
    expect(isAtStart(empty)).toBe(true)
    expect(isAtEnd(empty)).toBe(true)
    expect(lastIndex(empty)).toBe(0)
  })

  it('with one frame, play has nothing to animate', () => {
    const single = createPlayerState(1)
    for (const action of everyAction) {
      expect(playerReducer(single, action), action.type).toMatchObject({
        index: 0,
        status: 'paused',
      })
    }
  })

  it('returns the same object when an action changes nothing', () => {
    const state = at(0)
    expect(playerReducer(state, { type: 'stepBack' })).toBe(state)
    expect(playerReducer(state, { type: 'pause' })).toBe(state)
    expect(playerReducer(state, { type: 'setSpeed', speed: 1 })).toBe(state)
  })

  it('reports start and end positions', () => {
    expect(isAtStart(at(0))).toBe(true)
    expect(isAtEnd(at(0))).toBe(false)
    expect(isAtEnd(at(4))).toBe(true)
  })
})
