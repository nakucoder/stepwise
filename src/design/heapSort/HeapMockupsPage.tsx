/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): heap sort's character, two designs to
 * pick from. Not linked from the site's menus; reached at /design/heap-sort on the PR preview.
 * For every real stage size, light and dark side by side, it shows eight moments as stills and
 * plays a short run, all from heap sort's real frames. Nothing here is wired into Watch or Do it,
 * and there are no sounds.
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { heapSort } from '../../algorithms/sorting/heapSort'
import { collectFrames } from '../../engine/collect'
import type { Frame } from '../../engine/types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { MockScene } from './MockScene'
import {
  clipRange,
  identities,
  momentsOf,
  moveInto,
  planOf,
  SIZES,
  type Design,
  type Moments,
  type StageSize,
} from './model'
import { MOVE_MS } from './pose'
import './HeapMockups.css'

const DESIGNS: readonly {
  readonly id: Design
  readonly name: string
  readonly facts: readonly (readonly [string, string])[]
}[] = [
  {
    id: 'stego',
    name: 'D. Stegosaurus herd',
    facts: [
      [
        'The character',
        'A retro pixel-art stegosaurus seen from the side, facing right: a warm orange body, a pale belly, a small low head. Every dino is the same size on a stage; no known character.',
      ],
      [
        'How the value shows',
        'One plate = one: a 7 has exactly 7 plates on its back, from the neck back toward the tail, in two rows as on a real stegosaurus (the front row light, the back row darker). Every plate is the same, 3 px wide, a new plate every 2 px. A big value is a long row of plates; its number is on the stone under its feet. The dino look uses 1 to 12 (bars keep 0 to 99).',
      ],
      [
        'A family compared',
        'The parent and its bigger child turn to each other (the head dips) inside the yellow ring; the band’s arcs show the family.',
      ],
      [
        'A climb',
        'The child hops over its parent to the parent’s place (as high as the stage allows), in front; the parent walks down to the child’s place.',
      ],
      ['A stop', 'The parent stays and lifts its head; nothing moves.'],
      [
        'The top leaving (special move)',
        'The top dino walks proudly to the end of the pyramid, head up, bobbing with each step, and settles with the finished herd on the green ground behind the dashed fence. The dino from the end goes up to the top behind it.',
      ],
      ['Finale', 'The herd hops in a wave, left to right, mouths open.'],
      ['The tree', 'Stays the site’s circles: a dino side view doesn’t sit on a node.'],
    ],
  },
  {
    id: 'monkey',
    name: 'M. Monkeys in a tree',
    facts: [
      [
        'The character',
        'A small brown pixel-art monkey seen from the front, sitting, both hands up holding its bananas on its head. Every monkey is the same size on a stage; no known character.',
      ],
      [
        'How the value shows',
        'One banana = one: a 7 holds exactly 7 identical bananas, stacked, each with a dark outline (the line between one banana and the next) and a brown stem. The stack is sized for 12, so its height is the value too, like the bars. Its number is on the crate under it. Where a banana gets under 3 px, the stack is the plain one: a pale column, with a dark line between bananas at 2 px, a solid column at 1 px. The monkey look uses 1 to 12 (bars keep 0 to 99).',
      ],
      [
        'A family compared',
        'The parent and its bigger child look to the side inside the yellow ring; the band’s arcs show the family.',
      ],
      [
        'A climb',
        'The child swings up on a vine hanging from the top of the stage, past its parent, to the parent’s place; the parent drops down to the child’s place.',
      ],
      ['A stop', 'Nothing moves: the parent keeps its place.'],
      [
        'The top leaving (special move)',
        'The top monkey swings down on a long vine to the end of the pyramid and joins the finished row; the one from the end goes up to the top.',
      ],
      ['Finale', 'The monkeys lift their bananas high in a wave.'],
      [
        'The tree',
        'Where the site shows the tree on the stage (desktop, phone upright), the monkeys sit at its forks on brown branches, the same marks as the tree today (yellow family, pink climb); finished values leave the tree. A row of the tree is about 40 px, so the tree’s bananas are the plain stack (2 px each).',
      ],
    ],
  },
]

