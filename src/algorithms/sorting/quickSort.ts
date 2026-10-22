import type {
  Algorithm,
  Frame,
  Hints,
  Level,
  PartitionStep,
  PendingRange,
  PivotRule,
  RunOptions,
  TraceValue,
} from '../../engine/types'

/**
 * Quick sort with Lomuto's partition: choose a pivot in `[lo, hi)`, swap it to the end, then walk
 * the rest left to right. Every value <= pivot joins the left zone (swapped to the wall, which
 * moves one place right); a bigger one stays where it is. Finally the pivot swaps to the wall,
 * its final place, and both sides are sorted the same way. Equal values go left.
 *
 * Every frame of a range carries `partition` (lo, hi, depth, where the pivot is, the wall, the
 * next value to check, and what happens), and `pending`, the ranges waiting their turn (the
 * calls still to come, the next one first). A range of one value gets one "already in place"
 * frame; an empty one gets none.
 *
 * The pivot rule is a run option: `last` by default; `first`, `middle` and `random` choose
 * another value, which then swaps to the end in a frame of its own. `random` is seeded by the
 * input and the range (`randomPivot`), so every run of the same numbers is the same.
 *
 * Frames follow the ask-then-answer rhythm (CLAUDE.md, rule 3): each comparison asks "is this
 * one <= the pivot?" and the next frame answers, left or right. They set no `decision` yet: the
 * left-or-right kind comes with Do it.
 */

const SOURCE = `def quick_sort(a, lo=0, hi=None):
    if hi is None:
        hi = len(a)
    if hi - lo < 2:
        return a
    p = choose_pivot(a, lo, hi)
    a[p], a[hi - 1] = a[hi - 1], a[p]
    pivot = a[hi - 1]
    i = lo
    for j in range(lo, hi - 1):
        if a[j] <= pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi - 1] = a[hi - 1], a[i]
    quick_sort(a, lo, i)
    quick_sort(a, i + 1, hi)
    return a`

/** Lines of SOURCE that frames point at. */
export const QUICK_SORT_LINES = {
  start: 1,
  one: 5,
  choose: 6,
  toEnd: 7,
  compare: 11,
  left: 12,
  right: 10,
  place: 14,
  done: 17,
} as const

/** Quick sort's pivot rule when none is given (Watch). */
export const DEFAULT_PIVOT: PivotRule = 'last'

/**
 * The seeded "random" pivot of `[lo, hi)`: lo + hash(input, lo, hi) % (hi - lo), with a 32-bit
 * FNV-1a hash. Pure, so stepping back, jumping and tests always see the same run.
 */
export function randomPivot(input: readonly number[], lo: number, hi: number): number {
  let hash = 0x811c9dc5
  for (const value of [...input, lo, hi]) {
    hash ^= value & 0xff
    hash = Math.imul(hash, 0x01000193)
    hash ^= (value >>> 8) & 0xff
    hash = Math.imul(hash, 0x01000193)
  }
  return lo + ((hash >>> 0) % (hi - lo))
}

/** Where the pivot of `[lo, hi)` starts, by the rule. */
export function choosePivot(
  rule: PivotRule,
  input: readonly number[],
  lo: number,
  hi: number,
): number {
  switch (rule) {
    case 'first':
      return lo
    case 'last':
      return hi - 1
    case 'middle':
      return Math.floor((lo + hi - 1) / 2)
    case 'random':
      return randomPivot(input, lo, hi)
  }
}

type Variables = Readonly<
  Record<'lo..hi' | 'pivot' | 'i' | 'j' | 'a[j]' | '<=pivot?' | 'side', TraceValue>
>

const BLANK: Variables = {
  'lo..hi': null,
  pivot: null,
  i: null,
  j: null,
  'a[j]': null,
  '<=pivot?': null,
  side: null,
}

