/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): the pure part of heap sort's character
 * mockups. Two designs, drawn from heap sort's real frames at the site's real stage sizes:
 *
 * - D, the stegosaurus herd: every dino the same size; the number of plates on its back is the
 *   value (one plate = one, 1 to 12).
 * - M, the monkeys: every monkey the same size, holding a stack of identical bananas; the number
 *   of bananas is the value (one banana = one, 1 to 12).
 *
 * Sprites are grids of one-letter codes, built in code so a value's plates or bananas are always
 * exactly the value. Sizes come from the stage's grid of 12 (never from the run's numbers).
 */
import type { Frame } from '../../engine/types'
import { heapEnd } from '../../components/heapTree'

export type Design = 'stego' | 'monkey'

/** The pyramid band over the field, as the site draws it at that size (measured). */
export interface BandSpec {
  /** One row (phones on their side: row numbers under the arcs) or two (tags, then arcs). */
  readonly kind: 'one' | 'two'
  readonly height: number
  /** Two rows: the tags' row and the arcs' row (with 2 px between). */
  readonly tags: number
  readonly arcs: number
  readonly font: number
  /** The arrow's width, the arc's corner, and the left child's arc height. */
  readonly foot: number
  readonly radius: number
  readonly leftArc: number
}

export interface StageSize {
  readonly id: string
  readonly label: string
  /** The stage field's size with 12 numbers, measured on the site (bars). */
  readonly width: number
  readonly height: number
  /** The gap between columns at 12 numbers (6rem / 12, at the size's text scale). */
  readonly gap: number
  /** The text scale, for the gap with fewer numbers. */
  readonly rem: number
  readonly band: BandSpec
  /** The tree's box over the band, where the site shows it on the stage. */
  readonly tree?: { readonly width: number; readonly height: number }
}

const ONE_ROW = (rem: number, height: number): BandSpec => ({
  kind: 'one',
  height,
  tags: height,
  arcs: height,
  font: 0.6875 * rem,
  foot: 0.5 * rem,
  radius: 0.25 * rem,
  leftArc: height - 0.3125 * rem,
})

const TWO_ROWS: BandSpec = {
  kind: 'two',
  height: 40,
  tags: 18,
  arcs: 20,
  font: 13,
  foot: 12,
  radius: 8,
  leftArc: 12,
}

/** The real stage fields with 12 numbers (measured on the live site, 2026-10-28). */
export const SIZES: readonly StageSize[] = [
  {
    id: 'tight',
    label: 'Phone on its side, 740 × 300, 130% text, Do it with the hint (the tightest): 468 × 33',
    width: 468,
    height: 33,
    gap: 10.4,
    rem: 20.8,
    band: ONE_ROW(20.8, 26),
  },
  {
    id: 'side-watch',
    label: 'The same phone in Watch: 468 × 63',
    width: 468,
    height: 63,
    gap: 10.4,
    rem: 20.8,
    band: ONE_ROW(20.8, 26),
  },
  {
    id: 'side-100',
    label: 'Phone on its side, 844 × 390, 100% text, Do it: 612 × 131',
    width: 612,
    height: 131,
    gap: 8,
    rem: 16,
    band: ONE_ROW(16, 20),
  },
  {
    id: 'upright',
    label: 'Phone upright, 390 × 844, under the tree (Watch): 366 × 156',
    width: 366,
    height: 156,
    gap: 8,
    rem: 16,
    band: TWO_ROWS,
    tree: { width: 366, height: 148 },
  },
  {
    id: 'desktop',
    label: 'Desktop, 1440 × 900, Explorer, under the tree: 698 × 85',
    width: 698,
    height: 85,
    gap: 8,
    rem: 16,
    band: TWO_ROWS,
    tree: { width: 698, height: 164 },
  },
]

// ---------- Columns ----------

/** The column gap for `count` numbers: clamp(0.25rem, 6rem / count, 0.875rem), as Stage.css. */
export function gapFor(size: StageSize, count: number): number {
  return Math.min(0.875 * size.rem, Math.max(0.25 * size.rem, (6 * size.rem) / Math.max(1, count)))
}

