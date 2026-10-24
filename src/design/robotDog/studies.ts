/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): studies for the delivery cart design, before
 * the stacks are redrawn. Pure.
 *
 * 1. One pizza box, three versions (pixel grids, built from shapes and then outlined):
 *    A. closed, seen a little from above (3/4): the lid shows, printed with a round pizza;
 *    B. the same box in a red-and-white takeout print, a round pizza icon on its lid;
 *    C. open, from the front: the lid stands up behind and the whole round pizza shows.
 * 2. The cart's expressions: its face, antenna and flag for each kind of step, as frames with
 *    their times, fitted to the step like any frequent move (fitMs) or held like the special
 *    one (specialMs); the finale plays in full.
 */
import { fitMs, specialMs } from '../../characters/pixel'
import { BASE_STEP_DELAY_MS } from '../../engine/player'
import { blank, outline, rows, set, type CartPose, type Grid } from './sprites'

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

/** Pepperoni: these pixels, wherever they land on sauce. */
function dots(g: Grid, at: readonly (readonly [number, number])[], on = 'p') {
  for (const [x, y] of at) if (g[y]?.[x] === on) set(g, x, y, 'd')
}

const BOX_SOLID = 'lfsmpdcwrqvib'

/** The closed box, seen a little from above: lid, front and right side, 30 × 17. */
function closedBox(lidCode: string, front: (x: number) => string, side: (x: number) => string) {
  const g = blank(30, 17)
  // The lid, 10 rows deep, leaning 5 to the right at the back.
  poly(
    g,
    [
      [6, 1],
      [29, 1],
      [24, 11],
      [1, 11],
    ],
    lidCode,
  )
  // The front (its top row the lid's lip, darker) and the right side.
  for (let y = 11; y <= 15; y++)
    for (let x = 1; x <= 23; x++) set(g, x, y, y === 11 ? 'm' : front(x))
  poly(
    g,
    [
      [24, 11],
      [29, 1],
      [29, 6],
      [24, 16],
    ],
    's',
  )
  g.forEach((row, y) => {
    row.forEach((c, x) => {
      if (c === 's') set(g, x, y, side(x))
    })
  })
  return g
}

/** The round pizza on the lid's centre, as a circle seen a little from above. */
const LID = { cx: 15, cy: 6, rx: 7.4, ry: 4.4 } as const

/** A. Plain cardboard, a round pizza printed on the lid (a red circle with a few dots). */
export const BOX_A: readonly string[] = (() => {
  const g = closedBox(
    'l',
    () => 'f',
    () => 's',
  )
  ellipse(g, LID.cx, LID.cy, LID.rx, LID.ry, 'p')
  dots(g, [
    [12, 4],
    [17, 4],
    [14, 6],
    [19, 7],
    [11, 7],
    [16, 8],
  ])
  return rows(outline(g, BOX_SOLID))
})()

/** B. White, a red-and-white takeout print on the sides, a round pizza icon on the lid. */
export const BOX_B: readonly string[] = (() => {
  const g = closedBox(
    'w',
    (x) => (Math.floor(x / 2) % 2 === 0 ? 'r' : 'w'),
    (x) => (x % 2 === 0 ? 'q' : 'v'),
  )
  ellipse(g, LID.cx, LID.cy, LID.rx, LID.ry, 'c')
  ellipse(g, LID.cx, LID.cy, LID.rx - 1.6, LID.ry - 1.2, 'p')
  dots(g, [
    [12, 5],
    [17, 5],
    [14, 7],
    [18, 7],
    [11, 7],
  ])
  return rows(outline(g, BOX_SOLID))
})()

