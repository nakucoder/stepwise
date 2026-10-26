import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { collectFrames } from '../../engine/collect'
import { PizzaCartScene } from './PizzaCartScene'

/**
 * A phone on its side (PR #102): 1 7 9 11 9 3 showed plain boxes, and after adding a 2 the full
 * pizza boxes appeared. The box size must come from the stage only. Here, a sheet open beside the
 * field (The idea, Numbers) narrows it: the sizes still come from the stage with the sheet closed.
 * (The page keeps the parts around the field one height with the cart: check:fit's cart numbers
 * cases play the whole flow in a browser.)
 */
const SIX = [1, 7, 9, 11, 9, 3]
const SEVEN = [...SIX, 2]

/** The field's box, and a sheet beside it (or none). */
let field = { width: 0, height: 0 }
let sheet: { left: number; width: number } | null = null
let observers: (() => void)[] = []

beforeEach(() => {
  field = { width: 0, height: 0 }
  sheet = null
  observers = []
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('sheet') && sheet) {
      return {
        ...sheet,
        top: 0,
        right: sheet.left + sheet.width,
        bottom: 300,
        height: 300,
      } as DOMRect
    }
    return { ...field, top: 0, left: 12, right: 12 + field.width, bottom: field.height } as DOMRect
  })
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () => ({ columnGap: '0px', getPropertyValue: () => '' }) as unknown as CSSStyleDeclaration,
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

function layout(width: number, height: number, besides: { left: number; width: number } | null) {
  field = { width, height }
  sheet = besides
  act(() => {
    for (const callback of observers) callback()
  })
}

function Scene({ numbers, index = 0 }: { numbers: readonly number[]; index?: number }) {
  const frames = collectFrames(quickSort, numbers).frames
  const frame = frames[index] ?? frames[0]
  if (!frame) throw new Error('no frames')
  return (
    <div className="phone-grid">
      <PizzaCartScene
        frame={frame}
        frames={frames}
        index={index}
        stepDelayMs={800}
        reducedMotion
        level="explorer"
        asking={false}
      />
      <div className="sheet" />
    </div>
  )
}

const box = (container: HTMLElement) =>
  Number(container.querySelector<HTMLElement>('.pizza-scene')?.dataset.box ?? 0)

describe('the boxes come from the stage, not the numbers or a sheet', () => {
  it('a sheet beside the field (915x340: 317 of 683 px) leaves the boxes as they are', () => {
    const { container } = render(<Scene numbers={SIX} />)
    layout(683, 127, null)
    const closed = box(container)
    layout(317, 127, { left: 341, width: 366 })
    expect(box(container)).toBe(closed)
    layout(683, 127, null)
    expect(box(container)).toBe(closed)
  })

  it('the user’s flow: six numbers, the Numbers sheet, a 2 added, the sheet closes: one size', () => {
    const view = render(<Scene numbers={SIX} />)
    layout(683, 127, null)
    const sizes = [box(view.container)]
    layout(317, 127, { left: 341, width: 366 })
    sizes.push(box(view.container))
    // Run: seven numbers, measured while the sheet is still beside the field, then it closes.
    view.rerender(<Scene numbers={SEVEN} />)
    sizes.push(box(view.container))
    layout(683, 127, null)
    sizes.push(box(view.container))
    view.rerender(<Scene numbers={SEVEN} index={3} />)
    sizes.push(box(view.container))
    expect(new Set(sizes).size).toBe(1)
  })

  it('a sheet under the field (a phone upright) is not beside it: nothing is added', () => {
    const { container } = render(<Scene numbers={SIX} />)
    layout(366, 324, null)
    const alone = box(container)
    // The sheet starts left of the field's right edge: it is below, not beside.
    layout(366, 324, { left: 0, width: 390 })
    expect(box(container)).toBe(alone)
  })
})
