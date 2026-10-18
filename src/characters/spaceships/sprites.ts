/**
 * The spaceships' fighter (design/mockups/spaceships/README.md, "Sprites"): hand-drawn pixel-art
 * ships, each an exact grid drawn pixel by pixel and never stretched (sprite-family.png shows
 * them all). Every value on a stage flies the same ship: the biggest that fits the stage, the
 * 25 × 25 heavy cruiser wherever it can (a phone, a desktop); the smaller ones (scouts 9 to 13,
 * fighters 15 to 19, cruisers 21 to 23) where a stage is shorter or more crowded. They face up; each grid is
 * square and odd, so it has a center column and centers to the pixel. The value is the length
 * of the ship's engine trail (`trailRects`); with its engines on full in flight, the same length
 * but brighter and wider (`boostRects`). Each fighter has a frame banking right for the turns
 * (`FIGHTERS_BANK_RIGHT`; banking left is its mirror).
 *
 * Codes: `o` outline, `h` hull, `w` highlight edge, `d` shade, `c` canopy, `a` wing stripe,
 * `r` engine glow, `.` empty. Light comes from the top left: highlights on the left edges,
 * shade on the right and along the wings' trailing edges.
 */
import { spritePath } from '../pixel'

export const FIGHTERS: Readonly<Record<number, readonly string[]>> = {
  // 9 × 9: scout
  9: [
    '....o....',
    '...oho...',
    '...oco...',
    '..owhdo..',
    '.ohwhdho.',
    'oahwhdhao',
    'oddwhdddo',
    '.ooooooo.',
    '...r.r...',
  ],
  // 11 × 11: scout
  11: [
    '.....o.....',
    '....oho....',
    '....oco....',
    '....oco....',
    '...owhdo...',
    '..ohwhdho..',
    '.ohhwhdhho.',
    'oahhwhdhhao',
    'odddwhddddo',
    '.ooooooooo.',
    '..r.....r..',
  ],
  // 13 × 13: scout
  13: [
    '......o......',
    '.....oho.....',
    '.....oco.....',
    '....occco....',
    '....owhdo....',
    '...owwhddo...',
    '..ohhwhdhho..',
    '.ohhhwhdhhho.',
    'oahhhwhdhhhao',
    'oddddwhdddddo',
    '.oooowhdoooo.',
    '...ooooooo...',
    '....r...r....',
  ],
  // 15 × 15: fighter
  15: [
    '.......o.......',
    '......oho......',
    '......oco......',
    '.....occco.....',
    '.....ocwco.....',
    '.....owhdo.....',
    '....owwhddo....',
    '...ohhwhdhho...',
    '..ohhhwhdhhho..',
    '.ohhhhwhdhhhho.',
    'oahhhhwhdhhhhao',
    'oddddddhddddddo',
    '.ooooowhdooooo.',
    '....ooooooo....',
    '.....r...r.....',
  ],
  // 17 × 17: fighter
  17: [
    '........o........',
    '.......oho.......',
    '.......oco.......',
    '......occco......',
    '......occco......',
    '......ocwco......',
    '.....owhhhdo.....',
    '.....owwhddo.....',
    '....ohhwhdhho....',
    '...ohhhwhdhhho...',
    '..ohhhhwhdhhhho..',
    '.ohhhhhwhdhhhhho.',
    'oahhhhhwhdhhhhhao',
    'odddddddhdddddddo',
    '.oooooowhdoooooo.',
    '.....ooooooo.....',
    '......r...r......',
  ],
  // 19 × 19: fighter
  19: [
    '.........o.........',
    '........oho........',
    '........oco........',
    '.......occco.......',
    '.......occco.......',
    '.......ocwco.......',
    '......owhhhdo......',
    '......owwhddo......',
    '.....ohhwhdhho.....',
    '....ohhhwhdhhho....',
    '...ohhhhwhdhhhho...',
    '..ohhhhhwhdhhhhho..',
    '.ohhhhhhwhdhhhhhho.',
    'oahhhhhhwhdhhhhhhao',
    'oddddddddhddddddddo',
    '.ooohdoowhdoodhooo.',
    '...oddoowhdooddo...',
    '...ooooooooooooo...',
    '....r...r.r...r....',
  ],
  // 21 × 21: heavy cruiser
  21: [
    '..........o..........',
    '.........oho.........',
    '.........oco.........',
    '........occco........',
    '........occco........',
    '........ocwco........',
    '.......ocwhdco.......',
    '.......owhhhdo.......',
    '......owwhhhddo......',
    '.o...ohhwhhhdhho...o.',
    '.o..ohhhwhhhdhhho..o.',
    'oho.ohhhwhhhdhhho.oho',
    'ohoohhhhwhhhdhhhhooho',
    'oahhhhhhwhhhdhhhhhhao',
    'oahhhhhhwhhhdhhhhhhao',
    'odddddddddhdddddddddo',
    '.ooohdoowhhhdoodhooo.',
    '...oddoowhhhdooddo...',
    '...ooooooowooooooo...',
    '...oo..ooooooo..oo...',
    '....r...r...r...r....',
  ],
  // 23 × 23: heavy cruiser
  23: [
    '...........o...........',
    '..........oho..........',
    '..........oco..........',
    '.........occco.........',
    '.........occco.........',
    '.........ocwco.........',
    '........ocwhdco........',
    '........owhhhdo........',
    '........owhhhdo........',
    '.......owwhhhddo.......',
    '..o...ohhwhhhdhho...o..',
    '..o..ohhhwhhhdhhho..o..',
    '.oho.ohhhwhhhdhhho.oho.',
    '.ohoohhhhwhhhdhhhhooho.',
    'oahhhhhhhwhhhdhhhhhhhao',
    'oahhhhhhhwhhhdhhhhhhhao',
    'oahhhhhhhwhhhdhhhhhhhao',
    'oddddddddddhddddddddddo',
    '.oooohdoowhhhdoodhoooo.',
    '....oddoowhhhdooddo....',
    '....ooooooowooooooo....',
    '....oo..ooooooo..oo....',
    '.....r...r...r...r.....',
  ],
  // 25 × 25: heavy cruiser
  25: [
    '............o............',
    '...........oho...........',
    '...........oco...........',
    '..........occco..........',
    '..........occco..........',
    '..........occco..........',
    '..........ocwco..........',
    '.........ocwhdco.........',
    '.........owhhhdo.........',
    '.........owhhhdo.........',
    '........owwhhhddo........',
    '...o...ohhwhhhdhho...o...',
    '...o..ohhhwhhhdhhho..o...',
    '..oho.ohhhwhhhdhhho.oho..',
    '..ohoohhhhwhhhdhhhhooho..',
    '.oahhhhhhhwhhhdhhhhhhhao.',
    'oaahhhhhhhwhhhdhhhhhhhaao',
    'oahhhhhhhhwhhhdhhhhhhhhao',
    'oahhhhhhhhwhhhdhhhhhhhhao',
    'odddddddddddhdddddddddddo',
    '.ooooohdoowhhhdoodhooooo.',
    '.....oddoowhhhdooddo.....',
    '.....ooooooowooooooo.....',
    '.....oo..ooooooo..oo.....',
    '......r...r...r...r......',
  ],
}