/** C. Open, from the front: the lid up behind, the whole round pizza in the base, 26 × 21. */
export const BOX_C: readonly string[] = (() => {
  const g = blank(26, 21)
  // The lid standing open (its inside, lighter), the back wall's edge, the base seen from above,
  // then the front.
  for (let y = 1; y <= 5; y++) for (let x = 1; x <= 24; x++) set(g, x, y, 'i')
  for (let y = 6; y <= 16; y++) for (let x = 1; x <= 24; x++) set(g, x, y, y === 6 ? 'm' : 'b')
  for (let y = 17; y <= 19; y++) for (let x = 1; x <= 24; x++) set(g, x, y, y === 17 ? 'm' : 'f')
  // The pizza: crust ring, sauce, pepperoni.
  ellipse(g, 13, 11.5, 10.6, 4.7, 'c')
  ellipse(g, 13, 11.5, 8.8, 3.5, 'p')
  dots(g, [
    [9, 10],
    [13, 9],
    [17, 10],
    [7, 12],
    [11, 12],
    [15, 12],
    [19, 12],
    [10, 14],
    [14, 14],
    [17, 14],
  ])
  return rows(outline(g, BOX_SOLID))
})()

export const BOX_CODES = [
  'o',
  'l',
  'f',
  's',
  'm',
  'p',
  'd',
  'c',
  'w',
  'r',
  'q',
  'v',
  'i',
  'b',
  'R',
  'L',
  'W',
  'B',
  'E',
]

/** A small "!" over the cart when it finds one for the left: x white, o outline, 3 × 7. */
export const BANG = ['ooo', 'oxo', 'oxo', 'oxo', 'ooo', 'oxo', 'ooo'] as const

// ---------- The cart's expressions ----------

export type Mood = 'idle' | 'look' | 'found' | 'stay' | 'delivered' | 'done' | 'finale'

export interface MoodFrame extends CartPose {
  /** How long this frame shows at 1×, before fitting (the last one holds). */
  readonly ms: number
  readonly bang?: boolean
}

export interface MoodSpec {
  readonly name: string
  readonly when: string
  /** How it is timed: a frequent move fits inside the step; the special move is held. */
  readonly timing: 'fit' | 'special' | 'full'
  readonly frames: readonly MoodFrame[]
}

export const MOODS: Readonly<Record<Mood, MoodSpec>> = {
  idle: {
    name: 'Idle',
    when: 'The start, and between steps',
    timing: 'fit',
    frames: [{ face: 'idle', ms: 0 }],
  },
  look: {
    name: 'Looking',
    when: 'Compare: its eyes go up to the box, across to the leader and back; the antenna tilts',
    timing: 'fit',
    frames: [
      { face: 'box', ms: 260 },
      { face: 'leader', antenna: 'right', ms: 300 },
      { face: 'box', ms: 0 },
    ],
  },
  found: {
    name: 'Found it, goes left',
    when: 'Left: wide eyes, a small "!", the antenna wiggles fast',
    timing: 'fit',
    frames: [
      { face: 'wide', bang: true, antenna: 'left', ms: 45 },
      { face: 'wide', bang: true, antenna: 'right', ms: 45 },
      { face: 'wide', bang: true, antenna: 'left', ms: 45 },
      { face: 'wide', bang: true, antenna: 'right', ms: 45 },
      { face: 'wide', bang: true, ms: 90 },
      { face: 'idle', ms: 0 },
    ],
  },
  stay: {
    name: 'Stays right',
    when: 'Right: calm, one blink; the antenna and flag keep still',
    timing: 'fit',
    frames: [
      { face: 'idle', ms: 260 },
      { face: 'blink', ms: 110 },
      { face: 'idle', ms: 0 },
    ],
  },
  delivered: {
    name: 'Delivered!',
    when: 'Placing the leader (the special move): a proud smile, the antenna bounces',
    timing: 'special',
    frames: [
      { face: 'proud', antenna: 'low', ms: 130 },
      { face: 'proud', ms: 130 },
      { face: 'proud', antenna: 'low', ms: 130 },
      { face: 'proud', ms: 130 },
      { face: 'proud', antenna: 'low', ms: 130 },
      { face: 'proud', ms: 0 },
    ],
  },
  done: {
    name: 'Range done',
    when: 'A range is done: happy ^ ^ eyes, the antenna and flag wave',
    timing: 'fit',
    frames: [
      { face: 'happy', antenna: 'left', flag: 'b', ms: 110 },
      { face: 'happy', antenna: 'right', flag: 'a', ms: 110 },
      { face: 'happy', antenna: 'left', flag: 'b', ms: 110 },
      { face: 'happy', ms: 0 },
    ],
  },
  finale: {
    name: 'Finale',
    when: 'All sorted: happy ^ ^ eyes, the antenna and flag wave on (played in full)',
    timing: 'full',
    frames: [
      { face: 'happy', antenna: 'left', flag: 'b', ms: 140 },
      { face: 'happy', antenna: 'right', flag: 'a', ms: 140 },
      { face: 'happy', antenna: 'left', flag: 'b', ms: 140 },
      { face: 'happy', antenna: 'right', flag: 'a', ms: 140 },
      { face: 'happy', antenna: 'left', flag: 'b', ms: 140 },
      { face: 'happy', antenna: 'right', flag: 'a', ms: 140 },
      { face: 'happy', ms: 0 },
    ],
  },
}

