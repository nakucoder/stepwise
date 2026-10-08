/**
 * The robot's sprites as SVG paths, one per color, each pixel a 1 × 1 square (like the duck).
 * Drawn at the scene's sprite scale with shape-rendering crispEdges.
 */
import { HOOK_SPRITE, SCOUT, SCOUT_HAPPY, spritePath, TROLLEY } from './geometry'

export const SCOUT_PATHS = {
  outline: spritePath(SCOUT, 'o'),
  steel: spritePath(SCOUT, 's'),
  dark: spritePath(SCOUT, 'd'),
  light: spritePath(SCOUT, 'l'),
  visor: spritePath(SCOUT, 'v'),
  eye: spritePath(SCOUT, 'e'),
  antenna: spritePath(SCOUT, 'a'),
} as const

/** The finale's ^ ^ eyes, drawn over the visor: visor where the plain eyes were, eye color
 * where the happy ones are. */
function happyPath(code: 'v' | 'h'): string {
  let d = ''
  SCOUT_HAPPY.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const was = SCOUT[y]?.charAt(x)
      const now = row.charAt(x)
      if (now === code && was !== now) d += `M${String(x)} ${String(y)}h1v1h-1z`
    }
  })
  return d
}

export const SCOUT_HAPPY_PATHS = { visor: happyPath('v'), eye: happyPath('h') } as const

export const TROLLEY_PATHS = {
  outline: spritePath(TROLLEY, 'o'),
  steel: spritePath(TROLLEY, 's'),
  light: spritePath(TROLLEY, 'l'),
  visor: spritePath(TROLLEY, 'v'),
  eye: spritePath(TROLLEY, 'e'),
  dark: spritePath(TROLLEY, 'd'),
} as const

export const HOOK_PATHS = {
  outline: spritePath(HOOK_SPRITE, 'o'),
  dark: spritePath(HOOK_SPRITE, 'd'),
} as const
