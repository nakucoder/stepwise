/**
 * TEMPORARY (mockup/quick-sort-dog, DO NOT MERGE): quick sort's character, Juan's pick (J, the
 * delivery cart and takeout pizza boxes). Not linked from the site's menus; reached at
 * /design/robot-dog on the PR preview. For every real stage size, light and dark side by side,
 * it shows nine moments as stills and plays one full round, from quick sort's real frames.
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { collectFrames } from '../../engine/collect'
import type { Frame } from '../../engine/types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { firstRound, momentsOf, type Box, type Moments } from './layout'
import { MockupScene, PixelArt } from './MockupScene'
import { BOX_CODES, pizzaStack } from './studies'
import './RobotDogMockups.css'

const NAME = 'J. Delivery cart and pizza boxes'

const FACTS: readonly (readonly [string, string])[] = [
  [
    'The character',
    'A six-wheeled sidewalk delivery cart (three wheels show from the side) with a face screen, an antenna over it and a flag on a pole at the back. No real company’s look.',
  ],
  [
    'How the value shows',
    'Every value is a stack of takeout pizza boxes on a dolly at the curb; the boxes are exactly as tall as the number (outlines and the top lid included), all the same width. The dolly is only as tall as its digit.',
  ],
  [
    'The pizza boxes',
    'Box 2: white with red-and-white stripes, seen a little from above, so the top lid and the right side show. “PIZZA” in a 3 × 5 pixel font on every box with room (a front 21 × 7 px or more); smaller boxes show only stripes. Every box has a 1 px very dark outline inside its own height, so each box in a stack stands apart. The lid’s round pizza shows only where it reads as a circle (a lid 6 px deep or more).',
  ],
  [
    'The leader',
    'Its boxes are their own red with white lettering (every other stack is red-and-white stripes), with a blue ribbon and bow, the leader’s colour as a mark, so it doesn’t rely on colour alone.',
  ],
  [
    'How it moves',
    'The cart rolls (wheels turning) under the stack, lifts it on its deck and rolls it to its new place in the left zone; the other stack slides along the curb to the place it left. A stack that stays put is lifted and set down. A stack left on the right wobbles. The street shows the zones.',
  ],
  [
    'Its moods',
    'Looking (compare): its eyes go up to the box and across to the leader, the antenna tilts. Found it (goes left): wide eyes, a small “!”, the antenna wiggles fast. Stays right: calm, one blink. Delivered: a proud smile, the antenna bounces. Range done and finale: happy ^ ^ eyes, the antenna and the flag wave. Frequent moods fit inside the step at every speed; Delivered is held; the finale plays in full.',
  ],
  [
    'The special move and the finale',
    '“Delivered!”: the cart sets the leader in its gap, the top box opens on its whole pizza, the lid flips up and a puff of steam rises. Finale: the stacks hop in a wave and the cart bounces.',
  ],
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

/** The real stage fields' sizes (measured on the site with 12 numbers). */
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

const THEMES = ['light', 'dark'] as const

/** One scene in each theme, side by side. */
function BothThemes({ render }: { render: (theme: (typeof THEMES)[number]) => ReactNode }) {
  return (
    <div className="dog-themes">
      {THEMES.map((theme) => (
        <div key={theme} className={`force-${theme}`}>
          <span className="dog-theme-label">{theme}</span>
          {render(theme)}
        </div>
      ))}
    </div>
  )
}

