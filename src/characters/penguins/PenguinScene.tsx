/**
 * Insertion sort's penguins, "Snow-brick towers" (design/mockups/penguins/README.md): one SVG
 * over the bars' field, drawn in the field's own pixels. Each value is a tower of snow bricks,
 * as tall as its value, with its number and a penguin standing centered on top. The key's tower
 * waits on a sled in the lane while the bigger ones glide right, then slides into its gap.
 *
 * The penguins and the ice are fixed in both themes (tokens.css); role colors appear only as
 * the comparing marks on the tops and the final green under every tower, never on a penguin.
 * Only one step forward plays a move; anything else shows the frame's pose, and so does every
 * step with reduced motion. A new size rebuilds a move in progress from where it had got to.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Frame } from '../../engine/types'
import { fitMs } from '../pixel'
import {
  GROUND,
  HOP,
  LANE,
  mortar,
  penguinLayout,
  SPRAY,
  type Box,
  type PenguinLayout,
} from './geometry'
import { FLAP_PATHS, SLIDE_PATHS, STANDING_PATHS, type PenguinPaths } from './sprites'
import {
  COMPARE_MS,
  FINALE_FADE_MS,
  FINALE_HOP_MS,
  finaleHopAt,
  flapAt,
  frostTiming,
  inPlaceMs,
  penguinMoves,
  penguinPoses,
  SHIFT_MS,
  SLIDE_AT,
  slideMs,
  START_MS,
  type PenguinMove,
  type PenguinPose,
} from './steps'
import './PenguinScene.css'

interface PenguinSceneProps {
  /** Every frame of the run, and the one on screen: the towers are followed through the run. */
  readonly frames: readonly Frame[]
  readonly index: number
  readonly stepDelayMs: number
  readonly reducedMotion: boolean
}

const px = (x: number, y: number) => `translate(${String(x)}px, ${String(y)}px)`

