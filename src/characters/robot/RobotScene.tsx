import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Frame } from '../../engine/types'
import {
  CABLE_BOW,
  CABLE_REST,
  carryPlan,
  crateShare,
  FLOOR_LINE,
  HOOK,
  HOP_RISE,
  PLATFORM_H,
  RAIL_H,
  RAIL_TOP,
  SCOUT_H,
  SCOUT_W,
  spriteScale,
  TROLLEY_BOTTOM,
  TROLLEY_TOP,
  TROLLEY_W,
} from './geometry'
import { HOOK_PATHS, SCOUT_HAPPY_PATHS, SCOUT_PATHS, TROLLEY_PATHS } from './sprites'
import {
  carryMs,
  DANCE_DELAY_MS,
  fitMs,
  HOP_MS,
  LOCK_BLINK_MS,
  LOCK_MOVE_MS,
  PLATFORM_FADE_MS,
  robotMoves,
  robotPoses,
  SCAN_MS,
  type RobotMove,
} from './steps'
import './RobotScene.css'

interface RobotSceneProps {
  /** Every frame of the run, and the one on screen: the robot's poses follow the whole run. */
  readonly frames: readonly Frame[]
  readonly index: number
  readonly stepDelayMs: number
  readonly reducedMotion: boolean
}

/** Measured once per size: the field's box and the gap between the value columns. */
interface Box {
  readonly width: number
  readonly height: number
  readonly gap: number
}

/** Where things are, in px from the field's top-left, for one array of values. */
interface Layout {
  readonly s: number
  readonly width: number
  readonly floorTop: number
  readonly pitch: number
  readonly crateW: number
  readonly crateX: (k: number) => number
  readonly center: (k: number) => number
  /** The left edge of slot k's pitch (half a gap before its column). */
  readonly slotLeft: (k: number) => number
  readonly heights: readonly number[]
  readonly tops: readonly number[]
  readonly scoutAt: (k: number, tops?: readonly number[]) => readonly [number, number]
  readonly trolleyOver: (k: number) => number
  readonly parkX: number
  /** The cable length (sprite units) that brings the hook's grip to a crate top at `top` px. */
  readonly cableTo: (top: number) => number
}

function layout(box: Box, array: readonly number[]): Layout {
  const n = Math.max(1, array.length)
  const { width, height, gap } = box
  const colW = (width - gap * (n - 1)) / n
  const pitch = colW + gap
  const s = spriteScale(height, pitch)
  const floorTop = height - (FLOOR_LINE + PLATFORM_H) * s
  const largest = Math.max(1, ...array.map((v) => Math.abs(v)))
  const crateW = Math.round(Math.min(colW, pitch * 0.75))
  const center = (k: number) => k * pitch + colW / 2
  const crateX = (k: number) => Math.round(center(k) - crateW / 2)
  // Like the bars, a crate is never too short for its number (small values on a short stage).
  const minHeight = Math.ceil(numberSize(s) * 1.3 + 2 * s)
  const heights = array.map((v) =>
    Math.max(minHeight, Math.round(floorTop * crateShare(v, largest))),
  )
  const tops = heights.map((h) => floorTop - h)
  return {
    s,
    width,
    floorTop,
    pitch,
    crateW,
    crateX,
    center,
    slotLeft: (k) => k * pitch - gap / 2,
    heights,
    tops,
    // Centered on its crate (the user's call over the spec's crate x + 9, which sat it on
    // the crate's right edge).
    scoutAt: (k, at = tops) => [
      crateX(k) + Math.round((crateW - SCOUT_W * s) / 2),
      (at[k] ?? floorTop) - SCOUT_H * s,
    ],
    trolleyOver: (k) => Math.round(center(k)) - 5 * s,
    parkX: width - (TROLLEY_W + 18) * s,
    cableTo: (top) => top / s + 2 - TROLLEY_BOTTOM - HOOK,
  }
}

/**
 * The hook hangs centered under the trolley, so over the slot's center: its 6-wide sprite
 * starts 2 in from the trolley's left (centers at 5). The cable runs down into its shank
 * (the hook's column 1).
 */
const HOOK_X = 2
const CABLE_X = HOOK_X + 1

/** A crate's number: 9 units, but never under 12px, so it stays readable. */
const numberSize = (s: number) => Math.max(9 * s, 12)

const px = (x: number, y: number) => `translate(${String(x)}px, ${String(y)}px)`

/** Keyframes for one property, eased in and out between keys. Offsets are fractions. */
function keys(
  property: 'transform' | 'opacity',
  points: readonly (readonly [number, string | number])[],
): Keyframe[] {
  return points.map(([offset, value]) => ({ offset, [property]: value, easing: 'ease-in-out' }))
}

/** Visible only from `from` to `to` (fractions), hidden either side. */
function windowKeys(from: number, to: number): Keyframe[] {
  return [
    { offset: 0, opacity: 0 },
    { offset: from, opacity: 0 },
    { offset: from, opacity: 1 },
    { offset: to, opacity: 1 },
    { offset: to, opacity: 0 },
    { offset: 1, opacity: 0 },
  ]
}

