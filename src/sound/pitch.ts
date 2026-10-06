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
 * The note (0 to `notes` - 1) for each value of `values`, by rank: the smallest different
 * value gets the lowest note and the biggest the highest, the rest spaced evenly between. A
 * list with only one different value sits in the middle.
 */
export function rankNotes(values: readonly number[], notes: number = SCALE_NOTES): number[] {
  const distinct = [...new Set(values)].sort((a, b) => a - b)
  const top = notes - 1
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
