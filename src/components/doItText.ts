/**
 * The words for Do it mode, per level: the challenge, the feedback and the finish.
 * Encouraging, never a grade: no scores during play, and the first-try count only at the
 * finish, with an invitation to go for a perfect run. Explorer is plain and warm and passes
 * the jargon check; Engineer is precise (see the tests).
 */
import type { Challenge } from '../engine/doIt'
import type { Level } from '../engine/types'

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`

/** The challenge, shown before the first decision. */
export function challengeLines(
  challenge: Challenge,
  count: number,
  name: string,
  level: Level = 'explorer',
): string[] {
  if (level === 'engineer') {
    if (challenge.decisions === 0) {
      return ['Fewer than two values: nothing to compare. Try more numbers.']
    }
    const intro = `You make every decision for these ${String(count)} values: swap the pair, or keep its order.`
    if (challenge.trades === 0) {
      return [
        intro,
        `Already sorted: ${name.toLowerCase()} makes no swaps here, but still compares every pair. Can you confirm them all?`,
      ]
    }
    return [
      intro,
      `${name} makes ${plural(challenge.trades, 'swap', 'swaps')} here. Can you find every one?`,
    ]
  }
  if (challenge.decisions === 0) {
    return ['With fewer than two numbers there’s nothing to compare. Try more numbers!']
  }
  const intro = `Put these ${String(count)} numbers in order, one question at a time.`
  if (challenge.trades === 0) {
    return [
      intro,
      `These are already in order! ${name} still checks every pair. Can you keep them all where they are?`,
    ]
  }
  return [
    intro,
    `${name} needs ${plural(challenge.trades, 'trade', 'trades')} for these numbers. Can you find them all?`,
  ]
}

/** The finish: what they did, then the first-try count and (unless perfect) an invitation. */
export function finishLines(
  challenge: Challenge,
  firstTry: number,
  name: string,
  level: Level = 'explorer',
): { readonly title: string; readonly lines: readonly string[] } {
  const { decisions, trades } = challenge
  const perfect = firstTry === decisions
  if (level === 'engineer') {
    if (decisions === 0) return { title: 'Nothing to sort.', lines: ['Try more numbers.'] }
    const did = `${plural(trades, 'swap', 'swaps')} and ${plural(decisions, 'comparison', 'comparisons')}: exactly ${name.toLowerCase()}’s path.`
    return perfect
      ? {
          title: 'Sorted.',
          lines: [did, `All ${String(decisions)} decisions right first time. A perfect run.`],
        }
      : {
          title: 'Sorted.',
          lines: [
            did,
            `${String(firstTry)} of ${String(decisions)} decisions right first time.`,
            'Run it again for a perfect run?',
          ],
        }
  }
  if (decisions === 0) {
    return { title: 'Nothing to sort!', lines: ['Try more numbers to play.'] }
  }
  const did = `${plural(trades, 'trade', 'trades')}, the same as ${name.toLowerCase()}.`
  if (perfect) {
    return {
      title: 'You sorted it!',
      lines: [did, `All ${String(decisions)} on the first try! A perfect run.`],
    }
  }
  return {
    title: 'You sorted it!',
    lines: [
      did,
      `${String(firstTry)} of ${String(decisions)} on the first try!`,
      'Play again and go for a perfect run?',
    ],
  }
}

const EXPLORER = {
  yourTurn: 'Your turn',
  start: 'Start',
  trade: 'Trade places',
  keep: 'Keep them',
  help: 'Help',
  moreHelp: 'More help',
  showMe: 'Show me',
  right: 'Right!',
  shown: 'Here’s the answer',
  watching: 'Watch',
  questionHint: 'If it is, they trade places.',
  wrongLead: 'Not this time. Have another look.',
  helpLead: 'Here’s a hint.',
  playAgain: 'Play again',
  watchIt: 'Watch it',
  startOver: 'Start over',
  progress: 'Question',
  tradesFound: 'Trades found',
  questions: 'Questions',
} as const

export type DoItWords = { readonly [K in keyof typeof EXPLORER]: string }

const ENGINEER: DoItWords = {
  yourTurn: 'Your move',
  start: 'Start',
  trade: 'Swap',
  keep: 'Keep order',
  help: 'Help',
  moreHelp: 'More help',
  showMe: 'Show me',
  right: 'Correct.',
  shown: 'The move',
  watching: 'Running',
  questionHint: 'Swap: pick a value, then its neighbor. No swap: Keep order (K).',
  wrongLead: 'Not the move the algorithm makes here.',
  helpLead: 'A hint.',
  playAgain: 'Run it again',
  watchIt: 'Watch',
  startOver: 'Start over',
  progress: 'Comparison',
  tradesFound: 'Swaps',
  questions: 'Comparisons',
}

/** The words for a level. */
export function doItWords(level: Level): DoItWords {
  return level === 'engineer' ? ENGINEER : EXPLORER
}

/** Explorer's words (kept for existing imports). */
export const DO_IT_WORDS: DoItWords = EXPLORER

/** What Engineer sees once a value is picked, waiting for its neighbor. */
export function pickedLine(index: number, value: number): string {
  return `a[${String(index)}] = ${String(value)} picked. Pick a neighbor to swap with it; Esc lets go.`
}