/** A penguin sprite at s screen pixels per pixel. The rim keeps it visible on the dark stage. */
function Sprite({ paths, s }: { readonly paths: PenguinPaths; readonly s: number }) {
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

/** A tower of snow bricks: mortar lines and staggered joints, an outline, its number. */
function Tower(props: {
  readonly value: number
  readonly w: number
  readonly h: number
  readonly geo: PenguinLayout
}) {
  const { value, w, h, geo } = props
  const { s, font } = geo
  const { lines, joints } = mortar(w, h, s)
  return (
    <>
      <rect className="snow-tower" x={0} y={0} width={w} height={h} />
      {lines.map((y) => (
        <rect
          key={`l${String(y)}`}
          className="snow-mortar"
          x={s}
          y={y}
          width={w - 2 * s}
          height={s}
        />
      ))}
      {joints.map(([x, y]) => (
        <rect key={`j${String(y)}`} className="snow-mortar" x={x} y={y} width={s} height={5 * s} />
      ))}
      <rect
        className="snow-edge"
        x={s / 2}
        y={s / 2}
        width={w - s}
        height={h - s}
        strokeWidth={s}
      />
      <text className="snow-number" x={w / 2} y={Math.min(h - s, 2 * s + font)} fontSize={font}>
        {value}
      </text>
    </>
  )
}

/** Where tower `id` stands in a pose: in the line at its slot, or on the sled in the lane. */
function towerAt(pose: PenguinPose, id: number, geo: PenguinLayout, height: number) {
  if (pose.key?.tower === id) return [geo.towerX(pose.key.waitAt), geo.sledTop - height] as const
  return [geo.towerX(pose.order.indexOf(id)), geo.floorY - height] as const
}

export function PenguinScene({ frames, index, stepDelayMs, reducedMotion }: PenguinSceneProps) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Box | null>(null)

  useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    const measure = () => {
      const rect = field.getBoundingClientRect()
      const gap = parseFloat(getComputedStyle(field).columnGap) || 0
      setBox((old) =>
        old && old.width === rect.width && old.height === rect.height && old.gap === gap
          ? old
          : { width: rect.width, height: rect.height, gap },
      )
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(field)
    return () => {
      observer.disconnect()
    }
  }, [])

  const poses = useMemo(() => penguinPoses(frames), [frames])
  const pose = poses[index]
  // The towers' values, by tower: each tower is numbered by its slot in the first frame.
  const values = useMemo(() => frames[0]?.array ?? [], [frames])
  const geo = box && box.width > 0 && box.height > 0 ? penguinLayout(box, values) : null

  // ---------- Motion: one step forward plays the move into this frame ----------
  // The move playing, if any: the frame it moves into and when it started. A new size rebuilds
  // it for the new layout, from where it had got to; any other new frame cancels it.
  const previousIndex = useRef(index)
  const playing = useRef<{ readonly index: number; readonly start: number } | null>(null)
  useLayoutEffect(() => {
    const from = previousIndex.current
    previousIndex.current = index
    if (index !== from) {
      playing.current = index === from + 1 ? { index, start: performance.now() } : null
    }
    const move = playing.current
    if (reducedMotion || !geo || move?.index !== index || !pose) return
    const moves = penguinMoves(frames, index, poses)
    if (moves.length === 0) return
    const context: MoveContext = {
      geo,
      pose,
      values,
      stepDelayMs,
      el: (name) =>
        fieldRef.current?.querySelector<SVGElement>(`[data-part="${name}"]`) ?? undefined,
    }
    const animations = moves.flatMap((m) => animate(m, context))
    const elapsed = performance.now() - move.start
    if (elapsed > 1) for (const animation of animations) animation.currentTime = elapsed
    return () => {
      for (const animation of animations) animation.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, frames, reducedMotion, box])

  let content = null
  if (geo && pose) {
    const { s, towerW, floorY, laneBase } = geo
    const before = poses[index - 1]
    // The key is drawn in front of the line: while it waits, and as it goes back in.
    const front = pose.key?.tower ?? (before?.key && !pose.key ? before.key.tower : null)
    const towers = values
      .map((_, id) => id)
      .sort((a, b) => Number(a === front) - Number(b === front))
    // The sled waits under the key; after the key goes back in it is hidden where it stood.
    const sledSlot = pose.key?.waitAt ?? before?.key?.waitAt ?? 0
    content = (
      <svg className="penguin-scene" width={geo.width} height={geo.height} aria-hidden="true">
        {/* The ice: the ground band under the line, frosted under the ones in order so far,
            green under every tower only when everything is final; the lane in front. */}
        <rect className="ice-ground" x={0} y={floorY} width={geo.width} height={GROUND * s} />
        {values.map((_, k) => (
          <g
            key={k}
            data-part={`frost-${String(k)}`}
            opacity={k < pose.inOrder && !pose.final ? 1 : 0}
          >
            <rect
              className="ice-frost"
              x={geo.towerX(k) - s}
              y={floorY}
              width={towerW + 2 * s}
              height={GROUND * s}
            />
            <rect
              className="ice-sparkle"
              x={geo.towerX(k) + 2 * s}
              y={floorY + s}
              width={s}
              height={s}
            />
            <rect
              className="ice-sparkle"
              x={geo.towerX(k) + towerW - 4 * s}
              y={floorY + s}
              width={s}
              height={s}
            />
          </g>
        ))}
        <g data-part="final" opacity={pose.final ? 1 : 0}>
          {values.map((_, k) => (
            <rect
              key={k}
              className="ice-final"
              x={geo.towerX(k) - s}
              y={floorY}
              width={towerW + 2 * s}
              height={GROUND * s}
            />
          ))}
        </g>
        <rect
          className="ice-lane"
          x={0}
          y={floorY + GROUND * s}
          width={geo.width}
          height={LANE * s}
        />
        <rect className="ice-lane-line" x={0} y={laneBase - 2 * s} width={geo.width} height={s} />

        {/* The sled under the waiting tower, with the ice spray behind it as it slides. */}
        <g
          data-part="sled"
          opacity={pose.key ? 1 : 0}
          style={{ transform: px(geo.towerX(sledSlot), geo.sledTop) }}
        >
          <rect className="penguin-sled" x={-s} y={0} width={towerW + 2 * s} height={2 * s} />
          <rect className="penguin-runner" x={-2 * s} y={2 * s} width={towerW + 4 * s} height={s} />
          <g data-part="spray" opacity={0}>
            {SPRAY.map(([x, y]) => (
              <rect
                key={`${String(x)},${String(y)}`}
                className="ice-spray"
                x={towerW + x * s}
                y={y * s}
                width={s}
                height={s}
              />
            ))}
          </g>
        </g>

        {/* The towers, each with its penguin centered on top. */}
        {towers.map((id) => {
          const value = values[id] ?? 0
          const h = geo.heightOf(value)
          const [x, y] = towerAt(pose, id, geo, h)
          return (
            <g key={id} data-part={`tower-${String(id)}`} style={{ transform: px(x, y) }}>
              <Tower value={value} w={towerW} h={h} geo={geo} />
              <g data-part={`hop-${String(id)}`}>
                <g
                  data-part={`stand-${String(id)}`}
                  opacity={pose.final ? 0 : 1}
                  transform={`translate(${String(geo.standAt[0])}, ${String(geo.standAt[1])})`}
                >
                  <Sprite paths={STANDING_PATHS} s={s} />
                </g>
                <g
                  data-part={`flap-${String(id)}`}
                  opacity={pose.final ? 1 : 0}
                  transform={`translate(${String(geo.standAt[0])}, ${String(geo.standAt[1])})`}
                >
                  <Sprite paths={FLAP_PATHS} s={s} />
                </g>
                <g
                  data-part={`belly-${String(id)}`}
                  opacity={0}
                  transform={`translate(${String(geo.lieAt[0])}, ${String(geo.lieAt[1])})`}
                >
                  <Sprite paths={SLIDE_PATHS} s={s} />
                </g>
              </g>
            </g>
          )
        })}

        {/* Comparing: the looking color across the two tops (on the ice, never a penguin). */}
        <g data-part="marks">
          {(pose.compare ?? []).map((slot) => {
            const id = pose.order[slot] ?? -1
            const h = geo.heightOf(values[id] ?? 0)
            const [x, y] = towerAt(pose, id, geo, h)
            return (
              <rect
                key={slot}
                className="penguin-compare"
                x={x}
                y={y - 2 * s}
                width={towerW}
                height={2 * s}
              />
            )
          })}
        </g>
      </svg>
    )
  }

  return (
    <div ref={fieldRef} className="stage-bars penguin-field" aria-hidden="true">
      {content}
    </div>
  )
}

