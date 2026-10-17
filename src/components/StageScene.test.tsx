import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type * as Registry from '../characters/registry'
import type { SceneProps } from '../characters/registry'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { collectFrames } from '../engine/collect'
import { Stage } from './Stage'

/** A stand-in scene: what the stage gives it, written out so the test can read it. */
function FakeScene({ frame, frames, index, stepDelayMs, reducedMotion }: SceneProps) {
  return (
    <p data-testid="fake-scene">
      {[frame.array.join(' '), frames.length, index, stepDelayMs, String(reducedMotion)].join(
        ' | ',
      )}
    </p>
  )
}

// The ducks' entry, with the stand-in as its scene: the stage must draw whatever the registry
// gives, with no knowledge of which character it is.
vi.mock('../characters/registry', async (importOriginal) => {
  const original = await importOriginal<typeof Registry>()
  return {
    ...original,
    CHARACTERS: {
      ...original.CHARACTERS,
      ducks: {
        ...original.CHARACTERS.ducks,
        scene: {
          Scene: FakeScene,
          className: 'is-fake',
          viewClass: ({ allSorted }: { allSorted: boolean }) => allSorted && 'is-fake-done',
          symbolsFrom: 2,
        },
      },
    },
  }
})

const FRAMES = collectFrames(bubbleSort, [3, 1, 2]).frames

describe('Stage draws the scene the registry gives', () => {
  it('renders the scene in place of the bars, with the frame and the run', () => {
    const frame = FRAMES[2]
    if (!frame) throw new Error('no frame')
    const { container } = render(
      <Stage
        frame={frame}
        level="engineer"
        stepDelayMs={640}
        look="ducks"
        timeline={{ frames: FRAMES, index: 2 }}
      />,
    )
    expect(screen.getByTestId('fake-scene')).toHaveTextContent(
      `${frame.array.join(' ')} | ${String(FRAMES.length)} | 2 | 640 | false`,
    )
    expect(container.querySelectorAll('.stage-bar')).toHaveLength(0)
    expect(container.querySelector('.stage-view')).toHaveClass('is-fake')
  })

  it('without the run, gives the scene the frame alone', () => {
    const frame = FRAMES[1]
    if (!frame) throw new Error('no frame')
    render(<Stage frame={frame} level="engineer" stepDelayMs={640} look="ducks" />)
    expect(screen.getByTestId('fake-scene')).toHaveTextContent(
      `${frame.array.join(' ')} | 1 | 0 | 640 | false`,
    )
  })

  it('adds the scene’s class for the moment, and its symbols from its count', () => {
    const last = FRAMES.at(-1)
    if (!last) throw new Error('no frame')
    const { container } = render(
      <Stage frame={last} level="explorer" stepDelayMs={640} look="ducks" />,
    )
    expect(container.querySelector('.stage-view')).toHaveClass('is-fake', 'is-fake-done')
    // Every value is sorted, and 3 values >= symbolsFrom 2: the role tags are symbols.
    expect(container.querySelectorAll('.stage-role.is-sorted')[0]).toHaveTextContent('✓')
  })
})
