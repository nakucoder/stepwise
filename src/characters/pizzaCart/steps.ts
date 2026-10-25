/**
 * Quick sort's pizza cart: how the frames map to the stacks and the cart. Pure: no React, no DOM.
 *
 * Nothing new is needed from the frames: `partition` (the range, the leader, the wall, the next
 * value, the event) and the swaps between frames carry everything. Each stack is numbered by its
 * column in the first frame and followed through every swap, so it keeps its own boxes.
 *
 * - `pizzaPoses(frames)`: every frame's resting picture (reduced motion and jumps show only these).
 * - `pizzaMoves(frames, k)`: what moves when the player steps forward from frame k − 1 to k.
 * - `cartMood(pose)` and `moodFrames(mood, stepDelayMs)`: the cart's face, antenna and flag.
 * - `pizzaHoldMs`: how long frame k must stay on screen so "Delivered!" can finish.
 *
 * Timing (CLAUDE.md, "Characters"): frequent moves fit inside the step and scale with the speed;
 * "Delivered!" (placing the leader) keeps its full 1.6 s at 1× (two steps) and the step waits
 * for it; the finale plays in full.
 */
import type { Frame } from '../../engine/types'
import { fitMs, specialMs } from '../pixel'
import type { Antenna, Face } from './sprites'

/** Where a column stands in the range being worked on. */
export type Zone = 'left' | 'bigger' | 'unchecked' | 'leader' | 'placed' | 'out'

/** What the cart is doing in a pose (the spec's moments). */
export type Action =
  'idle' | 'pick' | 'look' | 'carry' | 'nudge' | 'stay' | 'deliver' | 'done' | 'finale'

export interface PizzaPose {
  /** Which stack stands in each column: stacks are numbered by their column in the first frame. */
  readonly order: readonly number[]
  /** Each column's zone (null: no range yet, or all done). */
  readonly zones: readonly (Zone | null)[]
  /** The range being worked on, `[lo, hi)`: the others are dimmed until they are in place. */
  readonly range: readonly [number, number] | null
  /** The leader's column while it is red (picked, until it is placed). */
  readonly leader: number | null
  /** The column being compared with the leader: ringed yellow. */
  readonly compared: number | null
  /** The columns in their final place: the green bar under them. */
  readonly sorted: readonly number[]
  /** "Delivered!": the leader's column, its top box open, steam over it. */
  readonly open: number | null
  /** The column the cart works under (in the finale, the middle: it may fall between two), and
   * what it does there. */
  readonly cart: number
  readonly action: Action
  /** The last frame, everything in place: the finale. */
  readonly final: boolean
}

export type PizzaMove =
  /** The cart rolls along the lane to its new column. */
  | { readonly kind: 'roll'; readonly from: number; readonly to: number }
  /**
   * The cart rolls under a stack, lifts it on its deck and rolls it to its new column; the other
   * stack slides along the curb to the column it left.
   */
  | {
      readonly kind: 'carry'
      readonly stack: number
      readonly from: number
      readonly to: number
      readonly other: number
      /** The cart's column before the move. */
      readonly cartFrom: number
    }
  /** The leader's boxes pop red with the ribbon. */
  | { readonly kind: 'pop'; readonly stack: number }
  /** A trade with itself: the stack is lifted and set down in place. */
  | { readonly kind: 'nudge'; readonly stack: number }
  /** Left on the right: the stack wobbles once. */
  | { readonly kind: 'stay'; readonly stack: number }
  /** "Delivered!": the top box opens on its pizza, the lid flips up, a puff of steam rises. */
  | { readonly kind: 'deliver'; readonly stack: number; readonly carried: boolean }
  /** The green bar fades in under a column now in place. */
  | { readonly kind: 'done'; readonly col: number }
  /** The stacks hop in a wave, left to right; the cart bounces. */
  | { readonly kind: 'finale' }

// ---------- Timing (the spec's moves at 1×, before they're fitted to the step) ----------

