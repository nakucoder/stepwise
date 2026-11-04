/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): the pieces of B2, the builder beaver (the
 * pick from round three), drawn large: the beaver in three poses, one log (one log = one value)
 * and its stacks, and a log end, the dam's node. Sprites face right and are drawn in code from
 * simple shapes, then outlined, so every pose is the same size and every log on a stage is the
 * same. Nothing takes a role colour.
 */
import { Raster, type Grid } from './raster'
import { SIZES, type StageSize } from './model'

export type { Grid } from './raster'

export type Pose = 'idle' | 'move' | 'carry'

export interface Variant {
  readonly id: string
  readonly name: string
  readonly about: string
}

// ---------- B. The beaver ----------

export const BEAVERS: readonly Variant[] = [
  {
    id: 'B2',
    name: 'B2. Builder beaver',
    about:
      'A darker, chunkier beaver with cream cheeks and an orange hard hat (the dam builder), the same big teeth and paddle tail.',
  },
]

export const BEAVER_W = 40
export const BEAVER_H = 30

/**
 * The beaver, facing right. idle: sitting up on its haunches, paws at its chest, the tail flat on
 * the ground behind. move: on all fours, waddling, the tail out behind. carry: standing on its
 * hind feet, both arms up holding a stack over its head (the stack is drawn over it, on its paws
 * at the top edge). Codes: o outline, f fur, l belly and muzzle, d feet and paws, t tail, x tail's
 * cross-hatch, e eye, s eye shine, n nose, w teeth, h hard hat, H hat's shade.
 */
export function beaverRows(variant: string, pose: Pose): Grid {
  const r = new Raster(BEAVER_W, BEAVER_H)
  const builder = variant === 'B2'
  let head: [number, number]
  if (pose === 'move') {
    // On all fours: the tail out behind, the body long and low, the head forward.
    r.polygon(
      [
        [1, 21],
        [9, 18],
        [12, 22],
        [3, 25],
      ],
      't',
    )
    r.disc(18, 20, 10.5, 6.2, 'f')
    r.disc(19, 23, 7, 2.6, 'l')
    for (const [x, y] of [
      [10, 27],
      [16, 26],
      [24, 27],
      [28, 26],
    ] as const)
      r.disc(x, y, 2, 1.3, 'd')
    head = [30, 16]
  } else {
    // Sitting (or standing) up: the tail flat on the ground behind, a pear-shaped body.
    r.disc(8, 27, 7, 2.1, 't')
    r.disc(19, 20, 8, pose === 'carry' ? 8 : 8.5, 'f')
    r.disc(22, 21, 4.6, 6, 'l')
    r.disc(22, 28, 4.2, 1.5, 'd')
    head = pose === 'carry' ? [22, 9] : [24, 9]
    if (pose === 'carry') {
      // Both arms up to the stack over its head.
      r.path(
        [
          [14, 16],
          [12, 8],
          [13, 1],
        ],
        2.6,
        'f',
      )
      r.path(
        [
          [25, 15],
          [28, 8],
          [27, 1],
        ],
        2.6,
        'f',
      )
      r.disc(13, 1, 1.6, 1.2, 'd')
      r.disc(27, 1, 1.6, 1.2, 'd')
    } else {
      // Paws held at its chest.
      r.path(
        [
          [21, 16],
          [26, 18],
        ],
        2.4,
        'f',
      )
      r.disc(27, 18.5, 1.6, 1.3, 'd')
    }
  }
  // The tail's cross-hatch.
  for (let y = 0; y < BEAVER_H; y++)
    for (let x = 0; x < BEAVER_W; x++)
      if (r.get(x, y) === 't' && (x + y) % 3 === 0) r.set(x, y, 'x')

  // The head: round, a small ear, a muzzle with the nose, the eye, and the teeth under it.
  const [hx, hy] = head
  r.disc(hx - 4, hy - 4.5, 1.8, 1.8, 'f')
  r.disc(hx, hy, 6.4, 5.8, 'f')
  r.disc(hx + 4.6, hy + 2, 3.6, 2.8, 'l')
  if (builder) r.disc(hx - 1, hy + 2, 3, 2.2, 'l')
  r.set(hx + 8, hy + 0.5, 'n')
  r.set(hx + 7, hy + 0.5, 'n')
  r.set(hx + 2, hy - 2, 'e')
  r.set(hx + 2, hy - 1, 'e')
  r.set(hx + 3, hy - 2, 's')
  // The two big front teeth, under the muzzle, a dark line between them.
  for (let y = hy + 5; y <= hy + 7; y++) {
    r.set(hx + 4, y, 'w')
    r.set(hx + 5, y, 'o')
    r.set(hx + 6, y, 'w')
  }
  if (builder) {
    // The hard hat: a dome on the head and a brim forward.
    for (let y = hy - 7; y <= hy - 3; y++)
      for (let x = hx - 5; x <= hx + 5; x++)
        if (((x - hx) / 5.4) ** 2 + ((y - (hy - 3)) / 4.4) ** 2 <= 1) r.set(x, y, 'h')
    for (let x = hx - 6; x <= hx + 8; x++) r.set(x, hy - 3, 'H')
    r.set(hx, hy - 7, 'H')
    r.set(hx, hy - 6, 'H')
  }
  r.outline('o')
  return r.grid()
}

