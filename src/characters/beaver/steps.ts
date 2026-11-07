/**
 * Heap sort's builder beaver: how the frames map to the log stacks, the dam and the beaver. Pure:
 * no React, no DOM.
 *
 * Nothing new is needed from the frames: `heap` (the phase, the event, the size, the parent and
 * its children) and the swaps between frames carry everything. Each stack is numbered by its
 * column in the first frame and followed through every swap, so it keeps its own logs.
 *
 * - `beaverPoses(frames)`: every frame's resting picture (reduced motion and jumps show only these).
 * - `beaverMove(frames, k)`: what moves when the player steps forward from frame k − 1 to k: the
 *   beaver's beats (where it is, facing which way, in which mood, over which part of the move),
 *   the stack it carries and the one that slides, the green bars that appear, the finale's wave.
 * - `moveMs(move, stepDelayMs)`: the move's length at this speed.
 * - `beaverHoldMs`: how long frame k must stay on screen so the haul to the woodpile can finish.
 *
 * Timing: every move keeps its full length at 1× and slower, so the beaver's walk, lift and carry
 * are calm and easy to follow, and the step waits for it (the registry's hold); above 1× it
 * divides by the speed (`specialMs`). The haul to the woodpile (the special move) is the longest;
 * the finale plays in full.
 */
import { heapEnd } from '../../components/heapTree'
import type { Frame } from '../../engine/types'
import { specialMs } from '../pixel'
import type { BeaverSprite } from './sprites'

/** The beaver's moods (the spec's table). Walking shows two frames of its legs in turn. */
export type Mood =
  'waiting' | 'walking' | 'looking' | 'found' | 'shrug' | 'carry' | 'proud' | 'happy'

/** The sprite each mood shows (walking: its first leg frame; the scene alternates them). */
export const MOOD_SPRITE: Readonly<Record<Mood, BeaverSprite>> = {
  waiting: 'idle',
  walking: 'walk',
  looking: 'look',
  found: 'found',
  shrug: 'shrug',
  carry: 'carry',
  proud: 'proud',
  happy: 'happy',
}

/** What a step is, for the beaver (the spec's moments). */
export type Action = 'start' | 'look' | 'climb' | 'stop' | 'settle' | 'handover' | 'haul' | 'finale'

export interface BeaverPose {
  /** Which stack stands in each column: stacks are numbered by their column in the first frame. */
  readonly order: readonly number[]
  /** Where the pyramid ends: the columns from here on are the woodpile (finished). */
  readonly end: number
  /** The columns ringed yellow (a family compared) and pink (a climb, the top leaving). */
  readonly looking: readonly number[]
  readonly trading: readonly number[]
  /** The columns in their final place: the green bar under them. */
  readonly sorted: readonly number[]
  /** The parent the step looks at and its children in the pyramid (the dam's marked sticks). */
  readonly parent: number | null
  readonly children: readonly number[]
  /** The family's sticks: marked yellow (compared) or pink to the child that climbs. */
  readonly sticks: 'looking' | 'trading' | null
  /** The column the beaver works under (a half: between two), facing left or right. */
  readonly beaver: number
  readonly left: boolean
  readonly mood: Mood
  readonly action: Action
  /** The last frame, everything in place: the finale. */
  readonly final: boolean
}

// ---------- Timing (each move at 1×; the step waits for it) ----------

export const LOOK_MS = 900
export const CLIMB_MS = 1800
export const STOP_MS = 1200
export const SETTLE_MS = 900
export const HANDOVER_MS = 1000
/** The special move: the top hauled to the woodpile. The step waits for it. */
export const HAUL_MS = 2800
/** The finale: the beaver walks to the end and bobs; the stacks hop in a wave. Plays in full. */
export const FINALE_MS = 1600
/** In the finale each stack hops this long, in turn from the left, from 20% of the finale on. */
export const FINALE_HOP_MS = 420
export const FINALE_WAVE = { from: 0.2, to: 1 } as const
/** A climb: found (to 15%), walk under the child (to 40%), lift (to 50%), carry it up (to 90%),
 * set it down (to 98%). */
export const CLIMB_AT = { found: 0.15, walk: 0.4, lift: 0.5, land: 0.9, down: 0.98 } as const
/** The haul: walk to the top (to 20%), lift (to 30%), haul it to the end (to 85%), set it down
 * (to 93%), proud. */
