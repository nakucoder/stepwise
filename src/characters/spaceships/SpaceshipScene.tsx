/**
 * Merge sort's spaceships, "Squadrons and a stargate" (design/mockups/spaceships/README.md): one
 * SVG over the bars' field, drawn in the field's own pixels. Every value is a fighter in its own
 * column, a bigger value a bigger ship, with its digit on a plate. Squadrons stand in the
 * formation tree; a merge's halves fly up through a stargate into the new squadron.
 *
 * The scene draws both of merge sort's rows (the registry's `twoRows`): the main row's ships
 * stand in their squadrons, the second row's are the halves under the gate. The space and the
 * ships are fixed in both themes (tokens.css); role colors appear only as the rings (the leads
 * at a compare, everything at the end), with the words under the stage.
 *
 * Only one step forward plays a move; anything else shows the frame's pose, and so does every
 * step with reduced motion. A new size rebuilds a move in progress from where it had got to.
 */
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { SceneProps } from '../registry'
import { fitMs } from '../pixel'
import {
  bracketAt,
  gateAt,
  LIFT,
  plateAt,
  POST_W,
  RING,
  shipAt,
  spaceshipLayout,
  stableHeight,
  takePath,
  type Box,
  type SizeMemory,
  type SpaceshipLayout,
} from './geometry'
import { fighterPaths, trailRects } from './sprites'
import {
  BACK_MS,
  COMPARE_MS,
  FADE_MS,
  familyChanged,
  FINALE_RING_MS,
  FLY_IN_MS,
  FLY_OUT_MS,
  openAndCompareMs,
  posesOf,
  SHUT_AT,
  shutMs,
  spaceshipMoves,
  SPLIT_MS,
  TAKE_AT,
  TAKE_MS,
  takeoffAt,
  type ShipPlace,
  type SpaceshipMove,
  type SpaceshipPose,
} from './steps'
import './SpaceshipScene.css'

/** The starfield: a 120 × 96 px tile at 1 screen pixel per pixel (x, y, size). */
const STARS: readonly (readonly [number, number, number])[] = [
  [7, 11, 1],
  [41, 5, 2],
  [88, 17, 1],
  [110, 44, 1],
  [23, 52, 1],
  [66, 38, 1],
  [95, 70, 2],
  [12, 83, 1],
  [54, 77, 1],
]
const BRIGHT_STARS: readonly (readonly [number, number, number])[] = [
  [77, 59, 1],
  [33, 30, 1],
]
/** A lead's sideways bank at mid-flight in a split, in units. */
const BANK = 3

const px = (x: number, y: number) => `translate(${String(x)}px, ${String(y)}px)`

/** The row a pose's row is drawn in: itself in the tree; in the zoom, the family's row on top. */
const shownRow = (geo: SpaceshipLayout, pose: SpaceshipPose, row: number) =>
  geo.plan === 'tree' ? row : row - pose.family.depth

/** Whether a ship (or a squadron's column) is on stage: in the zoom, only the family's two rows. */
function onStage(geo: SpaceshipLayout, pose: SpaceshipPose, place: ShipPlace): boolean {
  if (geo.plan === 'tree') return true
  const { lo, hi } = pose.family
  const row = shownRow(geo, pose, place.row)
  return place.column >= lo && place.column < hi && (row === 0 || row === 1)
}

/**
 * A fighter: the stage's one ship (every value flies the same), its ring, its engine trail as
 * long as its value says, and its digit on a plate at the trail's end. The trail and the plate
 * are drawn in the ship's own group, so they travel with it.
 */