/** Hidden until `at`, then shown (a solid crate landing). */
function showFrom(at: number): Keyframe[] {
  return [
    { offset: 0, opacity: 0 },
    { offset: at, opacity: 0 },
    { offset: at, opacity: 1 },
    { offset: 1, opacity: 1 },
  ]
}

/** A hop's arc, from one crate top to another: straight in x, up to 14 above the higher top. */
function hopKeys(from: readonly [number, number], to: readonly [number, number], s: number) {
  const peak = Math.min(from[1], to[1]) - HOP_RISE * s
  return [
    { offset: 0, transform: px(from[0], from[1]), easing: 'ease-out' },
    { offset: 0.5, transform: px((from[0] + to[0]) / 2, peak), easing: 'ease-in' },
    { offset: 1, transform: px(to[0], to[1]) },
  ]
}

interface CrateProps {
  readonly value: number
  readonly width: number
  readonly height: number
  readonly s: number
  readonly dashed?: boolean
}

/** A wooden crate: outline, planks every 9, steel corners, its number near the top. */
function Crate({ value, width, height, s, dashed = false }: CrateProps) {
  const font = numberSize(s)
  if (dashed) {
    return (
      <>
        <rect
          className="crate-ghost"
          x={s}
          y={s}
          width={Math.max(0, width - 2 * s)}
          height={Math.max(0, height - 2 * s)}
          strokeWidth={2 * s}
          strokeDasharray={`${String(3 * s)} ${String(2 * s)}`}
        />
        <text className="crate-ghost-number" x={width / 2} y={s + font} fontSize={font}>
          {value}
        </text>
      </>
    )
  }
  const planks: number[] = []
  for (let y = 9 * s; y < height - 2 * s; y += 9 * s) planks.push(y)
  const corner = 3 * s
  return (
    <>
      <rect className="crate-wood" x={0} y={0} width={width} height={height} />
      {planks.map((y) => (
        <rect key={y} className="crate-plank" x={s} y={y} width={width - 2 * s} height={s} />
      ))}
      {height > 2 * corner + 2 * s && (
        <>
          <rect className="crate-corner" x={s} y={s} width={corner} height={corner} />
          <rect
            className="crate-corner"
            x={width - s - corner}
            y={s}
            width={corner}
            height={corner}
          />
          <rect
            className="crate-corner"
            x={s}
            y={height - s - corner}
            width={corner}
            height={corner}
          />
          <rect
            className="crate-corner"
            x={width - s - corner}
            y={height - s - corner}
            width={corner}
            height={corner}
          />
        </>
      )}
      <rect
        className="crate-edge"
        x={s / 2}
        y={s / 2}
        width={Math.max(0, width - s)}
        height={Math.max(0, height - s)}
        strokeWidth={s}
      />
      <text
        className="crate-number"
        x={width / 2}
        y={Math.min(height - s, s + font)}
        fontSize={font}
      >
        {value}
      </text>
    </>
  )
}

/** The scout: 14 × 16 pixels at scale s, with its signal arms, glow and finale eyes. */
function Scout({ s, happy }: { readonly s: number; readonly happy: boolean }) {
  return (
    <g transform={`scale(${String(s)})`}>
      <rect className="scout-glow" x={3} y={-2} width={8} height={5} />
      <g className="scout-arms">
        <rect className="scout-arm" x={-3.5} y={1.5} width={3} height={6} strokeWidth={1} />
        <rect className="scout-arm" x={14.5} y={1.5} width={3} height={6} strokeWidth={1} />
      </g>
      <path d={SCOUT_PATHS.steel} fill="var(--robot-steel)" />
      <path d={SCOUT_PATHS.dark} fill="var(--robot-steel-dark)" />
      <path d={SCOUT_PATHS.light} fill="var(--robot-steel-light)" />
      <path d={SCOUT_PATHS.visor} fill="var(--robot-visor)" />
      <path d={SCOUT_PATHS.eye} fill="var(--robot-eye)" />
      <path className="scout-antenna" d={SCOUT_PATHS.antenna} fill="var(--robot-eye)" />
      <path d={SCOUT_PATHS.outline} fill="var(--robot-outline)" />
      <g className="scout-happy" opacity={happy ? 1 : 0}>
        <path d={SCOUT_HAPPY_PATHS.visor} fill="var(--robot-visor)" />
        <path d={SCOUT_HAPPY_PATHS.eye} fill="var(--robot-eye)" />
      </g>
    </g>
  )
}

/**
 * Scout and Crane, for selection sort (design/mockups/robot/README.md). The crates are the
 * values; the scout checks them and stands on the smallest so far; the crane on its rail
 * carries the smallest to the front. Every frame shows its pose; one step forward plays the
 * move into it (not with reduced motion).
 */
