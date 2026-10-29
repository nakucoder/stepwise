/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): round two of heap sort's character, the
 * pizza cart's formula. One monkey (three designs to pick from), the values as stacks of wooden
 * banana crates (one crate = one), and the tree as a real tree: a trunk, brown branches, and
 * leafy round clumps as its nodes.
 *
 * Sprites are grids of one-letter codes, drawn in code from simple shapes (discs, thick lines)
 * and outlined, so every pose of a design is the same size and every crate is the same.
 */

export type Grid = string[]

/** A small raster to draw sprites into: shapes fill codes, then an outline goes round them. */
class Raster {
  readonly w: number
  readonly h: number
  readonly cells: string[][]
  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.cells = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'))
  }

  get(x: number, y: number): string {
    return this.cells[y]?.[x] ?? '.'
  }

  set(x: number, y: number, code: string): void {
    const row = this.cells[Math.round(y)]
    const at = Math.round(x)
    if (row && at >= 0 && at < this.w) row[at] = code
  }

  /** A filled ellipse (pixel centers inside it). */
  disc(cx: number, cy: number, rx: number, ry: number, code: string): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, code)
  }

  /** A thick line through the points (a disc of the thickness swept along it). */
  path(points: readonly (readonly [number, number])[], thick: number, code: string): void {
    for (let k = 1; k < points.length; k++) {
      const [x0, y0] = points[k - 1] ?? [0, 0]
      const [x1, y1] = points[k] ?? [0, 0]
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4))
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thick / 2, thick / 2, code)
      }
    }
  }

  /** Every empty pixel touching a filled one (4 ways) becomes the outline. */
  outline(code = 'o', keep: readonly string[] = []): void {
    const marks: [number, number][] = []
    const filled = (x: number, y: number) => {
      const c = this.get(x, y)
      return c !== '.' && c !== code && !keep.includes(c)
    }
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (
          this.get(x, y) === '.' &&
          (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))
        )
          marks.push([x, y])
    for (const [x, y] of marks) this.set(x, y, code)
  }

  grid(): Grid {
    return this.cells.map((row) => row.join(''))
  }
}

