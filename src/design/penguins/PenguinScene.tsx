/**
 * TEMPORARY (design/penguins, never merged): the three penguin designs for insertion sort,
 * drawn the way the real renderer will be: in the box's own pixels, the values filling it like
 * bars, the sprites at a whole number of screen pixels per pixel (1×, 2×, 3×), each penguin
 * centered on its value. Nothing is ever drawn outside the box (see the test).
 *
 * A. Ice pillars: the key's pillar glides forward into a lane in front of the line and waits;
 *    it belly-slides along the lane and back in.
 * B. Snow-brick towers: the key's tower rides a sled in the lane, then slides off into its gap.
 * C. Ice shelf: the key rises onto a floating ice ledge, glides along it, then slides down a
 *    ramp into its gap.
 */
import { useLayoutEffect, useRef } from 'react'
import {
  GROUND,
  LANE,
  layout,
  LIFT,
  MOVE_MS,
  SLAB,
  SLED,
  SLIDE_MS,
  DANCE_STAGGER_MS,
  spotOf,
  type Design,
  type Layout,
} from './layout'
import type { MockStep } from './steps'
import {
  FLAP_PATHS,
  PENGUIN_H,
  PENGUIN_PATHS,
  PENGUIN_W,
  SLIDE_H,
  SLIDE_PATHS,
  SLIDE_W,
  type SpritePaths,
} from './sprites'

const px = (x: number, y: number) => `translate(${String(x)}px, ${String(y)}px)`

function Sprite({ paths, s }: { readonly paths: SpritePaths; readonly s: number }) {
  return (
    <g transform={`scale(${String(s)})`}>
      <path d={paths.rim} fill="var(--ice-light)" />
      <path d={paths.belly} fill="var(--penguin-belly)" />
      <path d={paths.back} fill="var(--penguin-back)" />
      <path d={paths.orange} fill="var(--penguin-orange)" />
      <path d={paths.eye} fill="var(--penguin-belly)" />
      <path d={paths.outline} fill="var(--penguin-outline)" />
    </g>
  )
}

function Pillar({
  design,
  value,
  w,
  h,
  geo,
}: {
  readonly design: Design
  readonly value: number
  readonly w: number
  readonly h: number
  readonly geo: Layout
}) {
  const { s, font } = geo
  const rows: number[] = []
  if (design === 'bricks') for (let y = 6 * s; y < h - s; y += 6 * s) rows.push(y)
  return (
    <>
      <rect className={`pillar-${design}`} x={0} y={0} width={w} height={h} />
      {design === 'pillars' && (
        <>
          <rect
            className="ice-shine"
            x={s}
            y={2 * s}
            width={2 * s}
            height={Math.max(0, h - 3 * s)}
          />
          <rect
            className="ice-shade"
            x={w - 3 * s}
            y={2 * s}
            width={2 * s}
            height={Math.max(0, h - 3 * s)}
          />
          <rect className="snow-cap" x={0} y={0} width={w} height={2 * s} />
        </>
      )}
      {design === 'bricks' &&
        rows.map((y, k) => (
          <g key={y}>
            <rect className="brick-mortar" x={s} y={y} width={w - 2 * s} height={s} />
            <rect
              className="brick-mortar"
              x={Math.round(k % 2 === 0 ? w / 2 : w / 4)}
              y={y - 6 * s + s}
              width={s}
              height={5 * s}
            />
          </g>
        ))}
      {design === 'shelf' && (
        <>
          <rect
            className="ice-shine"
            x={2 * s}
            y={2 * s}
            width={s}
            height={Math.min(4 * s, h - 3 * s)}
          />
          <rect
            className="ice-shine"
            x={3 * s}
            y={2 * s}
            width={s}
            height={Math.min(2 * s, h - 3 * s)}
          />
        </>
      )}
      <rect
        className="pillar-edge"
        x={s / 2}
        y={s / 2}
        width={w - s}
        height={h - s}
        strokeWidth={s}
      />
      <text className="pillar-number" x={w / 2} y={Math.min(h - s, 2 * s + font)} fontSize={font}>
        {value}
      </text>
    </>
  )
}

