/**
 * Heap sort's builder beaver (design/mockups/builder-beaver/README.md): its pixel art. The
 * sprites are drawn into a small raster from simple shapes (discs, thick lines), then outlined;
 * each sprite is a grid of codes, one character a pixel ('.' is empty), drawn by `spritePath`.
 *
 * - The beaver (B2, compact): 30 × 16, facing right (the scene mirrors it to walk left). Codes:
 *   o outline, f fur, l cream, d feet and paws, t tail, x the tail's hatch, e eye, s shine,
 *   n nose, w teeth, h hat, H the hat's brim, m mouth.
 * - A log seen side-on, any size: o outline, B bark, S bark streak, C cut end, R ring.
 * - A log's round cut end, the dam's node: the same codes.
 */

/** A small raster to draw sprites into: shapes fill codes, then an outline goes round them. */
export class Raster {
  readonly w: number
  readonly h: number
  private readonly cells: string[][]

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.cells = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'))
  }

  get(x: number, y: number): string {
    return this.cells[y]?.[x] ?? '.'
  }

  set(x: number, y: number, code: string): void {
    const row = this.cells[Math.round(y)]
    const at = Math.round(x)
    if (row && at >= 0 && at < this.w) row[at] = code
  }

  /** A filled ellipse (pixel centers inside it). */
  disc(cx: number, cy: number, rx: number, ry: number, code: string): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, code)
  }

  /** A thick line through the points (a disc of the thickness swept along it). */
  path(points: readonly (readonly [number, number])[], thick: number, code: string): void {
    for (let k = 1; k < points.length; k++) {
      const [x0, y0] = points[k - 1] ?? [0, 0]
      const [x1, y1] = points[k] ?? [0, 0]
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4))
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thick / 2, thick / 2, code)
      }
    }
  }

  /** Every empty pixel touching a filled one (4 ways) becomes the outline. */
  outline(code = 'o'): void {
    const marks: [number, number][] = []
    const filled = (x: number, y: number) => {
      const c = this.get(x, y)
      return c !== '.' && c !== code
    }
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (
          this.get(x, y) === '.' &&
          (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))
        )
          marks.push([x, y])
    for (const [x, y] of marks) this.set(x, y, code)
  }

  grid(): readonly string[] {
    return this.cells.map((row) => row.join(''))
  }
}

// ---------- The beaver ----------

/** The beaver's sprites: its moods, and two frames of walking on all fours. */
export type BeaverSprite =
  'idle' | 'face' | 'walk' | 'walk2' | 'look' | 'found' | 'shrug' | 'carry' | 'proud' | 'happy'

export const BEAVER_SPRITES: readonly BeaverSprite[] = [
  'idle',
  'face',
  'walk',
  'walk2',
  'look',
  'found',
  'shrug',
  'carry',
  'proud',
  'happy',
]

export const BEAVER_W = 30
export const BEAVER_H = 16
export const BEAVER_CODES = [
  'o',
  'f',
  'l',
  'd',
  't',
  'x',
  'e',
  's',
  'n',
  'w',
  'h',
  'H',
  'm',
] as const
/**
 * Where its paws are across the sprite, facing right: the middle of its raised arms when it
 * carries. The beaver stands with its paws under the value it works on.
 */
export const BEAVER_PAWS = 17

/** The poses that sit or stand up (the others are on all fours). */
const UPRIGHT: readonly BeaverSprite[] = [
  'idle',
  'face',
  'look',
  'shrug',
  'carry',
  'proud',
  'happy',
]

