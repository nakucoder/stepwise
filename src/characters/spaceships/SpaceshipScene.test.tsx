import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mergeSort } from '../../algorithms/sorting/mergeSort'
import { DEFAULT_INPUT } from '../../data/defaultInput'
import { collectFrames } from '../../engine/collect'
import type { Level } from '../../engine/types'
import { FLIGHT_AT } from './flight'
import { LIFT, shipAt, spaceshipLayout } from './geometry'
import { PixelFighter } from './PixelFighter'
import { SpaceshipScene } from './SpaceshipScene'
import { takeoffAt } from './steps'

const FRAMES = collectFrames(mergeSort, DEFAULT_INPUT).frames
const LAST = FRAMES.length - 1
const FIRST = FRAMES[0]
if (!FIRST) throw new Error('no frames')
// 5 2 8 1 9 3: frame 1 splits the whole list; the first question (2 or 8, merging [1, 3) at
// depth 2) is ASK, its answer (2 flies up) ASK + 1, the rest (8 goes, no question) ASK + 2,
// and the merge is done (the gate shuts) at ASK + 3.
const SPLIT = 1
const ASK = FRAMES.findIndex((frame) => frame.decision)
const TAKE = ASK + 1
const REST = ASK + 2
const SHUT = ASK + 3
// The last merge's first question (depth 0: the halves on row 1, not the last row).
const TOP_ASK = FRAMES.findIndex((frame) => frame.decision && frame.span?.depth === 0)

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

// The spec's phone field: 366 × 382 (no gap measured in jsdom).
let box = { width: 366, height: 382 }
const geoFor = () => spaceshipLayout({ ...box, gap: 0 }, DEFAULT_INPUT)

beforeEach(() => {
  calls = []
  box = { width: 366, height: 382 }
  Object.assign(Element.prototype, { animate })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        width: box.width,
        height: box.height,
        top: 0,
        left: 0,
        right: box.width,
        bottom: box.height,
      }) as DOMRect,
  )
})

afterEach(() => {
  animate.mockClear()
  vi.restoreAllMocks()
  Reflect.deleteProperty(Element.prototype, 'animate')
})

const scene = (
  index: number,
  options: {
    stepDelayMs?: number
    reducedMotion?: boolean
    level?: Level
    asking?: boolean
  } = {},
) => (
  <SpaceshipScene
    frame={FRAMES[index] ?? FIRST}
    frames={FRAMES}
    index={index}
    stepDelayMs={options.stepDelayMs ?? 800}
    reducedMotion={options.reducedMotion ?? false}
    level={options.level ?? 'engineer'}
    asking={options.asking ?? false}
  />
)

