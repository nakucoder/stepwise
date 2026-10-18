/**
 * Squadrons and a stargate (design/mockups/spaceships/README.md, "Scene and geometry"): where
 * everything goes, in the stage field's own pixels. Pure: no React, no DOM.
 *
 * Every value is the same fighter in its own column; the value is the length of the ship's engine
 * trail, which hangs down from it, with the digit on a plate at the trail's end. Squadrons stand in
 * a formation tree, one row per split level (the "full tree"), or, on a short stage, only the
 * split or merge in progress on two rows ("zoom"). Ships are pixel art at p screen pixels per
 * sprite pixel, a whole number from 1 to 3; "units" are sprite pixels.
 *
 * The columns follow the bars' grid (the field's columns and their gap), as the penguins' slots
 * do, so Engineer's pick buttons lie over the ships; a ship's room is the column's pitch
 * (column plus gap).
 */
import { FIGHTER_GRIDS } from './sprites'

/** The space between rows, in px. */
export const ROW_GAP = 4
/** A lead ship's lift at a compare, the ring's room on each side, and the gate's, in units. */
export const LIFT = 2
export const RING = 2
export const GATE_BAR = 2
export const POST_W = 2
export const POST_H = 8
export const POST_ABOVE = 3
/** Above a ship in its row: the gate's bar, the lead's lift and the ring, in units. */
export const HEADROOM = GATE_BAR + LIFT + RING
/** In the zoom, a trail of at least this many px (below that, the plates go beside the ships). */
export const ZOOM_TRAIL = 8
/** With the plates beside the ships, a trail of at least this many px. */
export const BESIDE_TRAIL = 6
/** The digit: between 10 and 14 px, a sixth of the row. */
export const MIN_FONT = 10
export const MAX_FONT = 14

/** The field's measured box: its size and the gap between the value columns. */
export interface Box {
  readonly width: number
  readonly height: number
  readonly gap: number
}

/** The number of split levels: the tree has depth + 1 rows (6 values: 3, 12 values: 4). */
export function treeDepth(n: number): number {
  return n <= 1 ? 0 : Math.ceil(Math.log2(n))
}

/** The digit's size for a row's height: a sixth of it, from 10 to 14 px. */
export const digitFont = (rowH: number) =>
  Math.max(MIN_FONT, Math.min(MAX_FONT, Math.floor(rowH / 6)))

/** A digit plate's width: the digits, with a little room each side. */
export const plateWidth = (font: number, digits: number) => Math.round(font * (0.6 * digits + 0.3))

export interface SpaceshipLayout {
  readonly width: number
  readonly height: number
  /** "tree": every split level; "zoom": the family in progress and its halves. */
  readonly plan: 'tree' | 'zoom'
  readonly rows: number
  readonly rowH: number
  /** Screen pixels per sprite pixel (the ships' p). */
  readonly s: number
  /** The fighter every value flies: its grid (from the family) and its side in px. */
  readonly grid: number
  readonly side: number
  /** The digit's size and its plate's height. */
  readonly font: number
  readonly plateH: number
  /** The plate sits beside the ship (a short zoom), not at the end of the trail. */
  readonly beside: boolean
  /** How far a ship sits from its column's center (beside: left, to center it with its plate). */
  readonly shift: number
  /** The longest trail, and a value's trail: proportional, scaled to the run's largest. */
  readonly trailMax: number
  readonly trail: (value: number) => number
  readonly pitch: number
  readonly colW: number
  /** Row r's top, a ship's top in it, and its bottom line (the squadrons' brackets). */
  readonly rowTop: (row: number) => number
  readonly shipTop: (row: number) => number
  readonly floor: (row: number) => number
  /** Column c's center, and its left and right edges (the gap is after the right edge). */
  readonly center: (column: number) => number
  readonly left: (column: number) => number
  readonly right: (column: number) => number
}

/**
 * The fighter for a plan: the biggest of the family that fits (the 25 × 25 cruiser wherever it
 * can), at the biggest whole scale that fits it; null when none leaves room enough.
 */
function fitShip(
  pitch: number,
  rowH: number,
  plateH: number,
  minTrail: (side: number) => number,
): { readonly grid: number; readonly p: number } | null {
  for (const grid of [...FIGHTER_GRIDS].reverse()) {
    for (const p of [3, 2, 1]) {
      const side = grid * p
      // Across: the ship, its ring each side, and a pixel of air each side.
      if (side + 2 * RING * p + 2 > pitch) continue
      // Down: the headroom, the ship, the trail, a pixel, the plate, the bottom line.
      if (rowH - HEADROOM * p - side - 1 - plateH - p < minTrail(side)) continue
      return { grid, p }
    }
  }
  return null
}

