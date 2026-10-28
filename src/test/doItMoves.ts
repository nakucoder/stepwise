import { answerAt, decisionIndexes } from '../engine/decision'
import type { Frame } from '../engine/types'

/**
 * Do it's right move at every question, in order, as "asked pair → answer": "0 1 → trade 0 1",
 * "1 2 → keep" or "1 3 → pick 3". Tests compare it with a sequence traced by hand.
 */
export function doItMoves(frames: readonly Frame[]): string[] {
  return decisionIndexes(frames).map((k) => {
    const [i, j] = frames[k]?.decision?.pair ?? []
    const answer = answerAt(frames, k)
    const move =
      answer === null
        ? 'unanswered'
        : answer.kind === 'trade'
          ? `trade ${answer.pair.join(' ')}`
          : answer.kind === 'pick'
            ? `pick ${String(answer.index)}`
            : 'keep'
    return `${String(i)} ${String(j)} → ${move}`
  })
}
