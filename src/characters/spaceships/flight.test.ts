import { describe, expect, it } from 'vitest'
import { mergeSort } from '../../algorithms/sorting/mergeSort'
import { DEFAULT_INPUT } from '../../data/defaultInput'
import { collectFrames } from '../../engine/collect'
import { FLIGHT_AT, flightKeys, takeCurve, type CurvePoint, type FlightKey } from './flight'
import { LIFT, shipAt, spaceshipLayout, takeEnds, type SpaceshipLayout } from './geometry'
import { spaceshipMoves, spaceshipPoses, type SpaceshipPose } from './steps'

const TWELVE = [42, 7, 19, 88, 3, 64, 25, 51, 13, 76, 30, 9]

interface Rect {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

/** The rows as drawn: the tree's own, or the zoom's two (the family's row on top). */
const drawnRow = (geo: SpaceshipLayout, pose: SpaceshipPose, row: number) =>
  geo.plan === 'tree' ? row : row - pose.family.depth

/**
 * The other ships on stage, where they stand when the flight lands (the zoom shows only the
 * family's two rows); parked: standing in the row it lands on (the new squadron, or its neighbors).
 */
function onStage(geo: SpaceshipLayout, pose: SpaceshipPose, ship: number) {
  const toRow = pose.ships[ship]?.row ?? 0
  return pose.ships.flatMap((place, other) => {
    if (other === ship) return []
    const r = drawnRow(geo, pose, place.row)
    if (geo.plan === 'zoom') {
      if (r < 0 || r > 1) return []
      if (place.column < pose.family.lo || place.column >= pose.family.hi) return []
    }
    const [x, y] = shipAt(geo, place.column, r)
    return [
      {
        ship: other,
        parked: place.row === toRow,
        rect: { left: x, top: y, right: x + geo.side, bottom: y + geo.side },
      },
    ]
  })
}

interface Flight {
  readonly k: number
  readonly ship: number
  readonly geo: SpaceshipLayout
  readonly from: { readonly x: number; readonly y: number }
  readonly to: { readonly x: number; readonly y: number }
  readonly gateY: number
  readonly curve: CurvePoint[]
  readonly keys: FlightKey[]
  readonly others: ReturnType<typeof onStage>
}

/** Every take and rest of a run on a field, flown as the scene flies it. */
function flights(input: readonly number[], box: { width: number; height: number }): Flight[] {
  const frames = collectFrames(mergeSort, input).frames
  const poses = spaceshipPoses(frames)
  const geo = spaceshipLayout({ ...box, gap: 0 }, input)
  const found: Flight[] = []
  frames.forEach((_, k) => {
    const pose = poses[k]
    const before = poses[k - 1]
    if (!pose || !before) return
    for (const move of spaceshipMoves(frames, k, poses)) {
      if (move.kind !== 'take') continue
      const row = (r: number) => drawnRow(geo, pose, r)
      const flown = {
        from: { column: move.from.column, row: row(move.from.row) },
        to: { column: move.to.column, row: row(move.to.row) },
        lifted: before.leads?.includes(move.ship) === true,
      }
      const others = onStage(geo, pose, move.ship)
      const curve = takeCurve(
        geo,
        flown,
        others.map((o) => o.rect),
      )
      const gateY = geo.rowTop(flown.to.row + 1) - geo.side
      const { start, slot } = takeEnds(geo, flown)
      found.push({
        k,
        ship: move.ship,
        geo,
        from: start,
        to: slot,
        gateY,
        curve,
        keys: flightKeys(curve, gateY, geo.s),
        others,
      })
    }
  })
  return found
}

/** The flights where the flying ship's box meets another's, at any px of its curve or its bob. */
function collisions(
  input: readonly number[],
  box: { width: number; height: number },
  which: 'parked' | 'any',
) {
  const hits: string[] = []
  for (const flight of flights(input, box)) {
    const { side } = flight.geo
    for (const point of [...flight.curve, ...flight.keys]) {
      const rect = { left: point.x, top: point.y, right: point.x + side, bottom: point.y + side }
      for (const other of flight.others) {
        if (which === 'parked' && !other.parked) continue
        if (overlaps(rect, other.rect)) {
          hits.push(
            `frame ${String(flight.k)}: ship ${String(flight.ship)} over ship ${String(other.ship)}`,
          )
        }
      }
    }
  }
  return [...new Set(hits)]
}

const PHONE = { width: 366, height: 382 }
const FIELDS = [
  ['the spec’s phone field, 366 × 382', PHONE],
  ['the zoom, plates under (479 × 88)', { width: 479, height: 88 }],
  ['the zoom, plates beside (479 × 53)', { width: 479, height: 53 }],
] as const

describe('a flying ship never covers a parked ship', () => {
  it.each(
    FIELDS.flatMap(([name, box]) => [
      [`5 2 8 1 9 3, ${name}`, DEFAULT_INPUT, box] as const,
      [`12 numbers, ${name}`, TWELVE, box] as const,
    ]),
  )('%s: at no px of any curve, nor in the bob', (_, input, box) => {
    expect(flights(input, box).length).toBe(
      collectFrames(mergeSort, input).frames.at(-1)?.stats.swaps,
    )
    expect(collisions(input, box, 'parked')).toEqual([])
  })
})

// Stricter: no other ship at all, waiting ones included, where the rows leave room between the
// new squadron's floor and the waiting ships' noses for a ship to pass (the phone's tree). In the
// zoom's short rows that gap is less than a ship, so a ship crossing may pass a waiting ship's nose.
describe('nor any other ship, where the rows leave room', () => {
  it.each([
    ['5 2 8 1 9 3', DEFAULT_INPUT],
    ['12 numbers', TWELVE],
  ] as const)('%s, the spec’s phone field', (_, input) => {
    expect(collisions(input, PHONE, 'any')).toEqual([])
  })
})

/** The sharpest turn between two stretches of `span` px along a curve, in degrees. */
function sharpest(curve: readonly CurvePoint[], span = 3): number {
  let worst = 0
  for (let k = span; k + span < curve.length; k++) {
    const a = curve[k - span]
    const b = curve[k]
    const c = curve[k + span]
    if (!a || !b || !c) continue
    const u = Math.atan2(b.y - a.y, b.x - a.x)
    const v = Math.atan2(c.y - b.y, c.x - b.x)
    let turn = Math.abs(u - v) * (180 / Math.PI)
    if (turn > 180) turn = 360 - turn
    worst = Math.max(worst, turn)
  }
  return worst
}

describe('the swoop', () => {
  const all = flights(DEFAULT_INPUT, PHONE)
  const across = all.filter((f) => f.from.x !== f.to.x)

  it('starts where the ship stood and ends in its slot', () => {
    for (const f of all) {
      expect(f.curve[0]).toMatchObject(f.from)
      expect(f.curve.at(-1)).toMatchObject(f.to)
    }
  })

  it('has no hard corner on the phone: it curves (no turn sharper than 30° over 3 px)', () => {
    expect(across.length).toBeGreaterThan(0)
    for (const f of across) expect(sharpest(f.curve)).toBeLessThan(30)
  })

  it('goes up first and comes up into its slot: the start and the end are vertical', () => {
    for (const f of across) {
      const [a, b] = f.curve
      const [y, z] = f.curve.slice(-2)
      expect(b?.x).toBeCloseTo(a?.x ?? 0, 0)
      expect(z?.x).toBeCloseTo(y?.x ?? 0, 0)
    }
  })

  it('a straight-up flight to its own column stays in its column', () => {
    for (const f of all.filter((g) => g.from.x === g.to.x)) {
      expect(new Set(f.curve.map((p) => Math.round(p.x)))).toEqual(new Set([f.from.x]))
    }
  })
})

describe('its moments', () => {
  const all = flights(DEFAULT_INPUT, PHONE)
  const across = all.filter((f) => f.from.x !== f.to.x)
  /** The key at an offset, or the last before it. */
  const at = (keys: readonly FlightKey[], offset: number) =>
    [...keys].reverse().find((key) => key.offset <= offset + 1e-9) ?? keys[0]

  it('runs from 0 to 1, in order', () => {
    for (const f of all) {
      expect(f.keys[0]?.offset).toBe(0)
      expect(f.keys.at(-1)?.offset).toBe(1)
      const offsets = f.keys.map((key) => key.offset)
      expect([...offsets].sort((a, b) => a - b)).toEqual(offsets)
    }
  })

  it('starts slow and speeds up to the gate, crossing it as the gate lights', () => {
    for (const f of all) {
      const crossing = f.curve.find((p) => p.y <= f.gateY)?.at ?? 0
      const travelled = (u: number) => {
        const key = at(f.keys, u)
        return f.curve.reduce(
          (best, p) =>
            Math.hypot(p.x - (key?.x ?? 0), p.y - (key?.y ?? 0)) <
            Math.hypot(best.x - (key?.x ?? 0), best.y - (key?.y ?? 0))
              ? p
              : best,
          f.curve[0] ?? { x: 0, y: 0, at: 0 },
        ).at
      }
      // A quarter of the way to the gate in time: about a sixteenth of the way in distance.
      expect(travelled(FLIGHT_AT.gate / 4)).toBeLessThan(crossing / 8)
      // At the gate's flash, it is at the bar.
      expect(Math.abs(travelled(FLIGHT_AT.gate) - crossing)).toBeLessThanOrEqual(2)
    }
  })

  it('arrives at rest by 86%, then bobs up 2 units and settles', () => {
    for (const f of all) {
      const arrived = f.keys.filter((key) => key.offset >= FLIGHT_AT.arrive - 1e-9)
      expect(arrived[0]).toMatchObject({ x: f.to.x, y: f.to.y })
      expect(arrived.map((key) => key.y)).toEqual([f.to.y, f.to.y - LIFT * f.geo.s, f.to.y])
      expect(arrived.every((key) => key.x === f.to.x && key.bank === 'level')).toBe(true)
    }
  })

  it('banks the way it turns, with the banked frames, and is level at both ends', () => {
    for (const f of across) {
      const way = f.to.x < f.from.x ? 'left' : 'right'
      const banks = new Set(f.keys.map((key) => key.bank))
      expect(banks.has(way)).toBe(true)
      expect(banks.has(way === 'left' ? 'right' : 'left')).toBe(false)
      expect(f.keys[0]?.bank).toBe('level')
      expect(f.keys.at(-1)?.bank).toBe('level')
    }
    for (const f of all.filter((g) => g.from.x === g.to.x)) {
      expect(f.keys.every((key) => key.bank === 'level')).toBe(true)
    }
  })
})
