import { describe, expect, it } from 'vitest'
import { DO_IT_KINDS, pickOutcome } from '../../components/doItKinds'
import { collectFrames } from '../../engine/collect'
import { answerAt, decisionIndexes, isRightChoice } from '../../engine/decision'
import { findJargon } from '../../engine/jargon'
import { buildTraceRows, groupCaption } from '../../engine/trace'
import type { Choice, Frame } from '../../engine/types'
import { validateFrames } from '../../engine/validateFrames'
import { randomArrays } from '../../test/random'
import { INSERTION_SORT_LINES, insertionSort } from './insertionSort'

const framesFor = (input: readonly number[]): readonly Frame[] => {
  const { frames, truncated } = collectFrames(insertionSort, input)
  expect(truncated).toBe(false)
  return frames
}

const last = (frames: readonly Frame[]): Frame => {
  const frame = frames.at(-1)
  if (!frame) throw new Error('no frames')
  return frame
}

const sortedCopy = (input: readonly number[]) => [...input].sort((x, y) => x - y)
const isShift = (f: Frame) => f.activeLine === INSERTION_SORT_LINES.shift
const sourceLine = (n: number) => insertionSort.source.python.split('\n')[n - 1]?.trim()

/** Inversions: pairs out of order. Insertion sort shifts exactly this many times. */
const inversions = (input: readonly number[]) => {
  let count = 0
  for (let x = 0; x < input.length; x++) {
    for (let y = x + 1; y < input.length; y++) if ((input[x] ?? 0) > (input[y] ?? 0)) count++
  }
  return count
}

const RANDOM_INPUTS = randomArrays(20261008, 300, { maxLength: 15, min: -50, max: 50 })
const NAMED_INPUTS: [string, number[]][] = [
  ['empty', []],
  ['one number', [7]],
  ['two in order', [1, 2]],
  ['two reversed', [2, 1]],
  ['duplicates', [3, 1, 3, 2, 1, 3]],
  ['all equal', [4, 4, 4, 4]],
  ['negatives', [0, -5, 12, -1, -5, 3]],
  ['already sorted', [1, 2, 3, 4, 5, 6]],
  ['reversed', [6, 5, 4, 3, 2, 1]],
  ['the default numbers', [5, 2, 8, 1, 9, 3]],
]
const ALL_INPUTS: [string, number[]][] = [
  ...NAMED_INPUTS,
  ...RANDOM_INPUTS.map((input, k): [string, number[]] => [`random #${String(k)}`, input]),
]

describe('insertion sort: results', () => {
  it.each(ALL_INPUTS)('sorts %s like the built-in sort', (_name, input) => {
    expect(last(framesFor(input)).array).toEqual(sortedCopy(input))
  })

  it('never mutates the input', () => {
    for (const [, input] of ALL_INPUTS) {
      const frozen = Object.freeze([...input])
      expect(() => framesFor(frozen)).not.toThrow()
      expect(frozen).toEqual(input)
    }
  })

  it.each(ALL_INPUTS)('shifts exactly once per pair out of order: %s', (_, input) => {
    expect(last(framesFor(input)).stats.swaps).toBe(inversions(input))
  })

  it('already sorted: n − 1 comparisons and no shifts (the best case, O(n))', () => {
    for (const input of [
      [1, 2, 3, 4, 5, 6],
      [1, 2],
      [-3, 0, 0, 7],
      [4, 4, 4, 4],
    ]) {
      const { comparisons, swaps } = last(framesFor(input)).stats
      expect(comparisons).toBe(input.length - 1)
      expect(swaps).toBe(0)
    }
  })

  it('reversed: n(n − 1)/2 shifts (the worst case)', () => {
    for (const n of [2, 3, 6, 10]) {
      const input = Array.from({ length: n }, (_, k) => n - k)
      expect(last(framesFor(input)).stats.swaps).toBe((n * (n - 1)) / 2)
      expect(last(framesFor(input)).stats.comparisons).toBe((n * (n - 1)) / 2)
    }
  })

  it('one and two numbers', () => {
    expect(last(framesFor([7])).stats).toEqual({ comparisons: 0, swaps: 0 })
    expect(last(framesFor([1, 2])).stats).toEqual({ comparisons: 1, swaps: 0 })
    expect(last(framesFor([2, 1])).stats).toEqual({ comparisons: 1, swaps: 1 })
    expect(last(framesFor([2, 1])).array).toEqual([1, 2])
  })

  it('is stable: equal values keep their order', () => {
    // Tag equal values by where they started, sort by value only, and compare the tags.
    for (const [, input] of ALL_INPUTS) {
      const frames = framesFor(input)
      // Follow each value's identity through the permutations: a shift exchanges the key with
      // its left neighbor, so track positions.
      let order = input.map((_, k) => k)
      for (let k = 1; k < frames.length; k++) {
        const frame = frames[k]
        if (frame && isShift(frame)) {
          const [x, y] = frame.highlights.swapping ?? []
          if (x === undefined || y === undefined) throw new Error('a shift highlights two')
          const next = [...order]
          next[x] = order[y] ?? -1
          next[y] = order[x] ?? -1
          order = next
        }
      }
      const finalValues = order.map((k) => input[k])
      expect(finalValues).toEqual(sortedCopy(input))
      // Among equal values, the original positions stay increasing.
      for (let k = 1; k < order.length; k++) {
        if (finalValues[k] === finalValues[k - 1]) {
          expect(order[k] ?? 0).toBeGreaterThan(order[k - 1] ?? 0)
        }
      }
    }
  })
})

