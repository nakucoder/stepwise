/**
 * Snow-brick towers: how insertion sort's frames map to the penguins. Pure: no React, no DOM.
 *
 * The frames are permutations (the shift version, drawn with the key in the gap it waits for),
 * so bars, Do it and the checks work unchanged. The penguins tell the shift story: the key's
 * tower steps out of the line onto a sled in the lane and waits there, at the slot it came
 * from, while the bigger towers slide right; then it slides into its gap.
 *
 * - `penguinPoses(frames)`: every frame's resting picture. Reduced motion shows only poses, and
 *   so does any jump that isn't one step forward.
 * - `penguinMoves(frames, k)`: what moves when the player steps forward from frame k − 1 to k.
 * - `penguinHoldMs`: how long frame k must stay on screen so its move can finish (the slide).
 *
 * Timing (CLAUDE.md, "Characters"): frequent moves fit inside the step and scale with the speed;
 * the special move (the slide into place) keeps its full 1.6 s at 1× and the step waits for it;
 * the finale plays in full.
 */
import type { Frame } from '../../engine/types'
import { fitMs, specialMs } from '../pixel'

export interface PenguinPose {
  /** Which tower stands in each slot: towers are numbered by their slot in the first frame, so
   * equal values stay told apart. During a round the key's slot is the gap it waits for. */
  readonly order: readonly number[]
  /** The key, while it waits in the lane: its tower, the gap it waits for, and the slot it came
   * from (where it waits). */
  readonly key: { readonly tower: number; readonly slot: number; readonly waitAt: number } | null
  /** How many at the front are in order so far: the frosted shelf under them. */
  readonly inOrder: number
  /** Everything final: the green ground, every penguin with its flippers up. */
  readonly final: boolean
  /** The two slots being compared (the key's gap and its left neighbor), if any. */
  readonly compare: readonly [number, number] | null
}

export type PenguinMove =
  /** The key's tower steps out of the line onto its sled in the lane. */
  | { readonly kind: 'start'; readonly tower: number; readonly slot: number }
  /** The comparing marks appear on the two tops. */
  | { readonly kind: 'compare' }
  /** A bigger tower glides one slot right, into the gap. */
  | { readonly kind: 'shift'; readonly tower: number; readonly from: number; readonly to: number }
  /** The key's tower slides along the lane into its gap (the special move), or, already in
   * place, steps straight back into its slot and its penguin hops. The newly in-order slot's
   * frost fades in at the end of either. */
  | {
      readonly kind: 'slide' | 'in-place'
      readonly tower: number
      readonly from: number
      readonly to: number
      readonly frost: number | null
    }
  /** Everything final: the green, the flipper wave, the hop. */
  | { readonly kind: 'finale' }

// ---------- Timing ----------

/** The spec's moves at 1×, before they're fitted to the step. */
export const START_MS = 600
export const COMPARE_MS = 300
export const SHIFT_MS = 600
/** Already in place: the tower steps back (400 ms), then its penguin hops (300 ms), fitted to
 * the step together. */
export const STEP_BACK_MS = 400
export const IN_PLACE_HOP_MS = 300
export const FROST_MS = 350
/** The slide into place, at 1×, and its moments as fractions of it: the sled reaches the gap,
 * the ice spray, the penguin stands up. */
export const SLIDE_MS = 1600
export const SLIDE_AT = { gap: 0.78, sprayFrom: 0.2, sprayTo: 0.75, standUp: 0.9 } as const
/** The finale: the green fades in, then each penguin raises its flippers in turn, left to
 * right, then they all hop together. It plays in full at every speed. */
export const FINALE_FADE_MS = 350
export const FLAP_DELAY_MS = 400
export const FLAP_STAGGER_MS = 110
export const FINALE_HOP_GAP_MS = 120
export const FINALE_HOP_MS = 260

/** The slide at this step delay: 1.6 s at 1× and slower, divided by the speed above 1×. */
export function slideMs(stepDelayMs: number): number {
  return specialMs(SLIDE_MS, stepDelayMs)
}

/** Already in place, fitted to the step: the step back and the hop, scaled together. */
export function inPlaceMs(stepDelayMs: number): { readonly back: number; readonly hop: number } {
  const total = fitMs(STEP_BACK_MS + IN_PLACE_HOP_MS, stepDelayMs)
  const back = (total * STEP_BACK_MS) / (STEP_BACK_MS + IN_PLACE_HOP_MS)
  return { back, hop: total - back }
}

/** The frost fades in during the last 350 ms of the move that lands the key (all of it, if the
 * move is shorter). */
