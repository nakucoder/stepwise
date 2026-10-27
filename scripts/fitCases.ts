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

/** Twelve numbers for a character that carries only 1 to 12 (the pizza cart): 1 to 12, mixed up. */
export const TWELVE_SMALL = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8] as const

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
  /**
   * Twelve numbers its character can draw, when it carries fewer than the bars' 0–99 (the pizza
   * cart: 1–12). The character's cases use them in place of TWELVE; bars keep TWELVE.
   */
  readonly characterNumbers?: readonly number[]
}

export const FIT_SORTS: readonly FitSort[] = [
  { path: 'sorting/bubble-sort', character: true, doIt: true },
  { path: 'sorting/selection-sort', character: true, doIt: true },
  { path: 'sorting/insertion-sort', character: true, doIt: true },
  { path: 'sorting/merge-sort', character: true, doIt: true },
  {
    path: 'sorting/quick-sort',
    character: true,
    doIt: true,
    pivots: ['first', 'last', 'middle', 'random'],
    characterNumbers: TWELVE_SMALL,
  },
  { path: 'sorting/heap-sort', character: false, doIt: false },
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
  /** Its own screen (the range notice's phones); absent: FIT_SCREEN. */
  readonly screen?: { readonly width: number; readonly height: number; readonly textScale: string }
  /** The stage must show the range notice (numbers the character can't carry): whole, 44px. */
  readonly notice?: boolean
}

