/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): heap sort's character, B2, the builder
 * beaver (the pick), in full scenes. Not linked from the site's menus; reached at
 * /design/heap-sort on the PR preview. Every scene is drawn from heap sort's real frames at the
 * site's real stage sizes, light and dark: eight moments as stills and a looping short run.
 * Nothing here is wired into Watch or Do it, and there are no sounds.
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { heapSort } from '../../algorithms/sorting/heapSort'
import { collectFrames } from '../../engine/collect'
import type { Frame } from '../../engine/types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { BeaverScene } from './BeaverScene'
import { clipRange, identities, momentsOf, SIZES, type Moments, type StageSize } from './model'
import { BothThemes, Moods, Pieces } from './Pieces'
import { MOVE_MS, planOf } from './scene'
import './HeapMockups.css'

/** The stages shown: desktop, phone upright, phone on its side (with 12 numbers). */
const STAGES = ['desktop', 'upright', 'side-watch'].flatMap((id) =>
  SIZES.filter((size) => size.id === id),
)

const INPUTS = [
  { id: 'mixed', label: '1 to 12 mixed up', values: [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8] },
  {
    id: 'dupes',
    label: 'Repeats: 9 4 9 2 7 4 12 1 7 3 9 5',
    values: [9, 4, 9, 2, 7, 4, 12, 1, 7, 3, 9, 5],
  },
  {
    id: 'six',
    label: 'The default 6 (the whole run, finale included)',
    values: [5, 2, 8, 1, 9, 3],
  },
] as const

const MOMENTS: readonly {
  readonly key: keyof Moments
  readonly name: string
  readonly t: number
}[] = [
  { key: 'start', name: '1. The start', t: 1 },
  { key: 'family', name: '2. Looking at a family', t: 1 },
  { key: 'climb', name: '3. A climb (carrying the child’s stack up)', t: 0.7 },
  { key: 'stop', name: '4. A stop (a shrug)', t: 0.5 },
  { key: 'leave', name: '5. The top hauled to the woodpile (special move)', t: 0.6 },
  { key: 'handover', name: '6. The dam is built: take the top next', t: 1 },
  { key: 'shrinking', name: '7. The dam shrinking', t: 1 },
  { key: 'finale', name: '8. The finale', t: 0.6 },
]

const STEP_MS = 900

/** How long a step lasts in the clip: its move, then a beat (held for the special move). */
function stepMs(frame: Frame | undefined): { move: number; hold: number } {
  const event = frame?.heap?.event
  const phase = frame?.heap?.phase
  const move =
    event === 'start' && phase === 'extract'
      ? MOVE_MS.handover
      : event === 'ask' || event === 'climb' || event === 'stop' || event === 'settles'
        ? MOVE_MS[event]
        : event === 'extract' || event === 'done'
          ? MOVE_MS[event]
          : 0
  return { move, hold: Math.max(STEP_MS, move + (event === 'done' ? 1200 : 250)) }
}

function sizeLine(size: StageSize): string {
  const plan = planOf(size)
  const logs =
    plan.log < 3 ? `${String(plan.log)} px a log (plain)` : `${String(plan.log)} px a log`
  return `Beaver at ${String(plan.s)}× in a ${String(plan.lane)} px lane; ${logs} (a 12 is ${String(12 * plan.log)} px); stacks ${String(plan.width)} px wide; numbers ${String(plan.font)} px.`
}

