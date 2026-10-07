import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { Algorithm, Frame, HighlightRole, Level } from '../engine/types'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { SPLASH_AT, swapDurationMs } from '../lib/motion'
import { swappedPair } from '../lib/swappedPair'
import type { StageLook } from '../characters/registry'
import { PixelDuck } from './PixelDuck'
import { StagePicks, type StagePick } from './StagePicks'
import './Stage.css'
import './StageDucks.css'

/** When a bar has several roles, show the most specific one. */
const ROLE_PRIORITY: readonly HighlightRole[] = ['swapping', 'comparing', 'pivot', 'sorted']

/** Every role color is paired with words, so color is never the only signal. */
const ROLE_LABELS: Readonly<Record<HighlightRole, Readonly<Record<Level, string>>>> = {
  comparing: { engineer: 'comparing', explorer: 'looking' },
  swapping: { engineer: 'swapping', explorer: 'trading' },
  sorted: { engineer: 'sorted', explorer: 'done ✓' },
  pivot: { engineer: 'pivot', explorer: 'leader' },
}

/** With this many values the words don't fit under each duck; symbols do (the key explains). */
const DUCK_SYMBOLS_FROM = 9
const DUCK_SYMBOLS: Readonly<Record<HighlightRole, string>> = {
  comparing: '?',
  swapping: '⇄',
  sorted: '✓',
  pivot: '★',
}

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

/**
 * Ducks: the two columns slide past each other on the riverbed while the duck now on the
 * right (the bigger value) hops over the other duck from in front, then splashes down.
 */
function duckSwap(
  refs: {
    readonly columns: readonly (HTMLSpanElement | null)[]
    readonly ducks: readonly (HTMLSpanElement | null)[]
    readonly splashes: readonly (HTMLSpanElement | null)[]
  },
  left: number,
  right: number,
  distance: number,
  duration: number,
): Animation[] {
  const leftColumn = refs.columns[left]
  const rightColumn = refs.columns[right]
  const hopper = refs.ducks[right]
  const splash = refs.splashes[right]
  if (!leftColumn || !rightColumn) return []
  const slide = { duration, easing: 'ease-in-out' }
  const animations = [
    // As with bars, the smaller value slides in front; the bigger one's duck hops above it.
    leftColumn.animate(
      [
        { transform: `translateX(${String(distance)}px)`, zIndex: 2 },
        { transform: 'none', zIndex: 2 },
      ],
      slide,
    ),
    rightColumn.animate(
      [
        { transform: `translateX(${String(-distance)}px)`, zIndex: 1 },
        { transform: 'none', zIndex: 1 },
      ],
      slide,
    ),
  ]
  if (hopper) {
    const hop = Math.max(24, hopper.getBoundingClientRect().height * 1.2)
    animations.push(
      hopper.animate(
        [
          { transform: 'none' },
          { transform: `translateY(${String(-hop)}px)`, offset: 0.45 },
          { transform: 'none' },
        ],
        { duration, easing: 'ease-in-out' },
      ),
    )
  }
  if (splash) {
    // The splash plays as the duck lands, and runs a little past the swap.
    animations.push(
      splash.animate(
        [
          { opacity: 1, transform: 'scale(0.4)' },
          { opacity: 0, transform: 'scale(1.5)' },
        ],
        {
          duration: Math.max(260, duration * 0.8),
          delay: duration * SPLASH_AT,
          easing: 'ease-out',
        },
      ),
    )
  }
  return animations
}

interface StageProps {
  readonly frame: Frame
  readonly level: Level
  readonly pointerLabels?: Algorithm['pointerLabels']
  /** The player's current delay between steps, so a swap always finishes in time. */
  readonly stepDelayMs: number
  /** A short caption above the bars, e.g. "pass i = 1" or "round 2". */
  readonly caption?: string | null
  /** Bars, or the algorithm's character (only the ducks have a renderer yet). Same data. */
  readonly look?: StageLook
  /** Controls for the top-right corner, beside the caption (the Bars / Ducks switch). */
  readonly toolbar?: ReactNode
  /** Engineer's Do it mode: the values become buttons to pick and swap. */
  readonly pick?: StagePick
}

