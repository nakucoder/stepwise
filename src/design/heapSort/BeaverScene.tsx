/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): one stage of B2's scenes at a real stage
 * size: the dam over the band where the site shows its tree (desktop, phone upright), the pyramid
 * band as the site draws it there (row tags and arcs, in pixels), then the field: the log stacks
 * on their number plates at the curb, the beaver in the lane under them, the pyramid's part and
 * the finished end (the woodpile) with a fence between them, and the role marks from the frame's
 * highlights only (a ring, never on the beaver or the logs themselves).
 */
import { useMemo, type CSSProperties } from 'react'
import { spritePath } from '../../characters/pixel'
import { heapEnd } from '../../components/heapTree'
import type { Frame } from '../../engine/types'
import { laneBeaverRows, type BeaverPose } from './beaver'
import { CODES } from './codes'
import { columnsOf, type Columns, type StageSize } from './model'
import { Raster, type Grid } from './raster'
import { beaverBox, damAt, damLayout, planOf, sceneAt, type DamLayout } from './scene'
import { logEndRows, stackRows } from './studies'

const px = (n: number) => `${String(Math.round(n * 10) / 10)}px`

/** Pixel art from a grid: one path per code, `s` screen pixels a pixel. */
export function PixelArt({
  rows,
  codes,
  s,
  kind,
  className = 'hm-sprite',
  style,
}: {
  rows: Grid
  codes: readonly string[]
  s: number
  kind: string
  className?: string
  style?: CSSProperties
}) {
  const paths = useMemo(
    () => codes.map((code) => [code, spritePath(rows, code)] as const).filter(([, d]) => d),
    [rows, codes],
  )
  const w = Math.max(0, ...rows.map((row) => row.length))
  return (
    <svg
      className={className}
      style={style}
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
      {heapRows(band.kind === 'arcs' ? 0 : end).map(({ row, from, to }) => {
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
          const height = child === 2 * parent + 1 ? band.leftArc : band.arcs
          return (
            <span
              key={child}
              className={['hm-arc', looking && 'is-looking', trades(child) && 'is-trading']
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

/** The dam's mound of mud and its sticks, for the heap's current size (positions < end). */
function damGround(layout: DamLayout, end: number): Grid {
  const r = new Raster(Math.ceil(layout.w), Math.ceil(layout.h))
  if (end < 1) return r.grid()
  // The mound: from the top log out to the leftmost and rightmost logs, down to the ground.
  const nodes = Array.from({ length: end }, (_, k) => layout.at(k))
  const top = layout.at(0)
  const half = layout.d / 2
  const leftmost = nodes.reduce((a, b) => (b.x < a.x ? b : a), top)
  const rightmost = nodes.reduce((a, b) => (b.x > a.x ? b : a), top)
  const bottom = Math.min(layout.h - 2, Math.max(...nodes.map((node) => node.y)) + half + 2)
  r.polygon(
    [
      [top.x - half, top.y - 1],
      [top.x + half, top.y - 1],
      [rightmost.x + half, rightmost.y],
      [rightmost.x + half, bottom],
      [leftmost.x - half, bottom],
      [leftmost.x - half, leftmost.y],
    ],
    'M',
  )
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++)
      if (r.get(x, y) === 'M' && (x * 7 + y * 3) % 11 === 0) r.set(x, y, 'm')
  for (let k = 1; k < end; k++) {
    const a = layout.at(Math.floor((k - 1) / 2))
    const b = layout.at(k)
    r.path(
      [
        [a.x, a.y],
        [b.x, b.y],
      ],
      2.4,
      'S',
    )
  }
  r.outline('o')
  return r.grid()
}

/** The dam over the band: log ends on a mound of mud and sticks, the numbers on the wood. */
function Dam({
  frames,
  ids,
  index,
  t,
  box,
  beside = false,
}: {
  frames: readonly Frame[]
  ids: readonly (readonly number[])[]
  index: number
  t: number
  box: { width: number; height: number }
  beside?: boolean
}) {
  const frame = frames[index]
  const count = frame?.array.length ?? 0
  const layout = useMemo(() => damLayout(box, count, beside), [box, count, beside])
  const end = frame ? heapEnd(frame) : 0
  const ground = useMemo(() => damGround(layout, end), [layout, end])
  const log = useMemo(() => logEndRows(layout.d), [layout.d])
  const parent = frame?.heap?.parent ?? null
  const comparing = frame?.highlights.comparing ?? []
  const swapping = frame?.highlights.swapping ?? []
  const looking = parent !== null && comparing.includes(parent)
  const nodes = damAt(frames, ids, index, t, layout)
  return (
    <div
      className="hm-dam"
      style={{ width: px(box.width), height: px(box.height) }}
      aria-hidden="true"
    >
      {/* The family's sticks, marked as the site's tree marks its lines. */}
      {t >= 1 && parent !== null && (
        <svg className="hm-overlay" width={box.width} height={box.height}>
          {(frame?.heap?.children ?? []).map((child) => {
            const a = layout.at(parent)
            const b = layout.at(child)
            const mark =
              swapping.includes(parent) && swapping.includes(child)
                ? 'is-trading'
                : looking
                  ? 'is-looking'
                  : ''
            return mark ? (
              <line
                key={child}
                className={`hm-dam-link ${mark}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              />
            ) : null
          })}
        </svg>
      )}
      <PixelArt
        rows={ground}
        codes={CODES.dam}
        s={1}
        kind="dam"
        className="hm-sprite hm-dam-ground"
      />
      {nodes.map((node) => (
        <span
          key={node.id}
          className={`hm-dam-node${node.ring ? ` is-${node.ring}` : ''}`}
          style={{
            left: px(node.x - (layout.d + 2) / 2),
            top: px(node.y - (layout.d + 2) / 2),
            opacity: node.fade,
          }}
        >
          <PixelArt rows={log} codes={CODES.dam} s={1} kind="dam" />
          <span className="hm-dam-number" style={{ fontSize: px(layout.d * 0.42) }}>
            {node.value}
          </span>
        </span>
      ))}
    </div>
  )
}

export interface BeaverSceneProps {
  readonly frames: readonly Frame[]
  readonly ids: readonly (readonly number[])[]
  readonly index: number
  readonly t: number
  readonly size: StageSize
  readonly label: string
}

export function BeaverScene({ frames, ids, index, t, size, label }: BeaverSceneProps) {
  const frame = frames[index]
  const count = frame?.array.length ?? 0
  const cols = useMemo(() => columnsOf(size, count), [size, count])
  const plan = useMemo(() => planOf(size, count), [size, count])
  const box = beaverBox(plan)
  if (!frame) return null
  const { stacks, beaver } = sceneAt(frames, ids, index, t, plan, cols)
  const end = heapEnd(frame)
  const ground = size.height - plan.lane
  const fenceX = cols.left(end) - cols.gap / 2
  const main = (
    <>
      <Band frame={frame} cols={cols} size={size} />
      <div className="hm-field" style={{ height: px(size.height) }}>
        {/* The pyramid's part and the woodpile (the finished end), the site's two tints. */}
        {end > 0 && (
          <span
            className="hm-zone is-heap"
            style={{ left: 0, width: px(end >= count ? size.width : fenceX) }}
          />
        )}
        {end < count && <span className="hm-zone is-done" style={{ left: px(fenceX), right: 0 }} />}
        {end > 0 && end < count && (
          <span className="hm-divider" style={{ left: px(fenceX - 1.5) }} />
        )}
        {/* The lane, the beaver's, along the bottom. */}
        <span className="hm-lane" style={{ top: px(ground), height: px(plan.lane) }} />
        {/* "In its final spot": a bar under the plate, as a mark. */}
        {frame.array.map((_, k) =>
          k >= end ? (
            <span
              key={k}
              className="hm-in-place"
              style={{
                left: px(cols.center(k) - plan.width / 2),
                width: px(plan.width),
                top: px(ground),
              }}
            />
          ) : null,
        )}
        {[...stacks]
          .sort((a, b) => Number(a.front) - Number(b.front))
          .map((stack) => (
            <LogStack
              key={stack.id}
              value={stack.value}
              x={stack.x}
              bottom={plan.lane + stack.lift}
              log={plan.log}
              width={plan.width}
              plate={plan.plate}
              font={plan.font}
              ring={stack.ring}
              front={stack.front}
            />
          ))}
        <span
          className="hm-beaver"
          style={{
            left: px(beaver.x - box.w / 2),
            top: px(size.height - box.h - 1 - beaver.bob),
            width: px(box.w),
            height: px(box.h),
            transform: beaver.left ? 'scaleX(-1)' : undefined,
          }}
        >
          <BeaverSprite pose={beaver.pose} s={plan.s} />
        </span>
        {beaver.bang && (
          <span
            className="hm-bang"
            style={{
              left: px(beaver.x + 4 * plan.s),
              top: px(size.height - box.h - 1 - 4 * plan.s),
              fontSize: px(Math.max(9, 7 * plan.s)),
            }}
          >
            !
          </span>
        )}
      </div>
    </>
  )
  if (size.beside) {
    // The dam beside the band and field, standing on the same lane as the stacks.
    const height = size.band.height + size.height
    return (
      <figure
        className="hm-stage is-beside"
        style={{ width: px(size.beside + DAM_GAP + size.width) }}
        aria-label={label}
      >
        <div className="hm-dam-col" style={{ width: px(size.beside), height: px(height) }}>
          <Dam
            frames={frames}
            ids={ids}
            index={index}
            t={t}
            box={{ width: size.beside, height: height - plan.lane }}
            beside
          />
          <span
            className="hm-lane"
            style={{ top: px(height - plan.lane), height: px(plan.lane) }}
          />
        </div>
        <div style={{ width: px(size.width) }}>{main}</div>
      </figure>
    )
  }
  return (
    <figure className="hm-stage" style={{ width: px(size.width) }} aria-label={label}>
      {size.tree && <Dam frames={frames} ids={ids} index={index} t={t} box={size.tree} />}
      {main}
    </figure>
  )
}

/** The space between the dam and the stacks when the dam stands beside them. */
const DAM_GAP = 12

function BeaverSprite({ pose, s }: { pose: BeaverPose; s: number }) {
  const rows = useMemo(() => laneBeaverRows(pose), [pose])
  return <PixelArt rows={rows} codes={CODES.b2} s={s} kind="b2" />
}

/** One stack of logs on its number plate, its ring a mark round both. */
function LogStack({
  value,
  x,
  bottom,
  log,
  width,
  plate,
  font,
  ring,
  front,
}: {
  value: number
  x: number
  bottom: number
  log: number
  width: number
  plate: number
  font: number
  ring?: 'looking' | 'trading'
  front: boolean
}) {
  const rows = useMemo(() => stackRows('log', value, log, width), [value, log, width])
  return (
    <span
      className={['hm-stack', ring && `is-${ring}`, front && 'is-front'].filter(Boolean).join(' ')}
      style={{ left: px(x - width / 2), bottom: px(bottom), width: px(width) }}
    >
      <PixelArt rows={rows} codes={CODES.log} s={1} kind="log" />
      <span
        className="hm-plate"
        style={{ height: px(plate), fontSize: px(font), lineHeight: px(plate - 2) }}
      >
        {value}
      </span>
    </span>
  )
}
