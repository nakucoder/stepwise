/**
 * TEMPORARY (design/slimes, never merged): draws one step of the run for a design, from its
 * layout (layout.ts), as positioned pieces in the stage field. Stepping forward or back moves
 * every slime and number from where it was (each by its key); a split's halves come out of
 * their parent; a value moving into the merged slime hops over. Reduced motion: no movement.
 */
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import { spritePath } from '../../characters/pixel'
import {
  EYES_H,
  sceneOf,
  SLIME_H,
  SLIME_W,
  type Body,
  type Design,
  type Look,
  type Token,
} from './layout'
import type { SortStep } from './run'

/** B's little slime, 10 × 8: o outline, g body, l shine, w eye white, e pupil, m mouth. */
const SLIME = [
  '...oooo...',
  '.oolgggoo.',
  'olgggggggo',
  'ogwegggweo',
  'oggggggggo',
  'ogggmmgggo',
  'oggggggggo',
  '.oooooooo.',
] as const
const SLIME_PATHS = {
  outline: spritePath(SLIME, 'o'),
  body: spritePath(SLIME, 'g'),
  shine: spritePath(SLIME, 'l'),
  white: spritePath(SLIME, 'w'),
  dark: spritePath(SLIME, 'e', 'm'),
}

function Sprite({ s, look }: { readonly s: number; readonly look: Look }) {
  const shift =
    look === 'right' ? 'translate(1px, 0)' : look === 'left' ? 'translate(-1px, 0)' : undefined
  return (
    <svg
      className="slime-sprite"
      width={SLIME_W * s}
      height={SLIME_H * s}
      viewBox={`0 0 ${String(SLIME_W)} ${String(SLIME_H)}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d={SLIME_PATHS.body} className="sprite-body" />
      <path d={SLIME_PATHS.shine} className="sprite-shine" />
      <path d={SLIME_PATHS.white} className="sprite-white" />
      <g style={shift ? { transform: shift } : undefined}>
        <path d={SLIME_PATHS.dark} className="sprite-dark" />
      </g>
      <path d={SLIME_PATHS.outline} className="sprite-outline" />
    </svg>
  )
}

/** A blob's eyes: two white squares, the pupils turned to where it looks. */
function Eyes({ s, look }: { readonly s: number; readonly look: Look }) {
  const dx = look === 'right' ? 1 : look === 'left' ? -1 : 0
  return (
    <svg
      className="blob-eyes"
      width={12 * s}
      height={EYES_H * s}
      viewBox={`0 0 12 ${String(EYES_H)}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x={1} y={0} width={3} height={3} className="sprite-white" />
      <rect x={8} y={0} width={3} height={3} className="sprite-white" />
      <rect x={2 + dx} y={1} width={1} height={2} className="sprite-dark" />
      <rect x={9 + dx} y={1} width={1} height={2} className="sprite-dark" />
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
        const born = key.startsWith('b:') ? step.bornFrom[key.slice(2)] : undefined
        const from = before.current.get(key) ?? (born ? before.current.get(`b:${born}`) : undefined)
        if (!from) {
          run.push(
            node.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: durationMs,
              easing: 'ease-out',
            }),
          )
          continue
        }
        if (from.x === to.x && from.y === to.y && from.w === to.w && from.h === to.h) continue
        const hops = key === `t:${String(step.moved)}`
        const lift = Math.min(from.y, to.y) - Math.max(8, height * 0.08)
        run.push(
          node.animate(
            [
              { left: px(from.x), top: px(from.y), width: px(from.w), height: px(from.h) },
              ...(hops
                ? [{ left: px((from.x + to.x) / 2), top: px(Math.max(0, lift)), offset: 0.5 }]
                : []),
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
  }, [scene, motion, durationMs, step, height])

  const { s } = scene
  return (
    <div
      ref={root}
      className={`slime-stage design-${design} mode-${scene.mode}${step.event === 'compare' ? ' is-comparing' : ''}`}
      style={
        {
          width: px(width),
          height: px(height),
          '--font': px(scene.font),
          '--s': px(s),
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
        >
          {b.kind === 'blob' && <span className="blob-fill" />}
          {b.kind === 'blob' && b.look !== undefined && (
            <span className="blob-face">
              <Eyes s={s} look={b.look} />
            </span>
          )}
        </div>
      ))}
      {scene.tokens.map((t: Token) => {
        const tappable = props.sides && t.side !== null && props.onPick
        return (
          <div
            key={t.value}
            data-key={`t:${String(t.value)}`}
            className={[
              'token',
              t.role && `is-${t.role}`,
              t.slime && 'is-slime',
              t.side && step.event === 'compare' && `is-front-${t.side}`,
            ]
              .filter(Boolean)
              .join(' ')}
            style={boxStyle(t)}
            {...(tappable
              ? {
                  role: 'button',
                  tabIndex: 0,
                  'aria-label': `${String(t.value)}, the ${t.side} front`,
                  onClick: () => {
                    if (t.side) props.onPick?.(t.side)
                  },
                }
              : {})}
          >
            {t.slime && <Sprite s={s} look={t.look} />}
            <span className="token-number">{t.value}</span>
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
