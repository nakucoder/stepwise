/**
 * Which sounds a step makes. Pure: given the frame now on screen, how the learner got there,
 * and the look, it returns notes to schedule. Sound is never the only signal: every cue here
 * repeats something the stage already shows in words and color.
 */
import type { Frame } from '../engine/types'
import { BOB_STAGGER_MS, SPLASH_AT, swapDurationMs } from '../lib/motion'
import type { Look } from '../preferences/preferences'
import { pairFrequencies, rankFrequencies } from './pitch'

/** The sound kinds. Ducks squeak and splash; bars blip. (Do it mode will add its own.) */
export type Voice = 'squeak' | 'blip' | 'splash'

export interface Note {
  readonly voice: Voice
  /** Hz; absent for the splash, which is noise. */
  readonly frequency?: number
  /** When to start, in ms after the step. */
  readonly at: number
}

/** How the learner reached this frame. Jumps (Home/End, Run, a preset, a fresh start) are silent. */
export type Move = 'forward' | 'back' | 'jump'

/** How long each voice lasts; the engine plays them this long, and nothing piles up. */
export const VOICE_MS: Readonly<Record<Voice, number>> = { squeak: 100, blip: 60, splash: 150 }

/**
 * The second of a pair starts this long after the first: after it has ended at 1× and 2×, so
 * the two notes are heard one by one, and early enough at 4× that both fit in the step.
 */
export function pairGapMs(stepDelayMs: number): number {
  return Math.min(140, Math.round(stepDelayMs * 0.35))
}

const allSorted = (frame: Frame | null): boolean =>
  frame !== null &&
  frame.array.length > 0 &&
  (frame.highlights.sorted?.length ?? 0) === frame.array.length

/**
 * The notes for arriving at `frame` from `previous`. The scale plays once, on the step that
 * first has everything sorted (not again on later sorted frames).
 */
export function cuesForStep(
  frame: Frame,
  previous: Frame | null,
  move: Move,
  look: Look,
  stepDelayMs: number,
): Note[] {
  if (move === 'jump') return []
  const tone: Voice = look === 'ducks' ? 'squeak' : 'blip'
  const pair = (indices: readonly number[]): Note[] => {
    const [left = 0, right = 0] = [...indices].sort((a, b) => a - b)
    const [first, second] = pairFrequencies(frame.array, left, right)
    return [
      { voice: tone, frequency: first, at: 0 },
      { voice: tone, frequency: second, at: pairGapMs(stepDelayMs) },
    ]
  }

  const swapping = frame.highlights.swapping ?? []
  if (swapping.length === 2) {
    // The two values in their new places, then (ducks) the splash as the hopper lands.
    const notes = pair(swapping)
    if (look === 'ducks') {
      notes.push({ voice: 'splash', at: Math.round(swapDurationMs(stepDelayMs) * SPLASH_AT) })
    }
    return notes
  }

  const comparing = frame.highlights.comparing ?? []
  if (comparing.length === 2) return pair(comparing)

  // Everything in its final spot: a rising scale, left to right, in time with the bob.
  if (move === 'forward' && allSorted(frame) && !allSorted(previous)) {
    const pitches = rankFrequencies(frame.array)
    return frame.array.map((_, index) => ({
      voice: tone,
      frequency: pitches[index],
      at: index * BOB_STAGGER_MS,
    }))
  }

  return []
}
