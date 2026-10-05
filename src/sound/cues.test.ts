import { describe, expect, it } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame } from '../engine/types'
import { BOB_STAGGER_MS, SPLASH_AT, swapDurationMs } from '../lib/motion'
import { cuesForStep, pairGapMs, VOICE_MS } from './cues'
import { pairFrequencies } from './pitch'

const FRAMES = collectFrames(bubbleSort, DEFAULT_INPUT).frames
const frame = (index: number): Frame => {
  const found = FRAMES[index]
  if (!found) throw new Error(`no frame ${String(index)}`)
  return found
}
// [5, 2, 8, 1, 9, 3]: frame 1 compares 5 and 2; frame 2 swaps them.
const START = frame(0)
const ASK = frame(1)
const SWAP = frame(2)
const LAST = FRAMES.length - 1
const firstSorted = FRAMES.findIndex((f) => (f.highlights.sorted?.length ?? 0) === f.array.length)
const pairOf = (f: Frame) => pairFrequencies(f.array, 0, 1)

describe('cuesForStep', () => {
  it('a comparison: both values, left then right, at their pitches', () => {
    expect(cuesForStep(ASK, START, 'forward', 'ducks', 800)).toEqual([
      { voice: 'squeak', frequency: pairOf(ASK)[0], at: 0 },
      { voice: 'squeak', frequency: pairOf(ASK)[1], at: pairGapMs(800) },
    ])
    // 5 is bigger than 2, so the left squeak is the higher one.
    expect(pairOf(ASK)[0]).toBeGreaterThan(pairOf(ASK)[1])
  })

  it('bars blip instead of squeaking, with the same pitches', () => {
    const notes = cuesForStep(ASK, START, 'forward', 'bars', 800)
    expect(notes.map((n) => n.voice)).toEqual(['blip', 'blip'])
    expect(notes.map((n) => n.frequency)).toEqual(pairOf(ASK))
  })

  it('a trade: the pair in their new places, and (ducks) a splash as the duck lands', () => {
    const notes = cuesForStep(SWAP, ASK, 'forward', 'ducks', 800)
    expect(notes.slice(0, 2)).toEqual([
      { voice: 'squeak', frequency: pairOf(SWAP)[0], at: 0 },
      { voice: 'squeak', frequency: pairOf(SWAP)[1], at: pairGapMs(800) },
    ])
    expect(notes[2]).toEqual({ voice: 'splash', at: Math.round(swapDurationMs(800) * SPLASH_AT) })
    // At 4×, the splash still lands with the (shorter) hop.
    expect(cuesForStep(SWAP, ASK, 'forward', 'ducks', 200)[2]?.at).toBe(
      Math.round(swapDurationMs(200) * SPLASH_AT),
    )
  })

  it('the two notes of a pair are heard one after the other, at every speed', () => {
    for (const delay of [1600, 800, 400]) {
      expect(pairGapMs(delay)).toBeGreaterThanOrEqual(VOICE_MS.squeak)
    }
    // At 4×, both still fit in the 200ms step.
    expect(pairGapMs(200) + VOICE_MS.squeak).toBeLessThan(200)
  })

  it('bars never splash', () => {
    const notes = cuesForStep(SWAP, ASK, 'forward', 'bars', 800)
    expect(notes.map((n) => n.voice)).toEqual(['blip', 'blip'])
  })

  it('sorted: a rising scale, left to right, in time with the bob', () => {
    const sorted = frame(firstSorted)
    const notes = cuesForStep(sorted, frame(firstSorted - 1), 'forward', 'ducks', 800)
    expect(notes).toHaveLength(sorted.array.length)
    expect(notes.map((n) => n.at)).toEqual(sorted.array.map((_, k) => k * BOB_STAGGER_MS))
    const frequencies = notes.map((n) => n.frequency ?? 0)
    expect(frequencies).toEqual([...frequencies].sort((a, b) => a - b))
  })

  it('plays the scale once: not again on later sorted frames', () => {
    if (firstSorted < LAST) {
      expect(cuesForStep(frame(LAST), frame(LAST - 1), 'forward', 'ducks', 800)).toEqual([])
    }
  })

  it('stepping back one step plays that step’s sound', () => {
    expect(cuesForStep(ASK, SWAP, 'back', 'ducks', 800)).toHaveLength(2)
    expect(cuesForStep(SWAP, frame(3), 'back', 'ducks', 800)).toHaveLength(3)
  })

  it('jumps stay silent: Home, End, Run, presets, a fresh start', () => {
    expect(cuesForStep(ASK, null, 'jump', 'ducks', 800)).toEqual([])
    expect(cuesForStep(frame(LAST), START, 'jump', 'ducks', 800)).toEqual([])
  })

  it('steps with nothing to compare or trade make no sound', () => {
    expect(cuesForStep(START, null, 'forward', 'ducks', 800)).toEqual([])
  })
})
