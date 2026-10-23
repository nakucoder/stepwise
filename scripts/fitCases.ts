/**
 * What `npm run check:fit` plays: every sort on a short landscape phone with larger text (740x300
 * at 130%, the size the ROADMAP's text-size checks use), in Watch at every step and in Do it with
 * the hint open. Each look the sort can show, both levels, and 6 or 12 numbers.
 * `src/fitCases.test.ts` keeps this list in step with the algorithms, whether they have Do it,
 * and the characters that are drawn.
 */

export const FIT_SCREEN = { width: 740, height: 300, textScale: '130%' } as const

/** The most numbers a learner can enter, so the columns are as narrow as they get. */
export const TWELVE = [42, 7, 19, 88, 3, 64, 25, 51, 13, 76, 30, 9] as const

export interface FitSort {
  /** "category/algorithm-id", as in the URL. */
  readonly path: string
  /** Whether its character is drawn (then it is checked as bars and as the character). */
  readonly character: boolean
  /** Whether it has Do it (then Do it is played too, after Watch). */
  readonly doIt: boolean
  /**
   * The pivot rules it offers (quick sort): Do it is also played with 12 numbers and each rule,
   * at both levels, checking the rule's choices in the Numbers sheet first.
   */
  readonly pivots?: readonly string[]
}

export const FIT_SORTS: readonly FitSort[] = [
  { path: 'sorting/bubble-sort', character: true, doIt: true },
  { path: 'sorting/selection-sort', character: true, doIt: true },
  { path: 'sorting/insertion-sort', character: true, doIt: true },
  { path: 'sorting/merge-sort', character: true, doIt: true },
  {
    path: 'sorting/quick-sort',
    character: false,
    doIt: true,
    pivots: ['first', 'last', 'middle', 'random'],
  },
]

/** Watch steps through the whole run; Do it starts and opens the hint. */
export type FitMode = 'watch' | 'do'

export interface FitCase {
  readonly path: string
  readonly mode: FitMode
  readonly look: 'bars' | 'character'
  readonly level: 'explorer' | 'engineer'
  /** null: the default numbers. */
  readonly numbers: readonly number[] | null
  /** A pivot rule in the address (?pivot=), whose choices are checked before the run. */
  readonly pivot?: string
}

export function fitCases(sorts: readonly FitSort[] = FIT_SORTS): FitCase[] {
  return sorts.flatMap(({ path, character, doIt, pivots = [] }) => [
    ...(doIt ? (['watch', 'do'] as const) : (['watch'] as const)).flatMap((mode) =>
      (character ? (['bars', 'character'] as const) : (['bars'] as const)).flatMap((look) =>
        (['explorer', 'engineer'] as const).flatMap((level) =>
          [null, TWELVE].map((numbers) => ({ path, mode, look, level, numbers })),
        ),
      ),
    ),
    ...pivots.flatMap((pivot) =>
      (['explorer', 'engineer'] as const).map((level): FitCase => ({
        path,
        mode: 'do',
        look: 'bars',
        level,
        numbers: TWELVE,
        pivot,
      })),
    ),
  ])
}

/** The page for a case, under `base` (no trailing slash). */
export function fitUrl(base: string, { path, mode, numbers, pivot }: FitCase): string {
  const query = [
    mode === 'do' && 'mode=do',
    numbers && `numbers=${numbers.join(',')}`,
    pivot && `pivot=${pivot}`,
  ].filter(Boolean)
  return `${base}/${path}${query.length > 0 ? `?${query.join('&')}` : ''}`
}

/** A short name for a case, for the report. */
export function fitName({ path, mode, look, level, numbers, pivot }: FitCase): string {
  return `${path.split('/')[1] ?? path} ${mode} ${look} ${level} ${numbers ? String(numbers.length) : 'default'}${pivot ? ` pivot=${pivot}` : ''}`
}

/**
 * "The idea" must fit beside the bars on a desktop (CLAUDE.md, rule 4): checked at 1440x900 for
 * every sort, both levels, Watch (at step 1) and Do it (opened from the band).
 */
export const IDEA_SORTS: readonly string[] = FIT_SORTS.map((sort) => sort.path)

export const IDEA_SCREEN = { width: 1440, height: 900 } as const

export interface IdeaCase {
  readonly path: string
  readonly mode: FitMode
  readonly level: 'explorer' | 'engineer'
}

export function ideaCases(paths: readonly string[] = IDEA_SORTS): IdeaCase[] {
  return paths.flatMap((path) =>
    (['explorer', 'engineer'] as const).flatMap((level) =>
      (['watch', 'do'] as const).map((mode) => ({ path, mode, level })),
    ),
  )
}

/** The page for an idea case, under `base` (no trailing slash). */
export function ideaUrl(base: string, { path, mode }: IdeaCase): string {
  return `${base}/${path}${mode === 'do' ? '?mode=do' : ''}`
}
