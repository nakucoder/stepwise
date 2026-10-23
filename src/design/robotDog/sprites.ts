/**
 * TEMPORARY (mockup/quick-sort-dog, never merged): the pixel grids for the robot dog mockups.
 * One character letter per pixel; spritePath (characters/pixel.ts) turns each letter's pixels
 * into one SVG path, drawn at a whole number of screen pixels per pixel.
 */
import { spritePath } from '../../characters/pixel'

/**
 * The robot dog, facing right, 16 × 12: o outline, b body plates, d joints, e eye (glowing),
 * a antenna tip, n nose. One dog for all three designs: what it herds and how it moves differ.
 */
export const DOG = [
  '.........a......',
  '.........o......',
  '........ooooo...',
  '.......obbbbbo..',
  '.......obebbbboo',
  'oo.....obbbbbbbo',
  '.o.....oobbbbbno',
  '.ooooooobbbbbooo',
  '.obbbbbbbbbbbo..',
  '.obdbbbbbbbdbo..',
  '.oo.oo....oo.oo.',
  '.oo.oo....oo.oo.',
] as const

/** The same dog sniffing: head down to the ground, 16 × 12. */
export const DOG_SNIFF = [
  '................',
  '................',
  '................',
  '..........a.....',
  'oo........o.....',
  '.o.......ooooo..',
  '.oooooooobbbbbo.',
  '.obbbbbbbbebbbbo',
  '.obdbbbbbbbbbbbo',
  '.obbbbbbbbbbbbno',
  '.oo.oo....oo.ooo',
  '.oo.oo....oo....',
] as const

/** Sitting proudly (the leader is placed; the finale), 16 × 12. */
export const DOG_SIT = [
  '.........a......',
  '.........o......',
  '........ooooo...',
  '.......obbbbbo..',
  '.......obebbbboo',
  '.......obbbbbbbo',
  '.o.....oobbbbbno',
  'oo....obbbbbooo.',
  '.o...obbbbbbo...',
  '.oooobbbdbbbo...',
  '.obbbbbbbbbbo...',
  '.oooooooooooo...',
] as const

/** A: a sheep, facing left, 12 × 8: o outline, w wool, k face and legs, e eye. */
export const SHEEP = [
  '....oooooo..',
  '.oooowwwwwo.',
  'okkkowwwwwwo',
  'okekowwwwwwo',
  '.okkowwwwwwo',
  '..oowwwwwwo.',
  '...oooooooo.',
  '...k.k..k.k.',
] as const

/** C: a hover-bot, 9 × 6: o outline, h hull, e eye, t thruster glow. */
export const BOT = [
  '...ooo...',
  '..ohhho..',
  '.ohheeho.',
  'ohhhhhhho',
  '.ooooooo.',
  '..t.t.t..',
] as const

/** The leader's ball, 5 × 5: o outline, f fill, s shine. */
export const BALL = ['.ooo.', 'ofsfo', 'offfo', 'offfo', '.ooo.'] as const

const paths = (rows: readonly string[], codes: readonly string[]) =>
  Object.fromEntries(codes.map((code) => [code, spritePath(rows, code)]))

export const SPRITES = {
  dog: { rows: DOG, paths: paths(DOG, ['o', 'b', 'd', 'e', 'a', 'n']) },
  dogSniff: { rows: DOG_SNIFF, paths: paths(DOG_SNIFF, ['o', 'b', 'd', 'e', 'a', 'n']) },
  dogSit: { rows: DOG_SIT, paths: paths(DOG_SIT, ['o', 'b', 'd', 'e', 'a', 'n']) },
  sheep: { rows: SHEEP, paths: paths(SHEEP, ['o', 'w', 'k', 'e']) },
  bot: { rows: BOT, paths: paths(BOT, ['o', 'h', 'e', 't']) },
  ball: { rows: BALL, paths: paths(BALL, ['o', 'f', 's']) },
} as const

export type SpriteId = keyof typeof SPRITES
