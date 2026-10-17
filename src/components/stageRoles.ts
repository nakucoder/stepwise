import type { Frame, HighlightRole } from '../engine/types'

/** When a value has several roles, show the most specific one. */
const ROLE_PRIORITY: readonly HighlightRole[] = ['swapping', 'comparing', 'pivot', 'sorted']

/** The role a value at `index` shows on a row (the main row, or merge sort's second row). */
export function roleAt(
  row: { readonly highlights?: Frame['highlights'] },
  index: number,
): HighlightRole | null {
  return ROLE_PRIORITY.find((role) => row.highlights?.[role]?.includes(index)) ?? null
}

// ---------- The marks under the values, for a scene that draws both rows ----------
// Bars draw merge sort's second row with its own marks under it. A character's scene that
// draws both rows itself (`CharacterScene.twoRows`) has one row of marks, so each column's marks
// come from both rows: the second row's role where it has one (the fronts being compared),
// and the pointers of both (the main row's k with the second row's i and j).

/** The pointers under the values: the main row's, plus the second row's when `bothRows`. */
export function markPointers(frame: Frame, bothRows: boolean): Readonly<Record<string, number>> {
  return bothRows ? { ...frame.pointers, ...frame.buffer?.pointers } : (frame.pointers ?? {})
}

/** The role under column `index`: the second row's when `bothRows` and it has one, else the main row's. */
export function markRole(frame: Frame, index: number, bothRows: boolean): HighlightRole | null {
  const second = bothRows && frame.buffer ? roleAt(frame.buffer, index) : null
  return second ?? roleAt(frame, index)
}

/** The most pointers that share one column in any frame (the stage reserves that many rows). */
export function pointerRowsOf(frames: readonly Frame[], bothRows: boolean): number {
  return Math.max(
    1,
    ...frames.map((frame) => {
      const at = Object.values(markPointers(frame, bothRows))
      return Math.max(0, ...at.map((k) => at.filter((other) => other === k).length))
    }),
  )
}
