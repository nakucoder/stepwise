import { useId } from 'react'
import { CHARACTERS } from '../characters/registry'
import type { CharacterId } from '../engine/types'
import { usePreferences, type Look } from '../preferences/preferences'

/**
 * Bars or the algorithm's character (bubble sort: "Ducks"), in both levels. Selected = yellow
 * fill + check mark, as everywhere. The "Show as" label is visible in the phone Menu and hidden
 * on the stage, where the switch sits right on the data it changes. An algorithm without a
 * character has no switch.
 */
export function LookToggle({ character }: { readonly character: CharacterId | undefined }) {
  const { look, setLook } = usePreferences()
  const labelId = useId()
  if (!character) return null
  const { name, icon: Icon } = CHARACTERS[character]
  const looks: readonly { id: Look; label: string }[] = [
    { id: 'bars', label: 'Bars' },
    { id: 'character', label: name },
  ]
  return (
    <div className="look-toggle">
      <span id={labelId} className="look-toggle-label">
        Show as
      </span>
      <div className="look-toggle-track" role="group" aria-labelledby={labelId}>
        {looks.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={look === id}
            onClick={() => {
              setLook(id)
            }}
          >
            {id === 'character' && Icon && (
              <span className="look-toggle-icon">
                <Icon />
              </span>
            )}
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