export function RobotScene({ frames, index, stepDelayMs, reducedMotion }: RobotSceneProps) {
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

  const poses = useMemo(() => robotPoses(frames), [frames])
  const frame = frames[index]
  const pose = poses[index]
  const array = frame?.array ?? []
  const geo = box && box.width > 0 && box.height > 0 ? layout(box, array) : null

  // ---------- Motion: one step forward plays the move into this frame ----------
  // The move playing, if any: the frame it moves into and when it started. A new size (the
  // caption below changing height) rebuilds it for the new layout, from where it had got to;
  // any other new frame cancels it and shows the pose.
  const previousIndex = useRef(index)
  const playing = useRef<{ readonly index: number; readonly start: number } | null>(null)
  useLayoutEffect(() => {
    const from = previousIndex.current
    previousIndex.current = index
    if (index !== from) {
      playing.current = index === from + 1 ? { index, start: performance.now() } : null
    }
    const move = playing.current
    if (reducedMotion || !geo || !box || move?.index !== index) return
    const moves = robotMoves(frames, index, poses)
    const before = frames[index - 1]
    if (!before || moves.length === 0) return
    const animations = moves.flatMap((m) =>
      animate(m, {
        geo,
        before: layout(box, before.array),
        beforeArray: before.array,
        beforePose: poses[index - 1],
        pose,
        stepDelayMs,
        el: (name) =>
          fieldRef.current?.querySelector<SVGElement>(`[data-part="${name}"]`) ?? undefined,
      }),
    )
    const elapsed = performance.now() - move.start
    if (elapsed > 1) for (const animation of animations) animation.currentTime = elapsed
    return () => {
      for (const animation of animations) animation.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, frames, reducedMotion, box])

  const content =
    geo && pose ? (
      <svg className="robot-scene" width={geo.width} height={box?.height} aria-hidden="true">
        {/* The rail at the top: all there is of the crane at rest, besides the trolley. */}
        <rect
          className="robot-rail"
          x={0}
          y={RAIL_TOP * geo.s}
          width={geo.width}
          height={RAIL_H * geo.s}
        />

        {/* The floor, and the lit platform under every sorted crate. */}
        <rect
          className="robot-floor"
          x={0}
          y={geo.floorTop}
          width={geo.width}
          height={FLOOR_LINE * geo.s}
        />
        {array.map((_, k) =>
          k < pose.sorted ? (
            <rect
              key={k}
              data-part={`platform-${String(k)}`}
              className="robot-platform"
              x={geo.slotLeft(k) + geo.s}
              y={geo.floorTop + FLOOR_LINE * geo.s}
              width={geo.pitch - 2 * geo.s}
              height={PLATFORM_H * geo.s}
            />
          ) : null,
        )}
        {/* The platform a step is about to light (it fades in with the move). */}
        <rect
          data-part="platform-next"
          className="robot-platform"
          opacity={0}
          x={geo.slotLeft(pose.sorted) + geo.s}
          y={geo.floorTop + FLOOR_LINE * geo.s}
          width={geo.pitch - 2 * geo.s}
          height={PLATFORM_H * geo.s}
        />

        {/* The crates. */}
        {array.map((value, k) => (
          <g
            key={k}
            data-part={`crate-${String(k)}`}
            style={{ transform: px(geo.crateX(k), geo.tops[k] ?? 0) }}
          >
            <Crate value={value} width={geo.crateW} height={geo.heights[k] ?? 0} s={geo.s} />
          </g>
        ))}

        {/* The gate between the sorted part and the rest (not when nothing or all is sorted). */}
        <g
          data-part="gate"
          className="robot-gate"
          opacity={pose.sorted > 0 && pose.sorted < array.length ? 1 : 0}
          style={{ transform: px(geo.slotLeft(pose.sorted), geo.floorTop) }}
        >
          <Gate s={geo.s} />
        </g>

        {/* The scan beam, in front of the crates, to the one being checked. */}
        <g data-part="beam" opacity={pose.beam === null ? 0 : 1}>
          {pose.beam !== null && <Beam geo={geo} scout={pose.scout} to={pose.beam} />}
        </g>

        {/* The carry's stand-ins: the carried crate (and its shadow), the front crate sliding
            back as a dashed outline, and the front crate before it leaves. */}
        <g data-part="carried-shadow" opacity={0}>
          <rect
            className="robot-shadow"
            x={geo.s}
            y={0}
            width={Math.max(0, geo.crateW - 2 * geo.s)}
            height={3 * geo.s}
          />
        </g>
        <g data-part="front-solid" opacity={0} />
        <g data-part="ghost" opacity={0} />
        <g data-part="carried" opacity={0} />

        {/* The reticle on the smallest so far. */}
        <g
          data-part="reticle"
          opacity={pose.reticle === null ? 0 : 1}
          style={{ transform: px(geo.crateX(pose.reticle ?? 0), geo.tops[pose.reticle ?? 0] ?? 0) }}
        >
          <g data-part="reticle-scale" className="robot-reticle-scale">
            <Reticle width={geo.crateW} s={geo.s} />
          </g>
        </g>

        {/* The scout. */}
        <g
          data-part="scout"
          className={pose.finale ? 'robot-scout is-finale' : 'robot-scout'}
          style={{ transform: px(...geo.scoutAt(pose.scout)) }}
        >
          <g data-part="scout-body">
            <Scout s={geo.s} happy={pose.finale} />
          </g>
        </g>

        {/* The crane: the trolley on the rail, the cable and the hook. */}
        <g data-part="trolley" style={{ transform: px(geo.parkX, TROLLEY_TOP * geo.s) }}>
          <g transform={`scale(${String(geo.s)})`}>
            <path d={TROLLEY_PATHS.steel} fill="var(--robot-steel)" />
            <path d={TROLLEY_PATHS.light} fill="var(--robot-steel-light)" />
            <path d={TROLLEY_PATHS.visor} fill="var(--robot-visor)" />
            <path d={TROLLEY_PATHS.eye} fill="var(--robot-eye)" />
            <path d={TROLLEY_PATHS.dark} fill="var(--robot-steel-dark)" />
            <path d={TROLLEY_PATHS.outline} fill="var(--robot-outline)" />
          </g>
          <g
            data-part="swing"
            className="robot-swing"
            style={
              {
                '--pivot-x': `${String((CABLE_X + 0.5) * geo.s)}px`,
                '--pivot-y': `${String((TROLLEY_BOTTOM - TROLLEY_TOP) * geo.s)}px`,
              } as CSSProperties
            }
          >
            <rect
              data-part="cable"
              className="robot-cable"
              x={CABLE_X * geo.s}
              y={0}
              width={geo.s}
              height={1}
              style={{
                transform: `translateY(${String((TROLLEY_BOTTOM - TROLLEY_TOP) * geo.s)}px) scaleY(${String((pose.finale ? CABLE_BOW : CABLE_REST) * geo.s)})`,
              }}
            />
            <g
              data-part="hook"
              style={{
                transform: px(
                  HOOK_X * geo.s,
                  (TROLLEY_BOTTOM - TROLLEY_TOP + (pose.finale ? CABLE_BOW : CABLE_REST)) * geo.s,
                ),
              }}
            >
              <g transform={`scale(${String(geo.s)})`}>
                <path d={HOOK_PATHS.dark} fill="var(--robot-steel-dark)" />
                <path d={HOOK_PATHS.outline} fill="var(--robot-outline)" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    ) : null

  return (
    <div ref={fieldRef} className="stage-bars robot-field" aria-hidden="true">
      {content}
    </div>
  )
}

function Gate({ s }: { readonly s: number }) {
  // A steel post from 34 above the floor to 6 below it, with the green light on top.
  return (
    <>
      <rect className="robot-gate-post" x={-s} y={-34 * s} width={2 * s} height={40 * s} />
      <rect className="robot-gate-lamp" x={-3 * s} y={-39 * s} width={6 * s} height={5 * s} />
      <rect className="robot-gate-light" x={-2 * s} y={-38 * s} width={4 * s} height={3 * s} />
    </>
  )
}

function Reticle({ width, s }: { readonly width: number; readonly s: number }) {
  // Four corner brackets around the crate's top: the box runs from (−4, −4) to (w + 4, 18).
  const x0 = -4 * s
  const y0 = -4 * s
  const x1 = width + 4 * s
  const y1 = 18 * s
  const arm = 7 * s
  const t = 2 * s
  const bars: (readonly [number, number, number, number])[] = [
    [x0, y0, arm, t],
    [x0, y0, t, arm],
    [x1 - arm, y0, arm, t],
    [x1 - t, y0, t, arm],
    [x0, y1 - t, arm, t],
    [x0, y1 - arm, t, arm],
    [x1 - arm, y1 - t, arm, t],
    [x1 - t, y1 - arm, t, arm],
  ]
  return (
    <>
      {bars.map(([x, y, w, h], k) => (
        <rect key={k} className="robot-reticle" x={x} y={y} width={w} height={h} strokeWidth={s} />
      ))}
    </>
  )
}

function Beam({
  geo,
  scout,
  to,
}: {
  readonly geo: Layout
  readonly scout: number
  readonly to: number
}) {
  const [sx, sy] = geo.scoutAt(scout)
  const top = geo.tops[to] ?? geo.floorTop
  const x = geo.crateX(to)
  const s = geo.s
  const points = [
    [sx + 10 * s, sy + 5 * s],
    [x + 2 * s, top - 2 * s],
    [x + geo.crateW - 2 * s, top - 2 * s],
    [sx + 10 * s, sy + 7 * s],
  ]
    .map(([a, b]) => `${String(a)},${String(b)}`)
    .join(' ')
  return (
    <>
      <polygon className="robot-beam" points={points} />
      <rect className="robot-beam-hit" x={x} y={top - 2 * s} width={geo.crateW} height={2 * s} />
    </>
  )
}

// ---------- The moves ----------

interface MoveContext {
  readonly geo: Layout
  readonly before: Layout
  readonly beforeArray: readonly number[]
  readonly beforePose: ReturnType<typeof robotPoses>[number] | undefined
  readonly pose: ReturnType<typeof robotPoses>[number] | undefined
  readonly stepDelayMs: number
  readonly el: (name: string) => SVGElement | undefined
}

function run(element: Element | undefined, frames: Keyframe[], options: KeyframeAnimationOptions) {
  if (!element || typeof element.animate !== 'function') return []
  return [element.animate(frames, options)]
}

function animate(move: RobotMove, context: MoveContext): Animation[] {
  switch (move.kind) {
    case 'scan':
      return scan(context)
    case 'lock':
      return lock(move, context)
    case 'hop':
      return hop(move, context)
    case 'carry':
      return carry(move, context)
    case 'return':
      return returnTrolley(move, context)
    case 'platform':
      return platform(context, fitMs(PLATFORM_FADE_MS, context.stepDelayMs), 0)
    case 'finale':
      return finale(context)
  }
}

/** The beam fades in over the last 40% of the scan (fitted to the step). */
function scan({ el, stepDelayMs }: MoveContext): Animation[] {
  return run(
    el('beam'),
    [
      { offset: 0, opacity: 0 },
      { offset: 0.6, opacity: 0 },
      { offset: 1, opacity: 1 },
    ],
    { duration: fitMs(SCAN_MS, stepDelayMs) },
  )
}

/** The reticle moves to the new smallest, bouncing 1.35 then 0.92, and blinks twice; the
 * scout hops on at the same time. The 1.2 s of the spec are fitted to the step. */
function lock(move: { from: number; to: number }, { geo, el, stepDelayMs }: MoveContext) {
  const total = fitMs(LOCK_MOVE_MS + LOCK_BLINK_MS, stepDelayMs)
  const moveMs = (total * LOCK_MOVE_MS) / (LOCK_MOVE_MS + LOCK_BLINK_MS)
  const from = px(geo.crateX(move.from), geo.tops[move.from] ?? 0)
  const to = px(geo.crateX(move.to), geo.tops[move.to] ?? 0)
  const moveShare = moveMs / total
  return [
    ...run(
      el('reticle'),
      [{ transform: from }, { transform: to, offset: moveShare }, { transform: to }],
      {
        duration: total,
        easing: 'linear',
      },
    ),
    ...run(
      el('reticle-scale'),
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.35)', offset: moveShare * 0.55 },
        { transform: 'scale(0.92)', offset: moveShare * 0.75 },
        { transform: 'scale(1)', offset: moveShare },
        { transform: 'scale(1)' },
      ],
      { duration: total },
    ),
    ...run(
      el('reticle-scale'),
      [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: moveShare },
        { opacity: 0.2, offset: moveShare + (1 - moveShare) * 0.25 },
        { opacity: 1, offset: moveShare + (1 - moveShare) * 0.5 },
        { opacity: 0.2, offset: moveShare + (1 - moveShare) * 0.75 },
        { opacity: 1, offset: 1 },
      ],
      { duration: total },
    ),
    ...run(el('scout'), hopKeys(geo.scoutAt(move.from), geo.scoutAt(move.to), geo.s), {
      duration: moveMs,
      easing: 'linear',
    }),
  ]
}