export interface Columns {
  readonly width: number
  readonly gap: number
  readonly count: number
  left(k: number): number
  center(k: number): number
  readonly col: number
}

export function columnsOf(size: StageSize, count: number): Columns {
  const gap = gapFor(size, count)
  const col = (size.width - (count - 1) * gap) / Math.max(1, count)
  return {
    width: size.width,
    gap,
    count,
    col,
    left: (k) => k * (col + gap),
    center: (k) => k * (col + gap) + col / 2,
  }
}

/** The distance between centers on the stage's grid of 12: what every sprite is sized from. */
export function pitch12(size: StageSize): number {
  return (size.width + size.gap) / 12
}

// ---------- Sprites ----------

export type Grid = string[]

const blank = (w: number, h: number): string[][] =>
  Array.from({ length: h }, () => Array.from({ length: w }, () => '.'))

/** Every empty pixel touching a filled one (4 ways) becomes the outline. */
function outline(cells: string[][], code = 'o'): void {
  const h = cells.length
  const w = cells[0]?.length ?? 0
  const filled = (x: number, y: number) =>
    y >= 0 && y < h && x >= 0 && x < w && cells[y]?.[x] !== '.' && cells[y]?.[x] !== code
  const marks: [number, number][] = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (
        cells[y]?.[x] === '.' &&
        (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))
      )
        marks.push([x, y])
  for (const [x, y] of marks) {
    const row = cells[y]
    if (row) row[x] = code
  }
}

const toGrid = (cells: string[][]): Grid => cells.map((row) => row.join(''))

const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1

export type StegoPose = 'stand' | 'step' | 'look' | 'proud' | 'cheer'

export const STEGO_W = 31
export const STEGO_H = 16

/**
 * A stegosaurus facing right, `value` plates on its back (one plate = one), from the neck back
 * toward the tail: two rows, as on a real stegosaurus, each plate 3 px wide, a plate every 2 px,
 * the front row's plates (light) in front of the back row's (darker). Codes: o outline, b body,
 * l belly, f far legs, p front plate, q back plate, e eye, m mouth (cheer).
 */
export function stegoRows(value: number, pose: StegoPose = 'stand'): Grid {
  const w = STEGO_W
  const h = STEGO_H
  const c = blank(w, h)
  const set = (x: number, y: number, code: string) => {
    const row = c[y]
    if (row && x >= 0 && x < w) row[x] = code
  }
  const head = pose === 'proud' || pose === 'cheer' ? -1 : pose === 'look' ? 1 : 0
  const step = pose === 'step' ? 1 : 0
  // Far legs (darker), behind the body.
  for (let y = 12; y <= 14; y++) {
    set(11 + step, y, 'f')
    set(12 + step, y, 'f')
    set(22 - step, y, 'f')
    set(23 - step, y, 'f')
  }
  // The back row of plates (behind the body), then the body, then the front row.
  // Everything sits 2 rows higher than the shapes' own numbers (the plates' room is just enough).
  const body = (x: number, yy: number) => {
    const y = yy + 2
    return (
      inEllipse(x, y, 15.5, 11, 9.6, 3.7) ||
      // The tail, tapering to its tip at the left.
      (x >= 1 && x <= 8 && Math.abs(y - 10.5) <= (x - 1) * 0.3 + 0.6) ||
      // The neck and the small, low head.
      (x >= 23 && x <= 25 && y >= 11 + head && y <= 13) ||
      inEllipse(x, y, 27, 12.4 + head, 2.2, 1.7)
    )
  }
  const topOf = (x: number) => {
    for (let y = 0; y < h; y++) if (body(x, y)) return y
    return h
  }
  const plate = (k: number, code: string, tall: number) => {
    const cx = 24 - 2 * k
    const base = topOf(cx)
    for (let d = 1; d <= tall; d++) {
      const y = base - d
      if (d === tall) set(cx, y, code)
      else for (let x = cx - 1; x <= cx + 1; x++) set(x, y, code)
    }
  }
  for (let k = 1; k < value; k += 2) plate(k, 'q', 5)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (body(x, y)) set(x, y, y >= 11 && x > 7 && x < 24 ? 'l' : 'b')
  for (let k = 0; k < value; k += 2) plate(k, 'p', 3)
  // A dark line down each side of a front plate, where a back plate stands behind it, so every
  // plate reads on its own.
  for (let k = 0; k < value; k += 2) {
    const cx = 24 - 2 * k
    const base = topOf(cx)
    for (const x of [cx - 2, cx + 2])
      for (let y = base - 2; y < base; y++) if (c[y]?.[x] === 'q') set(x, y, 'o')
  }
  // Near legs.
  for (let y = 12; y <= 14; y++) {
    set(9 - step, y, 'b')
    set(10 - step, y, 'b')
    set(20 + step, y, 'b')
    set(21 + step, y, 'b')
  }
  set(28, 10 + head, 'e')
  if (pose === 'cheer') set(29, 11 + head, 'm')
  outline(c)
  return toGrid(c)
}

