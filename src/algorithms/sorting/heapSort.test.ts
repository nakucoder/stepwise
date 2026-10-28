import { describe, expect, it } from 'vitest'
import { ALGORITHMS } from '..'
import { collectFrames } from '../../engine/collect'
import { askedAt } from '../../engine/decision'
import { findJargon } from '../../engine/jargon'
import { buildTraceRows, groupCaption } from '../../engine/trace'
import type { Frame, Level } from '../../engine/types'
import { validateFrames } from '../../engine/validateFrames'
import { doItMoves } from '../../test/doItMoves'
import { randomArrays } from '../../test/random'
import { childrenOf, HEAP_SORT_LINES, heapSort, rowOf } from './heapSort'

const framesFor = (input: readonly number[]): readonly Frame[] => {
  const { frames, truncated } = collectFrames(heapSort, input)
  expect(truncated).toBe(false)
  return frames
}

const last = (frames: readonly Frame[]): Frame => {
  const frame = frames.at(-1)
  if (!frame) throw new Error('no frames')
  return frame
}

const sortedCopy = (input: readonly number[]) => [...input].sort((x, y) => x - y)
const sourceLine = (n: number) => heapSort.source.python.split('\n')[n - 1]?.trim()
const events = (frames: readonly Frame[]) => frames.map((f) => f.heap?.event ?? null)
const caption = (frame: Frame | undefined, level: Level) =>
  frame ? groupCaption(frame, heapSort.trace, level) : undefined

/** Whether every parent from `from` on, inside a[0..size), is at least as big as its children. */
const isHeapFrom = (array: readonly number[], size: number, from = 0) =>
  Array.from({ length: Math.max(0, size - from) }, (_, k) => from + k).every((p) =>
    childrenOf(p, size).every((c) => (array[p] ?? 0) >= (array[c] ?? 0)),
  )

const DEFAULT = [5, 2, 8, 1, 9, 3]
const TWELVE = [42, 7, 19, 88, 3, 64, 25, 51, 13, 76, 30, 9]
const RANDOM_INPUTS = randomArrays(20261026, 300, { maxLength: 12, min: 0, max: 99 })
const NAMED_INPUTS: [string, number[]][] = [
  ['empty', []],
  ['one number', [7]],
  ['two numbers', [2, 1]],
  ['two in order', [1, 2]],
  ['three numbers', [3, 1, 2]],
  ['default', DEFAULT],
  ['already sorted', [1, 2, 3, 4, 5, 6]],
  ['reverse sorted', [6, 5, 4, 3, 2, 1]],
  ['duplicates', [3, 1, 3, 2, 1, 3]],
  ['all equal', [4, 4, 4, 4]],
  ['twelve numbers', TWELVE],
  ['negatives and zero', [0, -3, 5, -3, 0]],
]
const ALL_INPUTS = [...NAMED_INPUTS.map(([, input]) => input), ...RANDOM_INPUTS]

describe('heap sort: correctness', () => {
  it.each(NAMED_INPUTS)('%s: the last frame is in order and all done', (_, input) => {
    const end = last(framesFor(input))
    expect(end.array).toEqual(sortedCopy(input))
    expect(end.highlights.sorted).toEqual(input.length > 0 ? input.map((_, k) => k) : undefined)
    expect(end.heap).toMatchObject({ event: 'done', size: 0, parent: null })
  })

  it('sorts 300 random lists', () => {
    for (const input of RANDOM_INPUTS)
      expect(last(framesFor(input)).array).toEqual(sortedCopy(input))
  })

  it('never changes its input', () => {
    for (const input of ALL_INPUTS) {
      const copy = [...input]
      framesFor(input)
      expect(input).toEqual(copy)
    }
  })

  it('every frame is valid (validateFrames)', () => {
    for (const input of ALL_INPUTS) expect(validateFrames(framesFor(input), heapSort)).toEqual([])
  })

  it('every frame is the one before with at most one swap, and only climbs and extracts swap', () => {
    for (const input of ALL_INPUTS) {
      const frames = framesFor(input)
      frames.forEach((frame, k) => {
        const before = frames[k - 1]
        if (!before) return
        const changed = frame.array.flatMap((v, i) => (v === before.array[i] ? [] : [i]))
        const swapped = frame.stats.swaps - before.stats.swaps
        if (frame.heap?.event === 'climb' || frame.heap?.event === 'extract') {
          expect(swapped).toBe(1)
          expect(frame.highlights.swapping).toBeDefined()
          for (const i of changed) expect(frame.highlights.swapping).toContain(i)
        } else {
          expect(swapped).toBe(0)
          expect(changed).toEqual([])
        }
      })
    }
  })
})