export function fitCases(sorts: readonly FitSort[] = FIT_SORTS): FitCase[] {
  return sorts.flatMap(({ path, character, doIt, pivots = [], characterNumbers = TWELVE }) => [
    ...(doIt ? (['watch', 'do'] as const) : (['watch'] as const)).flatMap((mode) =>
      (character ? (['bars', 'character'] as const) : (['bars'] as const)).flatMap((look) =>
        (['explorer', 'engineer'] as const).flatMap((level) =>
          [null, look === 'character' ? characterNumbers : TWELVE].map((numbers) => ({
            path,
            mode,
            look,
            level,
            numbers,
          })),
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
export function fitName({
  path,
  mode,
  look,
  level,
  numbers,
  pivot,
  screen,
  notice,
}: FitCase): string {
  const where = screen
    ? ` ${String(screen.width)}x${String(screen.height)} ${screen.textScale}`
    : ''
  return `${path.split('/')[1] ?? path} ${mode} ${look} ${level} ${numbers ? String(numbers.length) : 'default'}${pivot ? ` pivot=${pivot}` : ''}${notice ? ' notice' : ''}${where}`
}

/**
 * The stage's message when numbers a character can't carry meet it ("The pizza cart carries 1 to
 * 12 boxes." and "Use 1–12, same order"): each sort whose character has a range, in Do it with
 * that look and TWELVE (88 is too many boxes), both levels, on a phone upright, on its side and
 * on its side with larger text, with the hint open. The message and its button must be whole and
 * the button 44px tall, besides everything fitCases checks (the bars keep their numbers).
 */
export const NOTICE_SCREENS = [
  { width: 390, height: 844, textScale: '100%' },
  { width: 844, height: 390, textScale: '100%' },
  { width: FIT_SCREEN.width, height: FIT_SCREEN.height, textScale: FIT_SCREEN.textScale },
] as const

export function noticeCases(sorts: readonly FitSort[] = FIT_SORTS): FitCase[] {
  return sorts
    .filter((sort) => sort.character && sort.doIt && sort.characterNumbers)
    .flatMap(({ path }) =>
      NOTICE_SCREENS.flatMap((screen) =>
        (['explorer', 'engineer'] as const).map((level): FitCase => ({
          path,
          mode: 'do',
          look: 'character',
          level,
          numbers: TWELVE,
          screen,
          notice: true,
        })),
      ),
    )
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

/**
 * The pizza cart's boxes on phones (src/characters/pizzaCart): one size through a Do it run with
 * a wrong answer and Help, the answers and the hint's buttons whole on screen, and in Watch the
 * strip over an open sheet keeping boxes of at least `minBox` px (8: PIZZA on them). Played on
 * the 1-12 list, whose first question (7 or the leader, 8?) goes left: the wrong answer is the
 * right side (Explorer) or Keep order (Engineer).
 */
export const BOX_PATH = 'sorting/quick-sort'

export const BOX_SCREENS = [
  { width: 390, height: 844, textScale: '100%', minBox: 8 },
  { width: 844, height: 390, textScale: '100%', minBox: 6 },
  { width: 740, height: 300, textScale: '130%', minBox: 2 },
] as const

export interface BoxCase {
  readonly screen: (typeof BOX_SCREENS)[number]
  readonly level: 'explorer' | 'engineer'
  readonly mode: FitMode
  /** The wrong answer to the first question, as its button starts. */
  readonly wrong: string
}

export function boxCases(): BoxCase[] {
  return BOX_SCREENS.flatMap((screen) =>
    (['explorer', 'engineer'] as const).flatMap((level) =>
      (['watch', 'do'] as const).map((mode) => ({
        screen,
        level,
        mode,
        wrong: level === 'explorer' ? 'Right side' : 'Keep order',
      })),
    ),
  )
}

/** The page for a box case, under `base` (no trailing slash). */
export function boxUrl(base: string, { mode }: BoxCase): string {
  return `${base}/${BOX_PATH}?numbers=${TWELVE_SMALL.join(',')}${mode === 'do' ? '&mode=do' : ''}`
}

/** A short name for a box case, for the report. */
export function boxName({ screen, level, mode }: BoxCase): string {
  return `cart boxes ${String(screen.width)}x${String(screen.height)} ${screen.textScale} ${mode} ${level}`
}

/**
 * The same message on laptops, where the page scrolls: Do it's Start moves to the answers below
 * the fold, and the message must stay on screen while any bars are (noticeProbe.ts). Laptop
 * screens as a browser leaves them, and a small one, at both levels.
 */
export const NOTICE_DESKTOPS = [
  { width: 1366, height: 650 },
  { width: 1280, height: 620 },
  { width: 1024, height: 768 },
] as const

export interface DesktopNoticeCase {
  readonly path: string
  readonly screen: (typeof NOTICE_DESKTOPS)[number]
  readonly level: 'explorer' | 'engineer'
}

export function desktopNoticeCases(sorts: readonly FitSort[] = FIT_SORTS): DesktopNoticeCase[] {
  return sorts
    .filter((sort) => sort.character && sort.doIt && sort.characterNumbers)
    .flatMap(({ path }) =>
      NOTICE_DESKTOPS.flatMap((screen) =>
        (['explorer', 'engineer'] as const).map((level) => ({ path, screen, level })),
      ),
    )
}

/** The page for a desktop notice case: Do it with TWELVE (88 is too many boxes). */
export function desktopNoticeUrl(base: string, { path }: DesktopNoticeCase): string {
  return `${base}/${path}?mode=do&numbers=${TWELVE.join(',')}`
}

/** A short name for a desktop notice case, for the report. */
export function desktopNoticeName({ path, screen, level }: DesktopNoticeCase): string {
  return `${path.split('/')[1] ?? path} notice ${String(screen.width)}x${String(screen.height)} ${level}`
}

/**
 * The pizza cart's boxes on a phone on its side keep one size whatever the numbers, the step or a
 * sheet (sameSizeProbe.ts): the flow from a phone test (PR #102), 1 7 9 11 9 3, then a 2 added
 * from the Numbers sheet, in Watch and Do it, both levels.
 */
export const SAME_SIZE_NUMBERS = [1, 7, 9, 11, 9, 3] as const
export const SAME_SIZE_ADD = 2

export const SAME_SIZE_SCREENS = [
  { width: 844, height: 390, textScale: '100%' },
  { width: 915, height: 340, textScale: '100%' },
  { width: 740, height: 300, textScale: '130%' },
] as const

export interface SameSizeCase {
  readonly screen: (typeof SAME_SIZE_SCREENS)[number]
  readonly level: 'explorer' | 'engineer'
  readonly mode: FitMode
}

export function sameSizeCases(): SameSizeCase[] {
  return SAME_SIZE_SCREENS.flatMap((screen) =>
    (['explorer', 'engineer'] as const).flatMap((level) =>
      (['watch', 'do'] as const).map((mode) => ({ screen, level, mode })),
    ),
  )
}

/** The page for a same-size case, under `base` (no trailing slash). */
export function sameSizeUrl(base: string, { mode }: SameSizeCase): string {
  return `${base}/${BOX_PATH}?numbers=${SAME_SIZE_NUMBERS.join(',')}${mode === 'do' ? '&mode=do' : ''}`
}

/** A short name for a same-size case, for the report. */
export function sameSizeName({ screen, level, mode }: SameSizeCase): string {
  return `cart same size ${String(screen.width)}x${String(screen.height)} ${screen.textScale} ${mode} ${level}`
}

/**
 * Heap sort's tree (treeProbe.ts): Watch at every step, both levels, the default numbers and
 * TWELVE (four rows). Over the bars on a desktop and an upright phone; in "The tree" sheet on an
 * upright phone with larger text and on a phone on its side, with larger text on the short one. The tree must be whole, keep one height
 * through the run, and its numbers fit their circles; the bars stay on screen and, where a sheet
 * leaves them room (barNumbers), keep their numbers too.
 */
export const TREE_PATH = 'sorting/heap-sort'

export const TREE_SCREENS = [
  { width: 1440, height: 900, textScale: '100%', mobile: false, place: 'stage', barNumbers: true },
  { width: 390, height: 844, textScale: '100%', mobile: true, place: 'stage', barNumbers: true },
  // Larger text on an upright phone: the tree doesn't fit over the bars, so it has its sheet.
  { width: 390, height: 844, textScale: '130%', mobile: true, place: 'sheet', barNumbers: true },
  { width: 844, height: 390, textScale: '100%', mobile: true, place: 'sheet', barNumbers: true },
  // Here any sheet beside the stage leaves the bars too little room for their numbers (every
  // sort's, as before the tree): the bars stay on screen, and their numbers are checked with the
  // sheet closed (fitCases).
  {
    width: FIT_SCREEN.width,
    height: FIT_SCREEN.height,
    textScale: FIT_SCREEN.textScale,
    mobile: true,
    place: 'sheet',
    barNumbers: false,
  },
] as const

export interface TreeCase {
  readonly screen: (typeof TREE_SCREENS)[number]
  readonly level: 'explorer' | 'engineer'
  /** null: the default numbers. */
  readonly numbers: readonly number[] | null
}

export function treeCases(): TreeCase[] {
  return TREE_SCREENS.flatMap((screen) =>
    (['explorer', 'engineer'] as const).flatMap((level) =>
      [null, TWELVE].map((numbers) => ({ screen, level, numbers })),
    ),
  )
}

/** The page for a tree case, under `base` (no trailing slash). */
export function treeUrl(base: string, { numbers }: TreeCase): string {
  return `${base}/${TREE_PATH}${numbers ? `?numbers=${numbers.join(',')}` : ''}`
}

/** A short name for a tree case, for the report. */
export function treeName({ screen, level, numbers }: TreeCase): string {
  return `heap tree ${String(screen.width)}x${String(screen.height)} ${screen.textScale} ${level} ${numbers ? String(numbers.length) : 'default'}`
}
