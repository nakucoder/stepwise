import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { Algorithm, Frame, HighlightRole, Level } from '../engine/types'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { swappedPair } from '../lib/swappedPair'
import './Stage.css'

/** When a bar has several roles, show the most specific one. */
const ROLE_PRIORITY: readonly HighlightRole[] = ['swapping', 'comparing', 'pivot', 'sorted']

/** Every role color is paired with words, so color is never the only signal. */
const ROLE_LABELS: Readonly<Record<HighlightRole, Readonly<Record<Level, string>>>> = {
  comparing: { engineer: 'comparing', explorer: 'looking' },
  swapping: { engineer: 'swapping', explorer: 'trading' },
  sorted: { engineer: 'sorted', explorer: 'done ✓' },
  pivot: { engineer: 'pivot', explorer: 'leader' },
}

/** The longest a swap may take, so it never drags at slow speeds. */
const MAX_SWAP_MS = 450
/** How high the bar moving right lifts as it passes over the other one. */
const SWAP_LIFT_PX = 24

function roleAt(frame: Frame, index: number): HighlightRole | null {
  return ROLE_PRIORITY.find((role) => frame.highlights[role]?.includes(index)) ?? null
}

function describe(frame: Frame, level: Level): string {
  const values = frame.array
  const at = (role: HighlightRole) => frame.highlights[role] ?? []
  const valuesAt = (indices: readonly number[]) =>
    indices.map((k) => String(values[k])).join(' and ')
  const parts = [`${level === 'explorer' ? 'Numbers' : 'Array'}: ${values.join(', ')}.`]
  if (at('swapping').length > 0) parts.push(`Trading places: ${valuesAt(at('swapping'))}.`)
  else if (at('comparing').length > 0) parts.push(`Comparing ${valuesAt(at('comparing'))}.`)
  if (at('sorted').length > 0) {
    parts.push(
      at('sorted').length === values.length
        ? 'All numbers are in their final spots.'
        : `In their final spots: ${at('sorted')
            .map((k) => String(values[k]))
            .join(', ')}.`,
    )
  }
  return parts.join(' ')
}

interface StageProps {
  readonly frame: Frame
  readonly level: Level
  readonly pointerLabels?: Algorithm['pointerLabels']
  /** The player's current delay between steps, so a swap always finishes in time. */
  readonly stepDelayMs: number
  /** A short caption above the bars, e.g. "pass i = 1" or "round 2". */
  readonly caption?: string | null
}

/**
 * The bars on the blueprint stage. Under each bar: its position (Engineer), any pointer
 * tags, and a word for its role. When two bars trade places between frames (forward or
 * back), they slide into each other's spots; motion explains the swap and is skipped when
 * the user prefers reduced motion.
 */
export function Stage({ frame, level, pointerLabels, stepDelayMs, caption }: StageProps) {
  const { array } = frame
  const barRefs = useRef<(HTMLSpanElement | null)[]>([])
  const previousArray = useRef(array)
  const reducedMotion = useReducedMotion()

  useLayoutEffect(() => {
    const previous = previousArray.current
    previousArray.current = array
    const pair = swappedPair(previous, array)
    if (!pair || reducedMotion) return

    const [left, right] = pair
    const leftBar = barRefs.current[left]
    const rightBar = barRefs.current[right]
    if (!leftBar || !rightBar || typeof leftBar.animate !== 'function') return

    // Each bar now shows the other's old value, so start each one at the other's place.
    const distance = rightBar.getBoundingClientRect().left - leftBar.getBoundingClientRect().left
    const timing = { duration: Math.min(MAX_SWAP_MS, stepDelayMs * 0.6), easing: 'ease-in-out' }
    const animations = [
      // The value moving left stays in front, so both stay visible as they pass...
      leftBar.animate(
        [
          { transform: `translateX(${String(distance)}px)`, zIndex: 2 },
          { transform: 'none', zIndex: 2 },
        ],
        timing,
      ),
      // ...while the value moving right hops over it from behind.
      rightBar.animate(
        [
          { transform: `translateX(${String(-distance)}px)`, zIndex: 1 },
          {
            transform: `translate(${String(-distance / 2)}px, ${String(-SWAP_LIFT_PX)}px)`,
            zIndex: 1,
          },
          { transform: 'none', zIndex: 1 },
        ],
        timing,
      ),
    ]
    return () => {
      for (const animation of animations) animation.cancel()
    }
  }, [array, reducedMotion, stepDelayMs])

  const largest = Math.max(1, ...array.map((value) => Math.abs(value)))

  return (
    <div className="stage-view" style={{ '--count': array.length } as CSSProperties}>
      <p className="visually-hidden">{describe(frame, level)}</p>
      <p className="stage-caption" aria-hidden="true">
        {caption}
      </p>

      <div className="stage-bars" aria-hidden="true">
        {array.map((value, index) => {
          const role = roleAt(frame, index)
          return (
            <div key={index} className="stage-slot">
              <span
                ref={(element) => {
                  barRefs.current[index] = element
                }}
                className={['stage-bar', role && `is-${role}`, value === 0 && 'is-zero']
                  .filter(Boolean)
                  .join(' ')}
                style={{ '--h': Math.abs(value) / largest } as CSSProperties}
              >
                <span className="stage-bar-label">{value}</span>
              </span>
            </div>
          )
        })}
      </div>

      <div className="stage-axis" aria-hidden="true">
        {array.map((_, index) => {
          const role = roleAt(frame, index)
          const pointers = Object.entries(frame.pointers ?? {})
            .filter(([, at]) => at === index)
            .map(([name]) => pointerLabels?.[name]?.[level] ?? name)
          return (
            <div key={index} className="stage-marks">
              {level === 'engineer' && <span className="stage-index">{index}</span>}
              {pointers.map((label) => (
                <span key={label} className="stage-pointer">
                  {label}
                </span>
              ))}
              {role && <span className={`stage-role is-${role}`}>{ROLE_LABELS[role][level]}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