// ---------- The moves ----------

interface MoveContext {
  readonly geo: PenguinLayout
  readonly pose: PenguinPose
  readonly values: readonly number[]
  readonly stepDelayMs: number
  readonly el: (name: string) => SVGElement | undefined
}

function run(element: Element | undefined, frames: Keyframe[], options: KeyframeAnimationOptions) {
  if (!element || typeof element.animate !== 'function') return []
  return [element.animate(frames, options)]
}

function animate(move: PenguinMove, context: MoveContext): Animation[] {
  switch (move.kind) {
    case 'start':
      return start(move, context)
    case 'compare':
      return run(context.el('marks'), [{ opacity: 0 }, { opacity: 1 }], {
        duration: fitMs(COMPARE_MS, context.stepDelayMs),
      })
    case 'shift':
      return shift(move, context)
    case 'slide':
      return slide(move, context)
    case 'in-place':
      return inPlace(move, context)
    case 'finale':
      return finale(context)
  }
}

const heightOf = ({ geo, values }: MoveContext, tower: number) => geo.heightOf(values[tower] ?? 0)

/** The key's tower steps out of the line onto its sled, which fades in under it. */
function start(move: { tower: number; slot: number }, context: MoveContext): Animation[] {
  const { geo, el, stepDelayMs } = context
  const h = heightOf(context, move.tower)
  const duration = fitMs(START_MS, stepDelayMs)
  const x = geo.towerX(move.slot)
  return [
    ...run(
      el(`tower-${String(move.tower)}`),
      [{ transform: px(x, geo.floorY - h) }, { transform: px(x, geo.sledTop - h) }],
      {
        duration,
        easing: 'ease-in-out',
      },
    ),
    ...run(el('sled'), [{ opacity: 0 }, { opacity: 1 }], { duration }),
  ]
}

/** A bigger tower glides one slot right, into the gap, its penguin riding. */
function shift(move: { tower: number; from: number; to: number }, context: MoveContext) {
  const { geo, el, stepDelayMs } = context
  const y = geo.floorY - heightOf(context, move.tower)
  return run(
    el(`tower-${String(move.tower)}`),
    [{ transform: px(geo.towerX(move.from), y) }, { transform: px(geo.towerX(move.to), y) }],
    { duration: fitMs(SHIFT_MS, stepDelayMs), easing: 'ease-in-out' },
  )
}