export const HAUL_AT = { walk: 0.2, lift: 0.3, land: 0.85, down: 0.93 } as const
/** How many proud bobs on the way to the woodpile, and the finale's bobs. */
export const HAUL_BOBS = 6
export const FINALE_BOBS = 3

/** The haul at this step delay: 2 s at 1× and slower, divided by the speed above 1×. */
export function haulMs(stepDelayMs: number): number {
  return specialMs(HAUL_MS, stepDelayMs)
}

/** When stack k (from the left) of `count` starts its hop in the finale, from its start. */
export function finaleHopAt(k: number, count: number): number {
  const from = FINALE_WAVE.from * FINALE_MS
  const span = FINALE_WAVE.to * FINALE_MS - from - FINALE_HOP_MS
  return from + (count > 1 ? (k * span) / (count - 1) : 0)
}

// ---------- Poses ----------

/** The two columns a frame swaps, if any (a swap of a value with itself swaps nothing). */
function swapOf(frame: Frame): readonly [number, number] | null {
  const pair = frame.highlights.swapping
  if (pair?.length !== 2) return null
  const [a, b] = pair
  return a !== undefined && b !== undefined && a !== b ? [a, b] : null
}

const allSorted = (frame: Frame) =>
  frame.array.length > 0 && (frame.highlights.sorted?.length ?? 0) === frame.array.length

/** Where the beaver rests once a step is over, and in which mood. */
function restOf(
  frame: Frame,
  final: boolean,
): {
  readonly col: number
  readonly mood: Mood
  readonly action: Action
} {
  const heap = frame.heap
  const n = frame.array.length
  if (final) return { col: Math.max(0, n - 1), mood: 'happy', action: 'finale' }
  const parent = heap?.parent ?? 0
  switch (heap?.event) {
    case 'ask':
      return { col: parent, mood: 'looking', action: 'look' }
    case 'climb':
      // It carried the child's stack up to the parent's place, and set it down there.
      return { col: parent, mood: 'waiting', action: 'climb' }
    case 'stop':
      // It looked, shrugged, and moved on half a column: nothing moves.
      return { col: parent + 0.5, mood: 'shrug', action: 'stop' }
    case 'settles':
      return { col: parent, mood: 'waiting', action: 'settle' }
    case 'extract':
      // It hauled the top to the end of the pyramid: proud, by the woodpile.
      return { col: heap.size, mood: 'proud', action: 'haul' }
    case 'start':
      return heap.phase === 'extract'
        ? { col: 0, mood: 'proud', action: 'handover' }
        : { col: 0, mood: 'waiting', action: 'start' }
    default:
      return { col: 0, mood: 'waiting', action: 'start' }
  }
}

/** Each frame's pose, from the run: the stacks are followed through every swap. */
export function beaverPoses(frames: readonly Frame[]): BeaverPose[] {
  let order = (frames[0]?.array ?? []).map((_, k) => k)
  let left = false
  let previous = 0
  const last = frames.length - 1
  return frames.map((frame, k) => {
    const swap = k > 0 ? swapOf(frame) : null
    if (swap) {
      const [a, b] = swap
      const next = [...order]
      next[a] = order[b] ?? -1
      next[b] = order[a] ?? -1
      order = next
    }
    const final = k === last && allSorted(frame)
    const rest = restOf(frame, final)
    // It faces the way it last walked.
    if (rest.col !== previous) left = rest.col < previous
    previous = rest.col
    const heap = frame.heap
    const parent = heap?.parent ?? null
    const looking = frame.highlights.comparing ?? []
    const trading = frame.highlights.swapping ?? []
    const children = parent === null ? [] : (heap?.children ?? [])
    return {
      order,
      end: heap ? heapEnd(frame) : frame.array.length,
      looking,
      trading,
      sorted: frame.highlights.sorted ?? [],
      parent,
      children,
      sticks:
        parent === null || children.length === 0
          ? null
          : trading.includes(parent)
            ? 'trading'
            : looking.includes(parent)
              ? 'looking'
              : null,
      beaver: rest.col,
      left,
      mood: rest.mood,
      action: rest.action,
      final,
    }
  })
}

/** Each run's poses, worked out once (the hold is asked on every step). */
const posesCache = new WeakMap<readonly Frame[], BeaverPose[]>()
export function posesOf(frames: readonly Frame[]): BeaverPose[] {
  let poses = posesCache.get(frames)
  if (!poses) {
    poses = beaverPoses(frames)
    posesCache.set(frames, poses)
  }
  return poses
}

