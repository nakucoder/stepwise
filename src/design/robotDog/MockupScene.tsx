/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): draws one frame for a design (layout.ts) and,
 * on one step forward, plays its move:
 * I. the dog trots to the balloon, takes its string in its mouth and trots it to its new place,
 *    while the other balloon floats up and over to the place it left;
 * J. the cart rolls under the stack, lifts it on its deck and rolls it to its new place, while
 *    the other stack slides along the curb to the place it left.
 * A value that swaps with itself is tugged (I) or lifted and set down (J) in place. Placing the
 * leader is the special move: I. the dog ties the string down, a sparkle and a happy jump;
 * J. "Delivered!": the top lid pops and a puff of steam rises. Reduced motion (or motion off):
 * final poses only.
 */
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import type { Frame } from '../../engine/types'
import {
  actorXUnder,
  identities,
  sceneOf,
  type Box,
  type Design,
  type Piece,
  type Scene,
} from './layout'
import { DOG_MOUTH, SPRITES, type SpriteId } from './sprites'

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

/** Is this piece's string in the dog's mouth (I), or is it on the cart's deck (J), now? */
function heldBy(scene: Scene, piece: Piece): boolean {
  const { action } = scene.actor
  if (action === 'carry' || action === 'place') return scene.swapped?.[0] === piece.id
  if (action === 'nudge') return scene.nudged === piece.id
  return false
}

function Balloon({ piece, scene }: { piece: Piece; scene: Scene }) {
  const { itemW, itemH, ground, actor, s } = scene
  const held = heldBy(scene, piece)
  // A held string ends in the dog's mouth; the rest are pegged to the ground.
  const bottom = held ? actor.y + (DOG_MOUTH.y + 0.5) * s : ground
  return (
    <div
      className={classes('mk-value is-balloon', piece, scene)}
      style={
        {
          left: px(piece.cx - itemW / 2),
          top: px(piece.top),
          width: px(itemW),
          height: px(ground - piece.top),
          '--font': px(scene.font),
          '--item-h': px(itemH),
          '--string-h': px(bottom - piece.top - itemH),
          '--i': piece.col,
        } as CSSProperties
      }
      data-id={piece.id}
    >
      <span className="mk-balloon">
        <span className="mk-digit">{piece.value}</span>
      </span>
      <span className="mk-string" />
      {!held && <span className="mk-peg" />}
      {piece.zone === 'placed' && scene.event === 'place' && (
        <span className="mk-sparkle" style={{ '--sx': px(-6 * s) } as CSSProperties}>
          <Sprite id="sparkle" s={Math.max(1, s)} className="sparkle" />
          <Sprite id="sparkle" s={Math.max(1, s)} className="sparkle is-second" />
        </span>
      )}
    </div>
  )
}

