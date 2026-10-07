/**
 * Do it mode, by kind of decision: everything Do it says and accepts that depends on what the
 * learner is deciding. That covers Explorer's two answers and their keys, how Engineer picks
 * values on the stage, the words around a question (the hint under it, the feedback, the
 * counters), and the challenge and the finish. The question itself, the nudge and the rule are
 * each algorithm's own (its frames' explanations and `hints`).
 *
 * One kind so far, bubble sort's "trade or keep". Selection sort adds its own.
 */
import type { Challenge } from '../engine/doIt'
import type { Choice, Decision, Level } from '../engine/types'

export type DecisionKind = Decision['kind']

// ---------- How Engineer picks values on the stage ----------

/**
 * - neighbor: pick a value, then its neighbor (another value moves the pick there)
 * - any-two: pick a value, then any other value
 * - single: one value is the answer
 *
 * In every rule, picking the picked value again lets go.
 */
export type PickRule = 'neighbor' | 'any-two' | 'single'

/** What a tap on value `index` does, given the value already picked (or null). */
export type PickOutcome =
  | { readonly kind: 'hold'; readonly index: number }
  | { readonly kind: 'let-go' }
  | { readonly kind: 'pair'; readonly pair: readonly [number, number] }
  | { readonly kind: 'single'; readonly index: number }

export function pickOutcome(rule: PickRule, picked: number | null, index: number): PickOutcome {
  if (rule === 'single') return { kind: 'single', index }
  if (picked === null) return { kind: 'hold', index }
  if (index === picked) return { kind: 'let-go' }
  if (rule === 'neighbor' && Math.abs(index - picked) > 1) return { kind: 'hold', index }
  return { kind: 'pair', pair: [Math.min(index, picked), Math.max(index, picked)] }
}

// ---------- The table ----------

/**
 * The words around a question of this kind, for one level (a mapped type, so its values
 * read as strings):
 * - act: Explorer's answer that makes the move (Engineer makes it on the stage).
 * - keep: The answer that leaves things as they are.
 * - questionHint: Under the question: how to answer.
 * - right: After a right move.
 * - shown: After Show me.
 * - wrongLead: Leads the help ladder after a wrong move.
 * - helpLead: Leads the help ladder when the learner asks for help.
 * - progress: "Question 3 of 14"
 * - found, questions: the two counters in place of Comparisons and Swaps.
 */
export type KindWords = {
  readonly [
    K in
      | 'act'
      | 'keep'
      | 'questionHint'
      | 'right'
      | 'shown'
      | 'wrongLead'
      | 'helpLead'
      | 'progress'
      | 'found'
      | 'questions'
  ]: string
}

export interface DecisionKindSpec {
  /** The keyboard keys for Explorer's two answers (shown as T and K; pressed in any case). */
  readonly keys: { readonly act: string; readonly keep: string }
  /** The move each answer makes, at this decision. */
  readonly choice: (answer: 'act' | 'keep', decision: Decision) => Choice
  /** Engineer: how values on the stage are picked, and the move a finished pick makes. */
  readonly pick: PickRule
  readonly pickChoice: (outcome: Extract<PickOutcome, { kind: 'pair' | 'single' }>) => Choice
  /** Engineer: names the group of value buttons. */
  readonly pickGroupLabel: string
  /** Engineer: what the line under the question says once a value is picked. */
  readonly pickedLine: (index: number, value: number) => string
  readonly words: Readonly<Record<Level, KindWords>>
  /** The challenge, before the first question. */
  readonly challenge: (
    level: Level,
    challenge: Challenge,
    count: number,
    name: string,
  ) => readonly string[]
  /** The finish: what they did, then the first-try count and (unless perfect) an invitation. */
  readonly finish: (
    level: Level,
    challenge: Challenge,
    firstTry: number,
    name: string,
  ) => { readonly title: string; readonly lines: readonly string[] }
}

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`

/** Bubble sort's question: trade these two neighbors, or keep them where they are? */
const TRADE_OR_KEEP: DecisionKindSpec = {
  keys: { act: 'T', keep: 'K' },
  choice: (answer, decision) =>
    answer === 'keep' ? { kind: 'keep' } : { kind: 'trade', pair: decision.pair },
  pick: 'neighbor',
  pickChoice: (outcome) =>
    outcome.kind === 'pair' ? { kind: 'trade', pair: outcome.pair } : { kind: 'keep' },
  pickGroupLabel: 'Values: pick one, then its neighbor to swap them',
  pickedLine: (index, value) =>
    `a[${String(index)}] = ${String(value)} picked. Pick a neighbor to swap with it; Esc lets go.`,
  words: {
    explorer: {
      act: 'Trade places',
      keep: 'Keep them',
      questionHint: 'If it is, they trade places.',
      right: 'Right!',
      shown: 'Here’s the answer',
      wrongLead: 'Not this time. Have another look.',
      helpLead: 'Here’s a hint.',
      progress: 'Question',
      found: 'Trades found',
      questions: 'Questions',
    },
    engineer: {
      act: 'Swap',
      keep: 'Keep order',
      questionHint: 'Swap: pick a value, then its neighbor. No swap: Keep order (K).',
      right: 'Correct.',
      shown: 'The move',
      wrongLead: 'Not the move the algorithm makes here.',
      helpLead: 'A hint.',
      progress: 'Comparison',
      found: 'Swaps',
      questions: 'Comparisons',
    },
  },
  challenge: (level, challenge, count, name) => {
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
  },
  finish: (level, challenge, firstTry, name) => {
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
  },
}

/** Every kind of decision Do it mode knows. */
export const DO_IT_KINDS: Readonly<Record<DecisionKind, DecisionKindSpec>> = {
  'trade-or-keep': TRADE_OR_KEEP,
}

/** The kind an algorithm's questions are, from its frames (the first decision's kind). */
export function doItKindOf(
  frames: readonly { readonly decision?: Decision | undefined }[],
): DecisionKind {
  return frames.find((frame) => frame.decision)?.decision?.kind ?? 'trade-or-keep'
}
