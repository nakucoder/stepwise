/**
 * Snow-brick towers (design/mockups/penguins/README.md): where everything goes, in the stage
 * field's own pixels. Pure: no React, no DOM.
 *
 * The towers fill the field like bars do; the sprites are pixel art at `s` screen pixels per
 * sprite pixel, a whole number from 1 to 3 (`pixelScale`), so they stay sharp and never
 * disappear. Distances in "units" below are sprite pixels, so they are multiplied by `s`.
 *
 * The slots follow the bars' columns (the field's grid and its gap), so Engineer's pick buttons
 * lie exactly over the towers. With no gap that is the spec's `pitch = w / n`.
 */
import { pixelScale } from '../pixel'
import { PENGUIN_H, PENGUIN_W, SLIDE_H, SLIDE_W } from './sprites'

/** The spec's scene height and slot pitch, in units: the sprite scale compares against them. */
export const SCENE_H = 144
export const SLOT = 32
/** From the field's bottom up: a 1-unit margin, the 7-unit lane, then the 3-unit ground. */
export const MARGIN = 1
export const LANE = 7
export const GROUND = 3
/** The sled: a 2-unit board on a 1-unit runner. A waiting tower stands on it. */
export const SLED = 3
/** Room above the tallest tower: its penguin (14) and a 2-unit hop. */
export const TOP_ROOM = PENGUIN_H + 2
/** The height that tower heights are measured against, in the crates' rule. */
export const HEIGHT_UNITS = 132
/** A brick course: a mortar line every 6 units; each course's joint is 5 units tall. */
export const COURSE = 6
/** How high a penguin hops (already in place, the finale), in units. */
export const HOP = 4

/** Screen pixels per sprite pixel: the field's height against 144, a slot against 32. */
export function penguinScale(fieldHeight: number, pitch: number): number {
  return pixelScale(Math.min(fieldHeight / SCENE_H, pitch / SLOT), 3)
}

/**
 * A tower's height as a share of the room for towers: the crates' rule, 10 + 9 × value of
 * 132 for values 1–9, generally 10 + 81 × value / max(largest, 9). The tallest is 69%.
 */
export function towerShare(value: number, largest: number): number {
  return (10 + (81 * Math.abs(value)) / Math.max(9, largest)) / HEIGHT_UNITS
}

/** A tower's number: 9 units, never under 10 px, so it stays readable. */
export const numberFont = (s: number) => Math.max(9 * s, 10)

/** No tower is shorter than its number needs. */
export const minTowerHeight = (s: number) => Math.ceil(numberFont(s) * 1.2 + 3 * s)

/** The field's measured box: its size and the gap between the value columns. */
export interface Box {
  readonly width: number
  readonly height: number
  readonly gap: number
}

/** Where things are, in px from the field's top-left. */
export interface PenguinLayout {
  readonly s: number
  readonly width: number
  readonly height: number
  readonly pitch: number
  readonly towerW: number
  readonly font: number
  /** Where the line's towers stand: the ground band's top. */
  readonly floorY: number
  /** The lane's base, 1 unit above the field's bottom. */
  readonly laneBase: number
  /** Where a waiting tower stands: on its sled in the lane. */
  readonly sledTop: number
  /** Slot k's center, and the left edge of a tower standing in it. */
  readonly center: (k: number) => number
  readonly towerX: (k: number) => number
  readonly heightOf: (value: number) => number
  /** The penguin's offset from its tower's top-left: standing (and flippers up), or lying. */
  readonly standAt: readonly [number, number]
  readonly lieAt: readonly [number, number]
}

export function penguinLayout(box: Box, values: readonly number[]): PenguinLayout {
  const n = Math.max(1, values.length)
  const { width, height, gap } = box
  const colW = (width - gap * (n - 1)) / n
  const pitch = colW + gap
  const s = penguinScale(height, pitch)
  const towerW = Math.round(Math.min(pitch - 2 * s, pitch * 0.72, colW))
  const floorY = height - (MARGIN + LANE + GROUND) * s
  const laneBase = height - MARGIN * s
  const font = numberFont(s)
  const minHeight = minTowerHeight(s)
  const available = floorY - TOP_ROOM * s
  const largest = Math.max(1, ...values.map((v) => Math.abs(v)))
  const center = (k: number) => Math.round(k * pitch + colW / 2)
  const half = Math.round(towerW / 2)
  return {
    s,
    width,
    height,
    pitch,
    towerW,
    font,
    floorY,
    laneBase,
    sledTop: laneBase - SLED * s,
    center,
    towerX: (k) => center(k) - half,
    heightOf: (value) => Math.max(minHeight, Math.round(available * towerShare(value, largest))),
    standAt: [half - (PENGUIN_W / 2) * s, -PENGUIN_H * s],
    lieAt: [half - (SLIDE_W / 2) * s, -SLIDE_H * s],
  }
}

/** A brick tower's mortar: one line per course from the top, and each course's joint. */
export function mortar(
  width: number,
  height: number,
  s: number,
): { readonly lines: readonly number[]; readonly joints: readonly (readonly [number, number])[] } {
  const lines: number[] = []
  const joints: [number, number][] = []
  for (let y = COURSE * s, k = 0; y < height - s; y += COURSE * s, k++) {
    lines.push(y)
    // Staggered like brickwork: the joint at the middle, then at the quarter, in turn.
    joints.push([Math.round(k % 2 === 0 ? width / 2 : width / 4), y - (COURSE - 1) * s])
  }
  return { lines, joints }
}
