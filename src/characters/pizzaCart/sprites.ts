/**
 * Quick sort's pizza cart (design/mockups/pizza-cart/README.md): the pixel grids. Pure.
 *
 * One character letter per pixel; `spritePath` (../pixel.ts) turns each letter's pixels into one
 * SVG path. The cart is drawn at a whole number of screen pixels per pixel; the stacks of pizza
 * boxes at real size (one screen pixel per pixel), so every box on a stage is exactly alike.
 *
 * The cart, 26 × 15, facing right: c shell, d deck, s screen, e eyes and smile, p side line,
 * w wheels, h hubs, f flag, a antenna tip, o outline. Row 4 is its deck, where a stack rides.
 *
 * A stack: o outline, w white, r stripe red, q side red, v side white, c crust, p sauce,
 * d pepperoni, b the open box's inside; the leader's R red, L lid, W lettering, B ribbon,
 * E the ribbon's white edge.
 */

type Grid = string[][]

const blank = (w: number, h: number): Grid =>
  Array.from({ length: h }, () => Array.from({ length: w }, () => '.'))

function set(g: Grid, x: number, y: number, code: string) {
  const row = g[y]
  if (row && x >= 0 && x < row.length) row[x] = code
}

function rect(g: Grid, x0: number, y0: number, x1: number, y1: number, code: string) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(g, x, y, code)
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

/** Fill every pixel whose centre is inside the polygon (even-odd). */
function poly(g: Grid, pts: readonly (readonly [number, number])[], code: string) {
  g.forEach((row, y) => {
    row.forEach((_, x) => {
      const px = x + 0.5
      const py = y + 0.5
      let inside = false
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i] ?? [0, 0]
        const [xj, yj] = pts[j] ?? [0, 0]
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
      }
      if (inside) set(g, x, y, code)
    })
  })
}

/** Fill every pixel whose centre is inside the ellipse; `only` limits it to pixels of one code. */
function ellipse(
  g: Grid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  code: string,
  only?: string,
) {
  g.forEach((row, y) => {
    row.forEach((c, x) => {
      const dx = (x + 0.5 - cx) / rx
      const dy = (y + 0.5 - cy) / ry
      if (dx * dx + dy * dy <= 1 && (only === undefined || c === only)) set(g, x, y, code)
    })
  })
}

// ---------- The cart ----------

export type Face = 'idle' | 'box' | 'leader' | 'wide' | 'blink' | 'proud' | 'happy'
export type Antenna = 'up' | 'left' | 'right' | 'low'

export interface CartPose {
  readonly face?: Face
  readonly antenna?: Antenna
  readonly flag?: 'a' | 'b'
  /** The wheels' two frames: the hubs go round while it rolls. */
  readonly bump?: 0 | 1
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

export const CART_W = 26
export const CART_H = 15
/** The cart's deck row, in sprite pixels from its top: the flag and antenna rise above it. */
export const CART_DECK = 4
/** Where the face screen's right edge is, for the "!" over it. */
export const CART_SCREEN_X = 23

const ANTENNA: Readonly<Record<Antenna, readonly (readonly [number, number])[]>> = {
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

/**
 * The delivery cart: a box on six wheels (three show from the side), a face screen at the
 * front, an antenna over it, a flag on a pole at the back, a line down its side. No logo, no
 * word.
 */
export function drawCart(pose: CartPose = {}): readonly string[] {
  const { face = 'idle', antenna = 'up', flag = 'a', bump = 0 } = pose
  const w = CART_W
  const bottom = 10
  const g = blank(w, CART_H)
  rect(g, 1, CART_DECK, w - 2, bottom, 'c')
  set(g, 1, bottom, '.')
  set(g, w - 2, bottom, '.')
  rect(g, 1, CART_DECK, w - 2, CART_DECK, 'd')
  const faceRows = FACES[face]
  rect(g, 17, 5, CART_SCREEN_X, 4 + faceRows.length, 's')
  faceRows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row.charAt(x) === 'e') set(g, 17 + x, 5 + y, 'e')
    }
  })
  rect(g, 2, 7, 14, 7, 'p')
  // Wheels, with hubs that turn (the hub moves round between the two frames).
  for (const x of [4, 12, 20]) {
    rect(g, x - 1, 11, x + 1, 13, 'w')
    set(g, x + bump, 12 - bump, 'h')
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
  const stem = ANTENNA[antenna]
  stem.forEach(([x, y], k) => {
    set(out, x, y, k === stem.length - 1 ? 'a' : 'o')
  })
  return rows(out)
}

