/**
 * TEMPORARY (design/slimes, never merged): a page for comparing three slime designs for merge
 * sort on a real phone, through the PR preview. One tab per design; each plays a full merge
 * sort of 5 2 8 1 9 3 like the real site (step back and forward, play, speed), with no words
 * needed (they can be shown), and shows how a Do it question ("which goes next?") looks.
 */
import { useEffect, useId, useMemo, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { usePreferences } from '../../preferences/preferences'
import { sceneOf, type Design } from './layout'
import { slimeRun, START_VALUES } from './run'
import { SlimeScene } from './SlimeScene'
import './SlimeMockups.css'

interface DesignInfo {
  readonly id: Design
  readonly tab: string
  readonly name: string
  readonly idea: string
  readonly special: string
  readonly sounds: string
  readonly risk: string
  readonly landscape: string
  readonly frames: string
}

const DESIGNS: readonly DesignInfo[] = [
  {
    id: 'tree',
    tab: 'A. Split tree',
    name: 'A. Split tree',
    idea: 'One big slime at the top holds all six numbers. It splits into two slimes that drop down a level, again and again, until each slime holds one number. Then pairs climb back up: the two halves look at each other, and the smaller front number hops up into the new, bigger slime first. The textbook merge sort tree, alive.',
    special:
      'The climb: each hop up into the parent slime, the smaller number first. It is the frequent move of every merge, so it fits the step; the finished merge (the halves gone, one slime in order) gets a short wobble.',
    sounds:
      'Split: a stretchy “pop” as a slime divides and drops. Compare: two little “hm?” blips, one per side. Hop up: a springy “boing”, higher for bigger numbers. Merge finished: a gulp. Finale: the whole tree bounces, a rising run of boings.',
    risk: 'Height. Four levels for 6 to 12 numbers need a tall stage; on a short one only the merge in progress fits, so the tree is lost there.',
    landscape:
      'Zoom: only the split or merge in progress, on two levels (the parent above its two halves), across the full width. Lost: the rest of the tree, so the learner can’t see the whole recursion at a glance on that screen.',
    frames:
      'Yes. Each frame needs lo, mid, hi and the depth of the call (trace variables), and which event it is (split, compare, move, rest, merged). The groups on each level come from replaying the frames from the start; the parent being merged is the main row’s [lo, k), the halves the buffer row’s [i, mid) and [j, hi). Values are followed by identity through each copy (i, j, k pointers), so equal values stay told apart.',
  },
  {
    id: 'arena',
    tab: 'B. Slime arena',
    name: 'B. Slime arena',
    idea: 'Each number is its own little slime, and each group stands on its own plank. To split, the slimes bounce apart onto separate planks. To merge, the two halves queue at a gate, fronts facing each other; the two front slimes duel, and the smaller one goes through first, onto the raised platform where the merged line forms.',
    special:
      'The duel: the two fronts lean in and bump at the gate before one goes through. It IS the Do it question (“which goes next?”), so in Do it the learner settles every duel.',
    sounds:
      'Split: a boing as slimes bounce apart. Duel: a little “clash” and two squeaks. Through the gate: a whoosh up the platform. Merge finished: a gate clang and a cheer. Finale: every slime jumps, a chorus of squeaks.',
    risk: 'Busy at 12 numbers: many small slimes, planks and a gate in one row. The queues turn the left half round (its front faces the gate), which must still read as the same numbers.',
    landscape:
      'At 479 × 90 (Do it) the whole arena fits, slimes and all. At 479 × 53 it goes compact: the slimes shrink to number tags (no faces), the gate and the platform stay. Lost there: the slimes’ faces; the duel shows as the two marked tags leaning in.',
    frames:
      'Yes, the same data as A: lo, mid, hi, the depth, the event, and the i, j, k pointers. The queues are the buffer row’s [i, mid) (turned round) and [j, hi); the platform line is the main row’s [lo, k); the gate stands at mid. The planks (which groups are apart) come from replaying the splits and merges.',
  },
  {
    id: 'pond',
    tab: 'C. Mitosis pond',
    name: 'C. Mitosis pond',
    idea: 'Each group is one squishy blob floating on a pond, with real gaps of water between groups. A blob stretches and pinches in two, again and again. Then pairs of blobs flow back together: a new blob forms between them and absorbs the smaller front number first, until the two halves are gone.',
    special:
      'Mitosis: a blob stretching, pinching and splitting into two, each half drifting apart. It plays at every split; the absorbing at every merge is the frequent move.',
    sounds:
      'Split: a long stretchy “splooorp” and a pop. Compare: a soft bubble from each side. Absorb: a squelchy “gloop”. Merge finished: a satisfied burble. Finale: bubbles rising all over the pond.',
    risk: 'Telling halves from groups: one level only, so the depth of the recursion shows only as gaps; deep splits make many small gaps. The left half turns round while merging (its front faces the new blob).',
    landscape:
      'Fits as it is at both 479 × 53 and 479 × 90: one level only, with the numbers at 10 px. Only a field under about 30 px would drop the blobs’ eyes (compact). Lost: nothing but size; with 12 numbers the gaps get narrow.',
    frames:
      'Yes, the same data as A: lo, mid, hi, the depth, the event, the i, j, k pointers. The gaps are the splits not yet merged back, from replaying the frames; the blob forming between the halves is the main row’s [lo, k).',
  },
]

/** The real stage field's size: measured at 390 × 844, and the tightest phone on its side. */
const SIZES = [
  { id: 'upright', label: 'Phone, upright (390 × 844)', width: 366, height: 382 },
  { id: 'side', label: 'On its side, 130% text', width: 479, height: 53 },
  { id: 'side-doit', label: 'On its side, Do it', width: 479, height: 90 },
  { id: 'desktop', label: 'Desktop', width: 640, height: 360 },
] as const
type SizeId = (typeof SIZES)[number]['id']

const SPEEDS = [0.5, 1, 2] as const
const STEP_MS = 1100

function Choice<T extends string | number>(props: {
  readonly label: string
  readonly options: readonly { readonly id: T; readonly label: string }[]
  readonly value: T
  readonly onChange: (value: T) => void
}) {
  const labelId = useId()
  return (
    <div className="mock-choice">
      <span id={labelId} className="mock-choice-label">
        {props.label}
      </span>
      <div className="mock-choice-track" role="group" aria-labelledby={labelId}>
        {props.options.map(({ id, label }) => (
          <button
            key={String(id)}
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

/** The Do it question for a design: the first compare of the last merge (2 or 1?). */
function DoItPreview(props: {
  readonly design: Design
  readonly width: number
  readonly height: number
  readonly motion: boolean
}) {
  const steps = useMemo(() => slimeRun(), [])
  const ask = useMemo(() => {
    const lastMerge = steps.findLastIndex((s) => s.event === 'merged')
    return (
      steps
        .slice(0, lastMerge)
        .findLast((s, k) => s.event === 'compare' && steps[k - 1]?.event !== 'take') ?? steps[0]
    )
  }, [steps])
  const [said, setSaid] = useState<'right' | 'wrong' | null>(null)
  const answer = ask?.answer
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const key = event.key.toLowerCase()
      if (key !== 'l' && key !== 'r') return
      setSaid((key === 'l' ? 'left' : 'right') === answer ? 'right' : 'wrong')
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [answer])
  if (!ask) return null
  const pick = (side: 'left' | 'right') => {
    setSaid(side === ask.answer ? 'right' : 'wrong')
  }
  return (
    <section className="mock-doit" aria-label="How a Do it question looks">
      <h3>Do it: “Which goes next?”</h3>
      <p className="mock-doit-how">
        Explorer answers <strong>Left (L)</strong> or <strong>Right (R)</strong>; Engineer taps the
        slime that goes next. The two choices are marked L and R.
      </p>
      <div className="mock-box">
        <SlimeScene
          design={props.design}
          step={ask}
          width={props.width}
          height={props.height}
          count={START_VALUES.length}
          motion={props.motion}
          durationMs={0}
          sides
          onPick={pick}
          label="A Do it question: which goes next, the left front or the right front?"
        />
      </div>
      <div className="mock-doit-answers" role="group" aria-label="Your move">
        <button
          type="button"
          aria-keyshortcuts="L"
          onClick={() => {
            pick('left')
          }}
        >
          ◀ Left <kbd>L</kbd>
        </button>
        <button
          type="button"
          aria-keyshortcuts="R"
          onClick={() => {
            pick('right')
          }}
        >
          Right <kbd>R</kbd> ▶
        </button>
      </div>
      <p className="mock-doit-said" aria-live="polite">
        {said === 'right'
          ? 'Right! The smaller one goes next.'
          : said === 'wrong'
            ? 'Not this time. Which one is smaller?'
            : ' '}
      </p>
    </section>
  )
}

export function SlimeMockupsPage() {
  const { theme, setTheme } = usePreferences()
  const systemReduced = useReducedMotion()
  const steps = useMemo(() => slimeRun(), [])
  const [designId, setDesignId] = useState<Design>('tree')
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [words, setWords] = useState(false)
  const [motion, setMotion] = useState<'full' | 'reduced'>(systemReduced ? 'reduced' : 'full')
  const [sizeId, setSizeId] = useState<SizeId>('upright')
  const size = SIZES.find((candidate) => candidate.id === sizeId) ?? SIZES[0]
  const design = DESIGNS.find((d) => d.id === designId) ?? DESIGNS[0]
  const step = steps[index]
  const last = steps.length - 1
  const stepMs = STEP_MS / speed

  useEffect(() => {
    document.title = 'Slime mockups (preview only) – Stepwise'
  }, [])

  // Playing stops by itself at the last step.
  const isPlaying = playing && index < last
  useEffect(() => {
    if (!isPlaying) return
    const timer = window.setTimeout(() => {
      setIndex((k) => Math.min(last, k + 1))
    }, stepMs)
    return () => {
      window.clearTimeout(timer)
    }
  }, [isPlaying, index, last, stepMs])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'ArrowRight') setIndex((k) => Math.min(last, k + 1))
      else if (event.key === 'ArrowLeft') setIndex((k) => Math.max(0, k - 1))
      else return
      setPlaying(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [last])

  if (!step || !design) return null
  const mode = sceneOf(design.id, step, size, START_VALUES.length).mode

  return (
    <main id="main" tabIndex={-1} className="slime-mockups" data-motion={motion}>
      <header className="mock-intro">
        <h1>Slime mockups for merge sort</h1>
        <p>
          Preview only: this page is on the <code>design/slimes</code> branch, which is never
          merged. Each tab plays a whole merge sort of <strong>5 2 8 1 9 3</strong>, start to
          finale. The rule: a kid should follow it with no words and the sound off, so the words are
          hidden unless you turn them on.
        </p>
      </header>

      <div className="mock-tabs" role="tablist" aria-label="Designs">
        {DESIGNS.map((d) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            id={`tab-${d.id}`}
            aria-selected={d.id === designId}
            aria-controls="mock-panel"
            onClick={() => {
              setDesignId(d.id)
            }}
          >
            {d.tab}
          </button>
        ))}
      </div>

      <section
        id="mock-panel"
        role="tabpanel"
        aria-labelledby={`tab-${design.id}`}
        className="mock-design"
      >
        <div className="mock-player">
          <div className="mock-box mock-stage">
            <SlimeScene
              design={design.id}
              step={step}
              width={size.width}
              height={size.height}
              count={START_VALUES.length}
              motion={motion === 'full'}
              durationMs={Math.round(stepMs * 0.75)}
              label={`${design.name}, step ${String(index + 1)} of ${String(steps.length)}: ${step.says}`}
            />
          </div>
          <div className="mock-controls" role="group" aria-label="Playback">
            <button
              type="button"
              onClick={() => {
                setPlaying(false)
                setIndex((k) => Math.max(0, k - 1))
              }}
              disabled={index === 0}
            >
              ◀ Back
            </button>
            <button
              type="button"
              className="mock-play"
              onClick={() => {
                if (index >= last) setIndex(0)
                setPlaying(!isPlaying)
              }}
            >
              {isPlaying ? '❚❚ Pause' : '▶ Play'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false)
                setIndex((k) => Math.min(last, k + 1))
              }}
              disabled={index === last}
            >
              Next ▶
            </button>
            <Choice
              label="Speed"
              options={SPEEDS.map((v) => ({ id: v, label: `${String(v)}×` }))}
              value={speed}
              onChange={setSpeed}
            />
            <span className="mock-progress">
              Step {index + 1} of {steps.length}
            </span>
          </div>
          <p className="mock-says" aria-live="polite">
            {words ? step.says : ' '}
          </p>
          <p className="mock-size">
            Stage field: {size.width} × {size.height} px ·{' '}
            {mode === 'full'
              ? 'the whole picture'
              : mode === 'zoom'
                ? 'zoomed on the split or merge in progress'
                : 'compact'}
          </p>
        </div>

        <dl className="mock-notes">
          <dt>Idea</dt>
          <dd>{design.idea}</dd>
          <dt>Special move</dt>
          <dd>{design.special}</dd>
          <dt>Sounds (a sketch, no audio yet)</dt>
          <dd>{design.sounds}</dd>
          <dt>Biggest risk</dt>
          <dd>{design.risk}</dd>
          <dt>Phone on its side (479 × 53–90)</dt>
          <dd>{design.landscape}</dd>
          <dt>From merge sort’s frames?</dt>
          <dd>{design.frames}</dd>
        </dl>

        <DoItPreview
          design={design.id}
          width={size.width}
          height={size.height}
          motion={motion === 'full'}
        />
      </section>

      <div className="mock-settings">
        <Choice
          label="Words"
          options={[
            { id: 'off', label: 'Off' },
            { id: 'on', label: 'On' },
          ]}
          value={words ? 'on' : 'off'}
          onChange={(v) => {
            setWords(v === 'on')
          }}
        />
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
          onChange={setSizeId}
        />
      </div>
    </main>
  )
}