export type MonkeyPose = 'sit' | 'look' | 'swing' | 'cheer'

export const MONKEY_W = 13
export const MONKEY_H = 10

/**
 * A monkey sitting, seen from the front, both hands up holding its stack of bananas on its head.
 * Codes: o outline, f fur, l face and belly, e eyes. "look" turns its eyes to the right;
 * "swing" holds one arm high (on the vine); "cheer" lifts the arms one pixel more.
 */
export function monkeyRows(pose: MonkeyPose = 'sit'): Grid {
  const w = MONKEY_W
  const h = MONKEY_H
  const c = blank(w, h)
  const set = (x: number, y: number, code: string) => {
    const row = c[y]
    if (row && x >= 0 && x < w && y >= 0) row[x] = code
  }
  const up = pose === 'cheer' ? 1 : 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (inEllipse(x, y, 6, 3.4, 2.6, 2.1)) set(x, y, 'f')
      if (inEllipse(x, y, 6, 6.6, 2.1, 1.6)) set(x, y, 'f')
    }
  // Ears, the face and the belly.
  set(3, 3, 'f')
  set(9, 3, 'f')
  for (const [x, y] of [
    [5, 4],
    [6, 4],
    [7, 4],
    [6, 5],
    [6, 7],
  ] as const)
    set(x, y, 'l')
  const look = pose === 'look' ? 1 : 0
  set(5 + look, 3, 'e')
  set(7 + look, 3, 'e')
  // Arms up from the shoulders to the hands (on the stack), or one high on a vine.
  const arm = (side: -1 | 1, high: boolean) => {
    const x0 = 6 + side * 3
    set(x0, 6, 'f')
    set(x0 + side, 5, 'f')
    set(x0 + side, 4, 'f')
    set(x0 + side, 3 - up, 'f')
    set(x0 + side, 2 - up, 'f')
    if (high) set(x0 + side, 1, 'f')
  }
  arm(-1, false)
  arm(1, pose === 'swing')
  // Feet and a curled tail.
  set(4, 8, 'f')
  set(8, 8, 'f')
  set(9, 8, 'f')
  set(10, 7, 'f')
  outline(c)
  return toGrid(c)
}

/** One banana's height (without the 1 px gap under it) at a banana pitch `u`. */
export const bananaH = (u: number) => u - 1

/** One banana, `bh` rows high: a curve, the tips up, a stem at the left tip. Codes: y, d, k. */
export function bananaRows(bh: number): Grid {
  const w = 2 * bh + 4
  const c = blank(w, bh)
  for (let y = 0; y < bh; y++) {
    const row = c[y]
    if (!row) continue
    const left = y
    const right = w - 1 - y
    if (y >= bh - 2 && y > 0) {
      // The banana's body: its bottom two rows, the last one shaded.
      for (let x = left; x <= right; x++) row[x] = y === bh - 1 && bh > 3 ? 'd' : 'y'
    } else {
      // The tips curving up: strokes one pixel wider each row down, at most three.
      const stroke = Math.min(y + 1, 3)
      for (let d = 0; d < stroke; d++) {
        row[left + d] = 'y'
        row[right - d] = 'y'
      }
    }
  }
  const first = c[0]
  if (first) first[0] = 'k'
  return toGrid(c)
}

