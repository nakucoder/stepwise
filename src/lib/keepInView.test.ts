import { describe, expect, it } from 'vitest'
import { keepInView } from './keepInView'

/** A container showing y = 100..300 on screen, and an element at the given screen position. */
function setup(elementTop: number, elementHeight = 20, scrollTop = 500) {
  const container = document.createElement('div')
  const element = document.createElement('div')
  container.scrollTop = scrollTop
  container.getBoundingClientRect = () => ({ top: 100, bottom: 300 }) as DOMRect
  element.getBoundingClientRect = () =>
    ({ top: elementTop, bottom: elementTop + elementHeight }) as DOMRect
  return { container, element }
}

describe('keepInView', () => {
  it('leaves a visible element alone', () => {
    const { container, element } = setup(150)
    keepInView(container, element)
    expect(container.scrollTop).toBe(500)
  })

  it('scrolls down just enough to show an element below the visible area', () => {
    const { container, element } = setup(310)
    keepInView(container, element)
    expect(container.scrollTop).toBe(530)
  })

  it('scrolls up just enough to show an element above the visible area', () => {
    const { container, element } = setup(60)
    keepInView(container, element)
    expect(container.scrollTop).toBe(460)
  })

  it('keeps the element clear of a sticky header', () => {
    const { container, element } = setup(110)
    keepInView(container, element, 30)
    expect(container.scrollTop).toBe(480)
  })
})
