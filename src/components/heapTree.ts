/**
 * Heap sort's tree (the pyramid): where each position sits, in the SVG's own units. The layout is
 * the run's, from its count: every position keeps its place at every step, so nothing moves but
 * the values, and the tree's box (and the bars under it) keep one height through the run.
 */
import type { Frame, Level } from '../engine/types'

/** A node's radius, the distance between rows, a bottom-row slot's width, and the edge's room. */
export const NODE_R = 14
export const ROW_PITCH = 34
export const SLOT = 36
export const PAD = 3

/**
 * Where heap sort's pyramid ends: its size, or sooner when the last one left is already final
 * (the last extract marks it sorted with a heap of one).
 */
export function heapEnd(frame: Frame): number {
  const size = frame.heap?.size ?? 0
  return Math.min(size, frame.highlights.sorted?.[0] ?? size)
}

/** How many rows a full pyramid of `count` values has (1 → 1, 2–3 → 2, 4–7 → 3, 8–15 → 4). */
export function treeRows(count: number): number {
  return count < 1 ? 1 : Math.floor(Math.log2(count)) + 1
}

/** The SVG's size for a run of `count` values: the bottom row's slots, and every row. */
export function treeBox(count: number): { readonly width: number; readonly height: number } {
  const rows = treeRows(count)
  return {
    width: 2 ** (rows - 1) * SLOT,
    height: (rows - 1) * ROW_PITCH + 2 * NODE_R + 2 * PAD,
  }
}

/** Position k's center: its row from the top, spread evenly across the bottom row's width. */
export function nodeAt(k: number, count: number): { readonly x: number; readonly y: number } {
  const row = Math.floor(Math.log2(k + 1))
  const across = k - (2 ** row - 1)
  const width = treeBox(count).width
  return {
    x: ((across + 0.5) * width) / 2 ** row,
    y: PAD + NODE_R + row * ROW_PITCH,
  }
}

/** The tree's name: Explorer's pyramid, Engineer's heap. */
export const TREE_NAME: Readonly<Record<Level, string>> = {
  explorer: 'The pyramid',
  engineer: 'The heap (tree)',
}

/** The tree for screen readers, row by row from the top. */
export function describeTree(values: readonly number[], level: Level): string {
  const rows: string[] = []
  for (let row = 0; 2 ** row - 1 < values.length; row++) {
    rows.push(values.slice(2 ** row - 1, 2 ** (row + 1) - 1).join(', '))
  }
  if (rows.length === 0) {
    return level === 'explorer'
      ? 'The pyramid is empty: every number is in its place.'
      : 'The heap (tree) is empty.'
  }
  return level === 'explorer'
    ? `The pyramid, from the top: ${rows.join('; then ')}.`
    : `The heap (tree), row by row: ${rows.join('; ')}.`
}
