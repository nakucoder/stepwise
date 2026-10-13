/**
 * TEMPORARY (design/slimes, never merged): where everything goes, per design, for one step of
 * the run, in the stage field's own pixels. Pure: the scene draws exactly this, and a test
 * proves every box stays inside the field. Slimes may go anywhere on the stage (the bars keep
 * their columns); every value keeps a readable number.
 *
 * A. Split tree: each group is a slime on its level of the recursion, top to bottom.
 * B. Slime arena: each value is its own slime; groups stand on planks; a merge queues the two
 *    halves at a gate, and the merged line forms on a raised platform above it.
 * C. Mitosis pond: each group is one blob floating on the pond, with real gaps between groups;
 *    a merge pulls the two halves together, absorbing the smaller front first.
 */
import { pixelScale } from '../../characters/pixel'
import { depthOf, type SlimeGroup, type SortStep } from './run'

export type Design = 'tree' | 'arena' | 'pond'

export interface Box {
  readonly width: number
  readonly height: number
}

export type Look = 'left' | 'right' | null

/** A slime body (A, C), a plank or platform, the gate, the pond's water. */
export interface Body {
  readonly key: string
  readonly kind: 'blob' | 'blob-empty' | 'plank' | 'platform' | 'gate' | 'water'
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /** Where its eyes look (a blob, or B's slimes): at the other front, during a compare. */
  readonly look?: Look
}

/** One value: its number (and, in B, its own little slime). */
export interface Token {
  readonly value: number
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly role: 'compare' | 'final' | null
  /** At a compare: which front it is (the Do it choice). */
  readonly side: 'left' | 'right' | null
  /** B: the value is a slime itself (its sprite sits above the number). */
  readonly slime: boolean
  readonly look: Look
}

export interface Scene {
  readonly s: number
  readonly font: number
  /** full: the whole picture; zoom: only the split or merge in progress; compact: smaller parts. */
  readonly mode: 'full' | 'zoom' | 'compact'
  readonly bodies: readonly Body[]
  readonly tokens: readonly Token[]
}

/** The little slime sprite above a value in B, and the eyes on A's and C's blobs, in units. */
export const SLIME_W = 10
export const SLIME_H = 8
export const EYES_H = 4

interface Metrics {
  readonly s: number
  readonly font: number
  readonly tokW: number
  readonly tokH: number
  readonly pad: number
}

function metrics(box: Box, n: number, shrink = false): Metrics {
  const s = pixelScale(Math.min(box.height / 160, box.width / Math.max(1, n) / 32), 3)
  const font = shrink ? 10 : Math.max(9 * s, 10)
  return {
    s,
    font,
    tokW: Math.round(font * 1.4) + 2 * s,
    tokH: font + 4 * s,
    pad: 2 * s,
  }
}

const roleOf = (step: SortStep, value: number): Token['role'] =>
  step.sorted ? 'final' : step.fronts?.includes(value) ? 'compare' : null
const sideOf = (step: SortStep, value: number): Token['side'] =>
  step.fronts?.[0] === value ? 'left' : step.fronts?.[1] === value ? 'right' : null

const isMerging = (step: SortStep) =>
  step.family !== null &&
  (step.event === 'compare' || step.event === 'take' || step.event === 'rest')

/** The two halves and the parent of the merge in progress, if any. */
function familyOf(step: SortStep) {
  const f = step.family
  if (!f) return null
  const get = (lo: number, hi: number) => step.groups.find((g) => g.lo === lo && g.hi === hi)
  return { ...f, parent: get(f.lo, f.hi), left: get(f.lo, f.mid), right: get(f.mid, f.hi) }
}

// ---------- A. Split tree ----------