// ---------- The units ----------

export type UnitKind = 'log'

/**
 * One unit, `h` px high and `w` wide; its top line is its outline (the line between it and the
 * unit over it), as the pizza boxes. Logs (o outline, B bark, S bark streak, C cut end, R ring)
 * show a round cut end at the right; stick bundles (o, P pale stick, Q dark stick, K twine) are
 * sticks with rounded ends, tied in the middle. Under 5 px: the plain unit (outline and one
 * colour, the cut end still lighter on a log); at 1 px a stack is a plain column.
 */
export function unitRows(_kind: UnitKind, h: number, w: number): Grid {
  const r = new Raster(w, h)
  if (h < 2) {
    for (let x = 0; x < w; x++) r.set(x, 0, 'B')
    return r.grid()
  }
  const body = h - 1
  {
    // The bark: a rounded left end, then the cut end at the right.
    const capW = Math.max(3, Math.round(body * 0.9))
    for (let y = 1; y < h; y++)
      for (let x = 0; x < w; x++) {
        const fromTop = y - 1
        const round = h >= 5 && x === 0 && (fromTop === 0 || fromTop === body - 1)
        if (!round) r.set(x, y, 'B')
      }
    if (h >= 7) for (let x = 2; x < w - capW - 2; x += 5) r.set(x, 1 + Math.round(body / 3), 'S')
    if (h >= 7)
      for (let x = 4; x < w - capW - 2; x += 6) r.set(x, 1 + Math.round((2 * body) / 3), 'S')
    // The cut end: an ellipse at the right, with a ring and a center where it fits.
    const cx = w - 1 - capW / 2
    const cy = 1 + (body - 1) / 2
    for (let y = 1; y < h; y++)
      for (let x = w - capW - 1; x < w; x++)
        if (((x - cx) / (capW / 2)) ** 2 + ((y - cy) / (body / 2)) ** 2 <= 1.05) r.set(x, y, 'C')
    if (h >= 7) {
      for (let y = 1; y < h; y++)
        for (let x = w - capW - 1; x < w; x++) {
          const d = ((x - cx) / (capW / 2)) ** 2 + ((y - cy) / (body / 2)) ** 2
          if (d > 0.25 && d < 0.5) r.set(x, y, 'R')
        }
      r.set(Math.round(cx), Math.round(cy), 'R')
    }
  }
  for (let x = 0; x < w; x++) r.set(x, 0, 'o')
  // An outline down both sides and round the ends.
  const out = r.grid().map((row, y) => {
    if (y === 0 || h < 2) return row
    const chars = row.split('')
    const first = chars.findIndex((c) => c !== '.')
    const last = chars.length - 1 - [...chars].reverse().findIndex((c) => c !== '.')
    if (first >= 0) {
      chars[first] = 'o'
      chars[last] = 'o'
    }
    return chars.join('')
  })
  return out
}

/** A stack of `count` identical units, closed by one line under the bottom one. */
export function stackRows(kind: UnitKind, count: number, h: number, w: number): Grid {
  const one = unitRows(kind, h, w)
  const rows: string[] = []
  for (let k = 0; k < count; k++) rows.push(...one)
  if (h >= 2) rows.push('o'.repeat(w))
  return rows
}