function Stack({ piece, scene }: { piece: Piece; scene: Scene }) {
  const { itemW, dollyH, boxPx, laneTop } = scene
  const delivered =
    piece.zone === 'placed' && (scene.event === 'place' || scene.event === 'done' || scene.finale)
  return (
    <div
      className={classes('mk-value is-stack', piece, scene)}
      style={
        {
          left: px(piece.cx - itemW / 2),
          top: px(piece.top),
          width: px(itemW),
          height: px(laneTop - piece.top),
          '--font': px(scene.font),
          '--box': `${String(Math.max(2, boxPx))}px`,
          '--dolly-h': px(dollyH),
          '--lid': px(Math.max(2, Math.min(4, boxPx * 0.6))),
          '--i': piece.col,
        } as CSSProperties
      }
      data-id={piece.id}
    >
      <span className="mk-boxes">
        <span className="mk-lid" />
      </span>
      <span className="mk-dolly">
        <span className="mk-digit">{piece.value}</span>
      </span>
      {delivered && scene.event === 'place' && (
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
  readonly design: Design
  readonly frames: readonly Frame[]
  readonly index: number
  readonly box: Box
  /** Play the move into this frame (one step forward), or show the pose only. */
  readonly motion: boolean
  readonly stepMs: number
  readonly label: string
}

export function MockupScene({
  design,
  frames,
  index,
  box,
  motion,
  stepMs,
  label,
}: MockupSceneProps) {
  const ids = useMemo(() => identities(frames), [frames])
  const scene = useMemo(
    () => sceneOf(design, frames, index, box, ids),
    [design, frames, index, box, ids],
  )
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
    const faceEl = el.querySelector<HTMLElement>('.mk-face')
    const flip = (facing: 'left' | 'right') => (facing === 'left' ? 'scaleX(-1)' : 'none')
    const moving = (on: boolean) => {
      if (actorEl) actorEl.toggleAttribute('data-moving', on)
    }

    if (scene.swapped) {
      const [carried, other] = scene.swapped
      const from = was.get(carried)
      const to = scene.pieces.find((piece) => piece.id === carried)
      if (from && to) {
        // 1. The character goes to the value (facing it); 2. it carries it to its new place.
        const goRight = from.cx > before.scene.actor.x + actorW / 2
        const pickFacing = goRight ? 'right' : 'left'
        const pickX = actorXUnder(design, from.cx, actor.facing, s, actorW, box.width)
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
        if (faceEl) {
          run.push(
            faceEl.animate(
              [
                { transform: flip(pickFacing) },
                { transform: flip(pickFacing), offset: pick },
                { transform: flip(actor.facing), offset: pick + 0.001 },
                { transform: flip(actor.facing) },
              ],
              { duration: ms, easing: 'linear' },
            ),
          )
        }
        const carriedEl = el.querySelector<HTMLElement>(`[data-id="${String(carried)}"]`)
        const dx = from.cx - to.cx
        const lift = design === 'pizza' ? -2 * s : 0
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
          // I: the other balloon floats up and over; J: the other stack slides along the curb.
          const up = design === 'balloons' ? -Math.min(otherTo.top, scene.itemH * 0.8) : 0
          run.push(
            otherEl.animate(
              [
                { transform: `translate(${px(ox)}, 0)`, zIndex: 1 },
                { transform: `translate(${px(ox)}, 0)`, zIndex: 1, offset: pick + 0.05 },
                {
                  transform: `translate(${px(ox * 0.5)}, ${px(up)})`,
                  zIndex: 1,
                  offset: (pick + 0.92) / 2,
                },
                { transform: 'none', zIndex: 1, offset: 0.92 },
                { transform: 'none', zIndex: 1 },
              ],
              { duration: ms, easing: 'ease-in-out' },
            ),
          )
        }
      }
    } else if (actorEl && before.scene.actor.x !== actor.x) {
      // Just walking (or rolling) to the next value.
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
        const tug =
          design === 'balloons'
            ? `translate(${px(-2 * s)}, ${px(2 * s)})`
            : `translate(0px, ${px(-3 * s)})`
        run.push(
          node.animate([{ transform: 'none' }, { transform: tug }, { transform: 'none' }], {
            duration: ms * 0.6,
            delay: ms * 0.25,
            easing: 'ease-in-out',
          }),
        )
      }
    }
    const longest = Math.max(0, ...run.map((a) => Number(a.effect?.getTiming().duration ?? 0)))
    if (longest > 0) {
      moving(true)
      const done = window.setTimeout(() => {
        moving(false)
      }, longest * 0.92)
      return () => {
        window.clearTimeout(done)
        moving(false)
        for (const animation of run) animation.cancel()
      }
    }
    return () => {
      for (const animation of run) animation.cancel()
    }
  }, [index, scene, motion, stepMs, design, box.width])

  const { actor, s, zones, colW, laneTop, ground } = scene
  const [a, b]: [SpriteId, SpriteId] =
    design === 'balloons'
      ? actor.action === 'place' || actor.action === 'party' || actor.action === 'done'
        ? ['dogJump', 'dogWag']
        : ['dogStand', 'dogWag']
      : ['cartA', 'cartB']
  const [t1, t2]: [SpriteId, SpriteId] =
    design === 'balloons' ? ['dogTrot1', 'dogTrot2'] : ['cartA', 'cartB']
  return (
    <div
      ref={root}
      className={`mk-scene is-${design} event-${scene.event}${motion ? ' has-motion' : ''}`}
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
      {scene.pieces.map((piece) =>
        design === 'balloons' ? (
          <Balloon key={piece.id} piece={piece} scene={scene} />
        ) : (
          <Stack key={piece.id} piece={piece} scene={scene} />
        ),
      )}
      <span
        className={`mk-actor action-${actor.action}`}
        style={{ left: px(actor.x), top: px(actor.y) }}
      >
        <span className={`mk-face facing-${actor.facing}`}>
          <Sprite id={a} s={s} className={`actor is-a ${design}`} />
          <Sprite id={b} s={s} className={`actor is-b ${design}`} />
          <Sprite id={t1} s={s} className={`actor is-t1 ${design}`} />
          <Sprite id={t2} s={s} className={`actor is-t2 ${design}`} />
        </span>
      </span>
    </div>
  )
}