function hop(move: { from: number; to: number }, { geo, el, stepDelayMs }: MoveContext) {
  return run(el('scout'), hopKeys(geo.scoutAt(move.from), geo.scoutAt(move.to), geo.s), {
    duration: fitMs(HOP_MS, stepDelayMs),
  })
}

function returnTrolley(move: { from: number }, { geo, el, stepDelayMs }: MoveContext) {
  const y = TROLLEY_TOP * geo.s
  return run(
    el('trolley'),
    [
      { transform: px(geo.trolleyOver(move.from), y), easing: 'ease-in-out' },
      { transform: px(geo.parkX, y) },
    ],
    { duration: fitMs(HOP_MS, stepDelayMs) },
  )
}

/** A crate joins the sorted part: its platform fades in. */
function platform({ el, pose }: MoveContext, duration: number, delay: number) {
  if (!pose) return []
  return run(el(`platform-${String(pose.sorted - 1)}`), [{ opacity: 0 }, { opacity: 1 }], {
    duration,
    delay,
    fill: 'backwards',
  })
}

/**
 * The carry (3.4 s at 1×): the scout signals and steps off; the trolley rolls over, lowers the
 * hook, lifts the smallest as high as fits and carries it to the front (over the crates
 * between if it clears them, else in front with a shadow) while the front crate slides back as
 * a dashed outline; then it lowers it, the platform and gate appear, and the hook lets go.
 */