export function frostTiming(moveMs: number): { readonly delay: number; readonly duration: number } {
  const duration = Math.min(FROST_MS, moveMs)
  return { delay: moveMs - duration, duration }
}

/** When penguin k (from the left) raises its flippers, and when they all hop, in the finale. */
export const flapAt = (k: number) => FLAP_DELAY_MS + k * FLAP_STAGGER_MS
export const finaleHopAt = (count: number) =>
  FLAP_DELAY_MS + count * FLAP_STAGGER_MS + FINALE_HOP_GAP_MS

// ---------- Poses ----------

const isFinal = (frame: Frame) =>
  frame.array.length > 0 && (frame.highlights.sorted?.length ?? 0) === frame.array.length

/** Each frame's pose, from the run: the towers are followed through every shift. */
export function penguinPoses(frames: readonly Frame[]): PenguinPose[] {
  let order = (frames[0]?.array ?? []).map((_, k) => k)
  let previous: readonly number[] = frames[0]?.array ?? []
  return frames.map((frame) => {
    // A shift trades the key's slot with its left neighbor's (the frames are permutations).
    const swap = frame.highlights.swapping
    if (swap?.length === 2 && frame.array !== previous) {
      const [a, b] = swap
      if (a !== undefined && b !== undefined && frame.array[a] !== previous[a]) {
        const next = [...order]
        next[a] = order[b] ?? -1
        next[b] = order[a] ?? -1
        order = next
      }
    }
    previous = frame.array
    const vars = frame.variables ?? {}
    const i = typeof vars.i === 'number' ? vars.i : null
    const inOrder = typeof vars.inOrder === 'number' ? vars.inOrder : 0
    const slot = frame.pointers?.key
    // The key waits from the round's start until it is put back: then inOrder becomes i + 1.
    const waiting = i !== null && inOrder === i && slot !== undefined
    const comparing = frame.highlights.comparing
    return {
      order,
      key: waiting ? { tower: order[slot] ?? -1, slot, waitAt: i } : null,
      inOrder,
      final: isFinal(frame),
      compare:
        comparing?.length === 2 && comparing[0] !== undefined && comparing[1] !== undefined
          ? [comparing[0], comparing[1]]
          : null,
    }
  })
}

// ---------- Moves ----------

const sameCompare = (a: PenguinPose['compare'], b: PenguinPose['compare']) =>
  a === b || (a !== null && b !== null && a[0] === b[0] && a[1] === b[1])

/** What moves when the player steps forward from frame k − 1 to frame k. */
export function penguinMoves(
  frames: readonly Frame[],
  k: number,
  poses: readonly PenguinPose[] = penguinPoses(frames),
): PenguinMove[] {
  const before = poses[k - 1]
  const now = poses[k]
  if (!before || !now) return []
  const moves: PenguinMove[] = []
  if (now.key && !before.key) {
    moves.push({ kind: 'start', tower: now.key.tower, slot: now.key.waitAt })
  }
  if (now.key && before.key && now.key.slot === before.key.slot - 1) {
    // The bigger one, now in the slot the gap just left.
    const to = before.key.slot
    moves.push({ kind: 'shift', tower: now.order[to] ?? -1, from: now.key.slot, to })
  }
  if (now.compare && !sameCompare(now.compare, before.compare)) moves.push({ kind: 'compare' })
  if (before.key && !now.key) {
    const { tower, slot, waitAt } = before.key
    moves.push({
      kind: slot === waitAt ? 'in-place' : 'slide',
      tower,
      from: waitAt,
      to: slot,
      frost: now.inOrder > before.inOrder && !now.final ? now.inOrder - 1 : null,
    })
  }
  if (now.final && !before.final) moves.push({ kind: 'finale' })
  return moves
}

/** Each run's poses, worked out once (the hold is asked on every step). */
const posesCache = new WeakMap<readonly Frame[], PenguinPose[]>()
function posesOf(frames: readonly Frame[]): PenguinPose[] {
  let poses = posesCache.get(frames)
  if (!poses) {
    poses = penguinPoses(frames)
    posesCache.set(frames, poses)
  }
  return poses
}

/** Whether stepping into frame k plays the slide into place. */
export function isSlide(frames: readonly Frame[], k: number): boolean {
  return penguinMoves(frames, k, posesOf(frames)).some((move) => move.kind === 'slide')
}

/** How long frame k must stay on screen with the penguins showing: the slide's length on a
 * slide frame, else nothing beyond the step. */
export function penguinHoldMs(frames: readonly Frame[], k: number, stepDelayMs: number): number {
  return isSlide(frames, k) ? slideMs(stepDelayMs) : 0
}