function tree(step: SortStep, box: Box, n: number): Scene {
  const levels = depthOf(n) + 1
  const full = metrics(box, n)
  const need = (m: Metrics) => m.tokH + 2 * m.pad + EYES_H * m.s + 2 * m.s
  const zoom = box.height / levels < need(full)
  const m = zoom ? metrics(box, n, box.height < 120) : full
  const fam = familyOf(step)
  // Full: every group on its level. Zoom: only the split or merge in progress, on two levels.
  let shown: { group: SlimeGroup; level: number }[]
  let span = { lo: 0, hi: n }
  let rows = levels
  if (!zoom) {
    shown = step.groups.map((group) => ({ group, level: group.depth }))
  } else if (fam) {
    span = { lo: fam.lo, hi: fam.hi }
    rows = 2
    shown = [fam.parent, fam.left, fam.right]
      .filter((g): g is SlimeGroup => g !== undefined)
      .map((group) => ({ group, level: group.depth === fam.depth ? 0 : 1 }))
  } else {
    rows = 1
    shown = step.groups.map((group) => ({ group, level: 0 }))
  }
  const levelH = box.height / rows
  const cw = box.width / (span.hi - span.lo)
  const col = (i: number) => Math.round((i - span.lo + 0.5) * cw)
  const bodies: Body[] = []
  const tokens: Token[] = []
  for (const { group, level } of shown) {
    const top = Math.round(level * levelH + m.s)
    const tokY = top + EYES_H * m.s + m.pad
    const first = group.lo + group.taken
    const isParent = fam && group.lo === fam.lo && group.hi === fam.hi && isMerging(step)
    const look: Look =
      step.event === 'compare' && fam
        ? group.lo === fam.lo && group.hi === fam.mid
          ? 'right'
          : group.lo === fam.mid && group.hi === fam.hi
            ? 'left'
            : null
        : null
    if (group.values.length === 0) {
      // The merged slime-to-be: an outline of where it will form.
      if (isParent) {
        const x = col(group.lo) - m.tokW / 2 - m.pad
        bodies.push({
          key: group.key,
          kind: 'blob-empty',
          x,
          y: top,
          w: col(group.hi - 1) + m.tokW / 2 + m.pad - x,
          h: EYES_H * m.s + m.tokH + 2 * m.pad,
        })
      }
      continue
    }
    const start = isParent ? group.lo : first
    const x = col(start) - m.tokW / 2 - m.pad
    const right = col(start + group.values.length - 1) + m.tokW / 2 + m.pad
    bodies.push({
      key: group.key,
      kind: 'blob',
      x,
      y: top,
      w: right - x,
      h: EYES_H * m.s + m.tokH + 2 * m.pad,
      look,
    })
    group.values.forEach((value, j) => {
      tokens.push({
        value,
        x: col(start + j) - m.tokW / 2,
        y: tokY,
        w: m.tokW,
        h: m.tokH,
        role: roleOf(step, value),
        side: sideOf(step, value),
        slime: false,
        look: null,
      })
    })
  }
  return { s: m.s, font: m.font, mode: zoom ? 'zoom' : 'full', bodies, tokens }
}

// ---------- A row of groups with gaps (B and C) ----------

interface RowItem {
  readonly group: SlimeGroup
  /** The values in display order (a merging left half is turned round: its front faces in). */
  readonly values: readonly number[]
}

function rowItems(step: SortStep): RowItem[] {
  const fam = familyOf(step)
  const merging = fam && isMerging(step)
  return step.groups
    .filter((g) => !(merging && fam.parent && g.key === fam.parent.key))
    .map((group) => ({
      group,
      values:
        merging && fam.left && group.key === fam.left.key
          ? [...group.values].reverse()
          : group.values,
    }))
}

/** x of each value and each group's span in one row with gaps between groups, centered. */
function rowLayout(
  items: readonly RowItem[],
  box: Box,
  m: Metrics,
  extraGaps: ReadonlySet<string> = new Set(),
) {
  const count = items.reduce((sum, it) => sum + it.values.length, 0)
  const groupsShown = items.filter((it) => it.values.length > 0)
  // Real gaps of water (or floor) between groups, so a split reads at a glance.
  const gap = Math.max(4 * m.s, Math.round(box.width * 0.07))
  const gaps = Math.max(0, groupsShown.length - 1) + extraGaps.size
  const margin = m.pad + m.s
  const cw = Math.min(m.tokW * 1.5, (box.width - 2 * margin - gaps * gap) / Math.max(1, count))
  const total = count * cw + gaps * gap
  let x = Math.round((box.width - total) / 2)
  const at = new Map<number, number>()
  const spans = new Map<string, { x: number; w: number }>()
  let seen = 0
  for (const it of groupsShown) {
    if (seen > 0) x += gap
    if (extraGaps.has(it.group.key)) x += gap
    const start = x
    for (const value of it.values) {
      at.set(value, x + cw / 2)
      x += cw
    }
    spans.set(it.group.key, { x: start, w: x - start })
    seen++
  }
  return { at, spans, cw }
}

// ---------- B. Slime arena ----------