function carry(move: { front: number; from: number }, context: MoveContext): Animation[] {
  const { geo, before, beforeArray, el, stepDelayMs } = context
  const { front, from } = move
  const s = geo.s
  const duration = carryMs(stepDelayMs)
  const timing: KeyframeAnimationOptions = { duration, fill: 'forwards' }
  const smallest = beforeArray[from] ?? 0
  const frontValue = beforeArray[front] ?? 0
  const carriedH = before.heights[from] ?? 0
  const frontH = before.heights[front] ?? 0
  const scoutSlot = context.pose?.scout ?? front
  const plan = carryPlan({ front, from, tops: before.tops, height: carriedH, scoutSlot, scale: s })
  const restTop = before.tops[from] ?? 0
  const landTop = geo.floorTop - carriedH
  const y0 = TROLLEY_TOP * s

  // The stand-ins take the crates' looks for this carry.
  const carried = el('carried')
  const ghost = el('ghost')
  const frontSolid = el('front-solid')
  fill(carried, crateMarkup(smallest, geo.crateW, carriedH, s, false))
  fill(ghost, crateMarkup(frontValue, geo.crateW, frontH, s, true))
  fill(frontSolid, crateMarkup(frontValue, geo.crateW, frontH, s, false))

  const cable = (length: number) =>
    `translateY(${String((TROLLEY_BOTTOM - TROLLEY_TOP) * s)}px) scaleY(${String(length * s)})`
  const hookAt = (length: number) => px(HOOK_X * s, (TROLLEY_BOTTOM - TROLLEY_TOP + length) * s)
  const restL = CABLE_REST
  const gripL = geo.cableTo(restTop)
  const liftL = geo.cableTo(plan.liftTop)
  const landL = geo.cableTo(landTop)

  const animations: Animation[] = [
    // The scout: signal (0–0.12), then step off (0.12–0.22). It stays there.
    ...run(
      el('scout'),
      [
        { offset: 0, transform: px(...before.scoutAt(from)) },
        { offset: 0.12, transform: px(...before.scoutAt(from)), easing: 'ease-out' },
        {
          offset: 0.17,
          transform: px(
            (before.scoutAt(from)[0] + before.scoutAt(scoutSlot)[0]) / 2,
            Math.min(before.scoutAt(from)[1], before.scoutAt(scoutSlot)[1]) - HOP_RISE * s,
          ),
          easing: 'ease-in',
        },
        { offset: 0.22, transform: px(...before.scoutAt(scoutSlot)) },
        { offset: 0.75, transform: px(...before.scoutAt(scoutSlot)) },
        // If its crate was the front one that slid away, it rides down with the new one.
        { offset: 0.85, transform: px(...geo.scoutAt(scoutSlot)) },
        { offset: 1, transform: px(...geo.scoutAt(scoutSlot)) },
      ],
      timing,
    ),
    // Arms wave three times and the glow shows, in the first 12%.
    ...wave(el, duration),
    // The trolley: roll over the smallest (0.14–0.30), carry it to the front (0.53–0.75).
    ...run(
      el('trolley'),
      keys('transform', [
        [0, px(geo.parkX, y0)],
        [0.14, px(geo.parkX, y0)],
        [0.3, px(geo.trolleyOver(from), y0)],
        [0.53, px(geo.trolleyOver(from), y0)],
        [0.75, px(geo.trolleyOver(front), y0)],
        [1, px(geo.trolleyOver(front), y0)],
      ]),
      timing,
    ),
    // The cable and hook: lower (0.30–0.40), grip (0.42), lift (0.44–0.53), carry, lower
    // (0.75–0.85), let go (0.87), rise back (0.88–0.95).
    ...run(
      el('cable'),
      keys('transform', [
        [0, cable(restL)],
        [0.3, cable(restL)],
        [0.4, cable(gripL)],
        [0.44, cable(gripL)],
        [0.53, cable(liftL)],
        [0.75, cable(liftL)],
        [0.85, cable(landL)],
        [0.88, cable(landL)],
        [0.95, cable(restL)],
        [1, cable(restL)],
      ]),
      timing,
    ),
    ...run(
      el('hook'),
      keys('transform', [
        [0, hookAt(restL)],
        [0.3, hookAt(restL)],
        [0.4, hookAt(gripL)],
        [0.44, hookAt(gripL)],
        [0.53, hookAt(liftL)],
        [0.75, hookAt(liftL)],
        [0.85, hookAt(landL)],
        [0.88, hookAt(landL)],
        [0.95, hookAt(restL)],
        [1, hookAt(restL)],
      ]),
      timing,
    ),
    // The carried crate hangs from the hook from 0.42 to 0.87.
    ...run(
      carried,
      keys('transform', [
        [0, px(geo.crateX(from), restTop)],
        [0.44, px(geo.crateX(from), restTop)],
        [0.53, px(geo.crateX(from), plan.liftTop)],
        [0.75, px(geo.crateX(front), plan.liftTop)],
        [0.85, px(geo.crateX(front), landTop)],
        [1, px(geo.crateX(front), landTop)],
      ]),
      { duration },
    ),
    ...run(carried, windowKeys(0, 0.87), { duration }),
    // Its shadow when it passes in front of the crates between.
    ...(plan.over
      ? []
      : [
          ...run(
            el('carried-shadow'),
            keys('transform', [
              [0, px(geo.crateX(from), plan.liftTop + carriedH + s)],
              [0.53, px(geo.crateX(from), plan.liftTop + carriedH + s)],
              [0.75, px(geo.crateX(front), plan.liftTop + carriedH + s)],
              [1, px(geo.crateX(front), plan.liftTop + carriedH + s)],
            ]),
            { duration },
          ),
          ...run(el('carried-shadow'), windowKeys(0.53, 0.75), { duration }),
        ]),
    // The front crate stays until 0.53, then slides back as a dashed outline, landing at 0.75.
    ...run(
      frontSolid,
      [
        { transform: px(geo.crateX(front), before.tops[front] ?? 0) },
        { transform: px(geo.crateX(front), before.tops[front] ?? 0) },
      ],
      { duration },
    ),
    ...run(frontSolid, windowKeys(0, 0.53), { duration }),
    ...run(
      ghost,
      keys('transform', [
        [0, px(geo.crateX(front), geo.floorTop - frontH)],
        [0.53, px(geo.crateX(front), geo.floorTop - frontH)],
        [0.75, px(geo.crateX(from), geo.floorTop - frontH)],
        [1, px(geo.crateX(from), geo.floorTop - frontH)],
      ]),
      { duration },
    ),
    ...run(ghost, windowKeys(0.53, 0.75), { duration }),
    // The real crates show where they land: the old front one at 0.75, the smallest at 0.87.
    ...run(el(`crate-${String(from)}`), showFrom(0.75), { duration }),
    ...run(el(`crate-${String(front)}`), showFrom(0.87), { duration }),
    // The reticle was on the smallest; it goes with the lift.
    ...run(
      el('reticle'),
      [
        { opacity: 1, transform: px(geo.crateX(from), restTop) },
        { opacity: 1, offset: 0.42, transform: px(geo.crateX(from), restTop) },
        { opacity: 0, offset: 0.44 },
        { opacity: 0 },
      ],
      { duration },
    ),
    // The front slot's platform and the moved gate appear (0.86–0.90), and stay.
    ...run(
      el('gate'),
      [
        { offset: 0, opacity: front > 0 ? 1 : 0, transform: px(geo.slotLeft(front), geo.floorTop) },
        {
          offset: 0.86,
          opacity: front > 0 ? 1 : 0,
          transform: px(geo.slotLeft(front), geo.floorTop),
        },
        {
          offset: 0.9,
          opacity: front + 1 < geo.heights.length ? 1 : 0,
          transform: px(geo.slotLeft(front + 1), geo.floorTop),
        },
        {
          offset: 1,
          opacity: front + 1 < geo.heights.length ? 1 : 0,
          transform: px(geo.slotLeft(front + 1), geo.floorTop),
        },
      ],
      timing,
    ),
  ]
  // The platform-next stand-in is already under the front slot (the sorted count is `front`).
  const lit = el('platform-next')
  if (lit) {
    animations.push(
      ...run(
        lit,
        [
          { offset: 0, opacity: 0 },
          { offset: 0.86, opacity: 0 },
          { offset: 0.9, opacity: 1 },
          { offset: 1, opacity: 1 },
        ],
        timing,
      ),
    )
  }
  return animations
}