export const MOOD_ORDER: readonly Mood[] = [
  'idle',
  'look',
  'found',
  'stay',
  'delivered',
  'done',
  'finale',
]

/** A mood's own length at 1× (every frame but the last, which holds). */
export function moodMs(spec: MoodSpec): number {
  return spec.frames.reduce((sum, f) => sum + f.ms, 0)
}

/**
 * The mood's frames timed for a speed: a frequent one fits inside the step (fitMs), the special
 * one is held (specialMs), the finale plays in full. Each frame keeps its share.
 */
export function fittedFrames(spec: MoodSpec, speed: number): readonly MoodFrame[] {
  const own = moodMs(spec)
  if (own === 0) return spec.frames
  const stepDelay = BASE_STEP_DELAY_MS / speed
  const total =
    spec.timing === 'fit'
      ? fitMs(own, stepDelay)
      : spec.timing === 'special'
        ? specialMs(own, stepDelay)
        : own
  return spec.frames.map((f) => ({ ...f, ms: (f.ms * total) / own }))
}

// ---------- "PIZZA" on box 2 (the takeout print) ----------

/** A 3 × 5 pixel font, just the letters of PIZZA: # ink. */
export const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  P: ['###', '#.#', '###', '#..', '#..'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
}

export const WORD = 'PIZZA'
export const GLYPH_H = 5
/** The word's width: 3 px a letter, 1 px between. */
export const WORD_W = WORD.length * 4 - 1
/** The white label the word sits on: 1 px clear all round. */
export const LABEL_W = WORD_W + 2
export const LABEL_H = GLYPH_H + 2

/** Does the word fit a box front `w` wide with `face` rows under its lip, at 1 px a pixel? */
export function wordFits(w: number, face: number): boolean {
  return w >= LABEL_W && face >= LABEL_H
}

export type WordMode = 'top' | 'every'

export interface StackLook {
  /** Where the word goes: the top box only, or every box with room. */
  readonly mode: WordMode
  /** The leader's stack: its own red boxes, white lettering, a blue ribbon down the front. */
  readonly leader?: boolean
  /** Delivered: the top box is open, its whole pizza showing where the lid was. */
  readonly open?: boolean
}

/**
 * A stack of box-2 pizza boxes as one pixel grid at real size (1 px a pixel): `w` wide, the
 * boxes' heights from the bottom up. The grid is exactly as tall as they add up to: every box's
 * 1 px outline is inside its own height (its top line; the dolly closes the bottom one), and the
 * top box's height includes the lid over the stack (`depth` rows, leaning half that to the
 * right; the right side shows; 0: no lid, the front only). Every box is outlined all round,
 * so each one in a stack stands apart; its front is red-and-white stripes, and where the word
 * fits (the top box only, or every box) a white band with PIZZA in red. The lid carries a round
 * pizza only where it is deep enough to read as a circle. Returns the grid and how many boxes
 * carry the word.
 */