function Clip({
  frames,
  ids,
  size,
}: {
  frames: readonly Frame[]
  ids: readonly (readonly number[])[]
  size: StageSize
}) {
  const reduced = useReducedMotion()
  const [from, to] = clipRange(frames)
  const [index, setIndex] = useState(from)
  const [t, setT] = useState(1)
  const [playing, setPlaying] = useState(true)
  useEffect(() => {
    if (!playing) return
    const { move, hold } = stepMs(frames[index])
    const moveMs = reduced ? 0 : move
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - start
      setT(moveMs > 0 ? Math.min(1, elapsed / moveMs) : 1)
      if (elapsed >= hold) {
        setT(0)
        setIndex((k) => (k >= to ? from : k + 1))
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [playing, index, from, to, frames, reduced])
  return (
    <figure className="hm-clip">
      <BothThemes>
        <BeaverScene
          frames={frames}
          ids={ids}
          index={index}
          t={t}
          size={size}
          label={`A short run, step ${String(index - from + 1)} of ${String(to - from + 1)}`}
        />
      </BothThemes>
      <figcaption>
        <button
          type="button"
          onClick={() => {
            setPlaying((p) => !p)
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>{' '}
        A short run, looping: step {index - from + 1} of {to - from + 1}.{' '}
        <span className="hm-words">{frames[index]?.explanation.explorer}</span>
      </figcaption>
    </figure>
  )
}

function StageBlock({
  frames,
  ids,
  moments,
  size,
  inputId,
}: {
  frames: readonly Frame[]
  ids: readonly (readonly number[])[]
  moments: Moments
  size: StageSize
  inputId: string
}) {
  return (
    <section className="hm-size" aria-labelledby={`stage-${size.id}`}>
      <h2 id={`stage-${size.id}`}>{size.label}</h2>
      <p className="hm-plan">{sizeLine(size)}</p>
      <Clip key={inputId} frames={frames} ids={ids} size={size} />
      <div
        className="hm-moments"
        style={{ '--scene-w': `${String(size.width * 2 + 40)}px` } as CSSProperties}
      >
        {MOMENTS.map(({ key, name, t }) => {
          const index = moments[key]
          return (
            <figure key={key} className="hm-moment">
              <figcaption>{name}</figcaption>
              {index === null ? (
                <p className="hm-none">These numbers have no such moment.</p>
              ) : (
                <>
                  <BothThemes>
                    <BeaverScene
                      frames={frames}
                      ids={ids}
                      index={index}
                      t={t}
                      size={size}
                      label={`${size.label}: ${name}`}
                    />
                  </BothThemes>
                  <p className="hm-words">{frames[index]?.explanation.explorer}</p>
                </>
              )}
            </figure>
          )
        })}
      </div>
    </section>
  )
}

export function HeapMockupsPage() {
  const [inputId, setInputId] = useState<(typeof INPUTS)[number]['id']>('mixed')
  const input = INPUTS.find((i) => i.id === inputId) ?? INPUTS[0]
  const frames = useMemo(() => collectFrames(heapSort, input.values).frames, [input])
  const ids = useMemo(() => identities(frames), [frames])
  const moments = useMemo(() => momentsOf(frames), [frames])
  return (
    <main id="main" className="hm-page" tabIndex={-1}>
      <h1>Heap sort’s character: B2, the builder beaver (DO NOT MERGE)</h1>
      <p className="hm-intro">
        For checking the scenes only: nothing here is wired into heap sort’s Watch or Do it, and
        there are no sounds. Every scene is drawn from heap sort’s real frames, at the stage sizes
        the site really has with 12 numbers (measured on the live site), light and dark. Each value
        is a stack of identical logs (one log = one; the log look uses 1 to 12, bars keep 0 to 99).
        Over the field is the pyramid band as the site draws it at that size, and on the desktop and
        the upright phone the dam (the tree view) over it, where the site shows its tree, with the
        same values and highlights. The marks come only from the frame’s highlights: a yellow ring
        for a family compared, pink for a climb or the top leaving, a green bar for a value in its
        final spot. The beaver and the logs never take those colours. The pyramid’s part and the
        woodpile (the finished end) keep the site’s two tints, with a dashed fence between them.
      </p>
      <div className="hm-controls">
        <label>
          Numbers{' '}
          <select
            value={inputId}
            onChange={(e) => {
              setInputId(e.target.value as typeof inputId)
            }}
          >
            {INPUTS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Moods />
      {STAGES.map((size) => (
        <StageBlock
          key={size.id}
          frames={frames}
          ids={ids}
          moments={moments}
          size={size}
          inputId={inputId}
        />
      ))}
      <Pieces />
    </main>
  )
}