function Fighter(props: {
  readonly value: number
  readonly geo: SpaceshipLayout
  readonly id: number
  readonly ring: 'comparing' | 'sorted' | null
}) {
  const { value, geo, id, ring } = props
  const { s, side, grid } = geo
  const paths = fighterPaths(grid)
  // The plate, in the ship's own coordinates (its top-left is 0, 0).
  const plate = plateAt(geo, value, 0, 0)
  const [x0, y0] = shipAt(geo, 0, 0)
  return (
    <>
      {ring && (
        <rect
          data-part={`ring-${String(id)}`}
          className={`space-ring is-${ring}`}
          x={-RING * s + s / 2}
          y={-RING * s + s / 2}
          width={side + 2 * RING * s - s}
          height={side + 2 * RING * s - s}
          strokeWidth={s}
        />
      )}
      <Trail grid={grid} p={s} length={geo.trail(value)} />
      <g transform={`scale(${String(s)})`}>
        <path className="space-hull" d={paths.hull} />
        <path className="space-highlight" d={paths.highlight} />
        <path className="space-shade" d={paths.shade} />
        <path className="space-canopy" d={paths.canopy} />
        <path className="space-wing" d={paths.wing} />
        <path data-part={`glow-${String(id)}`} className="space-glow" d={paths.glow} />
        <path
          data-part={`glow-long-${String(id)}`}
          className="space-glow"
          d={paths.glowLong}
          opacity={0}
        />
        <path className="space-outline" d={paths.outline} />
      </g>
      <g data-part={`plate-${String(id)}`}>
        <rect
          className="space-plate"
          x={plate.x - x0}
          y={plate.y - y0}
          width={plate.width}
          height={plate.height}
        />
        <text
          className="space-digit"
          x={plate.x - x0 + plate.width / 2}
          y={plate.y - y0 + plate.height / 2}
          fontSize={geo.font}
          dominantBaseline="central"
        >
          {value}
        </text>
      </g>
    </>
  )
}

/**
 * A ship's engine trail, `length` px long, falling from each engine of the fighter: a flame 3
 * units wide, white at the nozzle, then orange, then red; its sides shorter (a taper) and a
 * spark past the tip of every other flame. Whole pixels; it starts in the glow's row.
 */
function Trail({
  grid,
  p,
  length,
}: {
  readonly grid: number
  readonly p: number
  readonly length: number
}) {
  const units = Math.round(length / p)
  if (units <= 0) return null
  const rects = trailRects(grid, units)
  return (
    <g data-part="trail" transform={`translate(0, ${String((grid - 1) * p)}) scale(${String(p)})`}>
      {rects.map((r, k) => (
        <rect
          key={k}
          className={`space-trail is-${r.part}`}
          x={r.x}
          y={r.y}
          width={1}
          height={r.h}
        />
      ))}
    </g>
  )
}

