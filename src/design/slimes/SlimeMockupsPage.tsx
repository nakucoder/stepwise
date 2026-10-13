/**
 * TEMPORARY (design/slimes, never merged): a page for comparing three designs for merge sort
 * on a real phone, through the PR preview. One tab per design; each plays a full merge
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

const SHARED_FRAMES =
  'Merge sort’s frames on #74’s two rows: the main row is the home row, the buffer row holds the two halves ([i, mid) on the upper lane, [j, hi) on the lower), and the new group is the main row’s [lo, k). Each frame needs lo, mid, hi and the depth (trace variables), the event kind (split, compare, take, rest, merged), and the i, j, k pointers so a value is followed by identity as it is copied. Which values form a group (a ledge, a coupled train, a film) comes from replaying the splits and merges from the first frame.'

const DESIGNS: readonly DesignInfo[] = [
  {
    id: 'slimes',
    tab: 'A. Size slimes',
    name: 'A. Size slimes',
    idea: 'Every number is its own slime, and its size is the number: a 1 is tiny, a 9 is big. A group stands together on a ledge. To split, the slimes hop apart onto separate ledges, down to one slime each. To merge, the two halves line up on two ledges below, fronts at the left; the two fronts look at each other, and the smaller one hops up into the new line first.',
    special:
      'The wave: when a merge is done, the new line bounces once from left to right, smallest to biggest, like a staircase coming alive. It shows the group is one again and that it’s in order; at the end the whole line waves and turns green.',
    sounds:
      'Hop apart: a light “boing”. The fronts look: two soft blips. Hop up: a “bloop”, deeper for a bigger slime (size is the pitch too). The wave: a rising run of bloops, one per slime. Finale: the wave plus a happy jingle.',
    risk: 'Close sizes: an 8 and a 9 differ by a tenth of the row, so on a short stage they look the same (the digit settles it). Slimes stretched tall for 9 must still read as slimes, not bars with eyes.',
    landscape:
      'At 479 × 90 (Do it) the rows are 27 px: the slimes shrink to slivers 3 to 12 px tall with no eyes, so only far-apart sizes (1 vs 9) read; the digits carry it. At 479 × 53 there’s no room for sizes: digits on plates only, ledges and the ladder stay. Lost: the size picture, the faces and the looking.',
    frames: `${SHARED_FRAMES} A uses merged for the wave and the compare frame’s two fronts for the looking.`,
  },
  {
    id: 'trains',
    tab: 'B. Rail yard',
    name: 'B. Rail yard',
    idea: 'Every number is a robot train car carrying that many crates, stacked up: count them, or just see which pile is taller. A group is a coupled train on its own stretch of track. To split, the train uncouples and rolls apart onto shorter and shorter sidings. To merge, two sidings meet at a junction switch; the two front cars line up and the smaller rolls onto the main track first.',
    special:
      'Couple up and pull away: when a merge is done, the new train tugs as its couplings close and puffs steam. At the end the whole sorted train pulls out of the yard to the right and rolls back in, green.',
    sounds:
      'Uncouple: a metal “clunk”. Compare: two short bell dings. Roll onto the main track: a “clack-clack” over the switch, lower for heavier cars. Couple up: a clank and a hiss. Finale: a two-tone whistle and wheels speeding up.',
    risk: 'Busy pictures: crates, wheels, rails, couplings and a switch in a 44 px place. The crate count is lovely at 6 values but crates get thin at 12 (they become a plain stack).',
    landscape:
      'At 479 × 90 (Do it) the cargo is a solid pile 1 to 9 px tall (no crates to count); cars, couplings and rails stay, so trains and splits still read. At 479 × 53: cars with digits only, no cargo. Lost: counting crates, and seeing size at a glance.',
    frames: `${SHARED_FRAMES} B uses split for uncoupling, merged for the coupling tug and steam, and the last frame for pulling away.`,
  },
  {
    id: 'cutter',
    tab: 'C. Slime cutter',
    name: 'C. Slime cutter',
    idea: 'A press stamps one slab of slime into six pieces, each molded as tall as its number with the digit stamped on its base, still joined by a thin film. A blade cuts the slab in half, then each half, down to single pieces: the blade is the splitting. To merge, the pieces ride two conveyor belts to a gate; the two fronts wait there, and the smaller goes onto the output belt first, joined to its new line.',
    special:
      'The blade chop: at every split the blade slams down through the film between the two halves. It is the recursion made visible, and there are only n − 1 of them, so it never gets tiring.',
    sounds:
      'The press: a heavy “thunk”. The chop: a sharp “shhk!” (the loudest sound). Belts: a soft hum while pieces ride. Through the gate: a squishy “plop”, deeper for taller pieces. Finale: the belt rolls the line along with a cheerful squelch-chord.',
    risk: 'The film: it must read as “these belong together” and the cut as “now they don’t”, at 2 px thick. The lanes and the output belt also look alike; pieces must clearly go up to the output.',
    landscape:
      'At 479 × 90 (Do it) the pieces are 1 to 9 px tall: a row of slivers, the film and belts stay. At 479 × 53: stamped bases (digits) only, the blade still chops. Lost: the molded heights, so it becomes a numbers-on-a-belt picture.',
    frames: `${SHARED_FRAMES} C uses split (with mid) for where the blade comes down, and the first frame for the press.`,
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
        Explorer answers <strong>Left (L)</strong> for the upper line’s front or{' '}
        <strong>Right (R)</strong> for the lower line’s; Engineer taps the one that goes next. The
        two choices are marked L and R.
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
  const [designId, setDesignId] = useState<Design>('slimes')
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
    document.title = 'Merge sort mockups (preview only) – Stepwise'
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
        <h1>Merge sort mockups: size slimes, rail yard, slime cutter</h1>
        <p>
          Preview only: this page is on the <code>design/slimes</code> branch, which is never
          merged. Each tab plays a whole merge sort of <strong>5 2 8 1 9 3</strong>, start to
          finale. The rules: the size of each thing is its number (the digit is there too); after
          the splits every number is its own thing, and only groups split and join; both lines in a
          merge read left to right with their fronts at the left. A kid should follow it with no
          words and the sound off, so the words are hidden unless you turn them on.
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
              ? 'sizes in full'
              : mode === 'short'
                ? 'short: sizes shrink to slivers, the digits carry it'
                : 'compact: digits only, no sizes'}
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
