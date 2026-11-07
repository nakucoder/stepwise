/**
 * Heap sort's builder beaver (design/mockups/builder-beaver/README.md), drawn over the bars' field
 * in the field's own pixels. Each value is a stack of side-on logs on its number plate, one log per
 * count; a builder beaver works in the lane under the stacks: it looks at a family, carries the
 * child's stack up over its head when it climbs, shrugs when it stops, and hauls the top's stack
 * to the woodpile at the end (the special move). The tree view is its dam, a pyramid of log ends,
 * drawn into the stage's tree slot: over the band on an upright phone, beside the stacks on a
 * desktop (src/components/Stage.tsx).
 *
 * The beaver, the logs and the dam are fixed colours (tokens.css); role colours appear only as
 * marks: a yellow ring round a stack or log end compared, a pink one for a climb or the top
 * leaving, the family's sticks marked in those colours, the green bar under a stack in place.
 * Only one step forward plays a move; anything else shows the frame's pose, and so does every
 * step with reduced motion. A new size rebuilds a move in progress from where it had got to.
 * Every motion is a Web Animation.
 */
import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import type { SceneProps } from '../registry'
import { spritePath } from '../pixel'
import { useStableField } from '../useStableField'
import {
  beaverLayout,
  damLayout,
  damRows,
  type BeaverLayout,
  type DamBeside,
  type DamLayout,
} from './geometry'
import {
  BANG,
  BEAVER_CODES,
  BEAVER_SPRITES,
  beaverRows,
  LOG_CODES,
  logEndRows,
  stackRows,
  type BeaverSprite,
} from './sprites'
import {
  beaverMove,
  damNodes,
  FINALE_HOP_MS,
  finaleHopAt,
  MOOD_SPRITE,
  moveMs,
  posesOf,
  type Beat,
  type BeaverMove,
  type BeaverPose,
  type DamNode,
} from './steps'
import './BeaverScene.css'

const px = (n: number) => `${String(Math.round(n))}px`
const at = (x: number, y = 0) => `translate(${px(x)}, ${px(y)})`