/** The end-of-round signal: both arms wave three times, with the glow, in the first 12%. */
function wave(el: (name: string) => SVGElement | undefined, duration: number): Animation[] {
  const end = 0.12
  const arms: Keyframe[] = [{ offset: 0, opacity: 1, transform: 'translateY(7px)' }]
  for (let k = 0; k < 3; k++) {
    arms.push({ offset: (end * (2 * k + 1)) / 6, opacity: 1, transform: 'translateY(0)' })
    arms.push({ offset: (end * (2 * k + 2)) / 6, opacity: 1, transform: 'translateY(7px)' })
  }
  arms.push({ offset: end, opacity: 0, transform: 'translateY(7px)' }, { offset: 1, opacity: 0 })
  const glow: Keyframe[] = [
    { offset: 0, opacity: 0.9 },
    { offset: end, opacity: 0.9 },
    { offset: end, opacity: 0 },
    { offset: 1, opacity: 0 },
  ]
  const scout = el('scout')
  return [
    ...run(scout?.querySelector('.scout-arms') ?? undefined, arms, { duration }),
    ...run(scout?.querySelector('.scout-glow') ?? undefined, glow, { duration }),
  ]
}

/** The finale: the last platform lights (350 ms), and 400 ms in the dance starts. */
function finale(context: MoveContext): Animation[] {
  const { geo, el } = context
  const s = geo.s
  const start = DANCE_DELAY_MS
  const at = (ms: number) => ms / 1150
  const dance = { duration: 1150, delay: start, fill: 'both' } as const
  const scout = el('scout')
  const [sx, sy] = geo.scoutAt(context.pose?.scout ?? 0)
  const hops: Keyframe[] = [{ offset: 0, transform: px(sx, sy) }]
  for (const beat of [360, 450, 540]) {
    hops.push({ offset: at(beat), transform: px(sx, sy) })
    hops.push({ offset: at(beat + 40), transform: px(sx, sy - 4 * s) })
    hops.push({ offset: at(beat + 80), transform: px(sx, sy) })
  }
  hops.push({ offset: 1, transform: px(sx, sy) })
  const antenna: Keyframe[] = [{ offset: 0, opacity: 1 }]
  for (const beat of [360, 450, 540]) {
    antenna.push({ offset: at(beat), opacity: 1 }, { offset: at(beat), opacity: 0.3 })
    antenna.push({ offset: at(beat + 55), opacity: 0.3 }, { offset: at(beat + 55), opacity: 1 })
  }
  antenna.push({ offset: 1, opacity: 1 })
  const y0 = TROLLEY_TOP * s
  const roll = (dx: number) => px(geo.parkX + dx * s, y0)
  const cable = (length: number) =>
    `translateY(${String((TROLLEY_BOTTOM - TROLLEY_TOP) * s)}px) scaleY(${String(length * s)})`
  const hookAt = (length: number) => px(HOOK_X * s, (TROLLEY_BOTTOM - TROLLEY_TOP + length) * s)
  return [
    ...platform(context, PLATFORM_FADE_MS, 0),
    ...run(scout, hops, dance),
    ...run(scout?.querySelector('.scout-antenna') ?? undefined, antenna, dance),
    // Arms appear at 700 and rise 7 by 820; the ^ ^ eyes come with them.
    ...run(
      scout?.querySelector('.scout-arms') ?? undefined,
      [
        { offset: 0, opacity: 0, transform: `translateY(${String(7)}px)` },
        { offset: at(700), opacity: 0, transform: 'translateY(7px)' },
        { offset: at(700), opacity: 1, transform: 'translateY(7px)' },
        { offset: at(820), opacity: 1, transform: 'translateY(0)' },
        { offset: 1, opacity: 1, transform: 'translateY(0)' },
      ],
      dance,
    ),
    ...run(
      scout?.querySelector('.scout-happy') ?? undefined,
      [
        { offset: 0, opacity: 0 },
        { offset: at(820), opacity: 0 },
        { offset: at(820), opacity: 1 },
        { offset: 1, opacity: 1 },
      ],
      dance,
    ),
    ...run(
      el('trolley'),
      keys('transform', [
        [0, roll(0)],
        [at(300), roll(0)],
        [at(400), roll(-6)],
        [at(500), roll(6)],
        [at(600), roll(-4)],
        [at(700), roll(0)],
        [1, roll(0)],
      ]),
      dance,
    ),
    ...run(
      el('swing'),
      keys('transform', [
        [0, 'rotate(0deg)'],
        [at(300), 'rotate(0deg)'],
        [at(420), 'rotate(12deg)'],
        [at(540), 'rotate(-10deg)'],
        [at(660), 'rotate(7deg)'],
        [at(780), 'rotate(-3deg)'],
        [at(840), 'rotate(0deg)'],
        [1, 'rotate(0deg)'],
      ]),
      dance,
    ),
    ...run(
      el('cable'),
      keys('transform', [
        [0, cable(CABLE_REST)],
        [at(820), cable(CABLE_REST)],
        [at(900), cable(CABLE_BOW)],
        [1, cable(CABLE_BOW)],
      ]),
      dance,
    ),
    ...run(
      el('hook'),
      keys('transform', [
        [0, hookAt(CABLE_REST)],
        [at(820), hookAt(CABLE_REST)],
        [at(900), hookAt(CABLE_BOW)],
        [1, hookAt(CABLE_BOW)],
      ]),
      dance,
    ),
  ]
}

