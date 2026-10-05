import { describe, expect, it } from 'vitest'
import { noteFrequency, rankFrequencies, rankNotes, ROOT_HZ, SCALE_NOTES } from './pitch'

describe('pitch', () => {
  it('builds a pentatonic scale that doubles every five notes', () => {
    expect(noteFrequency(0)).toBeCloseTo(ROOT_HZ)
    expect(noteFrequency(5)).toBeCloseTo(ROOT_HZ * 2)
    expect(noteFrequency(10)).toBeCloseTo(ROOT_HZ * 4)
    // Major pentatonic steps: 0, 2, 4, 7, 9 semitones.
    expect(noteFrequency(3) / noteFrequency(0)).toBeCloseTo(2 ** (7 / 12))
  })

  it('gives bigger values higher notes, by rank in the list', () => {
    const values = [5, 2, 8, 1, 9, 3]
    const notes = rankNotes(values)
    const byValue = [...values].sort((a, b) => a - b).map((v) => notes[values.indexOf(v)])
    expect(byValue).toEqual([...byValue].sort((a, b) => (a ?? 0) - (b ?? 0)))
    expect(new Set(notes).size).toBe(6)
  })

  it('uses the whole range, whatever the numbers are', () => {
    expect(Math.min(...rankNotes([1, 2, 3]))).toBe(0)
    expect(Math.max(...rankNotes([1, 2, 3]))).toBe(SCALE_NOTES - 1)
    expect(rankNotes([90, 91, 92])).toEqual(rankNotes([1, 50, 99]))
  })

  it('gives equal values the same note', () => {
    const notes = rankNotes([4, 7, 4, 1, 7])
    expect(notes[0]).toBe(notes[2])
    expect(notes[1]).toBe(notes[4])
    expect(notes[3]).toBeLessThan(notes[0] ?? 0)
  })

  it('keeps 12 different values on 12 different notes, all in range', () => {
    const values = [95, 88, 61, 50, 45, 34, 23, 18, 12, 7, 3, 0]
    const notes = rankNotes(values)
    expect(new Set(notes).size).toBe(12)
    for (const note of notes) {
      expect(note).toBeGreaterThanOrEqual(0)
      expect(note).toBeLessThan(SCALE_NOTES)
    }
  })

  it('puts a list of one value in the middle of the scale', () => {
    expect(rankNotes([6, 6, 6])).toEqual([7, 7, 7])
  })

  it('turns notes into frequencies that rise with the values', () => {
    const frequencies = rankFrequencies([3, 1, 2])
    expect(frequencies[1]).toBeLessThan(frequencies[2] ?? 0)
    expect(frequencies[2]).toBeLessThan(frequencies[0] ?? 0)
  })
})
