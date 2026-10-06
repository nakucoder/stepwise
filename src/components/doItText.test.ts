import { describe, expect, it } from 'vitest'
import { findJargon } from '../engine/jargon'
import { challengeLines, DO_IT_WORDS, doItWords, finishLines, pickedLine } from './doItText'

const CHALLENGES = [
  { decisions: 14, trades: 7 },
  { decisions: 3, trades: 1 },
  { decisions: 2, trades: 0 },
  { decisions: 0, trades: 0 },
]

describe('Do it words (Explorer)', () => {
  it('the challenge counts trades, and says when the numbers are already in order', () => {
    expect(challengeLines({ decisions: 14, trades: 7 }, 6, 'Bubble sort')).toEqual([
      'Put these 6 numbers in order, one question at a time.',
      'Bubble sort needs 7 trades for these numbers. Can you find them all?',
    ])
    expect(challengeLines({ decisions: 3, trades: 1 }, 3, 'Bubble sort')[1]).toContain('1 trade ')
    expect(challengeLines({ decisions: 2, trades: 0 }, 3, 'Bubble sort')[1]).toContain(
      'already in order',
    )
  })

  it('the finish celebrates a perfect run, and otherwise invites one, never a grade', () => {
    expect(finishLines({ decisions: 14, trades: 7 }, 14, 'Bubble sort').lines).toEqual([
      '7 trades, the same as bubble sort.',
      'All 14 on the first try! A perfect run.',
    ])
    const { lines } = finishLines({ decisions: 14, trades: 7 }, 12, 'Bubble sort')
    expect(lines).toContain('12 of 14 on the first try!')
    expect(lines).toContain('Play again and go for a perfect run?')
    for (const line of lines) expect(line).not.toMatch(/score|wrong|mistake|fail|%/i)
  })

  it('reads plainly: no jargon anywhere', () => {
    const all = [
      ...Object.values(DO_IT_WORDS),
      ...CHALLENGES.flatMap((c) => challengeLines(c, 6, 'Bubble sort')),
      ...CHALLENGES.flatMap((c) => {
        const { title, lines } = finishLines(c, Math.floor(c.decisions / 2), 'Bubble sort')
        return [title, ...lines]
      }),
    ]
    for (const text of all) expect(findJargon(text), text).toBeNull()
  })

  it('Engineer: precise words, the same encouraging shape', () => {
    expect(challengeLines({ decisions: 14, trades: 7 }, 6, 'Bubble sort', 'engineer')).toEqual([
      'You make every decision for these 6 values: swap the pair, or keep its order.',
      'Bubble sort makes 7 swaps here. Can you find every one?',
    ])
    expect(finishLines({ decisions: 14, trades: 7 }, 14, 'Bubble sort', 'engineer')).toEqual({
      title: 'Sorted.',
      lines: [
        '7 swaps and 14 comparisons: exactly bubble sort’s path.',
        'All 14 decisions right first time. A perfect run.',
      ],
    })
    const { lines } = finishLines({ decisions: 14, trades: 7 }, 13, 'Bubble sort', 'engineer')
    expect(lines).toContain('13 of 14 decisions right first time.')
    expect(lines).toContain('Run it again for a perfect run?')
    expect(doItWords('engineer').keep).toBe('Keep order')
    expect(pickedLine(2, 8)).toBe('a[2] = 8 picked. Pick a neighbor to swap with it; Esc lets go.')
  })
})
