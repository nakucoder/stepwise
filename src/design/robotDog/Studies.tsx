/**
 * TEMPORARY (mockup/quick-sort-dog, DO NOT MERGE): the studies shown above the cart design: one
 * pizza box in three versions (8× and real size, light and dark), and the cart's faces and
 * wiggles (stills at 8×, their times at each speed, and a short clip).
 */
import { useEffect, useMemo, useState } from 'react'
import { spritePath } from '../../characters/pixel'
import { BASE_STEP_DELAY_MS, SPEEDS } from '../../engine/player'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { CART_CODES, drawCart } from './sprites'
import {
  BANG,
  BOX_A,
  BOX_B,
  BOX_C,
  BOX_CODES,
  fittedFrames,
  MOOD_ORDER,
  MOODS,
  moodMs,
  type MoodFrame,
} from './studies'

function PixelArt({
  rows,
  codes,
  s,
  className,
}: {
  rows: readonly string[]
  codes: readonly string[]
  s: number
  className: string
}) {
  const paths = useMemo(
    () => codes.map((code) => [code, spritePath(rows, code)] as const).filter(([, d]) => d),
    [rows, codes],
  )
  const w = Math.max(...rows.map((row) => row.length))
  return (
    <svg
      className={`mk-sprite ${className}`}
      width={w * s}
      height={rows.length * s}
      viewBox={`0 0 ${String(w)} ${String(rows.length)}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {paths.map(([code, d]) => (
        <path key={code} d={d} className={`px-${code}`} />
      ))}
    </svg>
  )
}

const BOXES = [
  {
    id: 'A',
    name: 'Box 1. Closed, a little from above',
    text: 'Plain cardboard. The lid shows, printed with a round pizza: a red circle with a few dots.',
    rows: BOX_A,
  },
  {
    id: 'B',
    name: 'Box 2. Takeout print',
    text: 'The same view, white, with a red-and-white takeout print down the sides and a round pizza icon on the lid (crust, sauce, pepperoni).',
    rows: BOX_B,
  },
  {
    id: 'C',
    name: 'Box 3. Open, from the front',
    text: 'The lid stands up behind and the whole round pizza shows from above: crust ring, red sauce, pepperoni.',
    rows: BOX_C,
  },
] as const

const THEMES = ['light', 'dark'] as const

function BoxStudies() {
  return (
    <section className="dog-design study" aria-labelledby="study-boxes">
      <h2 id="study-boxes">One pizza box: three versions</h2>
      <p className="dog-intro">
        Pick one before the stacks are redrawn. Each is shown at 8× and at real size (1× and 2×, the
        sizes it would have on a phone and on a desktop stage), on the stage’s light and dark grid.
        All original: no chain’s look, logo or name.
      </p>
      <div className="study-boxes">
        {BOXES.map((box) => (
          <figure key={box.id} className="study-box">
            <figcaption>
              <strong>{box.name}</strong> {box.text}
            </figcaption>
            <div className="study-panels">
              {THEMES.map((theme) => (
                <div key={theme} className={`study-panel is-${theme}`}>
                  <span className="study-label">{theme}</span>
                  <PixelArt rows={box.rows} codes={BOX_CODES} s={8} className="pbox" />
                  <div className="study-real">
                    <PixelArt rows={box.rows} codes={BOX_CODES} s={1} className="pbox" />
                    <PixelArt rows={box.rows} codes={BOX_CODES} s={2} className="pbox" />
                    <span className="study-label">real size: 1×, 2×</span>
                  </div>
                </div>
              ))}
            </div>
          </figure>
        ))}
      </div>
    </section>
  )
}

/** The cart in one pose, with the "!" over it when the pose has one. */
function CartPoseArt({ frame, s }: { frame: MoodFrame; s: number }) {
  const rows = useMemo(
    () =>
      drawCart({
        face: frame.face ?? 'idle',
        antenna: frame.antenna ?? 'up',
        flag: frame.flag ?? 'a',
      }),
    [frame.face, frame.antenna, frame.flag],
  )
  return (
    <span className="study-cart" style={{ paddingTop: `${String(8 * s)}px` }}>
      {frame.bang && (
        <span className="study-bang" style={{ left: `${String(23 * s)}px`, top: '0px' }}>
          <PixelArt rows={BANG} codes={['o', 'x']} s={s} className="bang" />
        </span>
      )}
      <PixelArt rows={rows} codes={CART_CODES} s={s} className="actor" />
    </span>
  )
}

/** A mood's different poses, in order (each pose once). */
function posesOf(frames: readonly MoodFrame[]): readonly MoodFrame[] {
  const seen = new Set<string>()
  return frames.filter((f) => {
    const key = `${f.face ?? ''}|${f.antenna ?? ''}|${f.flag ?? ''}|${String(f.bang ?? false)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const fmt = (ms: number) => `${String(Math.round(ms))} ms`

function MoodClip() {
  const reduced = useReducedMotion()
  const [speed, setSpeed] = useState<number>(1)
  const [mood, setMood] = useState(0)
  // The frame shown, for the mood it belongs to (a new mood starts at its first frame).
  const [tick, setTick] = useState({ mood: 0, frame: 0 })
  const spec = MOODS[MOOD_ORDER[mood] ?? 'idle']
  const frames = useMemo(() => fittedFrames(spec, speed), [spec, speed])

  useEffect(() => {
    const step = BASE_STEP_DELAY_MS / speed
    const timers: number[] = []
    if (!reduced) {
      let at = 0
      frames.forEach((_, k) => {
        if (k === 0) return
        at += frames[k - 1]?.ms ?? 0
        timers.push(
          window.setTimeout(() => {
            setTick({ mood, frame: k })
          }, at),
        )
      })
    }
    // A step lasts its delay; the special move holds until it is done; the finale plays in
    // full, then rests before the loop starts over.
    const own = frames.reduce((sum, f) => sum + f.ms, 0)
    const length =
      spec.timing === 'fit' ? step : spec.timing === 'special' ? Math.max(step, own) : own + 1200
    timers.push(
      window.setTimeout(() => {
        setMood((m) => (m + 1) % MOOD_ORDER.length)
      }, length),
    )
    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [mood, frames, speed, reduced, spec.timing])

  // With reduced motion, final poses only.
  const frame = reduced ? frames.length - 1 : tick.mood === mood ? tick.frame : 0
  const current = frames[frame] ?? frames[0] ?? { ms: 0 }
  return (
    <figure className="dog-clip study-clip">
      <div className="study-panels">
        {THEMES.map((theme) => (
          <div key={theme} className={`study-panel is-${theme}`}>
            <span className="study-label">{theme}</span>
            <CartPoseArt frame={current} s={6} />
            <CartPoseArt frame={current} s={1} />
          </div>
        ))}
      </div>
      <figcaption>
        <span className="study-speeds" role="group" aria-label="Speed">
          {SPEEDS.filter((v) => v >= 1).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={speed === v}
              onClick={() => {
                setSpeed(v)
              }}
            >
              {speed === v ? '✓ ' : ''}
              {v}×
            </button>
          ))}
        </span>{' '}
        Looping through the moods, one step each at {speed}× ({fmt(BASE_STEP_DELAY_MS / speed)} a
        step): <strong>{spec.name}</strong> <span className="dog-words">{spec.when}</span>
      </figcaption>
    </figure>
  )
}

function CartFaces() {
  return (
    <section className="dog-design study" aria-labelledby="study-faces">
      <h2 id="study-faces">The cart’s faces and wiggles</h2>
      <p className="dog-intro">
        Its face screen, an antenna over it and the flag at the back say what it is doing; they
        never replace the words under the stage. Frequent moods fit inside the step at every speed
        (like any frequent move); “Delivered!” is the special move and holds; the finale plays in
        full. The quiet one, staying right, is one calm blink.
      </p>
      <MoodClip />
      <table className="study-times">
        <caption>How long each mood takes (fitted), and the budget at 4×</caption>
        <thead>
          <tr>
            <th scope="col">Mood</th>
            <th scope="col">Timing</th>
            <th scope="col">Its own length</th>
            <th scope="col">At 1×</th>
            <th scope="col">At 2×</th>
            <th scope="col">At 4×</th>
            <th scope="col">Shortest frame at 4×</th>
          </tr>
        </thead>
        <tbody>
          {MOOD_ORDER.map((id) => {
            const spec = MOODS[id]
            const at = (speed: number) => moodMs({ ...spec, frames: fittedFrames(spec, speed) })
            const shortest = Math.min(
              ...fittedFrames(spec, 4)
                .slice(0, -1)
                .map((f) => f.ms),
            )
            return (
              <tr key={id}>
                <th scope="row">{spec.name}</th>
                <td>
                  {spec.timing === 'fit'
                    ? 'fits the step (fitMs)'
                    : spec.timing === 'special'
                      ? 'held (specialMs)'
                      : 'in full'}
                </td>
                <td>{fmt(moodMs(spec))}</td>
                <td>{fmt(at(1))}</td>
                <td>{fmt(at(2))}</td>
                <td>
                  {fmt(at(4))}
                  {spec.timing === 'fit' ? ` (budget ${fmt(0.9 * (BASE_STEP_DELAY_MS / 4))})` : ''}
                </td>
                <td>{Number.isFinite(shortest) ? fmt(shortest) : '(still)'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="study-moods">
        {MOOD_ORDER.map((id) => {
          const spec = MOODS[id]
          return (
            <figure key={id} className="study-mood">
              <figcaption>
                <strong className="study-name">{spec.name}</strong> {spec.when}
              </figcaption>
              <div className="study-panels">
                {THEMES.map((theme) => (
                  <div key={theme} className={`study-panel is-${theme}`}>
                    <span className="study-label">{theme}</span>
                    <div className="study-frames">
                      {posesOf(spec.frames).map((f, k) => (
                        <CartPoseArt key={k} frame={f} s={8} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </figure>
          )
        })}
      </div>
    </section>
  )
}

export function Studies() {
  return (
    <>
      <BoxStudies />
      <CartFaces />
    </>
  )
}