/** Pixel art from a grid: one path per code, `s` screen pixels a pixel. */
function PixelArt(props: {
  readonly rows: readonly string[]
  readonly codes: readonly string[]
  readonly s: number
  readonly className: string
  readonly style?: CSSProperties
  readonly part?: string
}) {
  const { rows, codes, s, className, style, part } = props
  const paths = useMemo(
    () => codes.map((code) => [code, spritePath(rows, code)] as const).filter(([, d]) => d),
    [rows, codes],
  )
  const w = Math.max(0, ...rows.map((row) => row.length))
  return (
    <svg
      className={className}
      style={style}
      data-part={part}
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

/** Each sprite and log drawing, kept: the same ones are drawn in many frames. */
const spriteCache = new Map<BeaverSprite, readonly string[]>()
function spriteRows(sprite: BeaverSprite) {
  let rows = spriteCache.get(sprite)
  if (!rows) {
    rows = beaverRows(sprite)
    spriteCache.set(sprite, rows)
  }
  return rows
}
const logCache = new Map<string, readonly string[]>()
function cached(key: string, draw: () => readonly string[]) {
  let rows = logCache.get(key)
  if (!rows) {
    rows = draw()
    logCache.set(key, rows)
  }
  return rows
}

/** Where a stack's art starts for a column. */
const stackX = (geo: BeaverLayout, col: number) => Math.round(geo.cx(col) - geo.stackW / 2)

// ---------- The stacks ----------

function Stack(props: {
  readonly id: number
  readonly value: number
  readonly col: number
  readonly pose: BeaverPose
  readonly geo: BeaverLayout
}) {
  const { id, value, col, pose, geo } = props
  const { stackW, logPx, laneTop, plate, font } = geo
  const top = geo.base - geo.heightOf(value)
  const ring = pose.trading.includes(col)
    ? 'is-trading'
    : pose.looking.includes(col)
      ? 'is-looking'
      : false
  const name = String(id)
  const count = Math.max(0, Math.min(12, Math.round(value)))
  return (
    <div
      className={['beaver-stack', ring, pose.sorted.includes(col) && 'is-sorted']
        .filter(Boolean)
        .join(' ')}
      data-part={`stack-${name}`}
      data-value={value}
      data-col={col}
      style={{
        top: px(top),
        width: px(stackW),
        height: px(laneTop - top),
        transform: at(stackX(geo, col)),
      }}
    >
      <div className="beaver-hop" data-part={`hop-${name}`}>
        {count > 0 && (
          <PixelArt
            rows={cached(`${String(count)}|${String(logPx)}|${String(stackW)}`, () =>
              stackRows(count, logPx, stackW),
            )}
            codes={LOG_CODES}
            s={1}
            className="beaver-logs"
          />
        )}
        <span className="beaver-plate" style={{ height: px(plate), fontSize: px(font) }}>
          {value}
        </span>
        {ring && <span className="beaver-ring" data-part={`ring-${name}`} />}
      </div>
      <span className="beaver-green" data-part={`green-${String(col)}`} />
    </div>
  )
}

// ---------- The beaver ----------

/** The beaver at rest in the pose's mood; while a Do it question waits, it sits up and turns to
 * the learner (waiting). */
function Beaver(props: {
  readonly pose: BeaverPose
  readonly geo: BeaverLayout
  readonly asking: boolean
}) {
  const { pose, geo, asking } = props
  const { s } = geo
  const rest = asking ? 'face' : MOOD_SPRITE[pose.mood]
  return (
    <div
      className="beaver"
      data-part="beaver"
      data-mood={asking ? 'waiting' : pose.mood}
      data-action={pose.action}
      data-left={pose.left}
      style={{
        transform: at(geo.beaverX(pose.beaver, pose.left), geo.beaverY),
        width: px(geo.beaverW),
        height: px(geo.beaverH),
      }}
    >
      <div
        className="beaver-face"
        data-part="face"
        style={pose.left ? { transform: 'scaleX(-1)' } : undefined}
      >
        <div className="beaver-bob" data-part="bob">
          {BEAVER_SPRITES.map((sprite) => (
            <PixelArt
              key={sprite}
              rows={spriteRows(sprite)}
              codes={BEAVER_CODES}
              s={s}
              className="beaver-art"
              part={`sprite-${sprite}`}
              style={sprite === rest ? undefined : { opacity: 0 }}
            />
          ))}
          <PixelArt
            rows={BANG}
            codes={['o', 'x']}
            s={s}
            className="beaver-bang"
            part="bang"
            style={{ left: px(22 * s), top: px(-8 * s), opacity: 0 }}
          />
        </div>
      </div>
    </div>
  )
}

// ---------- The dam ----------

/** The dam's mound and sticks for the pyramid's places 0..end, as SVG in the box's pixels. */
function DamGround({ layout, end }: { readonly layout: DamLayout; readonly end: number }) {
  const fleck = useId()
  if (end < 1) return null
  const nodes = Array.from({ length: end }, (_, k) => layout.at(k))
  const top = layout.at(0)
  const half = layout.d / 2
  // The ends of its lowest row, as if full: a row part-filled leaves gaps in the mound, not a cliff.
  const rows = damRows(end)
  const leftmost = layout.at(2 ** (rows - 1) - 1)
  const rightmost = layout.at(2 ** rows - 2)
  // Down to the ground under the lowest logs (beside the stacks, the lane's top).
  const bottom = Math.min(layout.height, Math.max(...nodes.map((node) => node.y)) + half + 6)
  // The mound: from the top log out to its lowest row's ends, down to the ground.
  const mound = [
    [top.x - half, top.y - 1],
    [top.x + half, top.y - 1],
    [rightmost.x + half, rightmost.y],
    [rightmost.x + half, bottom],
    [leftmost.x - half, bottom],
    [leftmost.x - half, leftmost.y],
  ]
    .map(([x = 0, y = 0]) => `${String(Math.round(x))},${String(Math.round(y))}`)
    .join(' ')
  const sticks = nodes.slice(1).map((b, i) => {
    const a = layout.at(Math.floor(i / 2))
    return { key: i + 1, a, b }
  })
  return (
    <svg
      className="beaver-dam-ground"
      width={layout.width}
      height={layout.height}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <defs>
        <pattern id={fleck} width="11" height="7" patternUnits="userSpaceOnUse">
          <rect className="beaver-mud" width="11" height="7" />
          <rect className="beaver-fleck" x="2" y="1" width="1" height="1" />
          <rect className="beaver-fleck" x="8" y="4" width="1" height="1" />
          <rect className="beaver-fleck" x="5" y="6" width="1" height="1" />
        </pattern>
      </defs>
      <polygon className="beaver-mound" points={mound} fill={`url(#${fleck})`} />
      {sticks.map(({ key, a, b }) => (
        <g key={key}>
          <line className="beaver-stick-edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          <line className="beaver-stick" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        </g>
      ))}
    </svg>
  )
}

/** The family's sticks, marked as the site's tree marks its lines. */
function DamMarks({ layout, pose }: { readonly layout: DamLayout; readonly pose: BeaverPose }) {
  const { parent, sticks } = pose
  if (parent === null || !sticks) return null
  const a = layout.at(parent)
  return (
    <svg
      className="beaver-dam-marks"
      data-part="dam-marks"
      width={layout.width}
      height={layout.height}
      aria-hidden="true"
    >
      {pose.children.map((child) => {
        // Pink only to the child that climbs; the family compared is all yellow.
        const mark = sticks === 'trading' ? (pose.trading.includes(child) ? sticks : null) : sticks
        if (!mark) return null
        const b = layout.at(child)
        return (
          <line
            key={child}
            className={`beaver-dam-link is-${mark}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
          />
        )
      })}
    </svg>
  )
}

function DamLog(props: {
  readonly node: DamNode
  readonly layout: DamLayout
  readonly part: string
  readonly hidden?: boolean
}) {
  const { node, layout, part, hidden = false } = props
  const { x, y } = layout.at(node.k)
  const size = layout.d + 2
  return (
    <span
      className={node.ring ? `beaver-dam-log is-${node.ring}` : 'beaver-dam-log'}
      data-part={part}
      data-value={node.value}
      data-k={node.k}
      style={{
        width: px(size),
        height: px(size),
        transform: at(x - size / 2, y - size / 2),
        ...(hidden && { opacity: 0 }),
      }}
    >
      <PixelArt
        rows={cached(`end|${String(layout.d)}`, () => logEndRows(layout.d))}
        codes={LOG_CODES}
        s={1}
        className="beaver-logs"
      />
      <span className="beaver-dam-number" style={{ fontSize: px(layout.font) }}>
        {node.value}
      </span>
      {node.ring && <span className="beaver-ring" data-part={`${part}-ring`} />}
    </span>
  )
}

/** The dam in its slot: a mound, sticks and log ends; beside the stacks it stands on the lane. */
function Dam(props: {
  readonly layout: DamLayout
  readonly pose: BeaverPose
  readonly values: readonly number[]
  readonly leaving: DamNode | null
  readonly lane: number
}) {
  const { layout, pose, values, leaving, lane } = props
  const nodes = damNodes(pose, values)
  return (
    <div
      className="beaver-dam"
      data-d={layout.d}
      style={{ width: px(layout.width), height: px(layout.height + lane) }}
    >
      <DamGround layout={layout} end={pose.end} />
      <DamMarks layout={layout} pose={pose} />
      {nodes.map((node) => (
        <DamLog key={node.id} node={node} layout={layout} part={`dam-${String(node.id)}`} />
      ))}
      {leaving && (
        // The top that left for the woodpile: shown only while it drops out of the dam.
        <DamLog
          key={`leaving-${String(leaving.id)}`}
          node={leaving}
          layout={layout}
          part={`dam-${String(leaving.id)}`}
          hidden
        />
      )}
      {lane > 0 && (
        <div className="beaver-lane" style={{ top: px(layout.height), height: px(lane) }} />
      )}
    </div>
  )
}

/** The stage's slot for the tree (Stage.tsx), its place and box, while it shows. */
interface Slot {
  readonly element: HTMLElement
  /** Over the band, beside the stacks (on their lane), or in a phone's sheet. */
  readonly place: 'over' | 'beside' | 'sheet'
  readonly width: number
  readonly height: number
  /** From the slot's top to the field's bottom (beside the stacks, the dam stands on its lane). */
  readonly toField: number
  /** How far down the slot the dam's rows start: under the column's name beside the stacks, under
   * a sheet's Close button. */
  readonly reserve: number
}

interface Slots {
  /** The slot that shows, if one does. */
  readonly shown: Slot | null
  /** Where a dam could stand beside the stacks (a desktop, a phone on its side): the stage's split. */
  readonly beside: DamBeside | null
  /** Whether they have been measured yet (until then nothing is decided). */
  readonly measured: boolean
}

const NO_SLOTS: Slots = { shown: null, beside: null, measured: false }

/**
 * Finds the tree slots (the stage's, or The tree's sheet's: Stage.tsx, TreeSlot.tsx) and measures
 * them, after every render and whenever the stage changes size (the slots come and go with the
 * screen and the sheets: HeapTree.css). Beside the stacks the dam stands on the field's lane, so its
 * height runs from the slot's top to the field's curb; whether it fits there comes from the
 * split's whole width and its height, which its own width never changes.
 */
function useTreeSlots(fieldRef: RefObject<HTMLElement | null>): Slots {
  const [slots, setSlots] = useState<Slots>(NO_SLOTS)
  const measure = useCallback(() => {
    const field = fieldRef.current
    if (!field) return
    const fieldBox = field.getBoundingClientRect()
    const root = field.closest('.workspace') ?? field.closest('.stage-view')
    const found = [...(root?.querySelectorAll<HTMLElement>('[data-tree-slot]') ?? [])].map(
      (element) => ({ element, box: element.getBoundingClientRect() }),
    )
    const shown = found.find(({ box }) => box.width > 0 && box.height > 0)
    const named = shown?.element.dataset.treeSlot
    const place = named === 'beside' || named === 'sheet' ? named : 'over'
    const close =
      place === 'sheet'
        ? shown?.element.closest('.sheet')?.querySelector('.sheet-close')?.getBoundingClientRect()
        : undefined
    const name =
      place === 'beside'
        ? shown?.element.querySelector('.heap-tree-name')?.getBoundingClientRect()
        : undefined
    const slot: Slot | null = shown
      ? {
          element: shown.element,
          place,
          width: shown.box.width,
          height: shown.box.height,
          toField: fieldBox.bottom - shown.box.top,
          // Beside the stacks the dam's top stands under the column's name. In a sheet, a small
          // Close in a top corner sits where a pyramid leaves room; a wide one doesn't.
          reserve: name
            ? Math.ceil(name.bottom - shown.box.top) + 8
            : close &&
                close.width > shown.box.width * 0.2 &&
                close.left < shown.box.right &&
                close.bottom > shown.box.top
              ? Math.ceil(close.bottom - shown.box.top) + 2
              : 0,
        }
      : null
    // Beside: on a desktop, and on a phone on its side (upright, the dam is over the band).
    const split = field.closest('.stage-split')
    const plot = field.closest('.stage-plot')
    const besideSlot = split?.querySelector('[data-tree-slot="beside"]')
    const upright =
      field.closest('.workspace-phone') !== null &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(orientation: portrait)').matches
    let beside: DamBeside | null = null
    if (split && plot && besideSlot && !upright) {
      const splitBox = split.getBoundingClientRect()
      // A sheet open beside the stage (a phone on its side) doesn't change a size.
      const sheet = field.closest('.phone-grid')?.querySelector('.sheet')?.getBoundingClientRect()
      const extra = sheet && sheet.left >= splitBox.right - 1 ? sheet.width : 0
      beside = {
        total: splitBox.width + extra,
        height: fieldBox.bottom - plot.getBoundingClientRect().top,
      }
    }
    setSlots((old) => {
      const same =
        old.measured &&
        old.shown?.reserve === slot?.reserve &&
        old.beside?.total === beside?.total &&
        old.beside?.height === beside?.height &&
        old.shown?.element === slot?.element &&
        old.shown?.place === slot?.place &&
        old.shown?.width === slot?.width &&
        old.shown?.height === slot?.height &&
        old.shown?.toField === slot?.toField
      return same ? old : { shown: slot, beside, measured: true }
    })
  }, [fieldRef])
  useLayoutEffect(measure)
  useLayoutEffect(() => {
    const view = fieldRef.current?.closest('.stage-view')
    if (!view || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(view)
    for (const child of view.querySelectorAll('[data-tree-slot], .stage-plot, .stage-split')) {
      observer.observe(child)
    }
    if (slots.shown) observer.observe(slots.shown.element)
    return () => {
      observer.disconnect()
    }
  }, [fieldRef, measure, slots.shown])
  return slots
}

// ---------- The scene ----------

export function BeaverScene({ frames, index, stepDelayMs, reducedMotion, asking }: SceneProps) {
  const fieldRef = useRef<HTMLDivElement>(null)
  // The field's box, and the height the logs' sizes come from: the shortest over the run, each
  // step at its tallest, so a size doesn't change between steps (../useStableField.ts).
  const box = useStableField(fieldRef, frames, index)

  const poses = posesOf(frames)
  const pose = poses[index]
  // The stacks' values, by stack: each stack is numbered by its column in the first frame.
  const values = useMemo(() => frames[0]?.array ?? [], [frames])
  // On an upright phone the logs size from the field's promised least height (its CSS floor,
  // WorkspacePhone.css), in Watch and in Do it, so the explanation, the question or the hint
  // squeezing the stage never changes them.
  const sizeHeight = box?.floor ? box.floor : box?.sizeHeight
  const { shown: slot, beside, measured } = useTreeSlots(fieldRef)
  const geo =
    box && box.width > 0 && box.height > 0
      ? beaverLayout(
          box,
          values.length,
          sizeHeight,
          box.sizeWidth,
          // Whether the dam fits beside comes from the run's shortest field (as the sizes do), so a
          // taller moment (Do it's finish) never moves it.
          beside
            ? {
                total: beside.total,
                height: beside.height - Math.max(0, box.height - (sizeHeight ?? box.height)),
              }
            : undefined,
        )
      : null
  // Where the dam is: beside the stacks where it fits there, over the band (upright), or in The
  // pyramid's sheet (the page shows its button and opens it: WorkspacePhone.css, WorkspacePage).
  const damAt: 'beside' | 'over' | 'sheet' | undefined =
    !measured || !geo
      ? undefined
      : beside
        ? geo.dam
          ? 'beside'
          : 'sheet'
        : slot?.place === 'over'
          ? 'over'
          : 'sheet'
  // The beside slot is as wide as its dam (its log ends the size of the logs).
  const damWidth = damAt === 'beside' ? geo?.dam?.width : undefined
  useLayoutEffect(() => {
    const element = fieldRef.current
      ?.closest('.stage-split')
      ?.querySelector<HTMLElement>('[data-tree-slot="beside"]')
    if (!element) return
    if (damWidth) element.style.width = `${String(damWidth)}px`
    else element.style.removeProperty('width')
  }, [damWidth])
  const damBox =
    slot &&
    (slot.place === 'beside'
      ? { width: slot.width, height: Math.max(0, slot.toField - (geo?.lane ?? 0)) }
      : { width: slot.width, height: slot.height })
  // In a sheet the dam stands on the sheet's foot, as beside the stacks (with no lane there).
  const dam =
    damBox && damBox.height > 0
      ? damLayout(
          damBox,
          values.length,
          slot.place === 'over' ? 'over' : 'beside',
          slot.place === 'beside' ? geo?.dam?.d : undefined,
          // Beside, its rows spread from the run's shortest field (as the sizes do), so a taller
          // moment never moves them.
          slot.place === 'beside' && box
            ? slot.reserve + Math.max(0, box.height - (sizeHeight ?? box.height))
            : slot.reserve,
        )
      : null
  const move = index > 0 ? beaverMove(frames, index, poses) : null

  // ---------- Motion: one step forward plays the move into this frame ----------
  const previousIndex = useRef(index)
  const playing = useRef<{ readonly index: number; readonly start: number } | null>(null)
  useLayoutEffect(() => {
    const from = previousIndex.current
    previousIndex.current = index
    if (index !== from) {
      playing.current = index === from + 1 ? { index, start: performance.now() } : null
    }
    const now = playing.current
    if (reducedMotion || !geo || now?.index !== index || !pose || !move) return
    const roots = [fieldRef.current, slot?.element]
    const context: MoveContext = {
      geo,
      dam,
      pose,
      move,
      duration: moveMs(move, stepDelayMs),
      el: (name) => {
        for (const root of roots) {
          const found = root?.querySelector<HTMLElement | SVGElement>(`[data-part="${name}"]`)
          if (found) return found
        }
        return undefined
      },
    }
    const animations = animate(context)
    const elapsed = performance.now() - now.start
    if (elapsed > 1) for (const animation of animations) animation.currentTime = elapsed
    return () => {
      for (const animation of animations) animation.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, frames, reducedMotion, box, slot])

  let content: ReactNode = null
  if (geo && pose) {
    const { width, height, laneTop, pitch, lane } = geo
    const count = values.length
    // The pyramid's part and the woodpile (the finished end), with a dashed fence between them.
    const fence = pose.end * pitch - (pitch - geo.colW) / 2
    // The stack carried this step is drawn over the others.
    const carried = move?.carry?.stack
    const ids = values.map((_, id) => id)
    if (carried !== undefined) ids.sort((a, b) => Number(a === carried) - Number(b === carried))
    content = (
      <div
        className={`beaver-scene${pose.final ? ' is-final' : ''}`}
        // One log's height and the beaver's scale: the look of every stack on this stage (checks
        // read them).
        data-log={geo.logPx}
        data-s={geo.s}
        style={{ width: px(width), height: px(height) }}
      >
        {pose.end > 0 && (
          <span
            className="beaver-zone is-heap"
            style={{ left: 0, width: px(pose.end >= count ? width : fence) }}
          />
        )}
        {pose.end < count && (
          <span className="beaver-zone is-done" style={{ left: px(fence), right: 0 }} />
        )}
        {pose.end > 0 && pose.end < count && (
          <span className="beaver-fence" style={{ left: px(fence - 1.5) }} />
        )}
        <div className="beaver-lane" style={{ top: px(laneTop), height: px(lane) }} />
        {ids.map((id) => (
          <Stack
            key={id}
            id={id}
            value={values[id] ?? 0}
            col={pose.order.indexOf(id)}
            pose={pose}
            geo={geo}
          />
        ))}
        <Beaver key={`${String(index)}-${pose.mood}`} pose={pose} geo={geo} asking={asking} />
      </div>
    )
  }

  // The top leaving the dam this step (it drops out toward the woodpile while the move plays).
  const leaving =
    move?.action === 'haul' && move.carry
      ? {
          id: move.carry.stack,
          value: values[move.carry.stack] ?? 0,
          k: move.carry.from,
          ring: null,
        }
      : null

  return (
    <div ref={fieldRef} className="stage-bars beaver-field" data-dam={damAt} aria-hidden="true">
      {content}
      {slot &&
        dam &&
        pose &&
        createPortal(
          <Dam
            key={index}
            layout={dam}
            pose={pose}
            values={values}
            leaving={leaving}
            lane={slot.place === 'beside' && geo ? geo.lane : 0}
          />,
          slot.element,
        )}
    </div>
  )
}

// ---------- The moves ----------

interface MoveContext {
  readonly geo: BeaverLayout
  readonly dam: DamLayout | null
  readonly pose: BeaverPose
  readonly move: BeaverMove
  /** The move's length at this speed. */
  readonly duration: number
  readonly el: (name: string) => HTMLElement | SVGElement | undefined
}

function run(element: Element | undefined, keys: Keyframe[], options: KeyframeAnimationOptions) {
  if (!element || typeof element.animate !== 'function' || keys.length === 0) return []
  // Offsets in order, between 0 and 1 (parts of a move meet end to end, give or take a rounding).
  let last = 0
  const ordered = keys.map((key) =>
    typeof key.offset === 'number'
      ? { ...key, offset: (last = Math.min(1, Math.max(last, key.offset))) }
      : key,
  )
  return [element.animate(ordered, options)]
}

/** Keyframes that hold each value over its part of the move and change at once between parts. */
function held(
  prop: string,
  parts: readonly { readonly from: number; readonly to: number; readonly value: string | number }[],
): Keyframe[] {
  return parts.flatMap(({ from, to, value }) => [
    { [prop]: value, offset: from },
    { [prop]: value, offset: to },
  ])
}

/** The sprite in each part of the move: walking alternates its two leg frames. */
function spriteParts(beats: readonly Beat[], geo: BeaverLayout) {
  return beats.flatMap((beat) => {
    if (beat.mood !== 'walking') {
      return [{ from: beat.from, to: beat.to, sprite: MOOD_SPRITE[beat.mood] }]
    }
    const distance = Math.abs(geo.cx(beat.at[1]) - geo.cx(beat.at[0]))
    const legs = Math.max(2, Math.round(distance / (3 * geo.s)))
    return Array.from({ length: legs }, (_, k) => ({
      from: beat.from + ((beat.to - beat.from) * k) / legs,
      to: k === legs - 1 ? beat.to : beat.from + ((beat.to - beat.from) * (k + 1)) / legs,
      sprite: k % 2 === 0 ? 'walk' : 'walk2',
    }))
  })
}

/** Bobs over [from, to]: up `height` px and back, `count` times. */
function bobKeys(from: number, to: number, count: number, height: number): Keyframe[] {
  return Array.from({ length: count }, (_, k) => {
    const a = from + ((to - from) * k) / count
    const b = k === count - 1 ? to : from + ((to - from) * (k + 1)) / count
    return [
      { transform: 'none', offset: a },
      { transform: at(0, -height), offset: (a + b) / 2 },
      { transform: 'none', offset: b },
    ]
  }).flat()
}

/** A whole move: the beaver's beats, the carried stack and the one that slides, the dam, the
 * rings and green bars appearing, the finale's wave. */
function animate(context: MoveContext): Animation[] {
  const { geo, move, duration, el } = context
  const timing = { duration, fill: 'none' } as const
  const beats = move.beats
  const y = geo.beaverY
  const animations: Animation[] = [
    // Where it is: each beat from its start column to its end column, its paws under them.
    ...run(
      el('beaver'),
      beats.flatMap((beat) => [
        {
          transform: at(geo.beaverX(beat.at[0], beat.left), y),
          offset: beat.from,
          easing: beat.mood === 'walking' || beat.at[0] !== beat.at[1] ? 'ease-in-out' : 'linear',
        },
        { transform: at(geo.beaverX(beat.at[1], beat.left), y), offset: beat.to },
      ]),
      timing,
    ),
    // Which way it faces.
    ...run(
      el('face'),
      held(
        'transform',
        beats.map((beat) => ({
          from: beat.from,
          to: beat.to,
          value: beat.left ? 'scaleX(-1)' : 'none',
        })),
      ),
      timing,
    ),
    // Its "!" when it finds a bigger one.
    ...run(
      el('bang'),
      held(
        'opacity',
        beats.map((beat) => ({ from: beat.from, to: beat.to, value: beat.bang ? 1 : 0 })),
      ),
      timing,
    ),
    // Its bobs (proud on the way to the woodpile, happy in the finale).
    ...run(
      el('bob'),
      beats.flatMap((beat) =>
        beat.bobs
          ? bobKeys(beat.from, beat.to, beat.bobs, (move.wave ? 2 : 1) * geo.s)
          : [
              { transform: 'none', offset: beat.from },
              { transform: 'none', offset: beat.to },
            ],
      ),
      timing,
    ),
  ]
  // Its sprites: each shows over its parts of the move (walking alternates its leg frames), and
  // the others, the step's resting one too, stay hidden meanwhile.
  const parts = spriteParts(beats, geo)
  for (const sprite of BEAVER_SPRITES) {
    animations.push(
      ...run(
        el(`sprite-${sprite}`),
        held(
          'opacity',
          parts.map((part) => ({ ...part, value: part.sprite === sprite ? 1 : 0 })),
        ),
        timing,
      ),
    )
  }
  if (move.carry) animations.push(...carry(context))
  // The green bar under each stack newly in place appears as it lands.
  for (const col of move.done) {
    animations.push(
      ...run(
        el(`green-${String(col)}`),
        [
          { opacity: 0, offset: 0 },
          { opacity: 0, offset: move.doneAt },
          { opacity: 1, offset: Math.min(1, move.doneAt + 0.05) },
          { opacity: 1, offset: 1 },
        ],
        timing,
      ),
    )
  }
  if (move.wave) animations.push(...wave(context))
  return animations
}

/**
 * The beaver carries a stack over its head to another column while the other slides along the
 * curb to the column it left; in the dam the two log ends slide along their stick (a climb), or
 * the top drops out toward the woodpile and the end's log slides up to the top (the haul). The
 * rings of the two appear as the stack is set down.
 */
function carry(context: MoveContext): Animation[] {
  const { geo, dam, move, duration, el, pose } = context
  const carried = move.carry
  if (!carried) return []
  const timing = { duration, fill: 'none' } as const
  const [up, lifted] = carried.lift
  const [landed, down] = carried.land
  const fromX = stackX(geo, carried.from)
  const toX = stackX(geo, carried.to)
  const high = -geo.lift
  const stack = String(carried.stack)
  const other = String(carried.other)
  const ringIn = (name: string) =>
    run(
      el(name),
      [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: down },
        { opacity: 1, offset: 1 },
      ],
      timing,
    )
  const animations = [
    ...run(
      el(`stack-${stack}`),
      [
        { transform: at(fromX), offset: 0 },
        { transform: at(fromX), offset: up },
        { transform: at(fromX, high), offset: lifted, easing: 'ease-in-out' },
        { transform: at(toX, high), offset: landed },
        { transform: at(toX), offset: down },
        { transform: at(toX), offset: 1 },
      ],
      timing,
    ),
    ...run(
      el(`stack-${other}`),
      [
        { transform: at(toX), offset: 0 },
        { transform: at(toX), offset: lifted, easing: 'ease-in-out' },
        { transform: at(fromX), offset: landed },
        { transform: at(fromX), offset: 1 },
      ],
      timing,
    ),
    ...(carried.bobs
      ? run(el(`hop-${stack}`), bobKeys(lifted, landed, carried.bobs, geo.s), timing)
      : []),
    ...ringIn(`ring-${stack}`),
    ...ringIn(`ring-${other}`),
  ]
  if (!dam) return animations
  const place = (k: number) => {
    const { x, y } = dam.at(k)
    const size = dam.d + 2
    return at(x - size / 2, y - size / 2)
  }
  const slide = (id: string, a: number, b: number) =>
    run(
      el(`dam-${id}`),
      [
        { transform: place(a), offset: 0 },
        { transform: place(a), offset: lifted, easing: 'ease-in-out' },
        { transform: place(b), offset: landed },
        { transform: place(b), offset: 1 },
      ],
      timing,
    )
  animations.push(...slide(other, carried.to, carried.from))
  if (move.action === 'haul') {
    // The top leaves the dam, down past its foot toward the woodpile's side, fading.
    const { x, y } = dam.at(0)
    const size = dam.d + 2
    const exit = at(dam.width - size, dam.height + dam.d)
    animations.push(
      ...run(
        el(`dam-${stack}`),
        [
          { transform: at(x - size / 2, y - size / 2), opacity: 1, offset: 0 },
          { transform: at(x - size / 2, y - size / 2), opacity: 1, offset: lifted },
          { transform: exit, opacity: 0, offset: landed },
          { transform: exit, opacity: 0, offset: 1 },
        ],
        timing,
      ),
    )
  } else {
    animations.push(...slide(stack, carried.from, carried.to))
  }
  // The family's marks and the two log ends' rings show once the stack is set down.
  if (pose.sticks) {
    animations.push(
      ...run(
        el('dam-marks'),
        [
          { opacity: 0, offset: 0 },
          { opacity: 0, offset: down },
          { opacity: 1, offset: 1 },
        ],
        timing,
      ),
    )
  }
  animations.push(...ringIn(`dam-${stack}-ring`), ...ringIn(`dam-${other}-ring`))
  return animations
}

/** The finale, in full: the stacks hop in a wave, left to right. */
function wave({ geo, pose, el }: MoveContext): Animation[] {
  const count = pose.order.length
  return pose.order.flatMap((id, k) =>
    run(
      el(`hop-${String(id)}`),
      [
        { transform: 'none' },
        { transform: at(0, -Math.min(geo.lift * 1.5, 4 * geo.s)), offset: 0.5 },
        { transform: 'none' },
      ],
      {
        duration: FINALE_HOP_MS,
        delay: finaleHopAt(k, count),
        easing: 'ease-in-out',
      },
    ),
  )
}
