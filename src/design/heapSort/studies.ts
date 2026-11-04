/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): round three of heap sort's character, the
 * pizza cart's formula: ONE character, and every value a stack of identical, outlined, countable
 * units. Two designs:
 *
 * - B, the beaver and its logs: logs seen side-on, each with its round cut end (rings); the tree
 *   view is a dam, a pyramid of log ends on mud and sticks.
 * - E, the eagle and its stick bundles (nest material): bundles of sticks tied in the middle; the
 *   tree view is a real tree with round autumn clumps.
 *
 * Two variants of each character, three poses each. Sprites face right and are drawn in code from
 * simple shapes, then outlined, so every pose of a variant is the same size and every unit on a
 * stage is the same. No leaf or unit takes the green of the "in its final spot" mark.
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
    id: 'B1',
    name: 'B1. Chestnut beaver',
    about:
      'A round chestnut beaver with a tan belly and muzzle, two big white front teeth, a small round ear, dark webbed feet and a flat, cross-hatched paddle tail.',
  },
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

// ---------- E. The eagle ----------

export const EAGLES: readonly Variant[] = [
  {
    id: 'E1',
    name: 'E1. White-headed eagle',
    about:
      'A dark brown eagle with a white head and tail, an orange hooked beak, a fierce brow and orange talons. Perched it is seen from the side; flying, from the front, wide wings with long finger feathers.',
  },
  {
    id: 'E2',
    name: 'E2. Crested eagle',
    about:
      'A golden-brown eagle with a pale head, a tall dark crest of three feathers, a dark hooked beak, and a banded tail.',
  },
]

export const EAGLE_W = 50
export const EAGLE_H = 36

/** Where the carry pose's talons grip: the stack's top corners. */
export const TALONS = { left: 19, right: 31, y: 34 } as const

/**
 * The eagle. idle: perched, seen from the side, facing right, wings folded. move: flying, seen
 * from the front, wings spread wide with finger feathers at their tips, its head turned right
 * (the beak in profile). carry: the same, talons down, gripping a stack (drawn under it). Codes:
 * o outline, f body, d wing (darker), F feather tips, H head, T tail, b beak, k talons, e eye,
 * s eye shine, c crest, z tail band.
 */
