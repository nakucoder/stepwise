import { describe, expect, it } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { insertionSort } from '../algorithms/sorting/insertionSort'
import { mergeSort } from '../algorithms/sorting/mergeSort'
import { quickSort } from '../algorithms/sorting/quickSort'
import { selectionSort } from '../algorithms/sorting/selectionSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame } from '../engine/types'
import { cartCuesForStep } from '../sound/cartCues'
import { barCues, cuesForStep, type CueContext, type Move } from '../sound/cues'
import { robotCuesForStep } from '../sound/robotCues'
import { spaceshipCuesForStep } from '../sound/spaceshipCues'
import { CHARACTERS } from './registry'

const BUBBLE = collectFrames(bubbleSort, DEFAULT_INPUT).frames
const SELECTION = collectFrames(selectionSort, DEFAULT_INPUT).frames
const INSERTION = collectFrames(insertionSort, DEFAULT_INPUT).frames
const MERGE = collectFrames(mergeSort, DEFAULT_INPUT).frames
const QUICK = collectFrames(quickSort, DEFAULT_INPUT).frames

/** Every step of a run, each way the learner can reach it, at every speed and motion setting. */
function contexts(frames: readonly Frame[]): CueContext[] {
  const all: CueContext[] = []
  frames.forEach((_, index) => {
    for (const move of ['forward', 'back', 'jump'] as const satisfies readonly Move[]) {
      const from =
        move === 'jump' ? null : (frames[move === 'forward' ? index - 1 : index + 1] ?? null)
      for (const stepDelayMs of [1600, 800, 400, 200]) {
        for (const reducedMotion of [false, true]) {
          all.push({ frames, index, from, move, stepDelayMs, reducedMotion })
        }
      }
    }
  })
  return all
}

describe('character sounds from the registry', () => {
  it('the ducks, the robots and the penguins have their own', () => {
    expect(CHARACTERS.ducks.cues).toBeTypeOf('function')
    expect(CHARACTERS.robot.cues).toBeTypeOf('function')
    expect(CHARACTERS.penguins.cues).toBeTypeOf('function')
  })

  it('the ducks’ entry plays exactly the step’s cues with the ducks', () => {
    const cues = CHARACTERS.ducks.cues
    if (!cues) throw new Error('the ducks have cues')
    for (const c of contexts(BUBBLE)) {
      const frame = c.frames[c.index]
      if (!frame) throw new Error('a frame')
      expect(cues(c)).toEqual(cuesForStep(frame, c.from, c.move, 'ducks', c.stepDelayMs))
    }
  })

  it('the robots’ entry plays exactly their own cues, reduced motion included', () => {
    const cues = CHARACTERS.robot.cues
    if (!cues) throw new Error('the robots have cues')
    for (const c of contexts(SELECTION)) {
      expect(cues(c)).toEqual(
        robotCuesForStep(c.frames, c.index, c.move, c.stepDelayMs, c.reducedMotion),
      )
    }
  })

  it('the spaceships’ entry plays exactly their own cues, reduced motion included', () => {
    const cues = CHARACTERS.spaceships.cues
    if (!cues) throw new Error('the spaceships have cues')
    for (const c of contexts(MERGE)) {
      expect(cues(c)).toEqual(
        spaceshipCuesForStep(c.frames, c.index, c.move, c.stepDelayMs, c.reducedMotion),
      )
    }
    // Their own, never the bars' blips.
    const all = contexts(MERGE).flatMap((c) => cues(c))
    expect(all.length).toBeGreaterThan(0)
    expect(all.every((note) => note.voice.startsWith('ship-'))).toBe(true)
  })

  it('the pizza cart’s entry plays exactly its own cues, reduced motion included', () => {
    const cues = CHARACTERS.pizzaCart.cues
    if (!cues) throw new Error('the pizza cart has cues')
    for (const c of contexts(QUICK)) {
      expect(cues(c)).toEqual(
        cartCuesForStep(c.frames, c.index, c.move, c.stepDelayMs, c.reducedMotion),
      )
    }
    // Its own, never the bars' blips.
    const all = contexts(QUICK).flatMap((c) => cues(c))
    expect(all.length).toBeGreaterThan(0)
    expect(all.every((note) => note.voice.startsWith('cart-'))).toBe(true)
  })

  it('quick sort as bars keeps the bars’ sounds: blips and the bars’ finale, nothing of the cart’s', () => {
    const all = contexts(QUICK).flatMap((c) => {
      const frame = c.frames[c.index]
      if (!frame) throw new Error('a frame')
      expect(barCues(c)).toEqual(cuesForStep(frame, c.from, c.move, 'bars', c.stepDelayMs))
      return barCues(c)
    })
    expect(all.length).toBeGreaterThan(0)
    expect(all.every((note) => note.voice === 'blip')).toBe(true)
  })

  it('bars, and a character without its own, play the step’s cues as bars', () => {
    for (const frames of [BUBBLE, SELECTION, INSERTION]) {
      for (const c of contexts(frames)) {
        const frame = c.frames[c.index]
        if (!frame) throw new Error('a frame')
        const asBars = cuesForStep(frame, c.from, c.move, 'bars', c.stepDelayMs)
        expect(barCues(c)).toEqual(asBars)
        // What the penguins' algorithm plays until they have sounds of their own.
        expect(cuesForStep(frame, c.from, c.move, 'penguins', c.stepDelayMs)).toEqual(asBars)
      }
    }
  })

  it('a step past the end of the run is silent', () => {
    const c: CueContext = {
      frames: BUBBLE,
      index: BUBBLE.length,
      from: null,
      move: 'forward',
      stepDelayMs: 800,
      reducedMotion: false,
    }
    expect(barCues(c)).toEqual([])
    expect(CHARACTERS.ducks.cues?.(c)).toEqual([])
    expect(CHARACTERS.robot.cues?.(c)).toEqual([])
  })
})
