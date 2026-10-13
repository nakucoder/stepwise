/**
 * TEMPORARY (design/slimes, never merged): where everything goes in a slime scene, in the stage
 * field's own pixels, the real renderer's way: the values fill the field like bars on two rows
 * (main on top, the buffer below) of one column grid, and the sprites are pixel art at a whole
 * number of screen pixels per pixel (pixelScale), centered on their column.
 *
 * Everything drawn is listed by `shapesOf` as plain boxes, so a test can prove nothing ever
 * leaves the field, at rest or mid-move.
 */
import { pixelScale, spritePath } from '../../characters/pixel'
import { rimPath } from '../../characters/penguins/sprites'
import type { Group, SlimeState } from './steps'

export type Design = 'jelly' | 'tubes' | 'mountain'

/** A slime, 10 × 8: o outline, g body, l shine, w eye white, e pupil, m mouth. */
export const SLIME = [
  '...oooo...',
  '.oolgggoo.',
  'olgggggggo',
  'ogwegggweo',
  'oggggggggo',
  'ogggmmgggo',
  'oggggggggo',
  '.oooooooo.',
] as const
export const SLIME_W = 10
export const SLIME_H = 8

export const SLIME_PATHS = {
  rim: rimPath(SLIME),
  outline: spritePath(SLIME, 'o'),
  body: spritePath(SLIME, 'g'),
  shine: spritePath(SLIME, 'l'),
  white: spritePath(SLIME, 'w'),
  dark: spritePath(SLIME, 'e', 'm'),
} as const

/** Units (sprite pixels). */
export const FLOOR = 2
export const ROW_GAP = 4
/** How high a slime hops on a move, or bounces in the finale. */
export const HOP = 3
/** Room above the tallest value: its slime, a hop, and a pixel. */
export const TOP_ROOM = SLIME_H + HOP + 1

export interface Box {
  readonly width: number
  readonly height: number
}

export interface Row {
  /** The row's area: values stand on `floor` (the top of its floor band). */
  readonly top: number
  readonly floor: number
}

export interface SlimeLayout {
  readonly s: number
  readonly pitch: number
  readonly colW: number
  readonly font: number
  /** The buffer drawn as a strip of small number chips, when two full rows don't fit. */
  readonly compact: boolean
  readonly main: Row
  readonly buffer: Row
  readonly chipH: number
  readonly center: (k: number) => number
  readonly colX: (k: number) => number
  readonly heightOf: (value: number, row: Row) => number
}

/** The crates' and towers' height rule: 10 + 9 × value of 132 for 1–9. */
const share = (value: number, largest: number) =>
  (10 + (81 * Math.abs(value)) / Math.max(9, largest)) / 132

export function slimeLayout(box: Box, count: number, largest: number): SlimeLayout {
  const { width, height } = box
  const n = Math.max(1, count)
  const pitch = width / n
  const s = pixelScale(Math.min(height / 160, pitch / 32), 3)
  const font = Math.max(9 * s, 10)
  const minH = Math.ceil(font * 1.2 + 3 * s)
  const colW = Math.round(Math.min(pitch - 2 * s, pitch * 0.72))
  const rowH = (height - ROW_GAP * s) / 2
  // Two full rows need room for a column, its slime and a hop, over a floor, in each half.
  const compact = rowH - FLOOR * s < TOP_ROOM * s + minH
  const chipH = font + 4 * s
  const main: Row = compact
    ? { top: 0, floor: height - chipH - ROW_GAP * s - FLOOR * s }
    : { top: 0, floor: Math.floor(rowH) - FLOOR * s }
  const buffer: Row = compact
    ? { top: height - chipH, floor: height }
    : { top: Math.ceil(rowH + ROW_GAP * s), floor: height - FLOOR * s }
  const center = (k: number) => Math.round(pitch * (k + 0.5))
  return {
    s,
    pitch,
    colW,
    font,
    compact,
    main,
    buffer,
    chipH,
    center,
    colX: (k) => center(k) - Math.round(colW / 2),
    heightOf: (value, row) =>
      Math.max(minH, Math.round((row.floor - row.top - TOP_ROOM * s) * share(value, largest))),
  }
}

