/**
 * Which sounds a step makes. Pure: given the frame now on screen, how the learner got there,
 * and the look, it returns notes to schedule. Sound is never the only signal: every cue here
 * repeats something the stage already shows in words and color.
 */
import type { Frame } from '../engine/types'
import { BOB_STAGGER_MS, SPLASH_AT, swapDurationMs } from '../lib/motion'
import type { StageLook } from '../characters/registry'
import { rankFrequencies, rankNotes } from './pitch'

/**
 * The sound kinds. Comparisons blip, for ducks and bars alike. On a trade the duck that hops
 * quacks once, then lands on its lily pad with a drop of water; bars blip. Do it mode adds a
 * bright chime for a right move and a soft, low hum for "try again" (never a buzzer).
 */
export type Voice = 'quack' | 'blip' | 'drop' | 'chime' | 'hum'

export interface Note {
  readonly voice: Voice
  /** Hz, for the blip, the drop, the chime and the hum. */
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

/** How long each voice lasts at most; nothing piles up. The quack is the recording's length. */
export const VOICE_MS: Readonly<Record<Voice, number>> = {
  quack: 225,
  blip: 60,
  drop: 100,
  chime: 160,
  hum: 260,
}

/** Room left at the end of a step, so a cut sound has faded before the next step begins. */
const STEP_MARGIN_MS = 10

/** The trade's quack: full length, or cut to fit a fast step. */
export function tradeQuackMs(stepDelayMs: number): number {
  return Math.min(VOICE_MS.quack, stepDelayMs - STEP_MARGIN_MS)
}

/** The drop of water as a duck lands: one soft, clear note that leaps up. */
export const DROP_HZ = 620

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
 * Ducks quack rarely, so each quack is fun: only the duck that hops quacks, once per trade,
 * and it lands with a drop of water. Comparisons blip, at a pitch set by each value's rank, so
 * bigger values sound higher.
 */
export function cuesForStep(
  frame: Frame,
  previous: Frame | null,
  move: Move,
  look: StageLook,
  stepDelayMs: number,
): Note[] {
  if (move === 'jump') return []
  // The character on the stage, if one is showing (bubble sort's ducks have their own sounds).
  const character = look === 'bars' ? null : look
  const isDucks = character === 'ducks'
  const leftFirst = (indices: readonly number[]) => [...indices].sort((a, b) => a - b).slice(0, 2)

  const swapping = frame.highlights.swapping ?? []
  if (swapping.length === 2) {
    if (isDucks) {
      // The bigger value's duck hops over the other: it quacks as it takes off, then lands on
      // its lily pad with a drop of water.
      return [
        { voice: 'quack', rate: 1, vary: true, at: 0, duration: tradeQuackMs(stepDelayMs) },
        {
          voice: 'drop',
          frequency: DROP_HZ,
          at: Math.round(swapDurationMs(stepDelayMs) * SPLASH_AT),
        },
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
    const pitches = rankFrequencies(frame.array)
    return leftFirst(comparing).map((index, k) => ({
      voice: 'blip',
      frequency: pitches[index],
      at: k * PAIR_GAP_MS,
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

// ---------- Do it mode ----------

/** A right move: two bright notes going up (G5, then C6). */
export const CORRECT: readonly Note[] = [
  { voice: 'chime', frequency: 783.99, at: 0 },
  { voice: 'chime', frequency: 1046.5, at: 80 },
]

/** A wrong move: one soft, low hum that dips a little. Gentle, never a buzzer. */
export const TRY_AGAIN: readonly Note[] = [{ voice: 'hum', frequency: 330, at: 0 }]

/** How long after the chime's start the hopping duck quacks, so the two don't collide. */
export const CHIME_LEAD_MS = 120

/**
 * The sounds of a right move in Do it mode: the chime, then the answer step's own sounds. The
 * blips are dropped (the learner just made that comparison themselves), and the quack waits for
 * the chime; the drop still lands with the duck.
 */
export function rightMoveCues(stepNotes: readonly Note[]): Note[] {
  return [
    ...CORRECT,
    ...stepNotes
      .filter((note) => note.voice !== 'blip')
      .map((note) =>
        note.voice === 'quack'
          ? {
              ...note,
              at: note.at + CHIME_LEAD_MS,
              ...(note.duration === undefined
                ? {}
                : { duration: Math.max(0, note.duration - CHIME_LEAD_MS) }),
            }
          : note,
      ),
  ]
}