/**
 * A stack of `value` bananas, `u` px each (a banana and a 1 px gap), the first at the bottom.
 * Under 3 px a banana can't be drawn: the plain stack is one column, `value × u` high.
 */
export function bananaStack(value: number, u: number): { grid: Grid; plain: boolean } {
  if (u < 3) {
    // One column with a 1 px outline round it; at 2 px a banana, a dark line between bananas.
    const width = 7
    const c = blank(width, value * u + 2)
    for (let y = 1; y <= value * u; y++)
      for (let x = 1; x < width - 1; x++) {
        const row = c[y]
        if (row) row[x] = u === 2 && (y - 1) % 2 === 0 && y > 1 ? 'd' : 'y'
      }
    outline(c)
    // No outline under it: it rests on the monkey's head.
    c.pop()
    return { grid: toGrid(c), plain: true }
  }
  const one = bananaRows(bananaH(u))
  const width = (one[0]?.length ?? 0) + 2
  const c: string[][] = []
  for (let k = 0; k < value; k++) {
    c.push(Array.from({ length: width }, () => '.'))
    for (const row of one) c.push(['.', ...row.split(''), '.'])
  }
  c.push(Array.from({ length: width }, () => '.'))
  // A dark outline round every banana: it is also the line between one banana and the next.
  outline(c)
  return { grid: toGrid(c), plain: false }
}

/** How many bananas a stack shows: each banana's stem is one "k". */
export const countBananas = (grid: Grid) => grid.join('').split('k').length - 1

/** How many plates a dino shows: each plate's single top pixel, with its plate 3 wide under it. */
export function countPlates(grid: Grid): number {
  let peaks = 0
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const code = row.charAt(x)
      if (code !== 'p' && code !== 'q') continue
      const above = grid[y - 1]?.charAt(x) ?? '.'
      const under = grid[y + 1] ?? ''
      if (
        above !== code &&
        row.charAt(x - 1) !== code &&
        row.charAt(x + 1) !== code &&
        [x - 1, x, x + 1].every((u) => under.charAt(u) === code)
      )
        peaks++
    }
  })
  return peaks
}

// ---------- Sizes on a stage ----------

export interface Plan {
  readonly design: Design
  /** Screen pixels per sprite pixel. */
  readonly s: number
  /** The digit's font and the plate (stone or crate) it sits on. */
  readonly font: number
  readonly plate: number
  /** Monkeys: the banana pitch (px per banana) and whether the stack is the plain column. */
  readonly u: number
  readonly plain: boolean
}

export function planOf(design: Design, size: { width: number; height: number; gap: number }): Plan {
  const pitch = (size.width + size.gap) / 12
  const h = size.height
  if (design === 'stego') {
    const font = Math.min(16, Math.max(10, Math.floor(Math.min(pitch * 0.42, h * 0.16))))
    const plate = font + 2
    const s = Math.max(
      1,
      Math.min(3, Math.floor(Math.min((pitch - 3) / STEGO_W, (h - plate - 2) / STEGO_H))),
    )
    return { design, s, font, plate, u: 0, plain: false }
  }
  const font = Math.min(16, Math.max(9, Math.floor(Math.min(pitch * 0.42, h * 0.16))))
  const plate = font + 2
  let s = Math.max(1, Math.min(3, Math.floor(h / 40), Math.floor((pitch - 3) / MONKEY_W)))
  let u = Math.min(6, Math.floor((h - plate - (MONKEY_H - 1) * s - 1) / 12))
  while (u < 3 && s > 1) {
    s--
    u = Math.min(6, Math.floor((h - plate - (MONKEY_H - 1) * s - 1) / 12))
  }
  u = Math.max(1, u)
  return { design, s, font, plate, u, plain: u < 3 }
}

// ---------- Following the values through the run ----------

