/**
 * Quick sort's pivot choice, in words: the rules each level offers, their names, and the
 * comparison the Do it finish shows. The choice is made before a run and applies to every round.
 */
import type { Level, PivotRule } from '../engine/types'

/** Explorer chooses from three (no "first"); Engineer from all four. */
const LEVEL_RULES: Readonly<Record<Level, readonly PivotRule[]>> = {
  explorer: ['last', 'middle', 'random'],
  engineer: ['first', 'last', 'middle', 'random'],
}

/** What the choice is called: the leader (Explorer), the pivot (Engineer). */
export const PIVOT_LABEL: Readonly<Record<Level, string>> = {
  explorer: 'Leader',
  engineer: 'Pivot',
}

/** Each rule's name on its button and in sentences. */
export const PIVOT_NAMES: Readonly<Record<Level, Readonly<Record<PivotRule, string>>>> = {
  explorer: {
    first: 'the first one',
    last: 'the last one',
    middle: 'the middle one',
    random: 'a surprise one',
  },
  engineer: { first: 'first', last: 'last', middle: 'middle', random: 'random' },
}

/**
 * The rules a level offers. A link can name a rule Explorer doesn't offer ("first", chosen in
 * Engineer): it stays chosen and shows as a fourth button, so the run on screen is never hidden.
 */
export function pivotChoices(level: Level, current: PivotRule): readonly PivotRule[] {
  const rules = LEVEL_RULES[level]
  return rules.includes(current) ? rules : [current, ...rules]
}

/** A name at the start of a sentence or on a button. */
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`

/**
 * The finish's comparison: how many questions this rule took, and, only when another of the
 * level's rules takes fewer for these numbers, the one that takes the fewest. Never a grade.
 * `changeIn` names where the rule is changed when that isn't in sight (phones: "Numbers"); it
 * follows a suggestion only.
 */
export function pivotComparison(
  level: Level,
  current: PivotRule,
  questions: Readonly<Partial<Record<PivotRule, number>>>,
  changeIn?: string,
): string | null {
  const mine = questions[current]
  if (mine === undefined) return null
  let best: { rule: PivotRule; count: number } | null = null
  for (const rule of LEVEL_RULES[level]) {
    const count = questions[rule]
    if (rule === current || count === undefined || count >= mine) continue
    if (!best || count < best.count) best = { rule, count }
  }
  const names = PIVOT_NAMES[level]
  const where = changeIn ? ` Change it in ${changeIn}.` : ''
  if (level === 'explorer') {
    const said = `With ${names[current]} as leader: ${plural(mine, 'question', 'questions')}.`
    return best ? `${said} Try ${names[best.rule]}: ${String(best.count)}!${where}` : said
  }
  const said = `Pivot ${names[current]}: ${plural(mine, 'comparison', 'comparisons')}.`
  return best
    ? `${said} ${capitalize(names[best.rule])} would take ${String(best.count)}.${where}`
    : said
}
