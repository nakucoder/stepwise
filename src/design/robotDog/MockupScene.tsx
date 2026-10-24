/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): draws one frame of the delivery cart design
 * (layout.ts) and, on one step forward, plays its move: the cart rolls under the stack, lifts it
 * on its deck and rolls it to its new place, while the other stack slides along the curb to the
 * place it left. A value that swaps with itself is lifted and set down in place. Placing the
 * leader is the special move, "Delivered!": the top box opens on its pizza, the lid flips up and
 * a puff of steam rises. Reduced motion (or motion off): final poses only.
 *
 * Each value is a stack of takeout pizza boxes, drawn as pixel art at real size (studies.ts's
 * pizzaStack): red-and-white stripes, "PIZZA" on every box with room, a dark outline round every
 * box inside its own height, so the stack is exactly the value's height. The leader's boxes are
 * their own red, with a blue ribbon and bow (the leader role's colour, as a mark). The cart shows
 * its mood for each step (studies.ts's MOODS): its face, antenna and flag, timed to the step.
 */
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { spritePath } from '../../characters/pixel'
import { BASE_STEP_DELAY_MS } from '../../engine/player'
import type { Frame } from '../../engine/types'
import {
  actorXUnder,
  identities,
  sceneOf,
  type Action,
  type Box,
  type Piece,
  type Scene,
} from './layout'
import { BOW, CART_CODES, drawCart, type CartPose } from './sprites'
import {
  BANG,
  BOX_CODES,
  fittedFrames,
  MOODS,
  pizzaStack,
  type Mood,
  type MoodFrame,
  type StackLook,
} from './studies'

const px = (n: number) => `${String(Math.round(n))}px`

/** Pixel art from a grid: one path per code, `s` screen pixels a pixel. */
export function PixelArt({
  rows,
  codes,
  s,
  className,
  style,
}: {
  rows: readonly string[]
  codes: readonly string[]
  s: number
  className: string
  style?: CSSProperties
}) {
  const paths = useMemo(
    () => codes.map((code) => [code, spritePath(rows, code)] as const).filter(([, d]) => d),
    [rows, codes],
  )
  const w = Math.max(0, ...rows.map((row) => row.length))
  return (
    <svg
      className={`mk-sprite ${className}`}
      style={style}
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

const stacks = new Map<string, ReturnType<typeof pizzaStack>>()

/** A stack's pixel art, kept: the same stack is drawn in many frames. */
function stackArt(w: number, heights: readonly number[], depth: number, look: StackLook) {
  const key = `${String(w)}|${heights.join(',')}|${String(depth)}|${look.mode}|${String(look.leader)}|${String(look.open)}`
  let art = stacks.get(key)
  if (!art) {
    art = pizzaStack(w, heights, depth, look)
    stacks.set(key, art)
  }
  return art
}

/** A stack's boxes, bottom up: one per count, all alike; the top one carries the lid. */
function boxHeights(piece: Piece, scene: Scene): readonly number[] {
  return Array.from({ length: piece.boxes }, (_, k) =>
    k === piece.boxes - 1 ? scene.boxPx + scene.lid : scene.boxPx,
  )
}

const BOW_W = Math.max(...BOW.map((row) => row.length))

function Stack({ piece, scene }: { piece: Piece; scene: Scene }) {
  const { itemW, dollyH, dollyBottom, lid } = scene
  const open = piece.zone === 'placed' && scene.event === 'place'
  // The art starts at the lid, over the top box.
  const top = Math.round(piece.top) - lid
  const heights = boxHeights(piece, scene)
  const lean = Math.ceil(lid / 2)
  const art =
    heights.length > 0
      ? stackArt(itemW, heights, lid, {
          mode: 'every',
          leader: piece.leader,
          open: open && lid > 0,
        })
      : null
  const bowS = itemW >= 40 ? 2 : 1
  return (
    <div
      className={classes(`mk-value is-stack${scene.compact ? ' is-compact' : ''}`, piece, scene)}
      style={
        {
          // The art's first column is the outline, just left of the front.
          left: px(piece.cx - itemW / 2 - 1),
          top: px(top),
          width: px(itemW + lean + 2),
          height: px(dollyBottom - top),
          '--font': px(scene.font),
          '--dolly-h': px(dollyH),
          '--i': piece.col,
        } as CSSProperties
      }
      data-id={piece.id}
    >
      {art && (
        <span className="mk-boxes">
          <PixelArt rows={art.rows} codes={BOX_CODES} s={1} className="pbox" />
          {open && (
            <span
              className="mk-flap"
              style={{ left: px(lean + 1), width: px(itemW), height: px(Math.max(4, lid + 2)) }}
            />
          )}
          {piece.leader && !open && (
            <span
              className="mk-bow"
              style={{
                left: px(itemW - 1 - (BOW_W * bowS) / 2),
                top: px(Math.max(0, lid - 2)),
              }}
            >
              <PixelArt rows={BOW} codes={['b', 'w']} s={bowS} className="bow" />
            </span>
          )}
        </span>
      )}
      <span className="mk-dolly" style={{ width: px(itemW + 4) }}>
        <span className="mk-digit">{piece.value}</span>
      </span>
      {open && (
        <span className="mk-steam">
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  )
}

/** The cart's mood for a step. */
function moodOf(action: Action, event: string): Mood {
  if (event === 'pick') return 'look'
  const moods: Record<Action, Mood> = {
    idle: 'idle',
    look: 'look',
    carry: 'found',
    nudge: 'found',
    stay: 'stay',
    place: 'delivered',
    done: 'done',
    party: 'finale',
  }
  return moods[action]
}

/** The pose a still shows for each mood: its telling frame (the glance at the leader, ...). */
const STILL: Readonly<Record<Mood, number>> = {
  idle: 0,
  look: 1,
  found: 0,
  stay: 0,
  delivered: 0,
  done: 0,
  finale: 0,
}

const carts = new Map<string, readonly string[]>()

function cartRows(pose: CartPose): readonly string[] {
  const key = `${pose.face ?? ''}|${pose.antenna ?? ''}|${pose.flag ?? ''}|${String(pose.bump ?? 0)}|${String(pose.compact ?? false)}`
  let rows = carts.get(key)
  if (!rows) {
    rows = drawCart(pose)
    carts.set(key, rows)
  }
  return rows
}

function Cart({ frame, s, compact }: { frame: MoodFrame; s: number; compact: boolean }) {
  const pose = { face: frame.face, antenna: frame.antenna, flag: frame.flag, compact }
  return (
    <span className="mk-face">
      {frame.bang && (
        <span className="mk-bang" style={{ left: px(23 * s), top: px(-8 * s) }}>
          <PixelArt rows={BANG} codes={['o', 'x']} s={s} className="bang" />
        </span>
      )}
      <PixelArt
        rows={cartRows({ ...pose, bump: 0 })}
        codes={CART_CODES}
        s={s}
        className="actor is-a"
      />
      <PixelArt
        rows={cartRows({ ...pose, bump: 1 })}
        codes={CART_CODES}
        s={s}
        className="actor is-t"
      />
    </span>
  )
}

function classes(base: string, piece: Piece, scene: Scene): string {
  return [
    base,
    piece.zone && `zone-${piece.zone}`,
    piece.leader && 'is-leader',
    piece.sorted && 'is-sorted',
    piece.compared && 'is-compared',
    scene.stayed === piece.id && 'is-stayed',
    scene.range && (piece.col < scene.range[0] || piece.col >= scene.range[1]) && !piece.sorted
      ? 'is-waiting'
      : null,
  ]
    .filter(Boolean)
    .join(' ')
}

interface MockupSceneProps {
  readonly frames: readonly Frame[]
  readonly index: number
  readonly box: Box
  /** Play the move into this frame (one step forward), or show the pose only. */
  readonly motion: boolean
  readonly stepMs: number
  readonly label: string
  /** Trim short stages (the default); false draws them as before, to compare. */
  readonly trim?: boolean
}

export function MockupScene({
  frames,
  index,
  box,
  motion,
  stepMs,
  label,
  trim = true,
}: MockupSceneProps) {
  const ids = useMemo(() => identities(frames), [frames])
  const scene = useMemo(
    () => sceneOf(frames, index, box, ids, trim),
    [frames, index, box, ids, trim],
  )
  const root = useRef<HTMLDivElement>(null)
  const last = useRef<{ index: number; scene: Scene } | null>(null)
  // The cart's mood for this step, its frames timed to the step, and which one shows.
  const mood = moodOf(scene.actor.action, scene.event)
  const moodFrames = useMemo(
    () => fittedFrames(MOODS[mood], BASE_STEP_DELAY_MS / stepMs),
    [mood, stepMs],
  )
  const [tick, setTick] = useState({ index: -1, frame: 0 })

  useLayoutEffect(() => {
    const el = root.current
    const before = last.current
    last.current = { index, scene }
    if (!el || !motion || !before || before.index !== index - 1) return
    if (typeof el.animate !== 'function') return
    const run: Animation[] = []
    const ms = stepMs * (scene.event === 'place' ? 1.5 : 0.85)
    const was = new Map(before.scene.pieces.map((piece) => [piece.id, piece]))
    const { s, actor, actorW } = scene
    const actorEl = el.querySelector<HTMLElement>('.mk-actor')

    if (scene.swapped) {
      const [carried, other] = scene.swapped
      const from = was.get(carried)
      const to = scene.pieces.find((piece) => piece.id === carried)
      if (from && to) {
        // 1. The cart rolls under the stack; 2. it lifts it and rolls it to its new place.
        const pickX = actorXUnder(from.cx, actorW, box.width)
        const pick = 0.35
        if (actorEl) {
          run.push(
            actorEl.animate(
              [
                { transform: `translate(${px(before.scene.actor.x - actor.x)}, 0)` },
                { transform: `translate(${px(pickX - actor.x)}, 0)`, offset: pick },
                { transform: `translate(${px(pickX - actor.x)}, 0)`, offset: pick + 0.05 },
                { transform: 'none', offset: 0.92 },
                { transform: 'none' },
              ],
              { duration: ms, easing: 'linear' },
            ),
          )
        }
        const carriedEl = el.querySelector<HTMLElement>(`[data-id="${String(carried)}"]`)
        const dx = from.cx - to.cx
        const lift = -2 * s
        if (carriedEl) {
          run.push(
            carriedEl.animate(
              [
                { transform: `translate(${px(dx)}, 0)`, zIndex: 3 },
                { transform: `translate(${px(dx)}, 0)`, zIndex: 3, offset: pick },
                { transform: `translate(${px(dx)}, ${px(lift)})`, zIndex: 3, offset: pick + 0.05 },
                { transform: `translate(0px, ${px(lift)})`, zIndex: 3, offset: 0.92 },
                { transform: 'none', zIndex: 3 },
              ],
              { duration: ms, easing: 'linear' },
            ),
          )
        }
        const otherEl = el.querySelector<HTMLElement>(`[data-id="${String(other)}"]`)
        const otherFrom = was.get(other)
        const otherTo = scene.pieces.find((piece) => piece.id === other)
        if (otherEl && otherFrom && otherTo) {
          const ox = otherFrom.cx - otherTo.cx
          run.push(
            otherEl.animate(
              [
                { transform: `translate(${px(ox)}, 0)`, zIndex: 1 },
                { transform: `translate(${px(ox)}, 0)`, zIndex: 1, offset: pick + 0.05 },
                { transform: 'none', zIndex: 1, offset: 0.92 },
                { transform: 'none', zIndex: 1 },
              ],
              { duration: ms, easing: 'ease-in-out' },
            ),
          )
        }
      }
    } else if (actorEl && before.scene.actor.x !== actor.x) {
      // Just rolling to the next stack.
      run.push(
        actorEl.animate(
          [
            { transform: `translate(${px(before.scene.actor.x - actor.x)}, 0)` },
            { transform: 'none' },
          ],
          { duration: ms * 0.6, easing: 'ease-in-out' },
        ),
      )
    }
    if (scene.nudged !== null) {
      const node = el.querySelector<HTMLElement>(`[data-id="${String(scene.nudged)}"]`)
      if (node) {
        run.push(
          node.animate(
            [
              { transform: 'none' },
              { transform: `translate(0px, ${px(-3 * s)})` },
              { transform: 'none' },
            ],
            { duration: ms * 0.6, delay: ms * 0.25, easing: 'ease-in-out' },
          ),
        )
      }
    }
    const longest = Math.max(0, ...run.map((a) => Number(a.effect?.getTiming().duration ?? 0)))
    const timers: number[] = []
    if (longest > 0 && actorEl) {
      actorEl.toggleAttribute('data-moving', true)
      timers.push(
        window.setTimeout(() => {
          actorEl.toggleAttribute('data-moving', false)
        }, longest * 0.92),
      )
    }
    // The mood plays through its frames over the step.
    let at = 0
    moodFrames.forEach((_, k) => {
      if (k === 0) return
      at += moodFrames[k - 1]?.ms ?? 0
      timers.push(
        window.setTimeout(() => {
          setTick({ index, frame: k })
        }, at),
      )
    })
    return () => {
      for (const id of timers) window.clearTimeout(id)
      actorEl?.toggleAttribute('data-moving', false)
      for (const animation of run) animation.cancel()
    }
  }, [index, scene, motion, stepMs, box.width, moodFrames])

  const { actor, s, zones, colW, laneTop, ground } = scene
  // A still shows the mood's telling pose; playing, the frame the step has reached.
  const shown = motion ? (tick.index === index ? tick.frame : 0) : STILL[mood]
  const moodFrame = moodFrames[shown] ?? moodFrames[0] ?? { ms: 0 }
  return (
    <div
      ref={root}
      className={`mk-scene event-${scene.event}${motion ? ' has-motion' : ''}${scene.compact ? ' is-compact' : ''}`}
      style={
        {
          width: px(box.width),
          height: px(box.height),
          '--s': px(s),
          '--step': `${String(stepMs)}ms`,
        } as CSSProperties
      }
      role="img"
      aria-label={label}
    >
      <div className="mk-lane" style={{ top: px(laneTop), height: px(ground - laneTop) }} />
      {zones.map(({ zone, from, to }) => (
        <span
          key={`${zone}-${String(from)}`}
          className={`mk-zone zone-${zone}`}
          style={{
            left: px(colW * from + 1),
            width: px(colW * (to - from) - 2),
            top: px(laneTop),
            height: px(ground - laneTop),
          }}
        />
      ))}
      {scene.pieces.map((piece) => (
        <Stack key={piece.id} piece={piece} scene={scene} />
      ))}
      <span
        className={`mk-actor action-${actor.action} mood-${mood}`}
        style={{ left: px(actor.x), top: px(actor.y) }}
      >
        <Cart frame={moodFrame} s={s} compact={scene.compact} />
      </span>
    </div>
  )
}