/** The newly in-order slot's frost, in the last 350 ms of the move that lands the key. */
function frost(slot: number | null, moveMs: number, { el }: MoveContext): Animation[] {
  if (slot === null) return []
  const { delay, duration } = frostTiming(moveMs)
  return run(el(`frost-${String(slot)}`), [{ opacity: 0 }, { opacity: 1 }], {
    duration,
    delay,
    fill: 'backwards',
  })
}

/**
 * The special move: the penguin lies on its belly, the sled zooms along the lane to the gap
 * (eased in, to 78%), then the tower slides off it up into the line (eased out) while the sled
 * fades. Ice spray from 20% to 75%; the penguin stands up at 90%.
 */
function slide(
  move: { tower: number; from: number; to: number; frost: number | null },
  context: MoveContext,
): Animation[] {
  const { geo, el, stepDelayMs } = context
  const id = String(move.tower)
  const h = heightOf(context, move.tower)
  const duration = slideMs(stepDelayMs)
  const from = geo.towerX(move.from)
  const to = geo.towerX(move.to)
  const { gap, sprayFrom, sprayTo, standUp } = SLIDE_AT
  return [
    ...run(
      el(`tower-${id}`),
      [
        { offset: 0, transform: px(from, geo.sledTop - h), easing: 'ease-in' },
        { offset: gap, transform: px(to, geo.sledTop - h), easing: 'ease-out' },
        { offset: 1, transform: px(to, geo.floorY - h) },
      ],
      { duration },
    ),
    ...run(
      el('sled'),
      [
        { offset: 0, transform: px(from, geo.sledTop), opacity: 1, easing: 'ease-in' },
        { offset: gap, transform: px(to, geo.sledTop), opacity: 1 },
        { offset: 1, transform: px(to, geo.sledTop), opacity: 0 },
      ],
      { duration },
    ),
    ...run(el(`stand-${id}`), [{ opacity: 0 }, { opacity: 0, offset: standUp }, { opacity: 1 }], {
      duration,
    }),
    ...run(el(`belly-${id}`), [{ opacity: 1 }, { opacity: 1, offset: standUp }, { opacity: 0 }], {
      duration,
    }),
    ...run(
      el('spray'),
      [
        { opacity: 0 },
        { opacity: 1, offset: sprayFrom },
        { opacity: 1, offset: sprayTo },
        { opacity: 0 },
      ],
      { duration },
    ),
    ...frost(move.frost, duration, context),
  ]
}

/** Already in place: the key's tower steps straight back into its slot, then its penguin hops. */
function inPlace(move: { tower: number; to: number; frost: number | null }, context: MoveContext) {
  const { geo, el, stepDelayMs } = context
  const id = String(move.tower)
  const h = heightOf(context, move.tower)
  const { back, hop } = inPlaceMs(stepDelayMs)
  const x = geo.towerX(move.to)
  return [
    ...run(
      el(`tower-${id}`),
      [{ transform: px(x, geo.sledTop - h) }, { transform: px(x, geo.floorY - h) }],
      {
        duration: back,
        easing: 'ease-in-out',
      },
    ),
    ...run(el('sled'), [{ opacity: 1 }, { opacity: 0 }], { duration: back }),
    ...run(el(`hop-${id}`), hopKeys(geo.s), { duration: hop, delay: back }),
    ...frost(move.frost, back + hop, context),
  ]
}

const hopKeys = (s: number): Keyframe[] => [
  { transform: 'translateY(0)' },
  { transform: `translateY(${String(-HOP * s)}px)`, offset: 0.5 },
  { transform: 'translateY(0)' },
]

/** The green fades in; each penguin raises its flippers in turn, left to right; all hop. */
function finale({ geo, pose, el }: MoveContext): Animation[] {
  const animations = run(el('final'), [{ opacity: 0 }, { opacity: 1 }], {
    duration: FINALE_FADE_MS,
    fill: 'backwards',
  })
  pose.order.forEach((tower, k) => {
    const id = String(tower)
    const at = { duration: 1, delay: flapAt(k), fill: 'backwards' } as const
    animations.push(
      ...run(el(`flap-${id}`), [{ opacity: 0 }, { opacity: 0 }, { opacity: 1 }], at),
      ...run(el(`stand-${id}`), [{ opacity: 1 }, { opacity: 1 }, { opacity: 0 }], at),
      ...run(el(`hop-${id}`), hopKeys(geo.s), {
        duration: FINALE_HOP_MS,
        delay: finaleHopAt(pose.order.length),
      }),
    )
  })
  return animations
}
