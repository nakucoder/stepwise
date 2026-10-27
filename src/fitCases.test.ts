import { describe, expect, it } from 'vitest'
import {
  BOX_PATH,
  BOX_SCREENS,
  boxCases,
  boxUrl,
  desktopNoticeCases,
  desktopNoticeUrl,
  FIT_SCREEN,
  FIT_SORTS,
  fitCases,
  fitUrl,
  IDEA_SCREEN,
  IDEA_SORTS,
  ideaCases,
  ideaUrl,
  noticeCases,
  NOTICE_DESKTOPS,
  SAME_SIZE_ADD,
  SAME_SIZE_NUMBERS,
  sameSizeCases,
  sameSizeUrl,
  NOTICE_SCREENS,
  TREE_PATH,
  TREE_SCREENS,
  treeCases,
  treeUrl,
  TWELVE,
  TWELVE_SMALL,
} from '../scripts/fitCases'
import { ALGORITHMS } from './algorithms'
import { quickSort } from './algorithms/sorting/quickSort'
import { collectFrames } from './engine/collect'
import { answerAt, decisionIndexes } from './engine/decision'
import { CHARACTERS, drawnCharacter } from './characters/registry'
import { fitsRange, INPUT_LIMITS } from './engine/input'

describe('check:fit covers every sort, in Watch and in Do it', () => {
  it('lists every algorithm, whether it has Do it, and checks its character when one is drawn', () => {
    const expected = Object.entries(ALGORITHMS).map(([path, algorithm]) => ({
      path,
      character: drawnCharacter(algorithm) !== undefined,
      doIt: algorithm.doIt === true,
      ...(algorithm.pivotRules && { pivots: [...algorithm.pivotRules] }),
    }))
    expect(
      [...FIT_SORTS]
        .map((sort) => ({ ...sort, characterNumbers: undefined }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    ).toEqual(
      expected
        .map((sort) => ({ ...sort, characterNumbers: undefined }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    )
  })

  it('plays a character that carries fewer values on twelve it can carry, and bars on TWELVE', () => {
    for (const sort of FIT_SORTS) {
      const character = drawnCharacter(ALGORITHMS[sort.path])
      const range = character && CHARACTERS[character].range?.values
      expect(sort.characterNumbers !== undefined).toBe(range !== undefined)
      if (!range || !sort.characterNumbers) continue
      expect(sort.characterNumbers).toHaveLength(INPUT_LIMITS.maxCount)
      expect(fitsRange(sort.characterNumbers, range)).toBe(true)
      const cases = fitCases([sort]).filter((c) => c.numbers !== null && !c.pivot)
      for (const c of cases) {
        expect(c.numbers).toEqual(c.look === 'character' ? sort.characterNumbers : TWELVE)
      }
    }
  })

  it('plays Watch and Do it, each look, both levels, the default numbers and the most allowed', () => {
    expect(TWELVE).toHaveLength(INPUT_LIMITS.maxCount)
    const cases = fitCases()
    // 5 sorts with bars and their character: 2 modes x 10 looks x 2 levels x 2 inputs.
    // Plus quick sort's Do it with 12 numbers and each pivot rule, at both levels, and heap sort's
    // Watch with bars (no Do it, no character yet): 2 levels x 2 inputs.
    expect(cases).toHaveLength(92)
    expect(cases.filter((c) => c.pivot).map((c) => `${c.level} ${String(c.pivot)}`)).toEqual([
      'explorer first',
      'engineer first',
      'explorer last',
      'engineer last',
      'explorer middle',
      'engineer middle',
      'explorer random',
      'engineer random',
    ])
    const pivoted = cases.find((c) => c.pivot === 'middle')
    expect(pivoted && fitUrl('http://x', pivoted)).toBe(
      `http://x/sorting/quick-sort?mode=do&numbers=${TWELVE.join(',')}&pivot=middle`,
    )
    expect(cases.filter((c) => c.mode === 'watch')).toHaveLength(44)
    const quick = cases.filter((c) => c.path === 'sorting/quick-sort')
    expect(quick.map((c) => `${c.mode} ${c.look}`)).toEqual([
      ...Array<string>(4).fill('watch bars'),
      ...Array<string>(4).fill('watch character'),
      ...Array<string>(4).fill('do bars'),
      ...Array<string>(4).fill('do character'),
      ...Array<string>(8).fill('do bars'),
    ])
    expect(cases.filter((c) => c.path === 'sorting/merge-sort').map((c) => c.look)).toContain(
      'character',
    )
    expect(cases[1] && fitUrl('http://x', cases[1])).toBe(
      `http://x/sorting/bubble-sort?numbers=${TWELVE.join(',')}`,
    )
    const doIt = cases.find((c) => c.mode === 'do' && c.numbers !== null)
    expect(doIt && fitUrl('http://x', doIt)).toBe(
      `http://x/sorting/bubble-sort?mode=do&numbers=${TWELVE.join(',')}`,
    )
    // A sort without Do it is played in Watch only.
    expect(fitCases([{ path: 'sorting/x', character: false, doIt: false }])).toHaveLength(4)
    expect(FIT_SCREEN).toEqual({ width: 740, height: 300, textScale: '130%' })
  })

  it('checks "The idea" at 1440x900 for every sort, both levels, Watch and Do it', () => {
    expect(IDEA_SCREEN).toEqual({ width: 1440, height: 900 })
    expect(IDEA_SORTS).toEqual(Object.keys(ALGORITHMS))
    const cases = ideaCases()
    expect(cases).toHaveLength(IDEA_SORTS.length * 4)
    expect(cases.slice(0, 4).map((c) => `${c.path} ${c.level} ${c.mode}`)).toEqual([
      'sorting/bubble-sort explorer watch',
      'sorting/bubble-sort explorer do',
      'sorting/bubble-sort engineer watch',
      'sorting/bubble-sort engineer do',
    ])
    expect(cases[1] && ideaUrl('http://x', cases[1])).toBe('http://x/sorting/bubble-sort?mode=do')
    expect(cases[0] && ideaUrl('http://x', cases[0])).toBe('http://x/sorting/bubble-sort')
  })

  it('checks the pizza cart’s boxes on phones: one size through Do it, room in a sheet’s strip', () => {
    expect(BOX_PATH).toBe('sorting/quick-sort')
    expect(BOX_SCREENS.map((s) => `${String(s.width)}x${String(s.height)} ${s.textScale}`)).toEqual(
      ['390x844 100%', '844x390 100%', '740x300 130%'],
    )
    // Upright, the strip over a sheet keeps 8 px boxes: PIZZA on them.
    expect(BOX_SCREENS[0].minBox).toBe(8)
    const cases = boxCases()
    expect(cases).toHaveLength(12)
    // The first question on the 1-12 list (7, the leader 8) goes left: the wrong answer is right.
    const frames = collectFrames(quickSort, TWELVE_SMALL).frames
    const ask = decisionIndexes(frames)[0] ?? -1
    expect(answerAt(frames, ask)?.kind).toBe('trade')
    expect(cases.map((c) => c.wrong)).toContain('Right side')
    expect(cases.map((c) => c.wrong)).toContain('Keep order')
    const doIt = cases.find((c) => c.mode === 'do')
    expect(doIt && boxUrl('http://x', doIt)).toBe(
      `http://x/sorting/quick-sort?numbers=${TWELVE_SMALL.join(',')}&mode=do`,
    )
  })

  it('checks the range notice in Do it on phones: a sort whose character carries fewer, with TWELVE', () => {
    expect(
      NOTICE_SCREENS.map((s) => `${String(s.width)}x${String(s.height)} ${s.textScale}`),
    ).toEqual(['390x844 100%', '844x390 100%', '740x300 130%'])
    const cases = noticeCases()
    // Only quick sort's pizza cart carries fewer than the bars: 3 phones x 2 levels.
    expect(cases).toHaveLength(6)
    for (const c of cases) {
      expect(c).toMatchObject({ path: 'sorting/quick-sort', mode: 'do', look: 'character' })
      expect(c.notice).toBe(true)
      expect(fitsRange(c.numbers ?? [], { min: 1, max: 12 })).toBe(false)
    }
    expect(cases[0] && fitUrl('http://x', cases[0])).toBe(
      `http://x/sorting/quick-sort?mode=do&numbers=${TWELVE.join(',')}`,
    )
    // The 740x300 cases are fitCases' own screen.
    expect(cases.filter((c) => c.screen?.height === FIT_SCREEN.height)).toHaveLength(2)
  })

  it('checks the range notice on laptops, where Do it’s Start scrolls the page', () => {
    expect(NOTICE_DESKTOPS.map((s) => `${String(s.width)}x${String(s.height)}`)).toEqual([
      '1366x650',
      '1280x620',
      '1024x768',
    ])
    const cases = desktopNoticeCases()
    expect(cases).toHaveLength(6)
    expect(cases[0] && desktopNoticeUrl('http://x', cases[0])).toBe(
      `http://x/sorting/quick-sort?mode=do&numbers=${TWELVE.join(',')}`,
    )
  })

  it('checks the cart’s boxes keep one size on a phone on its side: 1 7 9 11 9 3, then a 2', () => {
    expect([...SAME_SIZE_NUMBERS]).toEqual([1, 7, 9, 11, 9, 3])
    expect(SAME_SIZE_ADD).toBe(2)
    // Numbers the cart carries, before and after the 2: the boxes are drawn all the way.
    const range = CHARACTERS.pizzaCart.range?.values
    expect(range && fitsRange([...SAME_SIZE_NUMBERS, SAME_SIZE_ADD], range)).toBe(true)
    const cases = sameSizeCases()
    // 3 sideways screens x 2 levels x Watch and Do it.
    expect(cases).toHaveLength(12)
    expect(cases.every((c) => c.screen.width > c.screen.height)).toBe(true)
    const doIt = cases.find((c) => c.mode === 'do')
    expect(doIt && sameSizeUrl('http://x', doIt)).toBe(
      'http://x/sorting/quick-sort?numbers=1,7,9,11,9,3&mode=do',
    )
  })
})

describe('check:fit plays heap sort’s tree', () => {
  it('is heap sort, the only sort with a heap', () => {
    for (const [path, algorithm] of Object.entries(ALGORITHMS)) {
      const heaps = collectFrames(algorithm, [5, 2, 8, 1, 9, 3]).frames.some((f) => f.heap)
      expect(heaps).toBe(path === TREE_PATH)
    }
  })

  it('over the bars on a desktop and an upright phone, in its sheet with larger text or on its side', () => {
    expect(
      TREE_SCREENS.map((s) => `${String(s.width)}x${String(s.height)} ${s.textScale} ${s.place}`),
    ).toEqual([
      '1440x900 100% stage',
      '390x844 100% stage',
      '390x844 130% sheet',
      '844x390 100% sheet',
      `${String(FIT_SCREEN.width)}x${String(FIT_SCREEN.height)} ${FIT_SCREEN.textScale} sheet`,
    ])
  })

  it('each screen at both levels, with the default numbers and the most allowed (four rows)', () => {
    const cases = treeCases()
    expect(cases).toHaveLength(TREE_SCREENS.length * 2 * 2)
    expect(new Set(cases.map((c) => c.numbers))).toEqual(new Set([null, TWELVE]))
    expect(
      treeUrl('http://x', { screen: TREE_SCREENS[0], level: 'engineer', numbers: TWELVE }),
    ).toBe(`http://x/${TREE_PATH}?numbers=${TWELVE.join(',')}`)
  })
})
