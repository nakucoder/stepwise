/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): the pixel grids for quick sort's delivery
 * cart mockup. One character letter per pixel; spritePath (characters/pixel.ts) turns each
 * letter's pixels into one SVG path, drawn at a whole number of screen pixels per pixel.
 * The cart is built from parts (a shell, a face, wheels) and then outlined.
 */

export type Grid = string[][]

export const blank = (w: number, h: number): Grid =>
  Array.from({ length: h }, () => Array.from({ length: w }, () => '.'))

export function rect(g: Grid, x0: number, y0: number, x1: number, y1: number, code: string) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(g, x, y, code)
}

export function set(g: Grid, x: number, y: number, code: string) {
  const row = g[y]
  if (row && x >= 0 && x < row.length) row[x] = code
}

/** Every empty pixel beside (not diagonal to) one of `solid` becomes outline, 'o'. */
export function outline(g: Grid, solid: string): Grid {
  return g.map((row, y) =>
    row.map((c, x) => {
      if (c !== '.') return c
      const near = [g[y - 1]?.[x], g[y + 1]?.[x], row[x - 1], row[x + 1]]
      return near.some((n) => n !== undefined && solid.includes(n)) ? 'o' : '.'
    }),
  )
}

export const rows = (g: Grid): readonly string[] => g.map((row) => row.join(''))

export type Face = 'idle' | 'box' | 'leader' | 'wide' | 'blink' | 'proud' | 'happy'
export type Antenna = 'up' | 'left' | 'right' | 'low'

export interface CartPose {
  readonly face?: Face
  readonly antenna?: Antenna
  readonly flag?: 'a' | 'b'
  readonly bump?: 0 | 1
  /** The compact cart for short stages: a 2-row face screen, its body 6 rows from the deck. */
  readonly compact?: boolean
}

/** A 3 × 5 pixel font, just the letters of PIZZA: # ink. */
export const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  P: ['###', '#.#', '###', '#..', '#..'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
}

/** The cart's faces, on its 7 × 5 screen: e lit. */
export const FACES: Readonly<Record<Face, readonly string[]>> = {
  idle: ['.......', '.e...e.', '.......', '.e...e.', '..eee..'],
  // Looking: up at the box over it, then across at the leader.
  box: ['.e...e.', '.......', '.......', '..eee..', '.......'],
  leader: ['.......', '..e...e', '.......', '..eee..', '.......'],
  // Found it: wide eyes, a little "o".
  wide: ['.ee.ee.', '.ee.ee.', '.......', '...e...', '.......'],
  blink: ['.......', 'ee...ee', '.......', '.e...e.', '..eee..'],
  proud: ['.......', '.e...e.', '.......', 'e.....e', '.eeeee.'],
  // Happy: ^ ^ eyes and a wide smile.
  happy: ['.e...e.', 'e.e.e.e', '.......', 'e.....e', '.eeeee.'],
}

/** The compact cart's faces, on its 7 × 2 screen: eyes, then a mouth (or ^ ^ eyes). */
export const MINI_FACES: Readonly<Record<Face, readonly string[]>> = {
  idle: ['.e...e.', '..eee..'],
  box: ['e...e..', '..eee..'],
  leader: ['..e...e', '..eee..'],
  wide: ['ee...ee', '...e...'],
  blink: ['.......', '.ee.ee.'],
  proud: ['.e...e.', 'eeeeeee'],
  happy: ['.e...e.', 'e.e.e.e'],
}

/**
 * The delivery cart, facing right, 26 × 15: a box on six wheels (three show from the side), a
 * face screen at the front, an antenna over it, a flag on a pole at the back, a stripe down its
 * side. Row 4 is its deck, where a stack rides. c shell, d deck, s screen, e eyes and smile,
 * p stripe, w wheels, h hubs, f flag, a antenna tip; o outline.
 */
export function drawCart(pose: CartPose = {}): readonly string[] {
  const { face = 'idle', antenna = 'up', flag = 'a', bump = 0, compact = false } = pose
  const w = 26
  // The compact cart: deck, a 2-row screen, short wheels, then its outline (10 rows in all).
  const bottom = compact ? 6 : 10
  const g = blank(w, compact ? 10 : 15)
  rect(g, 1, 4, w - 2, bottom, 'c')
  set(g, 1, bottom, '.')
  set(g, w - 2, bottom, '.')
  rect(g, 1, 4, w - 2, 4, 'd')
  const faceRows = compact ? MINI_FACES[face] : FACES[face]
  rect(g, 17, 5, 23, 4 + faceRows.length, 's')
  faceRows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row.charAt(x) === 'e') set(g, 17 + x, 5 + y, 'e')
    }
  })
  rect(g, 2, compact ? 6 : 7, 14, compact ? 6 : 7, 'p')
  // Wheels, with hubs that turn (the hub moves round between the two frames).
  for (const x of [4, 12, 20]) {
    if (compact) {
      rect(g, x - 1, 7, x + 1, 8, 'w')
      set(g, x - 1 + bump * 2, 7 + bump, 'h')
    } else {
      rect(g, x - 1, 11, x + 1, 13, 'w')
      set(g, x + (bump === 0 ? 0 : 1), 12 - bump, 'h')
    }
  }
  const out = outline(g, 'cdsepwh')
  // The flag on its pole at the back, and the antenna over the face (thin, not outlined).
  for (let y = 0; y <= 3; y++) set(out, 3, y, 'o')
  if (flag === 'a') {
    rect(out, 4, 0, 6, 0, 'f')
    rect(out, 4, 1, 5, 1, 'f')
  } else {
    rect(out, 4, 0, 5, 0, 'f')
    rect(out, 4, 1, 6, 1, 'f')
  }
  const stem: Record<Antenna, readonly (readonly [number, number])[]> = {
    up: [
      [20, 3],
      [20, 2],
      [20, 1],
      [20, 0],
    ],
    left: [
      [20, 3],
      [19, 2],
      [19, 1],
      [18, 0],
    ],
    right: [
      [20, 3],
      [21, 2],
      [21, 1],
      [22, 0],
    ],
    low: [
      [20, 3],
      [20, 2],
      [20, 1],
    ],
  }
  const pts = stem[antenna]
  pts.forEach(([x, y], k) => {
    set(out, x, y, k === pts.length - 1 ? 'a' : 'o')
  })
  return rows(out)
}

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

export const CART_A = drawCart()
export const CART_B = drawCart({ bump: 1 })
export const MINI_CART = drawCart({ compact: true })

export const CART_CODES = ['o', 'c', 'd', 's', 'e', 'p', 'w', 'h', 'f', 'a']

/** The cart's deck row, in sprite pixels from its top. */
export const CART_DECK = 4