/**
 * Each fighter banking right, for the turns of a flight (whole pixels; never rotated or skewed):
 * the right wing dips, so its tip pulls in a column or two and goes into shade; the raised left
 * wing catches the light along its leading edge; the hull shows more of its left flank (the
 * ridge's highlight widens). Banking left is the mirror. The engines don't move, so the trail
 * hangs from the same place.
 */
export const FIGHTERS_BANK_RIGHT: Readonly<Record<number, readonly string[]>> = {
  // 9 × 9: scout, banking right
  9: [
    '....o....',
    '...oho...',
    '...oco...',
    '..owwdo..',
    '.ohwwddo.',
    'oahwwddo.',
    'oddwwddo.',
    '.ooooooo.',
    '...r.r...',
  ],
  // 11 × 11: scout, banking right
  11: [
    '.....o.....',
    '....oho....',
    '....oco....',
    '....oco....',
    '...owwdo...',
    '..ohwwdho..',
    '.owhwwdhdo.',
    'oahhwwdhdo.',
    'odddwwdddo.',
    '.ooooooooo.',
    '..r.....r..',
  ],
  // 13 × 13: scout, banking right
  13: [
    '......o......',
    '.....oho.....',
    '.....oco.....',
    '....occco....',
    '....owwdo....',
    '...owwwddo...',
    '..owhwwdhdo..',
    '.owhhwwdhddo.',
    'oahhhwwdhddo.',
    'oddddwwddddo.',
    '.oooowwdoooo.',
    '...ooooooo...',
    '....r...r....',
  ],
  // 15 × 15: fighter, banking right
  15: [
    '.......o.......',
    '......oho......',
    '......oco......',
    '.....occco.....',
    '.....ocwco.....',
    '.....owwdo.....',
    '....owwwddo....',
    '...owhwwdhdo...',
    '..owhhwwdhddo..',
    '.owhhhwwdhdddo.',
    'oahhhhwwdhdddo.',
    'oddddddhdddddo.',
    '.ooooowwdooooo.',
    '....ooooooo....',
    '.....r...r.....',
  ],
  // 17 × 17: fighter, banking right
  17: [
    '........o........',
    '.......oho.......',
    '.......oco.......',
    '......occco......',
    '......occco......',
    '......ocwco......',
    '.....owwhhdo.....',
    '.....owwwddo.....',
    '....ohhwwdhho....',
    '...owhhwwdhhdo...',
    '..owhhhwwdhhddo..',
    '.owhhhhwwdhhdddo.',
    'oahhhhhwwdhhdddo.',
    'odddddddhddddddo.',
    '.oooooowwdoooooo.',
    '.....ooooooo.....',
    '......r...r......',
  ],
  // 19 × 19: fighter, banking right
  19: [
    '.........o.........',
    '........oho........',
    '........oco........',
    '.......occco.......',
    '.......occco.......',
    '.......ocwco.......',
    '......owwhhdo......',
    '......owwwddo......',
    '.....ohhwwdhho.....',
    '....owhhwwdhhdo....',
    '...owhhhwwdhhddo...',
    '..owhhhhwwdhhdddo..',
    '.owhhhhhwwdhhdddo..',
    'oahhhhhhwwdhhdddo..',
    'oddddddddhddddddo..',
    '.ooohdoowwdooddoo..',
    '...oddoowwdooddo...',
    '...ooooooooooooo...',
    '....r...r.r...r....',
  ],
  // 21 × 21: heavy cruiser, banking right
  21: [
    '..........o..........',
    '.........oho.........',
    '.........oco.........',
    '........occco........',
    '........occco........',
    '........ocwco........',
    '.......ocwwdco.......',
    '.......owwhhdo.......',
    '......owwwhhddo......',
    '.o...owhwwhhdhdo..o..',
    '.o..owhhwwhhdhddo.o..',
    'owo.ohhhwwhhdhddo.o..',
    'ohoowhhhwwhhdhdddoo..',
    'oawwhhhhwwhhdhddddo..',
    'oahhhhhhwwhhdhddddo..',
    'odddddddddhdddddddo..',
    '.ooohdoowwhhdooddoo..',
    '...oddoowwhhdooddo...',
    '...ooooooowooooooo...',
    '...oo..ooooooo..oo...',
    '....r...r...r...r....',
  ],
  // 23 × 23: heavy cruiser, banking right
  23: [
    '...........o...........',
    '..........oho..........',
    '..........oco..........',
    '.........occco.........',
    '.........occco.........',
    '.........ocwco.........',
    '........ocwwdco........',
    '........owwhhdo........',
    '........owwhhdo........',
    '.......owwwhhddo.......',
    '..o...owhwwhhdhdo...o..',
    '..o..owhhwwhhdhddo..o..',
    '.owo.ohhhwwhhdhddo.oo..',
    '.ohoowhhhwwhhdhdddooo..',
    'oahwwhhhhwwhhdhdddddo..',
    'oahhhhhhhwwhhdhdddddo..',
    'oahhhhhhhwwhhdhdddddo..',
    'oddddddddddhddddddddo..',
    '.oooohdoowwhhdooddooo..',
    '....oddoowwhhdooddo....',
    '....ooooooowooooooo....',
    '....oo..ooooooo..oo....',
    '.....r...r...r...r.....',
  ],
  // 25 × 25: heavy cruiser, banking right
  25: [
    '............o............',
    '...........oho...........',
    '...........oco...........',
    '..........occco..........',
    '..........occco..........',
    '..........occco..........',
    '..........ocwco..........',
    '.........ocwwdco.........',
    '.........owwhhdo.........',
    '.........owwhhdo.........',
    '........owwwhhddo........',
    '...o...owhwwhhdhdo...o...',
    '...o..owhhwwhhdhddo..o...',
    '..owo.ohhhwwhhdhddo.odo..',
    '..ohoowhhhwwhhdhdddoodo..',
    '.oahwwhhhhwwhhdhddddddo..',
    'oaahhhhhhhwwhhdhddddddo..',
    'oahhhhhhhhwwhhdhddddddo..',
    'oahhhhhhhhwwhhdhddddddo..',
    'odddddddddddhdddddddddo..',
    '.ooooohdoowwhhdooddoooo..',
    '.....oddoowwhhdooddo.....',
    '.....ooooooowooooooo.....',
    '.....oo..ooooooo..oo.....',
    '......r...r...r...r......',
  ],
}