export const CART_CODES = ['o', 'c', 'd', 's', 'e', 'p', 'w', 'h', 'f', 'a'] as const

/** A small "!" over the cart when it finds one for the left: x white, o outline, 3 × 7. */
export const BANG = ['ooo', 'oxo', 'oxo', 'oxo', 'ooo', 'oxo', 'ooo'] as const

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
export const BOW_W = 9

/**
 * Steam over the open box on "Delivered!": three small puffs rising, w white, o their edge,
 * 8 × 13. Each puff is drawn on its own (the third, `k`, rises last).
 */
export const STEAM_PUFFS: readonly (readonly [x: number, y: number])[] = [
  [0, 8],
  [3, 4],
  [1, 0],
]
export const PUFF = ['.ooo.', 'owwwo', 'owwwo', 'owwwo', '.ooo.'] as const

// ---------- The stacks of pizza boxes ----------

/** A 3 × 5 pixel font, just the letters of PIZZA: # ink. */
export const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  P: ['###', '#.#', '###', '#..', '#..'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
}

const WORD = 'PIZZA'
const GLYPH_H = 5
/** The word's width: 3 px a letter, 1 px between. */
const WORD_W = WORD.length * 4 - 1
/** The white band the word sits on: 1 px clear all round. */
export const LABEL_W = WORD_W + 2
export const LABEL_H = GLYPH_H + 2

/** Does the word fit a box front `w` wide with `face` rows under its top line? */
export function wordFits(w: number, face: number): boolean {
  return w >= LABEL_W && face >= LABEL_H
}

export const BOX_CODES = [
  'o',
  'w',
  'r',
  'q',
  'v',
  'c',
  'p',
  'd',
  'b',
  'R',
  'L',
  'W',
  'B',
  'E',
] as const

const BOX_SOLID = 'wrqvcpdbRLWBE'

export interface StackLook {
  /** The leader's stack: its own red boxes, white lettering, a blue ribbon down the front. */
  readonly leader?: boolean
  /** Delivered: the top box is open, its whole pizza showing where the lid was. */
  readonly open?: boolean
  /** Plain boxes (under 6 px, too thin for stripes): white (the leader's red), outlined. */
  readonly plain?: boolean
}

/**
 * A stack of takeout pizza boxes as one pixel grid at real size: `w` wide (the front), the
 * boxes' heights from the bottom up. The grid is exactly as tall as they add up to: every box's
 * 1 px outline is inside its own height (its top line; the dolly closes the bottom one), and the
 * top box's height includes the lid over the stack (`depth` rows, leaning `ceil(depth / 2)` to
 * the right, the right side showing; 0: the front only). Fronts are red-and-white stripes, with
 * "PIZZA" on a white band on every box where it fits; the lid carries a small pizza only where
 * it is deep enough to read as a circle. Returns the grid and how many boxes carry the word.
 */