/** Points along a spiral: from radius r0 at angle a0 to r1 at a1 (radians, y down). */
function spiral(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
): [number, number][] {
  const points: [number, number][] = []
  const n = 24
  for (let k = 0; k <= n; k++) {
    const t = k / n
    const a = a0 + (a1 - a0) * t
    const r = r0 + (r1 - r0) * t
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return points
}

// ---------- The monkey: three designs ----------

export type MonkeyPose = 'idle' | 'swing' | 'hold'

export interface MonkeyDesign {
  readonly id: 'A' | 'B' | 'C'
  readonly name: string
  readonly about: string
}

export const MONKEY_DESIGNS: readonly MonkeyDesign[] = [
  {
    id: 'A',
    name: 'A. Round ears',
    about:
      'A warm brown monkey with big round ears (pink inside), a heart-shaped tan face, a cheeky lopsided grin and a long tail that rolls up into a spiral.',
  },
  {
    id: 'B',
    name: 'B. Dark cap',
    about:
      'A slim, long-limbed dark-chocolate monkey with a cream face and chest, a dark cap of fur and fluffy cream sideburns, a little “o” of a mouth, and a tail that hooks over like a question mark.',
  },
  {
    id: 'C',
    name: 'C. Big head',
    about:
      'A small golden monkey with an oversized round head, a tuft on top, huge sparkly eyes, a wide smile with its tongue out, and a short tail ending in a loop.',
  },
]

/** Every monkey sprite, every design and pose: 34 × 40 sprite pixels. */
export const MONKEY_W = 34
export const MONKEY_H = 40

/** Where the hold pose's feet grip: the top of the crate stack, between these columns. */
export const HOLD_FEET = { left: 9, right: 24, y: 37 } as const

/**
 * A monkey, facing us, in one of its poses. Codes: o outline, f fur, d dark fur (far parts, the
 * cap), l face, belly, hands and feet, p pink (inner ears, tongue), e eye, w eye shine,
 * n nose, m mouth, v vine (in the swing and hold poses, from the top edge down to its hands).
 */
export function monkeyRows(design: MonkeyDesign['id'], pose: MonkeyPose): Grid {
  const r = new Raster(MONKEY_W, MONKEY_H)
  const cx = 17
  // Each design's proportions.
  const shape = {
    A: { headY: 11, headR: 7.5, earR: 3.4, earDX: 8.2, bodyRX: 5, bodyRY: 5.5, limb: 3 },
    B: { headY: 10.5, headR: 6.6, earR: 2.2, earDX: 7, bodyRX: 4, bodyRY: 6.5, limb: 2.2 },
    C: { headY: 12, headR: 9.2, earR: 2.6, earDX: 9.3, bodyRX: 4.2, bodyRY: 4.2, limb: 2.6 },
  }[design]
  const bodyY = shape.headY + shape.headR + shape.bodyRY - 1.5
  const shoulderY = bodyY - shape.bodyRY + 2.5
  const hipY = bodyY + shape.bodyRY - 1.5
  const side = shape.bodyRX - 0.5

  // Hands and feet by pose.
  const limbs = {
    idle: {
      hands: [
        [cx - 9, bodyY + 3],
        [cx + 9, bodyY + 3],
      ],
      feet: [
        [cx - 4, MONKEY_H - 3],
        [cx + 4, MONKEY_H - 3],
      ],
      tail: 1,
    },
    swing: {
      hands: [
        [cx - 10, shoulderY + 1],
        [cx + 8, 2],
      ],
      feet: [
        [cx - 6, MONKEY_H - 4],
        [cx + 7, MONKEY_H - 6],
      ],
      tail: -1,
    },
    hold: {
      hands: [
        [cx - 10, shoulderY + 1],
        [cx + 8, 2],
      ],
      feet: [
        [HOLD_FEET.left, HOLD_FEET.y],
        [HOLD_FEET.right, HOLD_FEET.y],
      ],
      tail: 1,
    },
  }[pose]

  // The tail first (behind everything), from the rump outward.
  const tx = cx + limbs.tail * 3
  const ty = hipY - 1
  const dir = limbs.tail
  const tail: [number, number][] =
    design === 'A'
      ? [
          [tx, ty],
          [cx + dir * 9, ty + 3],
          ...spiral(
            cx + dir * 12,
            ty - 2,
            5,
            1.6,
            dir > 0 ? Math.PI * 0.55 : Math.PI * 0.45,
            dir > 0 ? Math.PI * 2.4 : -Math.PI * 1.4,
          ),
        ]
      : design === 'B'
        ? [
            [tx, ty],
            [cx + dir * 10, ty + 2],
            [cx + dir * 12.5, ty - 3],
            ...spiral(
              cx + dir * 10.2,
              ty - 4,
              2.4,
              2.2,
              dir > 0 ? 0 : Math.PI,
              dir > 0 ? -Math.PI : Math.PI * 2,
            ),
          ]
        : [
            [tx, ty],
            [cx + dir * 8, ty + 1],
            ...spiral(
              cx + dir * 11,
              ty - 1.5,
              3,
              2.6,
              dir > 0 ? Math.PI * 0.7 : Math.PI * 0.3,
              dir > 0 ? Math.PI * 2.6 : -Math.PI * 1.6,
            ),
          ]
  r.path(tail, design === 'B' ? 1.6 : 2, 'f')

  // The vine.
  if (pose !== 'idle') {
    const vx = Math.round(limbs.hands[1]?.[0] ?? cx)
    for (let y = 0; y <= 2; y++) r.set(vx, y, 'v')
  }

  // Arms and legs.
  const [lh, rh] = limbs.hands as [number, number][]
  const [lf, rf] = limbs.feet as [number, number][]
  const limb = shape.limb
  if (lh && rh && lf && rf) {
    r.path(
      [[cx - side, shoulderY], [(cx - side + lh[0]) / 2 - 1, (shoulderY + lh[1]) / 2], lh],
      limb,
      'f',
    )
    r.path(
      [[cx + side, shoulderY], [(cx + side + rh[0]) / 2 + 1, (shoulderY + rh[1]) / 2], rh],
      limb,
      'f',
    )
    r.path([[cx - 2.5, hipY], [(cx - 2.5 + lf[0]) / 2 - 1.5, (hipY + lf[1]) / 2], lf], limb, 'f')
    r.path([[cx + 2.5, hipY], [(cx + 2.5 + rf[0]) / 2 + 1.5, (hipY + rf[1]) / 2], rf], limb, 'f')
  }

  // The body and belly.
  r.disc(cx, bodyY, shape.bodyRX, shape.bodyRY, 'f')
  r.disc(cx, bodyY + 1, shape.bodyRX - 2, shape.bodyRY - 2, 'l')

  // Hands and feet: light, a little bigger than the limb.
  for (const hand of [lh, rh]) if (hand) r.disc(hand[0], hand[1], 1.6, 1.5, 'l')
  for (const foot of [lf, rf]) if (foot) r.disc(foot[0], foot[1], 2.2, 1.4, 'l')

  // Ears, then the head over them.
  const hy = shape.headY
  for (const s of [-1, 1]) {
    r.disc(cx + s * shape.earDX, hy - (design === 'C' ? 3 : 0), shape.earR, shape.earR, 'f')
    r.disc(
      cx + s * shape.earDX,
      hy - (design === 'C' ? 3 : 0),
      shape.earR - 1.3,
      shape.earR - 1.3,
      'p',
    )
  }
  r.disc(cx, hy, shape.headR, design === 'B' ? shape.headR + 0.5 : shape.headR, 'f')

  // The face.
  if (design === 'A') {
    // A heart-shaped face: two bumps round the eyes and a wide muzzle.
    r.disc(cx - 2.6, hy - 1, 2.8, 2.6, 'l')
    r.disc(cx + 2.6, hy - 1, 2.8, 2.6, 'l')
    r.disc(cx, hy + 2.5, 4.6, 3.4, 'l')
  } else if (design === 'B') {
    // A dark cap of fur, a cream face and fluffy sideburns.
    for (let y = 0; y < hy - 3; y++)
      for (let x = 0; x < MONKEY_W; x++) if (r.get(x, y) === 'f') r.set(x, y, 'd')
    r.disc(cx, hy + 1, 4.4, 5, 'l')
    for (const s of [-1, 1]) {
      r.set(cx + s * 6, hy + 1, 'l')
      r.set(cx + s * 7, hy + 2, 'l')
      r.set(cx + s * 6, hy + 3, 'l')
    }
  } else {
    // A round peach face, almost the whole head, and a tuft on top.
    r.disc(cx, hy + 1, 7, 6.4, 'l')
    r.set(cx, hy - shape.headR - 1, 'f')
    r.set(cx - 1, hy - shape.headR - 2, 'f')
    r.set(cx + 1, hy - shape.headR - 1, 'f')
  }

  // Eyes (with a shine), nose and mouth.
  const eyeY = hy - (design === 'C' ? 0 : 1)
  const eyeDX = design === 'C' ? 3.5 : 2.5
  for (const s of [-1, 1]) {
    const ex = Math.round(cx + s * eyeDX)
    if (design === 'C') {
      // Huge eyes: 3 × 3, two shines.
      for (let y = 0; y < 3; y++) for (let x = -1; x <= 1; x++) r.set(ex + x, eyeY + y - 1, 'e')
      r.set(ex - 1, eyeY - 1, 'w')
      r.set(ex + 1, eyeY + 1, 'w')
    } else {
      r.set(ex, eyeY, 'e')
      r.set(ex, eyeY + 1, 'e')
      r.set(ex + (s < 0 ? -1 : 0), eyeY, design === 'A' ? 'e' : 'e')
      r.set(ex + (s < 0 ? -1 : 0), eyeY + 1, 'e')
      r.set(ex + (s < 0 ? -1 : 0), eyeY, 'w')
    }
  }
  if (design === 'A') {
    r.set(cx - 1, hy + 2, 'n')
    r.set(cx + 1, hy + 2, 'n')
    // A cheeky lopsided grin, up on the right.
    for (const [x, y] of [
      [cx - 2, hy + 4],
      [cx - 1, hy + 5],
      [cx, hy + 5],
      [cx + 1, hy + 5],
      [cx + 2, hy + 4],
      [cx + 3, hy + 3],
    ] as const)
      r.set(x, y, 'm')
  } else if (design === 'B') {
    r.set(cx, hy + 2, 'n')
    r.set(cx, hy + 4, 'm')
    r.set(cx - 1, hy + 4, 'm')
    r.set(cx, hy + 5, 'm')
    r.set(cx - 1, hy + 5, 'm')
  } else {
    r.set(cx, hy + 3, 'n')
    for (let x = cx - 3; x <= cx + 3; x++) r.set(x, hy + 5, 'm')
    r.set(cx - 4, hy + 4, 'm')
    r.set(cx + 4, hy + 4, 'm')
    r.set(cx, hy + 6, 'p')
    r.set(cx + 1, hy + 6, 'p')
  }
  r.outline('o', ['v'])
  return r.grid()
}

// ---------- Banana crates ----------

/** A crate's width for a crate `h` px high: a wooden crate, wider than tall. */
export const crateWidth = (h: number) => Math.max(10, Math.round(h * 2))

/**
 * A stack of `count` identical wooden banana crates, each `h` px high (its top line is its
 * outline, as the pizza boxes'), closed by one line under the bottom crate. Each crate: a dark
 * outline, two darker corner posts, wooden slats with a darker gap between them, and a small
 * paper label with a banana where it fits. Codes: o outline, w wood, g slat gap, k corner post,
 * L label, y banana, t banana tip.
 */
export function crateStack(count: number, h: number, w = crateWidth(h)): Grid {
  const rows: string[] = []
  for (let k = 0; k < count; k++) rows.push(...crateRows(h, w))
  rows.push('o'.repeat(w))
  return rows
}

export function crateRows(h: number, w = crateWidth(h)): Grid {
  const r = new Raster(w, h)
  for (let x = 0; x < w; x++) r.set(x, 0, 'o')
  for (let y = 1; y < h; y++) {
    r.set(0, y, 'o')
    r.set(w - 1, y, 'o')
    for (let x = 1; x < w - 1; x++) r.set(x, y, 'w')
  }
  // Slat gaps: the body split into slats about 3 px high.
  const body = h - 1
  const slats = Math.max(1, Math.round(body / 3.2))
  for (let s = 1; s < slats; s++) {
    const y = 1 + Math.round((s * body) / slats)
    if (y < h) for (let x = 1; x < w - 1; x++) r.set(x, y, 'g')
  }
  // Corner posts.
  const post = w >= 16 ? 2 : 1
  for (let y = 1; y < h; y++)
    for (let p = 0; p < post; p++) {
      r.set(1 + p, y, 'k')
      r.set(w - 2 - p, y, 'k')
    }
  // The label: a small paper with a banana, where the crate is at least 7 px high.
  if (h >= 7 && w >= 14) {
    const lw = Math.min(9, w - 2 * post - 4)
    const lh = h >= 9 ? 5 : 4
    const lx = Math.round((w - lw) / 2)
    const ly = 1 + Math.round((h - 1 - lh) / 2)
    for (let y = ly; y < ly + lh; y++) for (let x = lx; x < lx + lw; x++) r.set(x, y, 'L')
    // The banana: a curve, tips up, a brown tip at the left.
    const mid = ly + Math.floor(lh / 2)
    const bx = lx + 1
    const bw = lw - 2
    r.set(bx, mid - 1, 't')
    r.set(bx + bw - 1, mid - 1, 'y')
    for (let x = bx + 1; x < bx + bw - 1; x++) r.set(x, mid, 'y')
    if (lh >= 5) for (let x = bx + 2; x < bx + bw - 2; x++) r.set(x, mid + 1, 'y')
  }
  return r.grid()
}

/** How many crates a stack shows: each crate's top line is a full row of outline. */
export const countCrates = (grid: Grid) =>
  grid.slice(0, -1).filter((row) => /^o+$/.test(row)).length

// ---------- The tree ----------

/** A leafy round clump of `d` px across, for one node. Codes: o, a dark, b mid, c light leaves. */
export function clumpRows(d: number): Grid {
  const r = new Raster(d + 4, d + 4)
  const c = (d + 3) / 2
  const R = d / 2 - 1.6
  // The clump: a disc with leafy bumps round its edge.
  r.disc(c, c, R, R, 'b')
  const bumps = Math.max(7, Math.round(d / 3))
  for (let k = 0; k < bumps; k++) {
    const a = (k / bumps) * Math.PI * 2
    r.disc(c + Math.cos(a) * R, c + Math.sin(a) * R, d / 9 + 0.6, d / 9 + 0.6, 'b')
  }
  // Shade: darker toward the lower right, lighter leaves upper left.
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) {
      if (r.get(x, y) !== 'b') continue
      const shade = (x - c) * 0.6 + (y - c)
      if (shade > d * 0.22) r.set(x, y, 'a')
    }
  for (let k = 0; k < bumps; k++) {
    const a = (k / bumps) * Math.PI * 2 + 0.4
    const x = c + Math.cos(a) * R * 0.55 - d * 0.08
    const y = c + Math.sin(a) * R * 0.55 - d * 0.1
    if (x - c + (y - c) < 0) r.disc(x, y, d / 14 + 0.4, d / 18 + 0.4, 'c')
  }
  r.outline('o')
  return r.grid()
}

