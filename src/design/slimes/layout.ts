/**
 * TEMPORARY (design/slimes, never merged): where everything goes, per design, for one step of
 * the run, in the stage field's own pixels. Pure: the scene draws exactly this, and a test
 * proves it fits and that every value's size grows with its number.
 *
 * One stage plan for all three designs, which is merge sort's own picture (#74):
 * - The home row (top) is the main row: every group stands there in order, with gaps between
 *   groups. A merge builds its new group there, in its own places, left to right.
 * - Two lanes below are the buffer: the left half on the upper lane, the right half on the
 *   lower one. Both read left to right with their fronts at the left end, facing the merge
 *   point at the lanes' left edge. A move goes from a front up into the next empty place.
 * - The three rows are always there, so nothing jumps when a merge starts or ends.
 *
 * Every value is its own object, and its SIZE shows the number (the digit is kept too):
 * A. Size slimes: a slime as big as its number. Groups stand on ledges.
 * B. Rail yard: a robot train car with as many crates stacked on it as its number. Groups are
 *    coupled trains on their own stretch of track; the merge point is a junction switch.
 * C. Slime cutter: a piece of slime molded as tall as its number, the digit stamped on its
 *    base. A group's pieces are joined by a thin film until the blade cuts it; the lanes are
 *    conveyor belts and the merge point is a gate.
 */
import { pixelScale } from '../../characters/pixel'
import type { SlimeGroup, SortStep } from './run'

export type Design = 'slimes' | 'trains' | 'cutter'

export interface Box {
  readonly width: number
  readonly height: number
}

interface Row {
  readonly top: number
  /** Where the values stand (the top of the ledge, rail or belt). */
  readonly floor: number
}

