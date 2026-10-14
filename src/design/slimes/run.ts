/**
 * TEMPORARY (design/slimes, never merged): a full top-down merge sort, as the mockups see it.
 *
 * Every step lists the groups on stage: each group is a run of the array, [lo, hi), at
 * a depth of the recursion, holding the values it has right now (in order). A split replaces a
 * group with its two halves; a merge grows the parent group one value at a time, the smaller
 * front first (the left one when equal, so the sort is stable), while the two halves shrink.
 *
 * The same story is in merge sort's frames (#74): the parent being merged is the main row's
 * [lo, k), the two halves are the buffer row's [i, mid) and [j, hi). See the page's notes.
 */

export type Event = 'start' | 'split' | 'compare' | 'take' | 'rest' | 'merged' | 'finale'

export interface SlimeGroup {
  /** "lo-hi": the same run is the same group, whenever it's on stage. */
  readonly key: string
  readonly lo: number
  readonly hi: number
  readonly depth: number
  /** The values it holds now, in order (a merging parent grows, its halves shrink). */
  readonly values: readonly number[]
  /** A half being merged: how many values have already left it from the front. */
  readonly taken: number
}

export interface SortStep {
  readonly event: Event
  readonly groups: readonly SlimeGroup[]
  /** The split or merge in progress: [lo, mid, hi) at a depth. */
  readonly family: {
    readonly lo: number
    readonly mid: number
    readonly hi: number
    readonly depth: number
  } | null
  /** At a compare: the two fronts, left half's and right half's, and which one goes next. */
  readonly fronts: readonly [number, number] | null
  readonly answer: 'left' | 'right' | null
  /** The value that just moved into the parent (take, rest). */
  readonly moved: number | null
  /** Groups that just appeared out of another (a split's halves come out of their parent). */
  readonly bornFrom: Readonly<Record<string, string>>
  readonly sorted: boolean
  /** What happens, in plain words (for the page's step list; the scene needs no caption). */
  readonly says: string
}

export const START_VALUES = [5, 2, 8, 1, 9, 3] as const

const keyOf = (lo: number, hi: number) => `${String(lo)}-${String(hi)}`

/** Every step of a top-down merge sort of `values`. */
export function slimeRun(values: readonly number[] = START_VALUES): SortStep[] {
  const steps: SortStep[] = []
  const groups = new Map<string, SlimeGroup>()
  const put = (g: Omit<SlimeGroup, 'key'>) =>
    groups.set(keyOf(g.lo, g.hi), { ...g, key: keyOf(g.lo, g.hi) })
  const snapshot = (
    step: Omit<SortStep, 'groups' | 'bornFrom' | 'sorted'> &
      Partial<Pick<SortStep, 'bornFrom' | 'sorted'>>,
  ) =>
    steps.push({
      bornFrom: {},
      sorted: false,
      ...step,
      groups: [...groups.values()].sort((a, b) => a.lo - b.lo || a.depth - b.depth),
    })

  put({ lo: 0, hi: values.length, depth: 0, values: [...values], taken: 0 })
  snapshot({
    event: 'start',
    family: null,
    fronts: null,
    answer: null,
    moved: null,
    says: 'Everyone starts together in one group.',
  })

  function sort(lo: number, hi: number, depth: number): void {
    if (hi - lo <= 1) return
    const mid = Math.floor((lo + hi) / 2)
    const parent = groups.get(keyOf(lo, hi))
    if (!parent) return
    groups.delete(parent.key)
    put({ lo, hi: mid, depth: depth + 1, values: parent.values.slice(0, mid - lo), taken: 0 })
    put({ lo: mid, hi, depth: depth + 1, values: parent.values.slice(mid - lo), taken: 0 })
    snapshot({
      event: 'split',
      family: { lo, mid, hi, depth },
      fronts: null,
      answer: null,
      moved: null,
      bornFrom: { [keyOf(lo, mid)]: parent.key, [keyOf(mid, hi)]: parent.key },
      says: `A group of ${String(hi - lo)} splits into ${String(mid - lo)} and ${String(hi - mid)}.`,
    })
    sort(lo, mid, depth + 1)
    sort(mid, hi, depth + 1)
    merge(lo, mid, hi, depth)
  }

  function merge(lo: number, mid: number, hi: number, depth: number): void {
    const family = { lo, mid, hi, depth }
    put({ lo, hi, depth, values: [], taken: 0 })
    const left = () => groups.get(keyOf(lo, mid))
    const right = () => groups.get(keyOf(mid, hi))
    const target = () => groups.get(keyOf(lo, hi))
    const take = (side: 'left' | 'right', event: Event, says: string) => {
      const from = side === 'left' ? left() : right()
      const into = target()
      if (!from || !into) return
      const [value, ...rest] = from.values
      if (value === undefined) return
      groups.set(from.key, { ...from, values: rest, taken: from.taken + 1 })
      groups.set(into.key, { ...into, values: [...into.values, value] })
      snapshot({ event, family, fronts: null, answer: null, moved: value, says })
    }
    for (;;) {
      const a = left()?.values[0]
      const b = right()?.values[0]
      if (a === undefined || b === undefined) break
      const answer = b < a ? 'right' : 'left'
      snapshot({
        event: 'compare',
        family,
        fronts: [a, b],
        answer,
        moved: null,
        says: `Which goes next: ${String(a)} (left) or ${String(b)} (right)?`,
      })
      const smaller = answer === 'left' ? a : b
      take(answer, 'take', `${String(smaller)} is smaller, so it goes first.`)
    }
    for (const side of ['left', 'right'] as const) {
      for (;;) {
        const v = (side === 'left' ? left() : right())?.values[0]
        if (v === undefined) break
        take(side, 'rest', `The other side is empty, so ${String(v)} goes next, no question.`)
      }
    }
    groups.delete(keyOf(lo, mid))
    groups.delete(keyOf(mid, hi))
    snapshot({
      event: 'merged',
      family,
      fronts: null,
      answer: null,
      moved: null,
      says: `The two groups became one group of ${String(hi - lo)}, in order.`,
    })
  }

  sort(0, values.length, 0)
  snapshot({
    event: 'finale',
    family: null,
    fronts: null,
    answer: null,
    moved: null,
    sorted: true,
    says: 'All in order!',
  })
  return steps
}

/** How deep the splitting goes for n values (the tree's levels below the top). */
export const depthOf = (n: number) => Math.ceil(Math.log2(Math.max(1, n)))
