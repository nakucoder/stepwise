import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type {
  Algorithm,
  BufferRow,
  Frame,
  HighlightRole,
  Level,
  PendingRange,
  SpanStep,
} from '../engine/types'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { swapDurationMs } from '../lib/motion'
import { swappedPair } from '../lib/swappedPair'
import { CHARACTERS, type StageLook } from '../characters/registry'
import { markPointers, markRole, roleAt } from './stageRoles'
import { StagePicks, type StagePick } from './StagePicks'
import './Stage.css'
import './StageDucks.css'

/** Every role color is paired with words, so color is never the only signal. */
const ROLE_LABELS: Readonly<Record<HighlightRole, Readonly<Record<Level, string>>>> = {
  comparing: { engineer: 'comparing', explorer: 'looking' },
  swapping: { engineer: 'swapping', explorer: 'trading' },
  sorted: { engineer: 'sorted', explorer: 'done ✓' },
  pivot: { engineer: 'pivot', explorer: 'leader' },
}

/** With this many values the slots are narrow: smaller tags, so neighbors don't collide. */
const CROWDED_FROM = 9

/**
 * The role tags as symbols, for a character whose words don't fit under each value
 * (`CharacterScene.symbolsFrom`). Looking has no character: its tag draws an eye (Stage.css).
 */
const ROLE_SYMBOLS: Readonly<Record<HighlightRole, string>> = {
  comparing: '',
  swapping: '⇄',
  sorted: '✓',
  pivot: '★',
}

/** How high the bar moving right lifts as it passes over the other one. */
const SWAP_LIFT_PX = 24

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
  if (frame.partition) parts.push(describePartition(frame, level))
  return parts.join(' ')
}

const rangeName = ([lo, hi]: PendingRange) => `[${String(lo)}..${String(hi)})`
const groups = (count: number) => (count === 1 ? '1 more group' : `${String(count)} more groups`)

/** Quick sort's range in progress and the ones waiting, for screen readers. */
function describePartition(frame: Frame, level: Level): string {
  const { lo, hi } = frame.partition ?? { lo: 0, hi: 0 }
  const pending = frame.pending ?? []
  if (level === 'explorer') {
    const working = `Working on ${hi - lo === 1 ? '1 number' : `${String(hi - lo)} numbers`}.`
    return pending.length > 0 ? `${working} Next up: ${groups(pending.length)}.` : working
  }
  const working = `Range ${rangeName([lo, hi])}.`
  return pending.length > 0 ? `${working} To do: ${pending.map(rangeName).join(', ')}.` : working
}

/** The line under quick sort's brackets: what waits its turn (Engineer: the ranges to do). */
function partitionNote(pending: readonly PendingRange[], level: Level): string {
  if (pending.length === 0) return ''
  if (level === 'explorer') return `next up: ${groups(pending.length)} (dashed)`
  return `to do: ${pending.map(rangeName).join(' ')}`
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
  /** Bars, or the algorithm's character, drawn by its registry scene. Same data. */
  readonly look?: StageLook
  /** Controls for the top-right corner, beside the caption (the Bars / Ducks switch). */
  readonly toolbar?: ReactNode
  /** Engineer's Do it mode: the values become buttons to pick and swap. */
  readonly pick?: StagePick
  /**
   * The whole run and the frame on screen: the robots follow the run, not just one frame.
   * Absent: the frame alone.
   */
  readonly timeline?: { readonly frames: readonly Frame[]; readonly index: number }
  /** Do it: a question is waiting for the learner's answer (given to a character's scene). */
  readonly asking?: boolean
  /**
   * The run partitions ranges (quick sort): reserve the row of range brackets and the note under
   * them on every frame, so the bars never jump.
   */
  readonly partitions?: boolean
}

