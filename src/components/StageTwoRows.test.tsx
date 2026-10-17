import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mergeSort } from '../algorithms/sorting/mergeSort'
import type * as Registry from '../characters/registry'
import type { SceneProps } from '../characters/registry'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame, Level } from '../engine/types'
import { Stage } from './Stage'

// The pick band a stand-in scene draws: exact (its top to its bottom), to the bottom of the
// tags, or none.
const band = vi.hoisted(() => {
  const state: { mode: 'exact' | 'to-bottom' | 'none' } = { mode: 'exact' }
  return state
})

/** A scene that draws both rows: it says what it was given, and marks its pick band. */
function TwoRowScene({ level, asking }: SceneProps) {
  return (
    <div>
      <p data-testid="scene-props">{`${level} | ${String(asking)}`}</p>
      {band.mode !== 'none' && (
        <div data-testid="band" data-pick-band={band.mode === 'to-bottom' ? 'to-bottom' : ''} />
      )}
    </div>
  )
}

/** A scene that draws the main row only, like the ducks, robots and penguins. */
function OneRowScene() {
  return <p data-testid="one-row-scene" />
}

// Stand-ins in the ducks' and the robots' places: Stage must follow the registry's flags.
vi.mock('../characters/registry', async (importOriginal) => {
  const original = await importOriginal<typeof Registry>()
  return {
    ...original,
    CHARACTERS: {
      ...original.CHARACTERS,
      ducks: {
        ...original.CHARACTERS.ducks,
        scene: { Scene: TwoRowScene, className: 'is-two', twoRows: true },
      },
      robot: { ...original.CHARACTERS.robot, scene: { Scene: OneRowScene, className: 'is-one' } },
    },
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  band.mode = 'exact'
})

const FRAMES = collectFrames(mergeSort, DEFAULT_INPUT).frames
const ASK_INDEX = FRAMES.findIndex((frame) => frame.decision)
/** The first question: 2 (column 1) or 8 (column 2); the next place k is column 1. */
const ASK = FRAMES[ASK_INDEX] as Frame

function stage(frame: Frame, look: 'bars' | 'ducks' | 'robot', level: Level = 'engineer') {
  return render(
    <Stage
      frame={frame}
      level={level}
      stepDelayMs={800}
      look={look}
      pointerLabels={mergeSort.pointerLabels}
      timeline={{ frames: FRAMES, index: FRAMES.indexOf(frame) }}
    />,
  ).container
}

const words = (container: Element) =>
  container.querySelector('.stage-view > .visually-hidden')?.textContent ?? ''
/** Each column's tags under the values: its pointer words, then its role. */
const tags = (container: Element) =>
  [...container.querySelectorAll('.stage-axis:not(.is-buffer) .stage-marks')].map((marks) =>
    [...marks.querySelectorAll('.stage-pointer, .stage-role')].map((tag) => tag.textContent),
  )

describe('a scene that draws both rows (twoRows)', () => {
  it.each(['explorer', 'engineer'] as const)(
    '%s: screen readers hear both rows, exactly as with bars, at every step',
    (level) => {
      for (const frame of FRAMES) {
        const scene = words(stage(frame, 'ducks', level))
        const bars = words(stage(frame, 'bars', level))
        expect(scene).toBe(bars)
      }
      expect(words(stage(ASK, 'ducks'))).toContain('Buffer: empty, 2, 8, empty, empty, empty.')
    },
  )

  it('one row of tags shows both rows: k with the front i, then j, and the fronts’ role', () => {
    const container = stage(ASK, 'ducks')
    expect(tags(container)).toEqual([[], ['k', 'i', 'comparing'], ['j', 'comparing'], [], [], []])
  })

  it('in Explorer words: next, left and right, looking', () => {
    const container = stage(ASK, 'ducks', 'explorer')
    expect(tags(container)[1]).toEqual(['next', 'left', 'looking'])
    expect(tags(container)[2]).toEqual(['right', 'looking'])
  })

  it('gets the level, and whether a question is waiting', () => {
    stage(ASK, 'ducks', 'explorer')
    expect(screen.getByTestId('scene-props')).toHaveTextContent('explorer | false')
    render(<Stage frame={ASK} level="engineer" stepDelayMs={800} look="ducks" asking />)
    expect(screen.getAllByTestId('scene-props')[1]).toHaveTextContent('engineer | true')
  })
})

describe('a scene that draws the main row only', () => {
  it('keeps the main row’s tags and words, as before', () => {
    const container = stage(ASK, 'robot')
    expect(screen.getByTestId('one-row-scene')).toBeInTheDocument()
    expect(tags(container)).toEqual([[], ['k'], [], [], [], []])
    expect(words(container)).not.toContain('Buffer')
  })
})

describe('Engineer’s buttons lie over the scene’s pick band', () => {
  /** The plot spans 100 to 400; the band 250 to 330 (jsdom has no layout of its own). */
  function fakeBoxes() {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const [top, bottom] = this.classList.contains('stage-plot')
        ? [100, 400]
        : this.hasAttribute('data-pick-band')
          ? [250, 330]
          : [0, 0]
      return {
        top,
        bottom,
        left: 0,
        right: 0,
        width: 0,
        height: bottom - top,
        x: 0,
        y: top,
      } as DOMRect
    })
  }

  function picks(frame: Frame) {
    render(
      <Stage
        frame={frame}
        level="engineer"
        stepDelayMs={800}
        look="ducks"
        timeline={{ frames: FRAMES, index: ASK_INDEX }}
        pick={{
          labels: frame.array.map(String),
          picked: null,
          enabled: true,
          onPick: () => undefined,
          onCancel: () => undefined,
          groupLabel: 'Values: pick the front that goes next',
          row: 'buffer',
        }}
      />,
    )
    return screen.getByRole('group', { name: /^Values/ })
  }

  it('from its top to its bottom', () => {
    fakeBoxes()
    const group = picks(ASK)
    expect(group.style.top).toBe('150px')
    expect(group.style.bottom).toBe('70px')
    expect(within(group).getAllByRole('button')).toHaveLength(6)
  })

  it('to the bottom of the tags, when the band says "to-bottom"', () => {
    band.mode = 'to-bottom'
    fakeBoxes()
    const group = picks(ASK)
    expect(group.style.top).toBe('150px')
    expect(group.style.bottom).toBe('')
  })

  it('over the whole column, without a band', () => {
    band.mode = 'none'
    fakeBoxes()
    const group = picks(ASK)
    expect(group.getAttribute('style')).toBeNull()
  })
})
