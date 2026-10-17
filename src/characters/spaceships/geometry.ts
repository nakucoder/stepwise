/**
 * Squadrons and a stargate (design/mockups/spaceships/README.md, "Scene and geometry"): where
 * everything goes, in the stage field's own pixels. Pure: no React, no DOM.
 *
 * Every value is a fighter in its own column; a bigger value is a bigger ship. Squadrons stand
 * in a formation tree, one row per split level (the "full tree"), or, on a short stage, only the
 * split or merge in progress on two rows ("zoom"). Ships are pixel art at p = s screen pixels per
 * sprite pixel, a whole number from 1 to 3 (`pixelScale`); "units" are sprite pixels.
 *
 * The columns follow the bars' grid (the field's columns and their gap), as the penguins' slots
 * do, so Engineer's pick buttons lie over the ships; a ship's room is the column's pitch
 * (column plus gap). With no gap this is the spec's `colW = w / n`.
 */
import { pixelScale } from '../pixel'

/** The space between rows, in px. */
export const ROW_GAP = 4
/** The spec's row height and column pitch per sprite pixel: the scale compares against them. */
export const ROW_UNITS = 40
export const COLUMN_UNITS = 30
/** A lead ship's lift at a compare, the ring's room on each side, and the gate's, in units. */
export const LIFT = 2
export const RING = 2
export const GATE_BAR = 2
export const POST_W = 2
export const POST_H = 8
export const POST_ABOVE = 3
/** Below this many sizes, the full tree is too cramped: the stage zooms to two rows. */
export const ZOOM_BELOW = 3
/** The smallest ship's grid, at least: 9 × 9. */
export const MIN_GRID = 9

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

/** The digit's size: 7 units, never under 10 px. */
export const digitFont = (s: number) => Math.max(7 * s, 10)

/** The smallest ship's grid: odd, at least 9, and big enough for its digit (plus 1 unit each side). */
export function smallestGrid(s: number): number {
  const need = Math.ceil((digitFont(s) + 2 * s) / s)
  const odd = need % 2 === 1 ? need : need + 1
  return Math.max(MIN_GRID, odd)
}

export interface SpaceshipLayout {
  readonly width: number
  readonly height: number
  /** "tree": every split level; "zoom": the family in progress and its halves. */
  readonly plan: 'tree' | 'zoom'
  readonly rows: number
  readonly rowH: number
  /** Screen pixels per sprite pixel (the spec's s, and the ships' p). */
  readonly s: number
  readonly font: number
  /** The smallest grid, the number of sizes, and each size's grid. */
  readonly g0: number
  readonly sizes: number
  readonly pitch: number
  readonly colW: number
  /** Row r's top, and the floor the ships stand on. */
  readonly rowTop: (row: number) => number
  readonly floor: (row: number) => number
  /** Column c's center, and its left and right edges (the gap is after the right edge). */
  readonly center: (column: number) => number
  readonly left: (column: number) => number
  readonly right: (column: number) => number
  /** A value's size level (1 to `sizes`), grid (odd) and side in px. */
  readonly level: (value: number) => number
  readonly grid: (value: number) => number
  readonly side: (value: number) => number
}

/** The layout for a plan: the scale, the rows and the sizes. */
function planLayout(box: Box, values: readonly number[], plan: 'tree' | 'zoom'): SpaceshipLayout {
  const n = Math.max(1, values.length)
  const { width, height, gap } = box
  const rows = plan === 'tree' ? treeDepth(n) + 1 : 2
  const colW = (width - gap * (n - 1)) / n
  const pitch = colW + gap
  const s = pixelScale(Math.min(height / rows / ROW_UNITS, pitch / COLUMN_UNITS), 3)
  const rowH = Math.floor((height - (rows - 1) * ROW_GAP) / rows)
  const g0 = smallestGrid(s)
  // Room for the biggest ship: the ring each side across; the ring, the lift and the gate (with
  // a unit of air) up and down.
  const maxSide = Math.min(pitch - 2 * RING * s, rowH - RING * s - (LIFT + 1) * s)
  const sizes = Math.max(1, Math.floor((maxSide / s - g0) / 2) + 1)
  const largest = Math.max(9, ...values.map((v) => Math.abs(v)))
  const level = (value: number) => Math.max(1, Math.ceil((sizes * Math.abs(value)) / largest))
  const grid = (value: number) => g0 + 2 * (level(value) - 1)
  const rowTop = (row: number) => row * (rowH + ROW_GAP)
  return {
    width,
    height,
    plan,
    rows,
    rowH,
    s,
    font: digitFont(s),
    g0,
    sizes,
    pitch,
    colW,
    rowTop,
    floor: (row) => rowTop(row) + rowH - s,
    center: (c) => c * pitch + colW / 2,
    left: (c) => c * pitch,
    right: (c) => c * pitch + colW,
    level,
    grid,
    side: (value) => grid(value) * s,
  }
}

/** The full tree, or the zoom when the tree leaves fewer than three sizes. */
export function spaceshipLayout(box: Box, values: readonly number[]): SpaceshipLayout {
  const tree = planLayout(box, values, 'tree')
  return tree.sizes < ZOOM_BELOW && tree.rows > 2 ? planLayout(box, values, 'zoom') : tree
}

/** A ship's top-left: centered on its column, standing on its row's floor (a lead lifted). */
export function shipAt(
  geo: SpaceshipLayout,
  value: number,
  column: number,
  row: number,
  lifted = false,
): readonly [number, number] {
  const side = geo.side(value)
  return [
    Math.round(geo.center(column) - side / 2),
    geo.floor(row) - side - (lifted ? LIFT * geo.s : 0),
  ]
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
