/**
 * The spaceships' fighters (design/mockups/spaceships/README.md, "Sprites"): a family of
 * hand-drawn pixel-art ships, one exact grid per size level, drawn pixel by pixel and never
 * stretched (sprite-family.png shows them all). Bigger is more detail: scouts (9 to 13),
 * fighters (15 to 19), heavy cruisers (21 to 25), in the PR #75 mockup ship's style. They face
 * up; each grid is square and odd, so it has a center column and centers to the pixel.
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

/** Every grid size in the family, smallest first. */
export const FIGHTER_GRIDS: readonly number[] = Object.keys(FIGHTERS)
  .map(Number)
  .sort((a, b) => a - b)

/** The largest fighter's grid: no ship is bigger. */
export const LARGEST_GRID = FIGHTER_GRIDS.at(-1) ?? 9

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

const cache = new Map<number, FighterPaths>()

/** The fighter's SVG paths for grid size g, in sprite pixels (scale them by p). */
export function fighterPaths(g: number): FighterPaths {
  let paths = cache.get(g)
  if (!paths) {
    const rows = fighterRows(g)
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
    cache.set(g, paths)
  }
  return paths
}
