import type { Algorithm, Frame, Hints, Level, TraceValue } from '../../engine/types'

/**
 * Selection sort, with the `if min_i != i` guard: at most one swap per pass, and none when the
 * smallest is already at the front.
 *
 * Frames follow the ask-then-answer rhythm (CLAUDE.md, rule 3). Every comparison asks "is this
 * one smaller than the smallest so far?" (decision `new-smallest` on [min, j]) and the next
 * frame answers by moving the `min` pointer, or not. The end of every pass asks "does the
 * smallest move to the front?" (decision `to-front` on [i, min]) and the next frame swaps the
 * two, or keeps them when the smallest is already there.
 *
 * Trace variables mirror the code, so i, j and min count from 0; Explorer counts from 1. The
 * variables `min` and `a[min]` agree with the `min` pointer, so a comparison's row shows the
 * smallest so far as it stands after that comparison. On the swap the row keeps the values
 * compared (like bubble sort's answer frames): a[min] is the smallest, now at the front.
 */

const SOURCE = `def selection_sort(a):
    n = len(a)
    for i in range(n - 1):
        min_i = i
        for j in range(i + 1, n):
            if a[j] < a[min_i]:
                min_i = j
        if min_i != i:
            a[i], a[min_i] = a[min_i], a[i]
    return a`

/** Lines of SOURCE that frames point at. */
export const SELECTION_SORT_LINES = {
  start: 2,
  pass: 3,
  setMin: 4,
  compare: 6,
  newMin: 7,
  guard: 8,
  swap: 9,
  done: 10,
} as const

type Variables = Readonly<
  Record<'i' | 'j' | 'a[j]' | 'min' | 'a[min]' | 'smaller?' | 'swap?', TraceValue>
>

const nothingYet = (i: number | null, min: number | null, smallest: TraceValue): Variables => ({
  i,
  j: null,
  'a[j]': null,
  min,
  'a[min]': smallest,
  'smaller?': null,
  'swap?': null,
})