/** Every grid size in the family, smallest first. */
export const FIGHTER_GRIDS: readonly number[] = Object.keys(FIGHTERS)
  .map(Number)
  .sort((a, b) => a - b)

/** The fighter's rows for a grid size in the family. */
export function fighterRows(g: number): readonly string[] {
  const rows = FIGHTERS[g]
  if (!rows) throw new Error(`No fighter drawn at ${String(g)} × ${String(g)}`)
  return rows
}

export interface FighterPaths {
  readonly outline: string
  readonly hull: string
  readonly highlight: string
  readonly shade: string
  readonly canopy: string
  readonly wing: string
  readonly glow: string
  /** The glow while the ship flies: twice as long, one more pixel under each nozzle. */
  readonly glowLong: string
}

/** A fighter's pose: level, or banking into a turn. */
export type Bank = 'level' | 'left' | 'right'

/** The fighter's rows for a grid size and a pose (banking left mirrors banking right). */
export function bankRows(g: number, bank: Bank): readonly string[] {
  if (bank === 'level') return fighterRows(g)
  const rows = FIGHTERS_BANK_RIGHT[g]
  if (!rows) throw new Error(`No banked fighter drawn at ${String(g)} × ${String(g)}`)
  return bank === 'right' ? rows : rows.map((row) => row.split('').reverse().join(''))
}

