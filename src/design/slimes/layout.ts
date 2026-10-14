/**
 * TEMPORARY (design/slimes, never merged): where everything goes, per design, for one step of
 * the run, in the stage field's own pixels. Pure: the scene draws exactly this, and a test
 * proves it fits and that a bigger number is always a bigger ship.
 *
 * Each design has its own layout (and its own motion, in the scene):
 * A. Modular mothership: ships fly in one band, nose to the left; a ship is a chain of modules,
 *    each as big as its number. A merge opens a docking frame in the band; the two halves wait
 *    above and below it, noses at the frame's mouth, and dock module by module.
 * B. Squadrons and a stargate: a formation tree, one row per split level, fighters facing up;
 *    every fighter keeps its own column (merge sort's index). A merge opens a stargate over
 *    the two squadrons; their leads pull forward, and the smaller flies up through it.
 * C. Docking station: a station along the left edge; each group hangs on its own arm, one
 *    arm per row, front pod next to the station. Every move goes through the station.
 */
import { pixelScale } from '../../characters/pixel'
import { depthOf, type SlimeGroup, type SortStep } from './run'

export type Design = 'mothership' | 'squadrons' | 'station'

export interface Box {
  readonly width: number
  readonly height: number
}

export interface Body {
  readonly key: string
  readonly kind:
    | 'nose'
    | 'engine'
    | 'spine'
    | 'flame'
    | 'frame'
    | 'dock'
    | 'bracket'
    | 'slot'
    | 'gate'
    | 'gate-close'
    | 'station'
    | 'arm'
    | 'arm-retract'
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface Token {
  readonly value: number
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /** Which line it is in: a ship on its own, or one of the two halves being merged. */
  readonly part: 'home' | 'left' | 'right'
  /** Its place in its group, left to right. */
  readonly order: number
  readonly role: 'compare' | 'final' | null
  /** At a compare: which front it is (the Do it choice). */
  readonly side: 'left' | 'right' | null
}

/**
 * full: sizes in full; short: sizes shrink (a pixel or two per count); compact: one size,
 * digits only; zoom / zoom-compact: only the split or merge in progress is on stage.
 */
export type Mode = 'full' | 'short' | 'compact' | 'zoom' | 'zoom-compact'

export interface Scene {
  readonly s: number
  readonly font: number
  readonly mode: Mode
  readonly bodies: readonly Body[]
  readonly tokens: readonly Token[]
  /** C: where the station is (every move goes through it). */
  readonly hubX: number
}

const isMerging = (step: SortStep) =>
  step.event === 'compare' || step.event === 'take' || step.event === 'rest'

function parts(step: SortStep) {
  const f = step.family
  const find = (lo: number, hi: number) => step.groups.find((g) => g.lo === lo && g.hi === hi)
  return {
    parent: f ? find(f.lo, f.hi) : undefined,
    left: f ? find(f.lo, f.mid) : undefined,
    right: f ? find(f.mid, f.hi) : undefined,
  }
}

/** The sides and roles every design shares: yellow on the two fronts, green at the end. */
function marks(step: SortStep, part: Token['part'], order: number) {
  const side =
    step.event === 'compare' && order === 0 && part !== 'home'
      ? part === 'left'
        ? ('left' as const)
        : ('right' as const)
      : null
  return { side, role: step.sorted ? ('final' as const) : side ? ('compare' as const) : null }
}

const sizeMode = (u: number): Mode => (u >= 3 ? 'full' : u >= 1 ? 'short' : 'compact')

const valuesOf = (step: SortStep) => step.groups.flatMap((g) => g.values.map(Math.abs))

export function sceneOf(design: Design, step: SortStep, box: Box, n: number): Scene {
  if (design === 'mothership') return mothership(step, box, n)
  if (design === 'squadrons') return squadrons(step, box, n)
  return station(step, box, n)
}

// ---------------------------------------------------------------------------------------------
// A. Modular mothership: one band of ships, two waiting bands while a merge docks.

function mothership(step: SortStep, box: Box, n: number): Scene {
  const { width: W, height: H } = box
  const gapY = 4
  const bandH = Math.floor((H - 2 * gapY) / 3)
  const s = pixelScale(Math.min(bandH / 40, W / Math.max(1, n) / 30), 3)
  const font = Math.max(10, 7 * s)
  const base = font + 2 * s
  const nose = 5 * s
  const link = s
  const gap = 4 * s
  const margin = 2 * s
  const all = valuesOf(step)
  const largest = Math.max(9, ...all)
  const sum = Math.max(
    1,
    all.reduce((a, b) => a + b, 0),
  )
  const uW = Math.floor(
    (W - 2 * margin - n * (base + nose + link) - Math.max(0, n - 1) * gap) / sum,
  )
  const uH = Math.floor((bandH - base - 2 * s) / largest)
  const u = Math.max(0, Math.min(uW, uH))
  const size = (v: number) => base + u * Math.abs(v)
  const cy = {
    left: Math.round(bandH / 2),
    home: Math.round(bandH + gapY + bandH / 2),
    right: Math.round(2 * (bandH + gapY) + bandH / 2),
  }

  const merging = isMerging(step) && step.family !== null
  const { parent, left, right } = parts(step)
  const isHalf = (g: SlimeGroup) => merging && (g.key === left?.key || g.key === right?.key)
  // A docking ship is as long as everything that will dock into it.
  const full = (g: SlimeGroup) =>
    merging && g.key === parent?.key
      ? [...g.values, ...(left?.values ?? []), ...(right?.values ?? [])]
      : g.values
  const home = step.groups.filter((g) => !isHalf(g) && full(g).length > 0)
  const lengthOf = (values: readonly number[]) =>
    nose + values.reduce((a, v) => a + size(v) + link, 0)
  const span = home.reduce((a, g) => a + lengthOf(full(g)), 0) + Math.max(0, home.length - 1) * gap
  let x = Math.round((W - span) / 2)

  const bodies: Body[] = []
  const tokens: Token[] = []
  const ship = (g: SlimeGroup, x0: number, line: Token['part'], key: string) => {
    const y = line === 'home' ? cy.home : line === 'left' ? cy.left : cy.right
    if (g.values.length === 0) return
    const nh = size(g.values[0] ?? 0)
    // The spine every module hangs on, nose to engine.
    const sh = Math.max(2 * s, Math.round(base / 3))
    bodies.push({
      key: `spine-${key}`,
      kind: 'spine',
      x: x0 + nose,
      y: y - Math.round(sh / 2),
      w: lengthOf(g.values) - nose,
      h: sh,
    })
    bodies.push({
      key: `nose-${key}`,
      kind: 'nose',
      x: x0,
      y: y - Math.round(nh / 2),
      w: nose,
      h: nh,
    })
    let at = x0 + nose
    g.values.forEach((value, order) => {
      const z = size(value)
      tokens.push({
        value,
        x: at,
        y: y - Math.round(z / 2),
        w: z,
        h: z,
        part: line,
        order,
        ...marks(step, line, order),
      })
      at += z + link
    })
    const eh = Math.round(base / 2)
    bodies.push({
      key: `engine-${key}`,
      kind: 'engine',
      x: at,
      y: y - Math.round(eh / 2),
      w: s * 2,
      h: eh,
    })
  }

  for (const g of home) {
    const x0 = x
    ship(g, x0, 'home', g.key)
    if (merging && g.key === parent?.key) {
      // The docking frame: the whole new ship's outline, and the dock's mouth by the noses.
      const len = lengthOf(full(g)) - nose
      const tallest = Math.max(...full(g).map(size))
      bodies.push({
        key: 'frame',
        kind: 'frame',
        x: x0 + nose,
        y: cy.home - Math.round(tallest / 2) - s,
        w: len,
        h: tallest + 2 * s,
      })
      const top = cy.left - Math.round(bandH / 2)
      bodies.push({
        key: 'dock',
        kind: 'dock',
        x: Math.max(0, x0 - 2 * s),
        y: top,
        w: s,
        h: Math.min(H, cy.right + Math.round(bandH / 2)) - top,
      })
      if (left) ship(left, x0, 'left', `${left.key}-wait`)
      if (right) ship(right, x0, 'right', `${right.key}-wait`)
    }
    // A split fires the thrusters at the cut, pushing the halves apart.
    if (
      step.event === 'split' &&
      step.family &&
      g.lo === step.family.lo &&
      g.hi === step.family.mid
    ) {
      const at = x0 + lengthOf(g.values) + 2 * s
      const fh = Math.round(base / 2)
      bodies.push({
        key: `flame-${g.key}-${String(step.family.hi)}`,
        kind: 'flame',
        x: at,
        y: cy.home - Math.round(fh / 2),
        w: Math.max(s, gap - 3 * s),
        h: fh,
      })
    }
    x += lengthOf(full(g)) + gap
  }
  return { s, font, mode: sizeMode(u), bodies, tokens, hubX: 0 }
}

// ---------------------------------------------------------------------------------------------
// B. Squadrons: a formation tree; every fighter keeps its column; a gate over each merge.

function squadrons(step: SortStep, box: Box, n: number): Scene {
  const { width: W, height: H } = box
  const D = depthOf(n)
  const gapY = 4
  const s = pixelScale(Math.min(H / (D + 1) / 40, W / Math.max(1, n) / 30), 3)
  const font = Math.max(10, 7 * s)
  const base = font + 2 * s
  const lift = 2 * s
  const margin = 2 * s
  const largest = Math.max(9, ...valuesOf(step))
  const colW = (W - 2 * margin) / Math.max(1, n)
  const uW = Math.floor((colW - 2 * s - base) / largest)
  const uFor = (rowH: number) => Math.floor((rowH - lift - base - 3 * s) / largest)
  const treeH = Math.floor((H - D * gapY) / (D + 1))
  const zoom = Math.min(uW, uFor(treeH)) < 1
  const rows = zoom ? 2 : D + 1
  const rowH = zoom ? Math.floor((H - gapY) / 2) : treeH
  const u = Math.max(0, Math.min(uW, uFor(rowH)))
  const size = (v: number) => base + u * Math.abs(v)
  const mode: Mode = zoom ? (u >= 1 ? 'zoom' : 'zoom-compact') : sizeMode(u)

  const f = step.family
  const whole = !f || step.event === 'start' || step.event === 'finale'
  const top = whole ? 0 : f.depth
  const rowOf = (depth: number) => (zoom ? depth - top : depth)
  const shown = (g: SlimeGroup) =>
    !zoom || ((g.depth === top || g.depth === top + 1) && (whole || (g.lo >= f.lo && g.hi <= f.hi)))
  const rowTop = (r: number) => r * (rowH + gapY)
  const colX = (c: number) => margin + (c + 0.5) * colW

  const merging = isMerging(step) && f !== null
  const { parent, left, right } = parts(step)
  const bodies: Body[] = []
  const tokens: Token[] = []

  for (const g of step.groups.filter(shown)) {
    const r = rowOf(g.depth)
    if (r < 0 || r >= rows) continue
    const line: Token['part'] =
      merging && g.key === left?.key ? 'left' : merging && g.key === right?.key ? 'right' : 'home'
    const first = g.lo + (line === 'home' ? 0 : g.taken)
    const floor = rowTop(r) + rowH - s
    g.values.forEach((value, order) => {
      const z = size(value)
      const m = marks(step, line, order)
      tokens.push({
        value,
        x: Math.round(colX(first + order) - z / 2),
        y: floor - z - (m.side ? lift : 0),
        w: z,
        h: z,
        part: line,
        order,
        ...m,
      })
    })
    // The formation's bracket under its columns (the whole span of a squadron being formed).
    const lo = first + 0.08
    const hi = merging && g.key === parent?.key ? g.hi - 0.08 : first + g.values.length - 0.08
    if (hi > lo + 0.1) {
      bodies.push({
        key: `bracket-${g.key}`,
        kind: 'bracket',
        x: Math.round(margin + lo * colW),
        y: floor,
        w: Math.round((hi - lo) * colW),
        h: s,
      })
    }
    if (merging && g.key === parent?.key) {
      for (let c = g.lo + g.values.length; c < g.hi; c++) {
        bodies.push({
          key: `slot-${String(c)}`,
          kind: 'slot',
          x: Math.round(colX(c) - base / 2),
          y: floor - base,
          w: base,
          h: base,
        })
      }
    }
  }
  // The stargate over the two squadrons; when the merge is done it flashes and shuts.
  if (f && (merging || step.event === 'merged')) {
    const r = rowOf(f.depth + 1)
    if (r >= 0 && r < rows) {
      const closing = step.event === 'merged'
      bodies.push({
        key: closing ? `gate-close-${String(f.lo)}-${String(f.hi)}` : 'gate',
        kind: closing ? 'gate-close' : 'gate',
        x: Math.round(margin + (f.lo + 0.04) * colW),
        y: rowTop(r),
        w: Math.round((f.hi - f.lo - 0.08) * colW),
        h: 2 * s,
      })
    }
  }
  return { s, font, mode, bodies, tokens, hubX: 0 }
}

// ---------------------------------------------------------------------------------------------
// C. Docking station: one arm per group, the station on the left; moves go through it.

function station(step: SortStep, box: Box, n: number): Scene {
  const { width: W, height: H } = box
  const D = depthOf(n)
  const gapY = 4
  const treeRows = D + 2
  const s = pixelScale(Math.min(H / treeRows / 40, W / Math.max(1, n) / 30), 3)
  const font = Math.max(10, 7 * s)
  const base = font + 2 * s
  const margin = 2 * s
  const hubW = 5 * s
  const armX = margin + hubW
  const pad = 2 * s
  const all = valuesOf(step)
  const largest = Math.max(9, ...all)
  const sum = Math.max(
    1,
    all.reduce((a, b) => a + b, 0),
  )
  const uW = Math.floor((W - armX - margin - n * (base + pad)) / sum)
  const uFor = (rowH: number) => Math.floor((rowH - base - 2 * s) / largest)
  const treeH = Math.floor((H - (treeRows - 1) * gapY) / treeRows)
  const zoom = Math.min(uW, uFor(treeH)) < 1
  const rows = zoom ? 3 : treeRows
  const rowH = Math.floor((H - (rows - 1) * gapY) / rows)
  const u = Math.max(0, Math.min(uW, uFor(rowH)))
  const size = (v: number) => base + u * Math.abs(v)
  const mode: Mode = zoom ? (u >= 1 ? 'zoom' : 'zoom-compact') : sizeMode(u)

  const f = step.family
  const whole = !f || step.event === 'start' || step.event === 'finale'
  const merging = isMerging(step) && f !== null
  const { parent, left, right } = parts(step)
  const inFamily = (g: SlimeGroup) => !zoom || whole || (g.lo >= f.lo && g.hi <= f.hi)
  // The arms in order; when a merge is done its two empty arms fold back into the station.
  const arms: { group: SlimeGroup | null; key: string }[] = []
  for (const g of step.groups.filter(inFamily)) {
    arms.push({ group: g, key: g.key })
    if (step.event === 'merged' && f && g.lo === f.lo && g.hi === f.hi) {
      arms.push({ group: null, key: `${String(f.lo)}-${String(f.mid)}` })
      arms.push({ group: null, key: `${String(f.mid)}-${String(f.hi)}` })
    }
  }

  const bodies: Body[] = [{ key: 'station', kind: 'station', x: margin, y: 0, w: hubW, h: H }]
  const tokens: Token[] = []
  arms.slice(0, rows).forEach(({ group, key }, r) => {
    const cy = Math.round(r * (rowH + gapY) + rowH / 2)
    if (!group) {
      bodies.push({
        key: `retract-${key}`,
        kind: 'arm-retract',
        x: armX,
        y: cy - s,
        w: Math.round(W * 0.3),
        h: 2 * s,
      })
      return
    }
    const line: Token['part'] =
      merging && group.key === left?.key
        ? 'left'
        : merging && group.key === right?.key
          ? 'right'
          : 'home'
    const docking =
      merging && group.key === parent?.key
        ? [...group.values, ...(left?.values ?? []), ...(right?.values ?? [])]
        : group.values
    const len = docking.reduce((a, v) => a + size(v) + pad, 0)
    bodies.push({
      key: `arm-${key}`,
      kind: 'arm',
      x: armX,
      y: cy - s,
      w: Math.max(2 * s, len),
      h: 2 * s,
    })
    let at = armX + pad
    group.values.forEach((value, order) => {
      const z = size(value)
      tokens.push({
        value,
        x: at,
        y: cy - Math.round(z / 2),
        w: z,
        h: z,
        part: line,
        order,
        ...marks(step, line, order),
      })
      at += z + pad
    })
  })
  return { s, font, mode, bodies, tokens, hubX: margin + Math.round(hubW / 2) }
}
