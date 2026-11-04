import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { heapSort } from '../../algorithms/sorting/heapSort'
import { heapEnd } from '../../components/heapTree'
import { collectFrames } from '../../engine/collect'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { LANE_BEAVER_H, LANE_BEAVER_W, laneBeaverRows, type BeaverPose } from './beaver'
import { HeapMockupsPage } from './HeapMockupsPage'
import { clipRange, columnsOf, identities, momentsOf, SCREENS, SIZES } from './model'
import { damAt, damLayout, planOf, sceneAt } from './scene'
import { beaverRows, countUnits, logEndRows, stackRows, unitRows } from './studies'

const MIXED = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8]
const DUPES = [9, 4, 9, 2, 7, 4, 12, 1, 7, 3, 9, 5]
const POSES: readonly BeaverPose[] = [
  'idle',
  'walk',
  'walk2',
  'look',
  'found',
  'shrug',
  'carry',
  'proud',
  'happy',
]
/** Every screen of this round that holds a stack of 12 (all but the tightest Do it, as it is). */
const STAGES = SCREENS.flatMap((screen) => screen.sizes).filter((size) => !size.overflows)
const TS = [0.1, 0.3, 0.5, 0.7, 0.9, 1]

const isRectangle = (rows: readonly string[]) =>
  rows.every((row) => row.length === (rows[0]?.length ?? 0))

describe('B2 mockup: the pieces', () => {
  it('the lane beaver is the same size in every mood, and wears its hat', () => {
    for (const pose of POSES) {
      const rows = laneBeaverRows(pose)
      expect(isRectangle(rows)).toBe(true)
      expect([rows.length, rows[0]?.length]).toEqual([LANE_BEAVER_H, LANE_BEAVER_W])
      expect(rows.join('')).toContain('h')
      expect(rows.join('')).toContain('w')
    }
    for (const pose of ['idle', 'move', 'carry'] as const) {
      expect(isRectangle(beaverRows('B2', pose))).toBe(true)
    }
  })

  it('a stack has exactly as many logs as its value, every log the same', () => {
    for (const h of [2, 3, 4, 5, 7, 8, 9, 12]) {
      for (let count = 1; count <= 12; count++) {
        const grid = stackRows('log', count, h, 32)
        expect(isRectangle(grid)).toBe(true)
        expect(grid).toHaveLength(count * h + 1)
        expect(countUnits(grid)).toBe(count)
      }
    }
    expect(unitRows('log', 9, 41).join('')).toContain('R')
    expect(isRectangle(logEndRows(32))).toBe(true)
  })
})