// ---------- Moves ----------

/**
 * A part of the beaver's move: from `from` to `to` (fractions of the move's length) it goes from
 * column `at[0]` to `at[1]` (the same: it stays), facing left or right, in a mood; with a "!"
 * over its head, or bobbing a few times.
 */
export interface Beat {
  readonly from: number
  readonly to: number
  readonly mood: Mood
  readonly at: readonly [number, number]
  readonly left: boolean
  readonly bang?: boolean
  readonly bobs?: number
}

/**
 * The beaver lifts a stack over its head and carries it to another column, while the stack there
 * slides along the curb to the column it left. Fractions of the move: lifted from `lift[0]` to
 * `lift[1]`, carried from `lift[1]` to `land[0]`, set down by `land[1]`.
 */
export interface Carry {
  readonly stack: number
  readonly from: number
  readonly to: number
  readonly other: number
  readonly lift: readonly [number, number]
  readonly land: readonly [number, number]
  /** The carried stack bobs with the beaver on the way (the haul). */
  readonly bobs?: number
}

export interface BeaverMove {
  readonly action: Action
  /** Its length at 1×, and how it plays: held (the step waits for it, divided by the speed above
   * 1×), or the finale, in full. */
  readonly ms: number
  readonly timing: 'held' | 'full'
  readonly beats: readonly Beat[]
  readonly carry: Carry | null
  /** The columns newly in place, and when their green bar appears (a fraction of the move). */
  readonly done: readonly number[]
  readonly doneAt: number
  /** The finale: the stacks hop in a wave, left to right. */
  readonly wave: boolean
}

/** The move's length at this step delay: in full at 1× and slower, divided by the speed above. */
export function moveMs(move: Pick<BeaverMove, 'ms' | 'timing'>, stepDelayMs: number): number {
  return move.timing === 'held' ? specialMs(move.ms, stepDelayMs) : move.ms
}

/** A walk from column a to b over [from, to] (none when it stays). */
function walk(a: number, b: number, from: number, to: number): Beat[] {
  return a === b ? [] : [{ from, to, mood: 'walking', at: [a, b], left: b < a }]
}

/**
 * The beats end to end over the whole move: each starts where the one before ended (the first at
 * 0), so a walk left out (the beaver is already there) leaves no gap.
 */
function cover(beats: readonly Beat[]): Beat[] {
  return beats.map((beat, k) => ({ ...beat, from: k === 0 ? 0 : (beats[k - 1]?.to ?? beat.from) }))
}

/** A beat in place. */
const stay = (col: number, from: number, to: number, mood: Mood, left: boolean): Beat => ({
  from,
  to,
  mood,
  at: [col, col],
  left,
})

/** What moves when the player steps forward from frame k − 1 to frame k (null: no frame). */
export function beaverMove(
  frames: readonly Frame[],
  k: number,
  poses: readonly BeaverPose[] = posesOf(frames),
): BeaverMove | null {
  const move = moveInto(frames, k, poses)
  return move && { ...move, beats: cover(move.beats) }
}

