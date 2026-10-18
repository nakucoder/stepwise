/**
 * Squadrons and a stargate (design/mockups/spaceships/README.md, "The moves"): each frame's pose
 * and the moves between frames, from merge sort's frames. Pure: no React, no DOM.
 *
 * - `spaceshipPoses(frames)`: where every ship is at each frame. Ships are numbered by their
 *   column in the first frame and followed through every split and merge, so equal values stay
 *   told apart.
 * - `spaceshipMoves(frames, k)`: what moves when the player steps forward into frame k.
 * - `spaceshipHoldMs`: how long frame k must stay on screen (the gate shutting).
 *
 * Timing (CLAUDE.md, "Characters"): frequent moves fit inside the step and scale with the speed;
 * the special move (the gate's flash and shut) keeps its full 900 ms at 1× and the step waits
 * for it; the finale plays in full.
 */
import type { Frame, SpanStep } from '../../engine/types'
import { fitMs, specialMs } from '../pixel'

// ---------- Times, in ms at 1× (a step is 800 ms) ----------

export const SPLIT_MS = 600
export const GATE_OPEN_MS = 300
export const COMPARE_MS = 200
export const TAKE_MS = 650
/** The other lead easing back into formation after a take. */
export const BACK_MS = 200
/** The take's flight (flight.ts): it crosses the gate's bar at 50%, which lights 45–55%. */
export const TAKE_AT = { gateFrom: 0.45, gateTo: 0.55 } as const
/** The special move: the flash (to 100 ms), the shut (to 600 ms), the bracket's glow (to 900). */
export const SHUT_MS = 900
export const SHUT_AT = { flash: 100, shut: 600 } as const
/** The finale: the green rings, then the ships take off in turn: up and out, back in from below. */
export const FINALE_RING_MS = 350
export const TAKEOFF_AT = 400
export const TAKEOFF_STAGGER_MS = 80
export const FLY_OUT_MS = 500
export const FLY_IN_MS = 700
/** Zoom: a new family fades in, as a jump would show it. */
export const FADE_MS = 200

/** The gate opening and the first compare, fitted together inside the step. */
export function openAndCompareMs(stepDelayMs: number): {
  readonly open: number
  readonly compare: number
} {
  const total = fitMs(GATE_OPEN_MS + COMPARE_MS, stepDelayMs)
  const share = total / (GATE_OPEN_MS + COMPARE_MS)
  return { open: GATE_OPEN_MS * share, compare: COMPARE_MS * share }
}

/** The gate's flash and shut: the special move, its full length (divided above 1×). */
export function shutMs(stepDelayMs: number): number {
  return specialMs(SHUT_MS, stepDelayMs)
}

/** When ship k (from the left) takes off in the finale. */
export const takeoffAt = (k: number) => TAKEOFF_AT + k * TAKEOFF_STAGGER_MS

// ---------- Poses ----------

/** Where a ship is: its column (its index in the frame) and its row (its squadron's depth). */
export interface ShipPlace {
  readonly column: number
  readonly row: number
}

/** A squadron: the columns it spans and its row. */
export interface Squadron {
  readonly first: number
  readonly last: number
  readonly row: number
}

export interface SpaceshipPose {
  /** Each ship's place, by ship (numbered by its column in the first frame). */
  readonly ships: readonly ShipPlace[]
  /** The squadrons standing, each with its bracket. */
  readonly squadrons: readonly Squadron[]
  /** The squadron being formed in a merge: its span, its row, and its columns still empty. */
  readonly forming: (Squadron & { readonly empty: readonly number[] }) | null
  /** The stargate, open over a merge: its span and the row it lies across (the halves'). */
  readonly gate: { readonly lo: number; readonly hi: number; readonly row: number } | null
  /** The two leads at a compare (lifted and ringed): ship ids, left then right. */
  readonly leads: readonly [number, number] | null
  /** The split or merge in progress, or the whole list (the zoom shows it and its halves). */
  readonly family: { readonly lo: number; readonly hi: number; readonly depth: number }
  readonly final: boolean
}

const isFinal = (frame: Frame) =>
  frame.array.length > 0 && (frame.highlights.sorted?.length ?? 0) === frame.array.length

const inMerge = (span: SpanStep | undefined): span is SpanStep =>
  span !== undefined && (span.event === 'compare' || span.event === 'move' || span.event === 'rest')

