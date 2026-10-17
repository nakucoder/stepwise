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
