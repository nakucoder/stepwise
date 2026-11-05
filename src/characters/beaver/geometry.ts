/**
 * Heap sort's builder beaver (design/mockups/builder-beaver/README.md): where everything goes, in
 * the stage field's own pixels. Pure: no React, no DOM.
 *
 * Every value is a stack of side-on logs on a number plate, one log per count, every log on a
 * stage alike. The beaver works in a lane along the bottom, under the stacks; the plates stand at
 * its curb. What sets a log's height (the beaver, the number, the lift) follows the stage's grid of
 * 12, never the run's count or numbers, so a 7 is the same on every run; only the stacks' width
 * follows the count. The dam (the tree view) has its own layout, over the band or beside the
 * stacks.
 */
import { pixelScale } from '../pixel'
import { BEAVER_H, BEAVER_PAWS, BEAVER_W } from './sprites'

/** The field's measured size, and the gap between the value columns (the bars' grid). */
export interface Box {
  readonly width: number
  readonly height: number
  readonly gap?: number
}

/** The most logs in a stack: the log look uses 1 to 12 (the registry's range). */
export const MAX_COUNT = 12
/**
 * A log is never taller than this share of the stage's grid of 12 (about 0.6 of a stack's width
 * there): taller, its cut end (0.9 of its height) would leave little bark, and it would read as a
 * stubby block, not a log on its side.
 */
export const LOG_PER_COLUMN = 0.45
/** A stack is this wide at most, or three logs' height on a big stage. */
export const MAX_STACK_W = 44
export const STACK_PER_LOG = 3
/** The smallest and largest number on a plate. */
export const MIN_FONT = 10
export const MAX_FONT = 16

export interface BeaverLayout {
  readonly width: number
  readonly height: number
  /** Screen pixels per beaver pixel (1, 2 or 3). */
  readonly s: number
  /** One column of the run, and from one column's start to the next's (the column and its gap):
   * the stacks stand on the bars' grid, so the tags and pick buttons line up. */
  readonly colW: number
  readonly pitch: number
  /** The lane's height (the beaver's and its curb's) and its top, the curb. */
  readonly lane: number
  readonly laneTop: number
  /** The number's size and its plate's height under each stack. */
  readonly font: number
  readonly plate: number
  /** Where the logs start: the plate's top. */
  readonly base: number
  /** How high a carried stack is lifted off the curb. */
  readonly lift: number
  /** One log's height, and a stack's width. */
  readonly logPx: number
  readonly stackW: number
  /** The beaver's size on screen, and its top (its feet on the field's bottom). */
  readonly beaverW: number
  readonly beaverH: number
  readonly beaverY: number
  /** The centre of column `col` (fractions too: between two columns). */
  readonly cx: (col: number) => number
  /**
   * Where the beaver stands to work on column `col`: its paws under the column (mirrored when it
   * faces left), only its tail ever past the field's edge.
   */
  readonly beaverX: (col: number, left?: boolean) => number
  /** A stack of `value` logs: its height above the plate (its closing line included). */
  readonly heightOf: (value: number) => number
}

/**
 * The layout for a field. The sizes come from `sizeHeight` (at most the field's height: the
 * shortest it has been in this run, ../useStableField.ts) and `sizeWidth` (the stage's width
 * with no sheet beside it), so nothing changes size from one step to the next; everything stands
 * on the field's bottom. The columns and stacks fit the field's own width.
 *
 * s = clamp(floor(min(col12 × 2.5 / 30, h × 0.26 / 16)), 1, 3), the lane 16s + 2, the number
 * clamp(floor(min(col12 × 0.42, h × 0.16)), 10, 16) on a plate 2 px taller, the lift 2s, one log
 * clamp(floor((h − lane − plate − lift − 1) / 12), 1, floor(col12 × 0.45)) (so a stack of 12
 * fills a tall desktop stage), a stack round(min(colW × 0.9, max(44, 3 × log))).
 */
