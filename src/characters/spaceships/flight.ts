/**
 * A ship's flight through the gate, like an arcade fighter (design/mockups/spaceships/README.md,
 * "Take"): a swoop up its column through the gate, across under the new squadron, and up into its
 * slot, its corners rounded into curves (`takeCurve`); a slow start and full thrust up to the gate,
 * an eased arrival, then a small hover bob in the slot; and the ship banking into its turns
 * (`flightKeys`). Pure: no React, no DOM.
 */
import { LIFT, takeEnds, type SpaceshipLayout } from './geometry'
import type { Bank } from './sprites'
import { TAKE_AT } from './steps'

/** A point on the curve, and how far along it is (px). */
export interface CurvePoint {
  readonly x: number
  readonly y: number
  readonly at: number
}

/** A moment of the flight: where the ship is, and its pose. */
export interface FlightKey {
  readonly offset: number
  readonly x: number
  readonly y: number
  readonly bank: Bank
}

/** When the ship crosses the gate (the middle of the gate's flash), and when it has arrived. */
export const FLIGHT_AT = {
  gate: (TAKE_AT.gateFrom + TAKE_AT.gateTo) / 2,
  arrive: 0.86,
  /** The thrust burst: from just after the slow start to the gate. */
  boostFrom: 0.04,
} as const

/** Samples of the flight up to its arrival (the bob adds two more). */
const SAMPLES = 44
/** It banks while moving sideways at least this much of its speed. */
const BANK_SLOPE = 0.3

interface Pt {
  readonly x: number
  readonly y: number
}

/**
 * A polyline with its corners rounded: corner k is a quadratic curve from `cut[k].in` px before it
 * to `cut[k].out` px after it, with the corner as its control point (so it stays inside the
 * corner). Sampled about every px.
 */
export function roundCorners(
  points: readonly Pt[],
  cuts: readonly { readonly in: number; readonly out: number }[],
): CurvePoint[] {
  const out: Pt[] = []
  const toward = (a: Pt, b: Pt, d: number): Pt => {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    return { x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len }
  }
  const line = (a: Pt, b: Pt) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)))
    for (let t = 1; t <= steps; t++) {
      out.push({ x: a.x + ((b.x - a.x) * t) / steps, y: a.y + ((b.y - a.y) * t) / steps })
    }
  }
  const first = points[0]
  if (!first) return []
  out.push(first)
  let from = first
  for (let k = 1; k < points.length - 1; k++) {
    const corner = points[k]
    const next = points[k + 1]
    const cut = cuts[k - 1]
    if (!corner || !next || !cut) continue
    const a = toward(corner, from, cut.in)
    const b = toward(corner, next, cut.out)
    line(from, a)
    const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 1.5))
    for (let t = 1; t <= steps; t++) {
      const u = t / steps
      out.push({
        x: (1 - u) * (1 - u) * a.x + 2 * u * (1 - u) * corner.x + u * u * b.x,
        y: (1 - u) * (1 - u) * a.y + 2 * u * (1 - u) * corner.y + u * u * b.y,
      })
    }
    from = b
  }
  const last = points.at(-1)
  if (last && points.length > 1) line(from, last)
  let at = 0
  return out.map((p, k) => {
    const q = out[k - 1]
    if (q) at += Math.hypot(p.x - q.x, p.y - q.y)
    return { x: p.x, y: p.y, at }
  })
}

/** The point at `at` px along a curve, and the direction it is heading (a unit vector). */
function pointAt(curve: readonly CurvePoint[], at: number): Pt & { readonly dx: number } {
  let lo = 0
  let hi = curve.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if ((curve[mid]?.at ?? 0) <= at) lo = mid
    else hi = mid
  }
  const a = curve[lo] ?? { x: 0, y: 0, at: 0 }
  const b = curve[hi] ?? a
  const span = b.at - a.at
  const t = span > 0 ? Math.min(1, Math.max(0, (at - a.at) / span)) : 0
  // The heading, over a few px either side.
  const before = curve[Math.max(0, lo - 3)] ?? a
  const after = curve[Math.min(curve.length - 1, hi + 3)] ?? b
  const len = Math.hypot(after.x - before.x, after.y - before.y)
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    dx: len > 0 ? (after.x - before.x) / len : 0,
  }
}

