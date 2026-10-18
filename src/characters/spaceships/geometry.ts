/**
 * Squadrons and a stargate (design/mockups/spaceships/README.md, "Scene and geometry"): where
 * everything goes, in the stage field's own pixels. Pure: no React, no DOM.
 *
 * Every value is the same fighter in its own column; the value is the length of the ship's engine
 * trail, which hangs down from it, with the digit on a plate at the trail's end. Squadrons stand in
 * a formation tree, one row per split level (the "full tree"), or, on a short stage, only the
 * split or merge in progress on two rows ("zoom"), where the trails would be a few px: there they
 * are dropped, and bigger digits do the comparing. Ships are pixel art at p screen pixels per
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
/**
 * The digit: never under 13 px; 16 or more on the tree wherever it fits (a fifth of the row, to
 * 18). In the zoom the trails are dropped (they'd be a few px) and the digits do the comparing.
 */
export const MIN_FONT = 13
export const TREE_FONT = 16
export const MAX_FONT = 18

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

/** The tree's digit for a row's height: a fifth of it, from 16 to 18 px. */
export const digitFont = (rowH: number) =>
  Math.max(TREE_FONT, Math.min(MAX_FONT, Math.floor(rowH / 5)))

/** A digit plate's height for a font size. */
export const plateHeight = (font: number) => Math.round(font * 1.1)

/** The fonts to try, largest first, from `top` down to the minimum. */
const fontsFrom = (top: number) =>
  Array.from({ length: Math.max(1, top - MIN_FONT + 1) }, (_, k) => Math.max(MIN_FONT, top - k))

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
  // The widest plate in the run (its digits) must fit its column.
  const digits = Math.max(1, ...values.map((v) => String(v).length))
  const fitsAcross = (font: number) => plateWidth(font, digits) + 2 <= pitch
  // Under a ship: the headroom, the ship, (its trail,) a pixel, the plate, the bottom line.
  const below = (p: number, side: number, plateH: number) =>
    sizeRowH - HEADROOM * p - side - 1 - plateH - p
  let sized: { grid: number; p: number; font: number; trailMax: number } | null = null
  if (plan === 'tree') {
    // The biggest digit (16 to 18) that leaves a ship with a trail at least as long as itself.
    for (const font of fontsFrom(digitFont(sizeRowH))) {
      if (!fitsAcross(font)) continue
      const fit = fitShip(pitch, sizeRowH, plateHeight(font), (side) => side)
      if (!fit) continue
      sized = { ...fit, font, trailMax: below(fit.p, fit.grid * fit.p, plateHeight(font)) }
      break
    }
  } else if (!beside) {
    // No trails: the ship that leaves room for a 16 px digit (or as near as fits), then the
    // digit takes all the room under it, to 18 px.
    for (const target of fontsFrom(TREE_FONT)) {
      if (!fitsAcross(target)) continue
      const fit = fitShip(pitch, sizeRowH, plateHeight(target), () => 0)
      if (!fit) continue
      let font = target
      while (
        font < MAX_FONT &&
        fitsAcross(font + 1) &&
        below(fit.p, fit.grid * fit.p, plateHeight(font + 1)) >= 0
      ) {
        font++
      }
      sized = { ...fit, font, trailMax: 0 }
      break
    }
  } else {
    // The plate beside the ship: the biggest digit (to 16 px) that leaves a ship beside it.
    for (const font of fontsFrom(TREE_FONT)) {
      if (plateHeight(font) > sizeRowH - 2) continue
      const fit = fitShip(pitch - plateWidth(font, digits) - 2, sizeRowH, 0, () => 0)
      if (!fit) continue
      sized = { ...fit, font, trailMax: 0 }
      break
    }
    sized ??= { grid: FIGHTER_GRIDS[0] ?? 9, p: 1, font: MIN_FONT, trailMax: 0 }
  }
  if (!sized) return null
  const { grid, p, font, trailMax } = sized
  const side = grid * p
  const plateH = plateHeight(font)
  const besidePlate = plateWidth(font, digits)
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
    // A short puff for the smallest, the whole room for the largest, in whole pixels; none in
    // the zoom.
    trail: (value) =>
      trailMax <= 0
        ? 0
        : Math.min(
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
 * The full tree when a fighter fits it with a trail as long as itself; else the zoom (no
 * trails): the plates under the ships, or beside them where that gives bigger digits. The sizes
 * (and so the plan) come from `sizeHeight`, at most the field's height: the shortest it has been
 * in this run (`stableHeight`), so nothing changes size from one step to the next. The rows fill
 * the field.
 */
export function spaceshipLayout(
  box: Box,
  values: readonly number[],
  sizeHeight = box.height,
): SpaceshipLayout {
  const size = Math.min(sizeHeight, box.height)
  const tree = planLayout(box, values, 'tree', size)
  if (tree) return tree
  // Always some layout: beside is built from the smallest fighter at worst.
  const beside = planLayout(box, values, 'zoom', size, true) as SpaceshipLayout
  const zoom = planLayout(box, values, 'zoom', size)
  // The plates under the ships, unless beside them the digits are bigger (or as big, with a
  // bigger ship).
  if (
    zoom &&
    (zoom.font > beside.font || (zoom.font === beside.font && zoom.side >= beside.side))
  ) {
    return zoom
  }
  return beside
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
        // Level with the ship's middle, inside its row.
        y: Math.max(
          geo.rowTop(row),
          Math.min(geo.floor(row) - geo.plateH, Math.round(y + geo.side / 2 - geo.plateH / 2)),
        ),
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

/**
 * Where a ship's flight through the gate starts, crosses and lands (design/mockups/spaceships,
 * "Take"; flight.ts curves it): it starts where it stands (lifted, if it was a lead), flies across
 * at `across`, and lands in its slot. `across` is the middle of the free band between the gate
 * (the ship's bottom just above the bar across the halves' row) and the new squadron's parked
 * ships (its top just under their bottoms), so it never covers a parked ship while it crosses.
 * Rows are as drawn.
 */
export function takeEnds(
  geo: SpaceshipLayout,
  flight: {
    readonly from: { readonly column: number; readonly row: number }
    readonly to: { readonly column: number; readonly row: number }
    /** It starts lifted (a lead at the compare before). */
    readonly lifted: boolean
  },
): {
  readonly start: { readonly x: number; readonly y: number }
  readonly across: number
  readonly slot: { readonly x: number; readonly y: number }
} {
  const { from, to, lifted } = flight
  const [x0, y0] = shipAt(geo, from.column, from.row, lifted)
  const [x1, y1] = shipAt(geo, to.column, to.row)
  const underParked = geo.shipTop(to.row) + geo.side + 1
  const overGate = Math.max(geo.rowTop(to.row + 1) - geo.side - 1, underParked)
  return {
    start: { x: x0, y: y0 },
    across: Math.round((overGate + underParked) / 2),
    slot: { x: x1, y: y1 },
  }
}
