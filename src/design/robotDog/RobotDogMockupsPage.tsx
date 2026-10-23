/**
 * TEMPORARY (mockup/quick-sort-dog, DO NOT MERGE): quick sort's character, round two: two
 * designs for Juan to compare and pick. Not linked from the site's menus; reached at
 * /design/robot-dog on the PR preview. Each design shows nine moments as stills and plays one
 * full round, from quick sort's real frames, at the stage sizes the real page has (measured).
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { collectFrames } from '../../engine/collect'
import type { Frame } from '../../engine/types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { firstRound, momentsOf, type Box, type Design, type Moments } from './layout'
import { MockupScene } from './MockupScene'
import './RobotDogMockups.css'

interface DesignInfo {
  readonly id: Design
  readonly name: string
  readonly who: string
  readonly value: string
  readonly moves: string
  readonly leader: string
  readonly special: string
  readonly tight: string
}

const DESIGNS: readonly DesignInfo[] = [
  {
    id: 'balloons',
    name: 'I. Robot dog and balloons',
    who: 'A robot dog: a dog first (four legs, a snout and nose, a pointed ear, a tail that wags, a trot), a robot second (metal plates with a seam and bolts, a glowing LED eye, an antenna, a glowing tail tip).',
    value:
      'Every balloon is the same size; its string is as long as its number, so a bigger number floats higher. The shortest string still clears the dog’s head, so the dog never hides a balloon.',
    moves:
      'The dog trots to the balloon, takes its string in its mouth and trots it to its new place; the other balloon floats up and over to the place it left. A balloon that stays put is tugged in place. A balloon left on the right sways. The ground under the balloons shows the zones.',
    leader:
      'The leader’s balloon is blue (every other balloon is red), from the moment it is picked.',
    special:
      'Placing the leader: the dog carries it into its gap, ties it down (its peg turns green), two sparkles pop and the dog jumps for joy. Finale: the balloons bob in a wave and the dog keeps jumping.',
    tight:
      'At 479 × 60 the dog is 1× (26 × 17 px) and its lane takes 18 px, so the strings share about 20 px: 1 to 12 differ by about 1.6 px a count, and with 1 to 88 the small ones (1, 2, 3) all sit at the same height.',
  },
  {
    id: 'pizza',
    name: 'J. Delivery cart and pizza boxes',
    who: 'A six-wheeled sidewalk delivery cart (three wheels show from the side) with a face screen (two eyes and a smile), a flag on a pole and a stripe down its side. No real company’s look.',
    value:
      'Every value is a stack of pizza boxes on a dolly at the curb (the digit is on the dolly); the boxes above the dolly are as tall as the number, all the same width. A box is 1, 2, 5 or 10 counts, whichever keeps a box at least 4 px thick.',
    moves:
      'The cart rolls (wheels turning) under the stack, lifts it on its deck and rolls it to its new place in the left zone; the other stack slides along the curb to the place it left. A stack that stays put is lifted and set down. A stack left on the right wobbles. The street shows the zones.',
    leader:
      'The leader’s boxes are blue (every other stack is cardboard brown), from the moment it is picked.',
    special:
      '“Delivered!”: the cart sets the leader in its gap, its top lid pops open and a puff of steam rises; the lid stays open on that step. Finale: the lids pop in a wave and the cart bounces.',
    tight:
      'At 479 × 60 the cart is 1× (26 × 15 px) and its street takes 11 px, the dolly 13 px, so the boxes share about 31 px: 1 to 12 differ by about 2.5 px a count (a box is 2 counts there), and with 1 to 88 the small ones differ by a third of a pixel.',
  },
]

const INPUTS = [
  {
    id: 'mixed',
    label: '12 numbers, small and big',
    values: [2, 42, 7, 88, 1, 64, 25, 51, 3, 76, 30, 9],
  },
  {
    id: 'small',
    label: '1 to 12, mixed up',
    values: [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8],
  },
  { id: 'six', label: 'The default 6', values: [5, 2, 8, 1, 9, 3] },
] as const

/** The real stage field's size (measured on the site with 12 numbers). */
const SIZES = [
  { id: 'side', label: 'Phone on its side, 130% text (479 × 60)', width: 479, height: 60 },
  { id: 'side-explorer', label: 'On its side, Explorer (479 × 75)', width: 479, height: 75 },
  { id: 'side-100', label: 'On its side, 100% (612 × 140)', width: 612, height: 140 },
  { id: 'upright', label: 'Phone upright (366 × 324)', width: 366, height: 324 },
  { id: 'desktop', label: 'Desktop (698 × 163)', width: 698, height: 163 },
] as const

const MOMENTS: readonly { readonly key: keyof Moments; readonly name: string }[] = [
  { key: 'start', name: '1. The start' },
  { key: 'pick', name: '2. Picking the leader' },
  { key: 'compare', name: '3. Comparing a value with the leader' },
  { key: 'moveLeft', name: '4. Moving a value left (swap)' },
  { key: 'leaveRight', name: '5. Leaving a value on the right' },
  { key: 'nudge', name: '6. Swapping with itself (a nudge in place)' },
  { key: 'place', name: '7. Placing the leader (the special move)' },
  { key: 'rangeDone', name: '8. A range done' },
  { key: 'finale', name: '9. The finale' },
]

