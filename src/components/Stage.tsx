import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Algorithm, BufferRow, Frame, HighlightRole, Level, SpanStep } from '../engine/types'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { SPLASH_AT, swapDurationMs } from '../lib/motion'
import { swappedPair } from '../lib/swappedPair'
import type { StageLook } from '../characters/registry'
import { PenguinScene } from '../characters/penguins/PenguinScene'
import { RobotScene } from '../characters/robot/RobotScene'
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

/**
 * With this many values the words don't fit under each duck; symbols do (the key explains).
 * Looking has no character: its tag draws an eye (Stage.css).
 */
const DUCK_SYMBOLS_FROM = 9
const DUCK_SYMBOLS: Readonly<Record<HighlightRole, string>> = {
  comparing: '',
  swapping: '⇄',
  sorted: '✓',
  pivot: '★',
}

/** How high the bar moving right lifts as it passes over the other one. */
const SWAP_LIFT_PX = 24

function roleAt(
  row: { readonly highlights?: Frame['highlights'] },
  index: number,
): HighlightRole | null {
  return ROLE_PRIORITY.find((role) => row.highlights?.[role]?.includes(index)) ?? null
}

/** What the stage shows, in words. `rows`: whether it draws the buffer and empty slots (bars). */
function describe(frame: Frame, level: Level, rows: boolean): string {
  const values = frame.array
  const at = (role: HighlightRole) => frame.highlights[role] ?? []
  const valuesAt = (indices: readonly number[]) =>
    indices.map((k) => String(values[k])).join(' and ')
  const vacant = new Set(rows ? (frame.vacant ?? []) : [])
  const shown =
    vacant.size > 0 ? values.map((v, k) => (vacant.has(k) ? 'empty' : String(v))) : values
  const parts = [`${level === 'explorer' ? 'Numbers' : 'Array'}: ${shown.join(', ')}.`]
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
  if (rows && frame.span) parts.push(describeSpan(frame.span, level))
  if (rows && frame.buffer) parts.push(describeBuffer(frame.buffer, level))
  return parts.join(' ')
}

/** Merge sort's split or merge in progress, for screen readers (the caption is hidden from them). */
function describeSpan(span: SpanStep, level: Level): string {
  const { lo, mid, hi } = span
  const s = String
  if (span.event === 'split') {
    return level === 'explorer'
      ? `Split ${s(hi - lo)} into ${s(mid - lo)} and ${s(hi - mid)}.`
      : `Split [${s(lo)}..${s(hi)}) at ${s(mid)}.`
  }
  return level === 'explorer'
    ? `Putting ${s(mid - lo)} and ${s(hi - mid)} back together.`
    : `Merging [${s(lo)}..${s(mid)}) and [${s(mid)}..${s(hi)}).`
}

/**
 * Merge sort's brackets under the main row: at a split, one under each half; while a part is
 * merged, one under the whole part. Grid columns, like the bars (lo + 1 to hi + 1).
 */
function spanBrackets(span: SpanStep | undefined): { key: string; from: number; to: number }[] {
  if (!span) return []
  const { lo, mid, hi } = span
  return span.event === 'split'
    ? [
        { key: `${String(lo)}-${String(mid)}`, from: lo, to: mid },
        { key: `${String(mid)}-${String(hi)}`, from: mid, to: hi },
      ]
    : [{ key: `${String(lo)}-${String(hi)}`, from: lo, to: hi }]
}