export function pizzaStack(
  w: number,
  heights: readonly number[],
  depth: number,
  look: WordMode | StackLook,
): { rows: readonly string[]; words: number } {
  const { mode, leader = false, open = false } = typeof look === 'string' ? { mode: look } : look
  const total = heights.reduce((a, b) => a + b, 0)
  const lean = Math.ceil(depth / 2)
  const g = blank(w + lean + 2, total)
  const front = leader
    ? (): string => 'R'
    : (x: number) => (Math.floor((x - 1) / 2) % 2 === 0 ? 'r' : 'w')
  // The lid (or, open, the box seen from above with its pizza), then the side; the outline
  // round the whole stack is its first and last rows and columns.
  const lidCode = open ? 'b' : leader ? 'L' : 'w'
  poly(
    g,
    [
      [1 + lean, 1],
      [1 + w + lean, 1],
      [1 + w, depth],
      [1, depth],
    ],
    lidCode,
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
      if (c === 's') set(g, x, y, leader ? (x % 2 === 0 ? 'q' : 'R') : x % 2 === 0 ? 'q' : 'v')
    })
  })
  if (open) {
    const cx = 1 + lean / 2 + w / 2
    const cy = depth / 2 + 0.5
    ellipse(g, cx, cy, w * 0.42, Math.max(1, depth * 0.42), 'c', 'b')
    ellipse(g, cx, cy, w * 0.34, Math.max(0.6, depth * 0.3), 'p')
    dots(
      g,
      Array.from(
        { length: 6 },
        (_, k) =>
          [Math.round(cx - w * 0.25 + k * w * 0.1), Math.round(cy - 0.5 + (k % 2))] as const,
      ),
    )
  } else if (depth >= 6) {
    // A round pizza on the lid, only where it is deep enough to read as a circle.
    const cx = 1 + lean / 2 + w / 2
    const cy = depth / 2 + 0.5
    ellipse(g, cx, cy, Math.min(w * 0.22, (depth - 2) * 0.5 * 2.2), (depth - 2) * 0.5, 'c')
    ellipse(
      g,
      cx,
      cy,
      Math.min(w * 0.22, (depth - 2) * 0.5 * 2.2) - 1.4,
      (depth - 2) * 0.5 - 0.9,
      'p',
    )
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
    // Rows under its top line (the box under the stack is closed by the dolly's own line).
    const face = tall - 1
    if ((mode === 'every' || isTop) && wordFits(w - (leader ? 4 : 0), face)) {
      words++
      const room = w - (leader ? 4 : 0)
      const lx = 1 + Math.floor((room - LABEL_W) / 2)
      const ly = y0 + 1 + Math.floor((face - LABEL_H) / 2)
      if (!leader) {
        for (let y = ly; y < ly + LABEL_H; y++) {
          for (let x = lx; x < lx + LABEL_W; x++) set(g, x, y, 'w')
        }
      }
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
  const out = outline(g, BOX_SOLID + 'RLWBE')
  for (let x = 0; x < (out[0]?.length ?? 0); x++) {
    if (out[0]?.[x] !== '.') set(out, x, 0, 'o')
  }
  // Each line between boxes, edge to edge: across the front, then on round the side, slanting
  // back with it (drawn after the outline, so the stack's own edge stays whole).
  // (The lid's own line, under it, closes at the left edge too.)
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

/** The real stage fields (measured on the site with 12 numbers), as on the cart design. */
export const STAGES = [
  { id: 'side', label: 'Phone on its side, 130% text (479 × 60)', width: 479, height: 60 },
  { id: 'side-explorer', label: 'On its side, Explorer (479 × 75)', width: 479, height: 75 },
  { id: 'side-100', label: 'On its side, 100% (612 × 140)', width: 612, height: 140 },
  { id: 'upright', label: 'Phone upright (366 × 324)', width: 366, height: 324 },
  { id: 'desktop', label: 'Desktop (698 × 163)', width: 698, height: 163 },
] as const

/** The lid's depth on a stack `w` wide, never more than its top box can hold under a 2 px front. */
export function lidDepth(w: number, topBox: number): number {
  return Math.max(1, Math.min(Math.max(3, Math.round(w * 0.12)), topBox - 2))
}
