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
  /** The tallest field seen (a field under half of it is a different stage). */
  readonly tallest: number
  /** Each step's tallest height, by step. */
  readonly steps: Readonly<Record<number, number>>
  /** The step a measure counts for when the caller names none (each measure is a new one). */
  readonly next: number
}

/**
 * The height a scene's sizes come from (the ships', the pizza boxes'): the shortest the field has
 * been over the steps of this run at this width, so a size never changes from one step to the
 * next while the stage's height follows the explanation beside it.
 *
 * Each step counts with its tallest height: a squeeze within a step (Do it's message and hint, a
 * measure before the layout settles) never becomes the run's size, so nothing stays stuck at the
 * smallest seen; while it lasts the sizes fit the field as it is, and the room comes back when
 * it goes. A field under half the tallest is a different stage (the strip beside an open sheet
 * on a phone): it uses its own height and is not kept. A field with no height is never kept.
 */
export function stableHeight(
  memory: SizeMemory | null,
  width: number,
  height: number,
  step?: number,
): { readonly memory: SizeMemory; readonly sizeHeight: number } {
  const fresh = !memory || memory.width !== width
  const at = step ?? (fresh ? 0 : memory.next)
  if (height <= 0 || width <= 0) {
    return { memory: memory ?? { width, tallest: 0, steps: {}, next: 0 }, sizeHeight: height }
  }
  const tallest = Math.max(fresh ? 0 : memory.tallest, height)
  const before = fresh ? {} : memory.steps
  if (height < tallest / 2) {
    return { memory: { width, tallest, steps: before, next: at + 1 }, sizeHeight: height }
  }
  const steps = { ...before, [at]: Math.max(before[at] ?? 0, height) }
  const shortest = Math.min(...Object.values(steps).filter((h) => h >= tallest / 2))
  return {
    memory: { width, tallest, steps, next: at + 1 },
    sizeHeight: Math.min(shortest, height),
  }
}
