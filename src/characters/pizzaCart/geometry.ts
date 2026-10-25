/**
 * Quick sort's pizza cart (design/mockups/pizza-cart/README.md): where everything goes, in the
 * stage field's own pixels. Pure: no React, no DOM.
 *
 * Every value is a stack of pizza boxes on a dolly that carries its digit, one box per count,
 * every box on a stage alike. The cart rolls in the street lane along the bottom, under the
 * stacks; the dollies stand at the curb. What sets a box's height (the cart, the digit, the lid)
 * follows the stage's grid of 12, not the run's count, so a 7 is the same on every run; only the
 * stacks' width follows the count.
 */
import { pixelScale } from '../pixel'
import { CART_DECK, CART_H, CART_W } from './sprites'

/** The field's measured size, and the gap between the value columns (the bars' grid). */
export interface Box {
  readonly width: number
  readonly height: number
  readonly gap?: number
}

/** The most boxes in a stack: the pizza look uses 1 to 12 (the registry's range). */
export const MAX_COUNT = 12
/** No box is taller than this (on tall stages they would be cubes, not pizza boxes). */
export const MAX_BOX = 12
/** A box at least this tall gets the 3/4 lid over its stack and stripes; thinner, plain fronts. */
export const LID_FROM = 6
/** The widest stack. */
export const MAX_STACK_W = 48
/** The smallest digit on a dolly. */
export const MIN_FONT = 10

export interface PizzaLayout {
  readonly width: number
  readonly height: number
  /** Screen pixels per cart pixel. */
  readonly s: number
  /** One column of the run, and from one column's start to the next's (the column and the gap
   * after it): the stacks stand on the bars' grid, so the tags and pick buttons line up. */
  readonly colW: number
  readonly pitch: number
  /** The curb: the street lane's top. The field's bottom is `height`. */
  readonly laneTop: number
  /** A stack's front width; its dolly is 4 px wider. */
  readonly stackW: number
  /** The dolly's height (`font + 2`) and its digit's size. */
  readonly dollyH: number
  readonly font: number
  /** Where the boxes start: the dolly's top. */
  readonly base: number
  /** One box's height, and the lid's depth over every stack (0: the front only). */
  readonly boxPx: number
  readonly lid: number
  /** Plain boxes: white, no stripes, no word, no lid (under 6 px). */
  readonly plain: boolean
  /** The cart's size on screen, and its top (its wheels on the field's bottom). */
  readonly cartW: number
  readonly cartH: number
  readonly cartY: number
  /** The centre of column `col`. */
  readonly cx: (col: number) => number
  /** Where the cart stands to work on column `col`: its deck centred under it, inside the field. */
  readonly cartX: (col: number) => number
  /** A stack of `value` boxes: its height above the dolly. */
  readonly heightOf: (value: number) => number
}

/**
 * The layout for a field. The sizes (the cart's scale, the digit, the boxes) come from
 * `sizeHeight`, at most the field's height: the shortest it has been in this run (`stableHeight`,
 * ../pixel.ts), so nothing changes size from one step to the next; everything stands on the
 * field's bottom.
 */
export function pizzaLayout(box: Box, count: number, sizeHeight = box.height): PizzaLayout {
  const { width, height, gap = 0 } = box
  const size = Math.min(sizeHeight, height)
  const n = Math.max(1, count)
  const colW = (width - (n - 1) * gap) / n
  const pitch = colW + gap
  const col12 = width / MAX_COUNT
  // About two columns wide and a quarter of the field tall at most, in whole screen pixels per
  // pixel (rounded down first: pixelScale rounds to the nearest, and the cart must never outgrow
  // its share).
  const laneRows = CART_H - CART_DECK
  const s = pixelScale(Math.floor(Math.min((col12 * 2) / CART_W, (size * 0.26) / laneRows)), 3)
  const laneTop = height - laneRows * s
  // The digit on the dolly: from 10 px (every number on the stage is; the spec's floor was 9, which
  // only the shortest stage reached, and 10 costs it no box height) to 16.
  const font = Math.max(MIN_FONT, Math.min(16, Math.floor(Math.min(col12 * 0.42, size * 0.16))))
  const dollyH = font + 2
  const base = laneTop - dollyH
  // The room for the tallest stack, at the size the boxes are measured against.
  const room = size - laneRows * s - dollyH
  // Fewer numbers, wider stacks (`w / n` is the pitch), never wider than the column itself.
  const stackW = Math.round(Math.min(pitch * 0.86, colW, MAX_STACK_W))
  // One box per count, all alike, sized for 12 in whole pixels and capped; the lid goes over the
  // stack where a box is tall enough for it, else the box's front only.
  const depth = Math.max(3, Math.round(Math.min(col12 * 0.86, MAX_STACK_W) * 0.12))
  const withLid = Math.min(MAX_BOX, Math.floor((room - depth) / MAX_COUNT))
  const lid = withLid >= LID_FROM ? depth : 0
  const boxPx = Math.max(1, lid ? withLid : Math.min(MAX_BOX, Math.floor(room / MAX_COUNT)))
  const cartW = CART_W * s
  const cartH = CART_H * s
  const cx = (col: number) => col * pitch + colW / 2
  return {
    width,
    height,
    s,
    colW,
    pitch,
    laneTop,
    stackW,
    dollyH,
    font,
    base,
    boxPx,
    lid,
    plain: boxPx < LID_FROM,
    cartW,
    cartH,
    cartY: height - cartH,
    cx,
    cartX: (col) => Math.min(Math.max(0, cx(col) - cartW / 2), Math.max(0, width - cartW)),
    heightOf: (value) => Math.max(0, Math.min(MAX_COUNT, Math.round(value))) * boxPx,
  }
}
