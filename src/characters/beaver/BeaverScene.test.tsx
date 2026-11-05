import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { heapSort } from '../../algorithms/sorting/heapSort'
import { Stage } from '../../components/Stage'
import { collectFrames } from '../../engine/collect'
import { BeaverScene } from './BeaverScene'
import { beaverLayout } from './geometry'
import { PixelBeaver } from './PixelBeaver'
import {
  BEAVER_H,
  BEAVER_SPRITES,
  BEAVER_W,
  beaverRows,
  logEndRows,
  logRows,
  stackRows,
} from './sprites'
import { beaverPoses, MOOD_SPRITE, type Action } from './steps'

const SPEC = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8]
const FRAMES = collectFrames(heapSort, SPEC).frames
const POSES = beaverPoses(FRAMES)
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

// The desktop's field beside the dam (436 × 253; no gap measured in jsdom) and the dam's slot.
const BOX = { width: 436, height: 253 }
const SLOT = { width: 250, height: 320 }
const GEO = beaverLayout(BOX, SPEC.length)

beforeEach(() => {
  calls = []
  Object.assign(Element.prototype, { animate })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const box = this.hasAttribute('data-tree-slot') ? SLOT : BOX
    return { ...box, top: 0, left: 0, right: box.width, bottom: box.height } as DOMRect
  })
})

afterEach(() => {
  animate.mockClear()
  vi.restoreAllMocks()
  Reflect.deleteProperty(Element.prototype, 'animate')
})

const FIRST = FRAMES[0]
if (!FIRST) throw new Error('no frames')

const scene = (index: number, reducedMotion = false) => (
  <BeaverScene
    frame={FRAMES[index] ?? FIRST}
    frames={FRAMES}
    index={index}
    stepDelayMs={800}
    reducedMotion={reducedMotion}
    level="explorer"
    asking={false}
  />
)

/** The scene on the stage, as the page draws it (its dam in the stage's slot, beside on a desktop). */
const onStage = (index: number) => stageWith(index, 'desktop')
const stageWith = (index: number, layout: 'desktop' | 'phone') => (
  <Stage
    frame={FRAMES[index] ?? FIRST}
    level="explorer"
    stepDelayMs={800}
    look="beaver"
    heaps
    layout={layout}
    timeline={{ frames: FRAMES, index }}
  />
)

const stacks = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.beaver-stack'),
]
const beaver = (container: HTMLElement) => container.querySelector<HTMLElement>('.beaver')

/** Renders frame k − 1, then steps forward into k (the only change that plays a move). */
function stepInto(k: number, reducedMotion = false, element = scene) {
  const view = render(element(k - 1, reducedMotion))
  calls = []
  view.rerender(element(k, reducedMotion))
  return view
}

describe('the beaver’s sprites', () => {
  it.each(BEAVER_SPRITES)('%s: 30 × 16, in its own codes, outlined', (sprite) => {
    const rows = beaverRows(sprite)
    expect(rows).toHaveLength(BEAVER_H)
    for (const row of rows) {
      expect(row).toHaveLength(BEAVER_W)
      expect(row).toMatch(/^[.oflldtxesnwhHm]*$/)
    }
    // The hard hat and the teeth on every mood.
    expect(rows.join('')).toMatch(/h/)
    expect(rows.join('')).toMatch(/w/)
  })

  it('shows each mood in its eyes, mouth and arms', () => {
    const moods = BEAVER_SPRITES.map((sprite) => beaverRows(sprite).join('\n'))
    expect(new Set(moods).size).toBe(BEAVER_SPRITES.length)
    expect(beaverRows('happy').join('')).toMatch(/m/)
    expect(beaverRows('found').join('')).toMatch(/s/)
  })

  it('draws a log with its rounded end, cut end and ring where they fit, plain below', () => {
    const big = logRows(12, 26)
    expect(big).toHaveLength(12)
    expect(big[0]).toBe('o'.repeat(26))
    expect(big.join('')).toMatch(/R/)
    expect(big.join('')).toMatch(/S/)
    const small = logRows(4, 26).join('')
    expect(small).toMatch(/C/)
    expect(small).not.toMatch(/R|S/)
    // At 1 px a stack is a plain column.
    expect(stackRows(5, 1, 20)).toEqual(Array.from({ length: 5 }, () => 'B'.repeat(20)))
  })

  it('stacks one log per count, closed by one line under the bottom one', () => {
    const rows = stackRows(7, 8, 26)
    expect(rows).toHaveLength(7 * 8 + 1)
    expect(rows.at(-1)).toBe('o'.repeat(26))
  })

  it('draws a log end for the dam, outlined, with growth rings', () => {
    const rows = logEndRows(28)
    expect(rows).toHaveLength(30)
    expect(rows.join('')).toMatch(/R/)
  })

  it('draws the icon for the Show as switch', () => {
    const { container } = render(<PixelBeaver />)
    expect(container.querySelector('svg.pixel-beaver')).toHaveAttribute('viewBox', '0 0 30 16')
  })
})