const s = String
const part = (lo: number, hi: number) => `${s(lo)}..${s(hi)}`
const numbers = (count: number) => (count === 1 ? '1 number' : `${s(count)} numbers`)

/** How the rule's pivot is named in the words: "the last one", or by its value. */
const RULE_WORDS: Readonly<Record<PivotRule, Readonly<Record<Level, string>>>> = {
  first: { explorer: 'The first one', engineer: 'first' },
  last: { explorer: 'The last one', engineer: 'last' },
  middle: { explorer: 'The middle one', engineer: 'middle' },
  random: { explorer: 'A surprise pick', engineer: 'seeded random' },
}

function* run(input: readonly number[], options?: RunOptions): Generator<Frame, void, undefined> {
  const rule = options?.pivot ?? DEFAULT_PIVOT
  const a = [...input]
  const n = a.length
  let comparisons = 0
  let swaps = 0
  // Values in their final place. Never shrinks.
  const sorted = new Set<number>()
  // The ranges still to sort, the next one last (a stack); frames list the next one first.
  const waiting: PendingRange[] = []

  const frame = (
    fields: Omit<Frame, 'array' | 'stats' | 'highlights' | 'pending'> & {
      highlights?: Frame['highlights']
    },
  ): Frame => ({
    ...fields,
    array: [...a],
    highlights: {
      ...fields.highlights,
      ...(sorted.size > 0 && { sorted: [...sorted].sort((x, y) => x - y) }),
    },
    stats: { comparisons, swaps },
    pending: [...waiting].reverse(),
  })
  const value = (k: number) => a[k] ?? 0
  const swap = (x: number, y: number) => {
    ;[a[x], a[y]] = [value(y), value(x)]
    swaps++
  }

  yield frame({
    activeLine: QUICK_SORT_LINES.start,
    variables: BLANK,
    explanation: {
      explorer:
        n === 0
          ? 'There are no numbers here yet.'
          : n === 1
            ? 'Here is your number. Just one is already in order.'
            : 'Here are your numbers. Pick a leader, put the smaller ones on its left and the bigger ones on its right, then do the same with each side.',
      engineer:
        n < 2
          ? `Quick sort on n = ${s(n)}: fewer than two elements, already sorted.`
          : `Quick sort (Lomuto), n = ${s(n)}, pivot: ${RULE_WORDS[rule].engineer} element of each range. Partition around the pivot, then recurse on both sides.`,
    },
  })

  function* sort(lo: number, hi: number, depth: number): Generator<Frame, void, undefined> {
    if (hi - lo < 1) return
    const at = (
      event: PartitionStep['event'],
      pivot: number,
      wall: number,
      next: number,
    ): PartitionStep => ({ event, lo, hi, depth, pivot, wall, next })
    const range = { ...BLANK, 'lo..hi': part(lo, hi) }

    if (hi - lo === 1) {
      sorted.add(lo)
      yield frame({
        activeLine: QUICK_SORT_LINES.one,
        partition: at('done', lo, lo, lo),
        variables: range,
        explanation: {
          explorer: `Just ${s(value(lo))} here: one number on its own is already in place.`,
          engineer: `quick_sort(a, ${s(lo)}, ${s(hi)}): one element, a[${s(lo)}] = ${s(value(lo))} is already in place.`,
        },
      })
      return
    }

    const end = hi - 1
    const p = choosePivot(rule, input, lo, hi)
    yield frame({
      activeLine: QUICK_SORT_LINES.choose,
      partition: at('range', p, lo, lo),
      highlights: { pivot: [p] },
      variables: { ...range, pivot: value(p) },
      explanation: {
        explorer: `Look at these ${numbers(hi - lo)}. ${RULE_WORDS[rule].explorer}, ${s(value(p))}, is the leader.`,
        engineer: `quick_sort(a, ${s(lo)}, ${s(hi)}): pivot = a[${s(p)}] = ${s(value(p))} (${RULE_WORDS[rule].engineer}).`,
      },
    })

    if (p !== end) {
      // The pivot swaps to the end of the range, out of the way.
      swap(p, end)
      yield frame({
        activeLine: QUICK_SORT_LINES.toEnd,
        partition: at('pick', end, lo, lo),
        highlights: { swapping: [p, end] },
        variables: { ...range, pivot: value(end) },
        explanation: {
          explorer: `Move the leader, ${s(value(end))}, to the end, out of the way: it trades places with ${s(value(p))}.`,
          engineer: `Swap the pivot to the end: a[${s(p)}] ↔ a[${s(end)}]; pivot = a[${s(end)}] = ${s(value(end))}.`,
        },
      })
    }

    const pivot = value(end)
    let i = lo
    for (let j = lo; j < end; j++) {
      const v = value(j)
      const row = { ...range, pivot, j, 'a[j]': v }
      // Ask: is a[j] <= pivot?
      comparisons++
      yield frame({
        activeLine: QUICK_SORT_LINES.compare,
        partition: at('compare', end, i, j),
        highlights: { comparing: [j], pivot: [end] },
        pointers: { i, j },
        variables: { ...row, i, '<=pivot?': '?', side: '?' },
        explanation: {
          explorer: `Is ${s(v)} smaller than the leader, ${s(pivot)}, or the same?`,
          engineer: `a[${s(j)}] = ${s(v)} <= pivot ${s(pivot)}?`,
        },
      })

      // Answer: left (swapped to the wall, which moves right) or right (it stays).
      if (v <= pivot) {
        const moved = i !== j
        const bigger = value(i)
        if (moved) swap(i, j)
        const wall = i
        i++
        yield frame({
          activeLine: QUICK_SORT_LINES.left,
          partition: at('left', end, i, j + 1),
          highlights: moved ? { swapping: [wall, j], pivot: [end] } : { pivot: [end] },
          pointers: { i, j },
          variables: { ...row, i, '<=pivot?': 'yes', side: 'left' },
          explanation: {
            explorer: moved
              ? `Yes: ${s(v)} goes on the left side. It trades places with ${s(bigger)}, the first bigger one.`
              : v === pivot
                ? `It’s the same as the leader, so ${s(v)} goes on the left side. It’s already there.`
                : `Yes: ${s(v)} goes on the left side. It’s already there.`,
            engineer: moved
              ? `${s(v)} <= ${s(pivot)}: swap a[${s(wall)}] ↔ a[${s(j)}]; i = ${s(i)}.`
              : `${s(v)} <= ${s(pivot)}: i == j, so nothing moves; i = ${s(i)}.`,
          },
        })
      } else {
        yield frame({
          activeLine: QUICK_SORT_LINES.right,
          partition: at('right', end, i, j + 1),
          highlights: { comparing: [j], pivot: [end] },
          pointers: { i, j },
          variables: { ...row, i, '<=pivot?': 'no', side: 'right' },
          explanation: {
            explorer: `No: ${s(v)} is bigger, so it stays on the right side.`,
            engineer: `${s(v)} > ${s(pivot)}: a[${s(j)}] stays in the bigger zone; i = ${s(i)}.`,
          },
        })
      }
    }

    // The pivot swaps to the wall: its final place.
    const displaced = value(i)
    const placed = i !== end
    if (placed) swap(i, end)
    sorted.add(i)
    // The right side waits while the left side is sorted.
    const right: PendingRange = [i + 1, hi]
    const leftSize = i - lo
    const rightSize = hi - i - 1
    yield frame({
      activeLine: QUICK_SORT_LINES.place,
      partition: at('place', i, i, end),
      highlights: placed ? { swapping: [i, end] } : { pivot: [i] },
      pointers: { i },
      variables: { ...range, pivot, i },
      explanation: {
        explorer: placed
          ? `The leader, ${s(pivot)}, trades places with ${s(displaced)} and lands in its final spot: ${sides(leftSize, rightSize)}`
          : `The leader, ${s(pivot)}, is already in its final spot: ${sides(leftSize, rightSize)}`,
        engineer: placed
          ? `Swap the pivot into place: a[${s(i)}] ↔ a[${s(end)}]. a[${s(i)}] = ${s(pivot)} is final; next a[${part(lo, i)}) and a[${part(i + 1, hi)}).`
          : `i == hi - 1: the pivot a[${s(i)}] = ${s(pivot)} is already final; next a[${part(lo, i)}) and a[${part(i + 1, hi)}).`,
      },
    })

    if (rightSize > 0) waiting.push(right)
    yield* sort(lo, i, depth + 1)
    if (rightSize > 0) waiting.pop()
    yield* sort(i + 1, hi, depth + 1)
  }

  yield* sort(0, n, 0)

  yield frame({
    activeLine: QUICK_SORT_LINES.done,
    variables: BLANK,
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

/** After the leader lands: what is left on each side, in plain words. */
function sides(left: number, right: number): string {
  if (left === 0 && right === 0) return 'nothing else to sort here.'
  if (left === 0) return `nothing is smaller, and ${numbers(right)} on its right still to sort.`
  if (right === 0) return `nothing is bigger, and ${numbers(left)} on its left still to sort.`
  return `${numbers(left)} on its left and ${numbers(right)} on its right, still to sort.`
}

/** The help ladder at "is this one <= the pivot?": where to look, the rule, then the answer. */
function hints(ask: Frame): Readonly<Record<Level, Hints>> {
  const v = Number(ask.variables?.['a[j]'] ?? 0)
  const pivot = Number(ask.variables?.pivot ?? 0)
  const j = ask.variables?.j
  const left = v <= pivot
  return {
    explorer: {
      nudge: `Look at ${s(v)} and the leader, ${s(pivot)}.`,
      concept:
        'Smaller than the leader, or the same: it goes on the left side. Bigger: it stays on the right side.',
      showMe: left
        ? `${s(v)} is ${v === pivot ? 'the same as' : 'smaller than'} ${s(pivot)}, so it goes on the left side.`
        : `${s(v)} is bigger than ${s(pivot)}, so it stays on the right side.`,
    },
    engineer: {
      nudge: `Compare a[${s(j)}] = ${s(v)} with the pivot, ${s(pivot)}.`,
      concept:
        'If a[j] <= pivot, swap a[i] ↔ a[j] and i += 1; otherwise a[j] stays in the bigger zone.',
      showMe: left
        ? `${s(v)} <= ${s(pivot)}: swap a[i] ↔ a[${s(j)}], i += 1.`
        : `${s(v)} > ${s(pivot)}: a[${s(j)}] stays; i is unchanged.`,
    },
  }
}

/**
 * The stage caption: the range being worked on (Engineer: the call and its depth), then "all in
 * order" at the end.
 */
function caption(frame: Frame, level: Level): string | null {
  const sortedCount = frame.highlights.sorted?.length ?? 0
  if (frame.array.length > 0 && sortedCount === frame.array.length) return 'all in order'
  const partition = frame.partition
  if (!partition) return null
  const { lo, hi, depth } = partition
  return level === 'explorer'
    ? `working on ${numbers(hi - lo)}`
    : `quick_sort(a, ${s(lo)}, ${s(hi)}), depth ${s(depth)}`
}

export const quickSort: Algorithm = {
  id: 'quick-sort',
  name: 'Quick sort',
  explorerName: 'Pick a leader and split around it',
  category: 'sorting',
  complexity: {
    time: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    space: 'O(log n)',
  },
  bestFor: {
    engineer: 'large lists in memory when average speed matters more than a guarantee or stability',
    explorer:
      'Big lists, fast most of the time, with no second row. A leader that is always the biggest or smallest makes it slow.',
  },
  idea: {
    explorer: {
      lead: 'Pick one number as the leader. Every smaller one goes on its left, every bigger one on its right, and the leader lands in its final spot. Then each side does the same, with a leader of its own.',
      points: [
        {
          question: 'Why a leader?',
          answer:
            'Once the smaller ones are on its left and the bigger ones on its right, the leader is exactly where it belongs, and it never moves again.',
        },
        {
          question: 'Why does the leader wait at the end?',
          answer:
            'Out of the way, it doesn’t get mixed up with the others while we check them, one by one from the left.',
        },
        {
          question: 'Where does a number the same as the leader go?',
          answer:
            'On the left side, with the smaller ones. Either side would work; we always pick the left.',
        },
        {
          question: 'Why can it be slow?',
          answer:
            'If the leader is the biggest or the smallest, one side gets everything and the other gets nothing. Numbers already in order do that when the last one leads.',
        },
        {
          question: 'When do we stop?',
          answer:
            'When every group is down to one number or none: then every number is in its final spot.',
        },
      ],
    },
    engineer: {
      lead: 'Divide and conquer, in place: partition a[lo..hi) around a pivot so that a[lo..p) <= pivot < a[p+1..hi), with the pivot at its final index p, then recurse on both sides.',
      points: [
        {
          question: 'Why O(n log n) on average, O(n²) at worst?',
          answer:
            'Each level of partitions does O(n) comparisons. Balanced splits give log₂ n levels; a pivot that is always the minimum or maximum gives n levels (sorted input with a last-element pivot).',
        },
        {
          question: 'Why Lomuto and not Hoare?',
          answer:
            'Lomuto keeps one invariant (<= pivot | > pivot | unchecked) and places the pivot each pass, so it is easy to trace. Hoare’s two inward scans make about three times fewer swaps on average, but leave the pivot’s final index undecided.',
        },
        {
          question: 'Why does a[j] <= pivot go left?',
          answer:
            'Any fixed choice is correct. With <=, equal keys pile up on the left; with many duplicates either way degrades toward O(n²) (three-way partitioning fixes that).',
        },
        {
          question: 'Why O(log n) space, and is it stable?',
          answer:
            'It sorts in place; the extra space is the recursion stack, O(log n) on average (recursing on the smaller side first keeps it O(log n) at worst). Long-range swaps make it unstable.',
        },
      ],
    },
  },
  source: { python: SOURCE },
  pointerLabels: {
    i: { engineer: 'i', explorer: 'next spot' },
    j: { engineer: 'j', explorer: 'checking' },
  },
  // On a phone's narrow columns (Stage.css).
  pointerShortLabels: { i: 'spot', j: 'check' },
  // One row per comparison: the question adds it with "?", the answer fills in the side.
  trace: {
    columns: [
      {
        variable: 'lo..hi',
        label: { engineer: 'lo..hi', explorer: 'group' },
        levels: ['engineer'],
      },
      { variable: 'pivot', label: { engineer: 'pivot', explorer: 'leader' } },
      { variable: 'i', label: { engineer: 'i', explorer: 'i' }, levels: ['engineer'] },
      { variable: 'j', label: { engineer: 'j', explorer: 'j' }, levels: ['engineer'] },
      { variable: 'a[j]', label: { engineer: 'a[j]', explorer: 'number' } },
      {
        variable: '<=pivot?',
        label: { engineer: 'a[j] <= pivot?', explorer: 'smaller or same?' },
      },
      { variable: 'side', label: { engineer: 'side', explorer: 'side' } },
    ],
    rowKey: ['lo..hi', 'j'],
    rowDescription: { engineer: 'one row per comparison', explorer: 'one row per question' },
    // A new range starts a new group of rows; the caption comes from the frame's partition.
    group: {
      variable: 'lo..hi',
      name: { engineer: 'range', explorer: 'group' },
      note: caption,
    },
    dense: true,
  },
  hints,
  run,
}
