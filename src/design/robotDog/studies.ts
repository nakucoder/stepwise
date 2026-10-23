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

export const BOX_CODES = ['o', 'l', 'f', 's', 'm', 'p', 'd', 'c', 'w', 'r', 'q', 'v', 'i', 'b']

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