describe('BeaverScene: the pose', () => {
  it('draws a stack of logs for every value, one log per count, its number on its plate', () => {
    const { container } = render(scene(0))
    const all = stacks(container)
    expect(all.map((s) => s.querySelector('.beaver-plate')?.textContent)).toEqual(SPEC.map(String))
    for (const stack of all) {
      const value = Number(stack.dataset.value)
      const art = stack.querySelector('.beaver-logs')
      expect(Number(art?.getAttribute('height'))).toBe(GEO.heightOf(value))
    }
    expect(container.querySelector('.beaver-scene')?.getAttribute('data-log')).toBe(
      String(GEO.logPx),
    )
  })

  it.each([
    ['start', 0, 'waiting'],
    ['look', at('look'), 'looking'],
    ['climb', at('climb'), 'waiting'],
    ['stop', at('stop'), 'shrug'],
    ['settle', at('settle'), 'waiting'],
    ['handover', at('handover'), 'proud'],
    ['haul', at('haul'), 'proud'],
    ['finale', LAST, 'happy'],
  ] as const)('shows the %s moment with the beaver’s mood', (action, k, mood) => {
    const { container } = render(scene(k))
    expect(beaver(container)?.dataset).toMatchObject({ action, mood })
    // Its resting sprite shows; the others wait their turn.
    for (const sprite of BEAVER_SPRITES) {
      const art = container.querySelector<SVGElement>(`[data-part="sprite-${sprite}"]`)
      expect(art?.style.opacity).toBe(sprite === MOOD_SPRITE[mood] ? '' : '0')
    }
    const pose = POSES[k]
    expect(beaver(container)?.style.transform).toBe(
      `translate(${String(Math.round(GEO.beaverX(pose?.beaver ?? 0, pose?.left)))}px, ${String(Math.round(GEO.beaverY))}px)`,
    )
  })

  it('rings the family compared yellow, a climb pink, and marks the stacks in place', () => {
    const look = render(scene(at('look'))).container
    expect(look.querySelectorAll('.beaver-stack.is-looking')).toHaveLength(2)
    const climb = render(scene(at('climb'))).container
    expect(climb.querySelectorAll('.beaver-stack.is-trading')).toHaveLength(2)
    const end = render(scene(LAST)).container
    expect(end.querySelectorAll('.beaver-stack.is-sorted')).toHaveLength(SPEC.length)
    // Never a role colour on the beaver itself.
    expect(end.querySelector('.beaver')?.className).toBe('beaver')
  })
})

