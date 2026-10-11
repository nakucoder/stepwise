import type { Algorithm, Frame, Hints, Level, TraceValue } from '../../engine/types'

/**
 * Insertion sort, the shift version: take the next value (the key) out of the line, shift every
 * bigger value one place right, and put the key into the gap. Equal values stop the shifting, so
 * the sort is stable.
 *
 * The frames are permutations: the key is drawn in the gap it is waiting for, so each shift
 * shows as the key and its left neighbor trading places. The code panel and the trace tell the
 * shift story (`key` held aside, `a[j + 1] = a[j]`); the `key` variable is always the value at
 * the key pointer.
 *
 * Frames follow the ask-then-answer rhythm (CLAUDE.md, rule 3). Each comparison asks "is a[j]
 * bigger than the key?" (decision `shift-or-stop` on [j, j + 1]); the next frame shifts (the key
 * moves one place left) or stops (nothing changes). When the key reaches the front there is
 * nothing left to compare, so no question.
 *
 * Nothing is marked "sorted" until the end: the left part is in order, but not final. The
 * stage caption says how many are in order so far.
 */

const SOURCE = `def insertion_sort(a):
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return a`

/** Lines of SOURCE that frames point at. */
export const INSERTION_SORT_LINES = {
  start: 1,
  pass: 2,
  key: 3,
  compare: 5,
  shift: 6,
  insert: 8,
  done: 9,
} as const

type Variables = Readonly<
  Record<'i' | 'key' | 'j' | 'a[j]' | 'bigger?' | 'action' | 'slide?' | 'inOrder', TraceValue>
>

const blank = (i: number | null, key: TraceValue, inOrder: number): Variables => ({
  i,
  key,
  j: null,
  'a[j]': null,
  'bigger?': null,
  action: null,
  'slide?': null,
  inOrder,
})

