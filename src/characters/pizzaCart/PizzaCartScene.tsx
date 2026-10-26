/**
 * Quick sort's pizza cart (design/mockups/pizza-cart/README.md), drawn over the bars' field in
 * the field's own pixels. Each value is a stack of takeout pizza boxes on a dolly that carries
 * its digit, one box per count; a small delivery cart rolls in the street lane under the stacks
 * and carries them to either side of the leader (red boxes, a blue ribbon and bow). Placing the
 * leader is the special move, "Delivered!": the top box opens on its pizza, the lid flips up and
 * a puff of steam rises.
 *
 * The cart, the boxes and the street are fixed colours (tokens.css); role colours appear only as
 * marks: the yellow ring round the stack compared, the leader's ribbon, the green bar under a
 * stack in place. Only one step forward plays a move; anything else shows the frame's pose, and
 * so does every step with reduced motion. A new size rebuilds a move in progress from where it
 * had got to. Every motion, the cart's moods included, is a Web Animation.
 */
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import type { SceneProps } from '../registry'
import { fitMs, spritePath } from '../pixel'
import { useStableField } from '../useStableField'
import { pizzaLayout, type PizzaLayout } from './geometry'
import {
  BANG,
  BOW,
  BOW_W,
  BOX_CODES,
  CART_CODES,
  CART_SCREEN_X,
  drawCart,
  pizzaStack,
  PUFF,
  STEAM_PUFFS,
  type CartPose,
} from './sprites'
import {
  CARRY_AT,
  CARRY_MS,
  cartMood,
  DELIVER_AT,
  DELIVER_MS,
  deliverMs,
  DONE_MS,
  FINALE_HOP_MS,
  FINALE_MS,
  finaleHopAt,
  LIFT,
  moodFrames,
  MOODS,
  NUDGE_LIFT,
  NUDGE_MS,
  pizzaMoves,
  POP_MS,
  posesOf,
  ROLL_MS,
  WOBBLE_MS,
  type Mood,
  type MoodFrame,
  type PizzaMove,
  type PizzaPose,
} from './steps'
import './PizzaCartScene.css'

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

// ---------- The stacks ----------

const stackCache = new Map<string, readonly string[]>()

/** A stack's pixel art, kept: the same stack is drawn in many frames. */
function stackRows(geo: PizzaLayout, value: number, leader: boolean, open: boolean) {
  const { stackW, boxPx, lid, plain } = geo
  const key = [stackW, boxPx, lid, plain, value, leader, open].join('|')
  let rows = stackCache.get(key)
  if (!rows) {
    const count = Math.max(0, Math.min(12, Math.round(value)))
    const heights = Array.from({ length: count }, (_, k) => (k === count - 1 ? boxPx + lid : boxPx))
    rows = pizzaStack(stackW, heights, lid, { leader, open: open && lid > 0, plain }).rows
    stackCache.set(key, rows)
  }
  return rows
}

/** Where stack art starts for a column: its first column is the outline, just left of the front. */
const stackX = (geo: PizzaLayout, col: number) => Math.round(geo.cx(col) - geo.stackW / 2) - 1