describe('B2 mockup: the scenes', () => {
  it('on every stage, every stack (lifted or not) and the beaver stay inside the field', () => {
    for (const values of [MIXED, DUPES, [5, 2, 8, 1, 9, 3]]) {
      const frames = collectFrames(heapSort, values).frames
      const ids = identities(frames)
      for (const size of STAGES) {
        const plan = planOf(size, values.length)
        const cols = columnsOf(size, values.length)
        expect(plan.lane + plan.plate + plan.lift + 12 * plan.log + 1).toBeLessThanOrEqual(
          size.height,
        )
        for (let index = 0; index < frames.length; index++) {
          for (const t of TS) {
            const { stacks, beaver } = sceneAt(frames, ids, index, t, plan, cols)
            for (const stack of stacks) {
              const top =
                size.height - plan.lane - stack.lift - plan.plate - (stack.value * plan.log + 1)
              expect(top).toBeGreaterThanOrEqual(0)
              expect(stack.x).toBeGreaterThanOrEqual(0)
              expect(stack.x).toBeLessThanOrEqual(size.width)
            }
            expect(beaver.x).toBeGreaterThanOrEqual(0)
            expect(beaver.x).toBeLessThanOrEqual(size.width)
          }
        }
      }
    }
  })

  it('at each step’s pose, every stack is at its own column and wears the frame’s marks', () => {
    const frames = collectFrames(heapSort, MIXED).frames
    const ids = identities(frames)
    const size = STAGES[0] ?? SIZES[0]
    if (!size) throw new Error('no stage')
    const plan = planOf(size)
    const cols = columnsOf(size, 12)
    frames.forEach((frame, index) => {
      const { stacks } = sceneAt(frames, ids, index, 1, plan, cols)
      stacks.forEach((stack, k) => {
        expect(stack.value).toBe(frame.array[k])
        expect(stack.x).toBeCloseTo(cols.center(k))
        expect(stack.lift).toBe(0)
        const comparing = frame.highlights.comparing?.includes(k) ?? false
        const swapping = frame.highlights.swapping?.includes(k) ?? false
        expect(stack.ring).toBe(swapping ? 'trading' : comparing ? 'looking' : undefined)
        expect(stack.finished).toBe(k >= heapEnd(frame))
      })
    })
  })

  it('the climb and the special move carry the right stack over the beaver’s head', () => {
    const frames = collectFrames(heapSort, MIXED).frames
    const ids = identities(frames)
    const moments = momentsOf(frames)
    const size = STAGES[0] ?? SIZES[0]
    if (!size) throw new Error('no stage')
    const plan = planOf(size)
    const cols = columnsOf(size, 12)
    const climb = moments.climb ?? 0
    const parent = frames[climb]?.highlights.swapping?.[0] ?? 0
    const mid = sceneAt(frames, ids, climb, 0.7, plan, cols)
    const carried = mid.stacks.find((stack) => stack.front)
    expect(carried?.k).toBe(parent)
    expect(carried?.lift).toBe(plan.lift)
    expect(mid.beaver.pose).toBe('carry')
    expect(mid.beaver.x).toBeCloseTo(carried?.x ?? -1)
    const leave = moments.leave ?? 0
    const haul = sceneAt(frames, ids, leave, 0.6, plan, cols)
    expect(haul.beaver.pose).toBe('proud')
    expect(haul.stacks.find((stack) => stack.front)?.k).toBe(frames[leave]?.heap?.size)
  })

  it('the dam shows the heap’s values with the same marks, and loses the finished ones', () => {
    const frames = collectFrames(heapSort, MIXED).frames
    const ids = identities(frames)
    for (const size of STAGES.filter((s) => s.tree ?? s.beside)) {
      const box = size.tree ?? { width: size.beside ?? 0, height: size.band.height + size.height }
      const layout = damLayout(box, 12, size.beside !== undefined)
      frames.forEach((frame, index) => {
        const nodes = damAt(frames, ids, index, 1, layout)
        expect(nodes.map((node) => node.value)).toEqual(frame.array.slice(0, heapEnd(frame)))
        nodes.forEach((node, k) => {
          const comparing = frame.highlights.comparing?.includes(k) ?? false
          const swapping = frame.highlights.swapping?.includes(k) ?? false
          expect(node.ring).toBe(swapping ? 'trading' : comparing ? 'looking' : undefined)
          expect(node.x).toBeGreaterThanOrEqual(layout.d / 2 - 1)
          expect(node.y).toBeLessThanOrEqual(layout.h)
        })
      })
    }
  })

  it('each value keeps its identity, and the clip is a short run', () => {
    const frames = collectFrames(heapSort, DUPES).frames
    const ids = identities(frames)
    frames.forEach((frame, index) => {
      ;(ids[index] ?? []).forEach((id, k) => {
        expect(frame.array[k]).toBe(DUPES[id])
      })
    })
    const [from, to] = clipRange(collectFrames(heapSort, MIXED).frames)
    expect(to - from).toBeLessThan(40)
  })
})

describe('B2 mockup: the page', () => {
  it('says it is not to be merged and shows every screen, before and after', () => {
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <HeapMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DO NOT MERGE')
    expect(
      screen.getByRole('heading', { name: 'Before and after, every screen' }),
    ).toBeInTheDocument()
    for (const { title } of SCREENS) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    // The page draws about 150 scenes: 2.5 s here, more on a CI runner.
  }, 30_000)
})