function* run(input: readonly number[]): Generator<Frame, void, undefined> {
  const a = [...input]
  const n = a.length
  let comparisons = 0
  let shifts = 0
  let final = false

  const frame = (
    fields: Omit<Frame, 'array' | 'stats' | 'highlights'> & {
      highlights?: Frame['highlights']
    },
  ): Frame => ({
    ...fields,
    array: [...a],
    highlights: {
      ...fields.highlights,
      ...(final && n > 0 && { sorted: Array.from({ length: n }, (_, k) => k) }),
    },
    stats: { comparisons, swaps: shifts },
  })
  const s = String

  yield frame({
    activeLine: INSERTION_SORT_LINES.start,
    variables: blank(null, null, Math.min(1, n)),
    explanation: {
      explorer:
        n === 0
          ? 'There are no numbers here yet.'
          : n === 1
            ? 'Here is your number. Just one is already in order.'
            : 'Here are your numbers. The first one on its own is already in order; let’s fit in the rest, one at a time.',
      engineer: `Insertion sort on n = ${s(n)}. a[0..1) is trivially sorted; each pass inserts a[i] into the sorted prefix by shifting bigger elements right.`,
    },
  })

  for (let i = 1; i < n; i++) {
    const key = a[i] ?? 0
    yield frame({
      activeLine: INSERTION_SORT_LINES.key,
      pointers: { key: i },
      variables: blank(i, key, i),
      explanation: {
        explorer: `Round ${s(i)}: take ${s(key)}, the new one, out of the line.`,
        engineer: `Pass i = ${s(i)}: key = a[${s(i)}] = ${s(key)}, j = ${s(i - 1)}.`,
      },
    })

    let j = i - 1
    let moved = false
    while (j >= 0) {
      const other = a[j] ?? 0
      const row = { i, key, j, 'a[j]': other, inOrder: i }

      // Ask: is a[j] bigger than the key?
      comparisons++
      yield frame({
        activeLine: INSERTION_SORT_LINES.compare,
        highlights: { comparing: [j, j + 1] },
        pointers: { j, key: j + 1 },
        variables: { ...row, 'bigger?': '?', action: null, 'slide?': null },
        decision: { kind: 'shift-or-stop', pair: [j, j + 1] },
        explanation: {
          explorer: `Is ${s(other)} bigger than ${s(key)}, the one we’re placing?`,
          engineer: `a[${s(j)}] = ${s(other)} > key = ${s(key)}?`,
        },
      })

      if (other > key) {
        // Answer: shift a[j] right; the key's gap moves one place left.
        a[j + 1] = other
        a[j] = key
        shifts++
        moved = true
        yield frame({
          activeLine: INSERTION_SORT_LINES.shift,
          highlights: { swapping: [j, j + 1] },
          pointers: { key: j },
          variables: { ...row, 'bigger?': 'yes', action: 'shift', 'slide?': 'yes' },
          explanation: {
            explorer: `Yes: ${s(other)} slides right to make room.`,
            engineer: `${s(other)} > ${s(key)}, so a[${s(j + 1)}] = a[${s(j)}] = ${s(other)}; j = ${s(j - 1)}.`,
          },
        })
        j--
      } else {
        // Answer: stop; the key goes right here, after a[j].
        yield frame({
          activeLine: INSERTION_SORT_LINES.compare,
          highlights: { comparing: [j, j + 1] },
          pointers: { j, key: j + 1 },
          variables: { ...row, 'bigger?': 'no', action: 'stop', 'slide?': 'no' },
          explanation: {
            explorer:
              other === key
                ? `No: they’re both ${s(key)}, so ${s(key)} stops here (equal ones keep their order).`
                : `No: ${s(other)} isn’t bigger, so ${s(key)} stops here.`,
            engineer: `${s(other)} ≤ ${s(key)}, so stop: key goes at a[${s(j + 1)}].`,
          },
        })
        break
      }
    }

    // Put the key into its gap: the first i + 1 are now in order.
    const at = j + 1
    yield frame({
      activeLine: INSERTION_SORT_LINES.insert,
      pointers: { key: at },
      variables: blank(i, key, i + 1),
      explanation: {
        explorer: !moved
          ? `${s(key)} was already in its place.`
          : at === 0
            ? `Nothing is left to check, so ${s(key)} goes in at the front.`
            : `${s(key)} goes into its place.`,
        engineer: !moved
          ? `a[${s(at)}] = key = ${s(key)}: no shifts this pass.`
          : at === 0
            ? `j = -1: a[0] = key = ${s(key)}.`
            : `a[${s(at)}] = key = ${s(key)}.`,
      },
    })
  }

  final = true
  yield frame({
    activeLine: INSERTION_SORT_LINES.done,
    variables: blank(null, null, n),
    explanation: {
      explorer:
        n === 0
          ? 'There was nothing to sort, so we’re done.'
          : n === 1
            ? 'With just one number, it’s already in order.'
            : shifts === 0
              ? 'They were in order all along: each one stopped at its first check. All done!'
              : 'All done! The numbers go from smallest to biggest.',
      engineer: `Return the sorted array after ${s(comparisons)} comparisons and ${s(shifts)} shifts.`,
    },
  })
}

/** The help ladder at a comparison: where to look, the rule, then this step's answer. */
function hints(ask: Frame): Readonly<Record<Level, Hints>> {
  const [j, k] = ask.decision?.pair ?? [0, 1]
  const other = ask.array[j] ?? 0
  const key = ask.array[k] ?? 0
  const s = String
  return {
    explorer: {
      nudge: `Look at ${s(other)} and the one we’re placing, ${s(key)}.`,
      concept: 'Bigger ones slide right to make room; stop when the one on the left isn’t bigger.',
      showMe:
        other > key
          ? `${s(other)} is bigger than ${s(key)}, so ${s(other)} slides right.`
          : other === key
            ? `They’re both ${s(key)}, so it stops here.`
            : `${s(other)} isn’t bigger than ${s(key)}, so ${s(key)} stops here.`,
    },
    engineer: {
      nudge: `Compare a[j] = a[${s(j)}] = ${s(other)} with key = ${s(key)}.`,
      concept:
        'While a[j] > key, shift a[j] right; stop at the first a[j] ≤ key (equal stops: stable).',
      showMe:
        other > key
          ? `${s(other)} > ${s(key)}: a[${s(j + 1)}] = a[${s(j)}], j = ${s(j - 1)}.`
          : `${s(other)} ≤ ${s(key)}: stop; a[${s(j + 1)}] = key.`,
    },
  }
}

