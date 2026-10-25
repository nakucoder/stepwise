import { describe, expect, it } from 'vitest'
import { ALGORITHMS } from '../algorithms'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { quickSort } from '../algorithms/sorting/quickSort'
import { CHARACTERS, lookRange, rangeNote, stageLook } from './registry'

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

  it('gives quick sort the pizza cart, which carries 1 to 12', () => {
    expect(quickSort.character).toBe('pizzaCart')
    expect(CHARACTERS.pizzaCart).toMatchObject({ name: 'Pizza cart', drawn: true })
    expect(CHARACTERS.pizzaCart.range?.values).toEqual({ min: 1, max: 12 })
    expect(lookRange('character', quickSort)).toEqual({ min: 1, max: 12 })
    // Bars, and the other characters, keep 0–99.
    expect(lookRange('bars', quickSort)).toBeUndefined()
    expect(lookRange('character', bubbleSort)).toBeUndefined()
    for (const id of ['ducks', 'robot', 'penguins', 'spaceships'] as const) {
      expect(CHARACTERS[id].range).toBeUndefined()
    }
  })

  it('shows bars, with its note, when the numbers don’t fit the character', () => {
    expect(stageLook('character', quickSort, [5, 2, 8])).toBe('pizzaCart')
    expect(stageLook('character', quickSort, [1, 12])).toBe('pizzaCart')
    expect(stageLook('character', quickSort, [5, 13])).toBe('bars')
    expect(stageLook('character', quickSort, [0, 5])).toBe('bars')
    expect(rangeNote('pizzaCart', [5, 42])).toBe('The pizza cart carries 1 to 12 boxes.')
    expect(rangeNote('pizzaCart', [5, 12])).toBeNull()
    expect(stageLook('character', bubbleSort, [99, 0])).toBe('ducks')
    expect(rangeNote('ducks', [99, 0])).toBeNull()
  })
})
