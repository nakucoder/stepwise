import { useId } from 'react'
import type { Level, PivotRule } from '../engine/types'
import { capitalize, PIVOT_LABEL, PIVOT_NAMES, pivotChoices } from './pivotWords'

/**
 * Quick sort's pivot rule, chosen before a run (Do it's challenge, Watch's settings): the
 * leader (Explorer: the last one, the middle one, a surprise one) or the pivot (Engineer: first,
 * last, middle, random). Selected = yellow fill + check mark, as everywhere; each choice is its
 * own button, so the row can wrap in a narrow place.
 * A new rule makes a new run, which starts over.
 */
export function PivotPicker({
  rule,
  level,
  onChange,
}: {
  readonly rule: PivotRule
  readonly level: Level
  readonly onChange: (rule: PivotRule) => void
}) {
  const labelId = useId()
  return (
    <div className="pivot-picker">
      <span id={labelId} className="pivot-picker-label">
        {PIVOT_LABEL[level]}
      </span>
      <div className="pivot-picker-track" role="group" aria-labelledby={labelId}>
        {pivotChoices(level, rule).map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={rule === choice}
            onClick={() => {
              if (choice !== rule) onChange(choice)
            }}
          >
            {capitalize(PIVOT_NAMES[level][choice])}
          </button>
        ))}
      </div>
    </div>
  )
}
