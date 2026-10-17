import { describe, expect, it } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { mergeSort } from '../algorithms/sorting/mergeSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame } from '../engine/types'
import { markPointers, markRole, pointerRowsOf, roleAt } from './stageRoles'

const MERGE = collectFrames(mergeSort, DEFAULT_INPUT).frames
const BUBBLE = collectFrames(bubbleSort, DEFAULT_INPUT).frames
/** The first "which goes next?" question: 2 (column 1) or 8 (column 2), k at column 1. */
const ASK = MERGE.find((frame) => frame.decision) as Frame

/** The pointer rows as the workspace counted them before scenes could draw both rows. */
function mainRowsOnly(frames: readonly Frame[]): number {
  return Math.max(
    1,
    ...frames.map((f) => {
      const at = Object.values(f.pointers ?? {})
      return Math.max(0, ...at.map((k) => at.filter((other) => other === k).length))
    }),
  )
}

describe('the marks under the values', () => {
  it('for one row (bars, and scenes that draw the main row): exactly the main row', () => {
    for (const frame of [...MERGE, ...BUBBLE]) {
      expect(markPointers(frame, false)).toEqual(frame.pointers ?? {})
      frame.array.forEach((_, index) => {
        expect(markRole(frame, index, false)).toBe(roleAt(frame, index))
      })
    }
    expect(pointerRowsOf(MERGE, false)).toBe(mainRowsOnly(MERGE))
    expect(pointerRowsOf(BUBBLE, false)).toBe(mainRowsOnly(BUBBLE))
  })

  it('for both rows: the main row’s k with the second row’s i and j', () => {
    expect(ASK.pointers).toEqual({ k: 1 })
    expect(ASK.buffer?.pointers).toEqual({ i: 1, j: 2 })
    expect(markPointers(ASK, true)).toEqual({ k: 1, i: 1, j: 2 })
  })

  it('for both rows: the second row’s role where it has one (the fronts), else the main row’s', () => {
    expect(markRole(ASK, 1, true)).toBe('comparing')
    expect(markRole(ASK, 2, true)).toBe('comparing')
    expect(markRole(ASK, 0, true)).toBeNull()
    // The main row has no roles while the fronts are compared.
    expect(markRole(ASK, 1, false)).toBeNull()
    const last = MERGE.at(-1) as Frame
    expect(markRole(last, 0, true)).toBe('sorted')
  })

  it('for both rows: reserves room for k and a front on one column', () => {
    expect(pointerRowsOf(MERGE, false)).toBe(1)
    expect(pointerRowsOf(MERGE, true)).toBe(2)
  })
})