describe('heap sort: the heap', () => {
  it('every frame has `heap`, and no other sort sets it', () => {
    for (const input of ALL_INPUTS) {
      for (const frame of framesFor(input)) expect(frame.heap).toBeDefined()
    }
    for (const [key, algorithm] of Object.entries(ALGORITHMS)) {
      if (algorithm === heapSort) continue
      for (const input of [DEFAULT, TWELVE, [4, 4, 1]]) {
        const { frames } = collectFrames(algorithm, input)
        expect(
          frames.some((f) => f.heap !== undefined),
          key,
        ).toBe(false)
      }
    }
  })

  it('the heap property holds where it should: built subtrees, after the build, after each sift', () => {
    for (const input of ALL_INPUTS) {
      const frames = framesFor(input)
      // In the build phase, every parent from the current sift's start on is a heap once it ends.
      let start = Number.POSITIVE_INFINITY
      frames.forEach((frame, k) => {
        const heap = frame.heap
        if (!heap) return
        const at = `${input.join(',')} frame ${String(k)}`
        const previous = frames[k - 1]?.heap?.event
        if (heap.event === 'ask' && previous !== 'climb') start = heap.parent ?? 0
        const ends = heap.event === 'stop' || heap.event === 'settles'
        if (heap.phase === 'build' && ends) {
          expect(isHeapFrom(frame.array, heap.size, start), at).toBe(true)
        }
        if (heap.phase === 'extract' && (ends || heap.event === 'start')) {
          expect(isHeapFrom(frame.array, heap.size), at).toBe(true)
        }
        // A sift that ends inside the extract phase: also before it, at the top.
        if (heap.event === 'extract' && heap.children.length === 0) {
          expect(isHeapFrom(frame.array, heap.size), at).toBe(true)
        }
      })
    }
  })

  it('the sorted part holds the biggest values, in order, and only grows', () => {
    for (const input of ALL_INPUTS) {
      const frames = framesFor(input)
      const target = sortedCopy(input)
      let sortedCount = 0
      for (const frame of frames) {
        const heap = frame.heap
        if (!heap) continue
        const sorted = frame.highlights.sorted ?? []
        expect(sorted.length).toBeGreaterThanOrEqual(sortedCount)
        sortedCount = sorted.length
        for (const k of sorted) expect(frame.array[k]).toBe(target[k])
        // The heap's size is the sorted boundary (the last one left joins it with the last extract).
        const boundary = sorted.length === 0 ? input.length : (sorted[0] ?? 0)
        if (heap.event === 'extract' && heap.size === 1) expect(boundary).toBe(0)
        else expect(boundary).toBe(heap.size)
      }
    }
  })

  it('the build starts at ⌊n/2⌋ − 1 and goes down to 0, at full size', () => {
    for (const input of ALL_INPUTS) {
      const frames = framesFor(input)
      const starts = frames
        .filter((f) => f.heap?.phase === 'build' && f.heap.event === 'ask')
        .filter((f) => frames[frames.indexOf(f) - 1]?.heap?.event !== 'climb')
        .map((f) => f.heap?.parent)
      const n = input.length
      expect(starts).toEqual(
        n < 2 ? [] : Array.from({ length: Math.floor(n / 2) }, (_, k) => Math.floor(n / 2) - 1 - k),
      )
      for (const f of frames) if (f.heap?.phase === 'build') expect(f.heap.size).toBe(n)
    }
  })

  it('equal values stop, and a tie between children goes to the left one', () => {
    const allEqual = framesFor([4, 4, 4, 4])
    expect(events(allEqual).filter((e) => e === 'climb')).toEqual([])
    // [1, 5, 5]: the children tie, so the left one (position 1) climbs.
    const tie = framesFor([1, 5, 5])
    const ask = tie.find((f) => f.heap?.event === 'ask')
    expect(ask?.highlights.comparing).toEqual([0, 1])
    expect(tie[tie.indexOf(ask as Frame) + 1]?.highlights.swapping).toEqual([0, 1])
  })

  it('every ask is answered by the next frame: climb (the bigger child was strictly bigger) or stop', () => {
    for (const input of ALL_INPUTS) {
      const frames = framesFor(input)
      frames.forEach((ask, k) => {
        if (ask.heap?.event !== 'ask') return
        const answer = frames[k + 1]
        const [parent, child] = ask.highlights.comparing ?? []
        expect(parent).toBe(ask.heap.parent)
        expect(ask.heap.children).toContain(child)
        const climbs = (ask.array[child ?? 0] ?? 0) > (ask.array[parent ?? 0] ?? 0)
        expect(answer?.heap?.event).toBe(climbs ? 'climb' : 'stop')
        // Do it asks it on [parent, bigger child]; the build's questions are Engineer's only.
        expect(ask.decision).toEqual({
          kind: 'sift-or-stop',
          pair: [parent, child],
          ...(ask.heap.phase === 'build' && { levels: ['engineer'] }),
        })
      })
    }
  })

  it('the default input: 30 frames, 9 questions, in the expected order', () => {
    const frames = framesFor(DEFAULT)
    expect(frames).toHaveLength(30)
    expect(events(frames)).toEqual([
      'start',
      ...['ask', 'stop', 'ask', 'climb', 'settles', 'ask', 'climb', 'ask', 'stop'],
      'start',
      ...['extract', 'ask', 'climb', 'settles'],
      ...['extract', 'ask', 'climb', 'ask', 'stop'],
      ...['extract', 'ask', 'climb', 'settles'],
      ...['extract', 'ask', 'climb', 'settles'],
      'extract',
      'done',
    ])
    expect(framesFor(TWELVE)).toHaveLength(81)
    expect(events(framesFor(TWELVE)).filter((e) => e === 'ask')).toHaveLength(29)
  })

  it('sizes 0 to 3 have the frames they need', () => {
    expect(events(framesFor([]))).toEqual(['start', 'done'])
    expect(events(framesFor([7]))).toEqual(['start', 'done'])
    expect(events(framesFor([1, 2]))).toEqual([
      'start',
      'ask',
      'climb',
      'settles',
      'start',
      'extract',
      'done',
    ])
    expect(events(framesFor([2, 1]))).toEqual(['start', 'ask', 'stop', 'start', 'extract', 'done'])
    expect(events(framesFor([3, 1, 2]))).toEqual([
      ...['start', 'ask', 'stop', 'start'],
      ...['extract', 'ask', 'stop', 'extract', 'done'],
    ])
  })

  it('every changing line points at the code it describes', () => {
    const lines = Object.values(HEAP_SORT_LINES).map(sourceLine)
    expect(lines).toEqual([
      'def heap_sort(a):',
      'for i in range(n // 2 - 1, -1, -1):',
      'for k in range(n - 1, 0, -1):',
      'a[0], a[k] = a[k], a[0]',
      'return a',
      'if l < size and a[l] > a[largest]:',
      'if r < size and a[r] > a[largest]:',
      'return',
      'a[i], a[largest] = a[largest], a[i]',
    ])
  })

  it('rows of the pyramid: the top, then two, then four', () => {
    expect([0, 1, 2, 3, 6, 7, 11].map(rowOf)).toEqual([0, 1, 1, 2, 2, 3, 3])
    expect(childrenOf(1, 6)).toEqual([3, 4])
    expect(childrenOf(2, 6)).toEqual([5])
    expect(childrenOf(3, 6)).toEqual([])
  })

  it('Explorer never says heap, node or array, in frames, captions or hints', () => {
    for (const input of [DEFAULT, TWELVE, [4, 4, 1], [1, 5, 5]]) {
      const frames = framesFor(input)
      frames.forEach((frame, k) => {
        expect(findJargon(frame.explanation.explorer)).toBeNull()
        expect(findJargon(caption(frame, 'explorer') ?? '')).toBeNull()
        const answer = frames[k + 1]
        if (frame.heap?.event === 'ask' && answer) {
          const { nudge, concept, showMe } = heapSort.hints(frame, answer).explorer
          for (const text of [nudge, concept, showMe]) expect(findJargon(text), text).toBeNull()
        }
      })
    }
  })
})