describe('insertion sort: frames', () => {
  it.each(ALL_INPUTS)('pass the shared checks (rules 2 and 3): %s', (_, input) => {
    expect(validateFrames(framesFor(input), insertionSort)).toEqual([])
  })

  it('has no jargon in any Explorer explanation', () => {
    for (const [, input] of NAMED_INPUTS) {
      for (const frame of framesFor(input)) {
        expect(findJargon(frame.explanation.explorer), frame.explanation.explorer).toBeNull()
      }
    }
  })

  it('marks nothing as final until the end, then everything', () => {
    for (const [, input] of ALL_INPUTS) {
      const frames = framesFor(input)
      frames.slice(0, -1).forEach((frame) => {
        expect(frame.highlights.sorted).toBeUndefined()
      })
      if (input.length > 0) {
        expect(last(frames).highlights.sorted).toEqual(input.map((_, k) => k))
      }
    }
  })

  it('points activeLine at the matching code', () => {
    expect(sourceLine(INSERTION_SORT_LINES.key)).toBe('key = a[i]')
    expect(sourceLine(INSERTION_SORT_LINES.compare)).toBe('while j >= 0 and a[j] > key:')
    expect(sourceLine(INSERTION_SORT_LINES.shift)).toBe('a[j + 1] = a[j]')
    expect(sourceLine(INSERTION_SORT_LINES.insert)).toBe('a[j + 1] = key')
  })
})

describe('insertion sort: the shift-version trace agrees with the permutation frames', () => {
  it.each(ALL_INPUTS)('key is the value at the key pointer; j and a[j] match: %s', (_, input) => {
    for (const frame of framesFor(input)) {
      const v = frame.variables ?? {}
      const key = frame.pointers?.key
      if (key !== undefined) expect(v.key).toBe(frame.array[key])
      const j = frame.pointers?.j
      if (j !== undefined) {
        expect(v.j).toBe(j)
        expect(v['a[j]']).toBe(frame.array[j])
      }
    }
  })

  it.each(ALL_INPUTS)('a shift is a[j + 1] = a[j] with the key held aside: %s', (_, input) => {
    const frames = framesFor(input)
    frames.forEach((frame, k) => {
      if (!isShift(frame)) return
      const before = frames[k - 1]
      if (!before) throw new Error('a shift is never first')
      const j = before.decision?.pair[0]
      if (j === undefined) throw new Error('a shift answers a question')
      // The shifted value now sits one place right; the key holds the gap at j.
      expect(frame.array[j + 1]).toBe(before.array[j])
      expect(frame.array[j]).toBe(frame.variables?.key)
      expect(frame.variables?.action).toBe('shift')
      // Everything else is untouched.
      expect(frame.array.filter((_, x) => x !== j && x !== j + 1)).toEqual(
        before.array.filter((_, x) => x !== j && x !== j + 1),
      )
    })
  })

  it('one row per comparison; shift rows say shift, the stop row says stop', () => {
    const frames = framesFor([5, 2, 8, 1, 9, 3])
    const trace = insertionSort.trace
    if (!trace) throw new Error('insertion sort has a trace')
    const rows = buildTraceRows(frames, frames.length - 1, trace)
    expect(rows).toHaveLength(last(frames).stats.comparisons)
    const action = trace.columns.findIndex((c) => c.variable === 'action')
    const actions = rows.map((row) => row.cells[action])
    expect(actions.filter((a) => a === 'shift')).toHaveLength(inversions([5, 2, 8, 1, 9, 3]))
    expect(actions.every((a) => a === 'shift' || a === 'stop')).toBe(true)
  })

  it('the stage caption says how many are in order so far', () => {
    const frames = framesFor([5, 2, 8, 1, 9, 3])
    const round3 = frames.find((f) => f.variables?.i === 3 && f.decision)
    if (!round3) throw new Error('no round 3 question')
    expect(groupCaption(round3, insertionSort.trace, 'explorer')).toBe(
      'round 3: the first 3 are in order',
    )
    expect(groupCaption(round3, insertionSort.trace, 'engineer')).toBe(
      'pass i = 3: a[0..3) in order',
    )
  })
})

