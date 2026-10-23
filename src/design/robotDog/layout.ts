/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): where everything goes for one frame of quick
 * sort, in the stage field's own pixels. Pure, from the real frames (partition, highlights, the
 * swaps between frames), so a test proves every frame fits and that a bigger number always
 * stands taller.
 *
 * J. Pizza (Juan's pick): every value is a stack of flat pizza boxes on a dolly at the curb; the
 * boxes above the dolly are as tall as the number. The dolly is just tall enough for the digit.
 * The cart rolls in the street lane under the stacks (so it never hides one), takes a stack on
 * its deck and rolls it to its new place. The lane is tinted by zone.
 */
import { pixelScale } from '../../characters/pixel'
import type { Frame } from '../../engine/types'
import { CART_A } from './sprites'

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
  readonly cx: number
  /** The value, as a height: the boxes above the dolly. */
  readonly h: number
  /** The top box's top. */
  readonly top: number
  /** How many boxes the stack has (each h / boxes tall). */
  readonly boxes: number
  readonly zone: Zone | null
  readonly leader: boolean
  readonly sorted: boolean
  readonly compared: boolean
}

export type Action = 'idle' | 'look' | 'carry' | 'stay' | 'nudge' | 'place' | 'done' | 'party'

export interface ActorPose {
  readonly x: number
  readonly y: number
  readonly action: Action
}

