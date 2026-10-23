/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): the pixel grids for the second round of quick
 * sort mockups. One character letter per pixel; spritePath (characters/pixel.ts) turns each
 * letter's pixels into one SVG path, drawn at a whole number of screen pixels per pixel.
 *
 * The sprites are built from parts (a body, a head, legs in a pose, a tail) and then outlined,
 * so every frame of the dog is the same dog: only its legs, tail and jump change.
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

export type Legs = 'stand' | 'trot1' | 'trot2' | 'tuck'
export type Tail = 'back' | 'up'

/**
 * The robot dog, facing right, 26 × 17. A dog first: four legs (the far pair darker), a snout
 * with a nose, a pointed ear, a tail that wags. A robot second: metal plates with a seam and
 * bolts, a glowing LED eye, an antenna, a glowing tail tip.
 * m metal, l far legs and belly plate, k ear, b bolts, e LED eye and tail tip, n nose,
 * a antenna tip; o outline.
 */
export function drawDog(legs: Legs, tail: Tail): readonly string[] {
  const g = blank(26, 17)
  // Tail: from the rump, swept back or straight up (the wag is the two in turn).
  const tailPx: readonly (readonly [number, number])[] =
    tail === 'back'
      ? [
          [4, 8],
          [3, 7],
          [3, 6],
          [2, 5],
        ]
      : [
          [4, 8],
          [4, 7],
          [5, 6],
          [5, 5],
        ]
  for (const [x, y] of tailPx) set(g, x, y, 'm')
  const [tx, ty] = tail === 'back' ? [2, 4] : [6, 4]
  set(g, tx, ty, 'e')
  // Body, with a belly plate, a seam and two bolts.
  rect(g, 5, 8, 16, 12, 'm')
  rect(g, 6, 12, 15, 12, 'l')
  rect(g, 10, 9, 10, 11, 'l')
  set(g, 7, 9, 'b')
  set(g, 13, 9, 'b')
  // Neck, then the head held up over the chest (a chin), the snout and nose; the eye; a bolt.
  rect(g, 15, 6, 17, 8, 'm')
  rect(g, 16, 3, 21, 7, 'm')
  rect(g, 22, 4, 24, 6, 'm')
  set(g, 24, 4, 'n')
  set(g, 23, 6, 'l')
  set(g, 19, 4, 'e')
  set(g, 20, 4, 'e')
  set(g, 17, 5, 'b')
  // The ear: pointed, at the back of the head.
  set(g, 16, 1, 'k')
  set(g, 16, 2, 'k')
  set(g, 17, 2, 'k')
  // Legs: back pair at 6 (near) and 8 (far), front pair at 14 (far) and 16 (near).
  const leg = (x: number, code: string, lean: number) => {
    if (legs === 'tuck') {
      set(g, x, 13, code)
      return
    }
    set(g, x, 13, code)
    set(g, x + (lean > 0 ? 1 : lean < 0 ? -1 : 0), 14, code)
    set(g, x + lean, 15, code)
  }
  const lean = {
    stand: [0, 0, 0, 0],
    trot1: [-1, 1, -1, 1],
    trot2: [1, -1, 1, -1],
    tuck: [0, 0, 0, 0],
  }[legs]
  leg(8, 'l', lean[1] ?? 0)
  leg(14, 'l', lean[3] ?? 0)
  leg(6, 'm', lean[0] ?? 0)
  leg(16, 'm', lean[2] ?? 0)
  const out = outline(g, 'mlkbenp')
  // The antenna: a thin stem with a glowing tip, not outlined.
  set(out, 20, 2, 'o')
  set(out, 20, 1, 'o')
  set(out, 20, 0, 'a')
  return rows(out)
}

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

/** A sparkle, 7 × 7: s bright. */
export const SPARKLE = [
  '...s...',
  '...s...',
  '.......',
  'ss.s.ss',
  '.......',
  '...s...',
  '...s...',
] as const

export const DOG_STAND = drawDog('stand', 'back')
export const DOG_WAG = drawDog('stand', 'up')
export const DOG_TROT1 = drawDog('trot1', 'back')
export const DOG_TROT2 = drawDog('trot2', 'up')
export const DOG_JUMP = drawDog('tuck', 'up')
export const CART_A = drawCart(0)
export const CART_B = drawCart(1)

const paths = (grid: readonly string[], codes: readonly string[]) =>
  Object.fromEntries(codes.map((code) => [code, spritePath(grid, code)]))

const DOG_CODES = ['o', 'm', 'l', 'k', 'b', 'e', 'n', 'a']
const CART_CODES = ['o', 'c', 'd', 's', 'e', 'p', 'w', 'h', 'f']

export const SPRITES = {
  dogStand: { rows: DOG_STAND, paths: paths(DOG_STAND, DOG_CODES) },
  dogWag: { rows: DOG_WAG, paths: paths(DOG_WAG, DOG_CODES) },
  dogTrot1: { rows: DOG_TROT1, paths: paths(DOG_TROT1, DOG_CODES) },
  dogTrot2: { rows: DOG_TROT2, paths: paths(DOG_TROT2, DOG_CODES) },
  dogJump: { rows: DOG_JUMP, paths: paths(DOG_JUMP, DOG_CODES) },
  cartA: { rows: CART_A, paths: paths(CART_A, CART_CODES) },
  cartB: { rows: CART_B, paths: paths(CART_B, CART_CODES) },
  sparkle: { rows: SPARKLE, paths: paths(SPARKLE, ['s']) },
} as const

export type SpriteId = keyof typeof SPRITES

/** The dog's mouth (where it holds a string), in sprite pixels from its top left, facing right. */
export const DOG_MOUTH = { x: 24, y: 6 } as const
/** The cart's deck row, in sprite pixels from its top. */
export const CART_DECK = 4
