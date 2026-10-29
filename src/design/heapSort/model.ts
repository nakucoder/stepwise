/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): the pure part of heap sort's character
 * mockups that the full scenes will use: the site's real stage sizes (measured), the columns,
 * each value followed through the run, the moves and the moments to show.
 */
import type { Frame } from '../../engine/types'
import { heapEnd } from '../../components/heapTree'

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