/** The layout for a plan, or null when no fighter fits it (sizes from `sizeHeight`). */
function planLayout(
  box: Box,
  values: readonly number[],
  plan: 'tree' | 'zoom',
  sizeHeight: number,
  beside = false,
): SpaceshipLayout | null {
  const n = Math.max(1, values.length)
  const { width, height, gap } = box
  const rows = plan === 'tree' ? treeDepth(n) + 1 : 2
  const colW = (width - gap * (n - 1)) / n
  const pitch = colW + gap
  const rowsOf = (h: number) => Math.floor((h - (rows - 1) * ROW_GAP) / rows)
  const rowH = rowsOf(height)
  const sizeRowH = rowsOf(sizeHeight)
  const font = digitFont(sizeRowH)
  const plateH = Math.round(font * 1.1)
  // The tree wants a trail at least as long as the ship; the zoom, 8 px (the digits carry the
  // rest); beside, the plate takes no height and the trail what is left.
  // The widest plate in the run (its digits), for a plate beside the ship.
  const digits = Math.max(1, ...values.map((v) => String(v).length))
  const besidePlate = plateWidth(font, digits)
  const fit = beside
    ? (fitShip(pitch - besidePlate - 2, sizeRowH, 0, () => BESIDE_TRAIL) ?? {
        grid: FIGHTER_GRIDS[0] ?? 9,
        p: 1,
      })
    : fitShip(pitch, sizeRowH, plateH, (side) => (plan === 'tree' ? side : ZOOM_TRAIL))
  if (!fit) return null
  const { grid, p } = fit
  const side = grid * p
  const room = sizeRowH - HEADROOM * p - side - 1 - (beside ? 0 : plateH) - p
  const trailMax = Math.max(0, room)
  const largest = Math.max(1, ...values.map((v) => Math.abs(v)))
  const rowTop = (row: number) => row * (rowH + ROW_GAP)
  return {
    width,
    height,
    plan,
    rows,
    rowH,
    s: p,
    grid,
    side,
    font,
    plateH,
    beside,
    trailMax,
    // Beside: the ship and its plate centered on the column together.
    shift: beside ? -Math.round((2 * p + besidePlate) / 2) : 0,
    // A short puff for the smallest, the whole room for the largest, in whole pixels.
    trail: (value) =>
      Math.min(
        trailMax,
        Math.max(2 * p, Math.round((trailMax * Math.abs(value)) / largest / p) * p),
      ),
    pitch,
    colW,
    rowTop,
    shipTop: (row) => rowTop(row) + HEADROOM * p,
    floor: (row) => rowTop(row) + rowH - p,
    center: (c) => c * pitch + colW / 2,
    left: (c) => c * pitch,
    right: (c) => c * pitch + colW,
  }
}

/**
 * The full tree when a fighter fits it with a trail as long as itself; else the zoom (a trail of
 * at least 8 px); else the zoom with the plates beside the ships. The sizes (and so the plan)
 * come from `sizeHeight`, at most the field's height: the shortest it has been in this run
 * (`stableHeight`), so nothing changes size from one step to the next. The rows fill the field.
 */
export function spaceshipLayout(
  box: Box,
  values: readonly number[],
  sizeHeight = box.height,
): SpaceshipLayout {
  const size = Math.min(sizeHeight, box.height)
  const tree = planLayout(box, values, 'tree', size)
  if (tree) return tree
  const zoom = planLayout(box, values, 'zoom', size)
  if (zoom) return zoom
  // Always some layout: beside is built from the smallest fighter at worst.
  return planLayout(box, values, 'zoom', size, true) as SpaceshipLayout
}

/** What the sizes have been measured against in this run, at this width. */
export interface SizeMemory {
  readonly width: number
  /** The tallest field seen, and the shortest at least half of it. */
  readonly tallest: number
  readonly shortest: number
}

/**
 * The height the ships' sizes come from: the shortest the field has been in this run at this
 * width, so a size never changes between steps while the stage's height follows the
 * explanation beside it. A field under half the tallest is a different stage (the strip beside
 * an open sheet on a phone): it uses its own height and is not kept.
 */
export function stableHeight(
  memory: SizeMemory | null,
  width: number,
  height: number,
): { readonly memory: SizeMemory; readonly sizeHeight: number } {
  if (!memory || memory.width !== width) {
    return { memory: { width, tallest: height, shortest: height }, sizeHeight: height }
  }
  const tallest = Math.max(memory.tallest, height)
  if (height < tallest / 2) return { memory, sizeHeight: height }
  const shortest = memory.shortest < tallest / 2 ? height : Math.min(memory.shortest, height)
  return { memory: { width, tallest, shortest }, sizeHeight: shortest }
}

/** A ship's top-left: centered on its column, at the top of its row (a lead lifted). */
export function shipAt(
  geo: SpaceshipLayout,
  column: number,
  row: number,
  lifted = false,
): readonly [number, number] {
  return [
    Math.round(geo.center(column) - geo.side / 2) + geo.shift,
    geo.shipTop(row) - (lifted ? LIFT * geo.s : 0),
  ]
}