/** One thing drawn: a box (and its class), maybe text or a sprite, owned by a value or a group. */
export interface Shape {
  readonly kind: 'rect' | 'text' | 'slime'
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly className: string
  /** The value it belongs to (moves with it), or a group / mark key. */
  readonly part: string
  readonly text?: string
  /** Rounded corners (the membranes, the chips). */
  readonly rx?: number
}

const groupKey = (row: 'main' | 'buffer', [lo, hi]: Group) =>
  `group-${row}-${String(lo)}-${String(hi)}`

/** Everything a design draws for a state, with nothing moving. */
export function shapesOf(design: Design, state: SlimeState, geo: SlimeLayout): Shape[] {
  const { s } = geo
  const shapes: Shape[] = []
  const add = (shape: Shape) => shapes.push(shape)
  const rows: { name: 'main' | 'buffer'; row: Row; values: readonly (number | null)[] }[] = [
    { name: 'main', row: geo.main, values: state.main },
  ]
  if (state.buffer) rows.push({ name: 'buffer', row: geo.buffer, values: state.buffer })

  // Floors: a band under each full row.
  add({
    kind: 'rect',
    x: 0,
    y: geo.main.floor,
    w: geo.colX(state.main.length - 1) + geo.colW + 2 * s,
    h: FLOOR * s,
    className: `floor floor-${design}`,
    part: 'floor-main',
  })
  if (state.buffer && !geo.compact) {
    add({
      kind: 'rect',
      x: 0,
      y: geo.buffer.floor,
      w: geo.colX(state.main.length - 1) + geo.colW + 2 * s,
      h: FLOOR * s,
      className: `floor floor-${design}`,
      part: 'floor-buffer',
    })
  }

  for (const { name, row, values } of rows) {
    const groups = name === 'main' ? state.groups : state.bufferGroups
    const chips = name === 'buffer' && geo.compact

    // The groups: A's membrane, B's rack, C's goo bridge (one connected slime).
    if (!chips) {
      for (const g of groups) {
        const [lo, hi] = g
        const x = geo.colX(lo) - (design === 'jelly' ? 2 * s : s)
        const right = geo.colX(hi - 1) + geo.colW + (design === 'jelly' ? 2 * s : s)
        const tallest = Math.max(
          0,
          ...values.slice(lo, hi).map((v) => (v === null ? 0 : geo.heightOf(v, row))),
        )
        if (design === 'jelly') {
          const top = row.floor - tallest - SLIME_H * s - s
          add({
            kind: 'rect',
            x,
            y: top,
            w: right - x,
            h: row.floor + FLOOR * s - top,
            className: 'membrane',
            part: groupKey(name, g),
            rx: 4 * s,
          })
        } else if (design === 'tubes') {
          add({
            kind: 'rect',
            x,
            y: row.floor,
            w: right - x,
            h: FLOOR * s,
            className: 'rack',
            part: groupKey(name, g),
          })
        } else {
          add({
            kind: 'rect',
            x,
            y: row.floor - 3 * s,
            w: right - x,
            h: 3 * s,
            className: 'goo-bridge',
            part: groupKey(name, g),
          })
        }
      }
    }

    values.forEach((value, k) => {
      const x = geo.colX(k)
      if (chips) {
        const cw = Math.round(Math.min(geo.colW, geo.pitch * 0.7))
        const cx = geo.center(k) - Math.round(cw / 2)
        if (value === null) {
          add({
            kind: 'rect',
            x: cx,
            y: row.top,
            w: cw,
            h: geo.chipH,
            className: 'chip is-empty',
            part: `slot-buffer-${String(k)}`,
            rx: 2 * s,
          })
        } else {
          add({
            kind: 'rect',
            x: cx,
            y: row.top,
            w: cw,
            h: geo.chipH,
            className: `chip chip-${design}`,
            part: `v-${String(value)}`,
            rx: 2 * s,
          })
          add({
            kind: 'text',
            x: geo.center(k),
            y: row.top + geo.chipH - 3 * s,
            w: 0,
            h: 0,
            className: 'slime-number',
            part: `v-${String(value)}`,
            text: String(value),
          })
        }
        return
      }
      if (value === null) {
        // An empty slot: the place's outline (and, for the tubes, the empty tube).
        const h = geo.heightOf(0, row)
        add({
          kind: 'rect',
          x,
          y: row.floor - h,
          w: geo.colW,
          h,
          className: design === 'tubes' ? 'tube is-empty' : 'slot is-empty',
          part: `slot-${name}-${String(k)}`,
        })
        return
      }
      const h = geo.heightOf(value, row)
      const top = row.floor - h
      const part = `v-${String(value)}`
      if (design === 'tubes') {
        // A glass tube as tall as the row allows, goo up to the value; the slime rides the goo.
        const tubeTop = row.top + TOP_ROOM * s
        add({
          kind: 'rect',
          x,
          y: tubeTop,
          w: geo.colW,
          h: row.floor - tubeTop,
          className: 'tube',
          part,
        })
        add({
          kind: 'rect',
          x: x + s,
          y: top,
          w: geo.colW - 2 * s,
          h,
          className: 'goo goo-tubes',
          part,
        })
      } else {
        add({
          kind: 'rect',
          x,
          y: top,
          w: geo.colW,
          h,
          className: `goo goo-${design}`,
          part,
          rx: design === 'mountain' ? 3 * s : 0,
        })
        if (design === 'jelly')
          add({
            kind: 'rect',
            x: x + s,
            y: top + s,
            w: s,
            h: Math.max(0, h - 2 * s),
            className: 'shine',
            part,
          })
      }
      add({
        kind: 'text',
        x: geo.center(k),
        y: top + 2 * s + geo.font,
        w: 0,
        h: 0,
        className: 'slime-number',
        part,
        text: String(value),
      })
      // The rider: every value's slime (A, B); for C one face per group, on its tallest peak.
      const isPeak =
        design !== 'mountain' ||
        groups.some(
          ([lo, hi]) =>
            k >= lo &&
            k < hi &&
            values
              .slice(lo, hi)
              .every(
                (v, j) =>
                  v === null ||
                  geo.heightOf(v, row) < h ||
                  (geo.heightOf(v, row) === h && lo + j >= k),
              ),
        )
      if (isPeak) {
        add({
          kind: 'slime',
          x: geo.center(k) - (SLIME_W / 2) * s,
          y: top - SLIME_H * s,
          w: SLIME_W * s,
          h: SLIME_H * s,
          className: 'rider',
          part,
        })
      }
    })
  }

  // Comparing: the looking color on the floor under the two fronts. Final: green under all.
  if (state.compare && state.buffer) {
    for (const k of state.compare) {
      const row = geo.compact ? { top: geo.buffer.top, floor: geo.buffer.top - s } : geo.buffer
      add({
        kind: 'rect',
        x: geo.colX(k),
        y: geo.compact ? row.top - 2 * s : row.floor,
        w: geo.colW,
        h: FLOOR * s,
        className: 'mark-compare',
        part: 'marks',
      })
    }
  }
  if (state.final) {
    state.main.forEach((_, k) => {
      add({
        kind: 'rect',
        x: geo.colX(k) - s,
        y: geo.main.floor,
        w: geo.colW + 2 * s,
        h: FLOOR * s,
        className: 'mark-final',
        part: 'final',
      })
    })
  }
  return shapes
}

/** How far a shape can travel above its place mid-move: a slime's hop. */
export const reach = (shape: Shape, geo: SlimeLayout) => (shape.kind === 'slime' ? HOP * geo.s : 0)