/** How many units a stack shows: each unit's top line is a full row of outline. */
export const countUnits = (grid: Grid) => grid.slice(0, -1).filter((row) => /^o+$/.test(row)).length

/**
 * A unit's size on a stage with 12 numbers: sized for 12 (the most the look carries), whole px,
 * capped at 12, after the number under the stack takes 14 px (the character's own room is set
 * when the scenes are drawn); as wide as most of a column, at most 44.
 */
export function unitOn(size: StageSize): { h: number; w: number } {
  const pitch = (size.width + size.gap) / 12
  return {
    h: Math.max(1, Math.min(12, Math.floor((size.height - 14) / 12))),
    w: Math.min(44, Math.round(pitch * 0.8)),
  }
}

export const UNIT_STAGES = SIZES.map((size) => ({ size, ...unitOn(size) }))

// ---------- The tree views ----------

/** One node of the dam: a log's round cut end, `d` across, with its rings. Codes o, B, C, R. */
export function logEndRows(d: number): Grid {
  const r = new Raster(d + 2, d + 2)
  const c = (d + 1) / 2
  r.disc(c, c, d / 2, d / 2, 'B')
  r.disc(c, c, d / 2 - 2, d / 2 - 2, 'C')
  for (const ring of [0.55, 0.8])
    for (let y = 0; y < r.h; y++)
      for (let x = 0; x < r.w; x++) {
        const dist = Math.hypot(x - c, y - c) / (d / 2 - 2)
        if (r.get(x, y) === 'C' && Math.abs(dist - ring) < 0.07) r.set(x, y, 'R')
      }
  r.outline('o')
  return r.grid()
}

export interface TreeLayout {
  readonly w: number
  readonly h: number
  readonly node: number
  readonly nodes: readonly { readonly x: number; readonly y: number }[]
}

export function treeLayout(count: number, w: number, node: number, pitch: number): TreeLayout {
  const rows = count < 1 ? 1 : Math.floor(Math.log2(count)) + 1
  const top = node / 2 + 3
  const nodes = Array.from({ length: count }, (_, k) => {
    const row = Math.floor(Math.log2(k + 1))
    const across = k - (2 ** row - 1)
    return { x: ((across + 0.5) * w) / 2 ** row, y: top + row * pitch }
  })
  return { w, h: Math.round(top + (rows - 1) * pitch + node / 2 + 10), node, nodes }
}

function stamp(r: Raster, rows: Grid, x0: number, y0: number): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const code = row.charAt(x)
      if (code !== '.') r.set(x0 + x, y0 + y, code)
    }
  })
}

/**
 * B's dam: a mound of mud and sticks in the pyramid's shape, its bottom row on the ground, the log
 * ends set into it at the nodes, and a stick from each log to its two under it. Codes o, M mud,
 * m mud shade, S stick, B, C, R.
 */
export function damRows(layout: TreeLayout): Grid {
  const r = new Raster(layout.w, layout.h)
  const first = layout.nodes[0]
  const last = layout.nodes[layout.nodes.length - 1]
  if (!first || !last) return r.grid()
  const bottomY = last.y
  const half = layout.node / 2
  // The mound: from the ground under the bottom row up to the top log.
  r.polygon(
    [
      [first.x - half, first.y - 2],
      [first.x + half, first.y - 2],
      [layout.w - 2, bottomY + half / 2],
      [layout.w - 2, layout.h - 2],
      [1, layout.h - 2],
      [1, bottomY + half / 2],
    ],
    'M',
  )
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++)
      if (r.get(x, y) === 'M' && (x * 7 + y * 3) % 11 === 0) r.set(x, y, 'm')
  // Sticks from each log to its children.
  layout.nodes.forEach((node, k) => {
    const parent = layout.nodes[Math.floor((k - 1) / 2)]
    if (k === 0 || !parent) return
    r.path(
      [
        [parent.x, parent.y],
        [node.x, node.y],
      ],
      2.2,
      'S',
    )
  })
  const end = logEndRows(layout.node)
  for (const node of layout.nodes)
    stamp(
      r,
      end,
      Math.round(node.x - (layout.node + 2) / 2),
      Math.round(node.y - (layout.node + 2) / 2),
    )
  r.outline('o')
  return r.grid()
}