export const ROLL_MS = 400
export const POP_MS = 300
export const NUDGE_MS = 450
export const WOBBLE_MS = 450
export const DONE_MS = 330
/**
 * A trade: the cart rolls under the stack (to 35%), lifts it (to 40%), rolls it to its new place
 * (to 92%) and sets it down.
 */
export const CARRY_MS = 700
export const CARRY_AT = { pick: 0.35, lift: 0.4, land: 0.92 } as const
/**
 * "Delivered!", the special move: two steps at 1×. The carry into the gap takes the first 950 ms
 * (on the same shape as a trade), then the lid flips up (300 ms) and the steam rises in turn
 * (from 1000 ms, each puff 450 ms, 75 ms apart), while the cart's proud mood plays (650 ms).
 */
export const DELIVER_MS = 1600
export const DELIVER_AT = { drop: 950, lid: 300, steam: 1000, puff: 450, puffGap: 75 } as const
/** The finale: each stack hops (280 ms) in turn, left to right, over 840 ms in all. */
export const FINALE_MS = 840
export const FINALE_HOP_MS = 280
/** How high a stack is lifted on the deck (a trade, the delivery) and nudged, in cart pixels. */
export const LIFT = 2
export const NUDGE_LIFT = 3

/** "Delivered!" at this step delay: 1.6 s at 1× and slower, divided by the speed above 1×. */
export function deliverMs(stepDelayMs: number): number {
  return specialMs(DELIVER_MS, stepDelayMs)
}

/** When stack k (from the left) of `count` hops in the finale. */
export function finaleHopAt(k: number, count: number): number {
  return count > 1 ? (k * (FINALE_MS - FINALE_HOP_MS)) / (count - 1) : 0
}

// ---------- The cart's moods ----------

export type Mood = 'idle' | 'look' | 'found' | 'stay' | 'delivered' | 'done' | 'finale'

export interface MoodFrame {
  readonly face: Face
  readonly antenna?: Antenna
  readonly flag?: 'a' | 'b'
  /** The small "!" over its screen. */
  readonly bang?: boolean
  /** How long this frame shows at 1×, before fitting (the last one holds). */
  readonly ms: number
}

export interface MoodSpec {
  /** A frequent mood fits inside the step; "Delivered!" is held; the finale plays in full. */
  readonly timing: 'fit' | 'special' | 'full'
  readonly frames: readonly MoodFrame[]
}

export const MOODS: Readonly<Record<Mood, MoodSpec>> = {
  idle: { timing: 'fit', frames: [{ face: 'idle', ms: 0 }] },
  // Its eyes go up to the box, across to the leader (the antenna tilts toward it) and back.
  look: {
    timing: 'fit',
    frames: [
      { face: 'box', ms: 260 },
      { face: 'leader', antenna: 'right', ms: 300 },
      { face: 'box', ms: 0 },
    ],
  },
  // Wide eyes, a small "!", the antenna wiggles fast.
  found: {
    timing: 'fit',
    frames: [
      { face: 'wide', bang: true, antenna: 'left', ms: 45 },
      { face: 'wide', bang: true, antenna: 'right', ms: 45 },
      { face: 'wide', bang: true, antenna: 'left', ms: 45 },
      { face: 'wide', bang: true, antenna: 'right', ms: 45 },
      { face: 'wide', bang: true, ms: 90 },
      { face: 'idle', ms: 0 },
    ],
  },
  // Always calm: one blink, the antenna and flag still.
  stay: {
    timing: 'fit',
    frames: [
      { face: 'idle', ms: 260 },
      { face: 'blink', ms: 110 },
      { face: 'idle', ms: 0 },
    ],
  },
  // A proud smile, the antenna bounces.
  delivered: {
    timing: 'special',
    frames: [
      { face: 'proud', antenna: 'low', ms: 130 },
      { face: 'proud', ms: 130 },
      { face: 'proud', antenna: 'low', ms: 130 },
      { face: 'proud', ms: 130 },
      { face: 'proud', antenna: 'low', ms: 130 },
      { face: 'proud', ms: 0 },
    ],
  },
  // Happy ^ ^ eyes, the antenna and the flag wave.
  done: {
    timing: 'fit',
    frames: [
      { face: 'happy', antenna: 'left', flag: 'b', ms: 110 },
      { face: 'happy', antenna: 'right', flag: 'a', ms: 110 },
      { face: 'happy', antenna: 'left', flag: 'b', ms: 110 },
      { face: 'happy', ms: 0 },
    ],
  },
  finale: {
    timing: 'full',
    frames: [
      { face: 'happy', antenna: 'left', flag: 'b', ms: 140 },
      { face: 'happy', antenna: 'right', flag: 'a', ms: 140 },
      { face: 'happy', antenna: 'left', flag: 'b', ms: 140 },
      { face: 'happy', antenna: 'right', flag: 'a', ms: 140 },
      { face: 'happy', antenna: 'left', flag: 'b', ms: 140 },
      { face: 'happy', antenna: 'right', flag: 'a', ms: 140 },
      { face: 'happy', ms: 0 },
    ],
  },
}

