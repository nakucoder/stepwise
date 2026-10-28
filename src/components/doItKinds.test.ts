import { describe, expect, it } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { heapSort } from '../algorithms/sorting/heapSort'
import { quickSort } from '../algorithms/sorting/quickSort'
import { selectionSort } from '../algorithms/sorting/selectionSort'
import { answerAt, askedAt, decisionIndexes, isRightChoice } from '../engine/decision'
import { challengeOf } from '../engine/doIt'
import { randomArrays } from '../test/random'
import { collectFrames } from '../engine/collect'
import { findJargon } from '../engine/jargon'
import type { Choice, Decision } from '../engine/types'
import { DO_IT_KINDS, doItKindOf, pickOutcome } from './doItKinds'

const TRADE_OR_KEEP = DO_IT_KINDS['trade-or-keep']
const DECISION: Decision = { kind: 'trade-or-keep', pair: [2, 3] }

describe('the Do it table', () => {
  it('knows seven kinds: trade or keep, selection sort’s two, insertion sort’s shift or stop, merge sort’s which goes next, quick sort’s left or right and heap sort’s sift or stop', () => {
    expect(Object.keys(DO_IT_KINDS)).toEqual([
      'trade-or-keep',
      'new-smallest',
      'to-front',
      'shift-or-stop',
      'which-next',
      'left-or-right',
      'sift-or-stop',
    ])
  })

  it('each kind picks its answers’ icons: what each answer does', () => {
    expect(
      Object.fromEntries(Object.entries(DO_IT_KINDS).map(([k, spec]) => [k, spec.icons])),
    ).toEqual({
      'trade-or-keep': { act: 'trade', keep: 'keep' },
      'new-smallest': { act: 'target', keep: 'arrow' },
      'to-front': { act: 'trade', keep: 'keep' },
      'shift-or-stop': { act: 'arrow', keep: 'keep' },
      'which-next': { act: 'up', keep: 'up' },
      'left-or-right': { act: 'left', keep: 'right' },
      'sift-or-stop': { act: 'up', keep: 'keep' },
    })
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

describe('selection sort: every move a learner can make, at every question', () => {
  const inputs = [
    [5, 2, 8, 1, 9, 3],
    [1, 2, 3, 4],
    [4, 3, 2, 1],
    [2, 5, 2],
    [3, 3, 3],
    ...randomArrays(1332, 40, { maxLength: 8, min: 0, max: 9 }),
  ]

  it.each(inputs.map((input) => [input.join(' '), input] as const))(
    'only the right move is accepted, in both levels: %s',
    (_, input) => {
      const { frames } = collectFrames(selectionSort, input)
      for (const k of decisionIndexes(frames)) {
        const decision = frames[k]?.decision
        const answer = answerAt(frames, k)
        if (!decision || !answer) throw new Error('every decision is answered')
        const spec = DO_IT_KINDS[decision.kind]
        const right = (choice: Choice) => isRightChoice(frames, k, choice)

        // Explorer: exactly one of its two buttons.
        const explorer = (['act', 'keep'] as const).filter((a) => right(spec.choice(a, decision)))
        expect(explorer).toEqual([answer.kind === 'keep' ? 'keep' : 'act'])

        // Engineer: Keep, or a tap (new smallest) or two taps (to the front) on the stage.
        const taps: [string, Choice][] = []
        for (let a = 0; a < input.length; a++) {
          const first = pickOutcome(spec.pick, null, a)
          if (first.kind === 'single')
            taps.push([`tap ${String(a)}`, spec.pickChoice(first, decision)])
          if (first.kind !== 'hold') continue
          for (let b = 0; b < input.length; b++) {
            const second = pickOutcome(spec.pick, a, b)
            if (second.kind === 'pair') {
              taps.push([`tap ${String(a)} ${String(b)}`, spec.pickChoice(second, decision)])
            }
          }
        }
        const accepted = [
          ...(right({ kind: 'keep' }) ? ['keep'] : []),
          ...taps.filter(([, choice]) => right(choice)).map(([name]) => name),
        ]
        const [i, j] = decision.pair
        const expected =
          decision.kind === 'new-smallest'
            ? answer.kind === 'keep'
              ? ['keep', `tap ${String(i)}`]
              : [`tap ${String(j)}`]
            : answer.kind === 'keep'
              ? ['keep']
              : [`tap ${String(i)} ${String(j)}`, `tap ${String(j)} ${String(i)}`]
        expect(accepted).toEqual(expected)
      }
    },
  )

  it('already sorted: every end-of-round answer is keep', () => {
    const { frames } = collectFrames(selectionSort, [1, 2, 2, 5, 7])
    const ends = decisionIndexes(frames).filter((k) => frames[k]?.decision?.kind === 'to-front')
    expect(ends).toHaveLength(4)
    for (const k of ends) expect(answerAt(frames, k)).toEqual({ kind: 'keep' })
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

  it('value then slot: a value, then any slot; the same value again names it only as its own slot', () => {
    const apart: Decision = { kind: 'left-or-right', pair: [1, 3] }
    const itself: Decision = { kind: 'left-or-right', pair: [2, 2] }
    expect(pickOutcome('value-then-slot', null, 3, apart)).toEqual({ kind: 'hold', index: 3 })
    expect(pickOutcome('value-then-slot', 3, 1, apart)).toEqual({ kind: 'pair', pair: [1, 3] })
    expect(pickOutcome('value-then-slot', 3, 3, apart)).toEqual({ kind: 'let-go' })
    expect(pickOutcome('value-then-slot', 2, 2, itself)).toEqual({ kind: 'pair', pair: [2, 2] })
    expect(pickOutcome('value-then-slot', 3, 3, itself)).toEqual({ kind: 'let-go' })
    // The other rules never name a value as its own pair.
    expect(pickOutcome('any-two', 2, 2, itself)).toEqual({ kind: 'let-go' })
  })
})

describe('quick sort’s row: left or right of the pivot', () => {
  const LEFT_OR_RIGHT = DO_IT_KINDS['left-or-right']

  it('Explorer answers Left side (L) or Right side (R); Engineer taps a[j] then a[i], or Keep order', () => {
    expect(LEFT_OR_RIGHT.keys).toEqual({ act: 'L', keep: 'R', engineerKeep: 'K' })
    // The other kinds' Engineer Keep is their keep key.
    const others = Object.entries(DO_IT_KINDS).filter(([k]) => k !== 'left-or-right')
    expect(others.every(([, spec]) => spec.keys.engineerKeep === undefined)).toBe(true)
    expect(LEFT_OR_RIGHT.words.explorer.act).toBe('Left side')
    expect(LEFT_OR_RIGHT.words.explorer.keep).toBe('Right side')
    expect(LEFT_OR_RIGHT.words.engineer.keep).toBe('Keep order')
    expect(LEFT_OR_RIGHT.pick).toBe('value-then-slot')
    expect(LEFT_OR_RIGHT.tapOnly).toBeUndefined()
    const decision: Decision = { kind: 'left-or-right', pair: [1, 3] }
    expect(LEFT_OR_RIGHT.choice('act', decision)).toEqual({ kind: 'trade', pair: [1, 3] })
    expect(LEFT_OR_RIGHT.choice('keep', decision)).toEqual({ kind: 'keep' })
  })

  it('counts every swap of the run (the leader’s placements too), like merge sort’s moves', () => {
    expect(LEFT_OR_RIGHT.found).toBe('moves')
  })

  it('reads the kind from quick sort’s frames', () => {
    expect(doItKindOf(collectFrames(quickSort, [5, 2, 8, 1, 9, 3]).frames)).toBe('left-or-right')
  })

  it('the challenge and the finish count the questions, at both levels, in plain words for Explorer', () => {
    const challenge = { decisions: 8, trades: 3 }
    const explorer = LEFT_OR_RIGHT.challenge('explorer', challenge, 6, 'Quick sort')
    expect(explorer).toEqual([
      'Put these 6 numbers in order: each group gets a leader, and you choose which side of it every other number goes.',
      'There are 8 questions. Can you get them all?',
    ])
    expect(LEFT_OR_RIGHT.challenge('engineer', challenge, 6, 'Quick sort')[1]).toBe(
      'Quick sort makes 8 comparisons here. Can you get every one?',
    )
    expect(LEFT_OR_RIGHT.finish('explorer', challenge, 8, 'Quick sort').lines).toContain(
      'All 8 on the first try! A perfect run.',
    )
    expect(LEFT_OR_RIGHT.finish('engineer', challenge, 7, 'Quick sort').lines).toEqual([
      '8 comparisons, 3 to the left: exactly quick sort’s path.',
      '7 of 8 decisions right first time.',
      'Run it again for a perfect run?',
    ])
    const texts = [
      ...explorer,
      ...LEFT_OR_RIGHT.finish('explorer', challenge, 5, 'Quick sort').lines,
      ...Object.values(LEFT_OR_RIGHT.words.explorer),
    ]
    for (const text of texts) expect(findJargon(text), text).toBeNull()
  })
})

describe('quick sort: every move a learner can make, at every question', () => {
  const inputs = [
    [5, 2, 8, 1, 9, 3],
    [1, 2, 3, 4],
    [4, 3, 2, 1],
    [2, 5, 2],
    [3, 3, 3],
    ...randomArrays(1961, 40, { maxLength: 8, min: 0, max: 9 }),
  ]

  it.each(inputs.map((input) => [input.join(' '), input] as const))(
    'only the right move is accepted, in both levels: %s',
    (_, input) => {
      const { frames } = collectFrames(quickSort, input)
      for (const k of decisionIndexes(frames)) {
        const decision = frames[k]?.decision
        const answer = answerAt(frames, k)
        if (!decision || !answer) throw new Error('every decision is answered')
        const spec = DO_IT_KINDS[decision.kind]
        const right = (choice: Choice) => isRightChoice(frames, k, choice)

        // Explorer: exactly one of its two buttons.
        const explorer = (['act', 'keep'] as const).filter((a) => right(spec.choice(a, decision)))
        expect(explorer).toEqual([answer.kind === 'keep' ? 'keep' : 'act'])

        // Engineer: Keep order, or a[j] then its slot a[i] (either order; a[j] twice when i == j).
        const accepted: string[] = []
        if (right({ kind: 'keep' })) accepted.push('keep')
        for (let a = 0; a < input.length; a++) {
          const first = pickOutcome(spec.pick, null, a, decision)
          if (first.kind !== 'hold') continue
          for (let b = 0; b < input.length; b++) {
            const second = pickOutcome(spec.pick, a, b, decision)
            if (second.kind === 'pair' && right(spec.pickChoice(second, decision))) {
              accepted.push(`tap ${String(a)} ${String(b)}`)
            }
          }
        }
        const [i, j] = decision.pair
        const expected =
          answer.kind === 'keep'
            ? ['keep']
            : i === j
              ? [`tap ${String(j)} ${String(j)}`]
              : [`tap ${String(i)} ${String(j)}`, `tap ${String(j)} ${String(i)}`]
        expect(accepted).toEqual(expected)
      }
    },
  )
})

describe('heap sort’s row: does the bigger one climb up, or does the top stay?', () => {
  const SIFT_OR_STOP = DO_IT_KINDS['sift-or-stop']

  it('Explorer answers Climb up (T) or Stay on top (K); Engineer taps the child that climbs, or Stop (K)', () => {
    expect(SIFT_OR_STOP.keys).toEqual({ act: 'T', keep: 'K' })
    expect(SIFT_OR_STOP.words.explorer.act).toBe('Climb up')
    expect(SIFT_OR_STOP.words.explorer.keep).toBe('Stay on top')
    expect(SIFT_OR_STOP.words.engineer.keep).toBe('Stop')
    expect(SIFT_OR_STOP.pick).toBe('child')
    expect(SIFT_OR_STOP.tapOnly).toBeUndefined()
    expect(SIFT_OR_STOP.found).toBe('moves')
    const decision: Decision = { kind: 'sift-or-stop', pair: [1, 4] }
    expect(SIFT_OR_STOP.choice('act', decision)).toEqual({ kind: 'trade', pair: [1, 4] })
    expect(SIFT_OR_STOP.choice('keep', decision)).toEqual({ kind: 'keep' })
  })

  it('the child rule: one tap is the move; the child climbs, the parent stays, anything else never', () => {
    const decision: Decision = { kind: 'sift-or-stop', pair: [1, 4] }
    const tap = (index: number) => {
      const outcome = pickOutcome('child', null, index, decision)
      if (outcome.kind !== 'single') throw new Error('one tap is the move')
      return SIFT_OR_STOP.pickChoice(outcome, decision)
    }
    expect(tap(4)).toEqual({ kind: 'trade', pair: [1, 4] })
    expect(tap(1)).toEqual({ kind: 'keep' })
    // The smaller child, 3, would climb past its parent: never the move.
    expect(tap(3)).toEqual({ kind: 'trade', pair: [1, 3] })
  })

  it('reads the kind from heap sort’s frames', () => {
    expect(doItKindOf(collectFrames(heapSort, [5, 2, 8, 1, 9, 3]).frames)).toBe('sift-or-stop')
  })

  it('the challenge and the finish, at both levels, in plain words for Explorer', () => {
    const explorer = { decisions: 5, trades: 4 }
    expect(SIFT_OR_STOP.challenge('explorer', explorer, 6, 'Heap sort')).toEqual([
      'Put these 6 numbers in order. Watch the pyramid being built, then each time the top goes to its place at the end, you choose: does the bigger one climb up, or does the top stay?',
      'There are 5 questions. Can you get them all?',
    ])
    expect(SIFT_OR_STOP.challenge('engineer', { decisions: 9, trades: 6 }, 6, 'Heap sort')[1]).toBe(
      'Heap sort makes 6 sift swaps in 9 sift steps here. Can you find every one?',
    )
    expect(SIFT_OR_STOP.finish('explorer', explorer, 5, 'Heap sort').lines).toEqual([
      'Every top went to its place at the end, and 4 bigger ones climbed up.',
      'All 5 on the first try! A perfect run.',
    ])
    expect(
      SIFT_OR_STOP.finish('engineer', { decisions: 9, trades: 6 }, 8, 'Heap sort').lines,
    ).toEqual([
      '6 sift swaps in 9 sift steps: exactly heap sort’s path.',
      '8 of 9 decisions right first time.',
      'Run it again for a perfect run?',
    ])
    // Two numbers: Explorer only watches (the one question is the build's).
    expect(challengeOf(askedAt(collectFrames(heapSort, [2, 1]).frames, 'explorer'))).toEqual({
      decisions: 0,
      trades: 0,
    })
    expect(SIFT_OR_STOP.challenge('explorer', { decisions: 0, trades: 0 }, 2, 'Heap sort')).toEqual(
      [
        'With fewer than three numbers there are no questions: just watch the pyramid. Try more numbers to play!',
      ],
    )
    const texts = [
      ...SIFT_OR_STOP.challenge('explorer', explorer, 6, 'Heap sort'),
      ...SIFT_OR_STOP.challenge('explorer', { decisions: 0, trades: 0 }, 2, 'Heap sort'),
      ...SIFT_OR_STOP.finish('explorer', explorer, 4, 'Heap sort').lines,
      ...SIFT_OR_STOP.finish('explorer', { decisions: 0, trades: 0 }, 0, 'Heap sort').lines,
      ...Object.values(SIFT_OR_STOP.words.explorer),
    ]
    for (const text of texts) expect(findJargon(text), text).toBeNull()
  })
})

describe('heap sort: every move a learner can make, at every question', () => {
  const inputs = [
    [5, 2, 8, 1, 9, 3],
    [1, 2, 3, 4],
    [4, 3, 2, 1],
    [2, 5, 2],
    [3, 3, 3],
    ...randomArrays(1962, 40, { maxLength: 8, min: 0, max: 9 }),
  ]

  it.each(inputs.map((input) => [input.join(' '), input] as const))(
    'only the right move is accepted, in both levels: %s',
    (_, input) => {
      for (const level of ['explorer', 'engineer'] as const) {
        const frames = askedAt(collectFrames(heapSort, input).frames, level)
        for (const k of decisionIndexes(frames)) {
          const decision = frames[k]?.decision
          const answer = answerAt(frames, k)
          if (!decision || !answer) throw new Error('every decision is answered')
          // Explorer is asked only while taking the top.
          if (level === 'explorer') expect(frames[k]?.heap?.phase).toBe('extract')
          const spec = DO_IT_KINDS[decision.kind]
          const right = (choice: Choice) => isRightChoice(frames, k, choice)
          const explorer = (['act', 'keep'] as const).filter((a) => right(spec.choice(a, decision)))
          expect(explorer).toEqual([answer.kind === 'keep' ? 'keep' : 'act'])
          // Engineer: Stop, or one tap on any value.
          const accepted = [
            ...(right({ kind: 'keep' }) ? ['keep'] : []),
            ...input.flatMap((_, x) => {
              const tap = pickOutcome(spec.pick, null, x, decision)
              return tap.kind === 'single' && right(spec.pickChoice(tap, decision))
                ? [`tap ${String(x)}`]
                : []
            }),
          ]
          const [parent, child] = decision.pair
          expect(accepted).toEqual(
            answer.kind === 'keep' ? ['keep', `tap ${String(parent)}`] : [`tap ${String(child)}`],
          )
        }
      }
    },
  )
})
