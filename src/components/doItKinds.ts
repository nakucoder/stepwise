/**
 * Do it mode, by kind of decision: everything Do it says and accepts that depends on what the
 * learner is deciding. That covers Explorer's two answers and their keys, how Engineer picks
 * values on the stage, the words around a question (the hint under it, the feedback, the
 * counters), and the challenge and the finish. The question itself, the nudge and the rule are
 * each algorithm's own (its frames' explanations and `hints`).
 *
 * Bubble sort asks "trade or keep"; selection sort asks "new smallest?" at each comparison and
 * "to the front?" at the end of each round; insertion sort asks "shift or stop"; merge sort asks
 * "which goes next?" (Engineer taps the front in the second row); quick sort asks "left or right
 * of the pivot?" (Engineer taps the value, then its slot).
 */
import type { Challenge } from '../engine/doIt'
import type { Choice, Decision, Level } from '../engine/types'

export type DecisionKind = Decision['kind']

/**
 * An answer button's icon, by what the answer does: trade arrows, keep (stay put), a target
 * (lock on), an arrow (move on, or slide right), up (move up into the main row: merge sort),
 * left and right (the side of the pivot: quick sort).
 */
export type AnswerIcon = 'trade' | 'keep' | 'target' | 'arrow' | 'up' | 'left' | 'right'

// ---------- How Engineer picks values on the stage ----------

/**
 * - neighbor: pick a value, then its neighbor (another value moves the pick there)
 * - any-two: pick a value, then any other value
 * - single: one value is the answer
 * - value-then-slot: pick a value, then the slot it goes to (quick sort: a[j], then a[i]). When
 *   the question's slot is the value itself (`pair[0] === pair[1]`), picking it again names it.
 *
 * In every rule, picking the picked value again lets go (but for value-then-slot's own slot).
 */
export type PickRule = 'neighbor' | 'any-two' | 'single' | 'value-then-slot'

/** What a tap on value `index` does, given the value already picked (or null). */
export type PickOutcome =
  | { readonly kind: 'hold'; readonly index: number }
  | { readonly kind: 'let-go' }
  | { readonly kind: 'pair'; readonly pair: readonly [number, number] }
  | { readonly kind: 'single'; readonly index: number }

