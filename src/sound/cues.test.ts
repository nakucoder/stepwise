import { describe, expect, it } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame } from '../engine/types'
import { BOB_STAGGER_MS, SPLASH_AT, swapDurationMs } from '../lib/motion'
import {
  CHIME_LEAD_MS,
  CORRECT,
  cuesForStep,
  DROP_HZ,
  finaleRates,
  PAIR_GAP_MS,
  rightMoveCues,
  tradeQuackMs,
  TRY_AGAIN,
  VOICE_MS,
} from './cues'
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
const LAST_FRAME_SWAPS = frame(LAST).stats.swaps

describe('cuesForStep: ducks', () => {
  it('a comparison: the same soft blips as bars, the bigger value higher, no quacks', () => {
    expect(cuesForStep(ASK, START, 'forward', 'ducks', 800)).toEqual(
      cuesForStep(ASK, START, 'forward', 'bars', 800),
    )
    expect(cuesForStep(ASK, START, 'forward', 'ducks', 800)).toEqual([
      { voice: 'blip', frequency: pitch(ASK, 0), at: 0 },
      { voice: 'blip', frequency: pitch(ASK, 1), at: PAIR_GAP_MS },
    ])
  })

  it('a trade: only the hopping duck quacks, once, varied, then a drop of water as it lands', () => {
    expect(cuesForStep(SWAP, ASK, 'forward', 'ducks', 800)).toEqual([
      { voice: 'quack', rate: 1, vary: true, at: 0, duration: tradeQuackMs(800) },
      { voice: 'drop', frequency: DROP_HZ, at: Math.round(swapDurationMs(800) * SPLASH_AT) },
    ])
    // At 4×, the drop still lands with the (shorter) hop, and ends inside the step.
    const fast = cuesForStep(SWAP, ASK, 'forward', 'ducks', 200)[1]
    expect(fast?.at).toBe(Math.round(swapDurationMs(200) * SPLASH_AT))
    expect((fast?.at ?? 0) + VOICE_MS.drop).toBeLessThan(200)
  })

  it('the trade’s quack plays in full at 1× and is cut to fit faster steps', () => {
    expect(tradeQuackMs(800)).toBe(VOICE_MS.quack)
    expect(tradeQuackMs(1600)).toBe(VOICE_MS.quack)
    for (const delay of SPEEDS_MS) expect(tradeQuackMs(delay)).toBeLessThan(delay)
  })

  it('a whole run quacks once per trade, and never while comparing', () => {
    let quacks = 0
    let firstSortedSeen = false
    FRAMES.forEach((f, k) => {
      if (k === 0) return
      const notes = cuesForStep(f, frame(k - 1), 'forward', 'ducks', 800)
      if (k === firstSorted) {
        firstSortedSeen = true
        return
      }
      quacks += notes.filter((n) => n.voice === 'quack').length
    })
    expect(firstSortedSeen).toBe(true)
    expect(quacks).toBe(LAST_FRAME_SWAPS)
  })

  it('sorted: a rising scale of quacks, in time with the bob, within one octave', () => {
    const sorted = frame(firstSorted)
    const notes = cuesForStep(sorted, frame(firstSorted - 1), 'forward', 'ducks', 800)
    expect(notes).toHaveLength(sorted.array.length)
    expect(notes.every((n) => n.voice === 'quack' && n.vary === undefined)).toBe(true)
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

  it('bars never quack or drop', () => {
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
    expect(cuesForStep(SWAP, frame(3), 'back', 'ducks', 800)).toHaveLength(2)
  })

  it('jumps stay silent: Home, End, Run, presets, a fresh start', () => {
    expect(cuesForStep(ASK, null, 'jump', 'ducks', 800)).toEqual([])
    expect(cuesForStep(frame(LAST), START, 'jump', 'ducks', 800)).toEqual([])
  })

  it('steps with nothing to compare or trade make no sound', () => {
    expect(cuesForStep(START, null, 'forward', 'ducks', 800)).toEqual([])
  })
})

describe('Do it sounds', () => {
  it('a right move: the chime goes up, and the trade’s quack waits for it', () => {
    const trade = cuesForStep(SWAP, ASK, 'forward', 'ducks', 800)
    const notes = rightMoveCues(trade)
    expect(notes.slice(0, 2)).toEqual([...CORRECT])
    expect((CORRECT[1]?.frequency ?? 0) > (CORRECT[0]?.frequency ?? 0)).toBe(true)
    const quack = notes.find((n) => n.voice === 'quack')
    expect(quack?.at).toBe(CHIME_LEAD_MS)
    // The quack still ends when it would have, so it fits the step.
    expect((quack?.at ?? 0) + (quack?.duration ?? 0)).toBe(tradeQuackMs(800))
    // The drop still lands with the duck.
    expect(notes.at(-1)).toEqual(trade[1])
  })

  it('a right "keep": just the chime (the learner made that comparison themselves)', () => {
    expect(rightMoveCues(cuesForStep(ASK, START, 'forward', 'ducks', 800))).toEqual([...CORRECT])
  })

  it('a wrong move: one soft, low note', () => {
    expect(TRY_AGAIN).toHaveLength(1)
    expect(TRY_AGAIN[0]?.voice).toBe('hum')
    expect(TRY_AGAIN[0]?.frequency).toBeLessThan(CORRECT[0]?.frequency ?? 0)
  })
})
