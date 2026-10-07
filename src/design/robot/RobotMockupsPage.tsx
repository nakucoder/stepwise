/**
 * TEMPORARY (design/robot, never merged): a page for comparing four robot designs for
 * selection sort on a real phone, through the PR preview. Each design shows the same five
 * steps, beside the real bars for the same step. Sounds are made in code and play only when
 * their button is tapped; each has an old version and three new ones to compare.
 */
import { useEffect, useId, useState } from 'react'
import { Stage } from '../../components/Stage'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { usePreferences } from '../../preferences/preferences'
import { RobotScene, type Design } from './RobotScene'
import {
  playRobotSound,
  playRound,
  SOUND_VARIANTS,
  type RobotSound,
  type VariantId,
} from './sounds'
import { barsFrame, HARD_CARRY, POINTER_LABELS, STEPS, type StepId } from './steps'
import './RobotMockups.css'

const DESIGNS: readonly { id: Design; name: string; summary: string }[] = [
  {
    id: 'scout',
    name: 'E. Scout and crane',
    summary:
      'A team of two. The scout (B’s hopper) hops along the crate tops, beams across at each crate and hops onto each new smallest. At the end of the round it waves and its antenna lights up; it steps aside, and a small crane on a thin rail at the top rolls over, lowers its hook, lifts the smallest over the others and sets it down at the front.',
  },
  {
    id: 'boom',
    name: 'F. Hopper with a crane arm',
    summary:
      'One robot: B’s hopper, with a folded crane arm on its back. It hops and scans like B. To carry, it steps onto the next crate, unfolds the arm like a tow truck, hooks the smallest, lifts it over the others, sets it down at the front, and folds the arm back. No jets, no flying.',
  },
  {
    id: 'mix',
    name: 'D. Hopper + claw',
    summary:
      'For comparison (feels like too many ideas). B’s robot, with A’s claw for the carry. It stands on the smallest so far, beams across at each crate and hops onto a new smallest; to carry, it lowers a claw from its belly, lifts the crate on two little jets, over the others, and sets it down at the front.',
  },
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
  { id: 'scan', label: 'Scan', when: 'every comparison: soft, about 15 times a round' },
  { id: 'lock', label: 'Lock-on', when: 'a new smallest so far: "target acquired"' },
  { id: 'claw', label: 'Claw', when: 'the special moment: whine, CLANK, whirr' },
  { id: 'finale', label: 'Finale', when: 'everything sorted: a happy robot' },
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
  /** E and F: the carry on the usual numbers, or the hard case (1 past 9, 7 and 9). */
  const [carryCase, setCarryCase] = useState<'example' | 'hard'>('example')
  const [sound, setSound] = useState<Record<RobotSound, VariantId>>({
    scan: 'v3',
    lock: 'v3',
    claw: 'v3',
    finale: 'v3',
  })
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
          Pick a step, then scroll through E, F, D, A, B and C. The bars beside each robot show the
          same step. The <a href="#mock-sounds-title">sounds</a> are at the end.
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
          label="Carry for E and F"
          options={[
            { id: 'example', label: 'Example' },
            { id: 'hard', label: 'Hard case' },
          ]}
          value={carryCase}
          onChange={(value) => {
            setCarryCase(value)
            setStepId('grab')
            setReplay((n) => n + 1)
          }}
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
      </div>

      <p className="mock-caption" aria-live="polite">
        <strong>{step.label}:</strong> {step.caption}
      </p>

      {DESIGNS.map((design) => {
        const shown =
          step.id === 'grab' &&
          carryCase === 'hard' &&
          (design.id === 'scout' || design.id === 'boom')
            ? HARD_CARRY
            : step
        return (
          <section key={design.id} className="mock-design" aria-labelledby={`mock-${design.id}`}>
            <h2 id={`mock-${design.id}`}>{design.name}</h2>
            <p className="mock-summary">{design.summary}</p>
            {shown !== step && <p className="mock-case">{shown.caption}</p>}
            <div className="mock-pair">
              <div className="mock-stage mock-robot">
                <RobotScene
                  design={design.id}
                  step={shown}
                  motion={animate}
                  replay={replay}
                  title={design.name}
                />
              </div>
              <div className="mock-stage mock-bars">
                {/* With reduced motion the bars remount on each step, so nothing slides. */}
                <Stage
                  key={animate ? `bars-${shown.caption}` : `${shown.id}-${String(replay)}`}
                  frame={barsFrame(shown)}
                  level={level ?? 'engineer'}
                  pointerLabels={POINTER_LABELS}
                  stepDelayMs={900}
                  caption="Bars, same step"
                />
              </div>
            </div>
          </section>
        )
      })}

      <section className="mock-sounds" aria-labelledby="mock-sounds-title">
        <h2 id="mock-sounds-title">Sounds</h2>
        <p className="mock-sounds-note">
          Made in code, silent until you tap. Tapping a version plays it and picks it for “Play a
          round”.
        </p>
        {SOUNDS.map(({ id, label, when }) => {
          const chosen = SOUND_VARIANTS[id].find((variant) => variant.id === sound[id])
          return (
            <div key={id} className="mock-sound-row">
              <Choice
                label={`${label}: ${when}`}
                options={SOUND_VARIANTS[id].map((variant) => ({
                  id: variant.id,
                  label: variant.label,
                }))}
                value={sound[id]}
                onChange={(variant) => {
                  setSound((current) => ({ ...current, [id]: variant }))
                  playRobotSound(id, variant)
                }}
              />
              <p className="mock-sound-summary">{chosen?.summary}</p>
            </div>
          )
        })}
        <button
          type="button"
          className="mock-round"
          onClick={() => {
            playRound(sound)
          }}
        >
          ▶ Play a round
          <span className="mock-sound-when">
            3 scans, lock-on, 2 scans, claw: with the versions picked above
          </span>
        </button>
      </section>
    </main>
  )
}