/** The beaver in one of its sprites, facing right. */
export function beaverRows(sprite: BeaverSprite): readonly string[] {
  const r = new Raster(BEAVER_W, BEAVER_H)
  const upright = UPRIGHT.includes(sprite)
  // The paddle tail, flat on the ground behind, cross-hatched.
  r.disc(5, 13.2, 4.6, 1.6, 't')
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) if (r.get(x, y) === 't' && (x + y) % 3 === 0) r.set(x, y, 'x')

  let head: [number, number]
  if (upright) {
    // Sitting up: a round body, cream belly, a big foot forward.
    r.disc(14, 10.2, 5.4, 4.6, 'f')
    r.disc(15.5, 11, 3, 3.2, 'l')
    r.disc(16.5, 14.2, 3.2, 1.1, 'd')
    head = [18, 5.6]
    // Paws at its chest; both arms up (carrying, proud, happy); or out to the sides (a shrug).
    const paws: [number, number][] =
      sprite === 'carry' || sprite === 'proud' || sprite === 'happy'
        ? [
            [12, 1],
            [22, 1],
          ]
        : sprite === 'shrug'
          ? [
              [8, 6],
              [25, 6],
            ]
          : [[21, 9]]
    for (const [px, py] of paws) {
      const sx = px < 16 ? 12 : 17
      r.path(
        [
          [sx, 8],
          [px, py],
        ],
        1.8,
        'f',
      )
      r.disc(px, py, 1.1, 0.9, 'd')
    }
  } else {
    // On all fours: a long low body, short legs (they swap between the two walk frames).
    r.disc(14, 10.4, 7.6, 3.8, 'f')
    r.disc(15, 12.4, 4.6, 1.3, 'l')
    const step = sprite === 'walk2' ? 1 : 0
    for (const x of [9 + step, 12 - step, 17 + step, 20 - step]) r.disc(x, 14, 1, 1.2, 'd')
    head = [23, 8.4]
  }

  // Waiting for the learner (Do it): its head turned to the front, two eyes, the hat straight.
  if (sprite === 'face') {
    const [hx, hy] = [18, 5]
    r.disc(hx, hy, 3.6, 3.4, 'f')
    r.disc(hx, hy + 2.2, 2.4, 1.5, 'l')
    r.set(hx, hy + 1, 'n')
    r.set(hx, hy + 3, 'w')
    r.set(hx, hy + 4, 'w')
    for (const ex of [hx - 2, hx + 2]) {
      r.set(ex, hy - 1, 'e')
      r.set(ex, hy, 'e')
    }
    for (let y = hy - 5; y <= hy - 3; y++)
      for (let x = hx - 4; x <= hx + 4; x++)
        if (((x - hx) / 3.8) ** 2 + ((y - (hy - 2.6)) / 2.6) ** 2 <= 1) r.set(x, y, 'h')
    for (let x = hx - 4; x <= hx + 4; x++) r.set(x, hy - 2.5, 'H')
    r.outline('o')
    return r.grid()
  }

  // The head: dark fur, cream cheek and muzzle, the nose, the teeth.
  const [hx, hy] = head
  r.disc(hx, hy, 3.6, 3.3, 'f')
  r.disc(hx + 1.6, hy + 1.2, 2.6, 1.7, 'l')
  r.set(hx + 4, hy, 'n')
  r.set(hx + 2, hy + 3, 'w')
  r.set(hx + 2, hy + 4, 'w')
  r.set(hx + 3, hy + 3, 'w')
  r.set(hx + 3, hy + 4, 'w')
  // The hard hat: a low dome and a brim, tipped back a little.
  for (let y = hy - 5; y <= hy - 3; y++)
    for (let x = hx - 4; x <= hx + 3; x++)
      if (((x - hx + 0.5) / 3.8) ** 2 + ((y - (hy - 2.6)) / 2.6) ** 2 <= 1) r.set(x, y, 'h')
  for (let x = hx - 4; x <= hx + 5; x++) r.set(x, hy - 2.5, 'H')

  // The eye, by mood.
  const ex = hx + 1
  const ey = hy - 1
  if (sprite === 'proud' || sprite === 'happy') {
    // Happy closed eyes: a little arch.
    r.set(ex - 1, ey, 'e')
    r.set(ex, ey - 1, 'e')
    r.set(ex + 1, ey, 'e')
  } else if (sprite === 'found') {
    // A wide eye with a shine.
    r.set(ex, ey - 1, 'e')
    r.set(ex + 1, ey - 1, 's')
    r.set(ex, ey, 'e')
    r.set(ex + 1, ey, 'e')
  } else if (sprite === 'shrug') {
    // Half-closed: a flat line.
    r.set(ex, ey, 'e')
    r.set(ex + 1, ey, 'e')
  } else if (sprite === 'look') {
    // Looking up and ahead.
    r.set(ex + 1, ey - 1, 'e')
    r.set(ex + 1, ey, 'e')
  } else {
    r.set(ex, ey, 'e')
    r.set(ex, ey + 1, 'e')
  }
  // A smile when proud or happy, an open mouth when happy.
  if (sprite === 'proud' || sprite === 'happy') r.set(hx + 1, hy + 2.6, 'm')
  if (sprite === 'happy') r.set(hx, hy + 2.4, 'm')
  r.outline('o')
  return r.grid()
}

