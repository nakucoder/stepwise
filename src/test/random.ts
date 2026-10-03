/**
 * A small seeded random number generator (mulberry32) for tests, so "random" inputs are the
 * same on every run and any failure can be reproduced.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `count` arrays of random length [0, maxLength] with whole numbers in [min, max]. */
export function randomArrays(
  seed: number,
  count: number,
  { maxLength, min, max }: { maxLength: number; min: number; max: number },
): number[][] {
  const random = seededRandom(seed)
  const int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1))
  return Array.from({ length: count }, () =>
    Array.from({ length: int(0, maxLength) }, () => int(min, max)),
  )
}
