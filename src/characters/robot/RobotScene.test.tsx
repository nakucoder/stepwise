import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { selectionSort } from '../../algorithms/sorting/selectionSort'
import { collectFrames } from '../../engine/collect'
import { RobotScene } from './RobotScene'
import { isCarry } from './steps'

const FRAMES = collectFrames(selectionSort, [5, 2, 8, 1, 9, 3]).frames
const CARRY = FRAMES.findIndex((_, k) => isCarry(FRAMES, k))

const animate = vi.fn(() => ({ cancel: vi.fn(), currentTime: 0 }))

beforeEach(() => {
  Object.assign(Element.prototype, { animate })
  // A 390-wide phone's field: 342 × 300.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 342,
    height: 300,
    top: 0,
    left: 0,
    right: 342,
    bottom: 300,
  } as DOMRect)
})

afterEach(() => {
  animate.mockClear()
  vi.restoreAllMocks()
  Reflect.deleteProperty(Element.prototype, 'animate')
})

const scene = (index: number, reducedMotion = false) => (
  <RobotScene frames={FRAMES} index={index} stepDelayMs={800} reducedMotion={reducedMotion} />
)

describe('RobotScene', () => {
  it('draws a crate per value, with its number, and the scout and crane', () => {
    const { container } = render(scene(0))
    const crates = [...container.querySelectorAll('[data-part^="crate-"]')]
    expect(crates.map((crate) => crate.textContent)).toEqual(['5', '2', '8', '1', '9', '3'])
    expect(container.querySelector('[data-part="scout"]')).not.toBeNull()
    expect(container.querySelector('[data-part="trolley"]')).not.toBeNull()
    expect(container.querySelector('[data-part="hook"]')).not.toBeNull()
    expect(container.querySelector('.robot-field')).toHaveAttribute('aria-hidden', 'true')
  })

  it('taller crates for bigger values', () => {
    const { container } = render(scene(0))
    const height = (k: number) =>
      Number(
        container
          .querySelector(`[data-part="crate-${String(k)}"] .crate-wood`)
          ?.getAttribute('height'),
      )
    expect(height(4)).toBeGreaterThan(height(2)) // 9 > 8
    expect(height(2)).toBeGreaterThan(height(0)) // 8 > 5
    expect(height(0)).toBeGreaterThan(height(3)) // 5 > 1
  })

  it('one step forward plays the move; a jump, or reduced motion, shows only the pose', () => {
    const { rerender } = render(scene(CARRY - 1))
    rerender(scene(CARRY))
    expect(animate).toHaveBeenCalled()
    animate.mockClear()
    rerender(scene(CARRY + 5))
    expect(animate).not.toHaveBeenCalled()

    const still = render(scene(CARRY - 1, true))
    still.rerender(scene(CARRY, true))
    expect(animate).not.toHaveBeenCalled()
  })

  it('the finale pose holds the ^ ^ eyes and raised arms', () => {
    const { container } = render(scene(FRAMES.length - 1))
    expect(container.querySelector('[data-part="scout"]')).toHaveClass('is-finale')
    expect(container.querySelector('.scout-happy')).toHaveAttribute('opacity', '1')
  })
})