/** A ship's digit plate: at the end of its trail, centered (or beside the ship, on a short zoom). */
export function plateAt(
  geo: SpaceshipLayout,
  value: number,
  column: number,
  row: number,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const [x, y] = shipAt(geo, column, row)
  const width = plateWidth(geo.font, String(value).length)
  return geo.beside
    ? {
        x: x + geo.side + 2 * geo.s,
        y: Math.round(y + geo.side / 2 - geo.plateH / 2),
        width,
        height: geo.plateH,
      }
    : {
        x: Math.round(geo.center(column) - width / 2),
        y: y + geo.side + geo.trail(value) + 1,
        width,
        height: geo.plateH,
      }
}

/** A squadron's bracket: a 1-unit line along its floor, 0.08 of a column inside each end. */
export function bracketAt(
  geo: SpaceshipLayout,
  first: number,
  last: number,
  row: number,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const x = Math.round(geo.left(first) + 0.08 * geo.pitch)
  const end = Math.round(geo.right(last) - 0.08 * geo.pitch + geo.pitch - geo.colW)
  return { x, y: geo.floor(row), width: Math.max(geo.s, end - x), height: geo.s }
}

/** The stargate over a merge [lo, hi): its bar across the top of `row`, and its two posts. */
export function gateAt(
  geo: SpaceshipLayout,
  lo: number,
  hi: number,
  row: number,
): {
  readonly bar: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly posts: readonly {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }[]
} {
  const { s } = geo
  const x = Math.round(geo.left(lo) + 0.04 * geo.pitch)
  const end = Math.round(geo.right(hi - 1) + geo.pitch - geo.colW - 0.04 * geo.pitch)
  const y = geo.rowTop(row)
  const width = Math.max(2 * POST_W * s, end - x)
  return {
    bar: { x, y, width, height: GATE_BAR * s },
    posts: [
      { x, y: y - POST_ABOVE * s, width: POST_W * s, height: POST_H * s },
      { x: x + width - POST_W * s, y: y - POST_ABOVE * s, width: POST_W * s, height: POST_H * s },
    ],
  }
}

/** A point on a ship's flight: its top-left, and when it gets there (0 to 1 of the flight). */
export interface Waypoint {
  readonly x: number
  readonly y: number
  readonly offset: number
}

/**
 * A ship's flight through the gate, as straight segments (design/mockups/spaceships, "Take";
 * turning at the gate). It flies straight up its column until it is through the gate (just above
 * the bar across the halves' row, under the new squadron's parked ships), by `upAt` of the
 * flight. Then it heads diagonally to its
 * slot; while ships already parked there stand between it and its slot, it first slides level
 * until it is past the last of them, so it never covers a parked ship. Rows are as drawn.
 */
export function takePath(
  geo: SpaceshipLayout,
  flight: {
    readonly from: { readonly column: number; readonly row: number }
    readonly to: { readonly column: number; readonly row: number }
    /** It starts lifted (a lead at the compare before). */
    readonly lifted: boolean
  },
  /** The ships standing on the row it lands on (not itself). */
  parked: readonly { readonly column: number; readonly value: number }[],
  upAt: number,
): Waypoint[] {
  const { from, to, lifted } = flight
  const { side } = geo
  const [x0, y0] = shipAt(geo, from.column, from.row, lifted)
  const [x3, y3] = shipAt(geo, to.column, to.row)
  // Through the gate (just above the bar across the halves' row), and always under the parked
  // ships (their bottoms), so it never covers one while it turns.
  const turn = Math.max(geo.rowTop(to.row + 1) - side - 1, geo.shipTop(to.row) + side + 1)
  // The parked ships between its column and its slot, in the direction it flies.
  const direction = Math.sign(to.column - from.column)
  const start = geo.center(from.column)
  const blockers = parked.filter(
    (p) =>
      direction !== 0 &&
      (p.column - from.column) * direction >= 0 &&
      (to.column - p.column) * direction > 0,
  )
  const points: { x: number; y: number }[] = [
    { x: x0, y: y0 },
    { x: x0, y: turn },
  ]
  if (blockers.length > 0) {
    // Its center past the last blocker's by a ship's side (half of each), and a pixel.
    const clear = Math.max(
      ...blockers.map((p) => (geo.center(p.column) - start) * direction + side + 1),
    )
    points.push({ x: Math.round(x0 + clear * direction), y: turn })
  }
  points.push({ x: x3, y: y3 })
  // The rest of the flight, shared by the segments' lengths.
  const lengths = points.slice(2).map((p, k) => {
    const q = points[k + 1] ?? p
    return Math.hypot(p.x - q.x, p.y - q.y)
  })
  const total = lengths.reduce((a, b) => a + b, 0) || 1
  let at = upAt
  return points.map((p, k) => {
    if (k === 0) return { ...p, offset: 0 }
    if (k === 1) return { ...p, offset: upAt }
    at += ((lengths[k - 2] ?? 0) / total) * (1 - upAt)
    return { ...p, offset: k === points.length - 1 ? 1 : at }
  })
}