/** A mood's own length at 1× (every frame but the last, which holds). */
export function moodMs(mood: Mood): number {
  return MOODS[mood].frames.reduce((sum, f) => sum + f.ms, 0)
}

/** The mood's frames timed for the step: fitted (fitMs), held (specialMs) or in full. */
export function moodFrames(mood: Mood, stepDelayMs: number): readonly MoodFrame[] {
  const spec = MOODS[mood]
  const own = moodMs(mood)
  if (own === 0) return spec.frames
  const total =
    spec.timing === 'fit'
      ? fitMs(own, stepDelayMs)
      : spec.timing === 'special'
        ? specialMs(own, stepDelayMs)
        : own
  return spec.frames.map((f) => ({ ...f, ms: (f.ms * total) / own }))
}

/** A mood's resting face: its last frame (reduced motion, a jump, and after it has played). */
export function restingFrame(mood: Mood): MoodFrame {
  const frames = MOODS[mood].frames
  return frames[frames.length - 1] ?? { face: 'idle', ms: 0 }
}

const MOOD_OF: Readonly<Record<Action, Mood>> = {
  idle: 'idle',
  pick: 'look',
  look: 'look',
  carry: 'found',
  nudge: 'found',
  stay: 'stay',
  deliver: 'delivered',
  done: 'done',
  finale: 'finale',
}

/** The cart's mood in a pose. Picking the leader (and carrying it to the end) is looking. */
export function cartMood(pose: Pick<PizzaPose, 'action'>): Mood {
  return MOOD_OF[pose.action]
}

// ---------- Poses ----------

function zoneOf(frame: Frame, c: number): Zone | null {
  const p = frame.partition
  if (!p) return null
  if (c < p.lo || c >= p.hi) return 'out'
  if (p.event === 'done') return 'placed'
  if (p.event === 'place') return c === p.pivot ? 'placed' : c < p.pivot ? 'left' : 'bigger'
  if (c === p.pivot) return 'leader'
  if (p.event === 'range' || p.event === 'pick') return 'unchecked'
  if (c < p.wall) return 'left'
  if (c < p.next) return 'bigger'
  return 'unchecked'
}

/** The two columns a frame swaps, if any (a swap of a value with itself swaps nothing). */
function swapOf(frame: Frame): readonly [number, number] | null {
  const pair = frame.highlights.swapping
  if (pair?.length !== 2) return null
  const [a, b] = pair
  return a !== undefined && b !== undefined && a !== b ? [a, b] : null
}

const allSorted = (frame: Frame) =>
  frame.array.length > 0 && (frame.highlights.sorted?.length ?? 0) === frame.array.length

