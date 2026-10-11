import type { Frame, Level, TraceColumn, TraceSpec, TraceValue } from './types'

export interface TraceRow {
  /** Stable identity from the rowKey values, for React keys. */
  readonly key: string
  /** Raw values, one per column. */
  readonly cells: readonly TraceValue[]
  /** True if the frame on screen added or updated this row. */
  readonly isCurrent: boolean
  /** True if this row begins a new group (drawn with a separator); never the first row. */
  readonly startsGroup: boolean
}

function rowKeyOf(variables: Frame['variables'], trace: TraceSpec): string | null {
  if (!variables) return null
  const values = trace.rowKey.map((name) => variables[name] ?? null)
  return values.some((value) => value === null) ? null : JSON.stringify(values)
}

/**
 * The trace table as of frame `index`, rebuilt from the first frame so that stepping back
 * simply removes rows. A frame whose rowKey matches an existing row updates that row (an
 * answer filling in its question) instead of adding a duplicate.
 */
export function buildTraceRows(
  frames: readonly Frame[],
  index: number,
  trace: TraceSpec,
): TraceRow[] {
  const rows: { key: string; cells: TraceValue[]; group: TraceValue }[] = []
  const positions = new Map<string, number>()
  let currentKey: string | null = null

  const last = Math.min(index, frames.length - 1)
  for (let k = 0; k <= last; k++) {
    const variables = frames[k]?.variables
    const key = rowKeyOf(variables, trace)
    if (k === last) currentKey = key
    if (key === null || !variables) continue

    const cells = trace.columns.map((column) => variables[column.variable] ?? null)
    const group = trace.group ? (variables[trace.group.variable] ?? null) : null
    const existing = positions.get(key)
    if (existing === undefined) {
      positions.set(key, rows.length)
      rows.push({ key, cells, group })
    } else {
      const row = rows[existing]
      if (row) row.cells = cells
    }
  }

  return rows.map((row, k) => ({
    key: row.key,
    cells: row.cells,
    isCurrent: row.key === currentKey,
    startsGroup: k > 0 && trace.group !== undefined && rows[k - 1]?.group !== row.group,
  }))
}

/** How one cell reads: "—" for no value, Explorer numbers shifted by the column's offset. */
export function formatTraceValue(value: TraceValue, column: TraceColumn, level: Level): string {
  if (value === null) return '—'
  if (typeof value === 'number') {
    return String(level === 'explorer' ? value + (column.explorerOffset ?? 0) : value)
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  return value
}

/** The stage caption for the frame's group, e.g. "pass i = 1" or "round 2"; null if none. */
export function groupCaption(
  frame: Frame,
  trace: TraceSpec | undefined,
  level: Level,
): string | null {
  const group = trace?.group
  const value = group ? frame.variables?.[group.variable] : undefined
  if (!group || typeof value !== 'number') return null
  const column = trace.columns.find((c) => c.variable === group.variable)
  const note = group.note?.(frame, level)
  const name =
    level === 'explorer'
      ? `${group.name.explorer} ${String(value + (column?.explorerOffset ?? 0))}`
      : `${group.name.engineer} ${group.variable} = ${String(value)}`
  return note ? `${name}: ${note}` : name
}
