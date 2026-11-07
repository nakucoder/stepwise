import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { heapSort } from '../algorithms/sorting/heapSort'
import { collectFrames } from '../engine/collect'
import { opensTreeByDefault } from './heapTree'
import { TreeSlot } from './TreeSlot'

describe('The pyramid’s sheet, where a character’s tree can’t be on the stage', () => {
  it('opens by default on a phone on its side, where it opens beside the stage', () => {
    expect(opensTreeByDefault({ sideways: true, short: false, count: 12 })).toBe(true)
    expect(opensTreeByDefault({ sideways: true, short: true, count: 7 })).toBe(true)
  })

  it('waits upright (it would shrink the stage to a strip)', () => {
    expect(opensTreeByDefault({ sideways: false, short: false, count: 6 })).toBe(false)
    expect(opensTreeByDefault({ sideways: false, short: true, count: 3 })).toBe(false)
  })

  it('waits on the shortest phones with 8 numbers or more (the stacks would be too narrow)', () => {
    expect(opensTreeByDefault({ sideways: true, short: true, count: 8 })).toBe(false)
    expect(opensTreeByDefault({ sideways: true, short: true, count: 12 })).toBe(false)
  })
})

describe('TreeSlot', () => {
  const frame = collectFrames(heapSort, [5, 2, 8, 1, 9, 3]).frames[0]
  if (!frame) throw new Error('no frame')

  it.each(['over', 'beside', 'sheet'] as const)(
    '%s: a slot the scene finds, read as the pyramid',
    (place) => {
      const { container } = render(<TreeSlot frame={frame} level="explorer" place={place} />)
      const slot = container.querySelector('[data-tree-slot]')
      expect(slot).toHaveAttribute('data-tree-slot', place)
      expect(slot).toHaveAttribute('role', 'img')
      expect(slot?.getAttribute('aria-label')).toMatch(/^The pyramid, from the top: 5; then 2, 8/)
      // Its name shows on the stage; a sheet has its own heading.
      expect(container.querySelector('figcaption') !== null).toBe(place !== 'sheet')
    },
  )
})