/** Everything that isn't a value: ledges, rails, belts, film, the blade, the gate. */
export interface Body {
  readonly key: string
  readonly kind:
    | 'ledge'
    | 'rail'
    | 'coupling'
    | 'belt'
    | 'film'
    | 'blade'
    | 'press'
    | 'puff'
    | 'merge-point'
    | 'empty'
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** One value: an object whose size shows the number, standing on its digit plate. */
export interface Token {
  readonly value: number
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /** The object itself (the slime, the stack of crates, the molded piece), above the plate. */
  readonly bodyW: number
  readonly bodyH: number
  /** B: how many crates (the number); 0 when there's no room to draw them one by one. */
  readonly crates: number
  readonly role: 'compare' | 'final' | null
  /** At a compare: which front it is (the Do it choice: L is the upper lane's). */
  readonly side: 'left' | 'right' | null
  /** A's slimes: the two fronts look at each other (the upper one down, the lower one up). */
  readonly look: 'up' | 'down' | null
  readonly row: 'home' | 'left' | 'right'
}

/**
 * full: sizes as tall as the row allows, every value a clearly different size;
 * short: sizes shrink to a sliver (the digits carry it); compact: digits only.
 */
export type Mode = 'full' | 'short' | 'compact'

export interface Scene {
  readonly s: number
  readonly font: number
  readonly mode: Mode
  readonly rows: { readonly home: Row; readonly left: Row; readonly right: Row }
  readonly bodies: readonly Body[]
  readonly tokens: readonly Token[]
}

const isMerging = (step: SortStep) =>
  step.event === 'compare' || step.event === 'take' || step.event === 'rest'

export function sceneOf(design: Design, step: SortStep, box: Box, n: number): Scene {
  const { width, height } = box
  const values = step.groups.flatMap((g) => g.values)
  const largest = Math.max(9, ...values.map(Math.abs))
  const rowGap = 4
  const rowH = Math.floor((height - 2 * rowGap) / 3)
  const s = pixelScale(Math.min(rowH / 40, width / Math.max(1, n) / 30), 3)
  const font = Math.max(10, 7 * s)
  const tagH = font + 2 * s
  const floorH = 2 * s
  const rows = {
    home: { top: 0, floor: rowH - floorH },
    left: { top: rowH + rowGap, floor: 2 * rowH + rowGap - floorH },
    right: { top: 2 * (rowH + rowGap), floor: 3 * rowH + 2 * rowGap - floorH },
  }
  // The room above the plate, the same in every row.
  const room = Math.max(0, rowH - floorH - tagH - s)
  const mode: Mode = room < largest ? 'compact' : room < 3 * largest ? 'short' : 'full'

  // Every place is the same width at every step (the worst case: all singles, n - 1 gaps), so
  // a value never changes size between steps.
  const margin = 2 * s
  const gap = Math.max(4 * s, Math.round(width * 0.05))
  const cw = Math.min(46 * s, (width - 2 * margin - Math.max(0, n - 1) * gap) / Math.max(1, n))
  const objectW = Math.round(Math.min(cw * 0.82, 40 * s))
  const unit = Math.floor(room / largest)

  // ---------- The home row: groups in order, gaps between them ----------
  const family = step.family
  const merging = family !== null && isMerging(step)
  const isHalf = (g: SlimeGroup) =>
    merging &&
    ((g.lo === family.lo && g.hi === family.mid) || (g.lo === family.mid && g.hi === family.hi))
  const parentKey = family ? `${String(family.lo)}-${String(family.hi)}` : ''
  const home = step.groups
    .filter((g) => !isHalf(g))
    .map((group) => ({
      group,
      slots: merging && group.key === parentKey ? group.hi - group.lo : group.values.length,
    }))
    .filter((g) => g.slots > 0)
  const span = home.reduce((sum, g) => sum + g.slots * cw, 0) + Math.max(0, home.length - 1) * gap
  let x = Math.round((width - span) / 2)
  const homeAt = new Map<string, number>()
  for (const { group, slots } of home) {
    homeAt.set(group.key, x)
    x += slots * cw + gap
  }

  const bodies: Body[] = []
  const tokens: Token[] = []
  const fronts = merging && step.event === 'compare' ? step.fronts : null

  function place(value: number, cx: number, rowName: Token['row'], first: boolean) {
    const row = rows[rowName]
    let bodyW = objectW
    let bodyH = 0
    if (mode !== 'compact') {
      if (design === 'slimes') {
        // The slime grows both ways; its height carries the number.
        const k = (1 + ((Math.abs(value) - 1) * 8) / (largest - 1)) / 9
        bodyH = Math.max(s, Math.round(Math.min(room, 1.8 * objectW) * k))
        bodyW = Math.round(objectW * (0.4 + 0.6 * k))
      } else {
        // One unit per count: B stacks that many crates, C molds that tall a piece.
        bodyH = Math.max(1, unit) * Math.abs(value)
        if (design === 'cutter') bodyW = Math.round(objectW * 0.86)
      }
    }
    const side =
      fronts && first ? (rowName === 'left' ? 'left' : rowName === 'right' ? 'right' : null) : null
    const h = bodyH + tagH
    tokens.push({
      value,
      x: Math.round(cx - objectW / 2),
      y: row.floor - h,
      w: objectW,
      h,
      bodyW,
      bodyH,
      crates: design === 'trains' && unit >= 3 * s ? Math.abs(value) : 0,
      role: step.sorted ? 'final' : side ? 'compare' : null,
      side,
      look: design === 'slimes' && side ? (side === 'left' ? 'down' : 'up') : null,
      row: rowName,
    })
  }

  /** What holds a group together: its ledge, its track and couplings, or its film. */
  function holder(key: string, x0: number, slots: number, filled: number, row: Row) {
    const w = Math.round(slots * cw)
    if (design === 'slimes') {
      bodies.push({
        key: `ledge-${key}`,
        kind: 'ledge',
        x: Math.round(x0),
        y: row.floor,
        w,
        h: floorH,
      })
    } else if (design === 'trains') {
      bodies.push({
        key: `rail-${key}`,
        kind: 'rail',
        x: Math.round(x0),
        y: row.floor,
        w,
        h: floorH,
      })
      for (let j = 0; j + 1 < filled; j++) {
        const at = Math.round(x0 + (j + 1) * cw)
        const cw2 = Math.round(cw - objectW)
        bodies.push({
          key: `coupling-${key}-${String(j)}`,
          kind: 'coupling',
          x: at - Math.round(cw2 / 2) - s,
          y: row.floor - Math.round(tagH / 2) - s,
          w: cw2 + 2 * s,
          h: 2 * s,
        })
      }
    } else if (filled > 1) {
      bodies.push({
        key: `film-${key}`,
        kind: 'film',
        x: Math.round(x0 + cw / 2),
        y: row.floor - Math.round(tagH / 2) - 2 * s,
        w: Math.round((filled - 1) * cw),
        h: 4 * s,
      })
    }
  }

  // The lanes are always there (empty until a merge), and C's output belt along the top.
  if (design === 'cutter') {
    bodies.push({ key: 'belt-home', kind: 'belt', x: 0, y: rows.home.floor, w: width, h: floorH })
  }
  for (const side of ['left', 'right'] as const) {
    const kind = design === 'slimes' ? 'ledge' : design === 'trains' ? 'rail' : 'belt'
    bodies.push({
      key: `lane-${side}`,
      kind,
      x: margin,
      y: rows[side].floor,
      w: width - 2 * margin,
      h: floorH,
    })
  }

  for (const { group, slots } of home) {
    const x0 = homeAt.get(group.key) ?? 0
    group.values.forEach((value, j) => {
      place(value, x0 + (j + 0.5) * cw, 'home', false)
    })
    // The places still empty in a group being built, outlined.
    for (let j = group.values.length; j < slots; j++) {
      const eh = Math.min(tagH + 4 * s, rows.home.floor - rows.home.top)
      bodies.push({
        key: `empty-${group.key}-${String(j)}`,
        kind: 'empty',
        x: Math.round(x0 + (j + 0.5) * cw - objectW / 2),
        y: rows.home.floor - eh,
        w: objectW,
        h: eh,
      })
    }
    if (design !== 'cutter' || group.values.length > 0) {
      holder(
        group.key,
        x0,
        design === 'slimes' || design === 'trains' ? slots : group.values.length,
        group.values.length,
        rows.home,
      )
    }
  }

  // The merge: each half on its lane, its front at the left end, under the new group's start.
  if (merging) {
    const x0 = homeAt.get(parentKey) ?? 0
    for (const half of step.groups.filter(isHalf)) {
      const rowName = half.lo === family.lo ? 'left' : 'right'
      half.values.forEach((value, j) => {
        place(value, x0 + (j + 0.5) * cw, rowName, j === 0)
      })
      if (design !== 'slimes')
        holder(`${half.key}-lane`, x0, half.values.length, half.values.length, rows[rowName])
    }
    // The merge point just left of the fronts: the slimes' ladder, the switch, the gate.
    const px = Math.max(0, Math.round(x0 + (cw - objectW) / 2) - 4 * s)
    bodies.push({
      key: 'merge-point',
      kind: 'merge-point',
      x: px,
      y: rows.home.floor,
      w: 2 * s,
      h: rows.right.floor + floorH - rows.home.floor,
    })
  }

  // B's special move: a puff of steam over a train that just coupled up (and the finale).
  if (design === 'trains' && (step.event === 'merged' || step.event === 'finale')) {
    const key = step.event === 'finale' ? (home[0]?.group.key ?? '') : parentKey
    const x0 = homeAt.get(key)
    if (x0 !== undefined) {
      bodies.push({
        key: 'puff',
        kind: 'puff',
        x: Math.max(0, Math.round(x0 - 2 * s)),
        y: 0,
        w: 8 * s,
        h: Math.min(6 * s, rowH - floorH),
      })
    }
  }

  if (design === 'cutter') {
    // The press over the whole slab at the start; the blade where a group was just cut.
    if (step.event === 'start') {
      bodies.push({ key: 'press', kind: 'press', x: margin, y: 0, w: width - 2 * margin, h: 2 * s })
    }
    if (step.event === 'split' && family) {
      const at = homeAt.get(`${String(family.mid)}-${String(family.hi)}`)
      if (at !== undefined) {
        bodies.push({
          key: 'blade',
          kind: 'blade',
          x: Math.max(0, Math.round(at - gap / 2 - s)),
          y: 0,
          w: 3 * s,
          h: rows.home.floor,
        })
      }
    }
  }

  return { s, font, mode, rows, bodies, tokens }
}
