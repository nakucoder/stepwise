import { describe, expect, it } from 'vitest'
import { ALGORITHMS } from '../algorithms'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { CHARACTERS, stageLook } from './registry'

describe('character registry', () => {
  it('gives bubble sort the ducks, named "Ducks" on the switch', () => {
    expect(bubbleSort.character).toBe('ducks')
    expect(CHARACTERS.ducks.name).toBe('Ducks')
    expect(CHARACTERS.ducks.icon).not.toBeNull()
  })

  it('names the robots, drawn now, with the scout as their icon', () => {
    expect(CHARACTERS.robot.name).toBe('Robots')
    expect(CHARACTERS.robot.icon).not.toBeNull()
    expect(CHARACTERS.robot.drawn).toBe(true)
  })

  it('knows every character an algorithm uses', () => {
    for (const algorithm of Object.values(ALGORITHMS)) {
      if (algorithm.character) expect(CHARACTERS[algorithm.character]).toBeDefined()
    }
  })

  it('resolves the look for the algorithm on screen', () => {
    expect(stageLook('character', bubbleSort)).toBe('ducks')
    expect(stageLook('bars', bubbleSort)).toBe('bars')
    expect(stageLook('character', { character: 'robot' })).toBe('robot')
    // An algorithm without a character always shows bars.
    expect(stageLook('character', {})).toBe('bars')
    expect(stageLook('character', undefined)).toBe('bars')
  })
})