function Stack(props: {
  readonly id: number
  readonly value: number
  readonly col: number
  readonly pose: PizzaPose
  readonly geo: PizzaLayout
}) {
  const { id, value, col, pose, geo } = props
  const { stackW, lid, dollyH, laneTop, font } = geo
  const h = geo.heightOf(value)
  const top = geo.base - h - (value > 0 ? lid : 0)
  const leader = pose.leader === col
  const open = pose.open === col && lid > 0
  const sorted = pose.sorted.includes(col)
  const dim = pose.range !== null && !sorted && (col < pose.range[0] || col >= pose.range[1])
  const lean = Math.ceil(lid / 2)
  const bowS = stackW >= 40 ? 2 : 1
  const name = String(id)
  return (
    <div
      className={[
        'pizza-stack',
        leader && 'is-leader',
        pose.compared === col && 'is-compared',
        sorted && 'is-sorted',
        dim && 'is-dim',
      ]
        .filter(Boolean)
        .join(' ')}
      data-part={`stack-${name}`}
      data-value={value}
      style={{
        top: px(top),
        width: px(stackW + lean + 2),
        height: px(laneTop - top),
        transform: at(stackX(geo, col)),
      }}
    >
      <div className="pizza-hop" data-part={`hop-${name}`}>
        {value > 0 && (
          <span className="pizza-boxes" data-part={`boxes-${name}`}>
            <PixelArt
              rows={stackRows(geo, value, leader, false)}
              codes={BOX_CODES}
              s={1}
              className="pizza-art"
              part={`closed-${name}`}
              style={open ? { opacity: 0 } : undefined}
            />
            {open && (
              <>
                <PixelArt
                  rows={stackRows(geo, value, leader, true)}
                  codes={BOX_CODES}
                  s={1}
                  className="pizza-art is-open"
                  part={`open-${name}`}
                />
                {/* The lid, flipped up behind the open box. */}
                <span
                  className="pizza-flap"
                  data-part={`flap-${name}`}
                  style={{ left: px(lean + 1), width: px(stackW), height: px(lid + 2) }}
                />
              </>
            )}
            {leader && !open && (
              <PixelArt
                rows={BOW}
                codes={['b', 'w']}
                s={bowS}
                className="pizza-bow"
                style={{
                  left: px(stackW - 1.5 - (BOW_W * bowS) / 2),
                  top: px(Math.max(0, lid - 2)),
                }}
              />
            )}
          </span>
        )}
        <span
          className="pizza-dolly"
          style={{ width: px(stackW + 4), height: px(dollyH), fontSize: px(font) }}
        >
          <span className="pizza-digit">{value}</span>
        </span>
        {open && (
          <span
            className="pizza-steam"
            style={{ left: px(stackW / 2 - 3), top: px(Math.max(-top, -15)) }}
          >
            {STEAM_PUFFS.map(([x, y], k) => (
              <PixelArt
                key={k}
                rows={PUFF}
                codes={['o', 'w']}
                s={1}
                className="pizza-puff"
                part={`puff-${name}-${String(k)}`}
                style={{ left: px(x), top: px(y) }}
              />
            ))}
          </span>
        )}
      </div>
      <span className="pizza-green" data-part={`green-${String(col)}`} />
    </div>
  )
}

// ---------- The cart ----------

const cartCache = new Map<string, readonly string[]>()

/** The cart's body for a mood frame (its wheels are drawn on their own, to turn). */
function cartRows(pose: CartPose): readonly string[] {
  const key = `${pose.face ?? ''}|${pose.antenna ?? ''}|${pose.flag ?? ''}`
  let rows = cartCache.get(key)
  if (!rows) {
    rows = drawCart(pose).map((row) => row.replace(/[wh]/g, '.'))
    cartCache.set(key, rows)
  }
  return rows
}

/** The wheels, and the hubs at each of the two turns. */
const WHEELS = drawCart().map((row) => row.replace(/[^wh]/g, '.').replace(/h/g, 'w'))
const HUBS_A = drawCart({ bump: 0 }).map((row) => row.replace(/[^h]/g, '.'))
const HUBS_B = drawCart({ bump: 1 }).map((row) => row.replace(/[^h]/g, '.'))
const BODY_CODES = CART_CODES.filter((code) => code !== 'w' && code !== 'h')

function Cart({ mood, s }: { readonly mood: Mood; readonly s: number }) {
  const frames = MOODS[mood].frames
  return (
    <span className="pizza-bounce" data-part="bounce">
      {frames.map((frame, k) => (
        <span
          key={k}
          className="pizza-mood"
          data-part={`mood-${String(k)}`}
          style={k === frames.length - 1 ? undefined : { opacity: 0 }}
        >
          {frame.bang && (
            <PixelArt
              rows={BANG}
              codes={['o', 'x']}
              s={s}
              className="pizza-bang"
              style={{ left: px(CART_SCREEN_X * s), top: px(-8 * s) }}
            />
          )}
          <PixelArt rows={cartRows(frame)} codes={BODY_CODES} s={s} className="pizza-cart-art" />
        </span>
      ))}
      <PixelArt rows={WHEELS} codes={['w']} s={s} className="pizza-cart-art pizza-wheels" />
      <PixelArt
        rows={HUBS_A}
        codes={['h']}
        s={s}
        className="pizza-cart-art pizza-wheels"
        part="hubs-a"
      />
      <PixelArt
        rows={HUBS_B}
        codes={['h']}
        s={s}
        className="pizza-cart-art pizza-wheels"
        part="hubs-b"
        style={{ opacity: 0 }}
      />
    </span>
  )
}

// ---------- The scene ----------

