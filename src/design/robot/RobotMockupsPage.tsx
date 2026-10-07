/**
 * TEMPORARY (design/robot, never merged): a page for comparing three robot designs for
 * selection sort on a real phone, through the PR preview. Each design shows the same five
 * steps, beside the real bars for the same step. Sounds are made in code and play only when
 * their button is tapped.
 */
import { useEffect, useId, useState } from 'react'
import { Stage } from '../../components/Stage'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { usePreferences } from '../../preferences/preferences'
import { RobotScene, type Design } from './RobotScene'
import { playRobotSound, type RobotSound } from './sounds'
import { barsFrame, POINTER_LABELS, STEPS, type StepId } from './steps'
import './RobotMockups.css'

const DESIGNS: readonly { id: Design; name: string; summary: string }[] = [
  {
    id: 'gantry',
    name: 'A. Gantry',
    summary:
      'A crane on a rail above the crates. Its camera beams down at each crate; the claw drops on a cable, lifts the smallest over the others and sets it down at the front.',
  },
  {
    id: 'hopper',
    name: 'B. Hopper',
    summary:
      'A small robot standing on the smallest so far, like the ducks ride their water. It beams across at each crate, hops onto a new smallest, and jumps it to the front.',
  },
  {
    id: 'rover',
    name: 'C. Rover',
    summary:
      'A rover in a lane in front of the crates. Its periscope lights up each crate; it pulls the smallest down onto its arm, drives it to the front and pushes it back in.',
  },
]

const SOUNDS: readonly { id: RobotSound; label: string; when: string }[] = [
  { id: 'scan', label: 'Scan', when: 'every comparison (soft)' },
  { id: 'lock', label: 'Lock-on', when: 'a new smallest so far' },
  { id: 'claw', label: 'Claw', when: 'grab, carry and set down' },
  { id: 'finale', label: 'Finale', when: 'everything sorted' },
]

/** A row of pressed/unpressed buttons: selected = yellow fill + check mark, as everywhere. */
function Choice<T extends string>(props: {
  readonly label: string
  /** Hide the label visually (it still names the group). */
  readonly quiet?: boolean
  readonly options: readonly { readonly id: T; readonly label: string }[]
  readonly value: T
  readonly onChange: (value: T) => void
}) {
  const labelId = useId()
  return (
    <div className="mock-choice">
      <span id={labelId} className={props.quiet ? 'visually-hidden' : 'mock-choice-label'}>
        {props.label}
      </span>
      <div className="mock-choice-track" role="group" aria-labelledby={labelId}>
        {props.options.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={props.value === id}
            onClick={() => {
              props.onChange(id)
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RobotMockupsPage() {
  const { level, theme, setTheme } = usePreferences()
  const systemReduced = useReducedMotion()
  const [stepId, setStepId] = useState<StepId>('compare')
  const [motion, setMotion] = useState<'full' | 'reduced'>(systemReduced ? 'reduced' : 'full')
  const [replay, setReplay] = useState(0)
  const step = STEPS.find((candidate) => candidate.id === stepId) ?? STEPS[0]

  useEffect(() => {
    document.title = 'Robot mockups (preview only) – Stepwise'
  }, [])

  if (!step) return null
  const animate = motion === 'full'

  return (
    <main id="main" tabIndex={-1} className="robot-mockups" data-motion={motion}>
      <header className="mock-intro">
        <h1>Robot mockups for selection sort</h1>
        <p>
          Preview only: this page is on the <code>design/robot</code> branch, which is never merged.
          Pick a step, then scroll through A, B and C. The bars beside each robot show the same
          step.
        </p>
      </header>

      <div className="mock-controls">
        <Choice
          label="Step"
          quiet
          options={STEPS.map(({ id, label }) => ({ id, label }))}
          value={stepId}
          onChange={(id) => {
            setStepId(id)
            setReplay((n) => n + 1)
          }}
        />
        <button
          type="button"
          className="mock-replay"
          onClick={() => {
            setReplay((n) => n + 1)
          }}
        >
          Replay
        </button>
      </div>

      <div className="mock-settings">
        <Choice
          label="Theme"
          options={[
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
          ]}
          value={theme}
          onChange={setTheme}
        />
        <Choice
          label="Motion"
          options={[
            { id: 'full', label: 'Full' },
            { id: 'reduced', label: 'Reduced' },
          ]}
          value={motion}
          onChange={setMotion}
        />
        <div
          className="mock-sounds"
          role="group"
          aria-label="Sounds (made in code; silent until tapped)"
        >
          <span className="mock-choice-label">Sounds</span>
          <div className="mock-sound-buttons">
            {SOUNDS.map(({ id, label, when }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  playRobotSound(id)
                }}
              >
                <span className="mock-sound-name">▶ {label}</span>
                <span className="mock-sound-when">{when}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mock-caption" aria-live="polite">
        <strong>{step.label}:</strong> {step.caption}
      </p>

      {DESIGNS.map((design) => (
        <section key={design.id} className="mock-design" aria-labelledby={`mock-${design.id}`}>
          <h2 id={`mock-${design.id}`}>{design.name}</h2>
          <p className="mock-summary">{design.summary}</p>
          <div className="mock-pair">
            <div className="mock-stage mock-robot">
              <RobotScene
                design={design.id}
                step={step}
                motion={animate}
                replay={replay}
                title={design.name}
              />
            </div>
            <div className="mock-stage mock-bars">
              {/* With reduced motion the bars remount on each step, so nothing slides. */}
              <Stage
                key={animate ? 'bars' : `${step.id}-${String(replay)}`}
                frame={barsFrame(step)}
                level={level ?? 'engineer'}
                pointerLabels={POINTER_LABELS}
                stepDelayMs={900}
                caption="Bars, same step"
              />
            </div>
          </div>
        </section>
      ))}
    </main>
  )
}