export function pizzaStack(
  w: number,
  heights: readonly number[],
  depth: number,
  look: StackLook = {},
): { readonly rows: readonly string[]; readonly words: number } {
  const { leader = false, open = false, plain = false } = look
  const total = heights.reduce((a, b) => a + b, 0)
  const lean = Math.ceil(depth / 2)
  const g = blank(w + lean + 2, total)
  const front =
    leader || plain
      ? (): string => (leader ? 'R' : 'w')
      : (x: number) => (Math.floor((x - 1) / 2) % 2 === 0 ? 'r' : 'w')

  // The lid (or, open, the box seen from above with its pizza), then the side.
  poly(
    g,
    [
      [1 + lean, 1],
      [1 + w + lean, 1],
      [1 + w, depth],
      [1, depth],
    ],
    open ? 'b' : leader ? 'L' : 'w',
  )
  poly(
    g,
    [
      [1 + w, depth],
      [1 + w + lean, 1],
      [1 + w + lean, total - 1 - depth],
      [1 + w, total - 1],
    ],
    's',
  )
  g.forEach((row, y) => {
    row.forEach((c, x) => {
      if (c !== 's') return
      const even = x % 2 === 0
      set(g, x, y, plain ? (leader ? 'q' : 'v') : even ? 'q' : leader ? 'R' : 'v')
    })
  })
  const cx = 1 + lean / 2 + w / 2
  const cy = depth / 2 + 0.5
  if (open) {
    ellipse(g, cx, cy, w * 0.42, Math.max(1, depth * 0.42), 'c', 'b')
    ellipse(g, cx, cy, w * 0.34, Math.max(0.6, depth * 0.3), 'p')
    for (let k = 0; k < 6; k++) {
      const x = Math.round(cx - w * 0.25 + k * w * 0.1)
      const y = Math.round(cy - 0.5 + (k % 2))
      if (g[y]?.[x] === 'p') set(g, x, y, 'd')
    }
  } else if (depth >= 6) {
    // A small pizza on the lid, only where it is deep enough to read as a circle.
    const ry = (depth - 2) * 0.5
    const rx = Math.min(w * 0.22, ry * 2.2)
    ellipse(g, cx, cy, rx, ry, 'c')
    ellipse(g, cx, cy, rx - 1.4, ry - 0.9, 'p')
  }
  let words = 0
  let bottom = total
  // The rows where one box meets the one above it.
  const lines: number[] = []
  heights.forEach((t, k) => {
    const isTop = k === heights.length - 1
    const tall = isTop ? t - depth : t
    const y0 = bottom - tall
    // The box's own outline: its top row (the line between it and the box above, or the lid).
    for (let y = y0; y < bottom; y++) {
      for (let x = 1; x <= w; x++) set(g, x, y, y === y0 ? 'o' : front(x))
    }
    if (!isTop) lines.push(y0)
    // Rows under its top line (the bottom box is closed by the dolly's own line).
    const face = tall - 1
    // A plain box's one thin band, only where it stays clean (from 5 px boxes: 4 rows under its
    // line; thinner, the bands of a stack run together into pinstripes).
    if (plain && face >= 4) {
      const band = y0 + 1 + Math.floor(face / 2)
      for (let x = 1; x <= w; x++) set(g, x, band, leader ? 'W' : 'r')
    }
    const room = w - (leader ? 4 : 0)
    if (!plain && wordFits(room, face)) {
      words++
      const lx = 1 + Math.floor((room - LABEL_W) / 2)
      const ly = y0 + 1 + Math.floor((face - LABEL_H) / 2)
      if (!leader) rect(g, lx, ly, lx + LABEL_W - 1, ly + LABEL_H - 1, 'w')
      WORD.split('').forEach((ch, i) => {
        ;(GLYPHS[ch] ?? []).forEach((line, gy) => {
          for (let gx = 0; gx < line.length; gx++) {
            if (line.charAt(gx) === '#')
              set(g, lx + 1 + i * 4 + gx, ly + 1 + gy, leader ? 'W' : 'r')
          }
        })
      })
    }
    bottom = y0
  })
  // The leader's ribbon: blue, edged in white, down the front of every box (over the lines).
  if (leader) {
    const rx = w - 2
    for (let y = depth; y < total - 1; y++) {
      if (g[y]?.[rx] === 'o') continue
      set(g, rx - 1, y, 'E')
      set(g, rx, y, 'B')
      set(g, rx + 1, y, 'E')
    }
  }
  // The outline all round, inside the stack's own height: first and last rows, and the sides.
  const out = outline(g, BOX_SOLID)
  for (let x = 0; x < (out[0]?.length ?? 0); x++) {
    if (out[0]?.[x] !== '.') set(out, x, 0, 'o')
  }
  // Each line between boxes, edge to edge: across the front, then round the side, slanting back
  // with it (drawn after the outline, so the stack's own edge stays whole).
  set(out, 0, depth, 'o')
  for (const y0 of lines) {
    set(out, 0, y0, 'o')
    for (let j = 0; j < lean; j++) {
      const y = y0 - Math.round(((j + 1) * depth) / (lean + 1)) + 1
      if (out[y]?.[1 + w + j] !== '.') set(out, 1 + w + j, y, 'o')
    }
  }
  return { rows: rows(out), words }
}
