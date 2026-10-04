/**
 * The Bath time duck: a 16×14 pixel bath duck facing right. It rides on top of the data
 * (it is never the data's color and never yellow, which means "looking").
 * o outline, b body, s shade, k beak, e eye.
 */
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

/** One SVG path per color, each pixel a 1×1 square, so the duck is a handful of nodes. */
function pathFor(...codes: readonly string[]): string {
  let d = ''
  DUCK.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (codes.includes(row.charAt(x))) d += `M${String(x)} ${String(y)}h1v1h-1z`
    }
  })
  return d
}

const OUTLINE = pathFor('o', 'e')
const BODY = pathFor('b')
const SHADE = pathFor('s')
const BEAK = pathFor('k')

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
