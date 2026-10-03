import { describe, expect, it } from 'vitest'
import { collectFrames, DEFAULT_MAX_FRAMES } from './collect'
import type { Algorithm, Frame } from './types'

function frame(step: number): Frame {
  return {
    array: [step],
    highlights: {},
    activeLine: null,
    explanation: { explorer: `Step ${String(step)}`, engineer: `Step ${String(step)}` },
    stats: { comparisons: step, swaps: 0 },
  }
}

/** A fake algorithm that yields `count` frames (or never stops if count is Infinity). */
function yielding(count: number): Pick<Algorithm, 'run'> & { finished: () => boolean } {
  let finished = false
  return {
    finished: () => finished,
    *run() {
      try {
        for (let step = 0; step < count; step++) yield frame(step)
      } finally {
        finished = true
      }
    },
  }
}

describe('collectFrames', () => {
  it('collects every frame in order', () => {
    const { frames, truncated } = collectFrames(yielding(3), [])
    expect(frames.map((f) => f.stats.comparisons)).toEqual([0, 1, 2])
    expect(truncated).toBe(false)
  })

  it('handles an algorithm that yields no frames', () => {
    expect(collectFrames(yielding(0), [])).toEqual({ frames: [], truncated: false })
  })

  it('is not truncated when the frame count equals the cap exactly', () => {
    const { frames, truncated } = collectFrames(yielding(5), [], { maxFrames: 5 })
    expect(frames).toHaveLength(5)
    expect(truncated).toBe(false)
  })

  it('stops at the cap and reports truncation when there are more frames', () => {
    const { frames, truncated } = collectFrames(yielding(6), [], { maxFrames: 5 })
    expect(frames).toHaveLength(5)
    expect(truncated).toBe(true)
  })

  it('stops an endless algorithm at the default cap and closes its generator', () => {
    const endless = yielding(Infinity)
    const { frames, truncated } = collectFrames(endless, [])
    expect(frames).toHaveLength(DEFAULT_MAX_FRAMES)
    expect(truncated).toBe(true)
    expect(endless.finished()).toBe(true)
  })

  it('passes the input to the algorithm', () => {
    const echo: Pick<Algorithm, 'run'> = {
      *run(input) {
        yield { ...frame(0), array: [...input] }
      },
    }
    expect(collectFrames(echo, [4, 2]).frames[0]?.array).toEqual([4, 2])
  })

  it.each([0, -1, 1.5, Number.NaN])('rejects a maxFrames of %s', (maxFrames) => {
    expect(() => collectFrames(yielding(1), [], { maxFrames })).toThrow(RangeError)
  })
})