const cache = new Map<string, FighterPaths>()

/** The fighter's SVG paths for grid size g and a pose, in sprite pixels (scale them by p). */
export function fighterPaths(g: number, bank: Bank = 'level'): FighterPaths {
  const key = `${String(g)}-${bank}`
  let paths = cache.get(key)
  if (!paths) {
    const rows = bankRows(g, bank)
    const long = [...rows, rows[g - 1] ?? '']
    paths = {
      outline: spritePath(rows, 'o'),
      hull: spritePath(rows, 'h'),
      highlight: spritePath(rows, 'w'),
      shade: spritePath(rows, 'd'),
      canopy: spritePath(rows, 'c'),
      wing: spritePath(rows, 'a'),
      glow: spritePath(rows, 'r'),
      glowLong: spritePath(long, 'r'),
    }
    cache.set(key, paths)
  }
  return paths
}

/** A trail pixel run: a column x (in units, the fighter's columns), from y down h units. */
export interface TrailRect {
  readonly x: number
  readonly y: number
  readonly h: number
  /** White at the nozzle, orange, red at the end. */
  readonly part: 'core' | 'flame' | 'tip'
}

/**
 * A fighter's engine trail, `units` long (whole sprite pixels), from the row of its engines'
 * glow down: under each engine a flame 3 units wide. Its middle column is white for the first
 * 30%, orange to 80%, red to the end; its two sides are 55% as long (orange, then red), so the
 * flame tapers; every other engine throws a red spark one unit past its tip.
 */
