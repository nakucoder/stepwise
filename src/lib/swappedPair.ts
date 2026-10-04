/**
 * If `next` is `previous` with exactly two positions exchanged, returns those positions
 * (lower first); otherwise null. Used to animate a swap, whether stepping forward into it
 * or backward out of it. Anything else (no change, a jump, a different length) is null.
 */
export function swappedPair(
  previous: readonly number[],
  next: readonly number[],
): readonly [number, number] | null {
  if (previous.length !== next.length) return null
  const changed: number[] = []
  for (let k = 0; k < next.length; k++) {
    if (previous[k] !== next[k]) {
      changed.push(k)
      if (changed.length > 2) return null
    }
  }
  const [a, b] = changed
  if (a === undefined || b === undefined) return null
  return previous[a] === next[b] && previous[b] === next[a] ? [a, b] : null
}
