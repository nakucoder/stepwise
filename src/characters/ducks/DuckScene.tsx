import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { PixelDuck } from '../../components/PixelDuck'
import { roleAt } from '../../components/stageRoles'
import { SPLASH_AT, swapDurationMs } from '../../lib/motion'
import { swappedPair } from '../../lib/swappedPair'
import type { SceneProps } from '../registry'

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

/**
 * Bubble sort's ducks ("Bath time"): each value is a column of water with a duck on a lily pad.
 * When two trade places the columns slide past each other while the bigger value's duck hops
 * over the other duck and splashes down. The bob when everything is sorted is the stage view's
 * `is-celebrating` (the registry's `viewClass`), and the CSS is StageDucks.css.
 */
export function DuckScene({ frame, stepDelayMs, reducedMotion }: SceneProps) {
  const { array } = frame
  const columnRefs = useRef<(HTMLSpanElement | null)[]>([])
  const duckRefs = useRef<(HTMLSpanElement | null)[]>([])
  const splashRefs = useRef<(HTMLSpanElement | null)[]>([])
  const previousArray = useRef(array)

  useLayoutEffect(() => {
    const previous = previousArray.current
    previousArray.current = array
    const pair = swappedPair(previous, array)
    if (!pair || reducedMotion) return

    const [left, right] = pair
    const leftColumn = columnRefs.current[left]
    const rightColumn = columnRefs.current[right]
    if (!leftColumn || !rightColumn || typeof leftColumn.animate !== 'function') return

    // Each column now shows the other's old value, so start each one at the other's place.
    const distance =
      rightColumn.getBoundingClientRect().left - leftColumn.getBoundingClientRect().left
    const animations = duckSwap(
      { columns: columnRefs.current, ducks: duckRefs.current, splashes: splashRefs.current },
      left,
      right,
      distance,
      swapDurationMs(stepDelayMs),
    )
    return () => {
      for (const animation of animations) animation.cancel()
    }
  }, [array, reducedMotion, stepDelayMs])

  const largest = Math.max(1, ...array.map((value) => Math.abs(value)))
  return (
    <div className="stage-bars" aria-hidden="true">
      {array.map((value, index) => {
        const role = roleAt(frame, index)
        return (
          <div key={index} className="stage-slot" style={{ '--i': index } as CSSProperties}>
            <span
              ref={(element) => {
                columnRefs.current[index] = element
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
      })}
    </div>
  )
}
