/**
 * Which sounds a step makes. Pure: given the frame now on screen, how the learner got there,
 * and the look, it returns notes to schedule. Sound is never the only signal: every cue here
 * repeats something the stage already shows in words and color.
 */
import type { Frame } from '../engine/types'
import { BOB_STAGGER_MS, SPLASH_AT, swapDurationMs } from '../lib/motion'
import type { Look } from '../preferences/preferences'
import { rankFrequencies, rankNotes } from './pitch'

/**
 * The sound kinds. Ducks plip softly when compared, and the hopping duck quacks once per trade,
 * then splashes down; bars blip. (Do it mode will add its own.)
 */
export type Voice = 'quack' | 'plip' | 'blip' | 'splash'

export interface Note {
  readonly voice: Voice
  /** Hz, for the plip and the blip. */
  readonly frequency?: number
  /** Playback speed of the quack recording: 1 is its natural pitch, 2 an octave up. */
  readonly rate?: number
  /** Vary this quack a little each time (pitch and speed), so repeats never sound identical. */
  readonly vary?: boolean
  /** When to start, in ms after the step. */
  readonly at: number
  /** Cut the sound short after this many ms, with a quick fade. Absent: its full length. */
  readonly duration?: number
}

/** How the learner reached this frame. Jumps (Home/End, Run, a preset, a fresh start) are silent. */
export type Move = 'forward' | 'back' | 'jump'

/** The second blip of a pair sounds this long after the first, so both are heard. */
export const PAIR_GAP_MS = 70
/** The second plip of a pair: after the first has rung out, and inside a 4× step. */
export const PLIP_GAP_MS = 100

/** How long each voice lasts at most; nothing piles up. The quack is the recording's length. */
export const VOICE_MS: Readonly<Record<Voice, number>> = {
  quack: 225,
  plip: 80,
  blip: 60,
  splash: 240,
}

/** Room left at the end of a step, so a cut sound has faded before the next step begins. */
const STEP_MARGIN_MS = 10

/** The trade's quack: full length, or cut to fit a fast step. */
export function tradeQuackMs(stepDelayMs: number): number {
  return Math.min(VOICE_MS.quack, stepDelayMs - STEP_MARGIN_MS)
}

/** The plip's pitch for each value: rising by rank over one octave, a soft drop of water. */
const PLIP_LOW_HZ = 520
export function plipFrequencies(values: readonly number[]): number[] {
  return rankNotes(values, FINALE_SEMITONES).map((note) => PLIP_LOW_HZ * 2 ** (note / 12))
}

/** The finale scale's span: one octave, in semitones, around the quack's natural pitch. */
export const FINALE_SEMITONES = 12
const FINALE_LOWEST = -5

/** The quack's playback rate for each value in the finale: rising by rank, one octave at most. */
export function finaleRates(values: readonly number[]): number[] {
  return rankNotes(values, FINALE_SEMITONES).map((note) => 2 ** ((note + FINALE_LOWEST) / 12))
}

const allSorted = (frame: Frame | null): boolean =>
  frame !== null &&
  frame.array.length > 0 &&
  (frame.highlights.sorted?.length ?? 0) === frame.array.length

/**
 * The notes for arriving at `frame` from `previous`. The scale plays once, on the step that
 * first has everything sorted (not again on later sorted frames).
 *
 * Ducks quack rarely, so each quack is fun: a comparison is two quiet plips (bigger values a
 * little higher), and only the duck that hops quacks, once per trade, before its splash. Bars
 * blip at a pitch set by each value's rank, so bigger values sound higher.
 */
export function cuesForStep(
  frame: Frame,
  previous: Frame | null,
  move: Move,
  look: Look,
  stepDelayMs: number,
): Note[] {
  if (move === 'jump') return []
  const isDucks = look === 'ducks'
  const leftFirst = (indices: readonly number[]) => [...indices].sort((a, b) => a - b).slice(0, 2)

  const swapping = frame.highlights.swapping ?? []
  if (swapping.length === 2) {
    if (isDucks) {
      // The bigger value's duck hops over the other: it quacks as it takes off, then splashes.
      return [
        { voice: 'quack', rate: 1, vary: true, at: 0, duration: tradeQuackMs(stepDelayMs) },
        { voice: 'splash', at: Math.round(swapDurationMs(stepDelayMs) * SPLASH_AT) },
      ]
    }
    const pitches = rankFrequencies(frame.array)
    return leftFirst(swapping).map((index, k) => ({
      voice: 'blip',
      frequency: pitches[index],
      at: k * PAIR_GAP_MS,
    }))
  }

  const comparing = frame.highlights.comparing ?? []
  if (comparing.length === 2) {
    const pitches = isDucks ? plipFrequencies(frame.array) : rankFrequencies(frame.array)
    return leftFirst(comparing).map((index, k) => ({
      voice: isDucks ? 'plip' : 'blip',
      frequency: pitches[index],
      at: k * (isDucks ? PLIP_GAP_MS : PAIR_GAP_MS),
    }))
  }

  // Everything in its final spot: a rising scale, left to right, in time with the bob.
  if (move === 'forward' && allSorted(frame) && !allSorted(previous)) {
    if (isDucks) {
      return finaleRates(frame.array).map((rate, index) => ({
        voice: 'quack',
        rate,
        at: index * BOB_STAGGER_MS,
      }))
    }
    const pitches = rankFrequencies(frame.array)
    return frame.array.map((_, index) => ({
      voice: 'blip',
      frequency: pitches[index],
      at: index * BOB_STAGGER_MS,
    }))
  }

  return []
}