describe('heap sort: trace', () => {
  it('variables agree with the frame: i, l and r match the heap step, the values and size', () => {
    for (const input of ALL_INPUTS) {
      const frames = framesFor(input)
      frames.forEach((frame) => {
        const v = frame.variables
        const heap = frame.heap
        if (!v || !heap) return
        expect(v.size).toBe(heap.size)
        if (heap.event !== 'ask' && heap.event !== 'climb' && heap.event !== 'stop') return
        const i = heap.parent ?? -1
        // No pointers: the stage's arcs link the parent to its children, read from `heap`.
        expect(frame.pointers).toBeUndefined()
        expect(v.i).toBe(i)
        expect(v.l).toBe(2 * i + 1)
        expect(v.r).toBe(2 * i + 2)
        expect(heap.children).toEqual([2 * i + 1, 2 * i + 2].filter((c) => c < heap.size))
        const child = frame.highlights.comparing?.[1] ?? frame.highlights.swapping?.[1]
        if (heap.event === 'ask') {
          expect(v.value).toBe(frame.array[i])
          expect(v.child).toBe(frame.array[child ?? -1])
          expect(v.largest).toBe('?')
        } else {
          expect(v.largest).toBe(heap.event === 'climb' ? child : i)
          expect(v['climbs?']).toBe(heap.event === 'climb' ? 'yes' : 'no')
        }
      })
    }
  })

  it('one row per sift step: the question adds "?", the answer fills in largest', () => {
    const frames = framesFor(DEFAULT)
    const trace = heapSort.trace
    if (!trace) throw new Error('no trace')
    const atAsk = buildTraceRows(frames, 3, trace)
    expect(atAsk).toHaveLength(2)
    const column = (name: string) => trace.columns.findIndex((c) => c.variable === name)
    expect(atAsk.at(-1)?.cells[column('largest')]).toBe('?')
    const atAnswer = buildTraceRows(frames, 4, trace)
    expect(atAnswer).toHaveLength(2)
    expect(atAnswer.at(-1)?.cells[column('largest')]).toBe(4)
    const all = buildTraceRows(frames, frames.length - 1, trace)
    expect(all).toHaveLength(9)
    // The extract phase starts a new group.
    expect(all.filter((row) => row.startsGroup)).toHaveLength(1)
  })

  it('the caption names the phase and the heap size', () => {
    const frames = framesFor(DEFAULT)
    expect(caption(frames[1], 'explorer')).toBe('building the pyramid')
    expect(caption(frames[1], 'engineer')).toBe('build phase, heap size 6')
    expect(caption(frames[11], 'explorer')).toBe('taking the top: 5 numbers in the pyramid')
    expect(caption(frames[11], 'engineer')).toBe('extract phase, heap size 5')
    expect(caption(last(frames), 'explorer')).toBe('all in order')
  })
})

