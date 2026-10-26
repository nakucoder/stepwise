import type { Algorithm, Frame, HeapStep, Hints, Level, TraceValue } from '../../engine/types'

/**
 * Heap sort with a max-heap and sift-down. First the array becomes a max-heap, bottom up: each
 * parent from ⌊n/2⌋ − 1 down to 0 sifts down. Then, for k = n − 1 down to 1, the top (the
 * biggest) swaps with a[k], a[k] is final, and the new top sifts down in the heap a[0..k).
 *
 * A sift step compares the parent's children (shown, never asked; equal children: the left one
 * is the bigger), then asks whether the bigger child climbs past the parent: only a strictly
 * bigger one does, so equal values stop. The next frame answers: it climbs (a swap, and the sift
 * goes on from the child's place) or it stops. A value that reaches the bottom settles there.
 *
 * Every frame carries `heap`: the phase, the event, the heap size (positions from it on are
 * sorted), the parent the step looks at, the value being sifted and the parent's children inside
 * the heap. The stage draws the parent's arcs to its children from it, so the frames set no
 * pointers: i, l and r are in the trace. The ask frames have no `decision` yet: Do it comes later
 * (docs/ROADMAP.md).
 */

const SOURCE = `def heap_sort(a):
    n = len(a)
    for i in range(n // 2 - 1, -1, -1):
        heapify(a, i, n)
    for k in range(n - 1, 0, -1):
        a[0], a[k] = a[k], a[0]
        heapify(a, 0, k)
    return a

def heapify(a, i, size):
    while True:
        l, r = 2 * i + 1, 2 * i + 2
        largest = i
        if l < size and a[l] > a[largest]:
            largest = l
        if r < size and a[r] > a[largest]:
            largest = r
        if largest == i:
            return
        a[i], a[largest] = a[largest], a[i]
        i = largest`

/** Lines of SOURCE that frames point at. */
export const HEAP_SORT_LINES = {
  start: 1,
  build: 3,
  extractPhase: 5,
  extract: 6,
  done: 8,
  compareLeft: 14,
  compareRight: 16,
  stop: 19,
  climb: 20,
} as const

type Variables = Readonly<
  Record<
    'step' | 'phase' | 'size' | 'i' | 'l' | 'r' | 'largest' | 'value' | 'child' | 'climbs?',
    TraceValue
  >
>

const BLANK: Variables = {
  step: null,
  phase: null,
  size: null,
  i: null,
  l: null,
  r: null,
  largest: null,
  value: null,
  child: null,
  'climbs?': null,
}

const s = String
const numbers = (count: number) => (count === 1 ? '1 number' : `${s(count)} numbers`)

/** The children of `i` inside a heap of `size`: left first. */
export function childrenOf(i: number, size: number): number[] {
  return [2 * i + 1, 2 * i + 2].filter((c) => c < size)
}

/** How many rows deep position `k` sits in the pyramid (0: the top). */
export function rowOf(k: number): number {
  return Math.floor(Math.log2(k + 1))
}

