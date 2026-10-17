import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ALGORITHMS } from '../algorithms'
import { Stage } from '../components/Stage'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { CharacterId } from '../engine/types'
import { CHARACTERS } from './registry'

const DRAWN = (Object.keys(CHARACTERS) as CharacterId[]).filter((id) => CHARACTERS[id].drawn)

/** The run of the algorithm that uses this character, on the default numbers. */
function runFor(id: CharacterId) {
  const algorithm = Object.values(ALGORITHMS).find((a) => a.character === id)
  if (!algorithm) throw new Error(`no algorithm uses ${id}`)
  return collectFrames(algorithm, DEFAULT_INPUT).frames
}

describe('every drawn character has a scene, and the stage draws it', () => {
  it('knows the drawn characters: ducks, robots, penguins and spaceships', () => {
    expect(DRAWN).toEqual(['ducks', 'robot', 'penguins', 'spaceships'])
  })

  it.each(DRAWN)('%s: the registry gives a scene, with its class', (id) => {
    const scene = CHARACTERS[id].scene
    expect(scene).toBeDefined()
    expect(typeof scene?.Scene).toBe('function')
    expect(scene?.className).toMatch(/^is-/)
  })

  it('gives each character its own class on the stage', () => {
    const classes = DRAWN.map((id) => CHARACTERS[id].scene?.className)
    expect(new Set(classes).size).toBe(DRAWN.length)
  })

  it.each(DRAWN)('%s: the stage draws its scene in place of the bars', (id) => {
    const frames = runFor(id)
    const index = 3
    const frame = frames[index]
    if (!frame) throw new Error('no frame')
    const { container } = render(
      <Stage
        frame={frame}
        level="engineer"
        stepDelayMs={800}
        look={id}
        timeline={{ frames, index }}
      />,
    )
    expect(container.querySelector('.stage-view')).toHaveClass(
      CHARACTERS[id].scene?.className ?? '',
    )
    expect(container.querySelectorAll('.stage-bar')).toHaveLength(0)
  })

  it.each(DRAWN)('%s: the same frame as bars draws bars, and no character class', (id) => {
    const frames = runFor(id)
    const frame = frames[3]
    if (!frame) throw new Error('no frame')
    const { container } = render(<Stage frame={frame} level="engineer" stepDelayMs={800} />)
    expect(container.querySelectorAll('.stage-bars:not(.is-buffer) .stage-bar')).toHaveLength(
      frame.array.length,
    )
    expect(container.querySelector('.stage-view')).not.toHaveClass(
      CHARACTERS[id].scene?.className ?? '',
    )
  })
})
