/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): the pixel grids for quick sort's delivery
 * cart mockup. One character letter per pixel; spritePath (characters/pixel.ts) turns each
 * letter's pixels into one SVG path, drawn at a whole number of screen pixels per pixel.
 * The cart is built from parts (a shell, a face, wheels) and then outlined.
 */
import { spritePath } from '../../characters/pixel'

type Grid = string[][]

const blank = (w: number, h: number): Grid =>
  Array.from({ length: h }, () => Array.from({ length: w }, () => '.'))

function rect(g: Grid, x0: number, y0: number, x1: number, y1: number, code: string) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(g, x, y, code)
}

function set(g: Grid, x: number, y: number, code: string) {
  const row = g[y]
  if (row && x >= 0 && x < row.length) row[x] = code
}

/** Every empty pixel beside (not diagonal to) one of `solid` becomes outline, 'o'. */
function outline(g: Grid, solid: string): Grid {
  return g.map((row, y) =>
    row.map((c, x) => {
      if (c !== '.') return c
      const near = [g[y - 1]?.[x], g[y + 1]?.[x], row[x - 1], row[x + 1]]
      return near.some((n) => n !== undefined && solid.includes(n)) ? 'o' : '.'
    }),
  )
}

const rows = (g: Grid): readonly string[] => g.map((row) => row.join(''))

/**
 * The delivery cart, facing right, 26 × 15: a box on six wheels (three show from the side), a
 * face screen at the front with two eyes and a smile, a flag on a pole, a stripe down its side.
 * Row 4 is its deck, where a stack rides. c shell, d deck, s screen, e eyes and smile, p stripe,
 * w wheels, h hubs, f flag; o outline.
 */
export function drawCart(bump: 0 | 1): readonly string[] {
  const g = blank(26, 15)
  rect(g, 1, 4, 24, 10, 'c')
  set(g, 1, 10, '.')
  set(g, 24, 10, '.')
  rect(g, 1, 4, 24, 4, 'd')
  rect(g, 18, 6, 23, 9, 's')
  set(g, 19, 7, 'e')
  set(g, 22, 7, 'e')
  set(g, 20, 8, 'e')
  set(g, 21, 8, 'e')
  rect(g, 2, 7, 15, 7, 'p')
  // Wheels, with hubs that turn (the hub moves round between the two frames).
  for (const x of [4, 12, 20]) {
    rect(g, x - 1, 11, x + 1, 13, 'w')
    set(g, x + (bump === 0 ? 0 : 1), 12 - bump, 'h')
  }
  const out = outline(g, 'cdsepwh')
  // The flag on its pole (not outlined).
  for (let y = 0; y <= 3; y++) set(out, 3, y, 'o')
  rect(out, 4, 0, 6, 0, 'f')
  rect(out, 4, 1, 5, 1, 'f')
  return rows(out)
}

/**
 * The slice printed on the front of a box, 7 × 4: i ink (a crust across the top, the slice
 * narrowing to its tip, one pepperoni left as a hole).
 */
export const SLICE = ['iiiiiii', '.ii.ii.', '..iii..', '...i...'] as const

/** The leader's bow (the leader role's mark), 9 × 7: b ribbon, w its white edge. */
export const BOW = [
  '.ww...ww.',
  'wbbw.wbbw',
  'wbbbwbbbw',
  'wbbbbbbbw',
  'wbbbwbbbw',
  'wbbw.wbbw',
  '.ww...ww.',
] as const

export const CART_A = drawCart(0)
export const CART_B = drawCart(1)

const paths = (grid: readonly string[], codes: readonly string[]) =>
  Object.fromEntries(codes.map((code) => [code, spritePath(grid, code)]))

const CART_CODES = ['o', 'c', 'd', 's', 'e', 'p', 'w', 'h', 'f']

export const SPRITES = {
  cartA: { rows: CART_A, paths: paths(CART_A, CART_CODES) },
  cartB: { rows: CART_B, paths: paths(CART_B, CART_CODES) },
  slice: { rows: SLICE, paths: paths(SLICE, ['i']) },
  bow: { rows: BOW, paths: paths(BOW, ['b', 'w']) },
} as const

export type SpriteId = keyof typeof SPRITES

/** The cart's deck row, in sprite pixels from its top. */
export const CART_DECK = 4
