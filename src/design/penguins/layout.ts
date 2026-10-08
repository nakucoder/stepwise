/**
 * TEMPORARY (design/penguins, never merged): where everything goes in a penguin scene, in the
 * stage box's own pixels (the real renderer's way: values fill the box, sprites at whole pixels).
 */
import { crateShare } from '../../characters/robot/geometry'
import { PENGUIN_H } from './sprites'
import type { SceneState } from './steps'

export type Design = 'pillars' | 'bricks' | 'shelf'

/** Sprite units. */
export const GROUND = 3
export const LANE = 7
export const SLED = 3
export const LIFT = 10
export const SLAB = 2
/** Durations at 1× (ms): frequent moves fit the 800 ms step; the slide is the special move. */
export const MOVE_MS = { start: 600, compare: 300, shift: 600, inplace: 450, shelf: 350 } as const
export const SLIDE_MS = 1600
export const DANCE_STAGGER_MS = 110

export interface Layout {
  readonly w: number
  readonly h: number
  readonly s: number
  readonly pitch: number
  readonly pillarW: number
  readonly floorY: number
  readonly laneBase: number
  readonly font: number
  readonly center: (k: number) => number
  readonly height: (v: number) => number
}

export function layout(w: number, h: number, n: number, design: Design, largest: number): Layout {
  const pitch = w / n
  const s = Math.max(1, Math.min(3, Math.round(Math.min(h / 144, pitch / 32))))
  const lane = design === 'shelf' ? 0 : LANE
  const floorY = h - (GROUND + lane) * s
  // Room above the tallest pillar for its penguin (and, for C, the ledge it rises onto).
  const top = (PENGUIN_H + 2 + (design === 'shelf' ? LIFT + SLAB : 0)) * s
  const font = Math.max(9 * s, 10)
  const minH = Math.ceil(font * 1.2 + 3 * s)
  const available = floorY - top
  return {
    w,
    h,
    s,
    pitch,
    pillarW: Math.round(Math.min(pitch - 2 * s, pitch * 0.72)),
    floorY,
    laneBase: h - s,
    font,
    center: (k) => Math.round(pitch * (k + 0.5)),
    // The crates' heights (10 + 9 × value of 132 for 1–9), never too short for the number.
    height: (v) => Math.max(minH, Math.round(available * crateShare(v, largest))),
  }
}

/** Where a value's pillar stands (its bottom-left corner) in a state. */
export interface Spot {
  readonly x: number
  readonly bottom: number
  readonly out: boolean
}

export function spotOf(state: SceneState, value: number, geo: Layout, design: Design): Spot {
  const left = (k: number) => geo.center(k) - Math.round(geo.pillarW / 2)
  const key = state.key
  if (!key?.out || state.array[key.slot] !== value) {
    return { x: left(state.array.indexOf(value)), bottom: geo.floorY, out: false }
  }
  const x = left(key.waitAt)
  if (design === 'pillars') return { x, bottom: geo.laneBase, out: true }
  if (design === 'bricks') return { x, bottom: geo.laneBase - SLED * geo.s, out: true }
  return { x, bottom: geo.floorY - LIFT * geo.s, out: true }
}