/** The second row, for screen readers: only when a frame has one. */
function describeBuffer(buffer: BufferRow, level: Level): string {
  const slots = buffer.values.map((v) => (v === null ? 'empty' : String(v)))
  const name = level === 'explorer' ? 'Waiting row' : 'Buffer'
  const comparing = buffer.highlights?.comparing ?? []
  const looking =
    comparing.length > 0
      ? ` ${level === 'explorer' ? 'Looking at' : 'Comparing'} ${comparing
          .map((k) => String(buffer.values[k] ?? 'empty'))
          .join(' and ')} in it.`
      : ''
  return `${name}: ${slots.join(', ')}.${looking}`
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
  readonly pointerShortLabels?: Algorithm['pointerShortLabels']
  /**
   * The most pointers that ever share one value in this run (selection sort's "front" and
   * "smallest": 2). Narrow columns reserve that many rows, so the bars never jump.
   */
  readonly pointerRows?: number
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
  /** The whole run and the frame on screen: the robots follow the run, not just one frame. */
  readonly timeline?: { readonly frames: readonly Frame[]; readonly index: number }
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
  pointerShortLabels,
  pointerRows = 1,
  stepDelayMs,
  caption,
  look = 'bars',
  toolbar,
  pick,
  timeline,
}: StageProps) {
  const { array } = frame
  // The character on the stage, if one is showing. Only the ducks have a renderer so far; a
  // character without one is drawn as bars.
  const character = look === 'bars' ? null : look
  const isDucks = character === 'ducks'
  // Selection sort's robots draw the whole scene themselves (src/characters/robot).
  const isRobot = character === 'robot' && timeline !== undefined
  // Insertion sort's penguins, the same way (src/characters/penguins).
  const isPenguins = character === 'penguins' && timeline !== undefined
  const barRefs = useRef<(HTMLSpanElement | null)[]>([])
  const duckRefs = useRef<(HTMLSpanElement | null)[]>([])
  const splashRefs = useRef<(HTMLSpanElement | null)[]>([])
  const previousArray = useRef(array)
  const reducedMotion = useReducedMotion()

  useLayoutEffect(() => {
    const previous = previousArray.current
    previousArray.current = array
    const pair = swappedPair(previous, array)
    if (!pair || reducedMotion || isRobot || isPenguins) return

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
  }, [array, reducedMotion, stepDelayMs, isDucks, isRobot, isPenguins])

  // A second row (merge sort's buffer) and empty slots are drawn with bars only; the characters
  // draw the main row as they always have.
  const drawsBars = !isDucks && !isRobot && !isPenguins
  const buffer = drawsBars ? frame.buffer : undefined
  const vacant = new Set(drawsBars ? (frame.vacant ?? []) : [])
  const largest = Math.max(
    1,
    ...array.map((value) => Math.abs(value)),
    ...(buffer?.values ?? []).map((value) => Math.abs(value ?? 0)),
  )
  // When every value is in its final spot, the ducks bob for joy (not with reduced motion).
  const allSorted = (frame.highlights.sorted?.length ?? 0) === array.length && array.length > 0
  const celebrating = isDucks && allSorted && !reducedMotion
  const useSymbols = isDucks && array.length >= DUCK_SYMBOLS_FROM

  // Engineer's buttons for the second row (merge sort's Do it) lie over that row and its tags:
  // from where the row starts (measured, as the rows share the stage's height) to the bottom.
  const plotRef = useRef<HTMLDivElement>(null)
  const bufferRef = useRef<HTMLDivElement>(null)
  const [bufferTop, setBufferTop] = useState<number>()
  const picksOnBuffer = pick?.row === 'buffer' && buffer !== undefined
  useLayoutEffect(() => {
    const plot = plotRef.current
    const field = bufferRef.current
    if (!picksOnBuffer || !plot || !field) return
    const measure = () => {
      setBufferTop(field.getBoundingClientRect().top - plot.getBoundingClientRect().top)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(plot)
    observer.observe(field)
    return () => {
      observer.disconnect()
    }
  }, [picksOnBuffer])

  const viewClass = [
    'stage-view',
    isDucks && 'is-ducks',
    isRobot && 'is-robot',
    isPenguins && 'is-penguins',
    // Two rows (merge sort's buffer, bars only): a short stage packs them tighter (Stage.css).
    drawsBars && frame.buffer && 'has-rows',
    celebrating && 'is-celebrating',
    // Many values: smaller tags under each one, so neighbors don't collide.
    array.length >= DUCK_SYMBOLS_FROM && 'is-crowded',
  ]
    .filter(Boolean)
    .join(' ')

  /** One column's marks under a row: its position (Engineer), pointer tags and role word. */
  const marks = (
    index: number,
    role: HighlightRole | null,
    pointersOnRow: Readonly<Record<string, number>> | undefined,
  ) => {
    const pointers = Object.entries(pointersOnRow ?? {})
      .filter(([, at]) => at === index)
      .map(([name]) => ({
        label: pointerLabels?.[name]?.[level] ?? name,
        short: level === 'explorer' ? pointerShortLabels?.[name] : undefined,
      }))
    return (
      // The slot measures its own width (a container), so its tags can go compact.
      <div key={index} className="stage-mark-slot">
        <div className="stage-marks">
          {level === 'engineer' && <span className="stage-index">{index}</span>}
          {/* The pointers share a box only for layout (Stage.css): one row in Engineer's
              narrow columns; elsewhere it takes no part. */}
          <span className="stage-pointers">
            {pointers.map(({ label, short }) => (
              <span
                key={label}
                // A long word ("checking") gets smaller in a narrow column, or its short
                // form in a very narrow one (Stage.css).
                className={label.length > 5 ? 'stage-pointer is-long' : 'stage-pointer'}
                data-short={short}
              >
                {label}
              </span>
            ))}
          </span>
          {role && (
            <span
              className={`stage-role is-${role}${useSymbols && role === 'comparing' ? ' is-symbol' : ''}`}
            >
              {useSymbols ? DUCK_SYMBOLS[role] : ROLE_LABELS[role][level]}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={viewClass}
      style={{ '--count': array.length, '--pointer-rows': pointerRows } as CSSProperties}
    >
      <p className="visually-hidden">{describe(frame, level, drawsBars)}</p>
      <div className="stage-top">
        <p className="stage-caption" aria-hidden="true">
          {caption}
        </p>
        {toolbar}
      </div>

      <div ref={plotRef} className="stage-plot">
        <div className="stage-field">
          {isRobot ? (
            <RobotScene
              frames={timeline.frames}
              index={timeline.index}
              stepDelayMs={stepDelayMs}
              reducedMotion={reducedMotion}
            />
          ) : isPenguins ? (
            <PenguinScene
              frames={timeline.frames}
              index={timeline.index}
              stepDelayMs={stepDelayMs}
              reducedMotion={reducedMotion}
            />
          ) : (
            <div className="stage-bars" aria-hidden="true">
              {array.map((value, index) => {
                const role = roleAt(frame, index)
                if (isDucks) {
                  return (
                    <div
                      key={index}
                      className="stage-slot"
                      style={{ '--i': index } as CSSProperties}
                    >
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
                if (vacant.has(index)) {
                  return (
                    <div key={index} className="stage-slot">
                      <span
                        ref={(element) => {
                          barRefs.current[index] = element
                        }}
                        className="stage-bar is-empty"
                      />
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
          )}
        </div>

        <div className="stage-axis" aria-hidden="true">
          {array.map((_, index) => marks(index, roleAt(frame, index), frame.pointers))}
        </div>
        {buffer && (
          <>
            {/* The split or merge in progress (merge sort). The row is always there, so the
                bars never jump. */}
            <div className="stage-spans" aria-hidden="true">
              {spanBrackets(frame.span).map(({ key, from, to }) => (
                <span
                  key={key}
                  className={`stage-span is-${frame.span?.event === 'split' ? 'split' : 'merge'}`}
                  style={{ gridColumn: `${String(from + 1)} / ${String(to + 1)}` }}
                />
              ))}
            </div>
            <div ref={bufferRef} className="stage-field is-buffer">
              <div className="stage-bars is-buffer" aria-hidden="true">
                {buffer.values.map((value, index) => {
                  const role = roleAt(buffer, index)
                  return (
                    <div key={index} className="stage-slot">
                      {value === null ? (
                        <span className="stage-bar is-empty" />
                      ) : (
                        <span
                          className={['stage-bar', role && `is-${role}`, value === 0 && 'is-zero']
                            .filter(Boolean)
                            .join(' ')}
                          style={{ '--h': Math.abs(value) / largest } as CSSProperties}
                        >
                          <span className="stage-bar-label">{value}</span>
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="stage-axis is-buffer" aria-hidden="true">
              {buffer.values.map((_, index) =>
                marks(index, roleAt(buffer, index), buffer.pointers),
              )}
            </div>
          </>
        )}
        {pick && <StagePicks {...pick} top={pick.row === 'buffer' ? bufferTop : undefined} />}
      </div>
    </div>
  )
}