export function pickOutcome(
  rule: PickRule,
  picked: number | null,
  index: number,
  decision?: Decision,
): PickOutcome {
  if (rule === 'single') return { kind: 'single', index }
  if (picked === null) return { kind: 'hold', index }
  if (index === picked) {
    const ownSlot =
      rule === 'value-then-slot' && decision?.pair[0] === index && decision.pair[1] === index
    return ownSlot ? { kind: 'pair', pair: [index, index] } : { kind: 'let-go' }
  }
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
  /**
   * The keyboard keys for Explorer's two answers (shown as T and K; pressed in any case), and
   * Engineer's Keep when it isn't Explorer's keep key (quick sort: R is "right side", K keeps).
   */
  readonly keys: { readonly act: string; readonly keep: string; readonly engineerKeep?: string }
  /** Explorer's two answers' icons (Engineer's one answer button always shows keep). */
  readonly icons: { readonly act: AnswerIcon; readonly keep: AnswerIcon }
  /** The move each answer makes, at this decision. */
  readonly choice: (answer: 'act' | 'keep', decision: Decision) => Choice
  /** Engineer: how values on the stage are picked, and the move a finished pick makes. */
  readonly pick: PickRule
  readonly pickChoice: (
    outcome: Extract<PickOutcome, { kind: 'pair' | 'single' }>,
    decision?: Decision,
  ) => Choice
  /** Engineer: names the group of value buttons. */
  readonly pickGroupLabel: string
  /** Engineer: what the line under the question says once a value is picked. */
  readonly pickedLine: (index: number, value: number) => string
  /**
   * Engineer: the row the value buttons lie over. 'buffer' is the second row (merge sort's two
   * halves); absent means the main row.
   */
  readonly pickRow?: 'buffer'
  /**
   * Engineer answers on the stage only: no answer button or key beside Help. For a question
   * whose every answer is a value to tap (merge sort: both fronts), where one button would
   * stand for only one of them.
   */
  readonly tapOnly?: boolean
  /**
   * What the first counter counts out of: 'trades' (the answers that trade places; absent) or
   * 'moves' (every move the run makes, asked or not: merge sort moves every value up).
   */
  readonly found?: 'trades' | 'moves'
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
  icons: { act: 'trade', keep: 'keep' },
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

// Selection sort's two kinds share the counters, the challenge and the finish, so nothing
// changes name between its two questions.

const SELECTION_COUNTERS = {
  explorer: { progress: 'Question', found: 'Trades found', questions: 'Questions' },
  engineer: { progress: 'Decision', found: 'Swaps', questions: 'Decisions' },
} as const

const selectionChallenge: DecisionKindSpec['challenge'] = (level, challenge, count, name) => {
  if (level === 'engineer') {
    if (challenge.decisions === 0) {
      return ['Fewer than two values: nothing to compare. Try more numbers.']
    }
    const intro = `You make every decision for these ${String(count)} values: is a[j] a new min, and does the min move to the front?`
    if (challenge.trades === 0) {
      return [
        intro,
        `Already sorted: ${name.toLowerCase()} makes no swaps here, but still scans every pass. Can you confirm each min?`,
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
  const intro = `Put these ${String(count)} numbers in order, one round at a time.`
  if (challenge.trades === 0) {
    return [
      intro,
      `These are already in order! ${name} still checks every number. Can you find the smallest each round?`,
    ]
  }
  return [
    intro,
    `${name} needs ${plural(challenge.trades, 'trade', 'trades')} for these numbers. Can you find them all?`,
  ]
}

const selectionFinish: DecisionKindSpec['finish'] = (level, challenge, firstTry, name) => {
  const { decisions, trades } = challenge
  const perfect = firstTry === decisions
  if (level === 'engineer') {
    if (decisions === 0) return { title: 'Nothing to sort.', lines: ['Try more numbers.'] }
    const did = `${plural(trades, 'swap', 'swaps')} and ${plural(decisions, 'decision', 'decisions')}: exactly ${name.toLowerCase()}’s path.`
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
  if (decisions === 0) return { title: 'Nothing to sort!', lines: ['Try more numbers to play.'] }
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

/**
 * Selection sort, at each comparison: is this value smaller than the smallest so far? Equal
 * values are not: keep looking. Engineer answers yes by picking the new min, and no with Keep
 * min or by picking the min so far.
 */
const NEW_SMALLEST: DecisionKindSpec = {
  keys: { act: 'S', keep: 'K' },
  icons: { act: 'target', keep: 'arrow' },
  choice: (answer, decision) =>
    answer === 'keep' ? { kind: 'keep' } : { kind: 'pick', index: decision.pair[1] },
  pick: 'single',
  // Tapping the min so far keeps it, like Keep min.
  pickChoice: (outcome, decision) =>
    outcome.kind === 'single' && outcome.index !== decision?.pair[0]
      ? { kind: 'pick', index: outcome.index }
      : { kind: 'keep' },
  pickGroupLabel: 'Values: pick the new min, or the min so far to keep it',
  pickedLine: (index, value) => `a[${String(index)}] = ${String(value)} picked as the new min.`,
  words: {
    explorer: {
      act: 'New smallest',
      keep: 'Keep looking',
      questionHint: 'If it is, it becomes the new smallest.',
      right: 'Right!',
      shown: 'Here’s the answer',
      wrongLead: 'Not this time. Have another look.',
      helpLead: 'Here’s a hint.',
      ...SELECTION_COUNTERS.explorer,
    },
    engineer: {
      act: 'New min',
      keep: 'Keep min',
      questionHint: 'New min: pick a[j]. Not smaller (or equal): Keep min (K).',
      right: 'Correct.',
      shown: 'The move',
      wrongLead: 'Not the move the algorithm makes here.',
      helpLead: 'A hint.',
      ...SELECTION_COUNTERS.engineer,
    },
  },
  challenge: selectionChallenge,
  finish: selectionFinish,
}

/**
 * Selection sort, at the end of a round: move the smallest to the front? The two can be far
 * apart, and are the same place when the smallest is already there (keep).
 */
const TO_FRONT: DecisionKindSpec = {
  keys: { act: 'T', keep: 'K' },
  icons: { act: 'trade', keep: 'keep' },
  choice: (answer, decision) =>
    answer === 'keep' ? { kind: 'keep' } : { kind: 'trade', pair: decision.pair },
  pick: 'any-two',
  pickChoice: (outcome) =>
    outcome.kind === 'pair' ? { kind: 'trade', pair: outcome.pair } : { kind: 'keep' },
  pickGroupLabel: 'Values: pick one, then the one to swap it with',
  pickedLine: (index, value) =>
    `a[${String(index)}] = ${String(value)} picked. Pick the value to swap with it; Esc lets go.`,
  words: {
    explorer: {
      act: 'Trade places',
      keep: 'Keep them',
      questionHint: 'If it does, it trades places with the front.',
      right: 'Right!',
      shown: 'Here’s the answer',
      wrongLead: 'Not this time. Have another look.',
      helpLead: 'Here’s a hint.',
      ...SELECTION_COUNTERS.explorer,
    },
    engineer: {
      act: 'Swap',
      keep: 'Keep order',
      questionHint: 'Swap: pick a[i], then a[min]. No swap: Keep order (K).',
      right: 'Correct.',
      shown: 'The move',
      wrongLead: 'Not the move the algorithm makes here.',
      helpLead: 'A hint.',
      ...SELECTION_COUNTERS.engineer,
    },
  },
  challenge: selectionChallenge,
  finish: selectionFinish,
}

/**
 * Insertion sort, at each comparison: is a[j] bigger than the key? If it is, it shifts right (the
 * key and a[j] trade places in the frames); if not (or equal: stable), the key stops here.
 * Engineer taps a[j] to shift it, or the key (or Insert here) to stop.
 */
const SHIFT_OR_STOP: DecisionKindSpec = {
  keys: { act: 'S', keep: 'K' },
  icons: { act: 'arrow', keep: 'keep' },
  choice: (answer, decision) =>
    answer === 'keep' ? { kind: 'keep' } : { kind: 'trade', pair: decision.pair },
  pick: 'single',
  pickChoice: (outcome, decision) => {
    if (outcome.kind !== 'single' || !decision) return { kind: 'keep' }
    if (outcome.index === decision.pair[0]) return { kind: 'trade', pair: decision.pair }
    if (outcome.index === decision.pair[1]) return { kind: 'keep' }
    // Any other value is never the move here.
    return { kind: 'pick', index: outcome.index }
  },
  pickGroupLabel: 'Values: pick a[j] to shift it right, or the key to insert it here',
  pickedLine: (index, value) => `a[${String(index)}] = ${String(value)} picked.`,
  words: {
    explorer: {
      act: 'Slide it right',
      keep: 'Stop here',
      questionHint: 'If it is, it slides right to make room.',
      right: 'Right!',
      shown: 'Here’s the answer',
      wrongLead: 'Not this time. Have another look.',
      helpLead: 'Here’s a hint.',
      progress: 'Question',
      found: 'Slides found',
      questions: 'Questions',
    },
    engineer: {
      act: 'Shift',
      keep: 'Insert here',
      questionHint: 'Shift: tap a[j]. Not bigger (or equal): Insert here (K).',
      right: 'Correct.',
      shown: 'The move',
      wrongLead: 'Not the move the algorithm makes here.',
      helpLead: 'A hint.',
      progress: 'Comparison',
      found: 'Shifts',
      questions: 'Comparisons',
    },
  },
  challenge: (level, challenge, count, name) => {
    if (level === 'engineer') {
      if (challenge.decisions === 0) {
        return ['Fewer than two values: nothing to compare. Try more numbers.']
      }
      const intro = `You make every decision for these ${String(count)} values: shift a[j] right, or insert the key here.`
      if (challenge.trades === 0) {
        return [
          intro,
          `Already sorted: ${name.toLowerCase()} makes no shifts here, one comparison per pass. Can you confirm them all?`,
        ]
      }
      return [
        intro,
        `${name} makes ${plural(challenge.trades, 'shift', 'shifts')} here. Can you find every one?`,
      ]
    }
    if (challenge.decisions === 0) {
      return ['With fewer than two numbers there’s nothing to compare. Try more numbers!']
    }
    const intro = `Put these ${String(count)} numbers in order, one new one at a time.`
    if (challenge.trades === 0) {
      return [
        intro,
        `These are already in order! Each new one stops at its first check. Can you stop them all?`,
      ]
    }
    return [
      intro,
      `${name} needs ${plural(challenge.trades, 'slide', 'slides')} for these numbers. Can you find them all?`,
    ]
  },
  finish: (level, challenge, firstTry, name) => {
    const { decisions, trades } = challenge
    const perfect = firstTry === decisions
    if (level === 'engineer') {
      if (decisions === 0) return { title: 'Nothing to sort.', lines: ['Try more numbers.'] }
      const did = `${plural(trades, 'shift', 'shifts')} and ${plural(decisions, 'comparison', 'comparisons')}: exactly ${name.toLowerCase()}’s path.`
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
    if (decisions === 0) return { title: 'Nothing to sort!', lines: ['Try more numbers to play.'] }
    const did = `${plural(trades, 'slide', 'slides')}, the same as ${name.toLowerCase()}.`
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

/**
 * Merge sort, at each comparison: which front goes next, the left half's or the right half's?
 * The smaller one moves up; equal fronts take the left one (the sort is stable). There is no
 * question at a split or when a half has run out. Explorer answers Left (L) or Right (R);
 * Engineer taps the front that goes next.
 */
const WHICH_NEXT: DecisionKindSpec = {
  keys: { act: 'L', keep: 'R' },
  icons: { act: 'up', keep: 'up' },
  choice: (answer, decision) => ({
    kind: 'pick',
    index: answer === 'act' ? decision.pair[0] : decision.pair[1],
  }),
  pick: 'single',
  pickChoice: (outcome) =>
    outcome.kind === 'single' ? { kind: 'pick', index: outcome.index } : { kind: 'keep' },
  pickGroupLabel: 'Values: pick the front that goes next',
  pickedLine: (index, value) => `${String(value)} at column ${String(index)} picked.`,
  pickRow: 'buffer',
  tapOnly: true,
  found: 'moves',
  words: {
    explorer: {
      act: 'Left one',
      keep: 'Right one',
      questionHint: 'Smaller one first. Same? Left one first.',
      right: 'Right!',
      shown: 'Here’s the answer',
      wrongLead: 'Not this time. Have another look.',
      helpLead: 'Here’s a hint.',
      progress: 'Question',
      found: 'Moved up',
      questions: 'Questions',
    },
    engineer: {
      act: 'Take left',
      keep: 'Take right',
      questionHint: 'Tap the front that goes next: left[i] if left[i] <= right[j], else right[j].',
      right: 'Correct.',
      shown: 'The move',
      wrongLead: 'Not the move the algorithm makes here.',
      helpLead: 'A hint.',
      progress: 'Comparison',
      found: 'Moves',
      questions: 'Comparisons',
    },
  },
  challenge: (level, challenge, count, name) => {
    if (level === 'engineer') {
      if (challenge.decisions === 0) {
        return ['Fewer than two values: nothing to merge. Try more numbers.']
      }
      return [
        `You make every decision for these ${String(count)} values: which front of the two halves goes next.`,
        `${name} makes ${plural(challenge.decisions, 'comparison', 'comparisons')} here. Can you get every one?`,
      ]
    }
    if (challenge.decisions === 0) {
      return ['With fewer than two numbers there’s nothing to put together. Try more numbers!']
    }
    return [
      `Put these ${String(count)} numbers in order: they split into piles, then you choose which goes next as the piles go back together.`,
      `There are ${plural(challenge.decisions, 'question', 'questions')}. Can you get them all?`,
    ]
  },
  finish: (level, challenge, firstTry, name) => {
    const { decisions } = challenge
    const perfect = firstTry === decisions
    if (level === 'engineer') {
      if (decisions === 0) return { title: 'Nothing to sort.', lines: ['Try more numbers.'] }
      const did = `${plural(decisions, 'comparison', 'comparisons')}: exactly ${name.toLowerCase()}’s path.`
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
    if (decisions === 0) return { title: 'Nothing to sort!', lines: ['Try more numbers to play.'] }
    if (perfect) {
      return {
        title: 'You sorted it!',
        lines: [`All ${String(decisions)} on the first try! A perfect run.`],
      }
    }
    return {
      title: 'You sorted it!',
      lines: [
        `${String(firstTry)} of ${String(decisions)} on the first try!`,
        'Play again and go for a perfect run?',
      ],
    }
  },
}

/**
 * Quick sort, at each comparison: does a[j] go left of the pivot (smaller or equal) or stay
 * right (bigger)? Left swaps it to the wall, a[i], the first value of the bigger zone (or
 * itself, when there is none yet). Explorer answers Left side (L) or Right side (R); Engineer
 * taps a[j], then its slot a[i] (a[j] twice when it is its own slot), or Keep order (K) for right.
 * Placing the pivot is forced, so it is never asked.
 */
const LEFT_OR_RIGHT: DecisionKindSpec = {
  keys: { act: 'L', keep: 'R', engineerKeep: 'K' },
  icons: { act: 'left', keep: 'right' },
  choice: (answer, decision) =>
    answer === 'keep' ? { kind: 'keep' } : { kind: 'trade', pair: decision.pair },
  pick: 'value-then-slot',
  pickChoice: (outcome) =>
    outcome.kind === 'pair' ? { kind: 'trade', pair: outcome.pair } : { kind: 'keep' },
  pickGroupLabel: 'Values: pick a[j], then its slot a[i]',
  pickedLine: (index, value) =>
    `a[${String(index)}] = ${String(value)} picked. Pick its slot a[i] (itself if i == j); Esc lets go.`,
  found: 'moves',
  words: {
    explorer: {
      act: 'Left side',
      keep: 'Right side',
      questionHint: 'Smaller than the leader, or the same: left. Bigger: right.',
      right: 'Right!',
      shown: 'Here’s the answer',
      wrongLead: 'Not this time. Have another look.',
      helpLead: 'Here’s a hint.',
      progress: 'Question',
      found: 'Trades',
      questions: 'Questions',
    },
    engineer: {
      act: 'Swap',
      keep: 'Keep order',
      questionHint: 'a[j] <= pivot: tap a[j], then its slot a[i]. Otherwise Keep order (K).',
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
        return ['Fewer than two values: nothing to partition. Try more numbers.']
      }
      return [
        `You make every partition decision for these ${String(count)} values: does a[j] go left of the pivot (swap to a[i]) or stay right? Placing the pivot is done for you.`,
        `${name} makes ${plural(challenge.decisions, 'comparison', 'comparisons')} here. Can you get every one?`,
      ]
    }
    if (challenge.decisions === 0) {
      return ['With fewer than two numbers there’s nothing to compare. Try more numbers!']
    }
    return [
      `Put these ${String(count)} numbers in order: each group gets a leader, and you choose which side of it every other number goes.`,
      `There are ${plural(challenge.decisions, 'question', 'questions')}. Can you get them all?`,
    ]
  },
  finish: (level, challenge, firstTry, name) => {
    const { decisions, trades } = challenge
    const perfect = firstTry === decisions
    if (level === 'engineer') {
      if (decisions === 0) return { title: 'Nothing to sort.', lines: ['Try more numbers.'] }
      const did = `${plural(decisions, 'comparison', 'comparisons')}, ${String(trades)} to the left: exactly ${name.toLowerCase()}’s path.`
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
    if (decisions === 0) return { title: 'Nothing to sort!', lines: ['Try more numbers to play.'] }
    const did =
      'Every leader landed in its spot, with the smaller ones on its left and the bigger ones on its right.'
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
  'new-smallest': NEW_SMALLEST,
  'to-front': TO_FRONT,
  'shift-or-stop': SHIFT_OR_STOP,
  'which-next': WHICH_NEXT,
  'left-or-right': LEFT_OR_RIGHT,
}

/** The kind an algorithm's questions are, from its frames (the first decision's kind). */
export function doItKindOf(
  frames: readonly { readonly decision?: Decision | undefined }[],
): DecisionKind {
  return frames.find((frame) => frame.decision)?.decision?.kind ?? 'trade-or-keep'
}
