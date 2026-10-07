/**
 * The words for Do it mode, per level. Encouraging, never a grade: no scores during play, and
 * the first-try count only at the finish, with an invitation to go for a perfect run. Explorer
 * is plain and warm and passes the jargon check; Engineer is precise (see the tests).
 *
 * The words that depend on the kind of decision (the answers, the feedback, the counters, the
 * challenge and the finish) live in doItKinds.ts; these functions read them from there.
 */
import type { Challenge } from '../engine/doIt'
import type { Level } from '../engine/types'
import { DO_IT_KINDS, type DecisionKind } from './doItKinds'

/** The challenge, shown before the first decision. */
export function challengeLines(
  challenge: Challenge,
  count: number,
  name: string,
  level: Level = 'explorer',
  kind: DecisionKind = 'trade-or-keep',
): string[] {
  return [...DO_IT_KINDS[kind].challenge(level, challenge, count, name)]
}

/** The finish: what they did, then the first-try count and (unless perfect) an invitation. */
export function finishLines(
  challenge: Challenge,
  firstTry: number,
  name: string,
  level: Level = 'explorer',
  kind: DecisionKind = 'trade-or-keep',
): { readonly title: string; readonly lines: readonly string[] } {
  return DO_IT_KINDS[kind].finish(level, challenge, firstTry, name)
}

/** The words that don't depend on the kind of decision. */
const LEVEL_WORDS = {
  explorer: {
    yourTurn: 'Your turn',
    start: 'Start',
    help: 'Help',
    moreHelp: 'More help',
    showMe: 'Show me',
    watching: 'Watch',
    playAgain: 'Play again',
    watchIt: 'Watch it',
    startOver: 'Start over',
  },
  engineer: {
    yourTurn: 'Your move',
    start: 'Start',
    help: 'Help',
    moreHelp: 'More help',
    showMe: 'Show me',
    watching: 'Running',
    playAgain: 'Run it again',
    watchIt: 'Watch',
    startOver: 'Start over',
  },
} as const

/** Every word Do it shows (a mapped type, so its values read as strings). */
type WordKey =
  | 'yourTurn'
  | 'start'
  | 'trade'
  | 'keep'
  | 'help'
  | 'moreHelp'
  | 'showMe'
  | 'right'
  | 'shown'
  | 'watching'
  | 'questionHint'
  | 'wrongLead'
  | 'helpLead'
  | 'playAgain'
  | 'watchIt'
  | 'startOver'
  | 'progress'
  | 'tradesFound'
  | 'questions'

export type DoItWords = { readonly [K in WordKey]: string }

/** The words for a level, for questions of this kind. */
export function doItWords(level: Level, kind: DecisionKind = 'trade-or-keep'): DoItWords {
  const words = DO_IT_KINDS[kind].words[level]
  return {
    ...LEVEL_WORDS[level],
    trade: words.act,
    keep: words.keep,
    right: words.right,
    shown: words.shown,
    questionHint: words.questionHint,
    wrongLead: words.wrongLead,
    helpLead: words.helpLead,
    progress: words.progress,
    tradesFound: words.found,
    questions: words.questions,
  }
}

/** Explorer's words (kept for existing imports). */
export const DO_IT_WORDS: DoItWords = doItWords('explorer')

/** What Engineer sees once a value is picked, waiting for its neighbor. */
export function pickedLine(
  index: number,
  value: number,
  kind: DecisionKind = 'trade-or-keep',
): string {
  return DO_IT_KINDS[kind].pickedLine(index, value)
}