/** The outline: ours against pure black, in both themes, on three boxes at 4×. */
function OutlineCompare() {
  const art = pizzaStack(34, [10, 9, 13], 4, 'every').rows
  return (
    <figure className="dog-clip">
      <figcaption>
        <strong>The outline:</strong> ours (#1c1210, a very dark brown) beside pure black, at 4×.
        Between boxes it sits on white and red in both themes (16.7:1 on white, 3.9:1 on the
        stripes’ red). Against the dark stage no very dark colour stands out (ours is 1.6:1, pure
        black 1.8:1); there the boxes’ own white and red carry the stack’s edge.
      </figcaption>
      <BothThemes
        render={() => (
          <span className="mk-scene dog-outline-demo">
            <span>
              ours
              <PixelArt rows={art} codes={BOX_CODES} s={4} className="pbox" />
            </span>
            <span>
              black
              <PixelArt
                rows={art}
                codes={BOX_CODES}
                s={4}
                className="pbox"
                style={{ '--box-line': '#000000' } as CSSProperties}
              />
            </span>
          </span>
        )}
      />
    </figure>
  )
}

function Clip({ frames, box }: { frames: readonly Frame[]; box: Box }) {
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
      <BothThemes
        render={(theme) => (
          <MockupScene
            frames={frames}
            index={index}
            box={box}
            motion={!reduced}
            stepMs={STEP_MS}
            label={`One round (${theme}), step ${String(index - from + 1)} of ${String(to - from + 1)}`}
          />
        )}
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

/** Every moment and a looping round, for one stage size, light and dark side by side. */
function SizeBlock({
  frames,
  moments,
  size,
  inputId,
}: {
  frames: readonly Frame[]
  moments: Moments
  size: (typeof SIZES)[number]
  inputId: string
}) {
  const box = useMemo(() => ({ width: size.width, height: size.height }), [size])
  return (
    <section className="dog-size" aria-labelledby={`size-${size.id}`}>
      <h3 id={`size-${size.id}`}>{size.label}</h3>
      {/* New numbers start the clip over. */}
      <Clip key={inputId} frames={frames} box={box} />
      <div
        className="dog-moments"
        style={{ '--scene-w': `${String(box.width * 2 + 24)}px` } as CSSProperties}
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
                  <BothThemes
                    render={(theme) => (
                      <MockupScene
                        frames={frames}
                        index={index}
                        box={box}
                        motion={false}
                        stepMs={STEP_MS}
                        label={`${NAME}, ${size.label}, ${theme}: ${name}`}
                      />
                    )}
                  />
                  <p className="dog-words">{frames[index]?.explanation.explorer}</p>
                </>
              )}
            </figure>
          )
        })}
      </div>
    </section>
  )
}

export function RobotDogMockupsPage() {
  const [inputId, setInputId] = useState<(typeof INPUTS)[number]['id']>('mixed')
  const [sizeId, setSizeId] = useState<'all' | (typeof SIZES)[number]['id']>('all')
  const input = INPUTS.find((i) => i.id === inputId) ?? INPUTS[0]
  const sizes = sizeId === 'all' ? SIZES : SIZES.filter((s) => s.id === sizeId)
  const frames = useMemo(() => collectFrames(quickSort, input.values).frames, [input])
  const moments = useMemo(() => momentsOf(frames), [frames])

  return (
    <main id="main" className="dog-mockups" tabIndex={-1}>
      <h1>Quick sort’s character: the delivery cart (DO NOT MERGE)</h1>
      <p className="dog-intro">
        For picking a design only: nothing here is wired into quick sort’s Watch or Do it, and there
        are no sounds yet. Every scene is drawn from quick sort’s real frames (Lomuto, the last
        value as leader), at the stage sizes the site really has, light and dark side by side. The
        leader’s boxes are red with a blue ribbon; a yellow ring marks the value being compared and
        green marks a value in its final place, as marks only.
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
            <option value="all">Every size</option>
            {SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="dog-design" aria-labelledby="dog-pizza">
        <h2 id="dog-pizza">{NAME}</h2>
        <dl className="dog-facts">
          {FACTS.map(([term, text]) => (
            <div key={term} className="dog-fact">
              <dt>{term}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
        <OutlineCompare />
        {sizes.map((size) => (
          <SizeBlock
            key={size.id}
            frames={frames}
            moments={moments}
            size={size}
            inputId={inputId}
          />
        ))}
      </section>
    </main>
  )
}
