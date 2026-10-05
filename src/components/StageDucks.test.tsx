import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame, Level } from '../engine/types'
import { setReducedMotion } from '../test/matchMedia'
import { Stage } from './Stage'

const FRAMES = collectFrames(bubbleSort, DEFAULT_INPUT).frames
const frame = (index: number, frames: readonly Frame[] = FRAMES): Frame => {
  const found = frames[index]
  if (!found) throw new Error(`no frame ${String(index)}`)
  return found
}
// [5, 2, 8, 1, 9, 3]: frame 1 asks about 5 and 2; frame 2 swaps them (the 5 moves right).
const ASK = frame(1)
const SWAP = frame(2)
const FINISH = frame(FRAMES.length - 1)

const animate = vi.fn<(keyframes: Keyframe[], options: KeyframeAnimationOptions) => object>(() => ({
  cancel: vi.fn(),
}))

beforeEach(() => {
  Object.assign(HTMLElement.prototype, { animate })
  // Columns 100px apart; every element is 40px tall (the duck's hop is measured from it).
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const slot = this.closest('.stage-slot')
    const index = slot?.parentElement ? [...slot.parentElement.children].indexOf(slot) : 0
    return { left: index * 100, top: 0, right: index * 100 + 80, bottom: 40, height: 40 } as DOMRect
  })
})

afterEach(() => {
  animate.mockClear()
  vi.restoreAllMocks()
  Reflect.deleteProperty(HTMLElement.prototype, 'animate')
})

function renderDucks(current: Frame, level: Level = 'explorer') {
  const props = {
    level,
    pointerLabels: bubbleSort.pointerLabels,
    stepDelayMs: 800,
    look: 'ducks' as const,
  }
  const view = render(<Stage frame={current} {...props} />)
  return {
    ...view,
    showFrame: (next: Frame) => {
      view.rerender(<Stage frame={next} {...props} />)
    },
  }
}

const columns = (container: HTMLElement) => [...container.querySelectorAll('.duck-column')]
const element = (container: HTMLElement, selector: string, index: number) =>
  container.querySelectorAll(selector)[index]

describe('Stage: Bath time ducks', () => {
  it('draws a water column with a duck on a pad for each number, with the number in the water', () => {
    const { container } = renderDucks(ASK)
    expect(columns(container).map((column) => column.textContent)).toEqual([
      '5',
      '2',
      '8',
      '1',
      '9',
      '3',
    ])
    expect(container.querySelectorAll('.duck .pixel-duck')).toHaveLength(6)
    expect(container.querySelectorAll('.duck-pad')).toHaveLength(6)
    expect(container.querySelector('.stage-bar')).toBeNull()
    expect(container.querySelector('.stage-bars')).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows roles as rings on the water, with the word under the duck', () => {
    const { container } = renderDucks(ASK)
    expect(columns(container)[0]).toHaveClass('is-comparing')
    expect(columns(container)[1]).toHaveClass('is-comparing')
    expect(screen.getAllByText('looking')).toHaveLength(2)
  })

  it('tells screen readers the same as with bars', () => {
    renderDucks(ASK)
    expect(screen.getByText('Numbers: 5, 2, 8, 1, 9, 3. Comparing 5 and 2.')).toBeInTheDocument()
  })

  it('uses symbols under the ducks when there are 9 or more', () => {
    const many = collectFrames(bubbleSort, [9, 8, 7, 6, 5, 4, 3, 2, 1]).frames
    const { container } = renderDucks(frame(1, many))
    expect(container.querySelector('.stage-view')).toHaveClass('is-crowded')
    expect(screen.getAllByText('?')).toHaveLength(2)
    expect(screen.queryByText('looking')).not.toBeInTheDocument()
  })
})

describe('Stage: ducks trading places', () => {
  it('slides both columns, the smaller one in front, and the bigger one’s duck hops', () => {
    const { container, showFrame } = renderDucks(ASK)
    showFrame(SWAP)
    const targets = animate.mock.instances as unknown as HTMLElement[]
    expect(targets[0]).toBe(columns(container)[0])
    expect(targets[1]).toBe(columns(container)[1])
    expect(animate.mock.calls[0]?.[0][0]).toEqual({ transform: 'translateX(100px)', zIndex: 2 })
    expect(animate.mock.calls[1]?.[0][0]).toEqual({ transform: 'translateX(-100px)', zIndex: 1 })
    // The duck now on the right (the 5) hops up and comes back down.
    expect(targets[2]).toBe(element(container, '.duck', 1))
    const hop = animate.mock.calls[2]?.[0] ?? []
    expect(hop[0]).toEqual({ transform: 'none' })
    expect(hop[1]?.transform).toBe('translateY(-48px)')
    expect(hop[2]).toEqual({ transform: 'none' })
  })

  it('splashes where the duck lands, as it lands', () => {
    const { container, showFrame } = renderDucks(ASK)
    showFrame(SWAP)
    const targets = animate.mock.instances as unknown as HTMLElement[]
    expect(targets[3]).toBe(element(container, '.duck-splash', 1))
    const options = animate.mock.calls[3]?.[1]
    const duration = animate.mock.calls[0]?.[1].duration as number
    expect(options?.delay).toBe(duration * 0.75)
  })

  it('skips the hop and the splash with reduced motion', () => {
    setReducedMotion(true)
    const { container, showFrame } = renderDucks(ASK)
    showFrame(SWAP)
    expect(animate).not.toHaveBeenCalled()
    expect(
      columns(container)
        .map((column) => column.textContent)
        .slice(0, 2),
    ).toEqual(['2', '5'])
  })
})

describe('Stage: ducks when the list is sorted', () => {
  it('bob for joy, one after another from the left', () => {
    const { container } = renderDucks(FINISH)
    expect(container.querySelector('.stage-view')).toHaveClass('is-celebrating')
    const slots = [...container.querySelectorAll<HTMLElement>('.stage-slot')]
    expect(slots.map((slot) => slot.style.getPropertyValue('--i'))).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
    ])
  })

  it('stay still before the end, and with reduced motion', () => {
    expect(renderDucks(SWAP).container.querySelector('.stage-view')).not.toHaveClass(
      'is-celebrating',
    )
    setReducedMotion(true)
    expect(renderDucks(FINISH).container.querySelector('.is-celebrating')).toBeNull()
  })

  it('bars never celebrate', () => {
    const { container } = render(
      <Stage frame={FINISH} level="explorer" stepDelayMs={800} look="bars" />,
    )
    expect(container.querySelector('.is-celebrating')).toBeNull()
    expect(container.querySelector('.duck')).toBeNull()
  })
})