function* run(input: readonly number[]): Generator<Frame, void, undefined> {
  const a = [...input]
  const n = a.length
  let comparisons = 0
  let swaps = 0
  // The sift steps so far: each one is a row of the trace table.
  let steps = 0
  // Positions from here on are final (the heap is a[0..size)).
  let size = n

  const sortedFrom = (from: number) =>
    from < n ? { sorted: Array.from({ length: n - from }, (_, k) => from + k) } : {}
  const frame = (
    fields: Omit<Frame, 'array' | 'stats' | 'highlights'> & {
      highlights?: Frame['highlights']
      sortedFrom?: number
    },
  ): Frame => {
    const { sortedFrom: from = size, ...rest } = fields
    return {
      ...rest,
      array: [...a],
      highlights: { ...fields.highlights, ...sortedFrom(from) },
      stats: { comparisons, swaps },
    }
  }
  const value = (k: number) => a[k] ?? 0
  const swap = (x: number, y: number) => {
    ;[a[x], a[y]] = [value(y), value(x)]
    swaps++
  }
  const step = (
    phase: HeapStep['phase'],
    event: HeapStep['event'],
    parent: number | null = null,
    sifted: number | null = parent === null ? null : value(parent),
  ): HeapStep => ({
    phase,
    event,
    size,
    parent,
    value: sifted,
    children: parent === null ? [] : childrenOf(parent, size),
  })

  yield frame({
    activeLine: HEAP_SORT_LINES.start,
    heap: step('build', 'start'),
    variables: { ...BLANK, phase: 'build', size },
    explanation: {
      explorer:
        n === 0
          ? 'There are no numbers here yet.'
          : n === 1
            ? 'Here is your number. Just one is already in order.'
            : 'Here are your numbers. First build a pyramid with the biggest at the top, then send the top to its place at the end, again and again.',
      engineer:
        n < 2
          ? `Heap sort on n = ${s(n)}: fewer than two elements, already sorted.`
          : `Heap sort, n = ${s(n)}: build a max-heap bottom-up from i = ${s(Math.floor(n / 2) - 1)}, then extract the max n − 1 times.`,
    },
  })

  /** Sift a[i] down inside a[0..size), one ask-then-answer pair per step. */
  function* siftDown(phase: HeapStep['phase'], start: number): Generator<Frame, void, undefined> {
    let i = start
    const sifted = value(start)
    for (;;) {
      const [l, r] = [2 * i + 1, 2 * i + 2]
      const children = childrenOf(i, size)
      const [left, right] = children
      if (left === undefined) {
        // Nothing under it: it settles (only after a climb; a sift never starts at the bottom).
        if (i !== start) {
          yield frame({
            activeLine: HEAP_SORT_LINES.stop,
            heap: step(phase, 'settles', i, sifted),
            variables: { ...BLANK, phase, size },
            explanation: {
              explorer: `${s(sifted)} has nothing under it now, so it settles here.`,
              engineer: `i = ${s(i)}: l = ${s(l)} >= size ${s(size)}, a leaf; heapify returns.`,
            },
          })
        }
        return
      }
      // The children are compared (shown, not asked): a tie goes to the left one.
      const bigger = right !== undefined && value(right) > value(left) ? right : left
      const child = value(bigger)
      const parentValue = value(i)
      comparisons += children.length
      steps++
      const row = { ...BLANK, step: steps, phase, size, i, l, r, value: parentValue, child }
      const under =
        right === undefined
          ? `Under ${s(parentValue)} is just ${s(child)}.`
          : `Under ${s(parentValue)} are ${s(value(left))} and ${s(value(right))}; the bigger one is ${s(child)}${value(left) === value(right) ? ' (the left one, they’re the same)' : ''}.`
      const pick =
        right === undefined
          ? `l = ${s(l)} < size, r = ${s(r)} is outside the heap; the child is a[${s(l)}] = ${s(child)}.`
          : `a[${s(l)}] = ${s(value(left))}, a[${s(r)}] = ${s(value(right))}: the larger child is a[${s(bigger)}] = ${s(child)}.`
      yield frame({
        activeLine:
          right === undefined ? HEAP_SORT_LINES.compareLeft : HEAP_SORT_LINES.compareRight,
        heap: step(phase, 'ask', i, sifted),
        highlights: { comparing: [i, bigger] },
        variables: { ...row, largest: '?', 'climbs?': '?' },
        explanation: {
          explorer: `${under} Does ${s(child)} climb up past ${s(parentValue)}?`,
          engineer: `heapify(a, ${s(i)}, ${s(size)}): ${pick} a[${s(bigger)}] > a[${s(i)}] = ${s(parentValue)}?`,
        },
      })

      if (child > parentValue) {
        const heapBefore = step(phase, 'climb', i, sifted)
        swap(i, bigger)
        yield frame({
          activeLine: HEAP_SORT_LINES.climb,
          heap: heapBefore,
          highlights: { swapping: [i, bigger] },
          variables: { ...row, largest: bigger, 'climbs?': 'yes' },
          explanation: {
            explorer: `Yes: ${s(child)} is bigger, so it climbs up and ${s(parentValue)} goes down.`,
            engineer: `${s(child)} > ${s(parentValue)}: largest = ${s(bigger)}; swap a[${s(i)}] ↔ a[${s(bigger)}]; i = ${s(bigger)}.`,
          },
        })
        i = bigger
      } else {
        yield frame({
          activeLine: HEAP_SORT_LINES.stop,
          heap: step(phase, 'stop', i, sifted),
          highlights: { comparing: [i, bigger] },
          variables: { ...row, largest: i, 'climbs?': 'no' },
          explanation: {
            explorer:
              child === parentValue
                ? `No: ${s(child)} is the same as ${s(parentValue)}, and only a bigger one climbs. ${s(parentValue)} stays.`
                : `No: ${s(child)} is smaller, so ${s(parentValue)} stays where it is.`,
            engineer: `${s(child)} <= ${s(parentValue)}: largest == i = ${s(i)}, the heap property holds here; heapify returns.`,
          },
        })
        return
      }
    }
  }

  if (n >= 2) {
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) yield* siftDown('build', i)

    yield frame({
      activeLine: HEAP_SORT_LINES.extractPhase,
      heap: step('extract', 'start'),
      variables: { ...BLANK, phase: 'extract', size },
      explanation: {
        explorer: `The pyramid is built: every number is at least as big as the two under it, so the biggest, ${s(value(0))}, is at the top.`,
        engineer: `Max-heap built: a[0] = ${s(value(0))} is the maximum. Extract: for k = ${s(n - 1)} down to 1, swap a[0] ↔ a[k] and heapify(a, 0, k).`,
      },
    })

    for (let k = n - 1; k >= 1; k--) {
      const top = value(0)
      const other = value(k)
      swap(0, k)
      size = k
      const last = k === 1
      yield frame({
        activeLine: HEAP_SORT_LINES.extract,
        heap: step('extract', 'extract', 0),
        highlights: { swapping: [0, k] },
        // The last one left is in place too.
        sortedFrom: last ? 0 : k,
        variables: { ...BLANK, phase: 'extract', size },
        explanation: {
          explorer: last
            ? `The top, ${s(top)}, goes to its place at the end: it trades places with ${s(other)}, the last one, which is in place too.`
            : `The top, ${s(top)}, goes to its place at the end: it trades places with ${s(other)}. ${numbers(k)} left in the pyramid.`,
          engineer: last
            ? `Swap a[0] ↔ a[1]: ${s(top)} is final; heap size = 1, so a[0] = ${s(other)} is final too.`
            : `Swap a[0] ↔ a[${s(k)}]: ${s(top)} is final; heap size = ${s(k)}. heapify(a, 0, ${s(k)}).`,
        },
      })
      yield* siftDown('extract', 0)
    }
  }

  size = 0
  yield frame({
    activeLine: HEAP_SORT_LINES.done,
    heap: step('extract', 'done'),
    variables: { ...BLANK, phase: 'done', size },
    explanation: {
      explorer:
        n === 0
          ? 'There was nothing to sort, so we’re done.'
          : n === 1
            ? 'With just one number, it’s already in order.'
            : 'All done! The numbers go from smallest to biggest.',
      engineer: `Return the sorted array after ${s(comparisons)} comparisons and ${s(swaps)} swaps.`,
    },
  })
}