interface SceneProps {
  readonly design: Design
  readonly step: MockStep
  readonly width: number
  readonly height: number
  readonly motion: boolean
  /** Changes to play the step's move again. */
  readonly replay: number
  readonly title: string
}

export function PenguinScene({ design, step, width, height, motion, replay, title }: SceneProps) {
  const ref = useRef<SVGSVGElement>(null)
  const state = step.after
  const values = state.array
  const geo = layout(width, height, values.length, design, Math.max(...values))
  const { s } = geo

  useLayoutEffect(() => {
    const svg = ref.current
    if (!svg || !motion || typeof svg.animate !== 'function') return
    const el = (name: string) => svg.querySelector<SVGGElement>(`[data-part="${name}"]`)
    const run: Animation[] = []
    const go = (target: Element | null, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      if (target) run.push(target.animate(frames, options))
    }
    const before = step.before
    // Every pillar moves from where it stood before the step to where it stands after.
    for (const value of values) {
      const from = spotOf(before, value, geo, design)
      const to = spotOf(state, value, geo, design)
      const h = geo.height(value)
      if (from.x === to.x && from.bottom === to.bottom) continue
      const a = px(from.x, from.bottom - h)
      const b = px(to.x, to.bottom - h)
      const pillar = el(`pillar-${String(value)}`)
      if (step.id === 'slide') {
        // The special move: along the lane (or ledge) to the gap, then into the line.
        const along = px(to.x, from.bottom - h)
        const frames =
          design === 'shelf'
            ? [
                { offset: 0, transform: a, easing: 'ease-in' },
                {
                  offset: 0.45,
                  transform: px(to.x + geo.pillarW, from.bottom - h),
                  easing: 'ease-in',
                },
                { offset: 1, transform: b },
              ]
            : [
                { offset: 0, transform: a, easing: 'ease-in' },
                { offset: 0.78, transform: along, easing: 'ease-out' },
                { offset: 1, transform: b },
              ]
        go(pillar, frames, { duration: SLIDE_MS })
        // The penguin lies on its belly for the slide, then stands up.
        go(
          el(`stand-${String(value)}`),
          [{ opacity: 0 }, { opacity: 0, offset: 0.9 }, { opacity: 1 }],
          {
            duration: SLIDE_MS,
          },
        )
        go(
          el(`belly-${String(value)}`),
          [{ opacity: 1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }],
          {
            duration: SLIDE_MS,
          },
        )
        go(
          el('spray'),
          [
            { opacity: 0 },
            { opacity: 1, offset: 0.2 },
            { opacity: 1, offset: 0.75 },
            { opacity: 0 },
          ],
          {
            duration: SLIDE_MS,
          },
        )
      } else {
        const ms =
          step.id === 'inplace'
            ? MOVE_MS.inplace
            : step.id === 'start'
              ? MOVE_MS.start
              : MOVE_MS.shift
        go(pillar, [{ transform: a }, { transform: b }], { duration: ms, easing: 'ease-in-out' })
      }
    }
    if (design === 'bricks' && step.id === 'slide' && before.key) {
      const target = before.array[before.key.slot]
      const to = target === undefined ? null : spotOf(state, target, geo, design)
      if (to) {
        const from = geo.center(before.key.waitAt) - Math.round(geo.pillarW / 2)
        const y = geo.laneBase - SLED * s
        go(
          el('sled'),
          [
            { offset: 0, transform: px(from, y), opacity: 1, easing: 'ease-in' },
            { offset: 0.78, transform: px(to.x, y), opacity: 1 },
            { offset: 1, transform: px(to.x, y), opacity: 0 },
          ],
          { duration: SLIDE_MS, fill: 'forwards' },
        )
      }
    }
    if (design === 'bricks' && step.id === 'start') {
      go(el('sled'), [{ opacity: 0 }, { opacity: 1 }], { duration: MOVE_MS.start })
    }
    if (step.id === 'inplace') {
      const key = before.key ? before.array[before.key.slot] : undefined
      if (key !== undefined) {
        go(
          el(`hop-${String(key)}`),
          [
            { transform: 'translateY(0)' },
            { transform: `translateY(${String(-4 * s)}px)`, offset: 0.7 },
            { transform: 'translateY(0)' },
          ],
          { duration: MOVE_MS.inplace, delay: MOVE_MS.inplace },
        )
      }
    }
    if (step.id === 'compare') {
      go(el('marks'), [{ opacity: 0 }, { opacity: 1 }], { duration: MOVE_MS.compare })
    }
    if (step.id === 'shelf') {
      go(el(`frost-${String(state.inOrder - 1)}`), [{ opacity: 0 }, { opacity: 1 }], {
        duration: MOVE_MS.shelf,
      })
    }
    if (step.id === 'finale') {
      go(el('final'), [{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'backwards' })
      values.forEach((value, k) => {
        const delay = 400 + k * DANCE_STAGGER_MS
        go(el(`flap-${String(value)}`), [{ opacity: 0 }, { opacity: 0 }, { opacity: 1 }], {
          duration: 1,
          delay,
          fill: 'backwards',
        })
        go(el(`stand-${String(value)}`), [{ opacity: 1 }, { opacity: 1 }, { opacity: 0 }], {
          duration: 1,
          delay,
          fill: 'backwards',
        })
        go(
          el(`hop-${String(value)}`),
          [
            { transform: 'translateY(0)' },
            { transform: `translateY(${String(-4 * s)}px)`, offset: 0.5 },
            { transform: 'translateY(0)' },
          ],
          { duration: 260, delay: 400 + values.length * DANCE_STAGGER_MS + 120 },
        )
      })
    }
    return () => {
      for (const animation of run) animation.cancel()
    }
    // A replay, a new step, a new size or design restarts the move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, replay, motion, width, height, design])

  const keyValue = state.key?.out ? state.array[state.key.slot] : undefined
  // B's sled: under the waiting tower, and under the tower sliding back in (it fades as the
  // tower slides off it).
  const sledAt = state.key?.out
    ? state.key.waitAt
    : step.before.key?.out
      ? step.before.key.waitAt
      : null
  // The key is drawn last (in front): while it waits, and while it slides back in.
  const before = step.before.key
  const frontValue = keyValue ?? (before?.out ? step.before.array[before.slot] : undefined)
  const left = (k: number) => geo.center(k) - Math.round(geo.pillarW / 2)
  const groundY = geo.floorY

  return (
    <svg
      ref={ref}
      className="penguin-scene"
      width={width}
      height={height}
      role="img"
      aria-label={`${title}: ${step.caption}`}
    >
      {/* The ice: a ground band under the line, frosted under the ones in order so far, green
          only when everything is final. A lane in front for A and B. */}
      <rect className="ice-ground" x={0} y={groundY} width={width} height={GROUND * s} />
      {values.map((_, k) => (
        <g
          key={k}
          data-part={`frost-${String(k)}`}
          opacity={k < state.inOrder && !state.final ? 1 : 0}
        >
          <rect
            className="frost"
            x={left(k) - s}
            y={groundY}
            width={geo.pillarW + 2 * s}
            height={GROUND * s}
          />
          <rect
            className="frost-sparkle"
            x={left(k) + 2 * s}
            y={groundY + s}
            width={s}
            height={s}
          />
          <rect
            className="frost-sparkle"
            x={left(k) + geo.pillarW - 4 * s}
            y={groundY + s}
            width={s}
            height={s}
          />
        </g>
      ))}
      <g data-part="final" opacity={state.final ? 1 : 0}>
        {values.map((_, k) => (
          <rect
            key={k}
            className="final-platform"
            x={left(k) - s}
            y={groundY}
            width={geo.pillarW + 2 * s}
            height={GROUND * s}
          />
        ))}
      </g>
      {design !== 'shelf' && (
        <>
          <rect
            className="ice-lane"
            x={0}
            y={groundY + GROUND * s}
            width={width}
            height={LANE * s}
          />
          <rect className="lane-line" x={0} y={geo.laneBase - 2 * s} width={width} height={s} />
        </>
      )}

      {/* B: the sled under the waiting tower. */}
      {design === 'bricks' && sledAt !== null && (
        <g data-part="sled" style={{ transform: px(left(sledAt), geo.laneBase - SLED * s) }}>
          <rect className="sled" x={-s} y={0} width={geo.pillarW + 2 * s} height={2 * s} />
          <rect
            className="sled-runner"
            x={-2 * s}
            y={2 * s}
            width={geo.pillarW + 4 * s}
            height={s}
          />
        </g>
      )}

      {/* The pillars, each with its penguin centered on top. The key's is drawn last (in front). */}
      {[...values]
        .sort((a, b) => (a === frontValue ? 1 : b === frontValue ? -1 : 0))
        .map((value) => {
          const spot = spotOf(state, value, geo, design)
          const h = geo.height(value)
          const stand = state.final ? FLAP_PATHS : PENGUIN_PATHS
          return (
            <g
              key={value}
              data-part={`pillar-${String(value)}`}
              style={{ transform: px(spot.x, spot.bottom - h) }}
            >
              {design === 'shelf' && spot.out && (
                <rect
                  className="ice-slab"
                  x={-2 * s}
                  y={h}
                  width={geo.pillarW + 4 * s}
                  height={SLAB * s}
                />
              )}
              <Pillar design={design} value={value} w={geo.pillarW} h={h} geo={geo} />
              <g data-part={`hop-${String(value)}`}>
                <g
                  data-part={`stand-${String(value)}`}
                  transform={`translate(${String(Math.round(geo.pillarW / 2) - (PENGUIN_W / 2) * s)}, ${String(-PENGUIN_H * s)})`}
                >
                  <Sprite paths={stand} s={s} />
                </g>
                <g
                  data-part={`flap-${String(value)}`}
                  opacity={0}
                  transform={`translate(${String(Math.round(geo.pillarW / 2) - (PENGUIN_W / 2) * s)}, ${String(-PENGUIN_H * s)})`}
                >
                  <Sprite paths={FLAP_PATHS} s={s} />
                </g>
                <g
                  data-part={`belly-${String(value)}`}
                  opacity={0}
                  transform={`translate(${String(Math.round(geo.pillarW / 2) - (SLIDE_W / 2) * s)}, ${String(-SLIDE_H * s)})`}
                >
                  <Sprite paths={SLIDE_PATHS} s={s} />
                </g>
              </g>
            </g>
          )
        })}

      {/* Comparing: a yellow mark on the two tops (role color on the ice, never on a penguin). */}
      {state.compare && (
        <g data-part="marks">
          {state.compare.map((slot) => {
            const value = state.array[slot] ?? 0
            const spot = spotOf(state, value, geo, design)
            return (
              <rect
                key={slot}
                className="compare-mark"
                x={spot.x}
                y={spot.bottom - geo.height(value) - 2 * s}
                width={geo.pillarW}
                height={2 * s}
              />
            )
          })}
        </g>
      )}

      {/* Ice spray behind the sliding penguin. */}
      <g data-part="spray" opacity={0}>
        {[0, 1, 2].map((k) => (
          <rect
            key={k}
            className="spray"
            x={Math.round(width * 0.35) + k * 5 * s}
            y={(design === 'shelf' ? groundY - LIFT * s : geo.laneBase) - (2 + k) * s}
            width={s}
            height={s}
          />
        ))}
      </g>
    </svg>
  )
}
