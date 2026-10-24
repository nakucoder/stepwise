import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { collectFrames } from '../../engine/collect'
import { pizzaLayout } from './geometry'
import { PixelCart } from './PixelCart'
import { PizzaCartScene } from './PizzaCartScene'
import { pizzaPoses, type Action } from './steps'

const SPEC = [7, 2, 11, 5, 1, 9, 12, 4, 7, 10, 6, 8]
const FRAMES = collectFrames(quickSort, SPEC).frames
const POSES = pizzaPoses(FRAMES)
const LAST = FRAMES.length - 1
const at = (action: Action) => POSES.findIndex((pose) => pose.action === action)

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

// The desktop's field (698 × 163, no gap measured in jsdom): 8 px boxes with lids and the word.
const BOX = { width: 698, height: 163 }
const GEO = pizzaLayout(BOX, SPEC.length)

beforeEach(() => {
  calls = []
  Object.assign(Element.prototype, { animate })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    ...BOX,
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

const FIRST = FRAMES[0]
if (!FIRST) throw new Error('no frames')

const scene = (index: number, stepDelayMs = 800, reducedMotion = false) => (
  <PizzaCartScene
    frame={FRAMES[index] ?? FIRST}
    frames={FRAMES}
    index={index}
    stepDelayMs={stepDelayMs}
    reducedMotion={reducedMotion}
    level="explorer"
    asking={false}
  />
)

const cart = (container: HTMLElement) => container.querySelector<HTMLElement>('.pizza-cart')
const stacks = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.pizza-stack'),
]
const stackIn = (container: HTMLElement, col: number) => {
  const id = POSES[Number(container.dataset.index)]?.order[col]
  return container.querySelector<HTMLElement>(`[data-part="stack-${String(id)}"]`)
}

/** Renders frame k − 1, then steps forward into k (the only change that plays a move). */
function stepInto(k: number, stepDelayMs = 800, reducedMotion = false) {
  const view = render(scene(k - 1, stepDelayMs, reducedMotion))
  calls = []
  view.rerender(scene(k, stepDelayMs, reducedMotion))
  view.container.dataset.index = String(k)
  return view
}

describe('PizzaCartScene: the pose', () => {
  it('draws a stack of boxes for every value, one box per count, its digit on its dolly', () => {
    const { container } = render(scene(0))
    const all = stacks(container)
    expect(all.map((s) => s.querySelector('.pizza-digit')?.textContent)).toEqual(SPEC.map(String))
    for (const stack of all) {
      const value = Number(stack.dataset.value)
      const art = stack.querySelector('.pizza-art')
      // The art is the boxes (one per count) and the lid over the top one.
      expect(Number(art?.getAttribute('height'))).toBe(value * GEO.boxPx + GEO.lid)
    }
  })

  it('has a bigger number always stand taller', () => {
    const { container } = render(scene(0))
    const tops = stacks(container).map((s) => [Number(s.dataset.value), parseFloat(s.style.top)])
    for (const [a, ta] of tops) {
      for (const [b, tb] of tops) if ((a ?? 0) > (b ?? 0)) expect(ta).toBeLessThan(tb ?? 0)
    }
  })

  it.each([
    ['idle', 0],
    ['pick', at('pick')],
    ['look', at('look')],
    ['carry', at('carry')],
    ['stay', at('stay')],
    ['nudge', at('nudge')],
    ['deliver', at('deliver')],
    ['done', at('done')],
    ['finale', LAST],
  ] as const)('shows the %s moment with the cart’s mood', (action, k) => {
    const { container } = render(scene(k))
    const mood = {
      idle: 'idle',
      pick: 'look',
      look: 'look',
      carry: 'found',
      stay: 'stay',
      nudge: 'found',
      deliver: 'delivered',
      done: 'done',
      finale: 'finale',
    }[action]
    expect(cart(container)?.dataset).toMatchObject({ action, mood })
    // The cart stands under the stack it works on, its wheels on the field's bottom.
    const x = POSES[k]?.cart ?? 0
    expect(cart(container)?.style.transform).toBe(
      `translate(${String(Math.round(GEO.cartX(x)))}px, ${String(Math.round(GEO.cartY))}px)`,
    )
  })

  it('reds the leader with a bow from the pick, rings the value compared', () => {
    const k = at('look')
    const { container } = render(scene(k))
    container.dataset.index = String(k)
    const p = FRAMES[k]?.partition
    if (!p) throw new Error('no partition')
    expect(stackIn(container, p.pivot)).toHaveClass('is-leader')
    expect(stackIn(container, p.pivot)?.querySelector('.pizza-bow')).not.toBeNull()
    expect(stackIn(container, p.next)).toHaveClass('is-compared')
    expect(container.querySelectorAll('.is-leader')).toHaveLength(1)
    expect(container.querySelectorAll('.is-compared')).toHaveLength(1)
  })

  it('opens the leader’s top box with steam only on "Delivered!"', () => {
    for (let k = 0; k <= LAST; k++) {
      const { container, unmount } = render(scene(k))
      const delivering = POSES[k]?.action === 'deliver'
      expect(container.querySelectorAll('.pizza-steam'), `frame ${String(k)}`).toHaveLength(
        delivering ? 1 : 0,
      )
      expect(container.querySelectorAll('.pizza-art.is-open')).toHaveLength(delivering ? 1 : 0)
      unmount()
    }
  })

  it('dims the values outside the range until they are in place, and marks those in place', () => {
    const k = at('done')
    const { container } = render(scene(k))
    container.dataset.index = String(k)
    const [lo, hi] = POSES[k]?.range ?? [0, 0]
    SPEC.forEach((_, col) => {
      const sorted = POSES[k]?.sorted.includes(col) ?? false
      const stack = stackIn(container, col)
      expect(stack?.classList.contains('is-sorted')).toBe(sorted)
      expect(stack?.classList.contains('is-dim')).toBe(!sorted && (col < lo || col >= hi))
    })
  })

  it('zones the lane: a solid band for smaller or equal, hatched for bigger', () => {
    const { container } = render(scene(at('stay')))
    expect(container.querySelector('.pizza-zone.is-left')).not.toBeNull()
    expect(container.querySelector('.pizza-zone.is-bigger')).not.toBeNull()
  })
})

describe('PizzaCartScene: the moves', () => {
  const parts = () => calls.map((c) => c.part)

  it('plays a trade: the cart, the carried stack lifted, the other stack sliding', () => {
    const k = at('carry')
    stepInto(k)
    expect(parts()).toContain('cart')
    const lifted = calls.filter((c) => c.part.startsWith('stack-'))
    expect(lifted).toHaveLength(2)
    // The carried one rides 2 px × the cart's scale above the curb.
    expect(JSON.stringify(lifted[0]?.keyframes)).toContain(`, -${String(2 * GEO.s)}px)`)
    // Fitted to the step: 700 ms at 1×, 0.9 of the step at 4×.
    expect(calls.find((c) => c.part === 'cart')?.options.duration).toBe(700)
    stepInto(k, 200)
    expect(calls.find((c) => c.part === 'cart')?.options.duration).toBe(180)
  })

  it('plays "Delivered!" in full at 1×: the carry, then the lid, the steam and the bounce', () => {
    stepInto(at('deliver'))
    expect(calls.find((c) => c.part === 'cart')?.options.duration).toBe(950)
    expect(parts().some((p) => p.startsWith('flap-'))).toBe(true)
    expect(calls.filter((c) => c.part.startsWith('puff-'))).toHaveLength(3)
    const last = Math.max(
      ...calls.map((c) => (c.options.delay ?? 0) + Number(c.options.duration ?? 0)),
    )
    expect(last).toBeLessThanOrEqual(1600)
    expect(last).toBeGreaterThan(1500)
  })

  it('wobbles a value left on the right, lifts one that trades with itself', () => {
    stepInto(at('stay'))
    expect(JSON.stringify(calls.map((c) => c.keyframes))).toContain('rotate(3deg)')
    stepInto(at('nudge'))
    expect(JSON.stringify(calls.map((c) => c.keyframes))).toContain(`-${String(3 * GEO.s)}px)`)
  })

  it('plays the finale in full: every stack hops, left to right', () => {
    stepInto(LAST, 200)
    const hops = calls.filter((c) => c.part.startsWith('hop-'))
    expect(hops).toHaveLength(SPEC.length)
    const delays = hops.map((c) => Number(c.options.delay))
    expect(delays).toEqual([...delays].sort((a, b) => a - b))
    expect(Math.max(...delays) + Number(hops[0]?.options.duration)).toBe(840)
  })

  it('times the mood’s frames over the step', () => {
    stepInto(at('carry'))
    const moods = calls.filter((c) => c.part.startsWith('mood-'))
    expect(moods.length).toBeGreaterThan(1)
  })

  it('shows only the pose with reduced motion, after a jump, or stepping back', () => {
    stepInto(at('carry'), 800, true)
    expect(calls).toEqual([])
    const view = render(scene(at('carry') + 3))
    calls = []
    view.rerender(scene(at('carry')))
    expect(calls).toEqual([])
  })

  it('rests on each mood’s last frame (the others hidden) when nothing plays', () => {
    const { container } = render(scene(at('carry')))
    const layers = [...container.querySelectorAll<HTMLElement>('.pizza-mood')]
    expect(layers.length).toBeGreaterThan(1)
    expect(layers.slice(0, -1).every((l) => l.style.opacity === '0')).toBe(true)
    expect(layers.at(-1)?.style.opacity).toBe('')
  })
})

describe('PixelCart', () => {
  it('draws the cart as the switch’s icon', () => {
    const { container } = render(<PixelCart />)
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 26 15')
  })
})
