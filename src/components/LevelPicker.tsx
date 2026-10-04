import { useEffect, useId, useRef } from 'react'
import type { Level } from '../engine/types'
import { usePreferences } from '../preferences/preferences'
import './LevelPicker.css'

interface Choice {
  readonly level: Level
  readonly title: string
  readonly description: string
}

const CHOICES: readonly Choice[] = [
  {
    level: 'explorer',
    title: 'Explorer',
    description:
      'Plain words, big pictures and bright colors. Great for kids and anyone new to this.',
  },
  {
    level: 'engineer',
    title: 'Engineer',
    description: 'Code, Big O and the full trace table, in precise terms.',
  },
]

/** A small taste of what each level looks like. Decorative only. */
function Preview({ level }: { level: Level }) {
  if (level === 'explorer') {
    return (
      <div className="level-preview level-preview-explorer" aria-hidden="true">
        <span className="level-preview-stripes">
          <span style={{ background: 'var(--cat-searching)' }} />
          <span style={{ background: 'var(--cat-linked-lists)' }} />
          <span style={{ background: 'var(--cat-trees)' }} />
          <span style={{ background: 'var(--cat-pattern-matching)' }} />
        </span>
        <span className="level-preview-words">Is 5 bigger than 3?</span>
      </div>
    )
  }
  return (
    <div className="level-preview level-preview-engineer" aria-hidden="true">
      <code>
        <span className="level-preview-line">if a[j] &gt; a[j + 1]:</span>
      </code>
      <span className="level-preview-bigo">
        <span className="level-preview-circled">O(n²)</span> time
      </span>
    </div>
  )
}

interface LevelPickerProps {
  /** Called after the chosen level is saved, e.g. to go on to the topics. */
  readonly onChoose?: (level: Level) => void
}

/**
 * The welcome screen. Shown on the first visit, before any page, until the user picks a
 * learning level, and at /start whenever they want to see it again; then the saved level is
 * marked as current. We never ask for an age: the user chooses how they want to learn.
 */
export function LevelPicker({ onChoose }: LevelPickerProps) {
  const { level: currentLevel, setLevel } = usePreferences()
  const headingId = useId()
  const mainRef = useRef<HTMLElement>(null)

  // Start focus at the top of the picker (not on a card, which would look pre-selected).
  // Screen readers announce the question; one Tab reaches the first choice.
  useEffect(() => {
    mainRef.current?.focus()
  }, [])

  return (
    <main
      ref={mainRef}
      id="main"
      tabIndex={-1}
      className="level-picker"
      aria-labelledby={headingId}
    >
      <h1 id={headingId}>How do you want to learn?</h1>
      <p className="level-picker-lede">
        {currentLevel
          ? 'Keep your level or switch, then pick a topic.'
          : 'Pick a level to start. You can switch any time.'}
      </p>

      <div className="level-picker-choices">
        {CHOICES.map(({ level, title, description }) => {
          const isCurrent = level === currentLevel
          const id = (part: string) => `${headingId}-${level}-${part}`
          return (
            <button
              key={level}
              type="button"
              className={`level-choice level-choice-${level}`}
              // Named by the title alone; the rest is read as a description, not repeated.
              aria-labelledby={id('title')}
              aria-describedby={
                isCurrent ? `${id('current')} ${id('description')}` : id('description')
              }
              onClick={() => {
                setLevel(level)
                onChoose?.(level)
              }}
            >
              <Preview level={level} />
              {isCurrent && (
                <span id={id('current')} className="level-choice-current">
                  ✓ Current level
                </span>
              )}
              <span id={id('title')} className="level-choice-title">
                {title}
              </span>
              <span id={id('description')} className="level-choice-description">
                {description}
              </span>
            </button>
          )
        })}
      </div>

      <p className="level-picker-note">
        This choice is saved on this device only. Change it later with the Level buttons at the top.
      </p>
    </main>
  )
}
