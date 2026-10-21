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
}

export const FIT_SORTS: readonly FitSort[] = [
  { path: 'sorting/bubble-sort', character: true, doIt: true },
  { path: 'sorting/selection-sort', character: true, doIt: true },
  { path: 'sorting/insertion-sort', character: true, doIt: true },
  { path: 'sorting/merge-sort', character: true, doIt: true },
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
}

export function fitCases(sorts: readonly FitSort[] = FIT_SORTS): FitCase[] {
  return sorts.flatMap(({ path, character, doIt }) =>
    (doIt ? (['watch', 'do'] as const) : (['watch'] as const)).flatMap((mode) =>
      (character ? (['bars', 'character'] as const) : (['bars'] as const)).flatMap((look) =>
        (['explorer', 'engineer'] as const).flatMap((level) =>
          [null, TWELVE].map((numbers) => ({ path, mode, look, level, numbers })),
        ),
      ),
    ),
  )
}

/** The page for a case, under `base` (no trailing slash). */
export function fitUrl(base: string, { path, mode, numbers }: FitCase): string {
  const query = [mode === 'do' && 'mode=do', numbers && `numbers=${numbers.join(',')}`].filter(
    Boolean,
  )
  return `${base}/${path}${query.length > 0 ? `?${query.join('&')}` : ''}`
}

/** A short name for a case, for the report. */
export function fitName({ path, mode, look, level, numbers }: FitCase): string {
  return `${path.split('/')[1] ?? path} ${mode} ${look} ${level} ${numbers ? String(numbers.length) : 'default'}`
}
