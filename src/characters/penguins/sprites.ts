/**
 * The penguins' sprites (design/mockups/penguins/README.md), one letter per pixel: o outline,
 * k black back, w white belly, b beak, f feet, e eye. No yellow anywhere (yellow means
 * "looking"); the beak and feet are the ducks' orange.
 */
import { spritePath } from '../pixel'

/** Standing, facing us: 12 × 14, exactly symmetric, so it centers on its tower to the pixel. */
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

/** The finale: flippers up, 12 × 14. */
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

/** Belly-sliding, facing left (the way it slides): 16 × 8. */
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

export const PENGUIN_W = 12
export const PENGUIN_H = 14
export const SLIDE_W = 16
export const SLIDE_H = 8

export interface PenguinPaths {
  /** The 1-pixel rim around the whole sprite, so a black penguin shows on the dark stage. */
  readonly rim: string
  readonly outline: string
  readonly back: string
  readonly belly: string
  /** The beak and the feet. */
  readonly orange: string
  readonly eye: string
}

/** The empty pixels touching the sprite on any side (left, right, above, below): its rim. */
export function rimPath(rows: readonly string[]): string {
  const filled = (x: number, y: number) => {
    const c = rows[y]?.charAt(x)
    return c !== undefined && c !== '' && c !== '.'
  }
  const width = Math.max(0, ...rows.map((row) => row.length))
  let d = ''
  for (let y = -1; y <= rows.length; y++) {
    for (let x = -1; x <= width; x++) {
      if (filled(x, y)) continue
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        d += `M${String(x)} ${String(y)}h1v1h-1z`
      }
    }
  }
  return d
}

function pathsOf(rows: readonly string[]): PenguinPaths {
  return {
    rim: rimPath(rows),
    outline: spritePath(rows, 'o'),
    back: spritePath(rows, 'k'),
    belly: spritePath(rows, 'w'),
    orange: spritePath(rows, 'b', 'f'),
    eye: spritePath(rows, 'e'),
  }
}

export const STANDING_PATHS = pathsOf(PENGUIN)
export const FLAP_PATHS = pathsOf(PENGUIN_FLAP)
export const SLIDE_PATHS = pathsOf(PENGUIN_SLIDE)