export function SpaceshipScene({
  frames,
  index,
  stepDelayMs,
  reducedMotion,
  level,
  asking,
}: SceneProps) {
  const fieldRef = useRef<HTMLDivElement>(null)
  // The field's box, and the height the ships' sizes come from: the shortest the field has been
  // in this run, so a size never changes between steps (geometry.ts, stableHeight).
  const [box, setBox] = useState<
    (Box & { readonly memory: SizeMemory; readonly sizeHeight: number }) | null
  >(null)
  const starsId = `${useId()}-stars`

  useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    const measure = () => {
      const rect = field.getBoundingClientRect()
      const gap = parseFloat(getComputedStyle(field).columnGap) || 0
      setBox((old) => {
        if (old && old.width === rect.width && old.height === rect.height && old.gap === gap) {
          return old
        }
        const { memory, sizeHeight } = stableHeight(old?.memory ?? null, rect.width, rect.height)
        return { width: rect.width, height: rect.height, gap, memory, sizeHeight }
      })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(field)
    return () => {
      observer.disconnect()
    }
  }, [])

  // A new run (new numbers) starts its sizes afresh, from the field as it is now.
  const run0 = useRef(frames)
  useLayoutEffect(() => {
    if (run0.current === frames) return
    run0.current = frames
    setBox(
      (old) =>
        old && {
          ...old,
          memory: { width: old.width, tallest: old.height, shortest: old.height },
          sizeHeight: old.height,
        },
    )
  }, [frames])

  const poses = useMemo(() => posesOf(frames), [frames])
  const pose = poses[index]
  // The ships' values, by ship: each ship is numbered by its column in the first frame.
  const values = useMemo(() => frames[0]?.array ?? [], [frames])
  const geo =
    box && box.width > 0 && box.height > 0 ? spaceshipLayout(box, values, box.sizeHeight) : null

  // ---------- Motion: one step forward plays the move into this frame ----------
  const previousIndex = useRef(index)
  const playing = useRef<{ readonly index: number; readonly start: number } | null>(null)
  useLayoutEffect(() => {
    const from = previousIndex.current
    previousIndex.current = index
    if (index !== from) {
      playing.current = index === from + 1 ? { index, start: performance.now() } : null
    }
    const move = playing.current
    const before = poses[index - 1]
    if (reducedMotion || !geo || move?.index !== index || !pose || !before) return
    const field = fieldRef.current
    const el = (name: string) =>
      field?.querySelector<SVGElement>(`[data-part="${name}"]`) ?? undefined
    const context: MoveContext = { geo, pose, before, values, stepDelayMs, el }
    // In the zoom a new family fades in, as a jump would show it: nothing flies.
    const animations =
      geo.plan === 'zoom' && familyChanged(poses, index)
        ? run(el('scene'), [{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS })
        : spaceshipMoves(frames, index, poses).flatMap((m) => animate(m, context))
    const elapsed = performance.now() - move.start
    if (elapsed > 1) for (const animation of animations) animation.currentTime = elapsed
    return () => {
      for (const animation of animations) animation.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, frames, reducedMotion, box])

  let content = null
  let band = null
  if (geo && pose) {
    const { s } = geo
    const row = (r: number) => shownRow(geo, pose, r)
    const moves = spaceshipMoves(frames, index, poses)
    // A ship in flight is drawn last, over everything.
    const flying = moves.find((m) => m.kind === 'take')?.ship ?? -1
    const ships = values
      .map((_, id) => id)
      .filter((id) => {
        const place = pose.ships[id]
        return place !== undefined && onStage(geo, pose, place)
      })
      .sort((a, b) => Number(a === flying) - Number(b === flying))
    const squadrons = pose.squadrons.filter((q) =>
      onStage(geo, pose, { column: q.first, row: q.row }),
    )
    const badges = level === 'explorer' && asking && pose.leads
    // The gate of a merge just done, shutting (drawn at its final pose: gone).
    const shutting = moves.find((m) => m.kind === 'shut')
    const split = moves.find((m) => m.kind === 'split')
    const closing = shutting ? gateAt(geo, shutting.lo, shutting.hi, row(shutting.row)) : null
    const gate = pose.gate ? gateAt(geo, pose.gate.lo, pose.gate.hi, row(pose.gate.row)) : null
    const shownGate = gate ?? closing
    const forming = pose.forming
    content = (
      <svg className="space-scene" width={geo.width} height={geo.height} aria-hidden="true">
        <defs>
          <pattern id={starsId} width={120} height={96} patternUnits="userSpaceOnUse">
            {STARS.map(([x, y, size]) => (
              <rect
                key={`${String(x)},${String(y)}`}
                className="space-star"
                x={x}
                y={y}
                width={size}
                height={size}
              />
            ))}
            {BRIGHT_STARS.map(([x, y, size]) => (
              <rect
                key={`${String(x)},${String(y)}`}
                className="space-star-bright"
                x={x}
                y={y}
                width={size}
                height={size}
              />
            ))}
          </pattern>
        </defs>
        <rect width={geo.width} height={geo.height} fill={`url(#${starsId})`} />
        <g data-part="scene">
          {/* Brackets, then the forming squadron's slots, the gate, then the ships. */}
          {squadrons.map((q) => {
            const b = bracketAt(geo, q.first, q.last, row(q.row))
            const merged = shutting && q.first === shutting.lo && q.last === shutting.hi - 1
            return (
              <rect
                key={`${String(q.first)}-${String(q.last)}-${String(q.row)}`}
                data-part={
                  merged
                    ? 'bracket-merged'
                    : `bracket-${String(q.first)}-${String(q.last)}-${String(q.row)}`
                }
                className="space-frame"
                {...b}
              />
            )
          })}
          {split && (
            // The squadron that peels: its bracket fades as the halves' draw out.
            <rect
              data-part="bracket-peeled"
              className="space-frame"
              opacity={0}
              {...bracketAt(geo, split.lo, split.hi - 1, row((pose.ships[split.lo]?.row ?? 1) - 1))}
            />
          )}
          {forming && (
            <g data-part="forming">
              <rect
                className="space-frame"
                {...bracketAt(geo, forming.first, forming.last, row(forming.row))}
              />
              {forming.empty.map((column) => {
                const { side } = geo
                return (
                  <rect
                    key={column}
                    className="space-slot"
                    x={Math.round(geo.center(column) - side / 2) + 0.5}
                    y={geo.shipTop(row(forming.row)) + 0.5}
                    width={side - 1}
                    height={side - 1}
                  />
                )
              })}
            </g>
          )}
          {shutting && (
            <rect
              data-part="bracket-glow"
              className="space-flash"
              opacity={0}
              {...bracketAt(geo, shutting.lo, shutting.hi - 1, row(shutting.row - 1))}
            />
          )}
          {shownGate && (
            <g data-part="gate" opacity={gate ? 1 : 0}>
              <rect data-part="gate-bar" className="space-gate" {...shownGate.bar} />
              {shownGate.posts.map((post, k) => (
                <rect
                  key={k}
                  data-part={`gate-post-${String(k)}`}
                  className="space-gate"
                  {...post}
                />
              ))}
              <g data-part="gate-flash" opacity={0}>
                <rect className="space-flash" {...shownGate.bar} />
                {shownGate.posts.map((post, k) => (
                  <rect key={k} className="space-flash" {...post} />
                ))}
              </g>
            </g>
          )}
          {ships.map((id) => {
            const place = pose.ships[id]
            const value = values[id] ?? 0
            if (!place) return null
            const lead = pose.leads?.includes(id) === true
            const [x, y] = shipAt(geo, place.column, row(place.row), lead)
            const ring = pose.final ? 'sorted' : lead ? 'comparing' : null
            return (
              <g key={id} data-part={`ship-${String(id)}`} style={{ transform: px(x, y) }}>
                <Fighter value={value} geo={geo} id={id} ring={ring} />
              </g>
            )
          })}
          {badges &&
            badges.map((id, k) => {
              const place = pose.ships[id]
              if (!place) return null
              const [x, y] = shipAt(geo, place.column, row(place.row), true)
              const { side } = geo
              const h = Math.round(geo.font * 1.2)
              const w = Math.round(geo.font * 1.1)
              // Above the lead, outside it and its ring: never over its digit.
              return (
                <g
                  key={id}
                  className="space-badge"
                  transform={`translate(${String(Math.round(x + side / 2 - w / 2))}, ${String(y - RING * s - h)})`}
                >
                  <rect className="space-plate" width={w} height={h} />
                  <text
                    className="space-digit"
                    x={w / 2}
                    y={h / 2}
                    fontSize={geo.font}
                    dominantBaseline="central"
                  >
                    {k === 0 ? 'L' : 'R'}
                  </text>
                </g>
              )
            })}
        </g>
      </svg>
    )
    // Engineer's taps for "which goes next?": the halves' row under the gate (down over the
    // tags under the stage when it is the last row on stage).
    if (pose.gate) {
      const halves = row(pose.gate.row)
      const last = halves === geo.rows - 1
      band = (
        <div
          className="space-pick-band"
          data-pick-band={last ? 'to-bottom' : ''}
          style={{ top: geo.rowTop(halves), height: geo.rowH }}
        />
      )
    }
  }

  return (
    <div ref={fieldRef} className="stage-bars space-field" aria-hidden="true">
      {content}
      {band}
    </div>
  )
}

// ---------- The moves ----------

interface MoveContext {
  readonly geo: SpaceshipLayout
  readonly pose: SpaceshipPose
  readonly before: SpaceshipPose
  readonly values: readonly number[]
  readonly stepDelayMs: number
  readonly el: (name: string) => SVGElement | undefined
}

function run(element: Element | undefined, frames: Keyframe[], options: KeyframeAnimationOptions) {
  if (!element || typeof element.animate !== 'function') return []
  return [element.animate(frames, options)]
}

/** Where ship `id` stands in a pose (a lead lifted), in the field's px. */
function placeOf(context: MoveContext, pose: SpaceshipPose, id: number, lifted = false) {
  const { geo } = context
  const place = pose.ships[id] ?? { column: 0, row: 0 }
  return shipAt(geo, place.column, shownRow(geo, context.pose, place.row), lifted)
}

function animate(move: SpaceshipMove, context: MoveContext): Animation[] {
  switch (move.kind) {
    case 'split':
      return split(move, context)
    case 'gate-open':
      return gateOpen(context)
    case 'compare':
      return compare(move, context)
    case 'take':
      return take(move, context)
    case 'shut':
      return shut(context)
    case 'finale':
      return finale(context)
  }
}

/** The squadron peels: both halves drop a row, the left banking left and the right right. */
function split(move: { lo: number; mid: number; hi: number }, context: MoveContext): Animation[] {
  const { geo, pose, before, el, stepDelayMs } = context
  const duration = fitMs(SPLIT_MS, stepDelayMs)
  const animations: Animation[] = []
  pose.ships.forEach((place, id) => {
    if (place.column < move.lo || place.column >= move.hi) return
    const [x0, y0] = placeOf(context, before, id)
    const [x1, y1] = placeOf(context, pose, id)
    const bank = (place.column < move.mid ? -1 : 1) * BANK * geo.s
    animations.push(
      ...run(
        el(`ship-${String(id)}`),
        [
          { transform: px(x0, y0) },
          { transform: px((x0 + x1) / 2 + bank, (y0 + y1) / 2) },
          { transform: px(x1, y1) },
        ],
        { duration, easing: 'ease-in-out' },
      ),
    )
  })
  for (const [first, last] of [
    [move.lo, move.mid - 1],
    [move.mid, move.hi - 1],
  ] as const) {
    const row = pose.ships[first]?.row ?? 0
    animations.push(
      ...run(
        el(`bracket-${String(first)}-${String(last)}-${String(row)}`),
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration, easing: 'ease-out' },
      ),
    )
  }
  animations.push(...run(el('bracket-peeled'), [{ opacity: 1 }, { opacity: 0 }], { duration }))
  return animations
}