function moveInto(
  frames: readonly Frame[],
  k: number,
  poses: readonly BeaverPose[],
): BeaverMove | null {
  const before = poses[k - 1]
  const now = poses[k]
  const frame = frames[k]
  if (!before || !now || !frame) return null
  const done = now.sorted.filter((col) => !before.sorted.includes(col))
  const from = before.beaver
  const to = now.beaver
  const base = { carry: null, done, doneAt: 0, wave: false } as const
  const swap = swapOf(frame)

  if (now.final) {
    // Walks to the end, happy, bobbing; the stacks hop in a wave.
    const walking = walk(from, to, 0, 0.3)
    return {
      ...base,
      action: 'finale',
      ms: FINALE_MS,
      timing: 'full',
      wave: true,
      beats: [
        ...walking,
        { ...stay(to, walking.length > 0 ? 0.3 : 0, 1, 'happy', false), bobs: FINALE_BOBS },
      ],
    }
  }

  switch (now.action) {
    case 'climb': {
      // "!", walks under the bigger child's stack, lifts it over its head, carries it up to the
      // parent's place while the parent's stack slides down to the child's, sets it down.
      const [parent, child] = swap ?? [to, to]
      const { found, walk: walked, lift, land, down } = CLIMB_AT
      const facing = child > parent
      return {
        ...base,
        action: 'climb',
        ms: CLIMB_MS,
        timing: 'held',
        beats: [
          { ...stay(from, 0, found, 'found', before.left), bang: true },
          ...walk(from, child, found, walked),
          stay(child, walked, lift, 'carry', facing),
          { from: lift, to: land, mood: 'carry', at: [child, parent], left: facing },
          stay(parent, land, down, 'carry', facing),
          stay(parent, down, 1, 'waiting', facing),
        ],
        carry: {
          stack: now.order[parent] ?? -1,
          from: child,
          to: parent,
          other: now.order[child] ?? -1,
          lift: [walked, lift],
          land: [land, down],
        },
      }
    }
    case 'haul': {
      // Walks to the top, lifts its stack over its head, hauls it to the end of the pyramid with
      // a proud bob at each step, sets it down on the woodpile; the stack from the end slides up.
      const [top, end] = swap ?? [0, to]
      const { walk: walked, lift, land, down } = HAUL_AT
      return {
        ...base,
        action: 'haul',
        ms: HAUL_MS,
        timing: 'held',
        doneAt: down,
        beats: [
          ...walk(from, top, 0, walked),
          stay(top, walked, lift, 'carry', false),
          { from: lift, to: land, mood: 'proud', at: [top, end], left: false, bobs: HAUL_BOBS },
          stay(end, land, down, 'carry', false),
          stay(end, down, 1, 'proud', false),
        ],
        carry: {
          stack: now.order[end] ?? -1,
          from: top,
          to: end,
          other: now.order[top] ?? -1,
          lift: [walked, lift],
          land: [land, down],
          bobs: HAUL_BOBS,
        },
      }
    }
    case 'stop':
      // Looks, shrugs, and moves on half a column. Nothing moves.
      return {
        ...base,
        action: 'stop',
        ms: STOP_MS,
        timing: 'held',
        beats: [
          stay(from, 0, 0.3, 'looking', before.left),
          stay(from, 0.3, 0.7, 'shrug', before.left),
          ...walk(from, to, 0.7, 1),
        ],
      }
    case 'look': {
      // Walks under the parent's stack and looks up.
      const walking = walk(from, to, 0, 0.6)
      return {
        ...base,
        action: 'look',
        ms: LOOK_MS,
        timing: 'held',
        beats: [...walking, stay(to, walking.length > 0 ? 0.6 : 0, 1, 'looking', now.left)],
      }
    }
    case 'handover': {
      // The dam is built: it walks to the top's stack, proud.
      const walking = walk(from, to, 0, 0.6)
      return {
        ...base,
        action: 'handover',
        ms: HANDOVER_MS,
        timing: 'held',
        beats: [...walking, stay(to, walking.length > 0 ? 0.6 : 0, 1, 'proud', now.left)],
      }
    }
    case 'settle':
    case 'start':
      // It walks to the value (a value settles with nothing under it).
      return {
        ...base,
        action: now.action,
        ms: SETTLE_MS,
        timing: 'held',
        beats: [...walk(from, to, 0, 1), stay(to, 1, 1, 'waiting', now.left)],
      }
    default:
      return null
  }
}

/** Whether stepping into frame k plays the haul to the woodpile. */
export function isHaul(frames: readonly Frame[], k: number): boolean {
  return k > 0 && posesOf(frames)[k]?.action === 'haul'
}

/** How long frame k must stay on screen with the beaver showing: its whole move into k. */
export function beaverHoldMs(frames: readonly Frame[], k: number, stepDelayMs: number): number {
  const move = k > 0 ? beaverMove(frames, k) : null
  return move ? moveMs(move, stepDelayMs) : 0
}

// ---------- The dam ----------

export interface DamNode {
  /** The stack whose log end it is, and its value. */
  readonly id: number
  readonly value: number
  /** Its place in the pyramid. */
  readonly k: number
  readonly ring: 'looking' | 'trading' | null
}

/**
 * The log ends in the dam in a pose: the pyramid's values at their places (finished values have
 * left the dam), each the same stack, value and ring as the column it stands for.
 */
export function damNodes(pose: BeaverPose, values: readonly number[]): DamNode[] {
  return pose.order.slice(0, pose.end).map((id, k) => ({
    id,
    value: values[id] ?? 0,
    k,
    ring: pose.trading.includes(k) ? 'trading' : pose.looking.includes(k) ? 'looking' : null,
  }))
}