export interface Scene {
  /** Screen pixels per sprite pixel, for the cart. */
  readonly s: number
  readonly colW: number
  /** The field's bottom and the curb (the top of the street lane). */
  readonly ground: number
  readonly laneTop: number
  /** The stack's width, the dolly's height. */
  readonly itemW: number
  readonly dollyH: number
  /** About how tall one box is, and how many counts it holds (under 1: boxes per count). */
  readonly boxPx: number
  readonly unit: number
  /** How far the top box's open lid rises above the stack. */
  readonly lidRise: number
  readonly pieces: readonly Piece[]
  readonly actor: ActorPose
  readonly actorW: number
  readonly actorH: number
  /** Zones along the lane, by column range [from, to). */
  readonly zones: readonly { readonly zone: Zone; readonly from: number; readonly to: number }[]
  /** The range being worked on, [lo, hi), for the dimming. */
  readonly range: readonly [number, number] | null
  readonly event: string
  /** The two identities that traded places since the frame before, the carried one first. */
  readonly swapped: readonly [number, number] | null
  /** A value that went left by swapping with itself: it is lifted and set down in place. */
  readonly nudged: number | null
  /** A value left on the right (bigger): it wobbles where it is. */
  readonly stayed: number | null
  readonly finale: boolean
  readonly font: number
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

/**
 * The box plan: flat boxes, never thinner than `target` px (room for a lid, its seam and the
 * printed slice). With room, every count is one or more whole boxes; without, a box holds 1, 2,
 * 5, 10, 20, 50, ... counts, whichever first reaches the target. Returns the counts per box
 * (under 1 when a count is several boxes) and a box's height. A stack shows as many whole boxes
 * as fit its height, so its height is always the value exactly.
 */
export function boxPlan(pxPerCount: number, target: number): { unit: number; boxPx: number } {
  if (pxPerCount >= target) {
    const perCount = Math.floor(pxPerCount / target)
    return { unit: 1 / perCount, boxPx: pxPerCount / perCount }
  }
  for (let scale = 1; scale < 1e7; scale *= 10) {
    for (const u of [1, 2, 5]) {
      if (pxPerCount * u * scale >= target)
        return { unit: u * scale, boxPx: pxPerCount * u * scale }
    }
  }
  return { unit: 1e7, boxPx: target }
}

/** Where the cart stands to work on the value at `cx`: its deck centred under it. */
export function actorXUnder(cx: number, actorW: number, fieldW: number): number {
  return Math.min(Math.max(0, cx - actorW / 2), fieldW - actorW)
}

/** The least height of a value above 0: one thin box, so a 1 is never nothing. */
export const LEAST_BOX = 3

export function sceneOf(
  frames: readonly Frame[],
  index: number,
  box: Box,
  ids: readonly (readonly number[])[] = identities(frames),
): Scene {
  const frame = frames[index] ?? frames[0]
  if (!frame) throw new Error('no frames')
  const n = frame.array.length
  const colW = box.width / Math.max(1, n)
  const sw = CART_A[0]?.length ?? 1
  const sh = CART_A.length
  // The flag rises above the deck; the lane is the cart's body, from its deck down.
  const laneRows = sh - 4
  // Whole screen pixels per sprite pixel (rounded down first: pixelScale rounds to the nearest,
  // and the cart must never outgrow its share): about two columns wide, a quarter of the field
  // tall at most.
  const s = pixelScale(Math.floor(Math.min((colW * 2) / sw, (box.height * 0.26) / laneRows)), 3)
  const actorW = sw * s
  const actorH = sh * s
  const ground = box.height
  const laneTop = ground - laneRows * s
  const font = Math.max(9, Math.min(16, Math.floor(Math.min(colW * 0.42, box.height * 0.16))))
  const tallest = Math.max(1, ...frame.array)

  // Wide, flat boxes; a dolly just tall enough for its digit (the digit's line plus its border).
  const itemW = Math.round(Math.min(colW * 0.86, 48))
  const dollyH = font + 2
  const lidRise = Math.ceil(itemW * 0.07)
  const base = laneTop - dollyH
  const span = Math.max(0, base - lidRise - LEAST_BOX)
  const heightOf = (v: number) => (v > 0 ? LEAST_BOX + (span * v) / tallest : 0)
  const target = Math.max(8, Math.min(12, Math.round(itemW * 0.25)))
  const { unit, boxPx } = boxPlan(span / tallest, target)

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
    const zone = zoneOf(col)
    return {
      id: idRow[col] ?? col,
      col,
      value,
      cx: colW * (col + 0.5),
      h,
      top: base - h,
      boxes: h > 0 ? Math.max(1, Math.round(h / boxPx)) : 0,
      zone,
      leader: zone === 'leader' || (p?.event === 'place' && col === p.pivot),
      sorted: sorted.has(col),
      compared: p?.event === 'compare' && col === p.next,
    }
  })

  const zones: { zone: Zone; from: number; to: number }[] = []
  pieces.forEach(({ zone }, col) => {
    if (!zone || zone === 'out') return
    const last = zones.at(-1)
    if (last && last.zone === zone && last.to === col) last.to = col + 1
    else zones.push({ zone, from: col, to: col + 1 })
  })

  // The cart, in its lane, its deck (row 4) at the curb, under the stack it is busy with.
  const y = ground - actorH
  const under = (col: number) => actorXUnder(colW * (col + 0.5), actorW, box.width)
  let actor: ActorPose = { x: under(0), y, action: 'idle' }
  let swapped: [number, number] | null = null
  let nudged: number | null = null
  let stayed: number | null = null
  const prev = frames[index - 1]
  if (prev && ids[index - 1]) {
    const changed = frame.array.flatMap((v, c) => (v === prev.array[c] ? [] : [c]))
    if (changed.length === 2) {
      const [a = 0, b = 0] = changed
      // The carried one goes left on a left move, and the leader is carried on pick and place.
      const carried =
        p?.event === 'pick' ? (p.hi - 1 === b ? b : a) : p?.event === 'place' ? p.pivot : a
      const other = carried === a ? b : a
      swapped = [idRow[carried] ?? carried, idRow[other] ?? other]
    }
  }
  const pose = (col: number, action: Action): ActorPose => ({ x: under(col), y, action })
  if (finale) {
    actor = { x: (box.width - actorW) / 2, y, action: 'party' }
  } else if (p) {
    switch (p.event) {
      case 'range':
        actor = pose(p.pivot, 'look')
        break
      case 'pick':
        actor = pose(p.pivot, swapped ? 'carry' : 'look')
        break
      case 'compare':
        actor = pose(p.next, 'look')
        break
      case 'left':
        if (swapped) actor = pose(p.wall - 1, 'carry')
        else {
          nudged = idRow[p.next - 1] ?? null
          actor = pose(p.next - 1, 'nudge')
        }
        break
      case 'right':
        stayed = idRow[p.next - 1] ?? null
        actor = pose(p.next - 1, 'stay')
        break
      case 'place':
        actor = pose(p.pivot, 'place')
        break
      case 'done':
        actor = pose(p.lo, 'done')
        break
    }
  }

  return {
    s,
    colW,
    ground,
    laneTop,
    itemW,
    dollyH,
    boxPx,
    unit,
    lidRise,
    pieces,
    actor,
    actorW,
    actorH,
    zones,
    range: p ? [p.lo, p.hi] : null,
    event: finale ? 'finale' : (p?.event ?? 'start'),
    swapped,
    nudged,
    stayed,
    finale,
    font,
  }
}

/** The moments the mockups show, as frame indexes of a run (null when a run has none). */
export interface Moments {
  readonly start: number
  readonly pick: number | null
  readonly compare: number | null
  readonly moveLeft: number | null
  readonly leaveRight: number | null
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
    compare: find((f) => f.partition?.event === 'compare'),
    moveLeft: find((f, k) => f.partition?.event === 'left' && swappedAt(k)),
    leaveRight: find((f) => f.partition?.event === 'right'),
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