/** The gate opens: the posts slide out from the middle as the bar grows; the slots fade in. */
function gateOpen(context: MoveContext): Animation[] {
  const { el, stepDelayMs } = context
  const { open } = openAndCompareMs(stepDelayMs)
  const options = { duration: open, easing: 'ease-out' }
  const bar = el('gate-bar')
  const width = Number(bar?.getAttribute('width') ?? 0)
  const toMiddle = width / 2 - (POST_W * context.geo.s) / 2
  return [
    ...run(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], options),
    ...run(
      el('gate-post-0'),
      [{ transform: `translateX(${String(toMiddle)}px)` }, { transform: 'none' }],
      options,
    ),
    ...run(
      el('gate-post-1'),
      [{ transform: `translateX(${String(-toMiddle)}px)` }, { transform: 'none' }],
      options,
    ),
    ...run(el('forming'), [{ opacity: 0 }, { opacity: 1 }], options),
  ]
}

/** The two leads pull forward 2 units and their rings fade in (after the gate, if it opened). */
function compare(move: { leads: readonly [number, number] }, context: MoveContext): Animation[] {
  const { el, before, pose, stepDelayMs } = context
  const opening = pose.gate !== null && before.gate === null
  const { open, compare: fitted } = openAndCompareMs(stepDelayMs)
  const duration = opening ? fitted : fitMs(COMPARE_MS, stepDelayMs)
  const delay = opening ? open : 0
  return move.leads.flatMap((id) => {
    const [x, y] = placeOf(context, pose, id, true)
    return [
      ...run(
        el(`ship-${String(id)}`),
        [{ transform: px(x, y + LIFT * context.geo.s) }, { transform: px(x, y) }],
        { duration, delay, easing: 'ease-out', fill: 'backwards' },
      ),
      ...run(el(`ring-${String(id)}`), [{ opacity: 0 }, { opacity: 1 }], {
        duration,
        delay,
        fill: 'backwards',
      }),
    ]
  })
}