/**
 * The bars on the blueprint stage. Under each bar: its position (Engineer), any pointer
 * tags, and a word for its role. When two bars trade places between frames (forward or
 * back), they slide into each other's spots; motion explains the swap and is skipped when
 * the user prefers reduced motion.
 *
 * With the ducks look each bar is a column of water with a duck on a lily pad. When two trade
 * places the columns slide past each other while the bigger value's duck hops over the other
 * duck and splashes down; when everything is sorted the ducks bob, left to right.
 */
export function Stage({
  frame,
  level,
  pointerLabels,
  stepDelayMs,
  caption,
  look = 'bars',
  toolbar,
  pick,
}: StageProps) {
  const { array } = frame
  // The character on the stage, if one is showing. Only the ducks have a renderer so far; a
  // character without one is drawn as bars.
  const character = look === 'bars' ? null : look
  const isDucks = character === 'ducks'
  const barRefs = useRef<(HTMLSpanElement | null)[]>([])
  const duckRefs = useRef<(HTMLSpanElement | null)[]>([])
  const splashRefs = useRef<(HTMLSpanElement | null)[]>([])
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
    const duration = swapDurationMs(stepDelayMs)
    const timing = { duration, easing: 'ease-in-out' }

    if (isDucks) {
      const animations = duckSwap(
        { columns: barRefs.current, ducks: duckRefs.current, splashes: splashRefs.current },
        left,
        right,
        distance,
        duration,
      )
      return () => {
        for (const animation of animations) animation.cancel()
      }
    }

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
  }, [array, reducedMotion, stepDelayMs, isDucks])

  const largest = Math.max(1, ...array.map((value) => Math.abs(value)))
  // When every value is in its final spot, the ducks bob for joy (not with reduced motion).
  const allSorted = (frame.highlights.sorted?.length ?? 0) === array.length && array.length > 0
  const celebrating = isDucks && allSorted && !reducedMotion
  const useSymbols = isDucks && array.length >= DUCK_SYMBOLS_FROM

  const viewClass = [
    'stage-view',
    isDucks && 'is-ducks',
    celebrating && 'is-celebrating',
    // Many values: smaller tags under each one, so neighbors don't collide.
    array.length >= DUCK_SYMBOLS_FROM && 'is-crowded',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={viewClass} style={{ '--count': array.length } as CSSProperties}>
      <p className="visually-hidden">{describe(frame, level)}</p>
      <div className="stage-top">
        <p className="stage-caption" aria-hidden="true">
          {caption}
        </p>
        {toolbar}
      </div>

      <div className="stage-plot">
        <div className="stage-field">
          <div className="stage-bars" aria-hidden="true">
            {array.map((value, index) => {
              const role = roleAt(frame, index)
              if (isDucks) {
                return (
                  <div key={index} className="stage-slot" style={{ '--i': index } as CSSProperties}>
                    <span
                      ref={(element) => {
                        barRefs.current[index] = element
                      }}
                      className={role ? `duck-column is-${role}` : 'duck-column'}
                      style={{ '--h': Math.abs(value) / largest } as CSSProperties}
                    >
                      <span className="duck-ring" />
                      <span className="duck-pad" />
                      <span
                        ref={(element) => {
                          duckRefs.current[index] = element
                        }}
                        className="duck"
                      >
                        <PixelDuck />
                      </span>
                      <span
                        ref={(element) => {
                          splashRefs.current[index] = element
                        }}
                        className="duck-splash"
                      >
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="stage-bar-label">{value}</span>
                    </span>
                  </div>
                )
              }
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
        </div>

        <div className="stage-axis" aria-hidden="true">
          {array.map((_, index) => {
            const role = roleAt(frame, index)
            const pointers = Object.entries(frame.pointers ?? {})
              .filter(([, at]) => at === index)
              .map(([name]) => pointerLabels?.[name]?.[level] ?? name)
            return (
              // The slot measures its own width (a container), so its tags can go compact.
              <div key={index} className="stage-mark-slot">
                <div className="stage-marks">
                  {level === 'engineer' && <span className="stage-index">{index}</span>}
                  {pointers.map((label) => (
                    <span
                      key={label}
                      // A long word ("checking") gets smaller in a narrow column (Stage.css).
                      className={label.length > 5 ? 'stage-pointer is-long' : 'stage-pointer'}
                    >
                      {label}
                    </span>
                  ))}
                  {role && (
                    <span className={`stage-role is-${role}`}>
                      {useSymbols ? DUCK_SYMBOLS[role] : ROLE_LABELS[role][level]}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {pick && <StagePicks {...pick} />}
      </div>
    </div>
  )
}