function* run(input: readonly number[]): Generator<Frame, void, undefined> {
  const a = [...input]
  const n = a.length
  let comparisons = 0
  let swaps = 0
  // Positions known to be final, from the left end. Never shrinks.
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
  const value = (k: number) => a[k] ?? 0
  const s = String

  yield frame({
    activeLine: SELECTION_SORT_LINES.start,
    variables: nothingYet(null, null, null),
    explanation: {
      explorer:
        n === 0
          ? 'There are no numbers here yet.'
          : 'Here are your numbers. Let’s put them in order, smallest to biggest.',
      engineer: `Selection sort on n = ${s(n)}. Each pass finds the minimum of the unsorted part and swaps it to the front of that part.`,
    },
  })

  for (let i = 0; i < n - 1; i++) {
    let min = i
    yield frame({
      activeLine: SELECTION_SORT_LINES.setMin,
      pointers: { i, min },
      variables: nothingYet(i, min, value(min)),
      explanation: {
        explorer: `Round ${s(i + 1)}: start with ${s(value(i))} as the smallest so far.`,
        engineer: `Pass i = ${s(i)}: min_i = ${s(i)}, so the minimum so far is a[${s(i)}] = ${s(value(i))}.`,
      },
    })

    // The last comparison's row, which the end of the pass fills in with swap?.
    let lastRow: Variables = nothingYet(i, min, value(min))

    for (let j = i + 1; j < n; j++) {
      const candidate = value(j)
      const smallest = value(min)
      const compared = { i, j, 'a[j]': candidate, min, 'a[min]': smallest, 'swap?': null }

      // Ask: is a[j] smaller than the smallest so far?
      comparisons++
      yield frame({
        activeLine: SELECTION_SORT_LINES.compare,
        highlights: { comparing: [min, j] },
        pointers: { i, j, min },
        variables: { ...compared, 'smaller?': '?' },
        decision: { kind: 'new-smallest', pair: [min, j] },
        explanation: {
          explorer: `Is ${s(candidate)} smaller than ${s(smallest)}, the smallest so far?`,
          engineer: `Compare a[${s(j)}] = ${s(candidate)} with a[min_i] = a[${s(min)}] = ${s(smallest)}: is a[j] < a[min_i]?`,
        },
      })

      // Answer: the min pointer moves to j, or stays.
      if (candidate < smallest) {
        min = j
        lastRow = { ...compared, min, 'a[min]': candidate, 'smaller?': 'yes' }
        yield frame({
          activeLine: SELECTION_SORT_LINES.newMin,
          highlights: { comparing: [j] },
          pointers: { i, j, min },
          variables: lastRow,
          explanation: {
            explorer: `Yes! ${s(candidate)} is smaller, so ${s(candidate)} is the new smallest.`,
            engineer: `${s(candidate)} < ${s(smallest)}, so min_i = ${s(j)}.`,
          },
        })
      } else {
        lastRow = { ...compared, 'smaller?': 'no' }
        yield frame({
          activeLine: SELECTION_SORT_LINES.compare,
          highlights: { comparing: [min, j] },
          pointers: { i, j, min },
          variables: lastRow,
          explanation: {
            explorer:
              candidate === smallest
                ? `No, they’re both ${s(candidate)}, so the first ${s(smallest)} stays the smallest.`
                : `No, ${s(candidate)} is bigger, so ${s(smallest)} is still the smallest.`,
            engineer: `${s(candidate)} ≥ ${s(smallest)}, so min_i stays ${s(min)}.`,
          },
        })
      }
    }

    // Ask: does the smallest move to the front of the unsorted part?
    const smallest = value(min)
    const front = value(i)
    yield frame({
      activeLine: SELECTION_SORT_LINES.guard,
      highlights: { comparing: min === i ? [i] : [i, min] },
      pointers: { i, min },
      variables: { ...lastRow, 'swap?': '?' },
      decision: { kind: 'to-front', pair: [i, min] },
      explanation: {
        explorer: `The smallest is ${s(smallest)}. Does it need to move to the front?`,
        engineer: `End of pass: min_i = ${s(min)}. Is min_i != i, so a[i] and a[min_i] must swap?`,
      },
    })

    // Answer: swap, or keep when it's already at the front.
    if (min !== i) {
      a[i] = smallest
      a[min] = front
      swaps++
      yield frame({
        activeLine: SELECTION_SORT_LINES.swap,
        highlights: { swapping: [i, min] },
        pointers: { i, min },
        variables: { ...lastRow, 'swap?': 'yes' },
        explanation: {
          explorer: `Yes: ${s(smallest)} moves to the front, and ${s(front)} takes its old spot.`,
          engineer: `min_i = ${s(min)} ≠ i = ${s(i)}, so swap a[${s(i)}] and a[${s(min)}].`,
        },
      })
    } else {
      yield frame({
        activeLine: SELECTION_SORT_LINES.guard,
        highlights: { comparing: [i] },
        pointers: { i, min },
        variables: { ...lastRow, 'swap?': 'no' },
        explanation: {
          explorer: `No: ${s(smallest)} is already at the front, so it stays put.`,
          engineer: `min_i == i, so a[${s(i)}] = ${s(smallest)} is already in place: no swap.`,
        },
      })
    }

    sorted = Array.from({ length: i + 1 }, (_, k) => k)
    yield frame({
      activeLine: SELECTION_SORT_LINES.pass,
      variables: nothingYet(i, null, null),
      explanation: {
        explorer: `Round ${s(i + 1)} is done: ${s(value(i))} is in its final spot.`,
        engineer: `a[${s(i)}] = ${s(value(i))} is final: the sorted part is now a[0..${s(i)}].`,
      },
    })
  }

  // Once every pass has run, the last position is final too.
  sorted = Array.from({ length: n }, (_, k) => k)
  yield frame({
    activeLine: SELECTION_SORT_LINES.done,
    variables: nothingYet(null, null, null),
    explanation: {
      explorer:
        n === 0
          ? 'There was nothing to sort, so we’re done.'
          : n === 1
            ? 'With just one number, it’s already in order.'
            : swaps === 0
              ? 'They were in order all along, but every number still got checked. All done!'
              : 'All done! The numbers go from smallest to biggest.',
      engineer: `Return the sorted array after ${s(comparisons)} comparisons and ${s(swaps)} swaps.`,
    },
  })
}

/**
 * The help ladder at a decision: where to look, the rule, then this step's answer. Explorer
 * names the colour, which reads the same on bars and on the robot's crates.
 */
function hints(ask: Frame): Readonly<Record<Level, Hints>> {
  const [first, second] = ask.decision?.pair ?? [0, 0]
  const at = (k: number) => ask.array[k] ?? 0
  const s = String
  if (ask.decision?.kind === 'to-front') {
    const i = first
    const min = second
    const smallest = s(at(min))
    return {
      explorer: {
        nudge: `Look at the front spot and at the smallest number, ${smallest}. Is the smallest already at the front?`,
        concept:
          'The smallest number moves to the front by trading places with whatever is there. If it’s already at the front, it stays put.',
        showMe:
          i === min
            ? `${smallest} is already at the front, so it stays put.`
            : `${smallest} trades places with ${s(at(i))}, so it’s at the front.`,
      },
      engineer: {
        nudge: `Compare the positions: i = ${s(i)} and min_i = ${s(min)}.`,
        concept: 'Swap a[i] and a[min_i] only if min_i != i: at most one swap per pass.',
        showMe:
          i === min
            ? `min_i == i, so no swap: a[${s(i)}] is already the minimum.`
            : `min_i = ${s(min)} ≠ ${s(i)}, so swap a[${s(i)}] and a[${s(min)}].`,
      },
    }
  }
  const min = first
  const j = second
  const smallest = at(min)
  const candidate = at(j)
  return {
    explorer: {
      nudge: `Look at the two numbers marked in yellow: ${s(candidate)} and the smallest so far, ${s(smallest)}. Which one is smaller?`,
      concept:
        'If the new number is smaller than the smallest so far, it becomes the new smallest. If not, or if they’re equal, keep looking.',
      showMe:
        candidate < smallest
          ? `${s(candidate)} is smaller than ${s(smallest)}, so ${s(candidate)} is the new smallest.`
          : candidate === smallest
            ? `They’re both ${s(candidate)}, so the first ${s(smallest)} stays the smallest.`
            : `${s(candidate)} is bigger than ${s(smallest)}, so keep looking.`,
    },
    engineer: {
      nudge: `Only a[j] and a[min_i] matter here: a[${s(j)}] = ${s(candidate)} and a[${s(min)}] = ${s(smallest)}.`,
      concept:
        'Update min_i only when a[j] < a[min_i]. Equal values don’t update it, so the first of equal minimums is kept.',
      showMe:
        candidate < smallest
          ? `${s(candidate)} < ${s(smallest)}, so min_i = ${s(j)}.`
          : `${s(candidate)} ≥ ${s(smallest)}, so min_i stays ${s(min)}.`,
    },
  }
}