/** For every frame, the identity at each position: each value keeps its id as it moves. */
export function identities(frames: readonly Frame[]): number[][] {
  const first = frames[0]?.array.map((_, k) => k) ?? []
  const out: number[][] = [first]
  for (let i = 1; i < frames.length; i++) {
    const before = frames[i - 1]?.array ?? []
    const now = frames[i]?.array ?? []
    const ids = [...(out[i - 1] ?? [])]
    const changed = now.flatMap((v, k) => (v !== before[k] ? [k] : []))
    const [a, b] = changed
    if (a !== undefined && b !== undefined) {
      ;[ids[a], ids[b]] = [ids[b] ?? b, ids[a] ?? a]
    } else {
      // A swap of two equal values changes nothing visible; follow the frame's own pair.
      const pair = frames[i]?.highlights.swapping
      const [x, y] = pair ?? []
      if (x !== undefined && y !== undefined && x !== y && frames[i]?.heap?.event !== 'stop')
        [ids[x], ids[y]] = [ids[y] ?? y, ids[x] ?? x]
    }
    out.push(ids)
  }
  return out
}

/** The move into frame `index`, if one plays: a climb or the top leaving for the end. */
export type Move =
  | { readonly kind: 'climb'; readonly parent: number; readonly child: number }
  | { readonly kind: 'extract'; readonly end: number }
  | { readonly kind: 'none' }

export function moveInto(frames: readonly Frame[], index: number): Move {
  const frame = frames[index]
  const heap = frame?.heap
  const [x, y] = frame?.highlights.swapping ?? []
  if (!heap || x === undefined || y === undefined) return { kind: 'none' }
  if (heap.event === 'climb') return { kind: 'climb', parent: x, child: y }
  if (heap.event === 'extract') return { kind: 'extract', end: y }
  return { kind: 'none' }
}

export interface Moments {
  readonly start: number
  readonly family: number | null
  readonly climb: number | null
  readonly stop: number | null
  readonly leave: number | null
  readonly handover: number | null
  readonly shrinking: number | null
  readonly finale: number
}

/** The frames that show each moment, in a run of heap sort. */
export function momentsOf(frames: readonly Frame[]): Moments {
  const find = (test: (f: Frame, k: number) => boolean): number | null => {
    const k = frames.findIndex(test)
    return k < 0 ? null : k
  }
  const event = (f: Frame) => f.heap?.event
  // A family of three (two children), compared.
  const family = find((f) => event(f) === 'ask' && (f.heap?.children.length ?? 0) === 2)
  const extracts = frames.flatMap((f, k) => (event(f) === 'extract' ? [k] : []))
  const n = frames[0]?.array.length ?? 0
  // The top leaving, once a few have finished (so it joins a finished herd).
  const leave = extracts[Math.min(2, extracts.length - 1)] ?? null
  // The pyramid about half its size, a family compared inside it.
  const shrinking = find(
    (f) =>
      f.heap?.phase === 'extract' &&
      event(f) === 'ask' &&
      heapEnd(f) <= Math.ceil(n / 2) &&
      heapEnd(f) >= 3,
  )
  return {
    start: 0,
    family,
    climb: find((f) => event(f) === 'climb'),
    stop: find((f) => event(f) === 'stop'),
    leave,
    handover: find((f) => f.heap?.phase === 'extract' && event(f) === 'start'),
    shrinking,
    finale: frames.length - 1,
  }
}

/** A short run for the clip: the last of the build, the handover and three tops leaving (a short
 * list: the whole run). */
export function clipRange(frames: readonly Frame[]): readonly [number, number] {
  // A short list plays whole, finale included.
  if ((frames[0]?.array.length ?? 0) <= 6) return [0, frames.length - 1]
  const handover = frames.findIndex((f) => f.heap?.phase === 'extract' && f.heap.event === 'start')
  if (handover < 0) return [0, frames.length - 1]
  const extracts = frames.flatMap((f, k) => (f.heap?.event === 'extract' ? [k] : []))
  const third = extracts[3] ?? frames.length - 1
  return [Math.max(0, handover - 4), third - 1]
}

/** Where the finished part starts (positions from here on are in their place). */
export const finishedFrom = (frame: Frame) => heapEnd(frame)
