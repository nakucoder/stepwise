import { useId } from 'react'
import { usePreferences, type Look } from '../preferences/preferences'

const LOOKS: readonly { id: Look; label: string }[] = [
  { id: 'bars', label: 'Bars' },
  { id: 'ducks', label: 'Ducks' },
]

/** Bars or Bath time ducks, in both levels. Selected = yellow fill + check mark, as everywhere. */
export function LookToggle() {
  const { look, setLook } = usePreferences()
  const labelId = useId()
  return (
    <div className="look-toggle" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="visually-hidden">
        Look
      </span>
      {LOOKS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={look === id}
          onClick={() => {
            setLook(id)
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
