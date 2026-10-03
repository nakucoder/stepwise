import { useId } from 'react'
import type { Level } from '../engine/types'
import { usePreferences } from '../preferences/preferences'

const LEVELS: readonly { id: Level; label: string }[] = [
  { id: 'explorer', label: 'Explorer' },
  { id: 'engineer', label: 'Engineer' },
]

/** Two pressed-state buttons. The selected level gets the yellow fill and a check mark. */
export function LevelToggle() {
  const { level, setLevel } = usePreferences()
  const labelId = useId()

  return (
    <div className="level-toggle">
      <span id={labelId} className="level-toggle-label">
        Level
      </span>
      <div className="level-toggle-track" role="group" aria-labelledby={labelId}>
        {LEVELS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={level === id}
            onClick={() => {
              setLevel(id)
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
