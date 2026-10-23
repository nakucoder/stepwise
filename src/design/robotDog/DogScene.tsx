/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): draws one frame for a design (layout.ts) and,
 * on one step forward, plays its move. Each design moves its own way:
 * A. sheep trot past each other along the ground, the herded one in front, with a little hop;
 * B. the dog lifts the herded bone over the row in its mouth while the other slides back;
 * C. the bots hop over each other in arcs, the herded one over the top.
 * A value that swaps with itself nudges in place. Placing the leader is the special move
 * (A gates swing shut, B the dog digs it in, C a clamp ring locks on); the finale is a wave.
 * Reduced motion (or motion off): final poses only.
 */
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import type { Frame } from '../../engine/types'
import { identities, sceneOf, type Box, type Design, type Piece, type Scene } from './layout'
import { SPRITES, type SpriteId } from './sprites'

const px = (n: number) => `${String(Math.round(n))}px`

function Sprite({ id, s, className }: { id: SpriteId; s: number; className: string }) {
  const { rows, paths } = SPRITES[id]
  const w = rows[0].length
  const h = rows.length
  return (
    <svg
      className={`dog-sprite ${className}`}
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

/** A value: its column (as tall as the number), its rider on top, its digit on a plate. */
function Value({ piece, scene }: { piece: Piece; scene: Scene }) {
  const { design, s, colW, font } = scene
  const w = Math.max(6, Math.min(colW * 0.72, 22 * s))
  const style = {
    left: px(piece.cx - w / 2),
    top: px(piece.top),
    width: px(w),
    height: px(piece.h),
    '--font': px(font),
    '--w': px(w),
    '--s': px(s),
    '--i': piece.col,
    // Seams every ten counts, when they are at least 4px apart.
    '--ten': scene.tenPx >= 4 ? px(scene.tenPx) : '100000px',
  } as CSSProperties
  const classes = [
    'dog-value',
    `is-${design}`,
    piece.zone && `zone-${piece.zone}`,
    piece.sorted && 'is-sorted',
    piece.sniffed && 'is-sniffed',
    scene.range && (piece.col < scene.range[0] || piece.col >= scene.range[1]) && !piece.sorted
      ? 'is-waiting'
      : null,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={classes} style={style} data-id={piece.id}>
      <span className="dog-column" />
      <span className="dog-rider">
        {design === 'sheep' && <Sprite id="sheep" s={s} className="sheep" />}
        {design === 'bots' && <Sprite id="bot" s={s} className="bot" />}
        {design === 'bones' && <span className="bone-knobs" />}
      </span>
      {design === 'bones' && <span className="bone-foot" />}
      <span className="dog-digit">{piece.value}</span>
      {piece.sorted && <span className="dog-done-mark" />}
    </div>
  )
}

interface DogSceneProps {
  readonly design: Design
  readonly frames: readonly Frame[]
  readonly index: number
  readonly box: Box
  /** Play the move into this frame (one step forward), or show the pose only. */
  readonly motion: boolean
  readonly stepMs: number
  readonly label: string
}

export function DogScene({ design, frames, index, box, motion, stepMs, label }: DogSceneProps) {
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
    const ms = stepMs * 0.8
    const byId = new Map(before.scene.pieces.map((piece) => [piece.id, piece]))
    const { s } = scene

    if (scene.swapped) {
      const [herded, other] = scene.swapped
      for (const id of [herded, other]) {
        const node = el.querySelector<HTMLElement>(`[data-id="${String(id)}"]`)
        const now = scene.pieces.find((piece) => piece.id === id)
        const was = byId.get(id)
        if (!node || !now || !was) continue
        const dx = was.cx - now.cx
        const lead = id === herded
        const lift =
          design === 'sheep'
            ? lead
              ? -4 * s
              : 0
            : design === 'bones'
              ? lead
                ? -(now.top - 2) // over the row, held in the dog's mouth
                : 0
              : -(lead ? 0.9 : 0.45) * Math.min(now.top, 40)
        const special = scene.event === 'place'
        run.push(
          node.animate(
            [
              { transform: `translate(${px(dx)}, 0)`, zIndex: lead ? 3 : 2 },
              {
                transform: `translate(${px(dx * 0.5)}, ${px(lift)})`,
                zIndex: lead ? 3 : 2,
                offset: design === 'bones' && lead ? 0.3 : 0.5,
              },
              ...(design === 'bones' && lead
                ? [{ transform: `translate(0px, ${px(lift)})`, zIndex: 3, offset: 0.75 }]
                : []),
              { transform: 'none', zIndex: lead ? 3 : 2 },
            ],
            { duration: special ? ms * 1.4 : ms, easing: 'ease-in-out' },
          ),
        )
      }
    }
    if (scene.nudged !== null) {
      const node = el.querySelector<HTMLElement>(`[data-id="${String(scene.nudged)}"]`)
      if (node) {
        run.push(
          node.animate(
            [
              { transform: 'none' },
              { transform: `translate(${px(-3 * s)}, ${px(-2 * s)})` },
              { transform: 'none' },
            ],
            { duration: ms * 0.6, easing: 'ease-in-out' },
          ),
        )
      }
    }
    const dog = el.querySelector<HTMLElement>('.dog-dog')
    if (dog && before.scene.dog.x !== scene.dog.x) {
      const dx = before.scene.dog.x - scene.dog.x
      run.push(
        dog.animate(
          [
            { transform: `translate(${px(dx)}, 0)` },
            { transform: `translate(${px(dx * 0.5)}, ${px(-2 * scene.dogS)})` },
            { transform: 'none' },
          ],
          { duration: ms * 0.7, easing: 'ease-out' },
        ),
      )
    }
    return () => {
      for (const animation of run) animation.cancel()
    }
  }, [index, scene, motion, stepMs, design])

  const { dog, dogS, ball, zones, colW, ground, strip } = scene
  const dogSprite: SpriteId =
    dog.action === 'sniff'
      ? 'dogSniff'
      : dog.action === 'place' || dog.action === 'done' || dog.action === 'dance'
        ? 'dogSit'
        : 'dog'
  const leader = scene.pieces.find((piece) => piece.zone === 'placed' && scene.event === 'place')
  return (
    <div
      ref={root}
      className={`dog-scene is-${design} event-${scene.event}${motion ? ' has-motion' : ''}`}
      style={{ width: px(box.width), height: px(box.height), '--s': px(scene.s) } as CSSProperties}
      role="img"
      aria-label={label}
    >
      <div className="dog-ground" style={{ top: px(ground), height: px(strip) }} />
      {zones.map(({ zone, from, to }) => (
        <span
          key={`${zone}-${String(from)}`}
          className={`dog-zone zone-${zone}`}
          style={{
            left: px(colW * from + 1),
            width: px(colW * (to - from) - 2),
            top: px(ground),
            height: px(strip),
          }}
        />
      ))}
      {scene.pieces.map((piece) => (
        <Value key={piece.id} piece={piece} scene={scene} />
      ))}
      {/* The special move, placing the leader: A gates swing shut, B dug in, C a clamp ring. */}
      {leader && (
        <span
          className={`dog-aha is-${design}`}
          style={{
            left: px(leader.cx - colW / 2),
            width: px(colW),
            top: px(Math.max(0, leader.top - 6 * scene.s)),
            height: px(ground - leader.top + 6 * scene.s + strip),
          }}
        />
      )}
      {ball && (
        <span
          className="dog-ball-wrap"
          style={{ left: px(ball.x), top: px(ball.y) }}
          data-drop={scene.event === 'range' ? 'yes' : undefined}
        >
          <Sprite id="ball" s={scene.s} className="ball" />
        </span>
      )}
      <span
        className={`dog-dog action-${dog.action} facing-${dog.facing}`}
        style={{ left: px(dog.x), top: px(dog.y) }}
      >
        <Sprite id={dogSprite} s={dogS} className="dog" />
        {dog.action === 'stay' && <span className="dog-bark" />}
        {dog.action === 'sniff' && <span className="dog-sniff-puff" />}
        {design === 'bots' && (dog.action === 'herd' || dog.action === 'nudge') && (
          <span className="dog-ping" />
        )}
      </span>
    </div>
  )
}