const STEP_MS = 900

function Clip({ design, frames, box }: { design: Design; frames: readonly Frame[]; box: Box }) {
  const reduced = useReducedMotion()
  const [from, to] = firstRound(frames)
  const [index, setIndex] = useState(from)
  const [playing, setPlaying] = useState(true)
  useEffect(() => {
    if (!playing) return
    const id = window.setTimeout(
      () => {
        setIndex((k) => (k >= to ? from : k + 1))
      },
      // The special move (placing the leader) takes longer; the step waits for it.
      index >= to
        ? STEP_MS * 2.5
        : frames[index]?.partition?.event === 'place'
          ? STEP_MS * 2.2
          : STEP_MS,
    )
    return () => {
      window.clearTimeout(id)
    }
  }, [playing, index, from, to, frames])
  const frame = frames[index]
  return (
    <figure className="dog-clip">
      <MockupScene
        design={design}
        frames={frames}
        index={index}
        box={box}
        motion={!reduced}
        stepMs={STEP_MS}
        label={`One round, step ${String(index - from + 1)} of ${String(to - from + 1)}`}
      />
      <figcaption>
        <button
          type="button"
          onClick={() => {
            setPlaying((p) => !p)
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>{' '}
        One full round, looping: step {index - from + 1} of {to - from + 1}.{' '}
        <span className="dog-words">{frame?.explanation.explorer}</span>
      </figcaption>
    </figure>
  )
}

export function RobotDogMockupsPage() {
  const [inputId, setInputId] = useState<(typeof INPUTS)[number]['id']>('mixed')
  const [sizeId, setSizeId] = useState<(typeof SIZES)[number]['id']>('side')
  const input = INPUTS.find((i) => i.id === inputId) ?? INPUTS[0]
  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[0]
  const frames = useMemo(() => collectFrames(quickSort, input.values).frames, [input])
  const moments = useMemo(() => momentsOf(frames), [frames])
  const box = useMemo(() => ({ width: size.width, height: size.height }), [size])

  return (
    <main id="main" className="dog-mockups" tabIndex={-1}>
      <h1>Quick sort’s character, round two: two mockups (DO NOT MERGE)</h1>
      <p className="dog-intro">
        For picking a design only: nothing here is wired into quick sort’s Watch or Do it, and there
        are no sounds yet. Every scene is drawn from quick sort’s real frames (Lomuto, the last
        value as leader), at the stage sizes the site really has. The leader is blue; a yellow ring
        marks the value being compared and green marks a value in its final place, as marks only.
        The site’s theme switch (top right) shows dark mode.
      </p>
      <ul className="dog-legend" aria-label="The zones, along the bottom of the stage">
        <li>
          <span className="dog-swatch zone-left" /> Smaller than (or equal to) the leader
        </li>
        <li>
          <span className="dog-swatch zone-bigger" /> Bigger than the leader
        </li>
        <li>
          <span className="dog-swatch zone-unchecked" /> Not checked yet (bare)
        </li>
      </ul>
      <div className="dog-controls">
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
        <label>
          Stage size{' '}
          <select
            value={sizeId}
            onChange={(e) => {
              setSizeId(e.target.value as typeof sizeId)
            }}
          >
            {SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {DESIGNS.map((d) => (
        <section key={d.id} className="dog-design" aria-labelledby={`dog-${d.id}`}>
          <h2 id={`dog-${d.id}`}>{d.name}</h2>
          <dl className="dog-facts">
            <dt>The character</dt>
            <dd>{d.who}</dd>
            <dt>How the value shows</dt>
            <dd>{d.value}</dd>
            <dt>How it moves</dt>
            <dd>{d.moves}</dd>
            <dt>The leader</dt>
            <dd>{d.leader}</dd>
            <dt>The special move and the finale</dt>
            <dd>{d.special}</dd>
            <dt>On the tightest stage</dt>
            <dd>{d.tight}</dd>
          </dl>
          {/* New numbers or a new size start the clip over. */}
          <Clip key={`${inputId}-${sizeId}`} design={d.id} frames={frames} box={box} />
          <div
            className="dog-moments"
            style={{ '--scene-w': `${String(box.width + 6)}px` } as CSSProperties}
          >
            {MOMENTS.map(({ key, name }) => {
              const index = moments[key]
              return (
                <figure key={key} className="dog-moment">
                  <figcaption>{name}</figcaption>
                  {index === null ? (
                    <p className="dog-none">These numbers have no such moment.</p>
                  ) : (
                    <>
                      <MockupScene
                        design={d.id}
                        frames={frames}
                        index={index}
                        box={box}
                        motion={false}
                        stepMs={STEP_MS}
                        label={`${d.name}: ${name}`}
                      />
                      <p className="dog-words">{frames[index]?.explanation.explorer}</p>
                    </>
                  )}
                </figure>
              )
            })}
          </div>
        </section>
      ))}
    </main>
  )
}