const INPUTS = [
  {
    id: 'mixed',
    label: '1 to 12 mixed up (the check:fit list)',
    values: [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8],
  },
  {
    id: 'dupes',
    label: 'Repeats: 9 4 9 2 7 4 12 1 7 3 9 5',
    values: [9, 4, 9, 2, 7, 4, 12, 1, 7, 3, 9, 5],
  },
  {
    id: 'six',
    label: 'The default 6 (the whole run, with the finale)',
    values: [5, 2, 8, 1, 9, 3],
  },
] as const

const MOMENTS: readonly {
  readonly key: keyof Moments
  readonly name: string
  /** Moves are shown halfway, with their path. */
  readonly t: number
}[] = [
  { key: 'start', name: '1. The start', t: 1 },
  { key: 'family', name: '2. Looking at a family (the children compared)', t: 1 },
  { key: 'climb', name: '3. A climb (halfway)', t: 0.5 },
  { key: 'stop', name: '4. A stop (it stays)', t: 1 },
  { key: 'leave', name: '5. The top leaving for the end (special move, halfway)', t: 0.45 },
  { key: 'handover', name: '6. The pyramid is built: take the top next', t: 1 },
  { key: 'shrinking', name: '7. The pyramid shrinking', t: 1 },
  { key: 'finale', name: '8. The finale (mid-wave)', t: 0.55 },
]

const STEP_MS = 900
const THEMES = ['light', 'dark'] as const

/** One scene in each theme, side by side. */
function BothThemes({ render }: { render: (theme: (typeof THEMES)[number]) => ReactNode }) {
  return (
    <div className="hm-themes">
      {THEMES.map((theme) => (
        <div key={theme} className={`force-${theme}`}>
          <span className="hm-theme-label">{theme}</span>
          {render(theme)}
        </div>
      ))}
    </div>
  )
}

/** What a design's sizes come to on a stage, in one line. */
function planLine(design: Design, size: StageSize): string {
  const plan = planOf(design, size)
  if (design === 'stego') {
    return `Dinos at ${String(plan.s)}× (${String(31 * plan.s)} px wide), plates 3 px wide every 2 px; numbers ${String(plan.font)} px.`
  }
  return plan.plain
    ? `Monkeys at ${String(plan.s)}×, the plain stack: ${String(plan.u)} px a banana (a 12 is ${String(12 * plan.u)} px); numbers ${String(plan.font)} px.`
    : `Monkeys at ${String(plan.s)}×, bananas drawn: ${String(plan.u)} px a banana (a 12 is ${String(12 * plan.u)} px); numbers ${String(plan.font)} px.`
}

