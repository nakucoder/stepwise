import { useLayoutEffect, useMemo, useRef } from 'react'
import { buildTraceRows, formatTraceValue } from '../engine/trace'
import type { Frame, Level, TraceSpec } from '../engine/types'
import { keepInView } from '../lib/keepInView'
import './TraceTable.css'

interface TraceTableProps {
  readonly frames: readonly Frame[]
  /** The frame on screen; rows are built up to and including it. */
  readonly index: number
  readonly trace: TraceSpec
  readonly level: Level
  /** Id of the heading that names the table. */
  readonly labelledBy: string
}

/**
 * The trace table from design D: one row per comparison, rounds separated by a dashed rule,
 * the current row highlighted and kept in view (scrolling only the table).
 */
export function TraceTable({ frames, index, trace, level, labelledBy }: TraceTableProps) {
  const rows = useMemo(() => buildTraceRows(frames, index, trace), [frames, index, trace])
  const scrollRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLTableSectionElement>(null)
  const currentRef = useRef<HTMLTableRowElement>(null)

  useLayoutEffect(() => {
    if (scrollRef.current && currentRef.current) {
      keepInView(scrollRef.current, currentRef.current, headRef.current?.offsetHeight ?? 0)
    }
  }, [rows])

  if (rows.length === 0) {
    return <p className="empty-note">Rows appear here as the steps run.</p>
  }

  return (
    <div ref={scrollRef} className="trace-scroll">
      <table className="trace-table" aria-labelledby={labelledBy}>
        <thead ref={headRef}>
          <tr>
            {trace.columns.map((column) => (
              <th key={column.variable} scope="col">
                {column.label[level]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              ref={row.isCurrent ? currentRef : undefined}
              className={
                [row.isCurrent && 'is-current', row.startsGroup && 'starts-group']
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              aria-current={row.isCurrent ? 'step' : undefined}
            >
              {trace.columns.map((column, k) => {
                const text = formatTraceValue(row.cells[k] ?? null, column, level)
                return (
                  <td key={column.variable} data-value={text}>
                    <span>{text}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