/**
 * A ship flies through the gate: straight up its column into the new squadron's row (eased in,
 * to 55%), then sideways into its slot (eased out). Its glow doubles in flight; the gate's bar
 * lights up as it crosses (45–55%). The other lead eases back into formation.
 */
function take(
  move: { ship: number; from: ShipPlace; to: ShipPlace; back: number | null },
  context: MoveContext,
): Animation[] {
  const { el, before, pose, stepDelayMs } = context
  const duration = fitMs(TAKE_MS, stepDelayMs)
  const id = String(move.ship)
  const wasLead = before.leads?.includes(move.ship) === true
  const { geo, values } = context
  const row = (r: number) => shownRow(geo, pose, r)
  // Up its column through the gate, then diagonally to its slot, never over a parked ship.
  const path = takePath(
    geo,
    {
      from: { column: move.from.column, row: row(move.from.row) },
      to: { column: move.to.column, row: row(move.to.row) },
      lifted: wasLead,
    },
    pose.ships.flatMap((place, other) =>
      other !== move.ship && place.row === move.to.row
        ? [{ column: place.column, value: values[other] ?? 0 }]
        : [],
    ),
    TAKE_AT.up,
  )
  const animations = [
    ...run(
      el(`ship-${id}`),
      path.map((point, k) => ({
        offset: point.offset,
        transform: px(point.x, point.y),
        // Up eased in; level and diagonal at speed; landing eased out.
        easing: k === 0 ? 'ease-in' : k === path.length - 2 ? 'ease-out' : 'linear',
      })),
      { duration },
    ),
    ...run(el(`glow-long-${id}`), [{ opacity: 1 }, { opacity: 1, offset: 0.95 }, { opacity: 0 }], {
      duration,
    }),
    ...run(el(`glow-${id}`), [{ opacity: 0 }, { opacity: 0, offset: 0.95 }, { opacity: 1 }], {
      duration,
    }),
    ...run(
      el('gate-flash'),
      [
        { opacity: 0 },
        { opacity: 0, offset: TAKE_AT.gateFrom },
        { opacity: 1, offset: (TAKE_AT.gateFrom + TAKE_AT.gateTo) / 2 },
        { opacity: 0, offset: TAKE_AT.gateTo },
        { opacity: 0 },
      ],
      { duration },
    ),
  ]
  if (move.back !== null) {
    const [bx, by] = placeOf(context, pose, move.back)
    animations.push(
      ...run(
        el(`ship-${String(move.back)}`),
        [{ transform: px(bx, by - LIFT * context.geo.s) }, { transform: px(bx, by) }],
        { duration: fitMs(BACK_MS, stepDelayMs), easing: 'ease-out' },
      ),
    )
  }
  return animations
}