/** A ship's box on stage (px). */
export interface ShipBox {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

/** How wide the corners are rounded, in ships' sides, widest first (0: the straight route). */
const REACHES = [1.5, 1.2, 0.9, 0.6, 0.3, 0] as const

/** The ships (by their place in `others`) a flight's box crosses anywhere along a curve. */
function crossed(curve: readonly CurvePoint[], side: number, others: readonly ShipBox[]) {
  const hit = new Set<number>()
  for (const point of curve) {
    others.forEach((o, k) => {
      if (
        point.x < o.right &&
        o.left < point.x + side &&
        point.y < o.bottom &&
        o.top < point.y + side
      ) {
        hit.add(k)
      }
    })
  }
  return hit
}

/** The swoop with its corners rounded `reach` px wide (0: square corners). */
function rounded(
  geo: SpaceshipLayout,
  flight: Parameters<typeof takeEnds>[1],
  reach: number,
): CurvePoint[] {
  // Up its column through the gate, across under the new squadron, then up into its slot.
  const { start, across, slot } = takeEnds(geo, flight)
  const swoop = [start, { x: start.x, y: across }, { x: slot.x, y: across }, slot]
  const length = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y)
  const rise = Math.abs(start.y - across)
  const sideways = Math.abs(slot.x - start.x)
  const climb = length({ x: slot.x, y: across }, slot)
  return roundCorners(swoop, [
    { in: Math.min(rise, reach), out: Math.min(reach, sideways / 2) },
    { in: Math.min(reach, sideways / 2), out: Math.min(reach, climb * 0.8) },
  ])
}

/**
 * The curve a ship flies through the gate: the swoop of `takeEnds` (up, across, up into its slot)
 * with both corners rounded. The corners are as wide as they can be (one and a half ships) without
 * the ship crossing any of `others` (the ships on stage) that the square route doesn't.
 */
export function takeCurve(
  geo: SpaceshipLayout,
  flight: Parameters<typeof takeEnds>[1],
  others: readonly ShipBox[] = [],
): CurvePoint[] {
  const square = rounded(geo, flight, 0)
  const allowed = crossed(square, geo.side, others)
  for (const reach of REACHES) {
    if (reach === 0) break
    const curve = rounded(geo, flight, reach * geo.side)
    if ([...crossed(curve, geo.side, others)].every((k) => allowed.has(k))) return curve
  }
  return square
}

/**
 * The flight's moments along a curve. Up to the gate (crossing its bar by `FLIGHT_AT.gate`) it
 * starts slow and speeds up, engines on full; from the gate it eases into its slot, arriving by
 * `FLIGHT_AT.arrive` at rest; then it bobs up `LIFT` units and settles. It banks while it moves
 * sideways, toward the way it is turning, and levels out as it slows into the slot.
 */
export function flightKeys(curve: readonly CurvePoint[], gateY: number, p: number): FlightKey[] {
  const total = curve.at(-1)?.at ?? 0
  // Where its bottom edge clears the gate's bar (its top-left is at gateY or above).
  const gate = curve.find((point) => point.y <= gateY)?.at ?? total / 2
  const { gate: g, arrive } = FLIGHT_AT
  const speed = (2 * gate) / g
  const rest = total - gate
  const m0 = Math.min(speed * (arrive - g), 3 * rest)
  const along = (u: number) => {
    if (u <= g) return gate * (u / g) ** 2
    const t = Math.min(1, (u - g) / (arrive - g))
    return gate + (t ** 3 - 2 * t ** 2 + t) * m0 + (3 * t ** 2 - 2 * t ** 3) * rest
  }
  const keys: FlightKey[] = []
  for (let k = 0; k <= SAMPLES; k++) {
    const u = (arrive * k) / SAMPLES
    const point = pointAt(curve, along(u))
    const slowing = u > g && (u - g) / (arrive - g) > 0.85
    const bank: Bank =
      k === 0 || k === SAMPLES || slowing || Math.abs(point.dx) < BANK_SLOPE
        ? 'level'
        : point.dx > 0
          ? 'right'
          : 'left'
    keys.push({
      offset: u,
      x: Math.round(point.x),
      y: Math.round(point.y),
      bank,
    })
  }
  const end = curve.at(-1) ?? { x: 0, y: 0 }
  const bob = { x: Math.round(end.x), bank: 'level' as const }
  keys.push({ ...bob, offset: (arrive + 1) / 2, y: Math.round(end.y) - LIFT * p })
  keys.push({ ...bob, offset: 1, y: Math.round(end.y) })
  return keys
}
