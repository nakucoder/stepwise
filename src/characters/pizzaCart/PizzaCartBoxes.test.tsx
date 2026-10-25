import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { collectFrames } from '../../engine/collect'
import { pizzaLayout } from './geometry'
import { PizzaCartScene } from './PizzaCartScene'
import { wordFits } from './sprites'

/**
 * The bugs from a phone test (PR #96): the boxes lost their look (plain, no PIZZA) on the first
 * open, after a wrong answer in Do it (until the phone was turned), and in the strip over the
 * Numbers sheet. The field is measured after layout, again on every resize and step, and in Do it
 * on a phone the boxes size from the field's promised least height (`--field-floor`).
 */
const NUMBERS = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8]
const FRAMES = collectFrames(quickSort, NUMBERS).frames
const ASK = FRAMES.findIndex((f) => f.decision !== undefined)
const FIRST = FRAMES[0]
if (!FIRST) throw new Error('no frames')

/** The field's size as the layout has it now, and the floor the page's CSS gives it. */
let size = { width: 0, height: 0 }
let floor = ''
let observers: (() => void)[] = []

beforeEach(() => {
  size = { width: 0, height: 0 }
  floor = ''
  observers = []
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        ...size,
        top: 0,
        left: 0,
        right: size.width,
        bottom: size.height,
      }) as DOMRect,
  )
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () =>
      ({
        columnGap: '0px',
        getPropertyValue: (name: string) => (name === '--field-floor' ? floor : ''),
      }) as unknown as CSSStyleDeclaration,
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        observers.push(callback)
      }
      observe() {
        return undefined
      }
      disconnect() {
        return undefined
      }
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** The layout changes the field's size: the observer reports it. */
function resize(width: number, height: number) {
  size = { width, height }
  act(() => {
    for (const callback of observers) callback()
  })
}

const scene = (index: number, doIt = false) => (
  <PizzaCartScene
    frame={FRAMES[index] ?? FIRST}
    frames={FRAMES}
    index={index}
    stepDelayMs={800}
    reducedMotion
    level="explorer"
    asking={false}
    doIt={doIt}
  />
)

const box = (container: HTMLElement) =>
  Number(container.querySelector<HTMLElement>('.pizza-scene')?.dataset.box ?? 0)

describe('the boxes keep their look', () => {
  it('first open: measured after layout, never stuck on the size before it', () => {
    // Before layout the field has no size: nothing is drawn, and nothing is remembered.
    const { container } = render(scene(0))
    expect(container.querySelector('.pizza-scene')).toBeNull()
    // Laid out: the phone's stage (366 × 324), 12 px boxes with PIZZA on them.
    resize(366, 324)
    expect(box(container)).toBe(12)
  })

  it('a sheet’s strip (The idea, Numbers) holds the floor: 8 px boxes, PIZZA on them', () => {
    const { container } = render(scene(0))
    resize(366, 324)
    floor = '140px'
    // The strip over the sheet, held at its floor by the page's CSS.
    resize(366, 140)
    expect(box(container)).toBe(8)
    const geo = pizzaLayout({ width: 366, height: 140 }, NUMBERS.length)
    expect(geo.lid).toBeGreaterThan(0)
    expect(wordFits(geo.stackW, geo.boxPx - 1)).toBe(true)
    // The sheet closes: the boxes come back to the stage's size.
    resize(366, 324)
    expect(box(container)).toBe(12)
  })

  it('Do it on a phone: one size through the question, a wrong answer, Help and on', () => {
    floor = '140px'
    const view = render(scene(ASK, true))
    resize(366, 241)
    const sizes = [box(view.container)]
    // A wrong answer, then Help: the message and the hint squeeze the stage to its floor.
    resize(366, 140)
    sizes.push(box(view.container))
    resize(366, 140)
    sizes.push(box(view.container))
    // The right move plays, the hint goes, the next question.
    view.rerender(scene(ASK + 1, true))
    resize(366, 241)
    sizes.push(box(view.container))
    view.rerender(scene(ASK + 2, true))
    sizes.push(box(view.container))
    expect(sizes).toEqual([8, 8, 8, 8, 8])
  })

  it('no floor (a desktop): a squeeze that goes away gives its room back, never stuck', () => {
    const view = render(scene(ASK))
    resize(366, 241)
    expect(box(view.container)).toBe(12)
    resize(366, 140)
    expect(box(view.container)).toBe(8)
    // Gone on the same step: the room is back.
    resize(366, 241)
    expect(box(view.container)).toBe(12)
    // A squeeze left behind on an earlier step is forgotten a few steps on.
    resize(366, 140)
    for (let k = 1; k <= 4; k++) {
      view.rerender(scene(ASK + k))
      resize(366, 241)
    }
    expect(box(view.container)).toBe(12)
  })
})
