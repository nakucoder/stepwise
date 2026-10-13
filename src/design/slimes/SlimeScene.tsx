/**
 * TEMPORARY (design/slimes, never merged): draws one step of the run for a design, from its
 * layout (layout.ts), as positioned pieces in the stage field. Stepping forward or back moves
 * every value and every holder from where it was (each by its key); a value taken into the new
 * group hops up from its lane. Each design's special move is a CSS animation that starts when
 * its piece appears. Reduced motion: no movement, final poses only.
 */
import { useLayoutEffect, useMemo, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { sceneOf, type Body, type Design, type Token } from './layout'
import type { SortStep } from './run'

/** A slime's eyes: two white squares, the pupils turned to where it looks. */
function Eyes({ s, look }: { readonly s: number; readonly look: Token['look'] }) {
  const dy = look === 'down' ? 1 : look === 'up' ? -1 : 0
  return (
    <svg
      className="slime-eyes"
      width={9 * s}
      height={4 * s}
      viewBox="0 0 9 4"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x={0} y={0} width={3} height={4} className="eye-white" />
      <rect x={6} y={0} width={3} height={4} className="eye-white" />
      <rect x={1} y={1 + dy} width={2} height={2} className="eye-dark" />
      <rect x={7} y={1 + dy} width={2} height={2} className="eye-dark" />
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

/** The object above the plate: the slime, the crates, the molded piece. */
function Thing({
  design,
  t,
  s,
}: {
  readonly design: Design
  readonly t: Token
  readonly s: number
}) {
  if (t.bodyH === 0) return null
  const style = {
    width: px(t.bodyW),
    height: px(t.bodyH),
    '--unit': px(t.crates > 0 ? t.bodyH / t.crates : t.bodyH),
  } as CSSProperties
  return (
    <span className={`thing thing-${design}${t.crates > 0 ? ' has-crates' : ''}`} style={style}>
      {design === 'slimes' && t.bodyH >= 7 * s && (
        <span className="slime-face">
          <Eyes s={s} look={t.look} />
        </span>
      )}
    </span>
  )
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
        // The value taken into the new group hops up from its lane; A's slimes hop everywhere
        // (apart at a split, down onto the lanes); B's cars roll and C's pieces ride, straight.
        const taken = key === `t:${String(step.moved)}`
        const hops = taken || (design === 'slimes' && key.startsWith('t:'))
        const lift = Math.max(0, Math.min(from.y, to.y) - scene.s * (taken ? 10 : 5))
        run.push(
          node.animate(
            [
              { left: px(from.x), top: px(from.y), width: px(from.w), height: px(from.h) },
              ...(hops ? [{ left: px((from.x + to.x) / 2), top: px(lift), offset: 0.5 }] : []),
              { left: px(to.x), top: px(to.y), width: px(to.w), height: px(to.h) },
            ],
            { duration: durationMs, easing: 'ease-in-out' },
          ),
        )
      }
    }
    before.current = now
    return () => {
      for (const animation of run) animation.cancel()
    }
  }, [scene, motion, durationMs, step, design])

  // A's special move: the new group bounces in a wave, smallest to biggest (and all at the end).
  const wave = new Map<number, number>()
  if (step.event === 'merged' || step.event === 'finale') {
    const f = step.family
    const group =
      step.event === 'finale'
        ? step.groups[0]
        : step.groups.find((g) => f !== null && g.lo === f.lo && g.hi === f.hi)
    group?.values.forEach((v, k) => wave.set(v, k))
  }

  const { s } = scene
  return (
    <div
      ref={root}
      className={[
        'slime-stage',
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
        const k = wave.get(t.value)
        return (
          <div
            key={t.value}
            data-key={`t:${String(t.value)}`}
            className={[
              'token',
              `row-${t.row}`,
              t.role && `is-${t.role}`,
              k !== undefined && `is-${step.event}`,
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ ...boxStyle(t), ...(k !== undefined ? { '--k': String(k) } : {}) }}
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
            <Thing design={design} t={t} s={s} />
            <span className="plate">{t.value}</span>
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
