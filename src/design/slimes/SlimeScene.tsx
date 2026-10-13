/**
 * TEMPORARY (design/slimes, never merged): draws one step of the run for a design, from its
 * layout (layout.ts), as positioned pieces on a starfield. Stepping forward or back flies every
 * ship from where it was (each by its key), along its design's own path:
 * A. a module docks by rising to the frame's mouth, then sliding back into its place;
 * B. a fighter flies up through the gate, then veers into its column; a split peels sideways;
 * C. every pod that changes arm goes through the station: in, along it, and out again.
 * Each design's special move is a CSS animation that starts when its piece appears. Reduced
 * motion: no movement, final poses only.
 */
import { useLayoutEffect, useMemo, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { spritePath } from '../../characters/pixel'
import { sceneOf, type Body, type Design, type Scene, type Token } from './layout'
import type { SortStep } from './run'

/** B's fighter, facing up, 9 × 9: o outline, h hull, a wing stripe, r engine glow. */
const FIGHTER = [
  '....o....',
  '...oho...',
  '..ohhho..',
  '.ohhhhho.',
  'ohhhhhhho',
  'oahhhhhao',
  'ohhhhhhho',
  'oo.ooo.oo',
  '.r.....r.',
] as const
const FIGHTER_PATHS = {
  outline: spritePath(FIGHTER, 'o'),
  hull: spritePath(FIGHTER, 'h'),
  wing: spritePath(FIGHTER, 'a'),
  glow: spritePath(FIGHTER, 'r'),
}

function Fighter() {
  return (
    <svg
      className="fighter"
      viewBox="0 0 9 9"
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d={FIGHTER_PATHS.hull} className="fighter-hull" />
      <path d={FIGHTER_PATHS.wing} className="fighter-wing" />
      <path d={FIGHTER_PATHS.glow} className="fighter-glow" />
      <path d={FIGHTER_PATHS.outline} className="fighter-outline" />
    </svg>
  )
}

interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

interface SceneProps {
  readonly design: Design
  readonly step: SortStep
  readonly width: number
  readonly height: number
  readonly count: number
  readonly motion: boolean
  readonly durationMs: number
  /** Do it: badge the two fronts L and R, and let a tap on one answer. */
  readonly sides?: boolean
  readonly onPick?: (side: 'left' | 'right') => void
  readonly label: string
}

const px = (n: number) => `${String(n)}px`
const boxStyle = (r: Rect): CSSProperties => ({
  left: px(r.x),
  top: px(r.y),
  width: px(r.w),
  height: px(r.h),
})
type Frame = Keyframe & { left?: string; top?: string }
const at = (x: number, y: number, offset?: number): Frame => ({
  left: px(Math.round(x)),
  top: px(Math.round(y)),
  ...(offset === undefined ? {} : { offset }),
})

/** Each design's own flight from one pose to the next. */
function flight(design: Design, scene: Scene, from: Rect, to: Rect, taken: boolean): Frame[] {
  const size = (r: Rect): Frame => ({ width: px(r.w), height: px(r.h) })
  const start = { ...at(from.x, from.y), ...size(from) }
  const end = { ...at(to.x, to.y), ...size(to) }
  if (design === 'mothership' && taken) {
    // Rise (or drop) to the frame's mouth, then slide back into place.
    return [start, at(from.x, to.y, 0.45), end]
  }
  if (design === 'squadrons') {
    if (taken) return [start, at(from.x, from.y + (to.y - from.y) * 0.7, 0.5), end]
    // A split peels sideways first, then drops into the new row.
    if (from.y !== to.y && from.x !== to.x) {
      return [start, at(to.x, from.y + (to.y - from.y) * 0.25, 0.5), end]
    }
  }
  if (design === 'station' && from.y !== to.y && from.x !== to.x) {
    const hx = Math.max(0, scene.hubX - from.w / 2)
    return [start, at(hx, from.y, 0.3), at(hx, to.y, 0.6), end]
  }
  return [start, end]
}

/** What a value looks like: a module, a fighter, or a pod; the number is on it. */
function Ship({ design }: { readonly design: Design }) {
  if (design === 'squadrons') return <Fighter />
  if (design === 'mothership') return <span className="module-windows" aria-hidden="true" />
  return <span className="pod-port" aria-hidden="true" />
}

export function SlimeScene(props: SceneProps) {
  const { design, step, width, height, count, motion, durationMs } = props
  const scene = useMemo(
    () => sceneOf(design, step, { width, height }, count),
    [design, step, width, height, count],
  )
  const root = useRef<HTMLDivElement>(null)
  const before = useRef(new Map<string, Rect>())

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const now = new Map<string, Rect>()
    for (const b of scene.bodies) now.set(`b:${b.key}`, b)
    for (const t of scene.tokens) now.set(`t:${String(t.value)}`, t)
    const run: Animation[] = []
    if (motion && typeof el.animate === 'function') {
      for (const node of el.querySelectorAll<HTMLElement>('[data-key]')) {
        const key = node.dataset.key ?? ''
        const to = now.get(key)
        if (!to) continue
        const from = before.current.get(key)
        if (!from) {
          run.push(
            node.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: durationMs * 0.6,
              easing: 'ease-out',
            }),
          )
          continue
        }
        if (from.x === to.x && from.y === to.y && from.w === to.w && from.h === to.h) continue
        const taken = key === `t:${String(step.moved)}`
        run.push(
          node.animate(flight(design, scene, from, to, taken), {
            duration: durationMs,
            easing: 'ease-in-out',
          }),
        )
      }
    }
    before.current = now
    return () => {
      for (const animation of run) animation.cancel()
    }
  }, [scene, motion, durationMs, step, design])

  const { s } = scene
  return (
    <div
      ref={root}
      className={[
        'space-stage',
        `design-${design}`,
        `mode-${scene.mode}`,
        `event-${step.event}`,
      ].join(' ')}
      style={
        {
          width: px(width),
          height: px(height),
          '--font': px(scene.font),
          '--s': px(s),
          '--stage-w': px(width),
          '--stage-h': px(height),
          '--duration': `${String(durationMs)}ms`,
        } as CSSProperties
      }
      role="img"
      aria-label={props.label}
    >
      {scene.bodies.map((b: Body) => (
        <div
          key={b.key}
          data-key={`b:${b.key}`}
          className={`body body-${b.kind}`}
          style={boxStyle(b)}
        />
      ))}
      {scene.tokens.map((t: Token) => {
        const tappable = props.sides && t.side !== null && props.onPick
        return (
          <div
            key={t.value}
            data-key={`t:${String(t.value)}`}
            className={['token', `ship-${design}`, `part-${t.part}`, t.role && `is-${t.role}`]
              .filter(Boolean)
              .join(' ')}
            style={{ ...boxStyle(t), '--k': String(t.order) } as CSSProperties}
            {...(tappable
              ? {
                  role: 'button',
                  tabIndex: 0,
                  'aria-label': `${String(t.value)}, the ${t.side} front`,
                  onClick: () => {
                    if (t.side) props.onPick?.(t.side)
                  },
                  onKeyDown: (event: KeyboardEvent) => {
                    if ((event.key === 'Enter' || event.key === ' ') && t.side) {
                      event.preventDefault()
                      props.onPick?.(t.side)
                    }
                  },
                }
              : {})}
          >
            <Ship design={design} />
            <span className="ship-number">{t.value}</span>
            {props.sides && t.side && (
              <span className={`side-badge is-${t.side}`} aria-hidden="true">
                {t.side === 'left' ? 'L' : 'R'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
