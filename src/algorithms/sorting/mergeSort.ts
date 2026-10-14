import type { Algorithm, Frame, Hints, Level, SpanStep, TraceValue } from '../../engine/types'

/**
 * Merge sort, top-down: split the list in half, sort each half the same way, then merge the two
 * sorted halves back together, the smaller front first. Equal fronts take the left one, so the
 * sort is stable.
 *
 * Two rows (#74): the main row on top, and the buffer row under it on the same columns. When a
 * part `[lo, hi)` is merged, its values move down into the buffer, keeping their columns: the
 * left half (`left` in the code) in `[lo, mid)`, the right half (`right`) in `[mid, hi)`. The
 * main row's `[lo, hi)` is then vacant, and fills again from `lo`, one value at a time.
 *
 * Every frame of a split or a merge carries `span` (lo, mid, hi, the depth and what happens);
 * the pointers are `k` on the main row (the next place to write) and `i`, `j` on the buffer
 * (the two fronts, at columns `lo + i` and `mid + j`).
 *
 * Frames follow the ask-then-answer rhythm (CLAUDE.md, rule 3). Each comparison asks "which goes
 * next?" (decision `which-next` on the two fronts' columns); the next frame moves the smaller one
 * up (the left one when equal). When a half runs out, the rest of the other half moves up with
 * no question. A split changes no values: its frame shows where the line is cut.
 */

const SOURCE = `def merge_sort(a, lo=0, hi=None):
    if hi is None:
        hi = len(a)
    if hi - lo < 2:
        return a
    mid = (lo + hi) // 2
    merge_sort(a, lo, mid)
    merge_sort(a, mid, hi)
    left, right = a[lo:mid], a[mid:hi]
    i = j = 0
    for k in range(lo, hi):
        if j == len(right) or (i < len(left) and left[i] <= right[j]):
            a[k] = left[i]
            i += 1
        else:
            a[k] = right[j]
            j += 1
    return a`

/** Lines of SOURCE that frames point at. */
export const MERGE_SORT_LINES = {
  start: 1,
  split: 6,
  compare: 12,
  takeLeft: 13,
  takeRight: 16,
  merged: 18,
  done: 18,
} as const

type Variables = Readonly<
  Record<
    | 'lo..hi'
    | 'i'
    | 'j'
    | 'k'
    | 'left[i]'
    | 'right[j]'
    | 'left<=right?'
    | 'take'
    | 'smaller?'
    | 'next',
    TraceValue
  >
>

const BLANK: Variables = {
  'lo..hi': null,
  i: null,
  j: null,
  k: null,
  'left[i]': null,
  'right[j]': null,
  'left<=right?': null,
  take: null,
  'smaller?': null,
  next: null,
}

const s = String
const part = (lo: number, hi: number) => `${s(lo)}..${s(hi)}`

