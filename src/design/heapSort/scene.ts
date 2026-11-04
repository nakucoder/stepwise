/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): the pure part of B2's scenes, from heap
 * sort's real frames: the sizes on a stage, where every log stack and the beaver are at a moment
 * `t` of a step (0: the move starting, 1: the step's pose), and the dam's layout.
 *
 * The stage, as the pizza cart's: a lane along the bottom where the beaver works, the stacks on
 * their number plates at its curb, so the beaver never hides a value. A climb: the beaver finds
 * the bigger child, walks under its stack, lifts it over its head and carries it up to the
 * parent's place; the parent's stack slides down to the child's. A stop: it looks, shrugs, and
 * moves on. The special move: it hauls the top stack over its head to the woodpile at the end,
 * proud, while the stack from the end slides up to the top. The finale: the stacks hop in a
 * wave and the beaver is happy.
 */
import { heapEnd, stageHeight, stageNodeAt, STAGE_PITCH } from '../../components/heapTree'
import type { Frame } from '../../engine/types'
import { LANE_BEAVER_H, LANE_BEAVER_W, type BeaverPose } from './beaver'
import { columnsOf, moveInto, type Columns, type StageSize } from './model'

/** What a stage's sizes come to: sized from the stage's grid of 12, never the run's numbers. */
export interface Plan {
  /** Screen pixels per beaver pixel. */
  readonly s: number
  /** The lane under the stacks (the beaver's height and the curb). */
  readonly lane: number
  /** The number's font and its plate under each stack. */
  readonly font: number
  readonly plate: number
  /** How high a carried stack is lifted off the curb. */
  readonly lift: number
  /** One log's height (whole px, sized for 12, at most 12) and a stack's width. */
  readonly log: number
  readonly width: number
}

export function planOf(size: StageSize, count = 12): Plan {
  const pitch = (size.width + size.gap) / 12
  const h = size.height
  const font = Math.min(16, Math.max(10, Math.floor(Math.min(pitch * 0.42, h * 0.16))))
  const plate = font + 2
  // The beaver may span two and a half columns in its lane (it never hides a value there), and
  // takes at most a quarter of the field's height.
  const s =
    size.beaver ??
    Math.max(
      1,
      Math.min(3, Math.floor(Math.min((pitch * 2.5) / LANE_BEAVER_W, (h * 0.26) / LANE_BEAVER_H))),
    )
  const lane = LANE_BEAVER_H * s + 2
  const lift = 2 * s
  // A stack of 12 and its closing line under it fit over the plate.
  const log = Math.max(1, Math.min(12, Math.floor((h - lane - plate - lift - 1) / 12)))
  const cols = columnsOf(size, count)
  return { s, lane, font, plate, lift, log, width: Math.round(Math.min(cols.col * 0.9, 44)) }
}

export interface StackPose {
  readonly id: number
  readonly value: number
  readonly k: number
  readonly x: number
  /** Off the curb (carried), px. */
  readonly lift: number
  /** In front of the others (the one carried). */
  readonly front: boolean
  readonly ring?: 'looking' | 'trading'
  readonly finished: boolean
}

export interface BeaverState {
  readonly x: number
  readonly pose: BeaverPose
  /** Facing left (mirrored). */
  readonly left: boolean
  /** A small "!" over its head (found a bigger one). */
  readonly bang: boolean
  /** How high it bobs (the proud walk, the finale), px. */
  readonly bob: number
}

export interface ScenePose {
  readonly stacks: readonly StackPose[]
  readonly beaver: BeaverState
}

/** The move's own length at 1× (the clip times each step by it). */
export const MOVE_MS = {
  ask: 500,
  climb: 820,
  stop: 760,
  settles: 400,
  handover: 600,
  extract: 2000,
  done: 1600,
} as const

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const ease = (t: number) => {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}
/** Progress through the part of a step from a to b. */
const part = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Where the beaver rests once a step is over, and in which mood. */
function restOf(frame: Frame | undefined, cols: Columns): { x: number; pose: BeaverPose } {
  const heap = frame?.heap
  const n = frame?.array.length ?? 0
  if (!heap || n === 0) return { x: cols.center(0), pose: 'idle' }
  const parent = heap.parent ?? 0
  switch (heap.event) {
    case 'ask':
      return { x: cols.center(parent), pose: 'look' }
    case 'climb':
      return { x: cols.center(parent), pose: 'idle' }
    case 'stop':
      return { x: cols.center(parent) + (cols.col + cols.gap) / 2, pose: 'idle' }
    case 'settles':
      return { x: cols.center(parent), pose: 'idle' }
    case 'extract':
      return { x: cols.center(heap.size), pose: 'proud' }
    case 'done':
      return { x: cols.center(n - 1), pose: 'happy' }
    default:
      return heap.phase === 'extract'
        ? { x: cols.center(0), pose: 'proud' }
        : { x: cols.center(0), pose: 'idle' }
  }
}

/** A walk from a to b over the part [p0, p1] of the step: position, legs and facing. */
function walk(a: number, b: number, t: number, p0: number, p1: number, s: number) {
  const p = ease(part(t, p0, p1))
  const x = lerp(a, b, p)
  const legs = Math.floor(Math.abs(x - a) / (3 * s)) % 2 === 0 ? 'walk' : 'walk2'
  return { x, legs: legs as BeaverPose, left: b < a }
}

/** Every stack and the beaver at moment `t` of step `index` (t = 1: the step's pose). */
export function sceneAt(
  frames: readonly Frame[],
  ids: readonly (readonly number[])[],
  index: number,
  t: number,
  plan: Plan,
  cols: Columns,
): ScenePose {
  const frame = frames[index]
  if (!frame)
    return { stacks: [], beaver: { x: 0, pose: 'idle', left: false, bang: false, bob: 0 } }
  const now = ids[index] ?? []
  const event = frame.heap?.event
  const n = frame.array.length
  const end = heapEnd(frame)
  const comparing = frame.highlights.comparing ?? []
  const swapping = frame.highlights.swapping ?? []
  const move = index > 0 ? moveInto(frames, index) : ({ kind: 'none' } as const)
  const rest = restOf(frame, cols)
  const prev = index > 0 ? restOf(frames[index - 1], cols) : rest
  const settled = t >= 1

  // The stacks, at their step's places, except the two a move carries and slides.
  const stacks: StackPose[] = frame.array.map((value, k) => {
    const id = now[k] ?? k
    const ring = swapping.includes(k)
      ? ('trading' as const)
      : comparing.includes(k)
        ? ('looking' as const)
        : undefined
    return {
      id,
      value,
      k,
      x: cols.center(k),
      lift: 0,
      front: false,
      ...((settled || !swapping.includes(k)) && ring && { ring }),
      finished: k >= end,
    }
  })

  let beaver: BeaverState = { ...rest, left: false, bang: false, bob: 0 }
  if (settled) return { stacks, beaver }

  const s = plan.s
  const swap = (carried: number, slid: number, from: number, to: number, a: number, b: number) => {
    // The carried stack (now at `to`, from `from`) rides on the beaver; the other slides back.
    const p = ease(part(t, a, b))
    const up = t < a ? part(t, a - 0.1, a) : t > b ? 1 - part(t, b, b + 0.08) : 1
    const c = stacks[carried]
    const o = stacks[slid]
    if (c)
      stacks[carried] = {
        ...c,
        x: lerp(cols.center(from), cols.center(to), p),
        lift: up * plan.lift,
        front: true,
      }
    if (o) stacks[slid] = { ...o, x: lerp(cols.center(to), cols.center(from), p) }
    return lerp(cols.center(from), cols.center(to), p)
  }

  if (move.kind === 'climb') {
    // Found it, walk under the child's stack, lift it, carry it up to the parent's place.
    const { parent, child } = move
    if (t < 0.15) {
      beaver = { x: prev.x, pose: 'found', left: false, bang: true, bob: 0 }
    } else if (t < 0.4) {
      const w = walk(prev.x, cols.center(child), t, 0.15, 0.4, s)
      beaver = { x: w.x, pose: w.legs, left: w.left, bang: false, bob: 0 }
    } else {
      const x = swap(parent, child, child, parent, 0.5, 0.9)
      beaver = { x, pose: t < 0.95 ? 'carry' : 'idle', left: true, bang: false, bob: 0 }
    }
    // Moves don't wear their rings until the step's pose.
    return { stacks, beaver }
  }

  if (move.kind === 'extract') {
    // The special move: walk to the top, lift its stack over its head, haul it to the woodpile.
    const k = move.end
    if (t < 0.2) {
      const w = walk(prev.x, cols.center(0), t, 0, 0.2, s)
      beaver = { x: w.x, pose: w.legs, left: w.left, bang: false, bob: 0 }
    } else {
      const x = swap(k, 0, 0, k, 0.3, 0.85)
      const hauling = t >= 0.3 && t < 0.85
      beaver = {
        x,
        pose: t < 0.3 ? 'carry' : hauling ? 'proud' : 'proud',
        left: false,
        bang: false,
        // A proud bounce with each step.
        bob: hauling ? Math.abs(Math.sin(part(t, 0.3, 0.85) * Math.PI * 6)) * s : 0,
      }
    }
    return { stacks, beaver }
  }

  if (event === 'stop') {
    // It looks, shrugs, and moves on.
    if (t < 0.3) beaver = { x: prev.x, pose: 'look', left: false, bang: false, bob: 0 }
    else if (t < 0.7) beaver = { x: prev.x, pose: 'shrug', left: false, bang: false, bob: 0 }
    else {
      const w = walk(prev.x, rest.x, t, 0.7, 1, s)
      beaver = { x: w.x, pose: w.legs, left: w.left, bang: false, bob: 0 }
    }
    return { stacks, beaver }
  }

  if (event === 'done' && n > 1) {
    // The finale: walk to the end, the stacks hop in a wave, the beaver is happy.
    const w = walk(prev.x, rest.x, t, 0, 0.3, s)
    beaver = {
      x: w.x,
      pose: t < 0.3 ? w.legs : 'happy',
      left: false,
      bang: false,
      bob: t >= 0.3 ? Math.abs(Math.sin(part(t, 0.3, 1) * Math.PI * 3)) * s : 0,
    }
    const hop = Math.min(plan.lift * 1.5, 4 * s)
    stacks.forEach((stack, k) => {
      const phase = clamp01(part(t, 0.2, 1) * 1.6 - (k / Math.max(1, n)) * 0.6)
      stacks[k] = { ...stack, lift: Math.sin(Math.PI * phase) * hop }
    })
    return { stacks, beaver }
  }

  // Every other step: walk from where it was to where this step rests, then its mood.
  const w = walk(prev.x, rest.x, t, 0, 0.6, s)
  beaver = {
    x: w.x,
    pose: t < 0.6 && Math.abs(rest.x - prev.x) > 1 ? w.legs : rest.pose,
    left: t < 0.6 && w.left,
    bang: false,
    bob: 0,
  }
  return { stacks, beaver }
}

/** The beaver's sprite size on the stage, in screen px. */
export const beaverBox = (plan: Plan) => ({
  w: LANE_BEAVER_W * plan.s,
  h: LANE_BEAVER_H * plan.s,
})

// ---------- The dam (the tree view) ----------

export interface DamLayout {
  readonly w: number
  readonly h: number
  /** A log end's size across. */
  readonly d: number
  /** Each position's center, in the box's pixels. */
  readonly at: (k: number) => { readonly x: number; readonly y: number }
}

/** The dam at the site's tree size: each place where the site's tree puts it. */
export function damLayout(
  box: { width: number; height: number },
  count: number,
  beside = false,
): DamLayout {
  const rows = count < 1 ? 1 : Math.floor(Math.log2(count)) + 1
  if (beside) {
    // Beside the stacks: the dam stands on the ground (the lane's curb), as wide as its box, each
    // row a little closer than a log's size so the logs rest on the two under them.
    const d = Math.max(12, Math.floor(Math.min((box.width / 2 ** (rows - 1)) * 0.9, 34)))
    const pitch = d * 1.15
    const top = box.height - (rows - 1) * pitch - d / 2 - 6
    return {
      w: box.width,
      h: box.height,
      d,
      at: (k) => {
        const row = Math.floor(Math.log2(k + 1))
        const across = k - (2 ** row - 1)
        return { x: ((across + 0.5) * box.width) / 2 ** row, y: top + row * pitch }
      },
    }
  }
  const rowPitch = (box.height * STAGE_PITCH) / stageHeight(count)
  const slot = box.width / 2 ** (rows - 1)
  const d = Math.max(12, Math.floor(Math.min(rowPitch * 0.92, slot * 0.9, 36)))
  return {
    w: box.width,
    h: box.height,
    d,
    at: (k) => {
      const p = stageNodeAt(k, count)
      return { x: p.x * box.width, y: p.y * box.height }
    },
  }
}

export interface DamNode {
  readonly id: number
  readonly value: number
  readonly x: number
  readonly y: number
  readonly fade: number
  readonly ring?: 'looking' | 'trading'
}

/** The log ends in the dam at moment `t`: the heap's values (finished ones leave the dam). */
export function damAt(
  frames: readonly Frame[],
  ids: readonly (readonly number[])[],
  index: number,
  t: number,
  layout: DamLayout,
): DamNode[] {
  const frame = frames[index]
  if (!frame) return []
  const now = ids[index] ?? []
  const before = ids[index - 1] ?? now
  const end = heapEnd(frame)
  const move = index > 0 ? moveInto(frames, index) : ({ kind: 'none' } as const)
  const comparing = frame.highlights.comparing ?? []
  const swapping = frame.highlights.swapping ?? []
  const moving = move.kind !== 'none' && t < 1
  const p = ease(part(t, 0.4, 0.9))
  return frame.array.flatMap((value, k) => {
    const id = now[k] ?? k
    const ring = swapping.includes(k)
      ? ('trading' as const)
      : comparing.includes(k)
        ? ('looking' as const)
        : undefined
    const target = layout.at(k)
    const from = before.indexOf(id)
    if (moving && from !== k) {
      const start = layout.at(from)
      if (move.kind === 'extract' && k === move.end) {
        // The top leaves the dam, down to the woodpile's side.
        const exit = { x: layout.w - layout.d / 2, y: layout.h + layout.d }
        return [
          { id, value, x: lerp(start.x, exit.x, p), y: lerp(start.y, exit.y, p), fade: 1 - p },
        ]
      }
      return [{ id, value, x: lerp(start.x, target.x, p), y: lerp(start.y, target.y, p), fade: 1 }]
    }
    if (k >= end) return []
    return [{ id, value, ...target, fade: 1, ...(!moving && ring && { ring }) }]
  })
}
