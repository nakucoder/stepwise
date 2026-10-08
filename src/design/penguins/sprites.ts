/**
 * TEMPORARY (design/penguins, never merged): the penguin sprites, one letter per pixel.
 * o outline, k black back, w white belly, b beak (orange), f feet (orange), e eye (white).
 * No yellow anywhere (yellow means "looking"); the beak and feet are the ducks' orange.
 */
import { spritePath } from '../../characters/robot/geometry'

/** Standing, facing us: 12 × 14, symmetric, so it centers on its pillar exactly. */
export const PENGUIN = [
  '....oooo....',
  '...okkkko...',
  '..okkkkkko..',
  '..okekkeko..',
  '..okkbbkko..',
  '.okkkbbkkko.',
  'okkwwwwwwkko',
  'okkwwwwwwkko',
  'okwwwwwwwwko',
  'okwwwwwwwwko',
  '.okwwwwwwko.',
  '..owwwwwwo..',
  '..offooffo..',
  '..oo....oo..',
] as const

/** The finale: flippers up. */
export const PENGUIN_FLAP = [
  '....oooo....',
  '...okkkko...',
  'o.okkkkkko.o',
  'kooekkkkeook',
  'kkokkbbkkokk',
  '.kokkbbkkok.',
  '..okwwwwko..',
  '.okwwwwwwko.',
  '.okwwwwwwko.',
  '.okwwwwwwko.',
  '..owwwwwwo..',
  '..owwwwwwo..',
  '..offooffo..',
  '..oo....oo..',
] as const

/** Belly-sliding to the left on the ice: 16 × 8. */
export const PENGUIN_SLIDE = [
  '.....oooo.......',
  '...ookkkkooooo..',
  '.bbokekkkkkkkkoo',
  'bbookkkkkkkkkkko',
  '..okwwwwwwwwwwko',
  '..okwwwwwwwwwwoo',
  '...oowwwwwwwooff',
  '.....ooooooo..ff',
] as const

export interface SpritePaths {
  /** A 1-pixel rim around the whole sprite, so a black penguin stands out on the dark stage. */
  readonly rim: string
  readonly outline: string
  readonly back: string
  readonly belly: string
  readonly orange: string
  readonly eye: string
}

/** The empty pixels touching the sprite (left, right, above, below): its rim. */
function rimPath(rows: readonly string[]): string {
  const filled = (x: number, y: number) => {
    const c = rows[y]?.charAt(x)
    return c !== undefined && c !== '' && c !== '.'
  }
  let d = ''
  const w = rows[0]?.length ?? 0
  for (let y = -1; y <= rows.length; y++) {
    for (let x = -1; x <= w; x++) {
      if (filled(x, y)) continue
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        d += `M${String(x)} ${String(y)}h1v1h-1z`
      }
    }
  }
  return d
}

function paths(rows: readonly string[]): SpritePaths {
  return {
    rim: rimPath(rows),
    outline: spritePath(rows, 'o'),
    back: spritePath(rows, 'k'),
    belly: spritePath(rows, 'w'),
    orange: spritePath(rows, 'b', 'f'),
    eye: spritePath(rows, 'e'),
  }
}

export const PENGUIN_PATHS = paths(PENGUIN)
export const FLAP_PATHS = paths(PENGUIN_FLAP)
export const SLIDE_PATHS = paths(PENGUIN_SLIDE)

export const PENGUIN_W = 12
export const PENGUIN_H = 14
export const SLIDE_W = 16
export const SLIDE_H = 8