describe('insertion sort: decisions (Do it builds on these)', () => {
  it.each(ALL_INPUTS)(
    'the answer at every comparison: shift if bigger, else stop: %s',
    (_, input) => {
      const frames = framesFor(input)
      for (const k of decisionIndexes(frames)) {
        const ask = frames[k]
        if (ask?.decision?.kind !== 'shift-or-stop') throw new Error('only shift-or-stop here')
        const [j, key] = ask.decision.pair
        expect(key).toBe(j + 1)
        const bigger = (ask.array[j] ?? 0) > (ask.array[key] ?? 0)
        expect(answerAt(frames, k)).toEqual(
          bigger ? { kind: 'trade', pair: [j, j + 1] } : { kind: 'keep' },
        )
      }
    },
  )

  it('equal values stop', () => {
    const frames = framesFor([3, 3])
    const ask = decisionIndexes(frames)[0] ?? -1
    expect(answerAt(frames, ask)).toEqual({ kind: 'keep' })
  })

  it.each(NAMED_INPUTS)(
    'every move each level can make: only the right one is accepted: %s',
    (_, input) => {
      const frames = framesFor(input)
      const spec = DO_IT_KINDS['shift-or-stop']
      for (const k of decisionIndexes(frames)) {
        const decision = frames[k]?.decision
        const answer = answerAt(frames, k)
        if (!decision || !answer) throw new Error('every decision is answered')
        const right = (choice: Choice) => isRightChoice(frames, k, choice)
        // Explorer: Slide it right or Stop here, exactly one.
        const explorer = (['act', 'keep'] as const).filter((a) => right(spec.choice(a, decision)))
        expect(explorer).toEqual([answer.kind === 'keep' ? 'keep' : 'act'])
        // Engineer: Insert here, or a tap on any value.
        const accepted = [
          ...(right({ kind: 'keep' }) ? ['keep'] : []),
          ...input.flatMap((_, x) => {
            const tap = pickOutcome(spec.pick, null, x)
            return tap.kind === 'single' && right(spec.pickChoice(tap, decision))
              ? [`tap ${String(x)}`]
              : []
          }),
        ]
        const [j, key] = decision.pair
        expect(accepted).toEqual(
          answer.kind === 'keep' ? ['keep', `tap ${String(key)}`] : [`tap ${String(j)}`],
        )
      }
    },
  )

  it.each(NAMED_INPUTS)('hints fill every rung, in both levels: %s', (_, input) => {
    const frames = framesFor(input)
    frames.forEach((frame, k) => {
      const next = frames[k + 1]
      if (!frame.decision || !next) return
      const hints = insertionSort.hints(frame, next)
      for (const level of ['explorer', 'engineer'] as const) {
        const { nudge, concept, showMe } = hints[level]
        for (const rung of [nudge, concept, showMe]) expect(rung.trim()).not.toBe('')
      }
      const { nudge, concept, showMe } = hints.explorer
      for (const rung of [nudge, concept, showMe]) expect(findJargon(rung), rung).toBeNull()
    })
  })
})
