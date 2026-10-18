import { describe, expect, it } from 'vitest'
import { mergeSort } from '../../algorithms/sorting/mergeSort'
import { DEFAULT_INPUT } from '../../data/defaultInput'
import { collectFrames } from '../../engine/collect'
import { shipAt, spaceshipLayout, takePath, type SpaceshipLayout } from './geometry'
import { spaceshipMoves, spaceshipPoses, TAKE_AT, type SpaceshipPose } from './steps'

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
 * Every take and rest of a run on a field: the flying ship's box at every pixel of its path,
 * against the other ships' boxes (where they stand when it lands).
 */
function flights(input: readonly number[], box: { width: number; height: number }) {
  const frames = collectFrames(mergeSort, input).frames
  const poses = spaceshipPoses(frames)
  const geo = spaceshipLayout({ ...box, gap: 0 }, input)
  const found: {
    k: number
    ship: number
    path: { x: number; y: number }[]
    side: number
    others: { ship: number; parked: boolean; rect: Rect }[]
  }[] = []
  frames.forEach((_, k) => {
    const pose = poses[k]
    const before = poses[k - 1]
    if (!pose || !before) return
    for (const move of spaceshipMoves(frames, k, poses)) {
      if (move.kind !== 'take') continue
      const row = (r: number) => drawnRow(geo, pose, r)
      const path = takePath(
        geo,
        {
          from: { column: move.from.column, row: row(move.from.row) },
          to: { column: move.to.column, row: row(move.to.row) },
          lifted: before.leads?.includes(move.ship) === true,
        },
        pose.ships.flatMap((place, other) =>
          other !== move.ship && place.row === move.to.row
            ? [{ column: place.column, value: input[other] ?? 0 }]
            : [],
        ),
        TAKE_AT.up,
      )
      // Every pixel along each straight segment.
      const points: { x: number; y: number }[] = []
      for (let s = 1; s < path.length; s++) {
        const a = path[s - 1]
        const b = path[s]
        if (!a || !b) continue
        const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)))
        for (let t = 0; t <= steps; t++) {
          points.push({ x: a.x + ((b.x - a.x) * t) / steps, y: a.y + ((b.y - a.y) * t) / steps })
        }
      }
      const others = pose.ships.flatMap((place, other) => {
        if (other === move.ship) return []
        // Only ships on stage (the zoom shows the family's two rows).
        const r = row(place.row)
        if (geo.plan === 'zoom' && (r < 0 || r > 1)) return []
        if (
          geo.plan === 'zoom' &&
          (place.column < pose.family.lo || place.column >= pose.family.hi)
        ) {
          return []
        }
        const [x, y] = shipAt(geo, place.column, r)
        const { side } = geo
        return [
          {
            ship: other,
            // Parked: standing in the row it lands on (the new squadron, or its neighbors).
            parked: place.row === move.to.row,
            rect: { left: x, top: y, right: x + side, bottom: y + side },
          },
        ]
      })
      found.push({ k, ship: move.ship, path: points, side: geo.side, others })
    }
  })
  return found
}

/** The flights where the flying ship's box meets another's, with which and where. */
function collisions(
  input: readonly number[],
  box: { width: number; height: number },
  which: 'parked' | 'any',
) {
  const hits: string[] = []
  for (const flight of flights(input, box)) {
    for (const point of flight.path) {
      const rect = {
        left: point.x,
        top: point.y,
        right: point.x + flight.side,
        bottom: point.y + flight.side,
      }
      for (const other of flight.others) {
        if (which === 'parked' && !other.parked) continue
        if (overlaps(rect, other.rect)) {
          hits.push(
            `frame ${String(flight.k)}: ship ${String(flight.ship)} over ship ${String(other.ship)}`,
          )
          break
        }
      }
    }
  }
  return [...new Set(hits)]
}

const FIELDS = [
  ['the spec’s phone field, 366 × 382', { width: 366, height: 382 }],
  ['the zoom, 479 × 53', { width: 479, height: 53 }],
] as const

describe('a flying ship never covers a parked ship', () => {
  it.each(
    FIELDS.flatMap(([name, box]) => [
      [`5 2 8 1 9 3, ${name}`, DEFAULT_INPUT, box] as const,
      [`12 numbers, ${name}`, TWELVE, box] as const,
    ]),
  )('%s: at no point of any flight', (_, input, box) => {
    expect(flights(input, box).length).toBe(
      collectFrames(mergeSort, input).frames.at(-1)?.stats.swaps,
    )
    expect(collisions(input, box, 'parked')).toEqual([])
  })

  it('goes up its column to the gate, then heads to its slot (turning at 55%)', () => {
    const [flight] = flights(DEFAULT_INPUT, { width: 366, height: 382 }).filter(
      (f) => f.path[0]?.x !== f.path.at(-1)?.x,
    )
    const path = flight?.path ?? []
    // Straight up first: the same x until the turn.
    expect(path[1]?.x).toBe(path[0]?.x)
  })
})

// Stricter: no other ship at all, waiting ones included, where the rows leave room between the
// new squadron's floor and the waiting ships' noses for a ship to pass (the phone's tree). In the
// zoom's 24 px rows that gap is about 9 px, less than the smallest ship (13 px), so a ship
// sliding out from under a parked one may cross a waiting ship's nose.
describe('nor any other ship, where the rows leave room', () => {
  it.each([
    ['5 2 8 1 9 3', DEFAULT_INPUT],
    ['12 numbers', TWELVE],
  ] as const)('%s, the spec’s phone field', (_, input) => {
    expect(collisions(input, { width: 366, height: 382 }, 'any')).toEqual([])
  })
})
