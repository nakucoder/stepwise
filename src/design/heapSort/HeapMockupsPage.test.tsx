import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { heapSort } from '../../algorithms/sorting/heapSort'
import { collectFrames } from '../../engine/collect'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { HeapMockupsPage } from './HeapMockupsPage'
import {
  bananaStack,
  clipRange,
  columnsOf,
  countBananas,
  countPlates,
  identities,
  momentsOf,
  monkeyRows,
  planOf,
  SIZES,
  STEGO_H,
  STEGO_W,
  stegoRows,
} from './model'
import { actorsAt, heightOf } from './pose'

const MIXED = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8]
const DUPES = [9, 4, 9, 2, 7, 4, 12, 1, 7, 3, 9, 5]
const STEGO_POSES = ['stand', 'step', 'look', 'proud', 'cheer'] as const
const MONKEY_POSES = ['sit', 'look', 'swing', 'cheer'] as const

const isRectangle = (rows: readonly string[]) =>
  rows.every((row) => row.length === (rows[0]?.length ?? 0))

describe('heap sort mockup: the sprites', () => {
  it('a stegosaurus has exactly as many plates as its value, in every pose, at one size', () => {
    for (let value = 1; value <= 12; value++) {
      for (const pose of STEGO_POSES) {
        const rows = stegoRows(value, pose)
        expect(isRectangle(rows)).toBe(true)
        expect([rows.length, rows[0]?.length]).toEqual([STEGO_H, STEGO_W])
        expect(countPlates(rows)).toBe(value)
      }
    }
  })

  it('a stack has exactly as many bananas as its value, each the same', () => {
    for (const u of [3, 4, 5, 6]) {
      for (let value = 1; value <= 12; value++) {
        const { grid, plain } = bananaStack(value, u)
        expect(plain).toBe(false)
        expect(isRectangle(grid)).toBe(true)
        expect(countBananas(grid)).toBe(value)
        // A banana every u px, and the outline over the top one.
        expect(grid).toHaveLength(value * u + 1)
      }
    }
  })

  it('under 3 px a banana, the stack is the plain column, still value × u high', () => {
    for (const u of [1, 2]) {
      for (let value = 1; value <= 12; value++) {
        const { grid, plain } = bananaStack(value, u)
        expect(plain).toBe(true)
        expect(grid).toHaveLength(value * u + 1)
      }
    }
  })

  it('every monkey pose is the same size', () => {
    for (const pose of MONKEY_POSES) {
      const rows = monkeyRows(pose)
      expect(isRectangle(rows)).toBe(true)
      expect([rows.length, rows[0]?.length]).toEqual([10, 13])
    }
  })
})

describe('heap sort mockup: the stages', () => {
  it('on the tightest stage the dinos keep their plates and the monkeys get the plain stack', () => {
    const tight = SIZES.find((size) => size.id === 'tight')
    if (!tight) throw new Error('no tightest stage')
    expect(planOf('stego', tight).s).toBe(1)
    expect(planOf('monkey', tight)).toMatchObject({ s: 1, u: 1, plain: true })
  })

  it.each(['stego', 'monkey'] as const)(
    '%s: every character stays inside the field, at every step of the run and every size',
    (design) => {
      for (const values of [MIXED, DUPES, [5, 2, 8, 1, 9, 3]]) {
        const frames = collectFrames(heapSort, values).frames
        const ids = identities(frames)
        for (const size of SIZES) {
          const plan = planOf(design, size)
          const cols = columnsOf(size, values.length)
          for (let index = 0; index < frames.length; index++) {
            for (const t of [0.25, 0.5, 0.75, 1]) {
              for (const actor of actorsAt(
                design,
                frames,
                ids,
                index,
                t,
                plan,
                cols,
                size.height,
              )) {
                const top = size.height - actor.lift - heightOf(design, plan, actor.value)
                expect(top).toBeGreaterThanOrEqual(0)
                expect(actor.x).toBeGreaterThanOrEqual(0)
                expect(actor.x).toBeLessThanOrEqual(size.width)
              }
            }
          }
        }
      }
    },
  )

  it('each value keeps its identity: at every frame the ids hold the frame’s values', () => {
    const frames = collectFrames(heapSort, DUPES).frames
    const ids = identities(frames)
    frames.forEach((frame, index) => {
      const at = ids[index] ?? []
      expect([...at].sort((a, b) => a - b)).toEqual(DUPES.map((_, k) => k))
      at.forEach((id, k) => {
        expect(frame.array[k]).toBe(DUPES[id])
      })
    })
  })

  it('finds all eight moments in the 12-number run, and a short clip', () => {
    const frames = collectFrames(heapSort, MIXED).frames
    const moments = momentsOf(frames)
    for (const index of Object.values(moments)) expect(index).not.toBeNull()
    expect(frames[moments.climb ?? 0]?.heap?.event).toBe('climb')
    expect(frames[moments.stop ?? 0]?.heap?.event).toBe('stop')
    expect(frames[moments.leave ?? 0]?.heap?.event).toBe('extract')
    const [from, to] = clipRange(frames)
    expect(to - from).toBeLessThan(40)
  })
})

describe('heap sort mockup: the page', () => {
  it('says it is not to be merged and draws both designs', () => {
    render(
      <PreferencesProvider>
        <MemoryRouter>
          <HeapMockupsPage />
        </MemoryRouter>
      </PreferencesProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DO NOT MERGE')
    expect(screen.getByRole('heading', { name: 'D. Stegosaurus herd' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'M. Monkeys in a tree' })).toBeInTheDocument()
  })
})
