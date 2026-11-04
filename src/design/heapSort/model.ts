/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): the pure part of heap sort's character
 * mockups that the full scenes will use: the site's real stage sizes (measured), the columns,
 * each value followed through the run, the moves and the moments to show.
 */
import type { Frame } from '../../engine/types'
import { heapEnd } from '../../components/heapTree'

/** The pyramid band over the field, as the site draws it at that size (measured). */
export interface BandSpec {
  /**
   * One row (phones on their side: row numbers under the arcs), two (tags, then arcs), or arcs
   * only (a proposal for the tightest phone: no row numbers, thinner).
   */
  readonly kind: 'one' | 'two' | 'arcs'
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
  /** A proposal: the dam beside the band and field (at their left), this wide. */
  readonly beside?: number
  /** A proposal: the beaver at this scale whatever the stage's size. */
  readonly beaver?: number
  /** The stage can't hold a stack of 12 (shown as it is, to compare). */
  readonly overflows?: boolean
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

/** Arcs only, no row numbers, at the short stage's arc height (0.625rem). */
const ARCS_ONLY = (rem: number): BandSpec => ({
  kind: 'arcs',
  height: 0.625 * rem,
  tags: 0,
  arcs: 0.625 * rem,
  font: 0.6875 * rem,
  foot: 0.5 * rem,
  radius: 0.25 * rem,
  leftArc: 0.625 * rem * 0.6,
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

/** A stage size from SIZES by id (they are all there). */
const size = (id: string): StageSize => {
  const found = SIZES.find((s) => s.id === id)
  if (!found) throw new Error(`no stage ${id}`)
  return found
}

/**
 * The screens of this round, before and after. Desktop: the dam beside the stacks, so the band
 * and field get the tree's height too (164 + 4 + 85 = 253) and the stacks the width left of a
 * 250 px dam (698 − 250 − 12 = 436). The normal phone on its side (844 × 390 at 100%): Watch and
 * Do it, measured. The tightest phone (740 × 300 at 130%): as it is, then arcs only in the band
 * (13 px, saving 13) with the pizza cart's floor for the stage, so Do it gets Watch's field
 * (63 + 13 = 76); and the same with a 2× beaver.
 */
export const SCREENS: readonly { readonly title: string; readonly sizes: readonly StageSize[] }[] =
  [
    {
      title: 'Desktop, 1440 × 900',
      sizes: [
        { ...size('desktop'), id: 'desktop', label: 'Before: the dam over the band, 698 × 85' },
        {
          ...size('desktop'),
          id: 'desktop-beside',
          label: 'After: the dam beside the stacks, 436 × 253',
          width: 436,
          height: 253,
          tree: undefined,
          beside: 250,
        },
      ],
    },
    {
      title: 'Phone upright, 390 × 844 (kept)',
      sizes: [{ ...size('upright'), label: 'As it is: under the dam, 366 × 156' }],
    },
    {
      title: 'Phone on its side, 844 × 390, 100% text (the normal one)',
      sizes: [
        {
          ...size('side-100'),
          id: 'side-100-watch',
          label: 'Watch, 612 × 159',
          height: 159,
        },
        { ...size('side-100'), label: 'Do it, 612 × 131' },
      ],
    },
    {
      title: 'Phone on its side, 740 × 300, 130% text (the tightest)',
      sizes: [
        { ...size('side-watch'), label: 'Before, Watch: 468 × 63' },
        {
          ...size('tight'),
          label: 'Before, Do it with the hint: 468 × 33 (a stack of 12 doesn’t fit)',
          overflows: true,
        },
        {
          ...size('side-watch'),
          id: 'tight-slim',
          label: 'After A: arcs only in the band and the cart’s floor: Watch and Do it 468 × 76',
          height: 76,
          band: ARCS_ONLY(20.8),
        },
        {
          ...size('side-watch'),
          id: 'tight-slim-2x',
          label: 'After B: the same with a 2× beaver',
          height: 76,
          band: ARCS_ONLY(20.8),
          beaver: 2,
        },
      ],
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