function* run(input: readonly number[]): Generator<Frame, void, undefined> {
  const a = [...input]
  const n = a.length
  // The buffer row, one slot per column; null where nothing waits.
  const buffer: (number | null)[] = Array.from({ length: n }, () => null)
  const vacant = new Set<number>()
  let comparisons = 0
  let moves = 0
  let final = false

  const frame = (
    fields: Omit<Frame, 'array' | 'stats' | 'highlights' | 'buffer' | 'vacant'> & {
      highlights?: Frame['highlights']
      bufferHighlights?: NonNullable<Frame['buffer']>['highlights']
      bufferPointers?: NonNullable<Frame['buffer']>['pointers']
    },
  ): Frame => {
    const { bufferHighlights, bufferPointers, ...rest } = fields
    return {
      ...rest,
      array: [...a],
      highlights: {
        ...fields.highlights,
        ...(final && n > 0 && { sorted: Array.from({ length: n }, (_, k) => k) }),
      },
      stats: { comparisons, swaps: moves },
      // Every frame has the second row (empty when nothing waits), so the bars never jump.
      buffer: {
        values: [...buffer],
        ...(bufferHighlights && { highlights: bufferHighlights }),
        ...(bufferPointers && { pointers: bufferPointers }),
      },
      ...(vacant.size > 0 && { vacant: [...vacant].sort((x, y) => x - y) }),
    }
  }

  yield frame({
    activeLine: MERGE_SORT_LINES.start,
    variables: BLANK,
    explanation: {
      explorer:
        n === 0
          ? 'There are no numbers here yet.'
          : n === 1
            ? 'Here is your number. Just one is already in order.'
            : 'Here are your numbers. Split them into piles, then put the piles back together in order.',
      engineer:
        n < 2
          ? `Merge sort on n = ${s(n)}: fewer than two elements, already sorted.`
          : `Merge sort, n = ${s(n)}: halve down to single elements, then merge back, smaller front first.`,
    },
  })

  function* sort(lo: number, hi: number, depth: number): Generator<Frame, void, undefined> {
    if (hi - lo < 2) return
    const mid = Math.floor((lo + hi) / 2)
    const span = (event: SpanStep['event']): SpanStep => ({ event, lo, mid, hi, depth })

    yield frame({
      activeLine: MERGE_SORT_LINES.split,
      span: span('split'),
      variables: { ...BLANK, 'lo..hi': part(lo, hi) },
      explanation: {
        explorer: `Split the pile of ${s(hi - lo)} into ${s(mid - lo)} and ${s(hi - mid)}.`,
        engineer: `merge_sort(a, ${s(lo)}, ${s(hi)}): mid = ${s(mid)}; sort a[${part(lo, mid)}) and a[${part(mid, hi)}) first.`,
      },
    })
    yield* sort(lo, mid, depth + 1)
    yield* sort(mid, hi, depth + 1)
    yield* merge(lo, mid, hi, span)
  }

  function* merge(
    lo: number,
    mid: number,
    hi: number,
    span: (event: SpanStep['event']) => SpanStep,
  ): Generator<Frame, void, undefined> {
    // Both halves move down into the buffer, on their own columns.
    for (let c = lo; c < hi; c++) {
      buffer[c] = a[c] ?? 0
      vacant.add(c)
    }
    const left = a.slice(lo, mid)
    const right = a.slice(mid, hi)
    let i = 0
    let j = 0
    const fronts = () => ({
      ...(i < left.length && { i: lo + i }),
      ...(j < right.length && { j: mid + j }),
    })

    for (let k = lo; k < hi; k++) {
      const row = { 'lo..hi': part(lo, hi), i, j, k }
      if (i < left.length && j < right.length) {
        const l = left[i] ?? 0
        const r = right[j] ?? 0
        const takeLeft = l <= r
        // Ask: which goes next?
        comparisons++
        yield frame({
          activeLine: MERGE_SORT_LINES.compare,
          span: span('compare'),
          pointers: { k },
          bufferPointers: fronts(),
          bufferHighlights: { comparing: [lo + i, mid + j] },
          decision: { kind: 'which-next', pair: [lo + i, mid + j] },
          variables: {
            ...row,
            'left[i]': l,
            'right[j]': r,
            'left<=right?': '?',
            take: '?',
            'smaller?': '?',
            next: '?',
          },
          explanation: {
            explorer: `Which goes next, ${s(l)} or ${s(r)}?`,
            engineer: `left[${s(i)}] = ${s(l)} <= right[${s(j)}] = ${s(r)}?`,
          },
        })
        // Answer: the smaller front moves up into place k (the left one when equal).
        const value = takeLeft ? l : r
        const from = takeLeft ? lo + i : mid + j
        a[k] = value
        buffer[from] = null
        vacant.delete(k)
        moves++
        if (takeLeft) i++
        else j++
        yield frame({
          activeLine: takeLeft ? MERGE_SORT_LINES.takeLeft : MERGE_SORT_LINES.takeRight,
          span: span('move'),
          pointers: { k },
          bufferPointers: fronts(),
          variables: {
            ...row,
            'left[i]': l,
            'right[j]': r,
            'left<=right?': takeLeft ? 'yes' : 'no',
            take: takeLeft ? 'left' : 'right',
            'smaller?': l === r ? 'same' : takeLeft ? 'left' : 'right',
            next: value,
          },
          explanation: {
            explorer:
              l === r
                ? `They’re both ${s(l)}: the left one goes first, so equal ones keep their order.`
                : `${s(value)} is smaller, so it goes up next.`,
            engineer: takeLeft
              ? `${s(l)} <= ${s(r)}: a[${s(k)}] = left[${s(i - 1)}] = ${s(l)}; i = ${s(i)}.`
              : `${s(l)} > ${s(r)}: a[${s(k)}] = right[${s(j - 1)}] = ${s(r)}; j = ${s(j)}.`,
          },
        })
      } else {
        // One half is empty: the other's next value moves up, no question.
        const fromLeft = i < left.length
        const value = (fromLeft ? left[i] : right[j]) ?? 0
        const from = fromLeft ? lo + i : mid + j
        a[k] = value
        buffer[from] = null
        vacant.delete(k)
        moves++
        if (fromLeft) i++
        else j++
        yield frame({
          activeLine: fromLeft ? MERGE_SORT_LINES.takeLeft : MERGE_SORT_LINES.takeRight,
          span: span('rest'),
          pointers: { k },
          bufferPointers: fronts(),
          // No comparison, so no trace row.
          variables: { ...BLANK, 'lo..hi': part(lo, hi) },
          explanation: {
            explorer: `The ${fromLeft ? 'right' : 'left'} pile is empty, so ${s(value)} goes up next, no question.`,
            engineer: fromLeft
              ? `right is used up: a[${s(k)}] = left[${s(i - 1)}] = ${s(value)}.`
              : `left is used up: a[${s(k)}] = right[${s(j - 1)}] = ${s(value)}.`,
          },
        })
      }
    }

    yield frame({
      activeLine: MERGE_SORT_LINES.merged,
      span: span('merged'),
      variables: { ...BLANK, 'lo..hi': part(lo, hi) },
      explanation: {
        explorer: `These ${s(hi - lo)} are back together, in order.`,
        engineer: `a[${part(lo, hi)}) merged: ${list(a.slice(lo, hi))}.`,
      },
    })
  }

  yield* sort(0, n, 0)

  final = true
  yield frame({
    activeLine: MERGE_SORT_LINES.done,
    variables: BLANK,
    explanation: {
      explorer:
        n === 0
          ? 'There was nothing to sort, so we’re done.'
          : n === 1
            ? 'With just one number, it’s already in order.'
            : 'All done! The numbers go from smallest to biggest.',
      engineer: `Return the sorted array after ${s(comparisons)} comparisons and ${s(moves)} moves.`,
    },
  })
}

