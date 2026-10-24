import { spritePath } from '../pixel'
import './PizzaCartScene.css'
import { CART_H, CART_W, drawCart } from './sprites'

const CART = drawCart()
const FILLS: readonly (readonly [string, string])[] = [
  ['c', 'var(--pizza-shell)'],
  ['d', 'var(--pizza-deck)'],
  ['s', 'var(--pizza-screen)'],
  ['e', 'var(--pizza-eye)'],
  ['a', 'var(--pizza-eye)'],
  ['p', 'var(--pizza-orange)'],
  ['f', 'var(--pizza-orange)'],
  ['w', 'var(--pizza-wheel)'],
  ['h', 'var(--pizza-hub)'],
  ['o', 'var(--pizza-cart-line)'],
]

/** The delivery cart, as the "Pizza cart" icon on the Show as switch (26 × 15 pixels). */
export function PixelCart() {
  return (
    <svg
      className="pixel-cart"
      viewBox={`0 0 ${String(CART_W)} ${String(CART_H)}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {FILLS.map(([code, fill]) => (
        <path key={code} d={spritePath(CART, code)} fill={fill} />
      ))}
    </svg>
  )
}
