import type { Choice, Frame } from './types'

const sameArray = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((value, k) => value === b[k])

/**
 * The correct move at decision frame `k`, read from the frame right after it: `trade` if that
 * frame has the pair's two values swapped and nothing else changed, `keep` if nothing
 * changed. Null when frame `k` is not a decision, or the next frame doesn't answer it.
 */
export function answerAt(frames: readonly Frame[], k: number): Choice | null {
  const ask = frames[k]
  const answer = frames[k + 1]
  if (!ask?.decision || !answer) return null
  const [i, j] = ask.decision.pair
  if (sameArray(ask.array, answer.array)) return { kind: 'keep' }
  const traded = [...ask.array]
  traded[i] = ask.array[j] ?? 0
  traded[j] = ask.array[i] ?? 0
  return sameArray(traded, answer.array) ? { kind: 'trade', pair: [i, j] } : null
}

/** Whether `choice` is the correct move at decision frame `k`. A pair counts in either order. */
export function isRightChoice(frames: readonly Frame[], k: number, choice: Choice): boolean {
  const answer = answerAt(frames, k)
  if (!answer || answer.kind !== choice.kind) return false
  if (answer.kind === 'keep' || choice.kind === 'keep') return true
  const [a, b] = answer.pair
  const [c, d] = choice.pair
  return (a === c && b === d) || (a === d && b === c)
}

/** The indexes of every decision frame, in order. */
export function decisionIndexes(frames: readonly Frame[]): number[] {
  return frames.flatMap((frame, k) => (frame.decision ? [k] : []))
}