describe('heap sort: hand-traced checks (mutation audit)', () => {
  // Textbook heapify(a, i, size) compares each child inside the heap with a[largest]:
  // `l < size and a[l] > a[largest]`, then `r < size and a[r] > a[largest]`. One comparison per
  // child, so 2 with two children, 1 with one, 0 at a leaf; a swap for each climb and each extract.

  it('[3, 1, 2]: 3 comparisons and 2 swaps', () => {
    // Build, i = 0 (size 3): 1 > 3? no; 2 > 3? no. 2 comparisons, stop.
    // k = 2: swap a[0] ↔ a[2] → [2, 1, 3] (swap 1). heapify(0, 2): only l = 1: 1 > 2? no. 3 comparisons.
    // k = 1: swap a[0] ↔ a[1] → [1, 2, 3] (swap 2). heapify(0, 1): no children.
    expect(last(framesFor([3, 1, 2])).stats).toEqual({ comparisons: 3, swaps: 2 })
  })

  it('the default input (5 2 8 1 9 3): 15 comparisons and 11 swaps', () => {
    // Build, size 6:
    //   i=2: l=5: 3 > 8? no (1). Stop.
    //   i=1: 1 > 2? no (2); 9 > 2? yes (3). Swap 1 ↔ 4 → [5 9 8 1 2 3] (swap 1). i=4: a leaf.
    //   i=0: 9 > 5? yes (4); 8 > 9? no (5). Swap 0 ↔ 1 → [9 5 8 1 2 3] (2). i=1: 1 > 5? no (6);
    //        2 > 5? no (7). Stop.
    // Extract:
    //   k=5: swap 0 ↔ 5 → [3 5 8 1 2 | 9] (3). 5 > 3 yes (8); 8 > 5 yes (9). Swap 0 ↔ 2 (4) →
    //        [8 5 3 1 2]. i=2: a leaf in size 5.
    //   k=4: swap 0 ↔ 4 → [2 5 3 1 | 8 9] (5). 5 > 2 yes (10); 3 > 5 no (11). Swap 0 ↔ 1 (6) →
    //        [5 2 3 1]. i=1: l=3: 1 > 2? no (12). Stop.
    //   k=3: swap 0 ↔ 3 → [1 2 3 | 5 8 9] (7). 2 > 1 yes (13); 3 > 2 yes (14). Swap 0 ↔ 2 (8) →
    //        [3 2 1]. i=2: a leaf.
    //   k=2: swap 0 ↔ 2 → [1 2 | 3 5 8 9] (9). l=1: 2 > 1 yes (15). Swap 0 ↔ 1 (10) → [2 1].
    //   k=1: swap 0 ↔ 1 → [1 | 2 3 5 8 9] (11). Size 1: nothing to compare.
    const frames = framesFor(DEFAULT)
    expect(last(frames).stats).toEqual({ comparisons: 15, swaps: 11 })
    expect(last(frames).array).toEqual([1, 2, 3, 5, 8, 9])
  })
})

