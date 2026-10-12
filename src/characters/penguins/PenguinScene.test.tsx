import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { insertionSort } from '../../algorithms/sorting/insertionSort'
import { DEFAULT_INPUT } from '../../data/defaultInput'
import { collectFrames } from '../../engine/collect'
import { penguinLayout } from './geometry'
import { PenguinScene } from './PenguinScene'
import { PixelPenguin } from './PixelPenguin'

const FRAMES = collectFrames(insertionSort, DEFAULT_INPUT).frames
const LAST = FRAMES.length - 1
// 5 2 8 1 9 3: frame 1 takes 2 out (round 1), 2 compares, 3 shifts 5, 4 slides 2 in; 8 is
// already in place on frame 8; the finale is the last frame.
const TAKE = 1
const ASK = 2
const SHIFT = 3
const SLIDE = 4
const IN_PLACE = 8

interface Call {
  readonly part: string
  readonly keyframes: Keyframe[]
  readonly options: KeyframeAnimationOptions
}
let calls: Call[] = []
const animate = vi.fn(function (
  this: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
) {
  calls.push({ part: this.getAttribute('data-part') ?? '', keyframes, options })
  return { cancel: vi.fn(), currentTime: 0 }
})

// A 390-wide phone's field: 342 × 300 (no gap measured in jsdom).
const BOX = { width: 342, height: 300, gap: 0 }
const GEO = penguinLayout(BOX, DEFAULT_INPUT)

beforeEach(() => {
  calls = []
  Object.assign(Element.prototype, { animate })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: BOX.width,
    height: BOX.height,
    top: 0,
    left: 0,
    right: BOX.width,
    bottom: BOX.height,
  } as DOMRect)
})

afterEach(() => {
  animate.mockClear()
  vi.restoreAllMocks()
  Reflect.deleteProperty(Element.prototype, 'animate')
})

const scene = (index: number, stepDelayMs = 800, reducedMotion = false) => (
  <PenguinScene
    frames={FRAMES}
    index={index}
    stepDelayMs={stepDelayMs}
    reducedMotion={reducedMotion}
  />
)