/** The special move: the gate flashes, then shuts to the middle and fades; the bracket glows. */
function shut(context: MoveContext): Animation[] {
  const { el, stepDelayMs } = context
  const duration = shutMs(stepDelayMs)
  const flash = SHUT_AT.flash / 900
  const closed = SHUT_AT.shut / 900
  const bar = el('gate-bar')
  const width = Number(bar?.getAttribute('width') ?? 0)
  const toMiddle = width / 2 - (POST_W * context.geo.s) / 2
  const visible = { duration, fill: 'none' as const }
  return [
    ...run(
      el('gate'),
      [
        { opacity: 1 },
        { opacity: 1, offset: flash },
        { opacity: 0, offset: closed, easing: 'ease-in' },
        { opacity: 0 },
      ],
      visible,
    ),
    ...run(
      el('gate-flash'),
      [
        { opacity: 1 },
        { opacity: 1, offset: flash },
        { opacity: 0, offset: closed },
        { opacity: 0 },
      ],
      visible,
    ),
    ...run(
      bar,
      [
        { transform: 'scaleX(1)' },
        { transform: 'scaleX(1)', offset: flash, easing: 'ease-in' },
        { transform: 'scaleX(0)', offset: closed },
        { transform: 'scaleX(0)' },
      ],
      visible,
    ),
    ...[0, 1].flatMap((k) =>
      run(
        el(`gate-post-${String(k)}`),
        [
          { transform: 'none' },
          { transform: 'none', offset: flash, easing: 'ease-in' },
          { transform: `translateX(${String(k === 0 ? toMiddle : -toMiddle)}px)`, offset: closed },
          { transform: `translateX(${String(k === 0 ? toMiddle : -toMiddle)}px)` },
        ],
        visible,
      ),
    ),
    ...run(
      el('bracket-glow'),
      [
        { opacity: 0 },
        { opacity: 0, offset: closed },
        { opacity: 1, offset: (closed + 1) / 2 },
        { opacity: 0 },
      ],
      visible,
    ),
  ]
}

/** Green rings on every ship; then each takes off in turn, loops off the top and back in. */
function finale(context: MoveContext): Animation[] {
  const { el, pose, geo } = context
  const order = pose.ships
    .map((place, id) => ({ id, column: place.column }))
    .sort((a, b) => a.column - b.column)
  return order.flatMap(({ id }, k) => {
    const [x, y] = placeOf(context, pose, id)
    // The whole ship off the stage: itself, its trail and its plate.
    const tall = geo.side + geo.trailMax + geo.plateH + RING * geo.s
    const total = FLY_OUT_MS + FLY_IN_MS
    const out = FLY_OUT_MS / total
    return [
      ...run(el(`ring-${String(id)}`), [{ opacity: 0 }, { opacity: 1 }], {
        duration: FINALE_RING_MS,
        fill: 'backwards',
      }),
      ...run(
        el(`ship-${String(id)}`),
        [
          { offset: 0, transform: px(x, y), easing: 'ease-in' },
          { offset: out, transform: px(x, -tall) },
          { offset: out, transform: px(x, geo.height + RING * geo.s), easing: 'ease-out' },
          { offset: 1, transform: px(x, y) },
        ],
        { duration: total, delay: takeoffAt(k) },
      ),
    ]
  })
}
