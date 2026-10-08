import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { selectionSort } from '../algorithms/sorting/selectionSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame, Level } from '../engine/types'
import { setReducedMotion } from '../test/matchMedia'
import { Stage } from './Stage'

const FRAMES = collectFrames(bubbleSort, DEFAULT_INPUT).frames
const frame = (index: number): Frame => {
  const found = FRAMES[index]
  if (!found) throw new Error(`no frame ${String(index)}`)
  return found
}
// [5, 2, 8, 1, 9, 3]: frame 1 asks about 5 and 2; frame 2 swaps them.
const ASK = frame(1)
const SWAP = frame(2)
const FINISH = frame(FRAMES.length - 1)

const animate = vi.fn<(keyframes: Keyframe[], options: KeyframeAnimationOptions) => object>(() => ({
  cancel: vi.fn(),
}))

beforeEach(() => {
  Object.assign(HTMLElement.prototype, { animate })
  // Lay bars out 100px apart so the slide distance is measurable.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const slot = this.parentElement
    const index = slot?.parentElement ? [...slot.parentElement.children].indexOf(slot) : 0
    return { left: index * 100, top: 0, right: index * 100 + 80, bottom: 300 } as DOMRect
  })
})

afterEach(() => {
  animate.mockClear()
  vi.restoreAllMocks()
  Reflect.deleteProperty(HTMLElement.prototype, 'animate')
})

function renderStage(current: Frame, level: Level = 'engineer', stepDelayMs = 800) {
  const props = { level, pointerLabels: bubbleSort.pointerLabels, stepDelayMs }
  const view = render(<Stage frame={current} {...props} />)
  return {
    ...view,
    showFrame: (next: Frame) => {
      view.rerender(<Stage frame={next} {...props} />)
    },
  }
}

const bars = (container: HTMLElement) => [...container.querySelectorAll('.stage-bar')]

describe('Stage: bars and labels', () => {
  it('draws one bar per number, with its value, hidden from screen readers', () => {
    const { container } = renderStage(ASK)
    expect(bars(container).map((bar) => bar.textContent)).toEqual(['5', '2', '8', '1', '9', '3'])
    expect(container.querySelector('.stage-bars')).toHaveAttribute('aria-hidden', 'true')
  })

  it('draws 0 as a thin bar of its own, still labeled', () => {
    const zeroFrames = collectFrames(bubbleSort, [3, 0, 7]).frames
    const { container } = renderStage(zeroFrames[0] ?? ASK)
    const [three, zero, seven] = bars(container)
    expect(zero).toHaveClass('is-zero')
    expect(zero).toHaveTextContent('0')
    expect(three).not.toHaveClass('is-zero')
    expect(seven).not.toHaveClass('is-zero')
  })

  it('describes the stage in words for screen readers', () => {
    renderStage(ASK, 'engineer')
    expect(screen.getByText('Array: 5, 2, 8, 1, 9, 3. Comparing 5 and 2.')).toBeInTheDocument()
    renderStage(FINISH, 'explorer')
    expect(
      screen.getByText('Numbers: 1, 2, 3, 5, 8, 9. All numbers are in their final spots.'),
    ).toBeInTheDocument()
  })

  it('Engineer: positions, pointer names and role words under the bars', () => {
    const { container } = renderStage(ASK, 'engineer')
    expect([...container.querySelectorAll('.stage-index')].map((e) => e.textContent)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
    ])
    expect(screen.getByText('j')).toBeInTheDocument()
    expect(screen.getByText('j+1')).toBeInTheDocument()
    expect(screen.getAllByText('comparing')).toHaveLength(2)
    expect(bars(container)[0]).toHaveClass('is-comparing')
  })

  it('Explorer: friendly pointer and role words, no positions', () => {
    const { container } = renderStage(SWAP, 'explorer')
    expect(container.querySelector('.stage-index')).toBeNull()
    expect(screen.getByText('left')).toBeInTheDocument()
    expect(screen.getByText('right')).toBeInTheDocument()
    expect(screen.getAllByText('trading')).toHaveLength(2)
  })

  it('labels sorted bars in words too', () => {
    renderStage(FINISH, 'explorer')
    expect(screen.getAllByText('done ✓')).toHaveLength(6)
    renderStage(FINISH, 'engineer')
    expect(screen.getAllByText('sorted')).toHaveLength(6)
  })
})

