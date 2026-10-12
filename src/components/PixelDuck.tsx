/**
 * The Bath time duck: a 16×14 pixel bath duck facing right. It rides on top of the data
 * (it is never the data's color and never yellow, which means "looking").
 * o outline, b body, s shade, k beak, e eye.
 */
import { spritePath } from '../characters/pixel'

const DUCK = [
  '.......oooo.....',
  '......obbbbo....',
  '.....obbbbbbo...',
  '.....obbbebbokk.',
  '.....obbbbbbokkk',
  '......obbbbbo...',
  '.......obbbo....',
  'oo....obbbbbo...',
  'obo..obbbbbbbo..',
  'obbooobbbbbbbbo.',
  'obbbbbbssssbbbo.',
  '.obbbbbbsssbbbo.',
  '..obbbbbbbbbbo..',
  '...ooooooooooo..',
]

// One SVG path per color, each pixel a 1×1 square, so the duck is a handful of nodes.
const OUTLINE = spritePath(DUCK, 'o', 'e')
const BODY = spritePath(DUCK, 'b')
const SHADE = spritePath(DUCK, 's')
const BEAK = spritePath(DUCK, 'k')

export function PixelDuck() {
  return (
    <svg
      className="pixel-duck"
      viewBox="0 0 16 14"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d={BODY} fill="var(--duck-body)" />
      <path d={SHADE} fill="var(--duck-shade)" />
      <path d={BEAK} fill="var(--duck-beak)" />
      <path d={OUTLINE} fill="var(--duck-outline)" />
    </svg>
  )
}
