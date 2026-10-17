import { useRef, useState, type KeyboardEvent } from 'react'

export interface StagePick {
  /** What each value is called, e.g. "a[0] = 5, comparing". */
  readonly labels: readonly string[]
  /** The value picked first, waiting for its neighbor, or null. */
  readonly picked: number | null
  /** Whether a move can be made now (a question is waiting). */
  readonly enabled: boolean
  readonly onPick: (index: number) => void
  readonly onCancel: () => void
  /** Names the group, e.g. "Values: pick one, then its neighbor to swap them". */
  readonly groupLabel: string
  /** The row the buttons lie over: the main row (absent) or the second one (merge sort). */
  readonly row?: 'buffer'
  /** Columns with nothing to pick (an empty place): they stay in the row but do nothing. */
  readonly inactive?: readonly number[]
}

interface StagePicksProps extends StagePick {
  /** Where the row starts, in pixels from the top of the bars and tags (the pick band's top). */
  readonly top?: number | undefined
  /** Where it ends, in pixels from the bottom of the bars and tags (absent: at the bottom). */
  readonly bottom?: number | undefined
}

/**
 * Engineer's Do it mode: one button over each value on the stage, in a row that lies exactly
 * over the bars (or ducks). Tap or click a value, then its neighbor, to swap them. Merge sort's
 * row lies over the second row instead (Stage places it), and its empty places do nothing.
 *
 * The row is one tab stop: the arrow keys (and Home / End) move between values, Enter or
 * Space picks, Escape lets go of a picked value. Between questions the buttons stay in place
 * but do nothing (aria-disabled), so focus is never lost.
 */
export function StagePicks({
  labels,
  picked,
  enabled,
  onPick,
  onCancel,
  groupLabel,
  inactive = [],
  top,
  bottom,
}: StagePicksProps) {
  const [focusAt, setFocusAt] = useState(0)
  const current = Math.min(focusAt, labels.length - 1)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const moveTo = (index: number) => {
    const next = Math.max(0, Math.min(labels.length - 1, index))
    setFocusAt(next)
    buttons.current[next]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      Home: 0,
      End: labels.length - 1,
    }
    const target = moves[event.key]
    if (target !== undefined) {
      event.preventDefault()
      moveTo(target)
    } else if (event.key === 'Escape' && picked !== null) {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <div
      className="stage-picks"
      role="group"
      aria-label={groupLabel}
      style={
        top === undefined && bottom === undefined
          ? undefined
          : { top, ...(bottom !== undefined && { bottom }) }
      }
      onKeyDown={onKeyDown}
    >
      {labels.map((label, index) => {
        const active = enabled && !inactive.includes(index)
        return (
          <button
            key={index}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            className={picked === index ? 'stage-pick is-picked' : 'stage-pick'}
            tabIndex={index === current ? 0 : -1}
            aria-label={label}
            aria-pressed={picked === index}
            aria-disabled={!active}
            onFocus={() => {
              setFocusAt(index)
            }}
            onClick={() => {
              if (active) onPick(index)
            }}
          />
        )
      })}
    </div>
  )
}