describe('Stage: narrow columns (phones)', () => {
  const selection = collectFrames(selectionSort, DEFAULT_INPUT).frames
  // 5 2 8 1 9 3: the first comparison, the smallest so far (5) against 2.
  const compare = selection.find((f) => f.decision?.kind === 'new-smallest') ?? ASK
  const pointer = (container: HTMLElement, word: string) =>
    [...container.querySelectorAll('.stage-pointer')].find((tag) => tag.textContent === word)

  it('Explorer: a long pointer word carries its short form, for a narrow column', () => {
    const { container } = render(
      <Stage
        frame={compare}
        level="explorer"
        pointerLabels={selectionSort.pointerLabels}
        pointerShortLabels={selectionSort.pointerShortLabels}
        stepDelayMs={800}
      />,
    )
    expect(pointer(container, 'smallest')).toHaveAttribute('data-short', 'small')
    expect(pointer(container, 'checking')).toHaveAttribute('data-short', 'check')
    expect(pointer(container, 'front')).not.toHaveAttribute('data-short')
  })

  it('Engineer: its pointer names are short already', () => {
    const { container } = render(
      <Stage
        frame={compare}
        level="engineer"
        pointerLabels={selectionSort.pointerLabels}
        pointerShortLabels={selectionSort.pointerShortLabels}
        stepDelayMs={800}
      />,
    )
    expect(container.querySelector('.stage-pointer[data-short]')).toBeNull()
  })
})

describe('Stage: swap animation', () => {
  it('slides the two bars into each other’s places when they swap', () => {
    const { container, showFrame } = renderStage(ASK)
    showFrame(SWAP)
    expect(animate).toHaveBeenCalledTimes(2)
    const [left, right] = animate.mock.instances as unknown as HTMLElement[]
    expect(left).toBe(bars(container)[0])
    expect(right).toBe(bars(container)[1])
    // Each starts where the other value came from, 100px away, and ends in place.
    expect(animate.mock.calls[0]?.[0]).toEqual([
      { transform: 'translateX(100px)', zIndex: 2 },
      { transform: 'none', zIndex: 2 },
    ])
    expect(animate.mock.calls[1]?.[0][0]).toEqual({ transform: 'translateX(-100px)', zIndex: 1 })
    // The bar moving right hops over the other one, which stays in front.
    expect(animate.mock.calls[1]?.[0][1]?.transform).toContain('-24px')
  })

  it('also animates when stepping back out of a swap', () => {
    const { showFrame } = renderStage(SWAP)
    showFrame(ASK)
    expect(animate).toHaveBeenCalledTimes(2)
  })

  it('finishes within 60% of the step delay, and never takes longer than 450ms', () => {
    renderStage(ASK, 'engineer', 200).showFrame(SWAP)
    expect(animate.mock.calls[0]?.[1]).toMatchObject({ duration: 120 })
    animate.mockClear()
    renderStage(ASK, 'engineer', 1600).showFrame(SWAP)
    expect(animate.mock.calls[0]?.[1]).toMatchObject({ duration: 450 })
  })

  it('does not animate jumps or steps where nothing traded places', () => {
    const { showFrame } = renderStage(ASK)
    showFrame(FINISH)
    showFrame(frame(3))
    expect(animate).not.toHaveBeenCalled()
  })

  it('stops a swap that is still running when the next step arrives', () => {
    const { showFrame } = renderStage(ASK)
    showFrame(SWAP)
    const running = animate.mock.results.map((result) => result.value as { cancel: () => void })
    showFrame(frame(3))
    for (const animation of running) expect(animation.cancel).toHaveBeenCalled()
  })

  it('skips the motion when the user prefers reduced motion', () => {
    setReducedMotion(true)
    const { container, showFrame } = renderStage(ASK)
    showFrame(SWAP)
    expect(animate).not.toHaveBeenCalled()
    // The swap is still shown, just instantly.
    expect(
      bars(container)
        .map((bar) => bar.textContent)
        .slice(0, 2),
    ).toEqual(['2', '5'])
  })
})
