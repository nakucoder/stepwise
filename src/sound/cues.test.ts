import { describe, expect, it } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame } from '../engine/types'
import { BOB_STAGGER_MS, SPLASH_AT, swapDurationMs } from '../lib/motion'
import { cuesForStep, finaleRates, PAIR_GAP_MS, quackPair, VOICE_MS } from './cues'
import { rankFrequencies } from './pitch'

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
const pitch = (f: Frame, index: number) => rankFrequencies(f.array)[index]
const SPEEDS_MS = [1600, 800, 400, 200]

describe('cuesForStep: ducks quack', () => {
  it('a comparison: two quacks at the recording’s own pitch, one after the other', () => {
    const { gap, first, second } = quackPair(800)
    expect(cuesForStep(ASK, START, 'forward', 'ducks', 800)).toEqual([
      { voice: 'quack', rate: 1, at: 0, duration: first },
      { voice: 'quack', rate: 1, at: gap, duration: second },
    ])
  })

  it('at 1× and slower, the second quack starts after the first has finished', () => {
    for (const delay of [1600, 800]) {
      const { gap, first, second } = quackPair(delay)
      expect(first).toBe(VOICE_MS.quack)
      expect(second).toBe(VOICE_MS.quack)
      expect(gap).toBeGreaterThan(VOICE_MS.quack)
    }
  })

  it('at every speed, both quacks fit in the step (cut short at 2× and 4×)', () => {
    for (const delay of SPEEDS_MS) {
      const { gap, first, second } = quackPair(delay)
      expect(first).toBeLessThanOrEqual(gap)
      expect(gap + second).toBeLessThan(delay)
      expect(second).toBeGreaterThan(0)
    }
    expect(quackPair(200).first).toBeLessThan(VOICE_MS.quack)
  })

  it('a trade: the pair of quacks, then a splash as the duck lands', () => {
    const notes = cuesForStep(SWAP, ASK, 'forward', 'ducks', 800)
    expect(notes.map((n) => n.voice)).toEqual(['quack', 'quack', 'splash'])
    expect(notes[2]).toEqual({ voice: 'splash', at: Math.round(swapDurationMs(800) * SPLASH_AT) })
    // At 4×, the splash still lands with the (shorter) hop.
    expect(cuesForStep(SWAP, ASK, 'forward', 'ducks', 200)[2]?.at).toBe(
      Math.round(swapDurationMs(200) * SPLASH_AT),
    )
  })

  it('sorted: a rising scale of quacks, in time with the bob, within one octave', () => {
    const sorted = frame(firstSorted)
    const notes = cuesForStep(sorted, frame(firstSorted - 1), 'forward', 'ducks', 800)
    expect(notes).toHaveLength(sorted.array.length)
    expect(notes.every((n) => n.voice === 'quack')).toBe(true)
    expect(notes.map((n) => n.at)).toEqual(sorted.array.map((_, k) => k * BOB_STAGGER_MS))
    const rates = notes.map((n) => n.rate ?? 0)
    expect(rates).toEqual([...rates].sort((a, b) => a - b))
    expect(Math.max(...rates) / Math.min(...rates)).toBeLessThanOrEqual(2)
  })
})

describe('finaleRates', () => {
  it('rises with the values, spans at most one octave, and keeps 12 values distinct', () => {
    const rates = finaleRates([0, 3, 7, 12, 18, 23, 34, 45, 50, 61, 88, 95])
    expect(new Set(rates).size).toBe(12)
    expect(rates).toEqual([...rates].sort((a, b) => a - b))
    expect((rates.at(-1) ?? 0) / (rates[0] ?? 1)).toBeLessThanOrEqual(2)
  })

  it('stays around the recording’s natural pitch', () => {
    const rates = finaleRates([1, 2, 3, 5, 8, 9])
    expect(rates[0]).toBeLessThan(1)
    expect(rates.at(-1)).toBeGreaterThan(1)
  })
})

describe('cuesForStep: bars blip', () => {
  it('a comparison: both values, left then right, higher for the bigger one', () => {
    expect(cuesForStep(ASK, START, 'forward', 'bars', 800)).toEqual([
      { voice: 'blip', frequency: pitch(ASK, 0), at: 0 },
      { voice: 'blip', frequency: pitch(ASK, 1), at: PAIR_GAP_MS },
    ])
    expect(pitch(ASK, 0)).toBeGreaterThan(pitch(ASK, 1) ?? 0)
  })

  it('bars never splash or quack', () => {
    const notes = cuesForStep(SWAP, ASK, 'forward', 'bars', 800)
    expect(notes.map((n) => n.voice)).toEqual(['blip', 'blip'])
    const sorted = cuesForStep(frame(firstSorted), frame(firstSorted - 1), 'forward', 'bars', 800)
    expect(sorted.every((n) => n.voice === 'blip')).toBe(true)
  })
})

describe('cuesForStep: when', () => {
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