const list = (values: readonly number[]) => `[${values.join(', ')}]`

/** The help ladder at "which goes next?": where to look, the rule, then this step's answer. */
function hints(ask: Frame): Readonly<Record<Level, Hints>> {
  const [i, j] = ask.decision?.pair ?? [0, 1]
  const l = ask.buffer?.values[i] ?? 0
  const r = ask.buffer?.values[j] ?? 0
  const left = ask.variables?.i
  const right = ask.variables?.j
  return {
    explorer: {
      nudge: `Look at the first one in each pile: ${s(l)} on the left, ${s(r)} on the right.`,
      concept:
        'The smaller one goes next. If they’re the same, the left one goes first, so equal ones keep their order.',
      showMe:
        l === r
          ? `They’re both ${s(l)}, so the left one goes next.`
          : `${s(Math.min(l, r))} is smaller, so the ${l < r ? 'left' : 'right'} one goes next.`,
    },
    engineer: {
      nudge: `Compare the fronts: left[${s(left)}] = ${s(l)} and right[${s(right)}] = ${s(r)}.`,
      concept:
        'Take left[i] if left[i] <= right[j], else right[j]; ties take the left, which keeps the sort stable.',
      showMe:
        l <= r
          ? `${s(l)} <= ${s(r)}: a[k] = left[${s(left)}] = ${s(l)}.`
          : `${s(l)} > ${s(r)}: a[k] = right[${s(right)}] = ${s(r)}.`,
    },
  }
}

/** The stage caption: the split or the merge in progress, then "all in order" at the end. */
function caption(frame: Frame, level: Level): string | null {
  const sorted = frame.highlights.sorted?.length ?? 0
  if (frame.array.length > 0 && sorted === frame.array.length) return 'all in order'
  const span = frame.span
  if (!span) return null
  const { lo, mid, hi } = span
  if (span.event === 'split') {
    return level === 'explorer'
      ? `split ${s(hi - lo)} into ${s(mid - lo)} + ${s(hi - mid)}`
      : `split [${part(lo, hi)}) at ${s(mid)}`
  }
  if (level === 'engineer') return `merge [${part(lo, mid)}) + [${part(mid, hi)})`
  return mid - lo === hi - mid
    ? `putting 2 piles of ${s(mid - lo)} back together`
    : `putting piles of ${s(mid - lo)} and ${s(hi - mid)} back together`
}