/** Each frame's pose, from the run: the stacks are followed through every swap. */
export function pizzaPoses(frames: readonly Frame[]): PizzaPose[] {
  let order = (frames[0]?.array ?? []).map((_, k) => k)
  let cart = 0
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
    const p = frame.partition
    const final = k === last && allSorted(frame)
    let action: Action = 'idle'
    if (final) {
      // The finale: the cart rolls to the middle of the stage.
      action = 'finale'
      cart = (frame.array.length - 1) / 2
    } else if (p) {
      switch (p.event) {
        case 'range':
        case 'pick':
          action = 'pick'
          cart = p.pivot
          break
        case 'compare':
          action = 'look'
          cart = p.next
          break
        case 'left':
          action = swap ? 'carry' : 'nudge'
          cart = p.wall - 1
          break
        case 'right':
          action = 'stay'
          cart = p.next - 1
          break
        case 'place':
          action = 'deliver'
          cart = p.pivot
          break
        case 'done':
          action = 'done'
          cart = p.lo
          break
      }
    }
    const placing = p?.event === 'place'
    return {
      order,
      zones: frame.array.map((_, c) => zoneOf(frame, c)),
      range: p ? [p.lo, p.hi] : null,
      // Red from the pick until it is placed (and open on the placing frame).
      leader: p && p.event !== 'done' ? p.pivot : null,
      compared: p?.event === 'compare' ? p.next : null,
      sorted: frame.highlights.sorted ?? [],
      open: placing ? p.pivot : null,
      cart,
      action,
      final,
    }
  })
}

// ---------- Moves ----------

/** What moves when the player steps forward from frame k − 1 to frame k. */
export function pizzaMoves(
  frames: readonly Frame[],
  k: number,
  poses: readonly PizzaPose[] = pizzaPoses(frames),
): PizzaMove[] {
  const before = poses[k - 1]
  const now = poses[k]
  const frame = frames[k]
  if (!before || !now || !frame) return []
  if (now.final) {
    return [
      ...(before.cart === now.cart
        ? []
        : [{ kind: 'roll', from: before.cart, to: now.cart } as const]),
      { kind: 'finale' },
    ]
  }
  const moves: PizzaMove[] = []
  const swap = swapOf(frame)
  const p = frame.partition
  if (swap) {
    const [a, b] = swap
    // The carried one: the leader on pick and place, else the one that goes left (to the wall).
    const to = p?.event === 'pick' ? p.pivot : p?.event === 'place' ? p.pivot : Math.min(a, b)
    const from = to === a ? b : a
    moves.push({
      kind: 'carry',
      stack: now.order[to] ?? -1,
      from,
      to,
      other: now.order[from] ?? -1,
      cartFrom: before.cart,
    })
  } else if (before.cart !== now.cart) {
    moves.push({ kind: 'roll', from: before.cart, to: now.cart })
  }
  if (p?.event === 'range') moves.push({ kind: 'pop', stack: now.order[p.pivot] ?? -1 })
  if (now.action === 'nudge') moves.push({ kind: 'nudge', stack: now.order[now.cart] ?? -1 })
  if (now.action === 'stay') moves.push({ kind: 'stay', stack: now.order[now.cart] ?? -1 })
  if (now.open !== null) {
    moves.push({ kind: 'deliver', stack: now.order[now.open] ?? -1, carried: swap !== null })
  }
  for (const col of now.sorted) {
    if (!before.sorted.includes(col)) moves.push({ kind: 'done', col })
  }
  return moves
}

/** Each run's poses, worked out once (the hold is asked on every step). */
const posesCache = new WeakMap<readonly Frame[], PizzaPose[]>()
export function posesOf(frames: readonly Frame[]): PizzaPose[] {
  let poses = posesCache.get(frames)
  if (!poses) {
    poses = pizzaPoses(frames)
    posesCache.set(frames, poses)
  }
  return poses
}

/** Whether stepping into frame k plays "Delivered!". */
export function isDelivery(frames: readonly Frame[], k: number): boolean {
  return k > 0 && posesOf(frames)[k]?.action === 'deliver'
}

/** How long frame k must stay on screen with the cart showing: "Delivered!" on a placing frame. */
export function pizzaHoldMs(frames: readonly Frame[], k: number, stepDelayMs: number): number {
  return isDelivery(frames, k) ? deliverMs(stepDelayMs) : 0
}