/** The tree's own layout: a node's place at row `row`, slot `across`, in a box of `w` × `h`. */
export interface TreeLayout {
  readonly w: number
  readonly h: number
  readonly clump: number
  readonly nodes: readonly { readonly x: number; readonly y: number }[]
}

export function treeLayout(count: number, w: number, clump: number, pitch: number): TreeLayout {
  const rows = count < 1 ? 1 : Math.floor(Math.log2(count)) + 1
  const top = clump / 2 + 2
  const nodes = Array.from({ length: count }, (_, k) => {
    const row = Math.floor(Math.log2(k + 1))
    const across = k - (2 ** row - 1)
    return { x: ((across + 0.5) * w) / 2 ** row, y: top + row * pitch }
  })
  // Room under the last row for the trunk's foot.
  return { w, h: Math.round(top + (rows - 1) * pitch + clump / 2 + 10), clump, nodes }
}

/**
 * A real tree for `count` nodes: a trunk from the ground up to the top clump, brown branches
 * from each clump to its children (thicker near the top), and the leafy clumps over them. The
 * numbers go on the clumps (in the page, as text). Codes: o outline, T trunk, t trunk shade,
 * a b c leaves, . empty.
 */
export function treeRows(layout: TreeLayout): Grid {
  const r = new Raster(layout.w, layout.h)
  const root = layout.nodes[0]
  if (!root) return r.grid()
  // The trunk, wide at the foot.
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
  // The branches: from a parent to each child, bending a little, thinner each row down.
  layout.nodes.forEach((node, k) => {
    if (k === 0) return
    const parent = layout.nodes[Math.floor((k - 1) / 2)]
    if (!parent) return
    const row = Math.floor(Math.log2(k + 1))
    r.path(
      [
        [parent.x, parent.y],
        [(parent.x + node.x) / 2, Math.min(parent.y, node.y) + (node.y - parent.y) * 0.25],
        [node.x, node.y],
      ],
      Math.max(2, 4.5 - row),
      'T',
    )
  })
  // Shade the wood's right edge.
  for (let y = 0; y < r.h; y++)
    for (let x = r.w - 1; x > 0; x--)
      if (r.get(x, y) === 'T' && r.get(x + 1, y) === '.') r.set(x, y, 't')
  // The clumps over the branches.
  const clump = clumpRows(layout.clump)
  const half = (layout.clump + 4) / 2
  for (const node of layout.nodes) {
    clump.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const code = row.charAt(x)
        if (code !== '.') r.set(Math.round(node.x - half) + x, Math.round(node.y - half) + y, code)
      }
    })
  }
  r.outline('o')
  return r.grid()
}
