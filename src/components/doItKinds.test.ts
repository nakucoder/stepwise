import { describe, expect, it } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { selectionSort } from '../algorithms/sorting/selectionSort'
import { challengeOf } from '../engine/doIt'
import { collectFrames } from '../engine/collect'
import { findJargon } from '../engine/jargon'
import type { Decision } from '../engine/types'
import { DO_IT_KINDS, doItKindOf, pickOutcome } from './doItKinds'

const TRADE_OR_KEEP = DO_IT_KINDS['trade-or-keep']
const DECISION: Decision = { kind: 'trade-or-keep', pair: [2, 3] }

describe('the Do it table', () => {
  it('knows three kinds: trade or keep, and selection sort’s new smallest and to the front', () => {
    expect(Object.keys(DO_IT_KINDS)).toEqual(['trade-or-keep', 'new-smallest', 'to-front'])
  })

  it('trade or keep: Explorer answers Trade places (T) or Keep them (K)', () => {
    expect(TRADE_OR_KEEP.keys).toEqual({ act: 'T', keep: 'K' })
    expect(TRADE_OR_KEEP.words.explorer.act).toBe('Trade places')
    expect(TRADE_OR_KEEP.words.explorer.keep).toBe('Keep them')
    expect(TRADE_OR_KEEP.choice('act', DECISION)).toEqual({ kind: 'trade', pair: [2, 3] })
    expect(TRADE_OR_KEEP.choice('keep', DECISION)).toEqual({ kind: 'keep' })
  })

  it('trade or keep: Engineer picks a value then its neighbor, or Keep order', () => {
    expect(TRADE_OR_KEEP.pick).toBe('neighbor')
    expect(TRADE_OR_KEEP.words.engineer.keep).toBe('Keep order')
    expect(TRADE_OR_KEEP.pickGroupLabel).toBe('Values: pick one, then its neighbor to swap them')
    expect(TRADE_OR_KEEP.pickedLine(1, 2)).toBe(
      'a[1] = 2 picked. Pick a neighbor to swap with it; Esc lets go.',
    )
    expect(TRADE_OR_KEEP.pickChoice({ kind: 'pair', pair: [0, 1] })).toEqual({
      kind: 'trade',
      pair: [0, 1],
    })
  })

  it('every word is filled in, for both levels, and Explorer’s pass the jargon check', () => {
    for (const spec of Object.values(DO_IT_KINDS)) {
      for (const level of ['explorer', 'engineer'] as const) {
        for (const word of Object.values(spec.words[level])) expect(word.trim()).not.toBe('')
      }
      for (const word of Object.values(spec.words.explorer)) {
        expect(findJargon(word), word).toBeNull()
      }
    }
  })

  it('reads the kind from the frames (bubble sort: trade or keep)', () => {
    expect(doItKindOf(collectFrames(bubbleSort, [5, 2, 8]).frames)).toBe('trade-or-keep')
    // No decisions at all (one number): the default.
    expect(doItKindOf(collectFrames(bubbleSort, [5]).frames)).toBe('trade-or-keep')
  })
})