describe('BeaverScene: the dam, the tree view', () => {
  it('stands beside the stacks on a desktop, in the stage’s slot, matching the stacks', () => {
    for (const k of [0, at('look'), at('climb'), at('haul'), LAST]) {
      const { container, unmount } = render(onStage(k))
      const slot = container.querySelector('[data-tree-slot]')
      expect(slot).toHaveAttribute('data-tree-slot', 'beside')
      expect(container.querySelector('.stage-split')).not.toBeNull()
      // The top leaving for the woodpile is drawn hidden, to drop out while the haul plays.
      const logs = [...(slot?.querySelectorAll<HTMLElement>('.beaver-dam-log') ?? [])].filter(
        (log) => log.style.opacity !== '0',
      )
      const pose = POSES[k]
      const frame = FRAMES[k]
      expect(logs.map((log) => Number(log.dataset.value))).toEqual(frame?.array.slice(0, pose?.end))
      // Their rings are the stacks' rings.
      for (const log of logs) {
        const col = Number(log.dataset.k)
        const stack = container.querySelector(`.beaver-stack[data-col="${String(col)}"]`)
        for (const ring of ['is-looking', 'is-trading']) {
          expect(log.classList.contains(ring)).toBe(stack?.classList.contains(ring))
        }
      }
      unmount()
    }
  })

  it('stands over the band on a phone, and says the pyramid to screen readers', () => {
    const { container } = render(stageWith(at('look'), 'phone'))
    const slot = container.querySelector('[data-tree-slot]')
    expect(slot).toHaveAttribute('data-tree-slot', 'over')
    expect(slot).toHaveClass('heap-tree', 'is-stage')
    expect(slot).toHaveAttribute('role', 'img')
    expect(slot?.getAttribute('aria-label')).toMatch(/^The pyramid, from the top: /)
    expect(slot?.querySelectorAll('.beaver-dam-log')).toHaveLength(SPEC.length)
    // The site's own tree steps aside for the dam.
    expect(container.querySelectorAll('.heap-tree')).toHaveLength(1)
  })

  it('marks the family’s sticks, yellow while compared', () => {
    const families = POSES.flatMap((pose, k) => (pose.action === 'look' ? [k] : []))
    for (const k of families) {
      const { container, unmount } = render(onStage(k))
      expect(container.querySelectorAll('.beaver-dam-link.is-looking')).toHaveLength(
        FRAMES[k]?.heap?.children.length ?? 0,
      )
      unmount()
    }
  })
})

describe('BeaverScene: the moves', () => {
  it('plays a climb: the stack carried up and the parent’s slid down, on the stage and in the dam', () => {
    const k = at('climb')
    const move = POSES[k]
    const [parent, child] = FRAMES[k]?.highlights.swapping ?? []
    const carried = String(move?.order[parent ?? 0])
    const other = String(move?.order[child ?? 0])
    stepInto(k, false, onStage)
    const parts = calls.map((c) => c.part)
    expect(parts).toEqual(
      expect.arrayContaining([
        'beaver',
        'face',
        'bang',
        `stack-${carried}`,
        `stack-${other}`,
        `dam-${carried}`,
        `dam-${other}`,
      ]),
    )
    // Fitted inside the step: at most 0.9 of it.
    for (const call of calls) expect(Number(call.options.duration)).toBeLessThanOrEqual(720)
  })

  it('plays the haul for its full 2 s at 1×, the top dropping out of the dam', () => {
    const k = at('haul')
    stepInto(k, false, onStage)
    const beaverCall = calls.find((c) => c.part === 'beaver')
    expect(beaverCall?.options.duration).toBe(2000)
    const top = String(POSES[k]?.order[FRAMES[k]?.heap?.size ?? 0])
    const leaving = calls.find((c) => c.part === `dam-${top}`)
    expect(leaving?.keyframes.at(-1)).toMatchObject({ opacity: 0 })
  })

  it('plays the finale in full: the stacks hop in a wave, left to right', () => {
    stepInto(LAST)
    const hops = calls.filter((c) => c.part.startsWith('hop-'))
    expect(hops).toHaveLength(SPEC.length)
    const delays = hops.map((c) => Number(c.options.delay))
    expect(delays).toEqual([...delays].sort((a, b) => a - b))
  })

  it('keeps every animation’s offsets in order, in a move of each kind', () => {
    const kinds = new Map(POSES.map((pose, k) => [pose.action, k] as const))
    for (const k of kinds.values()) {
      if (k === 0) continue
      calls = []
      const view = stepInto(k, false, onStage)
      for (const call of calls) {
        const offsets = call.keyframes.flatMap((key) =>
          typeof key.offset === 'number' ? [key.offset] : [],
        )
        expect(offsets).toEqual([...offsets].sort((a, b) => a - b))
      }
      view.unmount()
    }
  })

  it('shows only final poses with reduced motion, and plays nothing going back or jumping', () => {
    stepInto(at('climb'), true)
    expect(calls).toHaveLength(0)
    const view = render(scene(at('haul')))
    calls = []
    view.rerender(scene(at('haul') - 1))
    view.rerender(scene(LAST))
    expect(calls).toHaveLength(0)
  })
})
