/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): one stage of heap sort's character
 * mockups, at a real stage size: the pyramid band as the site draws it there (row tags and arcs,
 * copied in pixels from Stage.css and the phone's one-row band), then the field with the
 * characters, and for the monkeys, where the site shows the tree on the stage, the tree with the
 * monkeys on its branches.
 */
import { useMemo, type CSSProperties } from 'react'
import { spritePath } from '../../characters/pixel'
import { heapEnd, stageHeight, stageNodeAt, STAGE_PITCH } from '../../components/heapTree'
import type { Frame } from '../../engine/types'
import {
  bananaStack,
  columnsOf,
  MONKEY_H,
  MONKEY_W,
  monkeyRows,
  moveInto,
  planOf,
  STEGO_W,
  stegoRows,
  type Columns,
  type Design,
  type Grid,
  type MonkeyPose,
  type StageSize,
  type StegoPose,
} from './model'
import { actorsAt, pathOf, type Actor } from './pose'

const px = (n: number) => `${String(Math.round(n * 10) / 10)}px`

/** Pixel art from a grid: one path per code, `s` screen pixels a pixel. */
export function PixelArt({
  rows,
  codes,
  s,
  kind,
}: {
  rows: Grid
  codes: readonly string[]
  s: number
  kind: string
}) {
  const paths = useMemo(
    () => codes.map((code) => [code, spritePath(rows, code)] as const).filter(([, d]) => d),
    [rows, codes],
  )
  const w = Math.max(0, ...rows.map((row) => row.length))
  return (
    <svg
      className="hm-sprite"
      width={w * s}
      height={rows.length * s}
      viewBox={`0 0 ${String(w)} ${String(rows.length)}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {paths.map(([code, d]) => (
        <path key={code} d={d} className={`px-${kind}-${code}`} />
      ))}
    </svg>
  )
}

const STEGO_CODES = ['o', 'b', 'l', 'f', 'q', 'p', 'e', 'm'] as const
const MONKEY_CODES = ['o', 'f', 'l', 'e'] as const
const BANANA_CODES = ['o', 'y', 'd', 'k'] as const

/** Heap sort's pyramid rows inside the heap: each row's columns (as Stage.tsx). */
function heapRows(end: number) {
  const rows = []
  for (let row = 0; 2 ** row - 1 < end; row++) {
    rows.push({ row, from: 2 ** row - 1, to: Math.min(2 ** (row + 1) - 1, end) })
  }
  return rows
}

/** The band over the field, in pixels: row tags, and the arcs from the parent to its children. */
function Band({ frame, cols, size }: { frame: Frame; cols: Columns; size: StageSize }) {
  const band = size.band
  const end = heapEnd(frame)
  const parent = frame.heap?.parent ?? null
  const comparing = frame.highlights.comparing ?? []
  const swapping = frame.highlights.swapping ?? []
  const looking = parent !== null && comparing.includes(parent)
  const trades = (child: number) =>
    parent !== null && swapping.includes(parent) && swapping.includes(child)
  const arcsTop = band.kind === 'two' ? band.tags + 2 : 0
  return (
    <div className="hm-band" style={{ height: px(band.height) }} aria-hidden="true">
      {heapRows(end).map(({ row, from, to }) => {
        const left = cols.left(from)
        const width = cols.left(to - 1) + cols.col - left
        const word = band.kind === 'two' && width >= 2.75 * band.font
        return (
          <span
            key={row}
            className={`hm-band-row is-${band.kind}`}
            style={{
              left: px(left),
              width: px(width),
              height: px(band.tags),
              fontSize: px(band.font),
            }}
          >
            {word ? (row === 0 ? 'top' : `row ${String(row + 1)}`) : row + 1}
          </span>
        )
      })}
      {parent !== null &&
        frame.heap?.children.map((child) => {
          const left = cols.center(parent) - 1.5
          const right = cols.center(child) + 1.5
          const isLeft = child === 2 * parent + 1
          const height = isLeft ? band.leftArc : band.arcs
          return (
            <span
              key={child}
              className={[
                'hm-arc',
                looking && 'is-looking',
                trades(child) && 'is-trading',
                band.kind === 'one' && 'is-short',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                {
                  left: px(left),
                  width: px(right - left),
                  top: px(arcsTop + band.arcs - height),
                  height: px(height),
                  '--foot': px(band.foot),
                  borderRadius: `${px(band.radius)} ${px(band.radius)} 0 0`,
                } as CSSProperties
              }
            />
          )
        })}
    </div>
  )
}

/** One character with its number: a stegosaurus on its stone, or a monkey on its crate. */
function Character({
  design,
  actor,
  s,
  u,
  font,
  plate,
  width,
}: {
  design: Design
  actor: Actor
  s: number
  u: number
  font: number
  plate: number
  width: number
}) {
  const stack = useMemo(
    () => (design === 'monkey' ? bananaStack(actor.value, u) : null),
    [design, actor.value, u],
  )
  const sprite = useMemo(
    () =>
      design === 'stego'
        ? stegoRows(actor.value, actor.pose as StegoPose)
        : monkeyRows(actor.pose as MonkeyPose),
    [design, actor.value, actor.pose],
  )
  return (
    <div
      className={[
        'hm-actor',
        actor.ring && `is-${actor.ring}`,
        actor.front && 'is-front',
        actor.finished && 'is-finished',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        left: px(actor.x - width / 2),
        width: px(width),
        bottom: px(actor.lift),
      }}
    >
      {stack && <PixelArt rows={stack.grid} codes={BANANA_CODES} s={1} kind="banana" />}
      {design === 'stego' ? (
        <PixelArt rows={sprite} codes={STEGO_CODES} s={s} kind="stego" />
      ) : (
        // The stack rests on the monkey's head and hands.
        <span className="hm-monkey" style={{ marginTop: px(-s) }}>
          <PixelArt rows={sprite} codes={MONKEY_CODES} s={s} kind="monkey" />
        </span>
      )}
      <span
        className={`hm-plate is-${design}`}
        style={{ height: px(plate), fontSize: px(font), lineHeight: px(plate - 2) }}
      >
        {actor.value}
      </span>
    </div>
  )
}

export interface SceneProps {
  readonly design: Design
  readonly frames: readonly Frame[]
  readonly ids: readonly (readonly number[])[]
  readonly index: number
  readonly t: number
  readonly size: StageSize
  /** Draw the mover's path (stills of a move). */
  readonly path?: boolean
  /** The monkeys in the tree over the band (where the site shows the tree on the stage). */
  readonly tree?: boolean
  readonly label: string
}

export function MockScene({ design, frames, ids, index, t, size, path, tree, label }: SceneProps) {
  const frame = frames[index]
  const count = frame?.array.length ?? 0
  const cols = useMemo(() => columnsOf(size, count), [size, count])
  const plan = useMemo(() => planOf(design, size), [design, size])
  if (!frame) return null
  const actors = actorsAt(design, frames, ids, index, t, plan, cols, size.height)
  const end = heapEnd(frame)
  const pitch = (size.width + size.gap) / 12
  const width =
    design === 'stego'
      ? Math.min(pitch - 2, STEGO_W * plan.s)
      : Math.min(pitch - 2, Math.max(MONKEY_W * plan.s, plan.font * 1.7))
  const points = path ? pathOf(design, frames, ids, index, plan, cols, size.height) : []
  const mover = actors.find((a) => a.front)
  const topOf = (a: Actor) =>
    size.height -
    a.lift -
    (design === 'stego' ? 0 : plan.plate + MONKEY_H * plan.s + a.value * plan.u + 2)
  return (
    <figure className="hm-stage" style={{ width: px(size.width) }} aria-label={label}>
      {tree && size.tree && (
        <MonkeyTree frames={frames} ids={ids} index={index} t={t} size={size} />
      )}
      <Band frame={frame} cols={cols} size={size} />
      <div className="hm-field" style={{ height: px(size.height) }}>
        {end > 0 && (
          <span
            className="hm-zone is-heap"
            style={{
              left: 0,
              width: px(end >= count ? size.width : cols.left(end) - cols.gap / 2),
            }}
          />
        )}
        {end < count && (
          <>
            <span
              className="hm-zone is-done"
              style={{ left: px(cols.left(end) - cols.gap / 2), right: 0 }}
            />
            {end > 0 && (
              <span
                className="hm-divider"
                style={{ left: px(cols.left(end) - cols.gap / 2 - 1.5) }}
              />
            )}
          </>
        )}
        {frame.array.map((_, k) =>
          k >= end ? (
            <span
              key={k}
              className="hm-in-place"
              style={{ left: px(cols.left(k)), width: px(cols.col) }}
            />
          ) : null,
        )}
        {(points.length > 1 || mover?.vine) && (
          <svg className="hm-overlay" width={size.width} height={size.height} aria-hidden="true">
            {points.length > 1 && (
              <polyline
                className="hm-path"
                points={points
                  .map((p) => `${String(p.x)},${String(size.height - p.lift - 4)}`)
                  .join(' ')}
              />
            )}
            {actors
              .filter((a) => a.vine)
              .map((a) => (
                <line
                  key={a.id}
                  className="hm-vine"
                  x1={a.vine?.x}
                  y1={a.vine?.y}
                  x2={a.x + 4 * plan.s}
                  y2={topOf(a)}
                />
              ))}
          </svg>
        )}
        {[...actors]
          .sort((a, b) => Number(a.front) - Number(b.front))
          .map((actor) => (
            <Character
              key={actor.id}
              design={design}
              actor={actor}
              s={plan.s}
              u={plan.u}
              font={plan.font}
              plate={plan.plate}
              width={width}
            />
          ))}
      </div>
      {moveInto(frames, index).kind === 'none' || t >= 1 ? null : (
        <span className="visually-hidden">moving</span>
      )}
    </figure>
  )
}

/**
 * The monkeys in heap sort's tree over the stage, at the site's tree size: brown branches from
 * each parent to its children, a monkey sitting at each fork with its bananas (the plain stack:
 * a row of the tree is too short for drawn bananas). Finished values leave the tree, as on the
 * site. A climb swings the child up along its branch; the top leaving swings down out of the tree.
 */
function MonkeyTree({
  frames,
  ids,
  index,
  t,
  size,
}: {
  frames: readonly Frame[]
  ids: readonly (readonly number[])[]
  index: number
  t: number
  size: StageSize
}) {
  const frame = frames[index]
  const box = size.tree
  if (!frame || !box) return null
  const count = frame.array.length
  const end = heapEnd(frame)
  const rowPitch = (box.height * STAGE_PITCH) / stageHeight(count)
  const u = Math.max(1, Math.min(6, Math.floor((rowPitch - MONKEY_H - 4) / 12)))
  const at = (k: number) => {
    const p = stageNodeAt(k, count)
    return { x: p.x * box.width, y: p.y * box.height }
  }
  const move = moveInto(frames, index)
  const now = ids[index] ?? []
  const before = ids[index - 1] ?? now
  const parent = frame.heap?.parent ?? null
  const comparing = frame.highlights.comparing ?? []
  const swapping = frame.highlights.swapping ?? []
  const looking = parent !== null && comparing.includes(parent)
  const children = parent === null ? [] : (frame.heap?.children ?? [])
  const edges = Array.from({ length: end }, (_, k) => k).filter((k) => k > 0)
  const ease = t * t * (3 - 2 * t)
  const place = (k: number) => {
    const id = now[k] ?? k
    const from = before.indexOf(id)
    const target = at(k)
    if (move.kind === 'none' || from === k || t >= 1) return { ...target, fade: 1 }
    const start = from < end || move.kind === 'climb' ? at(from) : at(from)
    if (move.kind === 'extract' && k === move.end) {
      // The top swings down out of the tree, to the end of the row below.
      const exit = { x: box.width - 12, y: box.height + 10 }
      return {
        x: start.x + (exit.x - start.x) * ease,
        y: start.y + (exit.y - start.y) * t * t - Math.sin(Math.PI * t) * 10,
        fade: 1 - t,
      }
    }
    const lift = move.kind === 'climb' && k === move.parent ? Math.sin(Math.PI * t) * 10 : 0
    return {
      x: start.x + (target.x - start.x) * ease,
      y: start.y + (target.y - start.y) * ease - lift,
      fade: 1,
    }
  }
  const shown = frame.array
    .map((value, k) => ({ value, k, id: now[k] ?? k }))
    .filter(({ k }) => k < end || (move.kind === 'extract' && k === move.end && t < 1))
  return (
    <div
      className="hm-tree"
      style={{ width: px(box.width), height: px(box.height) }}
      aria-hidden="true"
    >
      <svg width={box.width} height={box.height} className="hm-overlay">
        {edges.map((child) => {
          const from = at(Math.floor((child - 1) / 2))
          const to = at(child)
          const mark =
            parent !== null && children.includes(child)
              ? swapping.includes(parent) && swapping.includes(child)
                ? 'is-trading'
                : looking
                  ? 'is-looking'
                  : ''
              : ''
          const d = `M${String(from.x)} ${String(from.y)} Q${String((from.x + to.x) / 2)} ${String(from.y + 4)} ${String(to.x)} ${String(to.y)}`
          return (
            <g key={child} className={`hm-branch ${mark}`}>
              <path className="hm-branch-edge" d={d} />
              <path className="hm-branch-wood" d={d} />
            </g>
          )
        })}
      </svg>
      {shown.map(({ value, k, id }) => {
        const p = place(k)
        const stack = bananaStack(value, u)
        const role = swapping.includes(k) ? 'trading' : comparing.includes(k) ? 'looking' : ''
        const height = stack.grid.length + MONKEY_H
        return (
          <div
            key={id}
            className={`hm-tree-monkey${role ? ` is-${role}` : ''}`}
            style={{
              left: px(p.x - MONKEY_W / 2),
              top: px(p.y - height / 2 - 2),
              opacity: p.fade,
            }}
          >
            <PixelArt rows={stack.grid} codes={BANANA_CODES} s={1} kind="banana" />
            <span className="hm-monkey" style={{ marginTop: '-1px' }}>
              <PixelArt rows={monkeyRows('sit')} codes={MONKEY_CODES} s={1} kind="monkey" />
            </span>
            <span className="hm-tree-digit">{value}</span>
          </div>
        )
      })}
    </div>
  )
}
