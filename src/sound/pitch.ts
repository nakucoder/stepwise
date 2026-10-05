/**
 * Bigger values sound higher. A value's pitch comes from its rank among the different values
 * in the current list, spread over a pentatonic scale: the whole range is used whatever the
 * numbers are, equal values sound the same, different values always sound different, and
 * any order sounds pleasant (pentatonic notes never clash).
 */

/** Semitones above the scale's root for each note of a major pentatonic octave. */
const PENTATONIC = [0, 2, 4, 7, 9] as const

/** Three octaves of the scale: enough for 12 different values to get 12 different notes. */
export const SCALE_NOTES = 15

/** The lowest note, E4. The highest (note 14) is about 2,220 Hz, still pleasant on a phone. */
export const ROOT_HZ = 329.63

/** The frequency of note `index` (0 = lowest) of the scale. */
export function noteFrequency(index: number): number {
  const octave = Math.floor(index / PENTATONIC.length)
  const step = PENTATONIC[index % PENTATONIC.length] ?? 0
  return ROOT_HZ * 2 ** ((12 * octave + step) / 12)
}

/**
 * The scale note for each value of `values`, by rank: the smallest different value gets the
 * lowest note and the biggest the highest, the rest spaced evenly between. A list with only
 * one different value sits in the middle of the scale.
 */
export function rankNotes(values: readonly number[]): number[] {
  const distinct = [...new Set(values)].sort((a, b) => a - b)
  const top = SCALE_NOTES - 1
  const noteOf = new Map(
    distinct.map((value, rank) => [
      value,
      distinct.length === 1
        ? Math.floor(top / 2)
        : Math.round((rank * top) / (distinct.length - 1)),
    ]),
  )
  return values.map((value) => noteOf.get(value) ?? 0)
}

/** The frequency for each value of `values` (see rankNotes). */
export function rankFrequencies(values: readonly number[]): number[] {
  return rankNotes(values).map(noteFrequency)
}

/**
 * Two different values compared side by side always sound at least this many scale notes
 * apart (3 is about a fifth), so the higher one is easy to hear even when the two values are
 * neighbors in a long list. Equal values still sound the same.
 */
export const MIN_PAIR_STEPS = 3

/** The frequencies of values[i] and values[j] when they sound as a pair (see MIN_PAIR_STEPS). */
export function pairFrequencies(values: readonly number[], i: number, j: number): [number, number] {
  const notes = rankNotes(values)
  const a = notes[i] ?? 0
  const b = notes[j] ?? 0
  if (a === b) return [noteFrequency(a), noteFrequency(b)]
  const top = SCALE_NOTES - 1
  let low = Math.min(a, b)
  let high = Math.max(a, b)
  const short = MIN_PAIR_STEPS - (high - low)
  if (short > 0) {
    // Push both outward around their middle, then back inside the scale if needed.
    low -= Math.floor(short / 2)
    high += Math.ceil(short / 2)
    if (low < 0) {
      high -= low
      low = 0
    }
    if (high > top) {
      low -= high - top
      high = top
    }
  }
  return a < b
    ? [noteFrequency(low), noteFrequency(high)]
    : [noteFrequency(high), noteFrequency(low)]
}
