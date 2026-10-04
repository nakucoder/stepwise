import type { Algorithm, Frame, TraceValue } from '../../engine/types'

/**
 * Bubble sort, with the early exit when a pass makes no swaps.
 *
 * Frames follow an ask-then-answer rhythm (design D): a comparison frame asks the question
 * ("Is 5 bigger than 3?", trace swap? = "?"), and the next frame answers it with either a
 * swap frame or a keep frame (swap? = "yes" or "no"). This also sets up a future quiz mode.
 *
 * Trace variables mirror the code, so i and j count from 0; Explorer text counts rounds
 * from 1. On answer frames, a[j] and a[j+1] keep the values that were compared, so each
 * comparison reads as one row of the trace table.
 */

const SOURCE = `def bubble_sort(a):
    n = len(a)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:
            break
    return a`

/** Lines of SOURCE that frames point at. */
export const BUBBLE_SORT_LINES = {
  start: 2,
  compare: 6,
  swap: 7,
  passCheck: 9,
  earlyExit: 10,
  done: 11,
} as const

type Variables = Readonly<Record<'i' | 'j' | 'a[j]' | 'a[j+1]' | 'swap?', TraceValue>>

const noComparison = (i: number | null): Variables => ({
  i,
  j: null,
  'a[j]': null,
  'a[j+1]': null,
  'swap?': null,
})

function* run(input: readonly number[]): Generator<Frame, void, undefined> {
  const a = [...input]
  const n = a.length
  let comparisons = 0
  let swaps = 0
  // Positions known to be final, from the right end. Never shrinks.
  let sorted: number[] = []

  const frame = (
    fields: Omit<Frame, 'array' | 'stats' | 'highlights'> & {
      highlights?: Frame['highlights']
    },
  ): Frame => ({
    ...fields,
    array: [...a],
    highlights: { ...fields.highlights, ...(sorted.length > 0 && { sorted: [...sorted] }) },
    stats: { comparisons, swaps },
  })

  yield frame({
    activeLine: BUBBLE_SORT_LINES.start,
    variables: noComparison(null),
    explanation: {
      explorer:
        n === 0
          ? 'There are no numbers here yet.'
          : 'Here are your numbers. Let’s put them in order, smallest to biggest.',
      engineer: `Bubble sort on n = ${String(n)}. Each pass compares neighbours and swaps any pair that is out of order.`,
    },
  })

  let exitedEarly = false

  for (let i = 0; i < n - 1; i++) {
    let swapped = false

    for (let j = 0; j < n - 1 - i; j++) {
      const left = a[j] ?? 0
      const right = a[j + 1] ?? 0
      const pointers = { j, 'j+1': j + 1 }
      const compared = { i, j, 'a[j]': left, 'a[j+1]': right }

      // Ask.
      comparisons++
      yield frame({
        activeLine: BUBBLE_SORT_LINES.compare,
        highlights: { comparing: [j, j + 1] },
        pointers,
        variables: { ...compared, 'swap?': '?' },
        explanation: {
          explorer: `Is ${String(left)} bigger than ${String(right)}?`,
          engineer: `Compare a[${String(j)}] = ${String(left)} with a[${String(j + 1)}] = ${String(right)}: is a[j] > a[j+1]?`,
        },
      })

      // Answer.
      if (left > right) {
        a[j] = right
        a[j + 1] = left
        swaps++
        swapped = true
        yield frame({
          activeLine: BUBBLE_SORT_LINES.swap,
          highlights: { swapping: [j, j + 1] },
          pointers,
          variables: { ...compared, 'swap?': 'yes' },
          explanation: {
            explorer: `Yes! ${String(left)} is bigger, so they trade places.`,
            engineer: `${String(left)} > ${String(right)}, so swap a[${String(j)}] and a[${String(j + 1)}]; swapped = True.`,
          },
        })
      } else {
        yield frame({
          activeLine: BUBBLE_SORT_LINES.compare,
          highlights: { comparing: [j, j + 1] },
          pointers,
          variables: { ...compared, 'swap?': 'no' },
          explanation: {
            explorer:
              left === right
                ? `No, they’re both ${String(left)}, so they stay put.`
                : `No, ${String(left)} is smaller, so they stay put.`,
            engineer: `${String(left)} ≤ ${String(right)}, so the pair is already in order: no swap.`,
          },
        })
      }
    }

    if (!swapped) {
      sorted = Array.from({ length: n }, (_, k) => k)
      exitedEarly = true
      yield frame({
        activeLine: BUBBLE_SORT_LINES.earlyExit,
        variables: noComparison(i),
        explanation: {
          explorer: `Round ${String(i + 1)} had no trades at all, so everything is already in order!`,
          engineer: `No swaps in pass i = ${String(i)}, so the array is sorted: break early.`,
        },
      })
      break
    }

    const settled = n - 1 - i
    sorted = [settled, ...sorted]
    yield frame({
      activeLine: BUBBLE_SORT_LINES.passCheck,
      variables: noComparison(i),
      explanation: {
        explorer: `Round ${String(i + 1)} is done: ${String(a[settled])} is in its final spot.`,
        engineer: `Pass i = ${String(i)} made swaps, so continue. The largest unsorted value, ${String(a[settled])}, has bubbled up to a[${String(settled)}].`,
      },
    })
  }

  // Once every pass has run, the first position is final too.
  sorted = Array.from({ length: n }, (_, k) => k)
  yield frame({
    activeLine: BUBBLE_SORT_LINES.done,
    variables: noComparison(null),
    explanation: {
      explorer:
        n === 0
          ? 'There was nothing to sort, so we’re done.'
          : n === 1
            ? 'With just one number, it’s already in order.'
            : exitedEarly && swaps === 0
              ? 'They were in order all along. All done!'
              : 'All done! The numbers go from smallest to biggest.',
      engineer: `Return the sorted array after ${String(comparisons)} comparisons and ${String(swaps)} swaps.`,
    },
  })
}

export const bubbleSort: Algorithm = {
  id: 'bubble-sort',
  name: 'Bubble sort',
  explorerName: 'Bubble the biggest to the end',
  category: 'sorting',
  complexity: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
  },
  source: { python: SOURCE },
  pointerLabels: {
    j: { engineer: 'j', explorer: 'left' },
    'j+1': { engineer: 'j+1', explorer: 'right' },
  },
  // One row per comparison: the question adds it with "?", the answer fills in yes or no.
  trace: {
    columns: [
      { variable: 'i', label: { engineer: 'i', explorer: 'round' }, explorerOffset: 1 },
      { variable: 'j', label: { engineer: 'j', explorer: 'spot' }, explorerOffset: 1 },
      { variable: 'a[j]', label: { engineer: 'a[j]', explorer: 'left' } },
      { variable: 'a[j+1]', label: { engineer: 'a[j+1]', explorer: 'right' } },
      { variable: 'swap?', label: { engineer: 'swap?', explorer: 'swap?' } },
    ],
    rowKey: ['i', 'j'],
    group: { variable: 'i', name: { engineer: 'pass', explorer: 'round' } },
  },
  run,
}