function arena(step: SortStep, box: Box, n: number): Scene {
  const full = metrics(box, n)
  const plank = 2 * full.s
  const rowNeed = (m: Metrics, sprite: boolean) =>
    (sprite ? SLIME_H * m.s : 2 * m.s) + m.tokH + plank + 2 * m.s
  const compact = box.height < 2 * rowNeed(full, true) + 4 * full.s
  const m = compact ? metrics(box, n, true) : full
  const sprite = !compact
  const tokH = m.tokH + (sprite ? SLIME_H * m.s : 0)
  const fam = familyOf(step)
  const merging = fam !== null && isMerging(step)
  const items = rowItems(step)
  // A gap for the gate between the two halves while they queue.
  const gateBefore = merging && fam.right ? new Set([fam.right.key]) : new Set<string>()
  const { at, spans, cw } = rowLayout(items, box, m, gateBefore)
  // Full: the floor low, the merge platform well above it, so the climb through the gate shows.
  const floorY = compact ? box.height - plank - m.s : Math.round(box.height * 0.78)
  const tokTop = (rowFloor: number) => rowFloor - tokH
  const bodies: Body[] = []
  const tokens: Token[] = []
  for (const it of items) {
    const span = spans.get(it.group.key)
    if (!span) continue
    bodies.push({
      key: `plank-${it.group.key}`,
      kind: 'plank',
      x: span.x,
      y: floorY,
      w: span.w,
      h: plank,
    })
    for (const value of it.values) {
      const look: Look =
        step.event === 'compare' && fam
          ? fam.left?.values[0] === value
            ? 'right'
            : fam.right?.values[0] === value
              ? 'left'
              : null
          : null
      tokens.push({
        value,
        x: Math.round((at.get(value) ?? 0) - m.tokW / 2),
        y: tokTop(floorY),
        w: m.tokW,
        h: tokH,
        role: roleOf(step, value),
        side: sideOf(step, value),
        slime: sprite,
        look,
      })
    }
  }
  if (merging && fam.right && fam.left) {
    // The gate stands in the gap between the two queues; the merged line forms above it.
    const leftSpan = spans.get(fam.left.key)
    const rightSpan = spans.get(fam.right.key)
    const gateX = Math.round(
      leftSpan && rightSpan
        ? (leftSpan.x + leftSpan.w + rightSpan.x) / 2
        : (rightSpan?.x ?? (leftSpan ? leftSpan.x + leftSpan.w : box.width / 2)) - cw / 2,
    )
    const gateH = Math.min(tokH + 2 * m.s, floorY)
    bodies.push({
      key: 'gate',
      kind: 'gate',
      x: gateX - m.s,
      y: floorY - gateH,
      w: 2 * m.s,
      h: gateH,
    })
    const size = fam.hi - fam.lo
    const platformY = compact
      ? Math.max(tokH + m.s, Math.round(floorY - tokH - plank - 4 * m.s))
      : Math.max(tokH + m.s, Math.round(box.height * 0.42))
    const left = Math.min(
      box.width - m.s - size * cw,
      Math.max(m.s, Math.round(gateX - (size * cw) / 2)),
    )
    bodies.push({
      key: `platform-${fam.parent?.key ?? ''}`,
      kind: 'platform',
      x: left,
      y: platformY,
      w: Math.round(size * cw),
      h: plank,
    })
    fam.parent?.values.forEach((value, j) => {
      tokens.push({
        value,
        x: Math.round(left + (j + 0.5) * cw - m.tokW / 2),
        y: platformY - tokH,
        w: m.tokW,
        h: tokH,
        role: roleOf(step, value),
        side: null,
        slime: sprite,
        look: null,
      })
    })
  }
  return { s: m.s, font: m.font, mode: compact ? 'compact' : 'full', bodies, tokens }
}

// ---------- C. Mitosis pond ----------

function pond(step: SortStep, box: Box, n: number): Scene {
  const full = metrics(box, n)
  const blobH = (m: Metrics, eyes: boolean) => (eyes ? EYES_H * m.s : 0) + m.tokH + 2 * m.pad
  const compact = box.height < blobH(full, true) + 8 * full.s
  const m = compact ? metrics(box, n, true) : full
  const eyes = !compact
  const fam = familyOf(step)
  const merging = fam !== null && isMerging(step)
  // While merging, the parent floats between its two halves: left half, parent, right half.
  const items = rowItems(step)
  const order: RowItem[] = []
  for (const it of items) {
    order.push(it)
    if (merging && fam.left && it.group.key === fam.left.key && fam.parent) {
      order.push({ group: fam.parent, values: fam.parent.values })
    }
  }
  if (merging && fam.parent && !fam.left) {
    const at = order.findIndex((it) => fam.right && it.group.key === fam.right.key)
    order.splice(at < 0 ? order.length : at, 0, { group: fam.parent, values: fam.parent.values })
  }
  const { at, spans } = rowLayout(order, box, m)
  const h = blobH(m, eyes)
  const top = Math.round((box.height - h) / 2)
  const bodies: Body[] = [
    {
      key: 'water',
      kind: 'water',
      x: 0,
      y: Math.round(top + h * 0.6),
      w: box.width,
      h: box.height - Math.round(top + h * 0.6),
    },
  ]
  const tokens: Token[] = []
  for (const it of order) {
    const span = spans.get(it.group.key)
    if (!span || it.values.length === 0) continue
    const look: Look =
      step.event === 'compare' && fam
        ? it.group.key === fam.left?.key
          ? 'right'
          : it.group.key === fam.right?.key
            ? 'left'
            : null
        : null
    bodies.push({
      key: it.group.key,
      kind: 'blob',
      x: span.x - m.pad,
      y: top,
      w: span.w + 2 * m.pad,
      h,
      ...(eyes ? { look } : {}),
    })
    for (const value of it.values) {
      tokens.push({
        value,
        x: Math.round((at.get(value) ?? 0) - m.tokW / 2),
        y: top + (eyes ? EYES_H * m.s : 0) + m.pad,
        w: m.tokW,
        h: m.tokH,
        role: roleOf(step, value),
        side: sideOf(step, value),
        slime: false,
        look: null,
      })
    }
  }
  return { s: m.s, font: m.font, mode: compact ? 'compact' : 'full', bodies, tokens }
}

export function sceneOf(design: Design, step: SortStep, box: Box, n: number): Scene {
  if (design === 'tree') return tree(step, box, n)
  if (design === 'arena') return arena(step, box, n)
  return pond(step, box, n)
}
