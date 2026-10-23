/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): where everything goes for one frame of quick
 * sort, per design, in the stage field's own pixels. Pure, from the real frames (partition,
 * highlights, the swaps between frames), so a test proves every frame fits and that a bigger
 * number always stands taller.
 *
 * Every value stands as tall as its number (a column), with its rider on top and its digit on a
 * plate, so the value shows without reading the digit. What the dog herds, and how:
 * A. Sheep and wool: each value is a sheep on a tower of wool bales; the dog trots along the
 *    field and drives a sheep left, the two trotting past each other. Pens are fences.
 * B. Fetch: each value is a bone standing upright, as long as its number; the dog carries the
 *    bone in its mouth, over the row, and plants it. Zones are the ground: dug earth, grass.
 * C. Hover-bots: each value is a little bot floating on a light beam as tall as its number; the
 *    dog pings it and the bots hop over each other. Zones are floor lights.
 */
import { pixelScale } from '../../characters/pixel'
import type { Frame } from '../../engine/types'
import { BALL, BOT, DOG, SHEEP } from './sprites'

export type Design = 'sheep' | 'bones' | 'bots'

export interface Box {
  readonly width: number
  readonly height: number
}

export type Zone = 'left' | 'bigger' | 'unchecked' | 'leader' | 'placed' | 'out'

export interface Piece {
  /** Identity: the value's column in the first frame, followed through every swap. */
  readonly id: number
  readonly col: number
  readonly value: number
  /** The column's centre, its top and height (the value), and the rider's box. */
  readonly cx: number
  readonly top: number
  readonly h: number
  readonly zone: Zone | null
  readonly sorted: boolean
  readonly sniffed: boolean
}

export type DogAction =
  'idle' | 'drop' | 'sniff' | 'herd' | 'stay' | 'nudge' | 'place' | 'done' | 'dance'

export interface DogPose {
  readonly x: number
  readonly y: number
  readonly facing: 'left' | 'right'
  readonly action: DogAction
}

export interface Scene {
  readonly design: Design
  /** Screen pixels per sprite pixel: riders and ball; the dog. */
  readonly s: number
  readonly dogS: number
  readonly colW: number
  /** The ground line (bottom of every column) and the zone strip under it. */
  readonly ground: number
  readonly strip: number
  readonly pieces: readonly Piece[]
  readonly dog: DogPose
  /** The leader's ball: on its rider, or rolling to its new place. */
  readonly ball: { readonly x: number; readonly y: number } | null
  /** Zones along the ground, by column range [from, to). */
  readonly zones: readonly { readonly zone: Zone; readonly from: number; readonly to: number }[]
  /** The range being worked on, [lo, hi), for the dimming. */
  readonly range: readonly [number, number] | null
  readonly event: string
  /** The two identities that traded places since the frame before, the herded one first. */
  readonly swapped: readonly [number, number] | null
  /** A value that went left by swapping with itself: it nudges in place. */
  readonly nudged: number | null
  readonly finale: boolean
  /** The digit's size on its plate. */
  readonly font: number
  /** How tall ten counts stand (A's bale seams, C's beam rings), when that is big enough. */
  readonly tenPx: number
}

/** Each column's identity in every frame: the first frame's columns, followed through swaps. */
export function identities(frames: readonly Frame[]): readonly (readonly number[])[] {
  const out: number[][] = []
  let ids = (frames[0]?.array ?? []).map((_, k) => k)
  frames.forEach((frame, k) => {
    const before = frames[k - 1]
    if (before) {
      const changed = frame.array.flatMap((v, c) => (v === before.array[c] ? [] : [c]))
      if (changed.length === 2) {
        const [a = 0, b = 0] = changed
        ids = [...ids]
        ;[ids[a], ids[b]] = [ids[b] ?? 0, ids[a] ?? 0]
      }
    }
    out.push(ids)
  })
  return out
}