export const selectionSort: Algorithm = {
  id: 'selection-sort',
  name: 'Selection sort',
  explorerName: 'Pick the smallest, one at a time',
  category: 'sorting',
  // Scout and Crane (design/mockups/robot). Named only: until its renderer exists, the stage
  // draws bars and offers no "Show as" switch (src/characters/registry.ts).
  character: 'robot',
  complexity: {
    time: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
  },
  bestFor: {
    engineer: 'small lists where swaps are costly',
    explorer:
      'Moves very little: each round moves just one number. But it checks every number each time, so it’s slow for long lists.',
  },
  idea: {
    explorer: {
      lead: 'Find the smallest number and move it to the front. Then do the same with the rest.',
      points: [
        {
          question: 'Why check every number?',
          answer:
            'The smallest could be anywhere. You can’t be sure it’s the smallest until you’ve checked them all.',
        },
        {
          question: 'Why remember just one?',
          answer:
            'You only need the smallest so far. Each new number either beats it or it doesn’t.',
        },
        {
          question: 'Why move it to the front?',
          answer:
            'The front is where the smallest belongs. Once it’s there, it never moves again, so each round has one fewer number to check.',
        },
        {
          question: 'When do we stop?',
          answer:
            'When just one number is left. It must be the biggest, so it’s already in its spot.',
        },
      ],
    },
    engineer: {
      lead: 'Select the minimum of the unsorted suffix and swap it into position i; the prefix a[0..i) is sorted and final.',
      points: [
        {
          question: 'Why n − 1 passes?',
          answer:
            'Each pass fixes one position. After n − 1 passes only the last element is left, and it must be the maximum.',
        },
        {
          question: 'Why at most one swap per pass?',
          answer:
            'The scan only tracks min_i; the one swap happens after it. That’s at most n − 1 swaps in total, which suits data where writes are expensive.',
        },
        {
          question: 'Why always O(n²)?',
          answer:
            'Every pass scans the whole unsorted suffix: (n − 1) + (n − 2) + … + 1 = n(n − 1)/2 comparisons, even on sorted input. Unlike bubble sort, there’s no early exit.',
        },
        {
          question: 'Is it stable?',
          answer:
            'No. The long-distance swap can carry a value past an equal one, changing their order.',
        },
      ],
    },
  },
  source: { python: SOURCE },
  pointerLabels: {
    i: { engineer: 'i', explorer: 'front' },
    j: { engineer: 'j', explorer: 'checking' },
    min: { engineer: 'min', explorer: 'smallest' },
  },
  // One row per comparison: the question adds it with "?", the answer fills in yes or no; the
  // end of the pass fills in the last row's swap?.
  trace: {
    columns: [
      { variable: 'i', label: { engineer: 'i', explorer: 'round' }, explorerOffset: 1 },
      { variable: 'j', label: { engineer: 'j', explorer: 'checking' }, explorerOffset: 1 },
      { variable: 'a[j]', label: { engineer: 'a[j]', explorer: 'number' } },
      { variable: 'min', label: { engineer: 'min', explorer: 'smallest at' }, explorerOffset: 1 },
      { variable: 'a[min]', label: { engineer: 'a[min]', explorer: 'smallest' } },
      { variable: 'smaller?', label: { engineer: 'a[j] < a[min]?', explorer: 'smaller?' } },
      { variable: 'swap?', label: { engineer: 'swap?', explorer: 'move?' } },
    ],
    rowKey: ['i', 'j'],
    rowDescription: { engineer: 'one row per comparison', explorer: 'one row per question' },
    group: { variable: 'i', name: { engineer: 'pass', explorer: 'round' } },
  },
  hints,
  run,
}