export function beaverLayout(
  box: Box,
  count: number,
  sizeHeight = box.height,
  sizeWidth = box.width,
): BeaverLayout {
  const { width, height, gap = 0 } = box
  const h = Math.min(sizeHeight, height)
  const n = Math.max(1, count)
  const colW = (width - (n - 1) * gap) / n
  const pitch = colW + gap
  // The stage's grid of 12, never the run's: the beaver may span two and a half columns (its lane
  // is under the stacks, so it never hides a value). Rounded down first: pixelScale rounds to the
  // nearest, and the beaver must never outgrow its share.
  const col12 = (Math.max(width, sizeWidth) + gap) / MAX_COUNT
  const s = Math.min(
    3,
    pixelScale(Math.floor(Math.min((col12 * 2.5) / BEAVER_W, (h * 0.26) / BEAVER_H)), 3),
  )
  const lane = BEAVER_H * s + 2
  const laneTop = height - lane
  const sizeFont = Math.max(
    MIN_FONT,
    Math.min(MAX_FONT, Math.floor(Math.min(col12 * 0.42, h * 0.16))),
  )
  const plate = sizeFont + 2
  // The plate keeps the stage's height (so the logs do); its number also fits the field's own
  // columns, narrower with a sheet beside them.
  const font = Math.max(
    MIN_FONT,
    Math.min(sizeFont, Math.floor(((width + gap) / MAX_COUNT) * 0.42)),
  )
  const lift = 2 * s
  // A stack of 12 and its closing line under it fill the height over the plate, lifted, in whole
  // pixels; on a big stage only the grid of 12's width holds a log back.
  const logPx = Math.max(
    1,
    Math.min(
      Math.floor(col12 * LOG_PER_COLUMN),
      Math.floor((h - lane - plate - lift - 1) / MAX_COUNT),
    ),
  )
  // Fewer numbers, wider stacks, up to 44 px, or three logs' height where the logs are big.
  const stackW = Math.round(Math.min(colW * 0.9, Math.max(MAX_STACK_W, STACK_PER_LOG * logPx)))
  const beaverW = BEAVER_W * s
  const beaverH = BEAVER_H * s
  const cx = (col: number) => col * pitch + colW / 2
  const tail = 10 * s
  return {
    width,
    height,
    s,
    colW,
    pitch,
    lane,
    laneTop,
    font,
    plate,
    base: laneTop - plate,
    lift,
    logPx,
    stackW,
    beaverW,
    beaverH,
    beaverY: height - beaverH - 1,
    cx,
    beaverX: (col, left = false) => {
      const paws = (left ? BEAVER_W - BEAVER_PAWS : BEAVER_PAWS) * s
      const x = cx(col) - paws
      // Only the tail may go past the field's edge (it is behind the beaver).
      return left
        ? Math.max(0, Math.min(x, width - beaverW + tail))
        : Math.min(width - beaverW, Math.max(x, -tail))
    },
    heightOf: (value) => {
      const logs = Math.max(0, Math.min(MAX_COUNT, Math.round(value)))
      return logs === 0 ? 0 : logs * logPx + (logPx >= 2 ? 1 : 0)
    },
  }
}

// ---------- The dam (the tree view) ----------

/** How many rows a full pyramid of `count` values has (1 → 1, 2–3 → 2, 4–7 → 3, 8–15 → 4). */
export function damRows(count: number): number {
  return count < 1 ? 1 : Math.floor(Math.log2(count)) + 1
}

/** The dam's place: over the band (where the site draws its tree), or beside the stacks. */
export type DamPlace = 'over' | 'beside'

export interface DamLayout {
  readonly width: number
  readonly height: number
  /** A log end's size across (its outline adds 1 px each side). */
  readonly d: number
  /** The number's size on a log end's wood. */
  readonly font: number
  /** Position k's centre, in the box's pixels. */
  readonly at: (k: number) => { readonly x: number; readonly y: number }
}

/** The site's tree over the band, in tree units (src/components/heapTree.ts): node, row, pad. */
const STAGE_NODE = 2.25
const STAGE_PITCH = 2.5
const STAGE_PAD = 0.5

/**
 * The dam in its box for a run of `count` values: each row's places spread evenly across the box,
 * the top in the middle. Over the band, each place is where the site's tree puts it. Beside the
 * stacks (and in a phone's sheet) it stands on the ground (the box's bottom), as wide as its box,
 * each row a little closer than a log's size so the logs rest on the two under them.
 */
export function damLayout(
  box: { readonly width: number; readonly height: number },
  count: number,
  place: DamPlace,
): DamLayout {
  const rows = damRows(count)
  const across = (k: number) => {
    const row = Math.floor(Math.log2(k + 1))
    return { row, x: ((k - (2 ** row - 1) + 0.5) * box.width) / 2 ** row }
  }
  if (place === 'beside') {
    // As wide as the box allows, and no taller than its rows fit (a short sheet on a phone).
    const d = Math.max(
      12,
      Math.floor(
        Math.min(
          (box.width / 2 ** (rows - 1)) * 0.9,
          34,
          (box.height - 6) / (1.15 * (rows - 1) + 1),
        ),
      ),
    )
    const pitch = d * 1.15
    const top = box.height - (rows - 1) * pitch - d / 2 - 6
    return {
      width: box.width,
      height: box.height,
      d,
      font: Math.max(10, Math.round(d * 0.42)),
      at: (k) => {
        const { row, x } = across(k)
        return { x, y: top + row * pitch }
      },
    }
  }
  const units = STAGE_NODE + (rows - 1) * STAGE_PITCH + STAGE_PAD
  const unit = box.height / units
  const slot = box.width / 2 ** (rows - 1)
  const d = Math.max(12, Math.floor(Math.min(STAGE_PITCH * unit * 0.92, slot * 0.9, 36)))
  return {
    width: box.width,
    height: box.height,
    d,
    font: Math.max(10, Math.round(d * 0.42)),
    at: (k) => {
      const { row, x } = across(k)
      return { x, y: (STAGE_PAD / 2 + STAGE_NODE / 2 + row * STAGE_PITCH) * unit }
    },
  }
}