/**
 * The bars on the blueprint stage. Under each bar: its position (Engineer), any pointer
 * tags, and a word for its role. When two bars trade places between frames (forward or
 * back), they slide into each other's spots; motion explains the swap and is skipped when
 * the user prefers reduced motion.
 *
 * With a character's look, its registry scene (CHARACTERS[look].scene) draws the values in
 * place of the bars and plays its own moves; the tags under the values stay the same.
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
  asking = false,
  partitions = false,
}: StageProps) {
  const { array } = frame
  // The character's scene, if one is showing (src/characters/registry.ts); else the bars.
  const scene = look === 'bars' ? undefined : CHARACTERS[look].scene
  const barRefs = useRef<(HTMLSpanElement | null)[]>([])
  const previousArray = useRef(array)
  const reducedMotion = useReducedMotion()

  useLayoutEffect(() => {
    const previous = previousArray.current
    previousArray.current = array
    const pair = swappedPair(previous, array)
    // A character's scene plays its own moves.
    if (!pair || reducedMotion || scene) return

    const [left, right] = pair
    const leftBar = barRefs.current[left]
    const rightBar = barRefs.current[right]
    if (!leftBar || !rightBar || typeof leftBar.animate !== 'function') return

    // Each bar now shows the other's old value, so start each one at the other's place.
    const distance = rightBar.getBoundingClientRect().left - leftBar.getBoundingClientRect().left
    const duration = swapDurationMs(stepDelayMs)
    const timing = { duration, easing: 'ease-in-out' }

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
  }, [array, reducedMotion, stepDelayMs, scene])

  // A second row (merge sort's buffer) and empty slots are drawn by the bars, or by a scene that
  // draws both rows itself (twoRows); the other characters draw the main row only.
  const drawsBars = !scene
  const bothRows = drawsBars || scene.twoRows === true
  // A scene that draws both rows has one row of tags under the values, for both (stageRoles.ts).
  const sceneRows = scene?.twoRows === true
  const buffer = drawsBars ? frame.buffer : undefined
  const vacant = new Set(drawsBars ? (frame.vacant ?? []) : [])
  const largest = Math.max(
    1,
    ...array.map((value) => Math.abs(value)),
    ...(buffer?.values ?? []).map((value) => Math.abs(value ?? 0)),
  )
  const allSorted = (frame.highlights.sorted?.length ?? 0) === array.length && array.length > 0
  // The widest number on the stage, in characters, so a narrow bar can fit its number
  // (WorkspacePhone.css). The values only move, so it is the same at every step of a run.
  const digits = Math.max(
    1,
    ...[...array, ...(frame.buffer?.values ?? [])].map((value) =>
      value === null ? 1 : String(value).length,
    ),
  )
  const useSymbols = scene?.symbolsFrom !== undefined && array.length >= scene.symbolsFrom

  // Engineer's buttons for the second row (merge sort's Do it) lie over the field's pick band:
  // the element marked data-pick-band, from its top to its bottom, or to the bottom of the
  // tags under it ("to-bottom": the bars' second row and its tags). Without one, over the whole
  // column. It is measured after every render, and whenever anything in the plot changes size
  // (the band can move while it and the plot keep their sizes: the tags around it can change).
  const plotRef = useRef<HTMLDivElement>(null)
  const [band, setBand] = useState<{ readonly top: number; readonly bottom?: number }>()
  const picksOnBuffer = pick?.row === 'buffer'
  const measureBand = useCallback(() => {
    const plot = plotRef.current
    if (!plot) return
    const element = plot.querySelector<HTMLElement>('[data-pick-band]')
    if (!element) {
      setBand(undefined)
      return
    }
    const outer = plot.getBoundingClientRect()
    const inner = element.getBoundingClientRect()
    const top = inner.top - outer.top
    const bottom =
      element.dataset.pickBand === 'to-bottom' ? undefined : outer.bottom - inner.bottom
    setBand((was) => (was?.top === top && was.bottom === bottom ? was : { top, bottom }))
  }, [])
  useLayoutEffect(() => {
    if (picksOnBuffer) measureBand()
  })
  useLayoutEffect(() => {
    const plot = plotRef.current
    if (!picksOnBuffer || !plot || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measureBand)
    observer.observe(plot)
    for (const child of plot.children) observer.observe(child)
    return () => {
      observer.disconnect()
    }
  }, [picksOnBuffer, measureBand])

  const viewClass = [
    'stage-view',
    scene?.className,
    // Two rows (merge sort's buffer, bars only): a short stage packs them tighter (Stage.css).
    drawsBars && frame.buffer && 'has-rows',
    // Quick sort's range brackets: a short stage keeps the brackets and drops the note (Stage.css).
    partitions && 'has-parts',
    scene?.viewClass?.({ allSorted, reducedMotion }),
    // Many values: smaller tags under each one, so neighbors don't collide.
    array.length >= CROWDED_FROM && 'is-crowded',
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
              {useSymbols ? ROLE_SYMBOLS[role] : ROLE_LABELS[role][level]}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={viewClass}
      style={
        {
          '--count': array.length,
          '--pointer-rows': pointerRows,
          '--digits': digits,
        } as CSSProperties
      }
    >
      <p className="visually-hidden">{describe(frame, level, bothRows)}</p>
      <div className="stage-top">
        <p className="stage-caption" aria-hidden="true">
          {caption}
        </p>
        {toolbar}
      </div>

      <div ref={plotRef} className="stage-plot">
        <div className="stage-field">
          {scene ? (
            <scene.Scene
              frame={frame}
              frames={timeline?.frames ?? [frame]}
              index={timeline?.index ?? 0}
              stepDelayMs={stepDelayMs}
              reducedMotion={reducedMotion}
              level={level}
              asking={asking}
            />
          ) : (
            <div className="stage-bars" aria-hidden="true">
              {array.map((value, index) => {
                const role = roleAt(frame, index)
                // Quick sort: a value outside the range being worked on waits its turn.
                const outside =
                  frame.partition !== undefined &&
                  (index < frame.partition.lo || index >= frame.partition.hi)
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
                      className={[
                        'stage-bar',
                        role && `is-${role}`,
                        !role && outside && 'is-outside',
                        value === 0 && 'is-zero',
                      ]
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
          {array.map((_, index) =>
            marks(index, markRole(frame, index, sceneRows), markPointers(frame, sceneRows)),
          )}
        </div>
        {partitions && (
          // Quick sort's ranges: a solid bracket under the one being worked on, dashed ones under
          // those waiting their turn, and a note naming them. Always there, so nothing jumps.
          <div className="stage-parts" aria-hidden="true">
            <div className="stage-part-brackets">
              {frame.partition && (
                <span
                  className="stage-part is-active"
                  style={{
                    gridColumn: `${String(frame.partition.lo + 1)} / ${String(frame.partition.hi + 1)}`,
                  }}
                />
              )}
              {(frame.pending ?? []).map(([lo, hi]) => (
                <span
                  key={`${String(lo)}-${String(hi)}`}
                  className="stage-part is-pending"
                  style={{ gridColumn: `${String(lo + 1)} / ${String(hi + 1)}` }}
                />
              ))}
            </div>
            <p className="stage-part-note">{partitionNote(frame.pending ?? [], level)}</p>
          </div>
        )}
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
            <div className="stage-field is-buffer" data-pick-band="to-bottom">
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
        {pick && (
          <StagePicks
            {...pick}
            top={pick.row === 'buffer' ? band?.top : undefined}
            bottom={pick.row === 'buffer' ? band?.bottom : undefined}
          />
        )}
      </div>
    </div>
  )
}
