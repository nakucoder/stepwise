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

const FRAMES =
  'Merge sort’s frames on #74’s two rows give all of it: the main row holds the groups (and the new one, [lo, k)), the buffer row the two halves ([i, mid) and [j, hi)). Each frame needs lo, mid, hi and the depth (trace variables), the event kind (split, compare, take, rest, merged), and the i, j, k pointers so each ship is followed by identity as it is copied. Which ships fly together comes from replaying the splits and merges from the first frame.'

const DESIGNS: readonly DesignInfo[] = [
  {
    id: 'mothership',
    tab: 'A. Mothership',
    name: 'A. Modular mothership',
    idea: 'One long mothership, nose to the left, built of six modules, each module as big as its number. Thrusters fire at a cut and the ship splits in half, again and again, until every module flies alone. To merge, a docking frame opens; the two small ships wait above and below it, noses at its mouth. The smaller front module docks first, and the new ship is built module by module: small to big, left to right.',
    special:
      'The warp: the finished mothership backs up, stretches and warps away to the left, then flies back in, ringed green. The split’s thruster flames are the frequent move.',
    sounds:
      'Split: a thruster “fssh” and a soft pop as the halves part. Compare: two radar pings. Dock: a mechanical “ka-chunk”, deeper for a bigger module. Merge done: a hiss of the seals. Finale: a rising warp whine and a boom.',
    risk: 'Width: the whole ship is one row, so 6 numbers fit but 10 or more make the modules small (sizes from about 2 px per count). The two waiting ships must read as “waiting”, not as more ships of the fleet.',
    landscape:
      'At 479 × 90 (Do it) the three bands are 27 px: the modules shrink to 13–21 px squares, so 1 vs 9 still shows but neighbours don’t; the digits carry it. At 479 × 53: one size, digits only; the frame, the dock and the noses stay. Lost: the size picture.',
    frames: `${FRAMES} A needs split (with mid) for the thrusters, and the last frame for the warp.`,
  },
  {
    id: 'squadrons',
    tab: 'B. Squadrons',
    name: 'B. Squadrons and a stargate',
    idea: 'Every number is its own fighter, facing up, as big as its number, flying in formation. A split peels a formation into two squadrons that drop a row and fly apart. Each fighter keeps its own column the whole way. To merge, a stargate opens over the two squadrons; their lead ships pull forward and face off, and the smaller one flies up through the gate first, taking the next place in the new squadron on the other side.',
    special:
      'The gate: when the last fighter is through, the stargate flashes and shuts. At the end the whole squadron flies off the top and loops back in from the bottom, ringed green.',
    sounds:
      'Peel off: a “vweeoo” sliding down. Face-off: two lead-ship blips. Through the gate: a rising “zip”, lower for a bigger ship. Gate shuts: a “shoomp”. Finale: an arcade fanfare as the squadron loops.',
    risk: 'Height: a row per split level, so 6 to 8 numbers need 4 rows (16 numbers: 5). With fixed columns a squadron in the middle of a merge has holes, which must read as “still coming”.',
    landscape:
      'Zoom: four rows don’t fit, so it shows only the split or merge in progress, on two rows (the squadron above the gate, the two below). At 479 × 90 the fighters are 14–30 px; at 479 × 53 one size, digits only. Lost: the rest of the tree, and at 53 px the sizes.',
    frames: `${FRAMES} B’s columns ARE the frames’ indexes: a squadron being formed fills the main row from lo, and the halves sit in the buffer from i and j. It needs merged for the gate shutting.`,
  },
  {
    id: 'station',
    tab: 'C. Docking station',
    name: 'C. Docking station',
    idea: 'My own: a space station along the left edge, and every group of pods hangs on its own docking arm. A split moves the back half through the station onto a new arm below. To merge, a new empty arm reaches out above the two halves; both front pods sit right next to the station, and the smaller one goes in and out onto the new arm. Why it reads: everything moves toward one fixed place, and each line’s front is the pod closest to it.',
    special:
      'The arms fold away: when a merge is done, the two empty arms swing back into the station and everything below moves up, so “two became one” is something you see. At the end the pods’ lights come on in order along the arm.',
    sounds:
      'Split: an airlock “pssht” as pods go through. Compare: two blips from the station. Dock: a soft “clunk-clink”, deeper for a bigger pod. Arms fold: a motor whirr and a latch. Finale: a chime per light.',
    risk: 'Rows: one arm per group plus the new one (5 rows for 6 numbers, 6 for 16), so a short stage can’t show them all. Moving through the station takes time; at fast speeds it must still look like a path, not a jump.',
    landscape:
      'Zoom: only the arms of the merge in progress (the new arm and the two halves), 3 rows. At 479 × 90 the pods are 13–21 px; at 479 × 53 one size, digits only. Lost: the other groups waiting on their arms.',
    frames: `${FRAMES} C needs merged for the arms folding, and the depth to know which arm a split adds.`,
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

const MODE_WORDS = {
  full: 'sizes in full',
  short: 'short: sizes shrink, the digits carry it',
  compact: 'compact: one size, digits only',
  zoom: 'zoomed on the split or merge in progress, sizes shrink',
  'zoom-compact': 'zoomed on the split or merge in progress, digits only',
} as const
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
        Explorer answers <strong>Left (L)</strong> for the left half’s lead ship or{' '}
        <strong>Right (R)</strong> for the right half’s; Engineer taps the ship that goes next. The
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
  const [designId, setDesignId] = useState<Design>('mothership')
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
    document.title = 'Spaceship mockups (preview only) – Stepwise'
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
        <h1>Merge sort mockups: spaceships</h1>
        <p>
          Preview only: this page is on the <code>design/slimes</code> branch, which is never
          merged. Each tab plays a whole merge sort of <strong>5 2 8 1 9 3</strong>, start to
          finale. The rules: a bigger number is a bigger ship (the digit is on it too); after the
          splits every number is its own ship, and only groups split and dock; both halves read left
          to right with their fronts facing the docking point; each design has its own layout. A kid
          should follow it with no words and the sound off, so the words are hidden unless you turn
          them on.
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
            Stage field: {size.width} × {size.height} px · {MODE_WORDS[mode]}
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
