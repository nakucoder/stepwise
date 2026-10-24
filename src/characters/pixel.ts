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

/** What the sizes have been measured against in this run, at this width. */
export interface SizeMemory {
  readonly width: number
  /** The tallest field seen, and the shortest at least half of it. */
  readonly tallest: number
  readonly shortest: number
}

/**
 * The height a scene's sizes come from (the ships', the pizza boxes'): the shortest the field has
 * been in this run at this width, so a size never changes between steps while the stage's height
 * follows the explanation beside it. A field under half the tallest is a different stage (the strip beside
 * an open sheet on a phone): it uses its own height and is not kept.
 */
export function stableHeight(
  memory: SizeMemory | null,
  width: number,
  height: number,
): { readonly memory: SizeMemory; readonly sizeHeight: number } {
  if (!memory || memory.width !== width) {
    return { memory: { width, tallest: height, shortest: height }, sizeHeight: height }
  }
  const tallest = Math.max(memory.tallest, height)
  if (height < tallest / 2) return { memory, sizeHeight: height }
  const shortest = memory.shortest < tallest / 2 ? height : Math.min(memory.shortest, height)
  return { memory: { width, tallest, shortest }, sizeHeight: shortest }
}