describe('selection sort’s rows', () => {
  const NEW_SMALLEST = DO_IT_KINDS['new-smallest']
  const TO_FRONT = DO_IT_KINDS['to-front']

  it('new smallest: Explorer answers New smallest (S) or Keep looking (K)', () => {
    const decision: Decision = { kind: 'new-smallest', pair: [1, 4] }
    expect(NEW_SMALLEST.keys).toEqual({ act: 'S', keep: 'K' })
    expect(NEW_SMALLEST.words.explorer.act).toBe('New smallest')
    expect(NEW_SMALLEST.words.explorer.keep).toBe('Keep looking')
    expect(NEW_SMALLEST.words.explorer.questionHint).toBe('If it is, it becomes the new smallest.')
    expect(NEW_SMALLEST.choice('act', decision)).toEqual({ kind: 'pick', index: 4 })
    expect(NEW_SMALLEST.choice('keep', decision)).toEqual({ kind: 'keep' })
  })

  it('new smallest: Engineer picks one value, the new min', () => {
    expect(NEW_SMALLEST.pick).toBe('single')
    expect(NEW_SMALLEST.pickChoice({ kind: 'single', index: 3 })).toEqual({
      kind: 'pick',
      index: 3,
    })
  })

  it('to the front: trade places or keep them; Engineer picks any two values', () => {
    const decision: Decision = { kind: 'to-front', pair: [0, 4] }
    expect(TO_FRONT.keys).toEqual({ act: 'T', keep: 'K' })
    expect(TO_FRONT.words.explorer.act).toBe('Trade places')
    expect(TO_FRONT.words.explorer.keep).toBe('Keep them')
    expect(TO_FRONT.words.engineer.act).toBe('Swap')
    expect(TO_FRONT.words.engineer.keep).toBe('Keep order')
    expect(TO_FRONT.pick).toBe('any-two')
    expect(TO_FRONT.choice('act', decision)).toEqual({ kind: 'trade', pair: [0, 4] })
    expect(TO_FRONT.pickChoice({ kind: 'pair', pair: [0, 4] })).toEqual({
      kind: 'trade',
      pair: [0, 4],
    })
  })

  it('the two kinds share their counters, so nothing changes name between questions', () => {
    for (const level of ['explorer', 'engineer'] as const) {
      const [a, b] = [NEW_SMALLEST.words[level], TO_FRONT.words[level]]
      expect([a.progress, a.found, a.questions]).toEqual([b.progress, b.found, b.questions])
    }
  })

  it('reads the kind from selection sort’s frames, and counts its swaps as trades', () => {
    const { frames } = collectFrames(selectionSort, [3, 1, 2])
    expect(doItKindOf(frames)).toBe('new-smallest')
    const challenge = challengeOf(frames)
    // 3 comparisons and 2 rounds; round 1 swaps 3 and 1, round 2 swaps 3 and 2.
    expect(challenge).toEqual({ decisions: 5, trades: 2 })
    expect(NEW_SMALLEST.challenge('explorer', challenge, 3, 'Selection sort')[1]).toBe(
      'Selection sort needs 2 trades for these numbers. Can you find them all?',
    )
    expect(NEW_SMALLEST.finish('engineer', challenge, 5, 'Selection sort').lines[0]).toBe(
      '2 swaps and 5 decisions: exactly selection sort’s path.',
    )
  })
})

describe('pick rules', () => {
  it('neighbor: a value, then its neighbor; another value moves the pick', () => {
    expect(pickOutcome('neighbor', null, 3)).toEqual({ kind: 'hold', index: 3 })
    expect(pickOutcome('neighbor', 3, 4)).toEqual({ kind: 'pair', pair: [3, 4] })
    expect(pickOutcome('neighbor', 3, 2)).toEqual({ kind: 'pair', pair: [2, 3] })
    expect(pickOutcome('neighbor', 3, 5)).toEqual({ kind: 'hold', index: 5 })
    expect(pickOutcome('neighbor', 3, 0)).toEqual({ kind: 'hold', index: 0 })
    expect(pickOutcome('neighbor', 3, 3)).toEqual({ kind: 'let-go' })
  })

  it('any-two: a value, then any other value, left first', () => {
    expect(pickOutcome('any-two', null, 4)).toEqual({ kind: 'hold', index: 4 })
    expect(pickOutcome('any-two', 4, 0)).toEqual({ kind: 'pair', pair: [0, 4] })
    expect(pickOutcome('any-two', 0, 5)).toEqual({ kind: 'pair', pair: [0, 5] })
    expect(pickOutcome('any-two', 4, 4)).toEqual({ kind: 'let-go' })
  })

  it('single: one tap is the answer', () => {
    expect(pickOutcome('single', null, 2)).toEqual({ kind: 'single', index: 2 })
    expect(pickOutcome('single', 1, 2)).toEqual({ kind: 'single', index: 2 })
  })
})