const part = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-part="${name}"]`)
const translate = (element: Element | null) =>
  /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/
    .exec(element?.getAttribute('style') ?? '')
    ?.slice(1)
    .map(Number)
const ships = (container: HTMLElement) => [...container.querySelectorAll('[data-part^="ship-"]')]

describe('SpaceshipScene: the pose', () => {
  it('a fighter per value, with its digit, all in one squadron on the top row', () => {
    const { container } = render(scene(0))
    const geo = geoFor()
    expect(ships(container).map((s) => s.querySelector('.space-digit')?.textContent)).toEqual(
      DEFAULT_INPUT.map(String),
    )
    DEFAULT_INPUT.forEach((_, id) => {
      expect(translate(part(container, `ship-${String(id)}`))).toEqual([...shipAt(geo, id, 0)])
    })
    // One fighter for every value: the 25 × 25 cruiser on this field.
    expect(geo.grid).toBe(25)
    expect(container.querySelectorAll('.space-frame')).toHaveLength(1)
  })

  it('every ship the same fighter; its trail as long as its value says, its digit at the end', () => {
    const { container } = render(scene(0, { reducedMotion: true }))
    const geo = geoFor()
    const sprites = ships(container).map(
      (s) => s.querySelector('[transform^="scale"] .space-outline')?.getAttribute('d') ?? '',
    )
    expect(new Set(sprites).size).toBe(1)
    DEFAULT_INPUT.forEach((value, id) => {
      const ship = part(container, `ship-${String(id)}`)
      const rects = [...(ship?.querySelectorAll('[data-part="trail"] rect') ?? [])]
      const units = Math.max(
        ...rects
          .filter((r) => r.classList.contains('is-core') || r.classList.contains('is-flame'))
          .concat(rects.filter((r) => r.classList.contains('is-tip')))
          .map((r) => Number(r.getAttribute('y')) + Number(r.getAttribute('height'))),
      )
      // The flame reaches the trail's length (a spark may go one unit past it).
      expect([geo.trail(value), geo.trail(value) + 2]).toContain(units * geo.s)
      const plate = ship?.querySelector(`[data-part="plate-${String(id)}"] rect`)
      expect(Number(plate?.getAttribute('y'))).toBe(geo.side + geo.trail(value) + 1)
      expect(ship?.querySelector('.space-digit')?.textContent).toBe(String(value))
    })
  })

  it('each ship carries its banked frames and its thrust burst, hidden until a flight', () => {
    const { container } = render(scene(0, { reducedMotion: true }))
    const geo = geoFor()
    const id = DEFAULT_INPUT.indexOf(9)
    const ship = part(container, `ship-${String(id)}`)
    expect(part(container, `look-level-${String(id)}`)?.getAttribute('opacity')).toBeNull()
    for (const hidden of ['look-left', 'look-right', 'boost-0', 'boost-1']) {
      expect(part(container, `${hidden}-${String(id)}`)?.getAttribute('opacity')).toBe('0')
    }
    // The burst is exactly as long as the trail (no spark past it), and wider.
    const reach = (name: string) =>
      Math.max(
        ...[...(ship?.querySelectorAll(`[data-part="${name}"] rect`) ?? [])].map(
          (r) => Number(r.getAttribute('y')) + Number(r.getAttribute('height')),
        ),
      )
    const columns = (name: string) =>
      new Set(
        [...(ship?.querySelectorAll(`[data-part="${name}"] rect`) ?? [])].map((r) =>
          r.getAttribute('x'),
        ),
      ).size
    expect(reach(`boost-0-${String(id)}`) * geo.s).toBe(geo.trail(9))
    expect(reach(`boost-1-${String(id)}`) * geo.s).toBe(geo.trail(9))
    expect(columns(`boost-0-${String(id)}`)).toBeGreaterThan(columns('trail'))
  })

  it('a split: both halves on the next row, each a squadron', () => {
    const { container } = render(scene(SPLIT, { reducedMotion: true }))
    const geo = geoFor()
    expect(translate(part(container, 'ship-0'))).toEqual([...shipAt(geo, 0, 1)])
    expect(part(container, 'bracket-0-2-1')).not.toBeNull()
    expect(part(container, 'bracket-3-5-1')).not.toBeNull()
  })

  it('a compare: the gate open, the new squadron’s empty slots, the leads lifted and ringed', () => {
    const { container } = render(scene(ASK, { reducedMotion: true }))
    const geo = geoFor()
    expect(part(container, 'gate')?.getAttribute('opacity')).toBe('1')
    expect(container.querySelectorAll('.space-slot')).toHaveLength(2)
    expect(container.querySelectorAll('.space-ring.is-comparing')).toHaveLength(2)
    // 2 (ship 1) and 8 (ship 2), lifted 2 units on row 3.
    expect(translate(part(container, 'ship-1'))).toEqual([...shipAt(geo, 1, 3, true)])
    expect(translate(part(container, 'ship-2'))).toEqual([...shipAt(geo, 2, 3, true)])
  })

  it('after a take: the ship in its new place, no rings', () => {
    const { container } = render(scene(TAKE, { reducedMotion: true }))
    expect(translate(part(container, 'ship-1'))).toEqual([...shipAt(geoFor(), 1, 2)])
    expect(container.querySelectorAll('.space-ring')).toHaveLength(0)
  })

  it('after a merge: no gate, one squadron', () => {
    const { container } = render(scene(SHUT, { reducedMotion: true }))
    expect(part(container, 'gate')?.getAttribute('opacity')).toBe('0')
    expect(container.querySelectorAll('.space-slot')).toHaveLength(0)
    expect(part(container, 'bracket-merged')).not.toBeNull()
  })

  it('the end: every ship in formation on the top row, ringed green', () => {
    const { container } = render(scene(LAST, { reducedMotion: true }))
    expect(container.querySelectorAll('.space-ring.is-sorted')).toHaveLength(6)
    expect(container.querySelectorAll('.space-ring.is-comparing')).toHaveLength(0)
    const digits = ships(container)
      .map((s) => ({
        x: translate(s)?.[0] ?? 0,
        digit: s.querySelector('.space-digit')?.textContent,
      }))
      .sort((a, b) => a.x - b.x)
      .map((s) => s.digit)
    expect(digits).toEqual(['1', '2', '3', '5', '8', '9'])
  })

  it('the starfield, its own colors, and no yellow but the rings', () => {
    const { container } = render(scene(ASK))
    expect(container.querySelectorAll('.space-star')).toHaveLength(9)
    expect(container.querySelectorAll('.space-star-bright')).toHaveLength(2)
    expect(container.querySelector('.space-field')).not.toBeNull()
  })
})

describe('SpaceshipScene: Do it', () => {
  it('Explorer, a question waiting: L and R badges above the two leads', () => {
    const { container } = render(scene(ASK, { level: 'explorer', asking: true }))
    const badges = [...container.querySelectorAll('.space-badge')]
    expect(badges.map((b) => b.textContent)).toEqual(['L', 'R'])
  })

  it.each([
    ['engineer', true],
    ['explorer', false],
  ] as const)('%s, asking %s: no badges', (level, asking) => {
    const { container } = render(scene(ASK, { level, asking }))
    expect(container.querySelectorAll('.space-badge')).toHaveLength(0)
  })

  it('Engineer taps the halves’ row: a pick band during a merge, to the bottom on the last row', () => {
    const last = render(scene(ASK)).container.querySelector('[data-pick-band]')
    expect(last?.getAttribute('data-pick-band')).toBe('to-bottom')
    const top = render(scene(TOP_ASK)).container.querySelector('[data-pick-band]')
    const geo = geoFor()
    expect(top?.getAttribute('data-pick-band')).toBe('')
    expect((top as HTMLElement | null)?.style.top).toBe(`${String(geo.rowTop(1))}px`)
    expect((top as HTMLElement | null)?.style.height).toBe(`${String(geo.rowH)}px`)
    expect(render(scene(0)).container.querySelector('[data-pick-band]')).toBeNull()
  })
})

describe('SpaceshipScene: the moves', () => {
  /** Renders frame `index − 1`, then steps forward to `index` (or jumps to `to`). */
  function step(index: number, to = index, options: Parameters<typeof scene>[1] = {}) {
    const { container, rerender } = render(scene(index - 1, options))
    calls = []
    rerender(scene(to, options))
    return container
  }
  const callsOn = (name: string) => calls.filter((c) => c.part === name)

  it('a split: each ship drops a row, banking 3 units out at mid-flight', () => {
    step(SPLIT)
    const left = callsOn('ship-0')[0]
    const right = callsOn('ship-5')[0]
    /** The x of each keyframe's translate. */
    const xs = (call: Call | undefined): number[] =>
      (call?.keyframes ?? []).map((k) => {
        const found = /translate\((-?[\d.]+)px/.exec(String(k.transform))
        return Number(found?.[1] ?? NaN)
      })
    const [l0 = 0, l1 = 0, l2 = 0] = xs(left)
    const [r0 = 0, r1 = 0, r2 = 0] = xs(right)
    expect(left?.options.duration).toBe(600)
    // 3 units out at mid-flight: the left half to the left, the right to the right.
    const bank = 3 * geoFor().s
    expect(l1).toBe((l0 + l2) / 2 - bank)
    expect(r1).toBe((r0 + r2) / 2 + bank)
    expect(callsOn('bracket-peeled')).toHaveLength(1)
  })

  it('the first compare: the gate opens (300 ms), then the leads lift and ring (200 ms)', () => {
    step(ASK)
    expect(callsOn('gate-bar')[0]?.options.duration).toBe(300)
    expect(callsOn('forming')).toHaveLength(1)
    const ring = callsOn('ring-1')[0]
    expect(ring?.options).toMatchObject({ duration: 200, delay: 300 })
    expect(callsOn('ship-1')[0]?.options).toMatchObject({ duration: 200, delay: 300 })
  })

  /** The [x, y] of each keyframe's translate. */
  const points = (call: Call | undefined): number[][] =>
    (call?.keyframes ?? []).map((k) =>
      (/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(String(k.transform)) ?? [])
        .slice(1)
        .map(Number),
    )

  it('a take: a curve up through the gate into its slot, then a bob; the glow doubles; the gate lights', () => {
    const container = step(TAKE)
    const flight = callsOn('ship-1')[0]
    expect(flight?.options.duration).toBe(650)
    const offsets = flight?.keyframes.map((k) => k.offset) ?? []
    expect(offsets[0]).toBe(0)
    expect(offsets.at(-1)).toBe(1)
    expect([...offsets].sort((a, b) => Number(a) - Number(b))).toEqual(offsets)
    // From where it stood as a lead, to its slot (its pose), bobbing up 2 units on the way in.
    const at = points(flight)
    const [, y1 = 0] = at.at(-1) ?? []
    expect(at.at(-1)).toEqual(translate(part(container, 'ship-1')))
    expect(at.at(-2)).toEqual([at.at(-1)?.[0], y1 - LIFT * geoFor().s])
    expect(offsets.at(-3)).toBeCloseTo(FLIGHT_AT.arrive)
    expect(callsOn('glow-long-1')).toHaveLength(1)
    expect(callsOn('gate-flash')).toHaveLength(1)
    // The other lead (8) eases back into formation.
    expect(callsOn('ship-2')[0]?.options.duration).toBe(200)
  })

  it('across to another column: a curve, banking left into the turn with the banked frames', () => {
    // The last merge's first take: 1 flies from column 3 to column 0.
    step(TOP_ASK + 1)
    const one = String(DEFAULT_INPUT.indexOf(1))
    const at = points(callsOn(`ship-${one}`)[0])
    // It moves left, and never in a straight line from start to slot (a curve, not a corner).
    expect(at.at(-1)?.[0]).toBeLessThan(at[0]?.[0] ?? 0)
    const xs = new Set(at.map(([x]) => x))
    expect(xs.size).toBeGreaterThan(10)
    const shown = (bank: string) =>
      (callsOn(`look-${bank}-${one}`)[0]?.keyframes ?? []).map((k) => k.opacity)
    expect(shown('level')[0]).toBe(1)
    expect(shown('level').at(-1)).toBe(1)
    expect(shown('left')).toContain(1)
    expect(shown('right')).not.toContain(1)
    for (const k of callsOn(`look-left-${one}`)[0]?.keyframes ?? []) {
      expect(k.easing).toBe('step-end')
    }
    // Its transform only ever moves it: the sprite is never rotated or skewed.
    for (const k of callsOn(`ship-${one}`)[0]?.keyframes ?? []) {
      expect(String(k.transform)).toMatch(/^translate\(/)
    }
  })

  it('the thrust burst up to the gate: brighter and wider, flickering; the trail and plate stay', () => {
    step(TAKE)
    const trail = callsOn('trail')[0]
    const a = callsOn('boost-0-1')[0]
    const b = callsOn('boost-1-1')[0]
    // While the burst shows, the trail is hidden (the burst is as long as it).
    const on = (call: Call | undefined, offset: number) =>
      [...(call?.keyframes ?? [])].reverse().find((k) => Number(k.offset) <= offset)?.opacity
    expect(on(trail, 0)).toBe(1)
    expect(on(trail, 0.2)).toBe(0)
    expect(on(trail, 0.6)).toBe(1)
    // The two frames take turns every 40 ms.
    const flicker = (a?.keyframes ?? []).filter(
      (k) => Number(k.offset) >= FLIGHT_AT.boostFrom && Number(k.offset) < FLIGHT_AT.gate,
    )
    expect(flicker.length).toBeGreaterThan(5)
    expect(on(a, FLIGHT_AT.boostFrom + 0.01)).toBe(1)
    expect(on(b, FLIGHT_AT.boostFrom + 0.01)).toBe(0)
    expect(on(a, FLIGHT_AT.boostFrom + 40 / 650 + 0.01)).toBe(0)
    expect(on(b, FLIGHT_AT.boostFrom + 40 / 650 + 0.01)).toBe(1)
    expect(on(a, 0.9)).toBe(0)
    expect(on(b, 0.9)).toBe(0)
    // The plate never moves on the ship.
    expect(callsOn('plate-1')).toHaveLength(0)
  })

  it('a rest: the same flight, with no lead to ease back', () => {
    step(REST)
    const flight = callsOn('ship-2')[0]
    expect(flight?.options.duration).toBe(650)
    expect(flight?.keyframes.at(-1)?.offset).toBe(1)
    expect(calls.filter((c) => c.part.startsWith('ship-'))).toHaveLength(1)
  })

  it.each([
    [800, 900],
    [400, 450],
    [1600, 900],
  ])('the gate flashes and shuts: at a %i ms step, %i ms (the step waits)', (delay, ms) => {
    step(SHUT, SHUT, { stepDelayMs: delay })
    for (const name of [
      'gate',
      'gate-flash',
      'gate-bar',
      'gate-post-0',
      'gate-post-1',
      'bracket-glow',
    ]) {
      expect(callsOn(name)[0]?.options.duration).toBe(ms)
    }
  })

  it('the finale: green rings, then each ship loops off the top and back in, in turn', () => {
    step(LAST)
    expect(callsOn('ring-0')[0]?.options.duration).toBe(350)
    const delays = [...Array(6).keys()].map((id) => callsOn(`ship-${String(id)}`)[0]?.options.delay)
    expect([...delays].sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(
      [0, 1, 2, 3, 4, 5].map(takeoffAt),
    )
    expect(callsOn('ship-0')[0]?.options.duration).toBe(1200)
    // A slow start, back in from below, then a bob: up 2 units and down into its slot.
    const loop = points(callsOn('ship-0')[0])
    const [x = 0, y = 0] = loop[0] ?? []
    expect(loop.slice(-3)).toEqual([
      [x, y],
      [x, y - LIFT * geoFor().s],
      [x, y],
    ])
    // Full thrust while it climbs out, after its own takeoff.
    const burst = callsOn('boost-0-0')[0]
    expect(burst?.options).toMatchObject({
      duration: 1200,
      delay: callsOn('ship-0')[0]?.options.delay,
    })
    expect(burst?.keyframes.some((k) => k.opacity === 1)).toBe(true)
    expect(callsOn('plate-0')).toHaveLength(0)
  })

  it('reduced motion, a step back or a jump: the pose, no moves', () => {
    step(TAKE, TAKE, { reducedMotion: true })
    expect(calls).toHaveLength(0)
    const { rerender } = render(scene(TAKE))
    calls = []
    rerender(scene(ASK))
    expect(calls).toHaveLength(0)
    rerender(scene(LAST))
    expect(calls).toHaveLength(0)
  })
})

describe('SpaceshipScene: the zoom on a short stage', () => {
  it('479 × 53: only the merge in progress, on two rows', () => {
    box = { width: 479, height: 53 }
    const { container } = render(scene(ASK, { reducedMotion: true }))
    const geo = geoFor()
    expect(geo.plan).toBe('zoom')
    // [1, 3) at depth 2: the 2 and the 8 on the halves' row, nothing else.
    expect(ships(container).map((s) => s.querySelector('.space-digit')?.textContent)).toEqual([
      '2',
      '8',
    ])
    expect(translate(part(container, 'ship-1'))).toEqual([...shipAt(geo, 1, 1, true)])
  })

  it('a new family fades in instead of flying', () => {
    box = { width: 479, height: 53 }
    const { rerender } = render(scene(SPLIT))
    calls = []
    rerender(scene(SPLIT + 1))
    expect(calls.map((c) => c.part)).toEqual(['scene'])
  })
})

describe('PixelFighter', () => {
  it('is the smallest fighter, 9 × 9', () => {
    const { container } = render(<PixelFighter />)
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 9 9')
  })
})