/** The help ladder at "does the bigger child climb past its parent?" (for Do it, later). */
function hints(ask: Frame): Readonly<Record<Level, Hints>> {
  const parent = Number(ask.variables?.value ?? 0)
  const child = Number(ask.variables?.child ?? 0)
  const i = ask.variables?.i
  const largest = ask.highlights.comparing?.[1]
  const climbs = child > parent
  return {
    explorer: {
      nudge: `Look at ${s(parent)} and the bigger one under it, ${s(child)}.`,
      concept: 'The bigger one climbs up. If it is smaller or the same, nothing moves.',
      showMe: climbs
        ? `${s(child)} is bigger than ${s(parent)}, so ${s(child)} climbs up.`
        : `${s(child)} is not bigger than ${s(parent)}, so ${s(parent)} stays.`,
    },
    engineer: {
      nudge: `Compare the larger child, a[${s(largest)}] = ${s(child)}, with a[${s(i)}] = ${s(parent)}.`,
      concept:
        'If a[largest] > a[i], swap them and continue from largest; otherwise the heap property holds and heapify returns.',
      showMe: climbs
        ? `${s(child)} > ${s(parent)}: swap a[${s(i)}] ↔ a[${s(largest)}], i = ${s(largest)}.`
        : `${s(child)} <= ${s(parent)}: return.`,
    },
  }
}