// ---------- Stand-in crates, drawn for one carry ----------

function fill(target: SVGElement | undefined, markup: string) {
  if (target) target.innerHTML = markup
}

/** The same crate as <Crate>, as markup for the carry's stand-ins. */
function crateMarkup(value: number, width: number, height: number, s: number, dashed: boolean) {
  const font = numberSize(s)
  const n = (v: number) => String(Math.round(v * 100) / 100)
  if (dashed) {
    return `<rect class="crate-ghost" x="${n(s)}" y="${n(s)}" width="${n(Math.max(0, width - 2 * s))}" height="${n(Math.max(0, height - 2 * s))}" stroke-width="${n(2 * s)}" stroke-dasharray="${n(3 * s)} ${n(2 * s)}"/><text class="crate-ghost-number" x="${n(width / 2)}" y="${n(s + font)}" font-size="${n(font)}">${String(value)}</text>`
  }
  let planks = ''
  for (let y = 9 * s; y < height - 2 * s; y += 9 * s) {
    planks += `<rect class="crate-plank" x="${n(s)}" y="${n(y)}" width="${n(width - 2 * s)}" height="${n(s)}"/>`
  }
  const c = 3 * s
  const corners =
    height > 2 * c + 2 * s
      ? [
          [s, s],
          [width - s - c, s],
          [s, height - s - c],
          [width - s - c, height - s - c],
        ]
          .map(
            ([x, y]) =>
              `<rect class="crate-corner" x="${n(x ?? 0)}" y="${n(y ?? 0)}" width="${n(c)}" height="${n(c)}"/>`,
          )
          .join('')
      : ''
  return `<rect class="crate-wood" x="0" y="0" width="${n(width)}" height="${n(height)}"/>${planks}${corners}<rect class="crate-edge" x="${n(s / 2)}" y="${n(s / 2)}" width="${n(Math.max(0, width - s))}" height="${n(Math.max(0, height - s))}" stroke-width="${n(s)}"/><text class="crate-number" x="${n(width / 2)}" y="${n(Math.min(height - s, s + font))}" font-size="${n(font)}">${String(value)}</text>`
}