export const insertionSort: Algorithm = {
  id: 'insertion-sort',
  name: 'Insertion sort',
  explorerName: 'Slot each card into place',
  category: 'sorting',
  // The penguins, "Snow-brick towers" (design/mockups/penguins). Named only: until their
  // renderer exists, the stage draws bars and offers no "Show as" switch.
  character: 'penguins',
  countWord: { one: 'shift', many: 'shifts' },
  complexity: {
    time: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    space: 'O(1)',
  },
  bestFor: {
    engineer: 'small or nearly sorted arrays; inserting as data arrives',
    explorer:
      'Lists that are almost in order, or short ones: each number only moves past the ones bigger than it.',
  },
  idea: {
    explorer: {
      lead: 'Like sorting cards in your hand: take the next one and slide it left past the bigger ones until it fits.',
      points: [
        {
          question: 'Why start at the second one?',
          answer:
            'One card on its own is already in order. Each new one fits into the ones before it.',
        },
        {
          question: 'Why can we stop early?',
          answer:
            'Everything on the left is already in order. Once the one on the left isn’t bigger, nothing further left is either.',
        },
        {
          question: 'Why is it quick when the list is almost in order?',
          answer:
            'Each new one only slides past the bigger ones. If it’s already in place, one check is enough.',
        },
        {
          question: 'When do we stop?',
          answer: 'When the last one has found its place: then they’re all in order.',
        },
      ],
    },
    engineer: {
      lead: 'Insert a[i] into the sorted prefix a[0..i) by shifting the bigger elements one place right; the prefix grows by one each pass.',
      points: [
        {
          question: 'Why shifts, not swaps?',
          answer:
            'The key is held aside, so each step is one write (a[j + 1] = a[j]) instead of a three-write swap; the key is written once, at the end.',
        },
        {
          question: 'Why O(n) at best?',
          answer:
            'On sorted input every pass makes one comparison and stops: n − 1 comparisons, 0 shifts. Unlike selection sort, it adapts to the input.',
        },
        {
          question: 'Why O(n²) at worst?',
          answer:
            'Reversed input shifts the key all the way to the front each pass: 1 + 2 + … + (n − 1) = n(n − 1)/2 shifts. The shifts equal the number of inversions.',
        },
        {
          question: 'Is it stable?',
          answer:
            'Yes: it stops at a[j] ≤ key, so a key never passes an equal element. It is also online: it can sort data as it arrives.',
        },
      ],
    },
  },
  source: { python: SOURCE },
  pointerLabels: {
    key: { engineer: 'key', explorer: 'new one' },
    j: { engineer: 'j', explorer: 'checking' },
  },
  // On a phone's narrow columns (Stage.css).
  pointerShortLabels: { key: 'new', j: 'check' },
  // One row per comparison: the question adds it with "?", the answer fills in yes or no.
  trace: {
    columns: [
      // Explorer keeps four columns, so the table fits a phone.
      { variable: 'i', label: { engineer: 'i', explorer: 'round' }, levels: ['engineer'] },
      { variable: 'key', label: { engineer: 'key', explorer: 'new one' } },
      { variable: 'j', label: { engineer: 'j', explorer: 'spot' }, levels: ['engineer'] },
      { variable: 'a[j]', label: { engineer: 'a[j]', explorer: 'this one' } },
      { variable: 'bigger?', label: { engineer: 'a[j] > key?', explorer: 'bigger?' } },
      {
        variable: 'action',
        label: { engineer: 'action', explorer: 'action' },
        levels: ['engineer'],
      },
      {
        variable: 'slide?',
        label: { engineer: 'slide?', explorer: 'slide?' },
        levels: ['explorer'],
      },
    ],
    rowKey: ['i', 'j'],
    rowDescription: { engineer: 'one row per comparison', explorer: 'one row per question' },
    group: {
      variable: 'i',
      name: { engineer: 'pass', explorer: 'round' },
      // "round 3: the first 3 are in order" (nothing is final until the end).
      note: (frame, level) => {
        const count = frame.variables?.inOrder
        if (typeof count !== 'number') return null
        return level === 'explorer'
          ? count === 1
            ? 'the first one is in order'
            : `the first ${String(count)} are in order`
          : `a[0..${String(count)}) in order`
      },
    },
    dense: true,
  },
  hints,
  run,
}
