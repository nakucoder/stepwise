import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { Frame } from '../engine/types'
import { stableHeight, type SizeMemory } from './pixel'

/** The stage field's measured box, and the height a scene's sizes come from. */
export interface StableField {
  readonly width: number
  readonly height: number
  /** The gap between the value columns (the bars' grid). */
  readonly gap: number
  /** The height the sizes come from (`stableHeight`), at most the field's own. */
  readonly sizeHeight: number
  /**
   * The least height the page's CSS promises the field (its `--field-floor`, 0 for none): on a
   * phone a character can hold its field (the pizza cart) and size from this in Do it, where
   * the hint can squeeze the stage at any moment.
   */
  readonly floor: number
}

/**
 * Measures a character's field after layout, again on every resize and on every new step, and
 * gives the height its sizes come from: the shortest over the last few steps (`stableHeight`,
 * ./pixel.ts), so a size doesn't change between steps, gives its room back when a squeeze (Do
 * it's message or hint) goes away, and never keeps a field with no size yet. A new run (new
 * numbers) starts afresh. Null until the field has been measured.
 */
export function useStableField(
  fieldRef: RefObject<HTMLElement | null>,
  frames: readonly Frame[],
  index: number,
): StableField | null {
  const [box, setBox] = useState<StableField | null>(null)
  const step = useRef(index)
  // The recent heights live outside the state: a new step that changes no size changes nothing.
  const memory = useRef<SizeMemory | null>(null)
  const measure = useRef<() => void>(() => undefined)

  useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    measure.current = () => {
      const rect = field.getBoundingClientRect()
      const style = getComputedStyle(field)
      const gap = parseFloat(style.columnGap) || 0
      const floor = parseFloat(style.getPropertyValue('--field-floor')) || 0
      const next = stableHeight(memory.current, rect.width, rect.height, step.current)
      memory.current = next.memory
      const { sizeHeight } = next
      // The stage (a size container, so the layout can't see the field's own least height) holds
      // room for it: the field's floor plus the stage's other parts (its caption, the tags).
      const stage = field.closest<HTMLElement>('.stage')
      if (stage) {
        if (floor > 0) {
          // The parts as laid out, even when the stage is squeezed and they spill out of it.
          const parts =
            Math.max(stage.scrollHeight, stage.getBoundingClientRect().height) - rect.height
          stage.style.setProperty('--field-floor-stage', `${String(Math.ceil(floor + parts))}px`)
        } else stage.style.removeProperty('--field-floor-stage')
      }
      setBox((old) =>
        old &&
        old.width === rect.width &&
        old.height === rect.height &&
        old.gap === gap &&
        old.floor === floor &&
        old.sizeHeight === sizeHeight
          ? old
          : { width: rect.width, height: rect.height, gap, floor, sizeHeight },
      )
    }
    measure.current()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      measure.current()
    })
    observer.observe(field)
    return () => {
      observer.disconnect()
      field.closest<HTMLElement>('.stage')?.style.removeProperty('--field-floor-stage')
    }
  }, [fieldRef])

  // Every new step is measured too: its height joins the recent ones, an old squeeze ages out.
  useLayoutEffect(() => {
    step.current = index
    measure.current()
  }, [index])

  // A new run (new numbers) starts its sizes afresh, from the field as it is now.
  const run0 = useRef(frames)
  useLayoutEffect(() => {
    if (run0.current === frames) return
    run0.current = frames
    memory.current = null
    measure.current()
  }, [frames])

  return box
}
