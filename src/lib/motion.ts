/**
 * Timings shared by the stage's motion and its sounds, so a splash is heard as the duck
 * lands and the sorted scale rises in step with the bob.
 */

/** The longest a swap may take, so it never drags at slow speeds. */
export const MAX_SWAP_MS = 450

/** How long a swap animates at a given step delay: 60% of the step, never over 450ms. */
export function swapDurationMs(stepDelayMs: number): number {
  return Math.min(MAX_SWAP_MS, stepDelayMs * 0.6)
}

/** The splash starts this far through the swap, as the hopping duck lands. */
export const SPLASH_AT = 0.75

/** Each duck starts its happy bob this long after the one to its left (see StageDucks.css). */
export const BOB_STAGGER_MS = 110
