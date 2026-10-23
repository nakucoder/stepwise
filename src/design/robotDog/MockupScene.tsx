/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): draws one frame of the delivery cart design
 * (layout.ts) and, on one step forward, plays its move: the cart rolls under the stack, lifts it
 * on its deck and rolls it to its new place, while the other stack slides along the curb to the
 * place it left. A value that swaps with itself is lifted and set down in place. Placing the
 * leader is the special move, "Delivered!": the top lid pops open and a puff of steam rises.
 * Reduced motion (or motion off): final poses only.
 *
 * Each value is a stack of flat pizza boxes: a lid seam on every box tall enough for one, a
 * slice printed on the front where it fits, a grease spot here and there, and the top box's lid
 * a little open on a peek of pizza. The leader's boxes are red, with a blue ribbon and bow (the
 * leader role's colour, as a mark).
 */
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import type { Frame } from '../../engine/types'
import { actorXUnder, identities, sceneOf, type Box, type Piece, type Scene } from './layout'
import { BOW, SLICE, SPRITES, type SpriteId } from './sprites'

const px = (n: number) => `${String(Math.round(n))}px`

function Sprite({ id, s, className }: { id: SpriteId; s: number; className: string }) {
  const { rows, paths } = SPRITES[id]
  const w = Math.max(...rows.map((row) => row.length))
  const h = rows.length
  return (
    <svg
      className={`mk-sprite ${className}`}
      width={w * s}
      height={h * s}
      viewBox={`0 0 ${String(w)} ${String(h)}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {Object.entries(paths).map(([code, d]) => (
        <path key={code} d={d} className={`px-${code}`} />
      ))}
    </svg>
  )
}

const SLICE_W = Math.max(...SLICE.map((row) => row.length))
const BOW_W = Math.max(...BOW.map((row) => row.length))

/** One box of a stack, `t` px tall; the top one has its lid open on a peek of pizza. */
function PizzaBox({
  piece,
  scene,
  k,
  bottom,
  t,
}: {
  piece: Piece
  scene: Scene
  k: number
  bottom: number
  t: number
}) {
  const { itemW } = scene
  const top = k === piece.boxes - 1
  // The lid band on a closed box; the peek and the open lid on the top one.
  const lid = t >= 5 || top ? Math.max(1, Math.min(3, Math.round(t * 0.18))) : 0
  const peek = top ? Math.max(1, Math.min(4, Math.round(t * 0.4), t - 1)) : 0
  // The front, under the lid (and its seam) and over the bottom edge.
  const face = t - (top ? peek : lid > 0 ? lid + 1 : 0) - 1
  // The slice, where the front has room for it: 2× on big boxes, else 1×, else none.
  const iconS =
    face >= SLICE.length * 2 + 2 && itemW >= 34 ? 2 : face >= SLICE.length && itemW >= 20 ? 1 : 0
  const iconW = SLICE_W * iconS
  const iconH = SLICE.length * iconS
  const faceTop = t - 1 - face
  const grease = !top && t >= 6 && (piece.id * 7 + k * 3) % 5 === 0
  return (
    <span
      className={['mk-box', top && 'is-top', lid > 0 && !top && 'has-lid', grease && 'has-grease']
        .filter(Boolean)
        .join(' ')}
      style={
        {
          bottom: px(bottom),
          height: px(t),
          '--lid': px(lid),
          '--peek': px(peek),
          '--open': px(Math.max(4, Math.round(itemW * 0.28))),
        } as CSSProperties
      }
    >
      {top && (
        <>
          <span className="mk-peek" style={{ height: px(peek) }} />
          <span className="mk-lid" style={{ height: px(lid) }} />
        </>
      )}
      {iconS > 0 && (
        <span
          className="mk-icon"
          style={{
            left: px((piece.leader ? itemW * 0.38 : itemW / 2) - iconW / 2),
            top: px(faceTop + Math.floor((face - iconH) / 2)),
          }}
        >
          <Sprite id="slice" s={iconS} className="slice" />
        </span>
      )}
    </span>
  )
}

function Stack({ piece, scene }: { piece: Piece; scene: Scene }) {
  const { itemW, dollyH, laneTop } = scene
  const delivered = piece.zone === 'placed' && scene.event === 'place'
  const top = Math.round(piece.top)
  const h = Math.round(laneTop - dollyH) - top
  const n = piece.boxes
  // Box edges on whole pixels, from the bottom up, so every box is crisp and the stack is
  // exactly as tall as the value.
  const edges = Array.from({ length: n + 1 }, (_, k) => Math.round((h * k) / Math.max(1, n)))
  const topT = n > 0 ? h - (edges[n - 1] ?? 0) : 0
  const ribbonW = itemW >= 24 ? 3 : 2
  const bowS = itemW >= 40 ? 2 : 1
  const ribbonTop = Math.min(topT, Math.max(1, Math.round(topT * 0.4)))
  return (
    <div
      className={classes('mk-value is-stack', piece, scene)}
      style={
        {
          left: px(piece.cx - itemW / 2),
          top: px(top),
          width: px(itemW),
          height: px(laneTop - top),
          '--font': px(scene.font),
          '--dolly-h': px(dollyH),
          '--i': piece.col,
        } as CSSProperties
      }
      data-id={piece.id}
    >
      <span className="mk-boxes">
        {Array.from({ length: n }, (_, k) => {
          const bottom = edges[k] ?? 0
          return (
            <PizzaBox
              key={k}
              piece={piece}
              scene={scene}
              k={k}
              bottom={bottom}
              t={(edges[k + 1] ?? h) - bottom}
            />
          )
        })}
        {piece.leader && n > 0 && (
          <>
            <span
              className="mk-ribbon"
              style={{
                left: px(itemW * 0.74 - ribbonW / 2),
                width: px(ribbonW),
                top: px(ribbonTop),
              }}
            />
            <span
              className="mk-bow"
              style={{
                left: px(itemW * 0.74 - (BOW_W * bowS) / 2),
                top: px(Math.max(0, Math.min(h - BOW.length * bowS, ribbonTop - 1))),
              }}
            >
              <Sprite id="bow" s={bowS} className="bow" />
            </span>
          </>
        )}
      </span>
      <span className="mk-dolly">
        <span className="mk-digit">{piece.value}</span>
      </span>
      {delivered && (
        <span className="mk-steam">
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
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
}

export function MockupScene({ frames, index, box, motion, stepMs, label }: MockupSceneProps) {
  const ids = useMemo(() => identities(frames), [frames])
  const scene = useMemo(() => sceneOf(frames, index, box, ids), [frames, index, box, ids])
  const root = useRef<HTMLDivElement>(null)
  const last = useRef<{ index: number; scene: Scene } | null>(null)

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
    return () => {
      for (const id of timers) window.clearTimeout(id)
      actorEl?.toggleAttribute('data-moving', false)
      for (const animation of run) animation.cancel()
    }
  }, [index, scene, motion, stepMs, box.width])

  const { actor, s, zones, colW, laneTop, ground } = scene
  return (
    <div
      ref={root}
      className={`mk-scene event-${scene.event}${motion ? ' has-motion' : ''}`}
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
        className={`mk-actor action-${actor.action}`}
        style={{ left: px(actor.x), top: px(actor.y) }}
      >
        <span className="mk-face">
          <Sprite id="cartA" s={s} className="actor is-a" />
          <Sprite id="cartB" s={s} className="actor is-t" />
        </span>
      </span>
    </div>
  )
}