export function trailRects(grid: number, units: number): TrailRect[] {
  if (units <= 0) return []
  const glow = fighterRows(grid)[grid - 1] ?? ''
  const engines: number[] = []
  for (let x = 0; x < glow.length; x++) if (glow.charAt(x) === 'r') engines.push(x)
  const rects: TrailRect[] = []
  const add = (x: number, y: number, h: number, part: TrailRect['part']) => {
    if (h > 0) rects.push({ x, y, h, part })
  }
  engines.forEach((e, k) => {
    const core = Math.max(1, Math.round(units * 0.3))
    const body = Math.max(core, Math.round(units * 0.8))
    add(e, 0, Math.min(core, units), 'core')
    add(e, core, Math.min(body, units) - core, 'flame')
    add(e, body, units - body, 'tip')
    const side = Math.round(units * 0.55)
    const sideFlame = Math.round(side * 0.7)
    for (const dx of [-1, 1]) {
      add(e + dx, 0, sideFlame, 'flame')
      add(e + dx, sideFlame, side - sideFlame, 'tip')
    }
    if (units > 4 && k % 2 === 0) add(e, units + 1, 1, 'tip')
  })
  return rects
}

/**
 * The trail with the engines on full (the thrust burst in flight), in two frames to flicker
 * between: exactly as long as the trail, `units`, so the value still reads, but brighter and wider.
 * Under each engine a flame 5 units wide: its middle white for 50 or 65% and orange to the end
 * (no red); the columns either side white for 30%, then orange to 75 or 85%; the outer columns
 * orange, then red, to half or 60%. Drawn red first, white last.
 */
export function boostRects(grid: number, units: number, frame: 0 | 1): TrailRect[] {
  if (units <= 0) return []
  const glow = fighterRows(grid)[grid - 1] ?? ''
  const rects: TrailRect[] = []
  const add = (x: number, y: number, h: number, part: TrailRect['part']) => {
    const end = Math.min(units, y + h)
    if (end > y) rects.push({ x, y, h: end - y, part })
  }
  const at = (share: number) => Math.max(1, Math.round(units * share))
  for (let e = 0; e < glow.length; e++) {
    if (glow.charAt(e) !== 'r') continue
    const core = at(frame === 0 ? 0.65 : 0.5)
    add(e, 0, core, 'core')
    add(e, core, units - core, 'flame')
    for (const dx of [-1, 1]) {
      add(e + dx, 0, at(0.3), 'core')
      add(e + dx, at(0.3), at(frame === 0 ? 0.75 : 0.85) - at(0.3), 'flame')
    }
    for (const dx of [-2, 2]) {
      const flame = at(frame === 0 ? 0.5 : 0.35)
      add(e + dx, 0, flame, 'flame')
      add(e + dx, flame, at(frame === 0 ? 0.6 : 0.5) - flame, 'tip')
    }
  }
  const rank = { tip: 0, flame: 1, core: 2 } as const
  return rects.sort((a, b) => rank[a.part] - rank[b.part])
}
