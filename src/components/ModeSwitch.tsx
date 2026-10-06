import { useId } from 'react'

export type Mode = 'watch' | 'do'

const MODES: readonly { id: Mode; label: string }[] = [
  { id: 'watch', label: 'Watch' },
  { id: 'do', label: 'Do it' },
]

interface ModeSwitchProps {
  readonly mode: Mode
  readonly onChange: (mode: Mode) => void
}

/** Watch the steps play, or do them yourself. Selected = yellow fill + check mark, as everywhere. */
export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  const labelId = useId()
  return (
    <div className="mode-switch">
      <span id={labelId} className="visually-hidden">
        Mode
      </span>
      <div className="mode-switch-track" role="group" aria-labelledby={labelId}>
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => {
              if (mode !== id) onChange(id)
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
