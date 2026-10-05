import { useId } from 'react'
import { usePreferences, type Look } from '../preferences/preferences'
import { PixelDuck } from './PixelDuck'

const LOOKS: readonly { id: Look; label: string }[] = [
  { id: 'bars', label: 'Bars' },
  { id: 'ducks', label: 'Ducks' },
]

/**
 * Bars or Bath time ducks, in both levels. Selected = yellow fill + check mark, as everywhere.
 * The "Show as" label is visible in the phone Menu and hidden on the stage, where the
 * switch sits right on the data it changes.
 */
export function LookToggle() {
  const { look, setLook } = usePreferences()
  const labelId = useId()
  return (
    <div className="look-toggle">
      <span id={labelId} className="look-toggle-label">
        Show as
      </span>
      <div className="look-toggle-track" role="group" aria-labelledby={labelId}>
        {LOOKS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={look === id}
            onClick={() => {
              setLook(id)
            }}
          >
            {id === 'ducks' && (
              <span className="look-toggle-icon">
                <PixelDuck />
              </span>
            )}
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