/** The small "!" over its head when it finds a bigger one: o outline, x white. */
export const BANG = ['ooo', 'oxo', 'oxo', 'oxo', 'ooo', 'oxo', 'ooo'] as const

// ---------- The logs ----------

export const LOG_CODES = ['o', 'B', 'S', 'C', 'R'] as const
/** From this height a log has its rounded left end; from LOG_RING its streaks, ring and center. */
export const LOG_ROUND = 5
export const LOG_RING = 7

/**
 * One log seen side-on, `h` px high and `w` wide; its top line is its outline (the line between it
 * and the log over it). Bark with a rounded left end, and its round cut end at the right, pale
 * wood about 0.9 of its height wide, with a ring and a center where it fits. Under 5 px a plain
 * log (bark and a paler cut end); at 1 px a stack is a plain column.
 */
export function logRows(h: number, w: number): readonly string[] {
  const r = new Raster(w, h)
  if (h < 2) {
    for (let x = 0; x < w; x++) r.set(x, 0, 'B')
    return r.grid()
  }
  const body = h - 1
  const capW = Math.max(3, Math.round(body * 0.9))
  for (let y = 1; y < h; y++)
    for (let x = 0; x < w; x++) {
      const fromTop = y - 1
      const round = h >= LOG_ROUND && x === 0 && (fromTop === 0 || fromTop === body - 1)
      if (!round) r.set(x, y, 'B')
    }
  if (h >= LOG_RING) {
    for (let x = 2; x < w - capW - 2; x += 5) r.set(x, 1 + Math.round(body / 3), 'S')
    for (let x = 4; x < w - capW - 2; x += 6) r.set(x, 1 + Math.round((2 * body) / 3), 'S')
  }
  // The cut end: an ellipse at the right, with a ring and a center where it fits.
  const cx = w - 1 - capW / 2
  const cy = 1 + (body - 1) / 2
  const inEnd = (x: number, y: number) =>
    ((x - cx) / (capW / 2)) ** 2 + ((y - cy) / (body / 2)) ** 2
  for (let y = 1; y < h; y++)
    for (let x = w - capW - 1; x < w; x++) if (inEnd(x, y) <= 1.05) r.set(x, y, 'C')
  if (h >= LOG_RING) {
    for (let y = 1; y < h; y++)
      for (let x = w - capW - 1; x < w; x++) {
        const d = inEnd(x, y)
        if (d > 0.25 && d < 0.5) r.set(x, y, 'R')
      }
    r.set(Math.round(cx), Math.round(cy), 'R')
  }
  for (let x = 0; x < w; x++) r.set(x, 0, 'o')
  // An outline down both sides and round the ends.
  return r.grid().map((row, y) => {
    if (y === 0) return row
    const chars = row.split('')
    const first = chars.findIndex((c) => c !== '.')
    const last = chars.length - 1 - [...chars].reverse().findIndex((c) => c !== '.')
    if (first >= 0) {
      chars[first] = 'o'
      chars[last] = 'o'
    }
    return chars.join('')
  })
}

/** A stack of `count` identical logs, closed by one line under the bottom one (from 2 px). */
export function stackRows(count: number, h: number, w: number): readonly string[] {
  const one = logRows(h, w)
  const rows: string[] = []
  for (let k = 0; k < count; k++) rows.push(...one)
  if (count > 0 && h >= 2) rows.push('o'.repeat(w))
  return rows
}

/**
 * A log's round cut end, `d` px across (the dam's node): a bark ring, pale wood, two growth
 * rings, a dark outline. (d + 2) × (d + 2) with its outline.
 */
export function logEndRows(d: number): readonly string[] {
  const r = new Raster(d + 2, d + 2)
  const c = (d + 1) / 2
  r.disc(c, c, d / 2, d / 2, 'B')
  r.disc(c, c, d / 2 - 2, d / 2 - 2, 'C')
  for (const ring of [0.55, 0.8])
    for (let y = 0; y < r.h; y++)
      for (let x = 0; x < r.w; x++) {
        const dist = Math.hypot(x - c, y - c) / (d / 2 - 2)
        if (r.get(x, y) === 'C' && Math.abs(dist - ring) < 0.07) r.set(x, y, 'R')
      }
  r.outline('o')
  return r.grid()
}
