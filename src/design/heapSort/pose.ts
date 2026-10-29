/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): where every character is at a moment of
 * a step, for both designs. `t` runs from 0 (the step's move just starting) to 1 (its final
 * pose); stills use a middle `t` for the moves and the clip runs it with the clock.
 *
 * - A climb: the bigger child goes up past its parent to the parent's place (the stegosaurus
 *   hops over it, the monkey swings up on a vine), and the parent goes down to the child's place.
 * - The top leaving (the special move): the top goes to the end of the pyramid and joins the
 *   finished ones (the stegosaurus walks there proudly, head up; the monkey swings down on a long
 *   vine), and the one from the end goes up to the top, behind it.
 * - The finale: a wave from left to right (hops, or bananas held high).
 */
import type { Frame } from '../../engine/types'
import { heapEnd } from '../../components/heapTree'
import {
  MONKEY_H,
  moveInto,
  STEGO_H,
  type Columns,
  type Design,
  type MonkeyPose,
  type Plan,
  type StegoPose,
} from './model'

export interface Actor {
  readonly id: number
  readonly value: number
  /** Its column at this frame. */
  readonly k: number
  /** Its center, in the field's pixels from the left. */
  readonly x: number
  /** How high it is off the ground, in px. */
  readonly lift: number
  readonly pose: StegoPose | MonkeyPose
  /** Drawn in front of the others while it moves. */
  readonly front: boolean
  /** A monkey on a vine: the vine's top, in the field's pixels (y from the top). */
  readonly vine?: { readonly x: number; readonly y: number }
  /** Marks (role colors, as marks only). */
  readonly ring?: 'looking' | 'trading'
  readonly finished: boolean
}

/**
 * A character's height on the stage (without lift): the sprite, its stack and its plate. A
 * monkey's stack overlaps its sprite's top row, and has one outline row over its bananas.
 */
export function heightOf(design: Design, plan: Plan, value: number): number {
  return design === 'stego'
    ? plan.plate + STEGO_H * plan.s
    : plan.plate + (MONKEY_H - 1) * plan.s + value * plan.u + 1
}

/** The move's length in ms at 1× (stills don't need it; the clip does). */
export const MOVE_MS = { climb: 620, extract: 1700, finale: 1500 } as const

const ease = (t: number) => t * t * (3 - 2 * t)

export function actorsAt(
  design: Design,
  frames: readonly Frame[],
  ids: readonly (readonly number[])[],
  index: number,
  t: number,
  plan: Plan,
  cols: Columns,
  fieldHeight: number,
): Actor[] {
  const frame = frames[index]
  if (!frame) return []
  const now = ids[index] ?? []
  const before = ids[index - 1] ?? now
  const move = index > 0 ? moveInto(frames, index) : ({ kind: 'none' } as const)
  const end = heapEnd(frame)
  const comparing = frame.highlights.comparing ?? []
  const swapping = frame.highlights.swapping ?? []
  const event = frame.heap?.event
  const done = event === 'done' && frame.array.length > 1
  const n = frame.array.length
  const e = ease(t)
  const stego = design === 'stego'

  return frame.array.map((value, k) => {
    const id = now[k] ?? k
    const from = before.indexOf(id)
    const room = Math.max(0, fieldHeight - heightOf(design, plan, value))
    const ring = swapping.includes(k)
      ? ('trading' as const)
      : comparing.includes(k)
        ? ('looking' as const)
        : undefined
    const base = {
      id,
      value,
      k,
      ring: t >= 1 || !swapping.includes(k) ? ring : undefined,
      finished: k >= end,
    }
    let pose: StegoPose | MonkeyPose = stego ? 'stand' : 'sit'
    if (event === 'ask' && comparing.includes(k)) pose = 'look'
    if (event === 'stop' && k === frame.heap?.parent) pose = stego ? 'proud' : 'sit'
    if (event === 'start' && frame.heap?.phase === 'extract' && k === 0)
      pose = stego ? 'proud' : 'cheer'

    if (done) {
      // The finale: a wave from left to right.
      const phase = Math.max(0, Math.min(1, t * 1.6 - (k / Math.max(1, n)) * 0.6))
      const hop = t >= 1 ? 0 : Math.sin(Math.PI * phase) * Math.min(room, stego ? 5 : 4)
      return { ...base, x: cols.center(k), lift: hop, pose: 'cheer', front: false }
    }

    if (move.kind === 'climb' && from !== k && t < 1) {
      const x = cols.center(from) + (cols.center(k) - cols.center(from)) * e
      if (k === move.parent) {
        // The child climbing up past its parent: in front, off the ground.
        const high = Math.min(room, stego ? STEGO_H * plan.s + 4 : fieldHeight)
        const lift = Math.sin(Math.PI * t) * high
        return {
          ...base,
          x,
          lift,
          pose: stego ? 'step' : 'swing',
          front: true,
          ...(!stego && { vine: { x: (cols.center(from) + cols.center(k)) / 2, y: 0 } }),
        }
      }
      // The parent going down to the child's place, along the ground.
      return {
        ...base,
        x,
        lift: 0,
        pose: stego ? (Math.floor(t * 6) % 2 ? 'step' : 'stand') : 'sit',
        front: false,
      }
    }

    if (move.kind === 'extract' && from !== k && t < 1) {
      const x = cols.center(from) + (cols.center(k) - cols.center(from)) * (stego ? t : e)
      if (k === move.end) {
        // The special move: the top goes to the end and joins the finished ones.
        const lift = stego
          ? Math.abs(Math.sin(Math.PI * 5 * t)) * Math.min(room, 2 * plan.s)
          : Math.sin(Math.PI * t) * Math.min(room, fieldHeight * 0.7)
        return {
          ...base,
          x,
          lift,
          pose: stego ? (Math.floor(t * 10) % 2 ? 'proud' : 'step') : 'swing',
          front: true,
          ...(!stego && {
            vine: { x: (cols.center(from) + cols.center(k)) / 2, y: 0 },
          }),
        }
      }
      // The one from the end goes up to the top, behind it.
      return {
        ...base,
        x,
        lift: stego ? Math.sin(Math.PI * t) * Math.min(room, 3) : 0,
        pose: stego ? (Math.floor(t * 8) % 2 ? 'step' : 'stand') : 'sit',
        front: false,
      }
    }
    return { ...base, x: cols.center(k), lift: 0, pose, front: false }
  })
}

/** The mover's path across its move, for a still: points (x, height off the ground). */
export function pathOf(
  design: Design,
  frames: readonly Frame[],
  ids: readonly (readonly number[])[],
  index: number,
  plan: Plan,
  cols: Columns,
  fieldHeight: number,
): { x: number; lift: number }[] {
  const points: { x: number; lift: number }[] = []
  for (let k = 0; k <= 24; k++) {
    const t = k / 24
    const front = actorsAt(design, frames, ids, index, Math.min(t, 0.999), plan, cols, fieldHeight)
      .filter((a) => a.front)
      .at(0)
    if (front) points.push({ x: front.x, lift: front.lift })
  }
  return points
}