export function PizzaCartScene({
  frames,
  index,
  stepDelayMs,
  reducedMotion,
  doIt = false,
}: SceneProps) {
  const fieldRef = useRef<HTMLDivElement>(null)
  // The field's box, and the height the boxes' sizes come from: the shortest over the last
  // few steps, so a size doesn't change between steps (../useStableField.ts).
  const box = useStableField(fieldRef, frames, index)

  const poses = posesOf(frames)
  const pose = poses[index]
  // The stacks' values, by stack: each stack is numbered by its column in the first frame.
  const values = useMemo(() => frames[0]?.array ?? [], [frames])
  // In Do it on a phone the boxes size from the field's promised least height (its CSS floor),
  // so a message or hint squeezing the stage never changes them (PizzaCartScene.css).
  const sizeHeight = doIt && box?.floor ? Math.min(box.sizeHeight, box.floor) : box?.sizeHeight
  const geo =
    box && box.width > 0 && box.height > 0
      ? pizzaLayout(box, values.length, sizeHeight, box.sizeWidth)
      : null
  const mood = pose ? cartMood(pose) : 'idle'

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
    if (reducedMotion || !geo || move?.index !== index || !pose) return
    const root = fieldRef.current
    const context: MoveContext = {
      geo,
      pose,
      stepDelayMs,
      el: (name) =>
        root?.querySelector<HTMLElement | SVGElement>(`[data-part="${name}"]`) ?? undefined,
    }
    const moves = pizzaMoves(frames, index, poses)
    const animations = [
      ...moves.flatMap((m) => animate(m, context)),
      ...moodAnimations(mood, moves, context),
    ]
    const elapsed = performance.now() - move.start
    if (elapsed > 1) for (const animation of animations) animation.currentTime = elapsed
    return () => {
      for (const animation of animations) animation.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, frames, reducedMotion, box])

  let content = null
  if (geo && pose) {
    const { width, height, laneTop, pitch, colW, s } = geo
    // The zones in the lane, as runs of columns: smaller-or-equal is solid, bigger is hatched.
    const zones: { zone: 'left' | 'bigger'; from: number; to: number }[] = []
    pose.zones.forEach((zone, col) => {
      if (zone !== 'left' && zone !== 'bigger') return
      const last = zones.at(-1)
      if (last?.zone === zone && last.to === col) last.to = col + 1
      else zones.push({ zone, from: col, to: col + 1 })
    })
    // The stack carried this step is drawn over the others.
    const carried = pizzaMoves(frames, index, poses).find((m) => m.kind === 'carry')
    const ids = values.map((_, id) => id)
    if (carried?.kind === 'carry')
      ids.sort((a, b) => Number(a === carried.stack) - Number(b === carried.stack))
    content = (
      <div
        className={`pizza-scene${pose.final ? ' is-final' : ''}`}
        // One box's height and the lid: the look of every box on this stage (checks read them).
        data-box={geo.boxPx}
        data-lid={geo.lid}
        style={{ width: px(width), height: px(height) }}
      >
        <div className="pizza-lane" style={{ top: px(laneTop), height: px(height - laneTop) }} />
        {zones.map(({ zone, from, to }) => (
          <span
            key={`${zone}-${String(from)}`}
            className={`pizza-zone is-${zone}`}
            style={{
              left: px(pitch * from + 1),
              width: px(pitch * (to - from) - (pitch - colW) - 2),
              top: px(laneTop + 2),
              height: px(height - laneTop - 2),
            }}
          />
        ))}
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
        <div
          className="pizza-cart"
          data-part="cart"
          data-mood={mood}
          data-action={pose.action}
          style={{ transform: at(geo.cartX(pose.cart), geo.cartY), '--s': px(s) } as CSSProperties}
        >
          <Cart key={`${String(index)}-${mood}`} mood={mood} s={s} />
        </div>
      </div>
    )
  }

  return (
    <div ref={fieldRef} className="stage-bars pizza-field" aria-hidden="true">
      {content}
    </div>
  )
}

// ---------- The moves ----------

interface MoveContext {
  readonly geo: PizzaLayout
  readonly pose: PizzaPose
  readonly stepDelayMs: number
  readonly el: (name: string) => HTMLElement | SVGElement | undefined
}

function run(element: Element | undefined, keys: Keyframe[], options: KeyframeAnimationOptions) {
  if (!element || typeof element.animate !== 'function') return []
  return [element.animate(keys, options)]
}

