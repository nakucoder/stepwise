import { useId, useState, type SyntheticEvent } from 'react'
import {
  describeProblem,
  formatNumbers,
  parseNumbers,
  PRESETS,
  presetNumbers,
} from '../engine/input'
import type { Level } from '../engine/types'

interface NumbersFormProps {
  /** The numbers the algorithm is running on now. */
  readonly numbers: readonly number[]
  readonly level: Level
  /** Run these numbers (from the field or a preset). Called only with valid input. */
  readonly onRun: (numbers: readonly number[]) => void
  /** A message about the numbers on screen, e.g. that a link's numbers couldn't be used. */
  readonly notice?: string
}

/**
 * "Your numbers" in the workspace band. Typing changes nothing until Enter or Run, so the
 * algorithm never restarts halfway through a number. Mistakes are explained under the field
 * while the last good run stays on screen. Presets run in one click.
 */
export function NumbersForm({ numbers, level, onRun, notice }: NumbersFormProps) {
  const id = useId()
  const current = formatNumbers(numbers)
  const [draft, setDraft] = useState(current)
  const [error, setError] = useState<string | null>(null)

  // New numbers from outside (a preset, or a link) replace whatever was typed.
  const [shown, setShown] = useState(current)
  if (shown !== current) {
    setShown(current)
    setDraft(current)
    setError(null)
  }

  const submit = (event: SyntheticEvent) => {
    event.preventDefault()
    const result = parseNumbers(draft)
    if (!result.ok) {
      setError(describeProblem(result.problem, level))
      return
    }
    setError(null)
    setDraft(formatNumbers(result.values))
    onRun(result.values)
  }

  const message = error ?? notice
  const inputId = `${id}-numbers`
  const messageId = `${id}-message`
  const hintId = `${id}-hint`

  return (
    <form className="numbers-form" onSubmit={submit} aria-label="Your numbers">
      <div className="numbers-row">
        <label htmlFor={inputId}>Your numbers</label>
        <input
          id={inputId}
          name="numbers"
          value={draft}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error !== null}
          aria-describedby={`${hintId} ${messageId}`}
          onChange={(event) => {
            setDraft(event.target.value)
          }}
        />
        <button type="submit" className="numbers-run">
          Run
        </button>
      </div>
      <span id={hintId} className="visually-hidden">
        {level === 'explorer'
          ? '2 to 12 whole numbers from 0 to 99. Press Enter or Run to start.'
          : '2–12 integers, 0–99, separated by spaces or commas. Enter or Run restarts.'}
      </span>

      <div className="numbers-presets" role="group" aria-labelledby={`${id}-presets`}>
        <span id={`${id}-presets`}>{level === 'explorer' ? 'Or try' : 'Presets'}</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              onRun(presetNumbers(preset.id, numbers.length))
            }}
          >
            {preset.label[level]}
          </button>
        ))}
      </div>

      {/* Always present, so screen readers announce a message when it appears. */}
      <p
        id={messageId}
        className={error ? 'numbers-message is-error' : 'numbers-message'}
        aria-live="polite"
      >
        {message}
      </p>
    </form>
  )
}
