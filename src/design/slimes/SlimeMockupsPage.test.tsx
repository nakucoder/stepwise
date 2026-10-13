import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PreferencesProvider } from '../../preferences/PreferencesProvider'
import { sceneOf, type Design } from './layout'
import { slimeRun, START_VALUES, type SortStep } from './run'
import { SlimeMockupsPage } from './SlimeMockupsPage'

const DESIGNS: readonly Design[] = ['tree', 'arena', 'pond']
const SIZES = [
  [366, 382],
  [479, 53],
  [479, 90],
  [640, 360],
] as const
const STEPS = slimeRun()
const N = START_VALUES.length

describe('the run: a full top-down merge sort, as the slimes see it', () => {
  it('ends in order, and every value is always in exactly one group', () => {
    expect(STEPS.at(-1)?.groups.flatMap((g) => g.values)).toEqual([1, 2, 3, 5, 8, 9])
    for (const step of STEPS) {
      const all = step.groups.flatMap((g) => g.values).sort((a, b) => a - b)
      expect(all).toEqual([...START_VALUES].sort((a, b) => a - b))
    }
  })

  it('splits down to single slimes, and every compare is answered by the smaller front', () => {
    expect(STEPS.filter((s) => s.event === 'split')).toHaveLength(N - 1)
    expect(STEPS.filter((s) => s.event === 'merged')).toHaveLength(N - 1)
    STEPS.forEach((step, k) => {
      if (step.event !== 'compare' || !step.fronts) return
      const [a, b] = step.fronts
      expect(step.answer).toBe(b < a ? 'right' : 'left')
      expect(STEPS[k + 1]?.moved).toBe(step.answer === 'left' ? a : b)
    })
  })

  it('equal values: the left one goes first (stable)', () => {
    const run = slimeRun([3, 3])
    expect(run.find((s) => s.event === 'compare')?.answer).toBe('left')
  })
})

describe('the fit: every design, every size, every step of the run', () => {
  it.each(SIZES)('%i × %i: nothing leaves the field, and no two numbers overlap', (w, h) => {
    for (const design of DESIGNS) {
      STEPS.forEach((step, k) => {
        const scene = sceneOf(design, step, { width: w, height: h }, N)
        const where = `${design} step ${String(k)} (${step.event})`
        for (const box of [...scene.bodies, ...scene.tokens]) {
          expect(box.x, where).toBeGreaterThanOrEqual(0)
          expect(box.y, where).toBeGreaterThanOrEqual(0)
          expect(box.x + box.w, where).toBeLessThanOrEqual(w + 0.5)
          expect(box.y + box.h, where).toBeLessThanOrEqual(h + 0.5)
        }
        scene.tokens.forEach((a, i) => {
          scene.tokens.slice(i + 1).forEach((b) => {
            const apart =
              a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
            expect(apart, `${where}: ${String(a.value)} and ${String(b.value)}`).toBe(true)
          })
        })
        expect(scene.font).toBeGreaterThanOrEqual(10)
      })
    }
  })

  it('the plan per size: A zooms on a short stage, B goes compact on the shortest, C fits', () => {
    const split = STEPS.find((s) => s.event === 'split') as SortStep
    const modes = (w: number, h: number) =>
      DESIGNS.map((d) => sceneOf(d, split, { width: w, height: h }, N).mode)
    expect(modes(366, 382)).toEqual(['full', 'full', 'full'])
    expect(modes(640, 360)).toEqual(['full', 'full', 'full'])
    expect(modes(479, 90)).toEqual(['zoom', 'full', 'full'])
    expect(modes(479, 53)).toEqual(['zoom', 'compact', 'full'])
  })

  it('only the two fronts are yellow, and green only at the very end', () => {
    for (const design of DESIGNS) {
      for (const step of STEPS) {
        const scene = sceneOf(design, step, { width: 366, height: 382 }, N)
        const yellow = scene.tokens.filter((t) => t.role === 'compare').map((t) => t.value)
        expect(yellow.sort()).toEqual(step.fronts ? [...step.fronts].sort() : [])
        expect(scene.tokens.filter((t) => t.role === 'final')).toHaveLength(step.sorted ? N : 0)
      }
    }
  })
})

describe('the page', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const page = () =>
    render(
      <PreferencesProvider>
        <SlimeMockupsPage />
      </PreferencesProvider>,
    )
  const progress = () => screen.getByText(/^Step \d+ of \d+$/).textContent

  it('one tab per design, each with its notes and a Do it question', () => {
    page()
    const tabs = within(screen.getByRole('tablist', { name: 'Designs' })).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent.replace('✓ ', ''))).toEqual([
      'A. Split tree',
      'B. Slime arena',
      'C. Mitosis pond',
    ])
    for (const tab of tabs) {
      fireEvent.click(tab)
      expect(tab).toHaveAttribute('aria-selected', 'true')
      for (const term of [
        'Idea',
        'Special move',
        'Biggest risk',
        'Phone on its side (479 × 53–90)',
        'From merge sort’s frames?',
      ]) {
        expect(screen.getByText(term)).toBeInTheDocument()
      }
      expect(screen.getByRole('heading', { name: 'Do it: “Which goes next?”' })).toBeInTheDocument()
    }
  })

  it('plays the whole run like the site: next, back, play to the end', () => {
    page()
    const total = String(STEPS.length)
    expect(progress()).toBe(`Step 1 of ${total}`)
    fireEvent.click(screen.getByRole('button', { name: 'Next ▶' }))
    expect(progress()).toBe(`Step 2 of ${total}`)
    fireEvent.click(screen.getByRole('button', { name: '◀ Back' }))
    expect(progress()).toBe(`Step 1 of ${total}`)
    fireEvent.click(screen.getByRole('button', { name: '▶ Play' }))
    for (let k = 0; k < STEPS.length + 2; k++) {
      act(() => {
        vi.advanceTimersByTime(1100)
      })
    }
    expect(progress()).toBe(`Step ${total} of ${total}`)
    expect(screen.getByRole('button', { name: '▶ Play' })).toBeInTheDocument()
  })

  it('no words unless turned on', () => {
    page()
    expect(screen.queryByText('Everyone starts in one big slime.')).not.toBeInTheDocument()
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Words' })).getByRole('button', { name: 'On' }),
    )
    expect(screen.getByText('Everyone starts in one big slime.')).toBeInTheDocument()
  })

  it('Do it: 2 (left) or 1 (right)? Right is right, by button, by key (L / R) or by a tap', () => {
    page()
    const answers = screen.getByRole('group', { name: 'Your move' })
    fireEvent.click(within(answers).getByRole('button', { name: /Left/ }))
    expect(screen.getByText('Not this time. Which one is smaller?')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'r' })
    expect(screen.getByText('Right! The smaller one goes next.')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'L' })
    expect(screen.getByText('Not this time. Which one is smaller?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '1, the right front' }))
    expect(screen.getByText('Right! The smaller one goes next.')).toBeInTheDocument()
  })
})
