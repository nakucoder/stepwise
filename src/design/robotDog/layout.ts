/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): where everything goes for one frame of quick
 * sort, per design, in the stage field's own pixels. Pure, from the real frames (partition,
 * highlights, the swaps between frames), so a test proves every frame fits and that a bigger
 * number always stands taller.
 *
 * Both designs keep a lane along the bottom for the character, so it never hides a value, and
 * tint that lane by zone (smaller, bigger, not checked yet). Above it:
 * I. Balloons: every balloon is the same size; its string is as long as its number, so a bigger
 *    number floats higher. The shortest string still clears the dog's head. The dog takes the
 *    string in its mouth and trots the balloon to its new place.
 * J. Pizza: every value is a stack of pizza boxes on a dolly at the curb; the boxes above the
 *    dolly are as tall as the number. The cart rolls in the street lane, takes a stack on its
 *    deck and rolls it to its new place.
 */
import { pixelScale } from '../../characters/pixel'
import type { Frame } from '../../engine/types'
import { CART_A, DOG_MOUTH, DOG_STAND } from './sprites'

export type Design = 'balloons' | 'pizza'

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
  /**
   * The value, as a height: I. the string's length (from the ground to the balloon); J. the
   * boxes' height above the dolly.
   */
  readonly h: number
  /** I. the balloon's top; J. the top box's top. */
  readonly top: number
  readonly zone: Zone | null
  readonly leader: boolean
  readonly sorted: boolean
  readonly compared: boolean
}

export type Action = 'idle' | 'look' | 'carry' | 'stay' | 'nudge' | 'place' | 'done' | 'party'

export interface ActorPose {
  readonly x: number
  readonly y: number
  readonly facing: 'left' | 'right'
  readonly action: Action
}

export interface Scene {
  readonly design: Design
  /** Screen pixels per sprite pixel, for the dog or the cart. */
  readonly s: number
  readonly colW: number
  /** The field's bottom (the ground under the lane) and the top of the lane. */
  readonly ground: number
  readonly laneTop: number
  /** I. the balloon's size; J. the stack's width, the dolly's height and one box's height. */
  readonly itemW: number
  readonly itemH: number
  readonly dollyH: number
  readonly boxPx: number
  /** How many counts one box holds (J). */
  readonly unit: number
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
  /** A value that went left by swapping with itself: it nudges in place. */
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

/** The smallest of 1, 2, 5, 10, 20, 25, 50, 100, ... counts that makes a box `least` px tall. */
export function boxUnit(pxPerCount: number, least = 4): number {
  for (let scale = 1; ; scale *= 10) {
    for (const u of [1, 2, 5]) if (pxPerCount * u * scale >= least) return u * scale
    if (scale > 1e6) return 1e7
  }
}

/**
 * Where the character stands to work on the value at `cx`: I. the dog's mouth under it (so it
 * holds the string there); J. the cart's deck centred under it. Kept inside the field.
 */
export function actorXUnder(
  design: Design,
  cx: number,
  facing: 'left' | 'right',
  s: number,
  actorW: number,
  fieldW: number,
): number {
  const mouth = (DOG_MOUTH.x + 0.5) * s
  const x =
    design === 'balloons'
      ? facing === 'right'
        ? cx - mouth
        : cx - (actorW - mouth)
      : cx - actorW / 2
  return Math.min(Math.max(0, x), fieldW - actorW)
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
  const sprite = design === 'balloons' ? DOG_STAND : CART_A
  const sw = sprite[0]?.length ?? 1
  const sh = sprite.length
  // The cart's flag and the dog's ears may rise above the lane; the lane is the body.
  const laneRows = design === 'balloons' ? sh : sh - 4
  // Whole screen pixels per sprite pixel (rounded down first: pixelScale rounds to the nearest,
  // and the character must never outgrow its share): about two columns wide, a quarter of the
  // field tall at most.
  const s = pixelScale(Math.floor(Math.min((colW * 2) / sw, (box.height * 0.26) / laneRows)), 3)
  const actorW = sw * s
  const actorH = sh * s
  const ground = box.height
  const laneTop = ground - laneRows * s - (design === 'balloons' ? 1 : 0)
  const font = Math.max(9, Math.min(16, Math.floor(Math.min(colW * 0.42, box.height * 0.16))))
  const tallest = Math.max(1, ...frame.array)

  // I: the balloon is the same for every value, wide enough for two digits; its string's least
  // length clears the dog's head. J: a dolly (with the digit) at the curb, then the boxes.
  const itemW =
    design === 'balloons'
      ? Math.min(colW * 0.86, Math.round(font * 1.4) + 3)
      : Math.min(colW * 0.8, Math.max(font * 2, 14) + 10)
  const itemH = design === 'balloons' ? Math.round(itemW * 1.08) : 0
  const dollyH = design === 'pizza' ? font + 4 : 0
  const knot = 2
  const headroom = design === 'balloons' ? itemH + knot + 1 : 3
  const least = design === 'balloons' ? ground - laneTop + 2 : 0
  const base = design === 'balloons' ? ground : laneTop - dollyH
  // A least box is still visible on J's stacks: a 1 is one thin box, not nothing.
  const minBox = design === 'pizza' ? 2 : 0
  const span = Math.max(0, base - headroom - least - minBox)
  const heightOf = (v: number) => least + minBox + (span * Math.max(0, v)) / tallest
  const unit = boxUnit(span / tallest)
  const boxPx = (span * unit) / tallest

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
      top: design === 'balloons' ? ground - h - knot - itemH : base - h,
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

  // The character, in its lane, under the value it is busy with: I. the dog's mouth (where it
  // holds the string) under the balloon; J. the cart's deck centred under the stack.
  const y = ground - actorH
  const under = (col: number, facing: 'left' | 'right') =>
    actorXUnder(design, colW * (col + 0.5), facing, s, actorW, box.width)
  let actor: ActorPose = { x: under(0, 'right'), y, facing: 'right', action: 'idle' }
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
  const pose = (col: number, facing: 'left' | 'right', action: Action): ActorPose => ({
    x: under(col, facing),
    y,
    facing,
    action,
  })
  if (finale) {
    actor = { x: (box.width - actorW) / 2, y, facing: 'right', action: 'party' }
  } else if (p) {
    switch (p.event) {
      case 'range':
        actor = pose(p.pivot, 'right', 'look')
        break
      case 'pick':
        actor = pose(p.pivot, 'right', swapped ? 'carry' : 'look')
        break
      case 'compare':
        actor = pose(p.next, 'left', 'look')
        break
      case 'left':
        if (swapped) actor = pose(p.wall - 1, 'left', 'carry')
        else {
          nudged = idRow[p.next - 1] ?? null
          actor = pose(p.next - 1, 'left', 'nudge')
        }
        break
      case 'right':
        stayed = idRow[p.next - 1] ?? null
        actor = pose(p.next - 1, 'right', 'stay')
        break
      case 'place':
        actor = pose(p.pivot, 'left', 'place')
        break
      case 'done':
        actor = pose(p.lo, 'right', 'done')
        break
    }
  }

  return {
    design,
    s,
    colW,
    ground,
    laneTop,
    itemW,
    itemH,
    dollyH,
    boxPx,
    unit,
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
