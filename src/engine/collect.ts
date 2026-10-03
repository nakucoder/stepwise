import type { Algorithm, Frame } from './types'

/**
 * Far above any input the UI allows (bubble sort on 20 numbers is about 400 frames),
 * so it only ever stops a buggy algorithm that never finishes.
 */
export const DEFAULT_MAX_FRAMES = 10_000

export interface CollectedFrames {
  readonly frames: readonly Frame[]
  /** True if the algorithm had more frames than the cap allowed; `frames` is then partial. */
  readonly truncated: boolean
}

/**
 * Runs an algorithm's generator to completion and collects every frame, so the player can
 * step backward as easily as forward. Stops at `maxFrames` and closes the generator, so an
 * endless or runaway algorithm can't freeze the page.
 */
export function collectFrames(
  algorithm: Pick<Algorithm, 'run'>,
  input: readonly number[],
  { maxFrames = DEFAULT_MAX_FRAMES }: { maxFrames?: number } = {},
): CollectedFrames {
  if (!Number.isInteger(maxFrames) || maxFrames < 1) {
    throw new RangeError(`maxFrames must be a positive integer, got ${String(maxFrames)}`)
  }

  const frames: Frame[] = []
  const generator = algorithm.run(input)

  for (;;) {
    const result = generator.next()
    if (result.done) return { frames, truncated: false }
    if (frames.length === maxFrames) {
      // There is at least one frame beyond the cap: stop the generator and report it.
      generator.return()
      return { frames, truncated: true }
    }
    frames.push(result.value)
  }
}
