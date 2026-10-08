/**
 * TEMPORARY (design/penguins, never merged): a page for comparing three penguin designs for
 * insertion sort on a real phone, through the PR preview. Each design shows the same seven
 * steps beside the real bars for the same step, in a box the size of a real stage (including
 * the tightest one: a phone on its side at 130% text). Sounds play only when tapped.
 */
import { useEffect, useId, useState } from 'react'
import { Stage } from '../../components/Stage'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { usePreferences } from '../../preferences/preferences'
import type { Design } from './layout'
import { PenguinScene } from './PenguinScene'
import {
  playPenguinSound,
  playRound,
  SOUND_VARIANTS,
  type PenguinSound,
  type VariantId,
} from './sounds'
import { POINTER_LABELS, STEPS, type StepId } from './steps'
import './PenguinMockups.css'

const DESIGNS: readonly { id: Design; name: string; summary: string }[] = [
  {
    id: 'pillars',
    name: 'A. Ice pillars',
    summary:
      'Each value is an ice pillar with a penguin on top. The one being placed glides forward into a lane on the ice and waits there while the bigger ones slide right; then it belly-slides along the lane and back into its gap.',
  },
  {
    id: 'bricks',
    name: 'B. Snow-brick towers',
    summary:
      'Each value is a tower of snow bricks. The one being placed rides out on a little wooden sled into the lane; the bigger towers slide right; then the sled zooms along the lane and the tower slides off it into its gap.',
  },
  {
    id: 'shelf',
    name: 'C. Ice shelf',
    summary:
      'Each value is a glossy ice block. The one being placed rises onto a floating ice ledge and waits above the line while the bigger ones slide right; then it glides along and slides down into its gap.',
  },
]

const SIZES = [
  { id: 'upright', label: 'Phone, upright', width: 340, height: 240 },
  { id: 'side', label: 'Phone on its side, 130% text', width: 479, height: 55 },
  { id: 'side-doit', label: 'On its side, Do it', width: 479, height: 90 },
  { id: 'desktop', label: 'Desktop', width: 640, height: 360 },
] as const
type SizeId = (typeof SIZES)[number]['id']

const SOUNDS: readonly { id: PenguinSound; label: string; when: string }[] = [
  { id: 'tap', label: 'Tap', when: 'every comparison: soft, many times a round' },
  { id: 'swish', label: 'Swish', when: 'a bigger one slides right: soft' },
  { id: 'slide', label: 'Slide into place', when: 'the special moment: whoosh, then a honk' },
  { id: 'inplace', label: 'Already in place', when: 'no slide needed: a tiny honk' },
  { id: 'finale', label: 'Finale', when: 'everything in order: a celebration' },
]

function Choice<T extends string>(props: {
  readonly label: string
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

export function PenguinMockupsPage() {
  const { level, theme, setTheme } = usePreferences()
  const systemReduced = useReducedMotion()
  const [stepId, setStepId] = useState<StepId>('start')
  const [motion, setMotion] = useState<'full' | 'reduced'>(systemReduced ? 'reduced' : 'full')
  const [sizeId, setSizeId] = useState<SizeId>('upright')
  const [replay, setReplay] = useState(0)
  const [sound, setSound] = useState<Record<PenguinSound, VariantId>>({
    tap: 'v1',
    swish: 'v1',
    slide: 'v1',
    inplace: 'v1',
    finale: 'v1',
  })
  const step = STEPS.find((candidate) => candidate.id === stepId) ?? STEPS[0]
  const size = SIZES.find((candidate) => candidate.id === sizeId) ?? SIZES[0]

  useEffect(() => {
    document.title = 'Penguin mockups (preview only) – Stepwise'
  }, [])

  if (!step) return null
  const animate = motion === 'full'

  return (
    <main id="main" tabIndex={-1} className="penguin-mockups" data-motion={motion}>
      <header className="mock-intro">
        <h1>Penguin mockups for insertion sort</h1>
        <p>
          Preview only: this page is on the <code>design/penguins</code> branch, which is never
          merged. Pick a step, then scroll through A, B and C. The bars beside each show the same
          step. The <a href="#mock-sounds-title">sounds</a> are at the end.
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
        <Choice
          label="Stage size"
          options={SIZES.map(({ id, label }) => ({ id, label }))}
          value={sizeId}
          onChange={(id) => {
            setSizeId(id)
            setReplay((n) => n + 1)
          }}
        />
      </div>

      <p className="mock-caption" aria-live="polite">
        <strong>{step.label}:</strong> {step.caption}
      </p>
      <p className="mock-size">
        Stage box: {size.width} × {size.height} px, the real stage’s size for “{size.label}”.
      </p>

      {DESIGNS.map((design) => (
        <section key={design.id} className="mock-design" aria-labelledby={`mock-${design.id}`}>
          <h2 id={`mock-${design.id}`}>{design.name}</h2>
          <p className="mock-summary">{design.summary}</p>
          <div className="mock-pair">
            <div className="mock-stage mock-penguins">
              <p className="mock-stage-caption">{step.stage}</p>
              <div className="mock-box-scroll">
                <div className="mock-box" style={{ width: size.width, height: size.height }}>
                  <PenguinScene
                    design={design.id}
                    step={step}
                    width={size.width}
                    height={size.height}
                    motion={animate}
                    replay={replay}
                    title={design.name}
                  />
                </div>
              </div>
            </div>
            <div className="mock-stage mock-bars">
              <Stage
                key={animate ? `bars-${step.id}` : `${step.id}-${String(replay)}`}
                frame={step.frame}
                level={level ?? 'engineer'}
                pointerLabels={POINTER_LABELS}
                stepDelayMs={900}
                caption="Bars, same step"
              />
            </div>
          </div>
        </section>
      ))}

      <section className="mock-sounds" aria-labelledby="mock-sounds-title">
        <h2 id="mock-sounds-title">Sounds</h2>
        <p className="mock-sounds-note">
          Made in code, silent until you tap. Tapping a version plays it and picks it for “Play a
          round”.
        </p>
        <p className="mock-sounds-note">
          V4 of the two honks is a real penguin’s call, a CC0 recording: “Penguin Sounds” by
          AntumDeluge (OpenGameArt, CC0), cut from Bidone’s recording at Leipzig Zoo (Freesound
          66150, CC0). If you pick it, it gets a CREDITS.md entry like the quack.
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
                  playPenguinSound(id, variant)
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
            tap, swish, tap, swish, tap, the slide into place; then tap, already in place
          </span>
        </button>
      </section>
    </main>
  )
}