/** Each frame's pose, from the run. */
export function spaceshipPoses(frames: readonly Frame[]): SpaceshipPose[] {
  const n = frames[0]?.array.length ?? 0
  let ships: ShipPlace[] = Array.from({ length: n }, (_, column) => ({ column, row: 0 }))
  let squadrons: Squadron[] = n > 0 ? [{ first: 0, last: n - 1, row: 0 }] : []
  let previous: Frame | undefined
  const whole = { lo: 0, hi: n, depth: 0 }

  return frames.map((frame) => {
    const span = frame.span
    if (span?.event === 'split') {
      const { lo, mid, hi, depth } = span
      ships = ships.map((ship) =>
        ship.column >= lo && ship.column < hi ? { ...ship, row: depth + 1 } : ship,
      )
      squadrons = [
        ...squadrons.filter((q) => !(q.first === lo && q.row === depth)),
        { first: lo, last: mid - 1, row: depth + 1 },
        { first: mid, last: hi - 1, row: depth + 1 },
      ]
    }
    if ((span?.event === 'move' || span?.event === 'rest') && previous?.buffer && frame.buffer) {
      // The ship whose slot in the second row just emptied flies to the next place, k.
      const from = previous.buffer.values.findIndex(
        (value, c) => value !== null && frame.buffer?.values[c] === null,
      )
      const to = frame.pointers?.k
      if (from >= 0 && to !== undefined) {
        ships = ships.map((ship) =>
          ship.column === from && ship.row === span.depth + 1
            ? { column: to, row: span.depth }
            : ship,
        )
      }
    }
    if (span?.event === 'merged') {
      const { lo, mid, hi, depth } = span
      squadrons = [
        ...squadrons.filter(
          (q) => !(q.row === depth + 1 && (q.first === lo || q.first === mid) && q.last < hi),
        ),
        { first: lo, last: hi - 1, row: depth },
      ]
    }
    previous = frame

    const merging = inMerge(span)
    const vacant = new Set(frame.vacant ?? [])
    const pair = frame.decision?.kind === 'which-next' ? frame.decision.pair : null
    const shipAt = (column: number, row: number) =>
      ships.findIndex((ship) => ship.column === column && ship.row === row)
    return {
      ships,
      // A merge's halves keep their brackets until the merge is done.
      squadrons,
      forming: merging
        ? {
            first: span.lo,
            last: span.hi - 1,
            row: span.depth,
            empty: Array.from({ length: span.hi - span.lo }, (_, k) => span.lo + k).filter((c) =>
              vacant.has(c),
            ),
          }
        : null,
      gate: merging ? { lo: span.lo, hi: span.hi, row: span.depth + 1 } : null,
      leads:
        pair && merging ? [shipAt(pair[0], span.depth + 1), shipAt(pair[1], span.depth + 1)] : null,
      family: span ? { lo: span.lo, hi: span.hi, depth: span.depth } : whole,
      final: isFinal(frame),
    }
  })
}

// ---------- Moves ----------

export type SpaceshipMove =
  /** A squadron peels into two halves that drop a row, banking apart. */
  | { readonly kind: 'split'; readonly lo: number; readonly mid: number; readonly hi: number }
  /** The gate opens over the halves, and the new squadron's bracket and slots fade in. */
  | { readonly kind: 'gate-open' }
  /** The two leads pull forward and their rings fade in. */
  | { readonly kind: 'compare'; readonly leads: readonly [number, number] }
  /** A ship flies up through the gate into its place; at a compare, the other lead eases back. */
  | {
      readonly kind: 'take'
      readonly ship: number
      readonly from: ShipPlace
      readonly to: ShipPlace
      /** The other lead, lifted at the compare, eases back into formation (none at a rest). */
      readonly back: number | null
    }
  /** The special move: the gate flashes and shuts; the new squadron's bracket brightens. */
  | { readonly kind: 'shut'; readonly lo: number; readonly hi: number; readonly row: number }
  /** Everything in order: green rings, then each ship loops off the top and back in. */
  | { readonly kind: 'finale' }

const sameFamily = (a: SpaceshipPose['family'], b: SpaceshipPose['family']) =>
  a.lo === b.lo && a.hi === b.hi && a.depth === b.depth

/** Whether the zoom shows a new family at frame k (it fades in rather than flies). */
export function familyChanged(poses: readonly SpaceshipPose[], k: number): boolean {
  const before = poses[k - 1]
  const now = poses[k]
  return before !== undefined && now !== undefined && !sameFamily(before.family, now.family)
}

/** What moves when the player steps forward from frame k − 1 to frame k. */
export function spaceshipMoves(
  frames: readonly Frame[],
  k: number,
  poses: readonly SpaceshipPose[] = spaceshipPoses(frames),
): SpaceshipMove[] {
  const before = poses[k - 1]
  const now = poses[k]
  const span = frames[k]?.span
  if (!before || !now) return []
  const moves: SpaceshipMove[] = []
  if (span?.event === 'split')
    moves.push({ kind: 'split', lo: span.lo, mid: span.mid, hi: span.hi })
  if (now.gate && !before.gate) moves.push({ kind: 'gate-open' })
  if (now.leads) moves.push({ kind: 'compare', leads: now.leads })
  if (span?.event === 'move' || span?.event === 'rest') {
    const ship = now.ships.findIndex((place, id) => {
      const was = before.ships[id]
      return was !== undefined && (place.column !== was.column || place.row !== was.row)
    })
    const from = before.ships[ship]
    const to = now.ships[ship]
    if (ship >= 0 && from && to) {
      const back = before.leads?.find((lead) => lead !== ship) ?? null
      moves.push({ kind: 'take', ship, from, to, back })
    }
  }
  if (span?.event === 'merged' && before.gate) {
    moves.push({ kind: 'shut', lo: span.lo, hi: span.hi, row: before.gate.row })
  }
  if (now.final && !before.final) moves.push({ kind: 'finale' })
  return moves
}

/** Each run's poses, worked out once (the hold is asked on every step). */
const posesCache = new WeakMap<readonly Frame[], SpaceshipPose[]>()
export function posesOf(frames: readonly Frame[]): SpaceshipPose[] {
  let poses = posesCache.get(frames)
  if (!poses) {
    poses = spaceshipPoses(frames)
    posesCache.set(frames, poses)
  }
  return poses
}

/** Whether frame k is a merge's end: the gate flashes and shuts there. */
export function isShut(frames: readonly Frame[], k: number): boolean {
  return spaceshipMoves(frames, k, posesOf(frames)).some((move) => move.kind === 'shut')
}

/** How long frame k must stay on screen with the spaceships showing: the gate's flash and shut
 * on a merge's end, else nothing beyond the step. */
export function spaceshipHoldMs(frames: readonly Frame[], k: number, stepDelayMs: number): number {
  return isShut(frames, k) ? shutMs(stepDelayMs) : 0
}