export function eagleRows(variant: string, pose: Pose): Grid {
  const r = new Raster(EAGLE_W, EAGLE_H)
  const crested = variant === 'E2'
  if (pose === 'idle') {
    // The tail, down and back.
    r.polygon(
      [
        [18, 24],
        [23, 26],
        [16, 35],
        [11, 33],
      ],
      'T',
    )
    if (crested)
      for (const y of [29, 31])
        for (let x = 10; x < 22; x++) if (r.get(x, y) === 'T') r.set(x, y, 'z')
    // Thin legs and small talons.
    for (const lx of [26, 29]) {
      for (let y = 27; y <= 32; y++) r.set(lx, y, 'k')
      r.set(lx - 1, 33, 'k')
      r.set(lx + 1, 33, 'k')
      r.set(lx, 33, 'k')
    }
    // The body, then the folded wing over it.
    r.disc(25, 19, 8, 9, 'f')
    r.polygon(
      [
        [18, 13],
        [27, 15],
        [27, 23],
        [20, 30],
        [16, 26],
      ],
      'd',
    )
    for (let k = 0; k < 3; k++) r.set(18 + k, 27 - k * 2, 'F')
    // The head, the beak hooked down at the front, the brow over the eye.
    const [hx, hy] = [30, 9]
    r.disc(hx, hy, 5.4, 5, 'H')
    if (crested) {
      r.path(
        [
          [hx - 3, hy - 3],
          [hx - 8, hy - 8],
        ],
        1.4,
        'c',
      )
      r.path(
        [
          [hx - 1, hy - 4],
          [hx - 5, hy - 9],
        ],
        1.4,
        'c',
      )
      r.path(
        [
          [hx + 1, hy - 4],
          [hx - 1, hy - 9],
        ],
        1.4,
        'c',
      )
    }
    r.polygon(
      [
        [hx + 4, hy - 1],
        [hx + 9, hy],
        [hx + 9.5, hy + 3.5],
        [hx + 7.5, hy + 2.5],
        [hx + 4, hy + 2.5],
      ],
      'b',
    )
    r.set(hx + 2, hy - 1, 'e')
    r.set(hx + 3, hy - 1, 's')
    r.set(hx + 1, hy - 2, 'o')
    r.set(hx + 2, hy - 2, 'o')
    r.set(hx + 3, hy - 2, 'o')
  } else {
    // Flying, from the front: the tail fan below, the talons, the wings out wide, the body.
    const cx = 25
    r.polygon(
      [
        [cx - 3, 24],
        [cx + 3, 24],
        [cx + 5, 30],
        [cx - 5, 30],
      ],
      'T',
    )
    if (crested) for (let x = cx - 5; x <= cx + 5; x++) if (r.get(x, 28) === 'T') r.set(x, 28, 'z')
    const feet: [number, number][] =
      pose === 'carry'
        ? [
            [TALONS.left, TALONS.y],
            [TALONS.right, TALONS.y],
          ]
        : [
            [cx - 3, 28],
            [cx + 3, 28],
          ]
    for (const [fx, fy] of feet) {
      r.path(
        [
          [fx > cx ? cx + 2 : cx - 2, 22],
          [fx, fy - 1],
        ],
        1.2,
        'k',
      )
      // Three claws.
      r.set(fx - 1, fy, 'k')
      r.set(fx, fy, 'k')
      r.set(fx + 1, fy, 'k')
    }
    // The wings: from the shoulders up and out, finger feathers at the tips.
    for (const side of [-1, 1]) {
      const x = (d: number) => cx + side * d
      r.polygon(
        [
          [x(3), 13],
          [x(14), 7],
          [x(22), 9],
          [x(24), 13],
          [x(16), 17],
          [x(4), 20],
        ],
        'd',
      )
      for (let k = 0; k < 4; k++)
        r.path(
          [
            [x(17 + k * 1.6), 10 + k * 1.2],
            [x(21 + k * 1.2), 12 + k * 2.4],
          ],
          1.2,
          'F',
        )
      // The wing's leading edge, lighter.
      r.path(
        [
          [x(4), 13],
          [x(14), 8],
        ],
        1.4,
        'f',
      )
    }
    r.disc(cx, 17, 4.6, 7.5, 'f')
    // The head, turned right: the beak in profile.
    const [hx, hy] = [cx + 1, 8]
    r.disc(hx, hy, 4.4, 4.2, 'H')
    if (crested) {
      r.path(
        [
          [hx - 2, hy - 3],
          [hx - 6, hy - 7],
        ],
        1.4,
        'c',
      )
      r.path(
        [
          [hx, hy - 4],
          [hx - 2, hy - 8],
        ],
        1.4,
        'c',
      )
    }
    r.polygon(
      [
        [hx + 3, hy - 1],
        [hx + 7.5, hy],
        [hx + 8, hy + 3],
        [hx + 6, hy + 2],
        [hx + 3, hy + 2],
      ],
      'b',
    )
    r.set(hx + 1, hy - 1, 'e')
    r.set(hx + 2, hy - 1, 's')
    r.set(hx, hy - 2, 'o')
    r.set(hx + 1, hy - 2, 'o')
    r.set(hx + 2, hy - 2, 'o')
  }
  r.outline('o')
  return r.grid()
}

// ---------- The units ----------

export type UnitKind = 'log' | 'sticks'

/**
 * One unit, `h` px high and `w` wide; its top line is its outline (the line between it and the
 * unit over it), as the pizza boxes. Logs (o outline, B bark, S bark streak, C cut end, R ring)
 * show a round cut end at the right; stick bundles (o, P pale stick, Q dark stick, K twine) are
 * sticks with rounded ends, tied in the middle. Under 5 px: the plain unit (outline and one
 * colour, the cut end still lighter on a log); at 1 px a stack is a plain column.
 */