describe('heap sort: Do it, traced by hand', () => {
  it('the default input (5 2 8 1 9 3): Engineer answers both phases (9), Explorer only the extract (5)', () => {
    // Textbook heapify(a, i, size): the larger child (ties: the left one) climbs past a[i] only if
    // it is strictly bigger. One question per step, on [i, larger child]: climb = trade, stop = keep.
    // Build, size 6:
    //   i=2: only child a[5] = 3; 3 > 8? no → stop
    //   i=1: children 1 and 9 → a[4] = 9; 9 > 2 → climb [5 9 8 1 2 3]; i=4 is a leaf
    //   i=0: children 9 and 8 → a[1] = 9; 9 > 5 → climb [9 5 8 1 2 3];
    //        i=1: children 1 and 2 → a[4] = 2; 2 > 5? no → stop
    // Extract (the top to the end is shown, not asked):
    //   k=5 [3 5 8 1 2]: a[2] = 8 > 3 → climb [8 5 3 1 2]; i=2 is a leaf in size 5
    //   k=4 [2 5 3 1]: a[1] = 5 > 2 → climb [5 2 3 1]; i=1: only child a[3] = 1 > 2? no → stop
    //   k=3 [1 2 3]: a[2] = 3 > 1 → climb [3 2 1]; i=2 is a leaf
    //   k=2 [1 2]: only child a[1] = 2 > 1 → climb [2 1]
    //   k=1: a heap of one, nothing to ask
    const frames = framesFor(DEFAULT)
    const extract = [
      '0 2 → trade 0 2',
      '0 1 → trade 0 1',
      '1 3 → keep',
      '0 2 → trade 0 2',
      '0 1 → trade 0 1',
    ]
    expect(doItMoves(askedAt(frames, 'engineer'))).toEqual([
      ...['2 5 → keep', '1 4 → trade 1 4', '0 1 → trade 0 1', '1 4 → keep'],
      ...extract,
    ])
    expect(doItMoves(askedAt(frames, 'explorer'))).toEqual(extract)
  })
})
