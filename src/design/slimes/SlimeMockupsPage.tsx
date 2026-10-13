/**
 * TEMPORARY (design/slimes, never merged): a page for comparing three slime designs for merge
 * sort on a real phone, through the PR preview. Each design shows the same seven moments beside
 * the real two-row bars for the same moment (#74), in a box the size of a real stage field,
 * including the tightest one: a phone on its side at 130% text.
 */
import { useEffect, useId, useState } from 'react'
import { Stage } from '../../components/Stage'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { usePreferences } from '../../preferences/preferences'
import { slimeLayout, type Design } from './layout'
import { SlimeScene } from './SlimeScene'
import { MOMENTS, POINTER_LABELS, type MomentId } from './steps'
import './SlimeMockups.css'

interface DesignInfo {
  readonly id: Design
  readonly name: string
  readonly idea: string
  readonly special: string
  readonly sounds: string
}

const DESIGNS: readonly DesignInfo[] = [
  {
    id: 'jelly',
    name: 'A. Jelly towers',
    idea: 'Each value is a translucent jelly tower with its number, a little slime on top. A group of values is held in one thin membrane, like a jelly mould. A split pinches the membrane into two; a value moving between rows hops over, its slime riding.',
    special:
      'Merge finished: the two membranes fuse into one with a jelly wobble (squash, then stretch), a longer move the step waits for.',
    sounds:
      'Compare: a soft “plip”. A value moving: a little “bloop”. Split: a quick stretch-and-pop. Merge finished: a wobbly “boing” as the membranes fuse. Finale: a rising run of bloops.',
  },
  {
    id: 'tubes',
    name: 'B. Goo tubes',
    idea: 'Each value is a glass tube filled with orange goo up to its number, a slime riding the goo. A group stands in one rack; a split opens a gap in the rack. Empty slots are empty tubes, so the place is always visible.',
    special:
      'The pour: the smaller front’s goo drains from its tube in the bottom row and fills the empty tube above, the slime riding the goo up. It happens at every merge step, so it would be the frequent move, fitted to the step.',
    sounds:
      'Compare: a glassy “tink” on each tube. Pour: a short gloop-gurgle. Split: a rack click. Merge finished: a pop of bubbles. Finale: tubes chiming up a scale, then a happy slurp.',
  },
  {
    id: 'mountain',
    name: 'C. Slime mountain',
    idea: 'Each group is one connected slime: its values are peaks (each with its number) joined by a goo bridge at the base, with one face on the tallest peak. Splitting pinches the slime into two, each with its own face; merging joins them back.',
    special:
      'Mitosis: on a split the bridge stretches thin and snaps, a second face pops up on the new group’s tallest peak; on a merge the two slimes flow together and the faces merge into one.',
    sounds:
      'Compare: a soft squelch. A value moving: a drip. Split: a long stretchy “sploink”. Merge: a gloopy join and a single happy chirp. Finale: a chorus of little slime squeaks rising.',
  },
]

/** The real stage field's size: measured at 390 × 844, and the tightest phone on its side. */
const SIZES = [
  { id: 'upright', label: 'Phone, upright (390 × 844)', width: 366, height: 382 },
  { id: 'side', label: 'Phone on its side, 130% text', width: 479, height: 53 },
  { id: 'side-doit', label: 'On its side, Do it', width: 479, height: 90 },
  { id: 'desktop', label: 'Desktop', width: 640, height: 360 },
] as const
type SizeId = (typeof SIZES)[number]['id']

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

export function SlimeMockupsPage() {
  const { level, theme, setTheme } = usePreferences()
  const systemReduced = useReducedMotion()
  const [momentId, setMomentId] = useState<MomentId>('start')
  const [motion, setMotion] = useState<'full' | 'reduced'>(systemReduced ? 'reduced' : 'full')
  const [sizeId, setSizeId] = useState<SizeId>('upright')
  const [replay, setReplay] = useState(0)
  const moment = MOMENTS.find((m) => m.id === momentId) ?? MOMENTS[0]
  const size = SIZES.find((candidate) => candidate.id === sizeId) ?? SIZES[0]

  useEffect(() => {
    document.title = 'Slime mockups (preview only) – Stepwise'
  }, [])

  if (!moment) return null
  const compact = slimeLayout(size, 6, 9).compact

  return (
    <main id="main" tabIndex={-1} className="slime-mockups" data-motion={motion}>
      <header className="mock-intro">
        <h1>Slime mockups for merge sort</h1>
        <p>
          Preview only: this page is on the <code>design/slimes</code> branch, which is never
          merged. Pick a moment, then scroll through A, B and C. The two-row bars beside each show
          the same moment: the main row on top, the waiting row (the buffer) below.
        </p>
      </header>

      <div className="mock-controls">
        <Choice
          label="Moment"
          quiet
          options={MOMENTS.map(({ id, label }) => ({ id, label }))}
          value={momentId}
          onChange={(id) => {
            setMomentId(id)
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
        <strong>{moment.label}:</strong> {moment.caption}
      </p>
      <p className="mock-size">
        Stage field: {size.width} × {size.height} px.{' '}
        {compact
          ? 'Too short for two full rows: the waiting row shrinks to number chips under each column.'
          : 'Two full rows fit.'}
      </p>

      {DESIGNS.map((design) => (
        <section key={design.id} className="mock-design" aria-labelledby={`mock-${design.id}`}>
          <h2 id={`mock-${design.id}`}>{design.name}</h2>
          <dl className="mock-notes">
            <dt>Idea</dt>
            <dd>{design.idea}</dd>
            <dt>Special move</dt>
            <dd>{design.special}</dd>
            <dt>Sounds (a sketch, no audio yet)</dt>
            <dd>{design.sounds}</dd>
          </dl>
          <div className="mock-pair">
            <div className="mock-stage mock-slimes">
              <p className="mock-stage-caption">{moment.stage}</p>
              <div className="mock-box-scroll">
                <div className="mock-box" style={{ width: size.width, height: size.height }}>
                  <SlimeScene
                    design={design.id}
                    moment={moment}
                    width={size.width}
                    height={size.height}
                    motion={motion === 'full'}
                    replay={replay}
                    title={design.name}
                  />
                </div>
              </div>
            </div>
            <div className="mock-stage mock-bars">
              <Stage
                frame={moment.frame}
                level={level ?? 'engineer'}
                pointerLabels={POINTER_LABELS}
                stepDelayMs={900}
                caption="Bars, same moment"
              />
            </div>
          </div>
        </section>
      ))}

      <section className="mock-fit" aria-labelledby="mock-fit-title">
        <h2 id="mock-fit-title">Fit</h2>
        <p>
          Every design draws inside the field at every moment and mid-move (a test checks every
          shape). When half the field is shorter than a value column plus its slime and a hop, the
          waiting row becomes a strip of number chips, still one per column.
        </p>
        <table>
          <thead>
            <tr>
              <th scope="col">Stage field</th>
              <th scope="col">Size</th>
              <th scope="col">Sprite scale</th>
              <th scope="col">Waiting row</th>
            </tr>
          </thead>
          <tbody>
            {SIZES.map((sz) => {
              const geo = slimeLayout(sz, 6, 9)
              return (
                <tr key={sz.id}>
                  <td>{sz.label}</td>
                  <td>
                    {sz.width} × {sz.height}
                  </td>
                  <td>{geo.s}×</td>
                  <td>{geo.compact ? 'number chips' : 'full row'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </main>
  )
}