export function sceneOf(
  design: Design,
  frames: readonly Frame[],
  index: number,
  box: Box,
  ids: readonly (readonly number[])[] = identities(frames),
): Scene {
  const frame = frames[index] ?? frames[0]
  if (!frame) throw new Error('no frames')
  const n = frame.array.length
  const colW = box.width / Math.max(1, n)
  // One scale for every design (the sheep's 12 × 8 as the measure): whole screen pixels per
  // sprite pixel, never wider than most of the column, never taller than a fifth of the field.
  // (Rounded down first: pixelScale rounds to the nearest, and a sprite must never outgrow
  // its share.)
  const s = pixelScale(
    Math.floor(Math.min((colW * 0.8) / SHEEP[0].length, (box.height * 0.2) / SHEEP.length)),
    3,
  )
  // What sits on top of a column: a sheep, a bot hovering a pixel up, or a bone's knobs.
  const valueW = Math.max(6, Math.min(colW * 0.72, 22 * s))
  const riderH =
    design === 'sheep'
      ? SHEEP.length * s
      : design === 'bots'
        ? (BOT.length + 1) * s
        : Math.round(valueW * 0.16) + 2
  const dogS = pixelScale(
    Math.floor(Math.min((colW * 1.3) / DOG[0].length, (box.height * 0.3) / DOG.length)),
    3,
  )
  const strip = Math.max(3, 2 * s)
  const ground = box.height - strip
  const ballH = BALL.length * s
  const top = riderH + ballH + 1
  const tallest = Math.max(1, ...frame.array)
  // The least column still holds its digit's plate, like a bar; the rest is the value, in
  // proportion.
  const font = Math.max(9, Math.min(16, Math.floor(colW * 0.42)))
  const least = font + 4
  const span = Math.max(0, ground - top - least)
  const heightOf = (v: number) => least + (span * Math.max(0, v)) / tallest

  const p = frame.partition
  const sorted = new Set(frame.highlights.sorted ?? [])
  const finale = n > 0 && sorted.size === n
  const zoneOf = (c: number): Zone | null => {
    if (!p) return null
    if (c < p.lo || c >= p.hi) return 'out'
    if (p.event === 'done') return 'placed'
    if (p.event === 'place') return c === p.pivot ? 'placed' : c < p.pivot ? 'left' : 'bigger'
    if (c === p.pivot) return 'leader'
    if (p.event === 'range' || p.event === 'pick') return 'unchecked'
    if (c < p.wall) return 'left'
    if (c < p.next) return 'bigger'
    return 'unchecked'
  }
  const idRow = ids[index] ?? frame.array.map((_, k) => k)
  const pieces: Piece[] = frame.array.map((value, col) => {
    const h = heightOf(value)
    return {
      id: idRow[col] ?? col,
      col,
      value,
      cx: colW * (col + 0.5),
      top: ground - h,
      h,
      zone: zoneOf(col),
      sorted: sorted.has(col),
      sniffed: p?.event === 'compare' && col === p.next,
    }
  })

  // Zones along the ground, as runs of columns.
  const zones: { zone: Zone; from: number; to: number }[] = []
  pieces.forEach(({ zone }, col) => {
    if (!zone || zone === 'out') return
    const last = zones.at(-1)
    if (last && last.zone === zone && last.to === col) last.to = col + 1
    else zones.push({ zone, from: col, to: col + 1 })
  })

  // The dog: on the ground, beside the value it is busy with.
  const dogW = DOG[0].length * dogS
  const dogH = DOG.length * dogS
  const dogY = ground - dogH + Math.round(dogS)
  const beside = (col: number, side: 'left' | 'right') => {
    const x = side === 'right' ? colW * (col + 1) - dogW * 0.25 : colW * col - dogW * 0.75
    return Math.min(Math.max(0, x), box.width - dogW)
  }
  let dog: DogPose = { x: 0, y: dogY, facing: 'right', action: 'idle' }
  let swapped: [number, number] | null = null
  let nudged: number | null = null
  const prev = frames[index - 1]
  const prevIds = ids[index - 1]
  if (prev && prevIds) {
    const changed = frame.array.flatMap((v, c) => (v === prev.array[c] ? [] : [c]))
    if (changed.length === 2) {
      const [a = 0, b = 0] = changed
      // The herded one moves left: it is the one now in the left column.
      swapped = [idRow[a] ?? a, idRow[b] ?? b]
    }
  }
  if (finale) {
    dog = { x: (box.width - dogW) / 2, y: dogY, facing: 'right', action: 'dance' }
  } else if (p) {
    switch (p.event) {
      case 'range':
        dog = { x: beside(p.pivot, 'left'), y: dogY, facing: 'right', action: 'drop' }
        break
      case 'pick':
        dog = { x: beside(p.pivot, 'left'), y: dogY, facing: 'right', action: 'herd' }
        break
      case 'compare':
        dog = { x: beside(p.next, 'right'), y: dogY, facing: 'left', action: 'sniff' }
        break
      case 'left':
        if (swapped) {
          dog = { x: beside(p.wall - 1, 'right'), y: dogY, facing: 'left', action: 'herd' }
        } else {
          nudged = idRow[p.next - 1] ?? null
          dog = { x: beside(p.next - 1, 'right'), y: dogY, facing: 'left', action: 'nudge' }
        }
        break
      case 'right':
        dog = { x: beside(p.next - 1, 'left'), y: dogY, facing: 'right', action: 'stay' }
        break
      case 'place':
        dog = { x: beside(p.pivot, 'left'), y: dogY, facing: 'right', action: 'place' }
        break
      case 'done':
        dog = { x: beside(p.lo, 'left'), y: dogY, facing: 'right', action: 'done' }
        break
    }
  }

  // The ball rides on the leader's rider (it drops there at "range").
  const leaderCol = p && p.event !== 'done' ? p.pivot : null
  const leader = leaderCol === null ? undefined : pieces[leaderCol]
  const ball = leader
    ? {
        x: leader.cx - (BALL[0].length * s) / 2,
        y: leader.top - riderH - ballH + Math.round(s),
      }
    : null

  return {
    design,
    s,
    dogS,
    colW,
    ground,
    strip,
    pieces,
    dog,
    ball,
    zones,
    range: p ? [p.lo, p.hi] : null,
    event: finale ? 'finale' : (p?.event ?? 'start'),
    swapped,
    nudged,
    finale,
    font,
    tenPx: (span * 10) / tallest,
  }
}