/** The wheels turn (the hubs go round, 220 ms a turn) while the cart rolls. */
function wheels({ el }: MoveContext, duration: number, delay = 0): Animation[] {
  if (duration <= 0) return []
  const turn = { duration: 220, delay, iterations: duration / 220 }
  return [
    ...run(
      el('hubs-b'),
      [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1, offset: 0.5 }, { opacity: 1 }],
      turn,
    ),
    ...run(
      el('hubs-a'),
      [{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.5 }, { opacity: 0 }],
      turn,
    ),
  ]
}

function animate(move: PizzaMove, context: MoveContext): Animation[] {
  const { geo, el, stepDelayMs } = context
  switch (move.kind) {
    case 'roll': {
      const duration = fitMs(ROLL_MS, stepDelayMs)
      return [
        ...run(
          el('cart'),
          [
            { transform: at(geo.cartX(move.from), geo.cartY) },
            { transform: at(geo.cartX(move.to), geo.cartY) },
          ],
          {
            duration,
            easing: 'ease-in-out',
          },
        ),
        ...wheels(context, duration),
      ]
    }
    case 'carry':
      return carry(move, context)
    case 'pop':
      return run(
        el(`boxes-${String(move.stack)}`),
        [
          { transform: 'scale(0.85)' },
          { transform: 'scale(1.1)', offset: 0.6 },
          { transform: 'none' },
        ],
        {
          duration: fitMs(POP_MS, stepDelayMs),
          easing: 'ease-out',
        },
      )
    case 'nudge': {
      const duration = fitMs(NUDGE_MS, stepDelayMs)
      return run(
        el(`hop-${String(move.stack)}`),
        [{ transform: 'none' }, { transform: at(0, -NUDGE_LIFT * geo.s) }, { transform: 'none' }],
        {
          duration,
          easing: 'ease-in-out',
        },
      )
    }
    case 'stay':
      return run(
        el(`hop-${String(move.stack)}`),
        [
          { transform: 'none' },
          { transform: 'rotate(3deg)', offset: 0.3 },
          { transform: 'rotate(-2deg)', offset: 0.7 },
          { transform: 'none' },
        ],
        {
          duration: fitMs(WOBBLE_MS, stepDelayMs),
          easing: 'ease-in-out',
        },
      )
    case 'deliver':
      return deliver(move, context)
    case 'done':
      return run(el(`green-${String(move.col)}`), [{ opacity: 0 }, { opacity: 1 }], {
        duration: fitMs(DONE_MS, stepDelayMs),
        fill: 'backwards',
      })
    case 'finale':
      return finale(context)
  }
}

/**
 * A trade (or the carry into "Delivered!"): the cart rolls under the stack, lifts it on its deck,
 * rolls it to its new column and sets it down; the other stack slides along the curb meanwhile.
 */
function carry(move: Extract<PizzaMove, { kind: 'carry' }>, context: MoveContext): Animation[] {
  const { geo, el, pose, stepDelayMs } = context
  const delivering = pose.open !== null
  const duration = delivering
    ? DELIVER_AT.drop * (deliverMs(stepDelayMs) / DELIVER_MS)
    : fitMs(CARRY_MS, stepDelayMs)
  const { pick, lift, land } = CARRY_AT
  const y = geo.cartY
  const lifted = -LIFT * geo.s
  const fromX = stackX(geo, move.from)
  const toX = stackX(geo, move.to)
  return [
    ...run(
      el('cart'),
      [
        { transform: at(geo.cartX(move.cartFrom), y) },
        { transform: at(geo.cartX(move.from), y), offset: pick },
        { transform: at(geo.cartX(move.from), y), offset: lift },
        { transform: at(geo.cartX(move.to), y), offset: land },
        { transform: at(geo.cartX(move.to), y) },
      ],
      { duration },
    ),
    ...wheels(context, duration * pick),
    ...wheels(context, duration * (land - lift), duration * lift),
    ...run(
      el(`stack-${String(move.stack)}`),
      [
        { transform: at(fromX) },
        { transform: at(fromX), offset: pick },
        { transform: at(fromX, lifted), offset: lift },
        { transform: at(toX, lifted), offset: land },
        { transform: at(toX) },
      ],
      { duration },
    ),
    ...run(
      el(`stack-${String(move.other)}`),
      [
        { transform: at(toX) },
        { transform: at(toX), offset: lift },
        { transform: at(fromX), offset: land, easing: 'ease-in-out' },
        { transform: at(fromX) },
      ],
      { duration },
    ),
  ]
}

