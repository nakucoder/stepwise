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
}

/**
 * Engineer's Do it mode: one button over each value on the stage, in a row that lies exactly
 * over the bars (or ducks). Tap or click a value, then its neighbor, to swap them.
 *
 * The row is one tab stop: the arrow keys (and Home / End) move between values, Enter or
 * Space picks, Escape lets go of a picked value. Between questions the buttons stay in place
 * but do nothing (aria-disabled), so focus is never lost.
 */
export function StagePicks({ labels, picked, enabled, onPick, onCancel, groupLabel }: StagePick) {
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
    <div className="stage-picks" role="group" aria-label={groupLabel} onKeyDown={onKeyDown}>
      {labels.map((label, index) => (
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
          aria-disabled={!enabled}
          onFocus={() => {
            setFocusAt(index)
          }}
          onClick={() => {
            if (enabled) onPick(index)
          }}
        />
      ))}
    </div>
  )
}