function Clip({
  design,
  frames,
  ids,
  size,
}: {
  design: Design
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
    const move = moveInto(frames, index)
    const done = frames[index]?.heap?.event === 'done'
    const moveMs = reduced
      ? 0
      : move.kind === 'climb'
        ? MOVE_MS.climb
        : move.kind === 'extract'
          ? MOVE_MS.extract
          : done
            ? MOVE_MS.finale
            : 0
    // The special move and the finale are held: the step waits for them.
    const holdMs = Math.max(STEP_MS, moveMs + (done ? 900 : 300))
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = now - start
      setT(moveMs > 0 ? Math.min(1, elapsed / moveMs) : 1)
      if (elapsed >= holdMs) {
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
  const frame = frames[index]
  return (
    <figure className="hm-clip">
      <BothThemes
        render={(theme) => (
          <MockScene
            design={design}
            frames={frames}
            ids={ids}
            index={index}
            t={t}
            size={size}
            tree={design === 'monkey'}
            label={`A short run (${theme}), step ${String(index - from + 1)} of ${String(to - from + 1)}`}
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
        A short run, looping: step {index - from + 1} of {to - from + 1}.{' '}
        <span className="hm-words">{frame?.explanation.explorer}</span>
      </figcaption>
    </figure>
  )
}

function SizeBlock({
  design,
  name,
  frames,
  ids,
  moments,
  size,
  inputId,
}: {
  design: Design
  name: string
  frames: readonly Frame[]
  ids: readonly (readonly number[])[]
  moments: Moments
  size: StageSize
  inputId: string
}) {
  return (
    <section className="hm-size" aria-labelledby={`${design}-${size.id}`}>
      <h3 id={`${design}-${size.id}`}>{size.label}</h3>
      <p className="hm-plan">{planLine(design, size)}</p>
      {/* New numbers start the clip over. */}
      <Clip key={inputId} design={design} frames={frames} ids={ids} size={size} />
      <div
        className="hm-moments"
        style={{ '--scene-w': `${String(size.width * 2 + 30)}px` } as CSSProperties}
      >
        {MOMENTS.map(({ key, name: moment, t }) => {
          const index = moments[key]
          return (
            <figure key={key} className="hm-moment">
              <figcaption>{moment}</figcaption>
              {index === null ? (
                <p className="hm-none">These numbers have no such moment.</p>
              ) : (
                <>
                  <BothThemes
                    render={(theme) => (
                      <MockScene
                        design={design}
                        frames={frames}
                        ids={ids}
                        index={index}
                        t={t}
                        path={t < 1 && key !== 'finale'}
                        size={size}
                        tree={design === 'monkey'}
                        label={`${name}, ${size.label}, ${theme}: ${moment}`}
                      />
                    )}
                  />
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

/** Every value from 1 to 12 in a row, on the tightest stage and one roomy stage. */
function Lineup({ design }: { design: Design }) {
  const frames = useMemo(
    () => collectFrames(heapSort, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).frames,
    [],
  )
  const ids = useMemo(() => identities(frames), [frames])
  const sizes = SIZES.filter((s) => s.id === 'tight' || s.id === 'side-100')
  return (
    <section className="hm-size" aria-labelledby={`${design}-lineup`}>
      <h3 id={`${design}-lineup`}>1 to 12 in a row: how small values read</h3>
      {sizes.map((size) => (
        <figure key={size.id} className="hm-clip">
          <figcaption>
            {size.label}. {planLine(design, size)}
          </figcaption>
          <BothThemes
            render={(theme) => (
              <MockScene
                design={design}
                frames={frames}
                ids={ids}
                index={0}
                t={1}
                size={size}
                label={`1 to 12, ${size.label}, ${theme}`}
              />
            )}
          />
        </figure>
      ))}
    </section>
  )
}

export function HeapMockupsPage() {
  const [inputId, setInputId] = useState<(typeof INPUTS)[number]['id']>('mixed')
  const [sizeId, setSizeId] = useState<string>('all')
  const [designId, setDesignId] = useState<'both' | Design>('both')
  const input = INPUTS.find((i) => i.id === inputId) ?? INPUTS[0]
  const sizes = sizeId === 'all' ? SIZES : SIZES.filter((s) => s.id === sizeId)
  const designs = designId === 'both' ? DESIGNS : DESIGNS.filter((d) => d.id === designId)
  const frames = useMemo(() => collectFrames(heapSort, input.values).frames, [input])
  const ids = useMemo(() => identities(frames), [frames])
  const moments = useMemo(() => momentsOf(frames), [frames])

  return (
    <main id="main" className="hm-page" tabIndex={-1}>
      <h1>Heap sort’s character: two designs (DO NOT MERGE)</h1>
      <p className="hm-intro">
        For picking a design only: nothing here is wired into heap sort’s Watch or Do it, and there
        are no sounds. Every scene is drawn from heap sort’s real frames, at the stage sizes the
        site really has with 12 numbers (measured on the live site), light and dark side by side.
        Over each field is the pyramid band as the site draws it at that size: the row tags (“top”,
        “row 2”, or the row’s number where a column is narrow, and on a phone on its side one row
        under the arcs) and the arcs from the parent to its children. The tags under the values stay
        as they are today and aren’t drawn here. Yellow marks the family being compared, pink a
        climb or the top leaving, green a value in its final place, as marks only. The pyramid’s
        part and the finished end keep the site’s two tints, with a dashed fence between them.
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
        <label>
          Stage size{' '}
          <select
            value={sizeId}
            onChange={(e) => {
              setSizeId(e.target.value)
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
        <label>
          Design{' '}
          <select
            value={designId}
            onChange={(e) => {
              setDesignId(e.target.value as typeof designId)
            }}
          >
            <option value="both">Both</option>
            {DESIGNS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {designs.map((design) => (
        <section key={design.id} className="hm-design" aria-labelledby={`design-${design.id}`}>
          <h2 id={`design-${design.id}`}>{design.name}</h2>
          <dl className="hm-facts">
            {design.facts.map(([term, text]) => (
              <div key={term} className="hm-fact">
                <dt>{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          <Lineup design={design.id} />
          {sizes.map((size) => (
            <SizeBlock
              key={size.id}
              design={design.id}
              name={design.name}
              frames={frames}
              ids={ids}
              moments={moments}
              size={size}
              inputId={inputId}
            />
          ))}
        </section>
      ))}
    </main>
  )
}