/** The moments the mockups show, as frame indexes of a run (null when a run has none). */
export interface Moments {
  readonly start: number
  readonly pick: number | null
  readonly sniff: number | null
  readonly herdLeft: number | null
  readonly stayRight: number | null
  readonly nudge: number | null
  readonly place: number | null
  readonly rangeDone: number | null
  readonly finale: number
}

export function momentsOf(frames: readonly Frame[]): Moments {
  const find = (test: (f: Frame, k: number) => boolean) => {
    const k = frames.findIndex(test)
    return k < 0 ? null : k
  }
  const swappedAt = (k: number) => {
    const before = frames[k - 1]
    const f = frames[k]
    return !!before && !!f && f.array.some((v, c) => v !== before.array[c])
  }
  return {
    start: 0,
    pick: find((f) => f.partition?.event === 'range'),
    sniff: find((f) => f.partition?.event === 'compare'),
    herdLeft: find((f, k) => f.partition?.event === 'left' && swappedAt(k)),
    stayRight: find((f) => f.partition?.event === 'right'),
    nudge: find((f, k) => f.partition?.event === 'left' && !swappedAt(k)),
    place: find((f, k) => f.partition?.event === 'place' && swappedAt(k)),
    rangeDone: find((f) => f.partition?.event === 'done'),
    finale: frames.length - 1,
  }
}

/** One full round: from the first range to the frame after its leader is placed. */
export function firstRound(frames: readonly Frame[]): readonly [number, number] {
  const from = Math.max(
    0,
    frames.findIndex((f) => f.partition?.event === 'range'),
  )
  const place = frames.findIndex((f, k) => k > from && f.partition?.event === 'place')
  return [from, place < 0 ? frames.length - 1 : Math.min(frames.length - 1, place + 1)]
}
