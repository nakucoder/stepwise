/**
 * Scout and Crane: how selection sort's frames map to the robot. Pure: no React, no DOM.
 *
 * - `robotPoses(frames)`: where everything stands on each frame (the scout, the reticle, the
 *   scan beam, the sorted platform). A pose is a frame's resting picture: reduced motion shows
 *   only poses, and so does any jump that isn't one step forward.
 * - `robotMoves(frames, k)`: what moves when the player steps forward from frame k − 1 to k.
 * - `robotHoldMs`: how long frame k must stay on screen so its move can finish (the carry).
 *
 * Timing, as decided with the user: frequent moves (the scan, the lock-on, a hop, the
 * trolley's return) fit inside the step, scaled with the speed; the special moment (the carry)
 * keeps the spec's 3.4 s at 1× and the step waits for it; the finale dance plays in full.
 */
import { answerAt } from '../../engine/decision'
import type { Frame } from '../../engine/types'
import { stepOffSlot } from './geometry'

export interface RobotPose {
  /** The crate the scout stands on. */
  readonly scout: number
  /** The crate the reticle frames (the smallest so far), if any. */
  readonly reticle: number | null
  /** The crate the scan beam reaches (the one being checked), if any. */
  readonly beam: number | null
  /** How many crates, from the front, are on the lit platform. */
  readonly sorted: number
  /** The last frame, everything sorted: the scout's arms are up, ^ ^ eyes, the hook bows. */
  readonly finale: boolean
}

/** Frame k is the crane carrying the smallest to the front (the swap that answers "to-front"). */
export function isCarry(frames: readonly Frame[], k: number): boolean {
  return frames[k - 1]?.decision?.kind === 'to-front' && answerAt(frames, k - 1)?.kind === 'trade'
}

/** The pose on every frame. The scout starts on the first crate. */
export function robotPoses(frames: readonly Frame[]): RobotPose[] {
  let scout = 0
  return frames.map((frame, k) => {
    const n = frame.array.length
    const min = frame.pointers?.min
    const carry = isCarry(frames, k)
    if (carry && min !== undefined) scout = stepOffSlot(min, n)
    else if (min !== undefined) scout = min
    const comparing = frame.highlights.comparing ?? []
    const j = frame.pointers?.j
    const sorted = frame.highlights.sorted?.length ?? 0
    return {
      scout: Math.max(0, Math.min(scout, n - 1)),
      reticle: min !== undefined && !carry ? min : null,
      beam: comparing.length === 2 && j !== undefined ? j : null,
      sorted,
      finale: k === frames.length - 1 && n > 0 && sorted === n,
    }
  })
}

export type RobotMove =
  /** The beam reaches out to the crate being checked. */
  | { readonly kind: 'scan'; readonly to: number }
  /** A new smallest: the reticle moves to it, and the scout hops on. */
  | { readonly kind: 'lock'; readonly from: number; readonly to: number }
  /** The scout hops to another crate (the start of a round). */
  | { readonly kind: 'hop'; readonly from: number; readonly to: number }
  /** The crane carries the smallest to the front; the front crate slides to where it was. */
  | { readonly kind: 'carry'; readonly front: number; readonly from: number }
  /** After a carry, the trolley rolls back to its parking spot. */
  | { readonly kind: 'return'; readonly from: number }
  /** A crate joins the sorted part (when no carry already lit it). */
  | { readonly kind: 'platform'; readonly slot: number }
  /** Everything is sorted: the platform lights, then the dance. */
  | { readonly kind: 'finale' }

/** What moves when the player steps forward from frame k − 1 to frame k. */
export function robotMoves(
  frames: readonly Frame[],
  k: number,
  poses: readonly RobotPose[] = robotPoses(frames),
): RobotMove[] {
  const before = poses[k - 1]
  const now = poses[k]
  const frame = frames[k]
  if (!before || !now || !frame) return []
  const moves: RobotMove[] = []
  const cameAfterCarry = isCarry(frames, k - 1)

  if (isCarry(frames, k)) {
    const front = frame.pointers?.i
    const from = frame.pointers?.min
    if (front !== undefined && from !== undefined) moves.push({ kind: 'carry', front, from })
  } else if (frame.decision?.kind === 'new-smallest' && now.beam !== null) {
    moves.push({ kind: 'scan', to: now.beam })
  } else if (before.reticle !== null && now.reticle !== null && before.reticle !== now.reticle) {
    moves.push({ kind: 'lock', from: before.reticle, to: now.reticle })
  } else if (before.scout !== now.scout) {
    moves.push({ kind: 'hop', from: before.scout, to: now.scout })
  }

  if (cameAfterCarry) {
    const front = frames[k - 1]?.pointers?.i
    if (front !== undefined) moves.push({ kind: 'return', from: front })
  }
  if (now.finale && !before.finale) moves.push({ kind: 'finale' })
  else if (now.sorted > before.sorted && !cameAfterCarry) {
    moves.push({ kind: 'platform', slot: now.sorted - 1 })
  }
  return moves
}

// ---------- Timing ----------

/** The carry, at 1×. */
export const CARRY_MS = 3400
/** Moments of the carry, as fractions of it (the spec's table): the hook starts down, grips
 * the crate, and lifts it. The claw's sounds land on these. */
export const CARRY_AT = { hookDown: 0.3, grip: 0.42, lift: 0.44 } as const
/** The finale: the platform fades in over 350 ms, the dance starts 400 ms in and lasts
 * about 1.15 s. It plays in full at every speed. */
export const PLATFORM_FADE_MS = 350
export const DANCE_DELAY_MS = 400
export const DANCE_MS = 1150
/** The spec's frequent moves, before they're fitted to the step. */
export const SCAN_MS = 900
export const LOCK_MOVE_MS = 700
export const LOCK_BLINK_MS = 500
export const HOP_MS = 700

const BASE_STEP_MS = 800

/** The carry at this step delay: 3.4 s at 1×, divided by the speed above it, never faster
 * than that below it. */
export function carryMs(stepDelayMs: number): number {
  return CARRY_MS * Math.min(1, stepDelayMs / BASE_STEP_MS)
}

/** A frequent move fitted inside the step: never longer than 90% of it. */
export function fitMs(specMs: number, stepDelayMs: number): number {
  return Math.min(specMs, stepDelayMs * 0.9)
}

/** How long frame k must stay on screen with the robots showing: the carry's length on a
 * carry frame, else nothing beyond the step. */
export function robotHoldMs(frames: readonly Frame[], k: number, stepDelayMs: number): number {
  return isCarry(frames, k) ? carryMs(stepDelayMs) : 0
}