/** "Delivered!": after the carry, the lid flips up behind the open box, the steam rises in turn,
 * and the cart bounces. */
function deliver(move: Extract<PizzaMove, { kind: 'deliver' }>, context: MoveContext): Animation[] {
  const { el, stepDelayMs, geo } = context
  const f = deliverMs(stepDelayMs) / DELIVER_MS
  const drop = DELIVER_AT.drop * f
  const id = String(move.stack)
  const hidden = { duration: drop, fill: 'none' } as const
  return [
    ...run(el(`open-${id}`), [{ opacity: 0 }, { opacity: 0 }], hidden),
    ...run(el(`closed-${id}`), [{ opacity: 1 }, { opacity: 1 }], hidden),
    ...run(
      el(`flap-${id}`),
      [
        { transform: 'scaleY(0) skewX(0deg)' },
        { transform: 'scaleY(1.15) skewX(-30deg)', offset: 0.6 },
        { transform: 'skewX(-24deg)' },
      ],
      {
        duration: DELIVER_AT.lid * f,
        delay: drop,
        easing: 'ease-out',
        fill: 'backwards',
      },
    ),
    ...STEAM_PUFFS.flatMap((_, k) =>
      run(
        el(`puff-${id}-${String(k)}`),
        [
          { opacity: 0, transform: 'translateY(6px) scale(0.4)' },
          { opacity: 1, offset: 0.4 },
          { opacity: 1, transform: 'none' },
        ],
        {
          duration: DELIVER_AT.puff * f,
          delay: (DELIVER_AT.steam + k * DELIVER_AT.puffGap) * f,
          easing: 'ease-out',
          fill: 'backwards',
        },
      ),
    ),
    ...run(
      el('bounce'),
      [{ transform: 'none' }, { transform: at(0, -2 * geo.s), offset: 0.5 }, { transform: 'none' }],
      {
        duration: DELIVER_AT.lid * f,
        delay: drop,
        iterations: 2,
      },
    ),
  ]
}

/** The finale, in full: the stacks hop in a wave, left to right; the cart bounces. */
function finale({ geo, pose, el }: MoveContext): Animation[] {
  const count = pose.order.length
  return [
    ...pose.order.flatMap((id, k) =>
      run(
        el(`hop-${String(id)}`),
        [
          { transform: 'none' },
          { transform: at(0, -3 * Math.max(1, geo.s)), offset: 0.5 },
          { transform: 'none' },
        ],
        {
          duration: FINALE_HOP_MS,
          delay: finaleHopAt(k, count),
          easing: 'ease-in-out',
        },
      ),
    ),
    ...run(
      el('bounce'),
      [{ transform: 'none' }, { transform: at(0, -5 * geo.s), offset: 0.5 }, { transform: 'none' }],
      {
        duration: FINALE_MS / 4,
        iterations: 4,
        easing: 'ease-out',
      },
    ),
  ]
}

/**
 * The cart's mood over the step: each of its frames shows in turn, the last one resting. A
 * frequent mood starts with the step; "Delivered!" starts as the leader lands (until then its
 * first frame shows).
 */
function moodAnimations(
  mood: Mood,
  moves: readonly PizzaMove[],
  context: MoveContext,
): Animation[] {
  const { el, stepDelayMs } = context
  const timed: readonly MoodFrame[] = moodFrames(mood, stepDelayMs)
  const start = moves.some((m) => m.kind === 'deliver')
    ? DELIVER_AT.drop * (deliverMs(stepDelayMs) / DELIVER_MS)
    : 0
  const animations: Animation[] = []
  let t = start
  timed.forEach((frame, k) => {
    const last = k === timed.length - 1
    if (last) {
      if (t > 0)
        animations.push(
          ...run(el(`mood-${String(k)}`), [{ opacity: 0 }, { opacity: 0 }], { duration: t }),
        )
      return
    }
    const from = k === 0 ? 0 : t
    t += frame.ms
    if (t > from)
      animations.push(
        ...run(el(`mood-${String(k)}`), [{ opacity: 1 }, { opacity: 1 }], {
          duration: t - from,
          delay: from,
        }),
      )
  })
  return animations
}
