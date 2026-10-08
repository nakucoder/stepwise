import { describe, expect, it } from 'vitest'
import { selectionSort } from '../../algorithms/sorting/selectionSort'
import { collectFrames } from '../../engine/collect'
import type { Frame } from '../../engine/types'
import { randomArrays } from '../../test/random'
import {
  carryPlan,
  CLEARANCE,
  crateShare,
  CRATE_CAP,
  HIGHEST_TOP,
  SCOUT,
  SCOUT_H,
  SCOUT_HAPPY,
  spriteScale,
  stepOffSlot,
} from './geometry'
import {
  CARRY_MS,
  carryMs,
  fitMs,
  isCarry,
  robotHoldMs,
  robotMoves,
  robotPoses,
  type RobotMove,
} from './steps'

const framesFor = (input: readonly number[]): readonly Frame[] =>
  collectFrames(selectionSort, input).frames

/** Every move, frame by frame, as one list (k, move). */
const allMoves = (frames: readonly Frame[]) => {
  const poses = robotPoses(frames)
  return frames.flatMap((_, k) => robotMoves(frames, k, poses).map((move) => [k, move] as const))
}

const INPUTS = [
  [5, 2, 8, 1, 9, 3],
  [1, 2, 3, 4],
  [4, 3, 2, 1],
  [2, 5, 2],
  [7],
  [],
  ...randomArrays(1332, 60, { maxLength: 12, min: 0, max: 99 }),
]

describe('robot geometry (the spec)', () => {
  it('crates: 10 + 9 × value for 1–9, the tallest never over the 75% cap', () => {
    for (let v = 1; v <= 9; v++) expect(crateShare(v, 9) * 132).toBeCloseTo(10 + 9 * v)
    for (const largest of [1, 9, 12, 50, 99]) {
      expect(crateShare(largest, largest)).toBeLessThanOrEqual(CRATE_CAP)
    }
    // 0 is a low crate of its own, still with room for its number.
    expect(crateShare(0, 9) * 132).toBe(10)
  })

  it('sprites: a whole number of pixels per unit, 1 to 3, never 0', () => {
    expect(spriteScale(330, 58)).toBe(2)
    expect(spriteScale(460, 110)).toBe(3)
    expect(spriteScale(90, 22)).toBe(1)
    expect(spriteScale(10, 5)).toBe(1)
    expect(spriteScale(2000, 400)).toBe(3)
  })

  it('the scout steps off to the right, or to the left from the last crate', () => {
    expect(stepOffSlot(3, 6)).toBe(4)
    expect(stepOffSlot(5, 6)).toBe(4)
  })

  it('the finale eyes change only rows 4 and 5', () => {
    SCOUT.forEach((row, y) => {
      if (y === 4 || y === 5) expect(SCOUT_HAPPY[y]).not.toBe(row)
      else expect(SCOUT_HAPPY[y]).toBe(row)
    })
  })
})

describe('the carry rule', () => {
  const scale = 2
  const lift = HIGHEST_TOP * scale
  // Tops in px from the top of a 300 px field (smaller is higher).
  const tops = [240, 260, 100, 250, 270, 280]

  it('lifts as high as fits: its top at y = 12', () => {
    const plan = carryPlan({ front: 0, from: 1, tops, height: 40, scoutSlot: 2, scale })
    expect(plan.liftTop).toBe(lift)
  })

  it('goes over the crates between when it clears them by 2', () => {
    // From slot 5 to the front past slots 1–4: the tallest top between is 100.
    const height = 100 - CLEARANCE * scale - lift
    expect(carryPlan({ front: 0, from: 5, tops, height, scoutSlot: 4, scale }).over).toBe(true)
    expect(
      carryPlan({ front: 0, from: 5, tops, height: height + 1, scoutSlot: 4, scale }).over,
    ).toBe(false)
  })

  it('counts the scout on a crate between: 16 more to clear', () => {
    // The scout on slot 3 (top 250): the crate must clear 250 − 32 − 4 = 214.
    const clear = 250 - SCOUT_H * scale - CLEARANCE * scale - lift
    const base = { front: 2, from: 4, tops, scoutSlot: 3, scale }
    expect(carryPlan({ ...base, height: clear }).over).toBe(true)
    expect(carryPlan({ ...base, height: clear + 1 }).over).toBe(false)
    // Without the scout there, the same crate clears.
    expect(carryPlan({ ...base, height: clear + 1, scoutSlot: 5 }).over).toBe(true)
  })

  it('neighbors: nothing between, so it always goes over', () => {
    expect(carryPlan({ front: 2, from: 3, tops, height: 999, scoutSlot: 4, scale }).over).toBe(true)
  })
})

