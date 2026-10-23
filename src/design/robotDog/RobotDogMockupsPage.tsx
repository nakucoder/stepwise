/**
 * TEMPORARY (mockup/quick-sort-dog, DO NOT MERGE): three designs for quick sort's robot dog, for
 * Juan to compare and pick. Not linked from the site's menus; reached at /design/robot-dog on the
 * PR preview. Each design shows nine moments as stills and plays one full round, from quick
 * sort's real frames, at the stage sizes the real page has (measured).
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { collectFrames } from '../../engine/collect'
import type { Frame } from '../../engine/types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { DogScene } from './DogScene'
import { firstRound, momentsOf, type Box, type Design, type Moments } from './layout'
import './RobotDogMockups.css'

interface DesignInfo {
  readonly id: Design
  readonly name: string
  readonly herds: string
  readonly value: string
  readonly moves: string
  readonly special: string
  readonly tight: string
}

const DESIGNS: readonly DesignInfo[] = [
  {
    id: 'sheep',
    name: 'A. Sheepdog: sheep on wool towers',
    herds:
      'The dog herds sheep. Each value is a sheep standing on a tower of wool bales; the bigger the number, the taller the tower.',
    value:
      'The tower’s height is the value, with a seam every ten (bales) where there is room, so 1, 2 and 3 are visibly a little taller each and 30 is three bales.',
    moves:
      'The dog runs along the field and drives a sheep left: the two sheep trot past each other, the herded one in front with a hop. A sheep that stays is left with a bark. Pens are fences under the row: a solid fence for the smaller side, a rope for the bigger side, nothing yet for the rest.',
    special:
      'Placing the leader: it trots into its gap and the dog sits; two gates swing shut around it. Finale: every sheep jumps in a wave, left to right.',
    tight:
      'At 479 × 60 (a phone on its side, 130% text) the sheep are 1× (10 × 7 px) on 40 px columns; seams vanish under 4 px a bale, the towers still carry the size.',
  },
  {
    id: 'bones',
    name: 'B. Fetch: bones planted in the yard',
    herds:
      'The dog fetches bones. Each value is a bone standing upright in the yard, as long as its number, knobs at both ends.',
    value:
      'The bone’s length is the value; even the shortest still has both knobs, so a 1 is a stubby bone, not a dot. No rider: the bone is the whole value.',
    moves:
      'The dog carries: it takes the herded bone in its mouth, lifts it over the row and plants it on the left, while the other slides back along the ground. The yard shows the zones: dug earth for the smaller side, grass for the bigger side, bare soil for the rest.',
    special:
      'Placing the leader: the dog digs and the leader drops into its hole with a puff of earth. Finale: every bone wiggles in turn and the dog spins.',
    tight:
      'At 479 × 60 the bones are 13 px wide and the dog is 1× (16 × 12); a lifted bone flies just above the row, so the field’s top must stay free.',
  },
  {
    id: 'bots',
    name: 'C. Hover-bots on light beams',
    herds:
      'The robot dog herds little hover-bots. Each value is a bot floating on a beam of light as tall as its number.',
    value:
      'The beam’s height is the value, with a light ring every ten where there is room. The bots all look alike: only the beam differs.',
    moves:
      'The dog pings (a radar ring) and the bots hop over each other in arcs, the herded one over the top. The floor lights the zones: lit tiles for the smaller side, striped for the bigger side, dark for the rest.',
    special:
      'Placing the leader: a clamp ring snaps down its beam and flashes. Finale: the bots light up one after another and the dog sits up.',
    tight:
      'At 479 × 60 the arcs are low (the field is short) and the bots are 1× (9 × 6 px); a hop over a tall beam leaves the field’s top, so it is clipped there.',
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
  { key: 'pick', name: '2. Picking the leader (the ball drops)' },
  { key: 'sniff', name: '3. Sniffing a value (compare)' },
  { key: 'herdLeft', name: '4. Herding a value left (swap)' },
  { key: 'stayRight', name: '5. Leaving a value on the right' },
  { key: 'nudge', name: '6. Swapping with itself (nudge in place)' },
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
      index >= to ? STEP_MS * 2.5 : STEP_MS,
    )
    return () => {
      window.clearTimeout(id)
    }
  }, [playing, index, from, to])
  const frame = frames[index]
  return (
    <figure className="dog-clip">
      <DogScene
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
      <h1>Quick sort’s robot dog: three mockups (DO NOT MERGE)</h1>
      <p className="dog-intro">
        For picking a design only: nothing here is wired into quick sort’s Watch or Do it, and there
        are no sounds yet. Every scene is drawn from quick sort’s real frames (Lomuto, the last
        value as leader), at the stage sizes the site really has. The leader’s ball is blue, the
        leader’s own colour; yellow rings mark the value being sniffed and green marks a value in
        its final spot, as marks only. The site’s theme switch (top right) shows dark mode.
      </p>
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
            <dt>What it herds</dt>
            <dd>{d.herds}</dd>
            <dt>How the value shows</dt>
            <dd>{d.value}</dd>
            <dt>How the dog moves</dt>
            <dd>{d.moves}</dd>
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
                      <DogScene
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
