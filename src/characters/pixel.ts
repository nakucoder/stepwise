/**
 * The rules every pixel-art character shares: how a sprite becomes SVG, how big its pixels are,
 * and how its moves fit the player's steps. Each character keeps its own numbers (its sprite
 * grids, its scene's size, its moves' lengths) and passes them in.
 */
import { BASE_STEP_DELAY_MS } from '../engine/player'

/** One SVG path for every pixel of the given codes, each a 1 × 1 square. */
export function spritePath(rows: readonly string[], ...codes: readonly string[]): string {
  let d = ''
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (codes.includes(row.charAt(x))) d += `M${String(x)} ${String(y)}h1v1h-1z`
    }
  })
  return d
}

/**
 * Screen pixels per sprite pixel: how many times the sprite's own size fits, rounded to a whole
 * number so the pixels stay sharp, from 1 (never disappears) to `max`.
 */
export function pixelScale(fit: number, max: number): number {
  return Math.max(1, Math.min(max, Math.round(fit)))
}

/**
 * A frequent move fitted inside the step: its own length, but never longer than `share` of the
 * step, so it is over before the next one begins.
 */
export function fitMs(specMs: number, stepDelayMs: number, share = 0.9): number {
  return Math.min(specMs, stepDelayMs * share)
}

/**
 * The special move (the robots' carry): its full length at 1× and at slower speeds, divided by
 * the speed above 1×. The step waits for it.
 */
export function specialMs(specMs: number, stepDelayMs: number): number {
  return specMs * Math.min(1, stepDelayMs / BASE_STEP_DELAY_MS)
}
