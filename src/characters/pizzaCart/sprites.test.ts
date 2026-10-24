import { describe, expect, it } from 'vitest'
import {
  BOW,
  BOW_W,
  CART_DECK,
  CART_H,
  CART_W,
  drawCart,
  FACES,
  LABEL_H,
  LABEL_W,
  pizzaStack,
  PUFF,
} from './sprites'

const count = (rows: readonly string[], codes: string) =>
  rows
    .join('')
    .split('')
    .filter((c) => codes.includes(c)).length

describe('the cart', () => {
  it('is 26 × 15, its deck on row 4, three wheels, a face, an antenna and a flag', () => {
    const cart = drawCart()
    expect(cart).toHaveLength(CART_H)
    for (const row of cart) expect(row).toHaveLength(CART_W)
    expect(cart[CART_DECK]?.slice(1, CART_W - 1)).toMatch(/^d+$/)
    // Nothing of the body above the deck: only the flag, the antenna and their poles.
    expect(cart.slice(0, CART_DECK).join('')).toMatch(/^[.ofa]+$/)
    expect(count(cart, 'f')).toBeGreaterThan(0)
    expect(count(cart, 'a')).toBe(1)
    expect(count(cart, 'h')).toBe(3)
    expect(count(cart, 'e')).toBe(count(FACES.idle, 'e'))
  })

  it('has its faces on a 7 × 5 screen', () => {
    for (const face of Object.values(FACES)) {
      expect(face).toHaveLength(5)
      for (const row of face) expect(row).toHaveLength(7)
    }
  })

  it('turns its wheels: the two frames differ only at the hubs', () => {
    const a = drawCart({ bump: 0 })
    const b = drawCart({ bump: 1 })
    a.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== b[y]?.[x]) expect('wh').toContain(row[x])
      }
    })
    expect(a).not.toEqual(b)
  })

  it('moves its antenna and flag for its moods', () => {
    expect(drawCart({ antenna: 'left' })).not.toEqual(drawCart())
    expect(drawCart({ flag: 'b' })).not.toEqual(drawCart())
    expect(drawCart({ face: 'happy' })).not.toEqual(drawCart())
  })
})

describe('pizzaStack: one box per count', () => {
  const boxes = (n: number, box: number, lid: number) =>
    Array.from({ length: n }, (_, k) => (k === n - 1 ? box + lid : box))

  it('is exactly as tall as its boxes, the lid inside the top one', () => {
    for (const [n, box, lid] of [
      [1, 8, 4],
      [7, 8, 4],
      [12, 12, 4],
      [12, 3, 0],
      [5, 4, 0],
    ] as const) {
      const { rows } = pizzaStack(40, boxes(n, box, lid), lid)
      expect(rows).toHaveLength(n * box + lid)
    }
  })

  it('outlines every box: a dark line on top of each one, the full width', () => {
    const { rows } = pizzaStack(40, boxes(5, 8, 4), 4)
    for (let k = 0; k < 5; k++) {
      const line = rows[4 + k * 8]
      expect(line?.slice(1, 41)).toMatch(/^o+$/)
    }
  })

  it('stripes boxes of 6 px and up red and white, with PIZZA on a white band where it fits', () => {
    const { rows, words } = pizzaStack(40, boxes(3, 8, 4), 4)
    expect(words).toBe(3)
    expect(count(rows, 'r')).toBeGreaterThan(0)
    // An 8 px box has 7 rows under its line: the band (7 rows) just fits.
    expect(LABEL_H).toBe(7)
    expect(LABEL_W).toBe(21)
    expect(pizzaStack(20, boxes(3, 8, 4), 4).words).toBe(0)
    expect(pizzaStack(40, boxes(3, 7, 4), 4).words).toBe(0)
  })

  it('draws boxes under 6 px plain: white, outlined, no stripes, no word, no lid', () => {
    const { rows, words } = pizzaStack(34, boxes(12, 3, 0), 0, { plain: true })
    expect(words).toBe(0)
    expect(count(rows, 'r')).toBe(0)
    expect(count(rows, 'cp')).toBe(0)
    expect(rows).toHaveLength(36)
  })

  it('prints a small pizza on the lid only where the lid is at least 6 px deep', () => {
    expect(count(pizzaStack(48, boxes(3, 12, 6), 6).rows, 'p')).toBeGreaterThan(0)
    expect(count(pizzaStack(40, boxes(3, 8, 4), 4).rows, 'p')).toBe(0)
  })

  it('opens the leader’s top box on its whole pizza when it is delivered', () => {
    const open = pizzaStack(40, boxes(3, 8, 4), 4, { leader: true, open: true }).rows
    expect(count(open, 'b')).toBeGreaterThan(0)
    expect(count(open, 'p')).toBeGreaterThan(0)
    expect(count(open, 'c')).toBeGreaterThan(0)
  })

  it('gives the leader its own red boxes, white lettering and a blue ribbon down every box', () => {
    const { rows } = pizzaStack(40, boxes(4, 8, 4), 4, { leader: true })
    expect(count(rows, 'R')).toBeGreaterThan(0)
    expect(count(rows, 'r')).toBe(0)
    expect(count(rows, 'W')).toBeGreaterThan(0)
    // The ribbon runs through every box's front (it skips only the lines between boxes).
    const ribbon = rows.slice(4, -1).filter((row) => row.includes('B'))
    expect(ribbon.length).toBeGreaterThanOrEqual(4 * 7 - 1)
    // Plain (thin) leader boxes are red too, with no white front.
    const plain = pizzaStack(34, boxes(5, 3, 0), 0, { leader: true, plain: true }).rows
    expect(count(plain, 'R')).toBeGreaterThan(0)
    expect(count(plain, 'w')).toBe(0)
  })

  it('has a 9 × 7 bow and steam puffs', () => {
    expect(BOW).toHaveLength(7)
    for (const row of BOW) expect(row).toHaveLength(BOW_W)
    expect(PUFF.join('')).toContain('w')
  })
})