describe('the robot follows selection sort, frame by frame', () => {
  it.each(INPUTS.map((input) => [input.join(' ') || '(empty)', input] as const))(
    'the scout stands on the smallest so far, and steps off for each carry: %s',
    (_, input) => {
      const frames = framesFor(input)
      const poses = robotPoses(frames)
      frames.forEach((frame, k) => {
        const pose = poses[k]
        if (!pose) throw new Error('a pose per frame')
        const min = frame.pointers?.min
        if (isCarry(frames, k) && min !== undefined) {
          expect(pose.scout).toBe(stepOffSlot(min, input.length))
          expect(pose.reticle).toBeNull()
        } else if (min !== undefined) {
          expect(pose.scout).toBe(min)
          expect(pose.reticle).toBe(min)
        }
        expect(pose.sorted).toBe(frame.highlights.sorted?.length ?? 0)
      })
    },
  )

  it.each(INPUTS.map((input) => [input.join(' ') || '(empty)', input] as const))(
    'one carry per swap, from the smallest to the front; a beam at every comparison: %s',
    (_, input) => {
      const frames = framesFor(input)
      const moves = allMoves(frames)
      const carries = moves.filter(([, m]) => m.kind === 'carry')
      expect(carries).toHaveLength(frames.at(-1)?.stats.swaps ?? 0)
      for (const [k, move] of carries) {
        if (move.kind !== 'carry') continue
        const before = frames[k - 1]
        const after = frames[k]
        expect(after?.array[move.front]).toBe(before?.array[move.from])
        expect(move.front).toBeLessThan(move.from)
      }
      const scans = moves.filter(([, m]) => m.kind === 'scan')
      expect(scans).toHaveLength(frames.at(-1)?.stats.comparisons ?? 0)
    },
  )

  it.each(INPUTS.map((input) => [input.join(' ') || '(empty)', input] as const))(
    'a lock-on for every new smallest; the trolley returns after every carry: %s',
    (_, input) => {
      const frames = framesFor(input)
      const moves = allMoves(frames)
      const newSmallest = frames.filter(
        (f, k) =>
          frames[k - 1]?.decision?.kind === 'new-smallest' && f.pointers?.min === f.pointers?.j,
      ).length
      expect(moves.filter(([, m]) => m.kind === 'lock')).toHaveLength(newSmallest)
      const carries = moves.filter(([, m]) => m.kind === 'carry').map(([k]) => k)
      const returns = moves.filter(([, m]) => m.kind === 'return').map(([k]) => k)
      expect(returns).toEqual(carries.map((k) => k + 1))
    },
  )

  it('the default numbers, step by step', () => {
    const frames = framesFor([5, 2, 8, 1, 9, 3])
    const kinds = allMoves(frames).map(([, m]: readonly [number, RobotMove]) => m.kind)
    // Round 1: 2 is a new smallest, 8 isn't, 1 is, 9 and 3 aren't; then 1 is carried.
    expect(kinds.slice(0, 9)).toEqual([
      'scan',
      'lock',
      'scan',
      'scan',
      'lock',
      'scan',
      'scan',
      'carry',
      'return',
    ])
    expect(kinds.at(-1)).toBe('finale')
    expect(robotPoses(frames).at(-1)?.finale).toBe(true)
  })

  it('the platform lights for a round with no carry, once', () => {
    const frames = framesFor([1, 2, 3])
    const platforms = allMoves(frames).filter(([, m]) => m.kind === 'platform')
    // Rounds 1 and 2 keep; the last crate lights with the finale.
    expect(platforms.map(([, m]) => m)).toEqual([
      { kind: 'platform', slot: 0 },
      { kind: 'platform', slot: 1 },
    ])
  })
})

describe('robot timing', () => {
  it('the carry keeps 3.4 s at 1×, divides by faster speeds, and never runs faster at 0.5×', () => {
    expect(carryMs(800)).toBe(CARRY_MS)
    expect(carryMs(400)).toBe(CARRY_MS / 2)
    expect(carryMs(200)).toBe(CARRY_MS / 4)
    expect(carryMs(1600)).toBe(CARRY_MS)
  })

  it('frequent moves fit inside the step', () => {
    expect(fitMs(900, 800)).toBe(720)
    expect(fitMs(900, 1600)).toBe(900)
    expect(fitMs(700, 200)).toBe(180)
  })

  it('only a carry frame holds the player', () => {
    const frames = framesFor([5, 2, 8, 1, 9, 3])
    const holds = frames.map((_, k) => robotHoldMs(frames, k, 800))
    const carryFrames = frames.flatMap((_, k) => (isCarry(frames, k) ? [k] : []))
    expect(carryFrames).toHaveLength(3)
    holds.forEach((hold, k) => {
      expect(hold).toBe(carryFrames.includes(k) ? CARRY_MS : 0)
    })
  })
})
