/**
 * Explorer's words for Do it mode: the challenge, the feedback and the finish. Encouraging,
 * never a grade: no scores during play, and the first-try count only at the finish, with an
 * invitation to go for a perfect run. Every string passes the jargon check (see its test).
 */
import type { Challenge } from '../engine/doIt'

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`

/** The challenge, shown before the first question. */
export function challengeLines(challenge: Challenge, count: number, name: string): string[] {
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
): { readonly title: string; readonly lines: readonly string[] } {
  if (challenge.decisions === 0) {
    return { title: 'Nothing to sort!', lines: ['Try more numbers to play.'] }
  }
  const did = `${plural(challenge.trades, 'trade', 'trades')}, the same as ${name.toLowerCase()}.`
  if (firstTry === challenge.decisions) {
    return {
      title: 'You sorted it!',
      lines: [did, `All ${String(challenge.decisions)} on the first try! A perfect run.`],
    }
  }
  return {
    title: 'You sorted it!',
    lines: [
      did,
      `${String(firstTry)} of ${String(challenge.decisions)} on the first try!`,
      'Play again and go for a perfect run?',
    ],
  }
}

export const DO_IT_WORDS = {
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
} as const
