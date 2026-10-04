import { describe, expect, it } from 'vitest'
import type { Algorithm, Frame, Level, TraceValue } from './types'

// A stand-in algorithm used only to prove the types and test pipeline work together.
// Real algorithms live in src/algorithms/ and get their own tests.
const identity: Algorithm = {
  id: 'identity',
  name: 'Identity',
  explorerName: 'Keep everything as it is',
  category: 'sorting',
  complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
  bestFor: { engineer: 'nothing in particular', explorer: 'It just hands the numbers back.' },
  source: { python: 'def identity(arr):\n    return arr' },
  *run(input) {
    yield {
      array: [...input],
      highlights: {},
      variables: { n: input.length, result: null, done: false },
      activeLine: 1,
      explanation: {
        explorer: 'Here are the numbers we start with.',
        engineer: 'Initialize with a copy of the input array.',
      },
      stats: { comparisons: 0, swaps: 0 },
    }
    yield {
      array: [...input],
      highlights: { sorted: input.map((_, i) => i) },
      pointers: { i: 0 },
      variables: { n: input.length, result: 'arr', done: true },
      activeLine: 2,
      explanation: {
        explorer: 'We are done! The numbers stay just as they were.',
        engineer: 'Return the array unchanged; every index is final.',
      },
      stats: { comparisons: 0, swaps: 0 },
    }
  },
}

describe('engine types', () => {
  it('collects a generator into an array of frames', () => {
    const input = [3, 1, 2]
    const frames: Frame[] = [...identity.run(input)]

    expect(frames).toHaveLength(2)
    expect(frames.at(-1)?.array).toEqual([3, 1, 2])
    expect(frames.at(-1)?.highlights.sorted).toEqual([0, 1, 2])
  })

  it('gives every frame a non-empty explanation for every level', () => {
    const levels: Level[] = ['explorer', 'engineer']
    for (const frame of identity.run([3, 1, 2])) {
      for (const level of levels) expect(frame.explanation[level].trim()).not.toBe('')
    }
  })

  it('gives every frame trace variables of an allowed type', () => {
    const isTraceValue = (value: unknown): value is TraceValue =>
      value === null || ['number', 'string', 'boolean'].includes(typeof value)

    for (const frame of identity.run([3, 1, 2])) {
      expect(frame.variables).toBeDefined()
      for (const value of Object.values(frame.variables ?? {})) {
        expect(isTraceValue(value)).toBe(true)
      }
    }
  })

  it('does not mutate the input', () => {
    const input = [3, 1, 2]
    for (const frame of identity.run(input)) expect(frame.array).not.toBe(input)
    expect(input).toEqual([3, 1, 2])
  })
})