export function unitRows(kind: UnitKind, h: number, w: number): Grid {
  const r = new Raster(w, h)
  if (h < 2) {
    for (let x = 0; x < w; x++) r.set(x, 0, kind === 'log' ? 'B' : 'P')
    return r.grid()
  }
  const body = h - 1
  if (kind === 'log') {
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
  } else {
    // The sticks: rows of pale and dark sticks, rounded ends, the twine in the middle.
    for (let y = 1; y < h; y++) {
      const stick = Math.floor((y - 1) / Math.max(1, Math.round(body / 3)))
      const inset = h >= 5 && (y === 1 || y === h - 1) ? 1 : 0
      for (let x = inset; x < w - inset; x++) r.set(x, y, stick % 2 === 0 ? 'P' : 'Q')
      if (h >= 5) {
        // The sticks' ends stagger a little.
        if (stick % 2 === 1) r.set(w - 1, y, '.')
        else r.set(0, y, '.')
      }
    }
    if (h >= 4) {
      const tie = Math.round(w / 2) - 1
      for (let y = 1; y < h; y++) {
        r.set(tie, y, 'K')
        r.set(tie + 1, y, 'K')
      }
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

/** One node of the tree: a round clump of autumn leaves, `d` across. Codes o, a, b, c. */
export function clumpRows(d: number): Grid {
  const r = new Raster(d + 4, d + 4)
  const c = (d + 3) / 2
  const R = d / 2 - 1.6
  r.disc(c, c, R, R, 'b')
  const bumps = Math.max(7, Math.round(d / 3))
  for (let k = 0; k < bumps; k++) {
    const a = (k / bumps) * Math.PI * 2
    r.disc(c + Math.cos(a) * R, c + Math.sin(a) * R, d / 9 + 0.6, d / 9 + 0.6, 'b')
  }
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++)
      if (r.get(x, y) === 'b' && (x - c) * 0.6 + (y - c) > d * 0.22) r.set(x, y, 'a')
  for (let k = 0; k < bumps; k++) {
    const a = (k / bumps) * Math.PI * 2 + 0.4
    const x = c + Math.cos(a) * R * 0.55 - d * 0.08
    const y = c + Math.sin(a) * R * 0.55 - d * 0.1
    if (x - c + (y - c) < 0) r.disc(x, y, d / 14 + 0.4, d / 18 + 0.4, 'c')
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
 * E's tree: a trunk from the ground to the top clump, brown branches from each clump to its
 * children (thinner each row down), and the autumn clumps over them. Codes o, T, t, a, b, c.
 */
export function treeRows(layout: TreeLayout): Grid {
  const r = new Raster(layout.w, layout.h)
  const root = layout.nodes[0]
  if (!root) return r.grid()
  r.path(
    [
      [root.x, root.y],
      [root.x, layout.h - 2],
    ],
    5,
    'T',
  )
  r.disc(root.x - 3, layout.h - 2, 2.5, 1.5, 'T')
  r.disc(root.x + 3, layout.h - 2, 2.5, 1.5, 'T')
  layout.nodes.forEach((node, k) => {
    const parent = layout.nodes[Math.floor((k - 1) / 2)]
    if (k === 0 || !parent) return
    const row = Math.floor(Math.log2(k + 1))
    r.path(
      [
        [parent.x, parent.y],
        [(parent.x + node.x) / 2, parent.y + (node.y - parent.y) * 0.25],
        [node.x, node.y],
      ],
      Math.max(2, 4.5 - row),
      'T',
    )
  })
  for (let y = 0; y < r.h; y++)
    for (let x = r.w - 1; x > 0; x--)
      if (r.get(x, y) === 'T' && r.get(x + 1, y) === '.') r.set(x, y, 't')
  const clump = clumpRows(layout.node)
  const half = (layout.node + 4) / 2
  for (const node of layout.nodes)
    stamp(r, clump, Math.round(node.x - half), Math.round(node.y - half))
  r.outline('o')
  return r.grid()
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