export const mergeSort: Algorithm = {
  id: 'merge-sort',
  name: 'Merge sort',
  explorerName: 'Split in half, then zip back together',
  category: 'sorting',
  countWord: { one: 'move', many: 'moves' },
  // Watch only for now; the Do it question ("which goes next?") is defined and checked.
  doIt: false,
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    space: 'O(n)',
  },
  bestFor: {
    engineer: 'large lists when a guaranteed O(n log n) and a stable sort matter; linked lists',
    explorer:
      'Big lists: it never slows down, whatever order the numbers start in. It needs room for a second row.',
  },
  idea: {
    explorer: {
      lead: 'Split the numbers into two piles, sort each pile, then put the two piles back together in order. Each pile gets sorted the same way: split, sort, put back together.',
      points: [
        {
          question: 'Why split in half?',
          answer:
            'Small piles are easy: a pile of one is already in order. Splitting again and again gets every pile down to one.',
        },
        {
          question: 'How do two piles go back together?',
          answer:
            'Each pile is in order, so its smallest is at the front. Compare the two fronts: the smaller one goes next. Repeat.',
        },
        {
          question: 'Why does it need the row below?',
          answer:
            'While two piles go back together, they wait in the row below, so the numbers have somewhere to come back to.',
        },
        {
          question: 'When do we stop?',
          answer: 'When the last two piles are back together: then the whole line is in order.',
        },
      ],
    },
    engineer: {
      lead: 'Divide and conquer: sort a[lo..mid) and a[mid..hi) recursively, then merge the two sorted halves in one linear pass, taking the smaller front each time.',
      points: [
        {
          question: 'Why O(n log n) in every case?',
          answer:
            'Halving gives log₂ n levels, and the merges on each level write n elements in total, whatever the input order.',
        },
        {
          question: 'Why O(n) extra space?',
          answer:
            'The merge copies the two halves out (left and right) and writes them back; it can’t merge in place in linear time.',
        },
        {
          question: 'Why is it stable?',
          answer:
            'Ties take left[i] (left[i] <= right[j]), so equal elements keep their original order.',
        },
        {
          question: 'Why no question when a half runs out?',
          answer:
            'The other half is already sorted, so the rest of it is copied back in order: no comparisons needed.',
        },
      ],
    },
  },
  source: { python: SOURCE },
  pointerLabels: {
    i: { engineer: 'i', explorer: 'left' },
    j: { engineer: 'j', explorer: 'right' },
    k: { engineer: 'k', explorer: 'next' },
  },
  // One row per comparison: the question adds it with "?", the answer fills it in.
  trace: {
    columns: [
      {
        variable: 'lo..hi',
        label: { engineer: 'lo..hi', explorer: 'part' },
        levels: ['engineer'],
      },
      { variable: 'i', label: { engineer: 'i', explorer: 'i' }, levels: ['engineer'] },
      { variable: 'j', label: { engineer: 'j', explorer: 'j' }, levels: ['engineer'] },
      { variable: 'k', label: { engineer: 'k', explorer: 'k' }, levels: ['engineer'] },
      { variable: 'left[i]', label: { engineer: 'left[i]', explorer: 'left one' } },
      { variable: 'right[j]', label: { engineer: 'right[j]', explorer: 'right one' } },
      {
        variable: 'left<=right?',
        label: { engineer: 'left <= right?', explorer: 'left <= right?' },
        levels: ['engineer'],
      },
      { variable: 'take', label: { engineer: 'take', explorer: 'take' }, levels: ['engineer'] },
      {
        variable: 'smaller?',
        label: { engineer: 'smaller?', explorer: 'smaller?' },
        levels: ['explorer'],
      },
      {
        variable: 'next',
        label: { engineer: 'goes next', explorer: 'goes next' },
        levels: ['explorer'],
      },
    ],
    rowKey: ['lo..hi', 'k'],
    rowDescription: { engineer: 'one row per comparison', explorer: 'one row per question' },
    // A new merge starts a new group of rows. The caption comes from the frame's span (the
    // part's name is a string, so no "merge 0..6" name is shown before it).
    group: {
      variable: 'lo..hi',
      name: { engineer: 'merge', explorer: 'merge' },
      note: caption,
    },
    dense: true,
  },
  hints,
  run,
}