/** The stage caption: the phase and the heap's size, then "all in order" at the end. */
function caption(frame: Frame, level: Level): string | null {
  const heap = frame.heap
  if (!heap) return null
  if (frame.array.length > 0 && (frame.highlights.sorted?.length ?? 0) === frame.array.length) {
    return 'all in order'
  }
  if (frame.array.length < 2) return null
  if (level === 'explorer') {
    return heap.phase === 'build'
      ? 'building the pyramid'
      : `taking the top: ${numbers(heap.size)} in the pyramid`
  }
  return `${heap.phase === 'build' ? 'build' : 'extract'} phase, heap size ${s(heap.size)}`
}

export const heapSort: Algorithm = {
  id: 'heap-sort',
  name: 'Heap sort',
  explorerName: 'Build a pyramid, then take the top',
  category: 'sorting',
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(1)',
  },
  bestFor: {
    engineer: 'a guaranteed O(n log n) in place, when stability and cache speed matter less',
    explorer: 'Big lists, never slow whatever the order, and no second row needed.',
  },
  idea: {
    explorer: {
      lead: 'Make a pyramid where each number is at least as big as the two under it. The top is the biggest: it goes to its place at the end, again and again.',
      points: [
        {
          question: 'Where is the pyramid?',
          answer:
            'The first number is the top, the next two are under it, the next four under those.',
        },
        {
          question: 'Why does the bigger one climb up?',
          answer: 'So the biggest always ends up at the top.',
        },
        {
          question: 'What if they are the same?',
          answer: 'Nothing moves: only a bigger one climbs.',
        },
        {
          question: 'When do we stop?',
          answer: 'When one number is left in the pyramid.',
        },
      ],
    },
    engineer: {
      lead: 'Build a max-heap in place, then swap the root a[0] with a[k] and heapify the heap a[0..k), for k = n − 1 down to 1.',
      points: [
        {
          question: 'Why O(n log n) in every case?',
          answer:
            'Each of the n − 1 extractions sifts down at most log₂ n levels, whatever the input; the build is O(n).',
        },
        {
          question: 'Why build bottom-up?',
          answer:
            'Most nodes sit near the leaves and sift down little: the heights sum to O(n), not O(n log n).',
        },
        {
          question: 'Where are the children?',
          answer: 'An implicit tree: l = 2i + 1, r = 2i + 2, parent (i − 1) // 2.',
        },
        {
          question: 'Space, and is it stable?',
          answer: 'O(1) extra (heapify is a loop). Not stable: swaps jump over equal keys.',
        },
      ],
    },
  },
  source: { python: SOURCE },
  // One row per sift step: the question adds it with "?", the answer fills in largest.
  trace: {
    columns: [
      { variable: 'size', label: { engineer: 'size', explorer: 'size' }, levels: ['engineer'] },
      { variable: 'i', label: { engineer: 'i', explorer: 'i' }, levels: ['engineer'] },
      { variable: 'l', label: { engineer: 'l', explorer: 'l' }, levels: ['engineer'] },
      { variable: 'r', label: { engineer: 'r', explorer: 'r' }, levels: ['engineer'] },
      { variable: 'value', label: { engineer: 'a[i]', explorer: 'number' }, levels: ['explorer'] },
      {
        variable: 'child',
        label: { engineer: 'child', explorer: 'bigger under it' },
        levels: ['explorer'],
      },
      {
        variable: 'largest',
        label: { engineer: 'largest', explorer: 'largest' },
        levels: ['engineer'],
      },
      {
        variable: 'climbs?',
        label: { engineer: 'climbs?', explorer: 'climbs up?' },
        levels: ['explorer'],
      },
    ],
    rowKey: ['step'],
    rowDescription: { engineer: 'one row per sift step', explorer: 'one row per question' },
    // Each phase starts a new group of rows; the caption comes from the frame's heap.
    group: {
      variable: 'phase',
      name: { engineer: 'phase', explorer: 'phase' },
      note: caption,
    },
    dense: true,
  },
  hints,
  run,
}
