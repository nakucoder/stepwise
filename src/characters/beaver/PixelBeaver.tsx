import { spritePath } from '../pixel'
import './BeaverScene.css'
import { BEAVER_H, BEAVER_W, beaverRows } from './sprites'

const BEAVER = beaverRows('idle')
const FILLS: readonly (readonly [string, string])[] = [
  ['f', 'var(--beaver-fur)'],
  ['l', 'var(--beaver-cream)'],
  ['d', 'var(--beaver-paw)'],
  ['t', 'var(--beaver-tail)'],
  ['x', 'var(--beaver-hatch)'],
  ['e', 'var(--beaver-eye)'],
  ['w', 'var(--beaver-teeth)'],
  ['h', 'var(--beaver-hat)'],
  ['H', 'var(--beaver-brim)'],
  ['n', 'var(--beaver-line)'],
  ['o', 'var(--beaver-line)'],
]

/** The builder beaver, waiting, as the "Beaver" icon on the Show as switch (30 × 16 pixels). */
export function PixelBeaver() {
  return (
    <svg
      className="pixel-beaver"
      viewBox={`0 0 ${String(BEAVER_W)} ${String(BEAVER_H)}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {FILLS.map(([code, fill]) => (
        <path key={code} d={spritePath(BEAVER, code)} fill={fill} />
      ))}
    </svg>
  )
}