const part = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-part="${name}"]`)
const translate = (element: Element | null) =>
  /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/
    .exec(element?.getAttribute('style') ?? '')
    ?.slice(1)
    .map(Number)

describe('PenguinScene: the pose', () => {
  it('a tower per value, with its number, and a standing penguin on each', () => {
    const { container } = render(scene(0))
    const towers = [...container.querySelectorAll('[data-part^="tower-"]')]
    expect(towers.map((t) => t.querySelector('.snow-number')?.textContent)).toEqual(
      DEFAULT_INPUT.map(String),
    )
    for (let id = 0; id < 6; id++) {
      expect(part(container, `stand-${String(id)}`)).toHaveAttribute('opacity', '1')
      expect(part(container, `flap-${String(id)}`)).toHaveAttribute('opacity', '0')
      expect(part(container, `belly-${String(id)}`)).toHaveAttribute('opacity', '0')
    }
    expect(container.querySelector('.penguin-field')).toHaveAttribute('aria-hidden', 'true')
  })

  it('taller towers for bigger values; each stands in its slot on the ground', () => {
    const { container } = render(scene(0))
    DEFAULT_INPUT.forEach((value, k) => {
      expect(translate(part(container, `tower-${String(k)}`))).toEqual([
        GEO.towerX(k),
        GEO.floorY - GEO.heightOf(value),
      ])
    })
    const height = (id: number) =>
      Number(
        part(container, `tower-${String(id)}`)
          ?.querySelector('.snow-tower')
          ?.getAttribute('height'),
      )
    expect(height(4)).toBeGreaterThan(height(2)) // 9 > 8
    expect(height(0)).toBeGreaterThan(height(3)) // 5 > 1
  })

  it('the key waits on its sled in the lane, at the slot it came from, drawn in front', () => {
    const { container } = render(scene(SHIFT))
    // 2 (tower 1) came from slot 1; 5 has glided into that slot; 2 waits for slot 0.
    expect(translate(part(container, 'tower-1'))).toEqual([
      GEO.towerX(1),
      GEO.sledTop - GEO.heightOf(2),
    ])
    expect(translate(part(container, 'tower-0'))).toEqual([
      GEO.towerX(1),
      GEO.floorY - GEO.heightOf(5),
    ])
    expect(part(container, 'sled')).toHaveAttribute('opacity', '1')
    expect(translate(part(container, 'sled'))).toEqual([GEO.towerX(1), GEO.sledTop])
    const towers = [...container.querySelectorAll('[data-part^="tower-"]')]
    expect(towers.at(-1)).toHaveAttribute('data-part', 'tower-1')
  })

  it('back in line, the sled is gone', () => {
    const { container } = render(scene(SLIDE))
    expect(translate(part(container, 'tower-1'))).toEqual([
      GEO.towerX(0),
      GEO.floorY - GEO.heightOf(2),
    ])
    expect(part(container, 'sled')).toHaveAttribute('opacity', '0')
  })

  it('the comparing marks sit on the two tops, the key’s in the lane', () => {
    const { container } = render(scene(ASK))
    const marks = [...container.querySelectorAll('.penguin-compare')]
    expect(marks.map((m) => [Number(m.getAttribute('x')), Number(m.getAttribute('y'))])).toEqual([
      [GEO.towerX(0), GEO.floorY - GEO.heightOf(5) - 2 * GEO.s],
      [GEO.towerX(1), GEO.sledTop - GEO.heightOf(2) - 2 * GEO.s],
    ])
    expect(render(scene(TAKE)).container.querySelectorAll('.penguin-compare')).toHaveLength(0)
  })

  it('frost under the ones in order so far; green under all only when everything is final', () => {
    const frosted = (index: number) => {
      const { container, unmount } = render(scene(index))
      const lit = DEFAULT_INPUT.map((_, k) =>
        part(container, `frost-${String(k)}`)?.getAttribute('opacity'),
      )
      const final = part(container, 'final')?.getAttribute('opacity')
      unmount()
      return [lit.filter((o) => o === '1').length, final]
    }
    expect(frosted(0)).toEqual([1, '0'])
    expect(frosted(SLIDE)).toEqual([2, '0'])
    expect(frosted(LAST - 1)).toEqual([6, '0'])
    expect(frosted(LAST)).toEqual([0, '1'])
  })

  it('the finale pose: every penguin with its flippers up', () => {
    const { container } = render(scene(LAST))
    for (let id = 0; id < 6; id++) {
      expect(part(container, `flap-${String(id)}`)).toHaveAttribute('opacity', '1')
      expect(part(container, `stand-${String(id)}`)).toHaveAttribute('opacity', '0')
    }
  })

  it('never a role color on a penguin: only the marks and the final green use one', () => {
    const { container } = render(scene(ASK))
    for (const path of container.querySelectorAll('[data-part^="stand-"] path')) {
      expect(path.getAttribute('fill')).toMatch(/^var\(--(penguin|ice)-/)
    }
  })
})

describe('PenguinScene: motion', () => {
  const stepTo = (index: number, stepDelayMs = 800, reducedMotion = false) => {
    const view = render(scene(index - 1, stepDelayMs, reducedMotion))
    calls = []
    view.rerender(scene(index, stepDelayMs, reducedMotion))
    return calls
  }

  it('one step forward plays the move; a jump, or reduced motion, shows only the pose', () => {
    expect(stepTo(SLIDE).length).toBeGreaterThan(0)
    expect(stepTo(SLIDE, 800, true)).toEqual([])
    const view = render(scene(0))
    calls = []
    view.rerender(scene(SLIDE))
    expect(calls).toEqual([])
    view.rerender(scene(SLIDE - 1))
    expect(calls).toEqual([])
  })

  it('round start: the key steps down into the lane as its sled fades in', () => {
    const moves = stepTo(TAKE)
    expect(moves.map((c) => c.part)).toEqual(['tower-1', 'sled'])
    expect(moves[0]?.keyframes).toEqual([
      {
        transform: `translate(${String(GEO.towerX(1))}px, ${String(GEO.floorY - GEO.heightOf(2))}px)`,
      },
      {
        transform: `translate(${String(GEO.towerX(1))}px, ${String(GEO.sledTop - GEO.heightOf(2))}px)`,
      },
    ])
    expect(moves.map((c) => c.options.duration)).toEqual([600, 600])
  })

  it('a shift glides the bigger tower one slot right, fitted to the step', () => {
    for (const [delay, ms] of [
      [1600, 600],
      [800, 600],
      [400, 360],
      [200, 180],
    ] as const) {
      const moves = stepTo(SHIFT, delay)
      expect(moves.map((c) => c.part)).toEqual(['tower-0'])
      expect(moves[0]?.options.duration).toBe(ms)
    }
  })

  it('the slide keeps its 1.6 s (divided by the speed above 1×); the frost, its last 350 ms', () => {
    for (const [delay, ms] of [
      [1600, 1600],
      [800, 1600],
      [400, 800],
      [200, 400],
    ] as const) {
      const moves = stepTo(SLIDE, delay)
      expect(moves.map((c) => c.part)).toEqual([
        'tower-1',
        'sled',
        'stand-1',
        'belly-1',
        'spray',
        'frost-1',
      ])
      for (const c of moves.slice(0, 5)) expect(c.options.duration).toBe(ms)
      expect(moves[5]?.options).toEqual({ duration: 350, delay: ms - 350, fill: 'backwards' })
    }
  })

  it('the slide: along the lane to 78%, then up into the line; the penguin stands at 90%', () => {
    const [tower, sled, stand] = stepTo(SLIDE)
    const h = GEO.heightOf(2)
    expect(tower?.keyframes.map((k) => [k.offset, k.transform])).toEqual([
      [0, `translate(${String(GEO.towerX(1))}px, ${String(GEO.sledTop - h)}px)`],
      [0.78, `translate(${String(GEO.towerX(0))}px, ${String(GEO.sledTop - h)}px)`],
      [1, `translate(${String(GEO.towerX(0))}px, ${String(GEO.floorY - h)}px)`],
    ])
    expect(sled?.keyframes.at(-1)).toMatchObject({ opacity: 0 })
    expect(stand?.keyframes).toEqual([{ opacity: 0 }, { opacity: 0, offset: 0.9 }, { opacity: 1 }])
  })

  it('already in place: steps back, then hops, 400 + 300 ms scaled together; then the frost', () => {
    const at1x = stepTo(IN_PLACE)
    expect(at1x.map((c) => [c.part, c.options.duration, c.options.delay])).toEqual([
      ['tower-2', 400, undefined],
      ['sled', 400, undefined],
      ['hop-2', 300, 400],
      ['frost-2', 350, 350],
    ])
    const at4x = stepTo(IN_PLACE, 200)
    expect(at4x.map((c) => c.options.duration)).toEqual([
      (180 * 4) / 7,
      (180 * 4) / 7,
      180 - (180 * 4) / 7,
      180,
    ])
  })

  it('the finale: the green, then flippers up left to right 110 ms apart, then all hop', () => {
    const moves = stepTo(LAST, 200)
    expect(moves[0]).toMatchObject({ part: 'final', options: { duration: 350 } })
    const flaps = moves.filter((c) => c.part.startsWith('flap-'))
    expect(flaps.map((c) => c.options.delay)).toEqual([400, 510, 620, 730, 840, 950])
    // Left to right on the sorted line: 1 2 3 5 8 9 are towers 3, 1, 5, 0, 2, 4.
    expect(flaps.map((c) => c.part)).toEqual([
      'flap-3',
      'flap-1',
      'flap-5',
      'flap-0',
      'flap-2',
      'flap-4',
    ])
    // It plays in full, even at 4×.
    for (const hop of moves.filter((c) => c.part.startsWith('hop-'))) {
      expect(hop.options).toEqual({ duration: 260, delay: 1180 })
    }
  })
})

describe('PixelPenguin', () => {
  it('draws the standing penguin, without its rim', () => {
    const { container } = render(<PixelPenguin />)
    const svg = container.querySelector('svg.pixel-penguin')
    expect(svg).toHaveAttribute('viewBox', '0 0 12 14')
    expect(svg?.querySelectorAll('path')).toHaveLength(5)
    expect(container.innerHTML).not.toContain('--ice-light')
  })
})
