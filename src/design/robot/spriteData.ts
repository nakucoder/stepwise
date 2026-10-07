/**
 * TEMPORARY (design/robot, never merged): pixel art for the three robot mockups. Each sprite
 * is a grid of letters, one per pixel, drawn by SpritePaths as one SVG path per color.
 *
 * o outline, s steel, d dark steel, l light steel, v visor glass, e eye light, a antenna light,
 * t track, h happy eye (used for the finale).
 */

export type Sprite = readonly string[]

/** A: the gantry's trolley, hanging under its rail, its camera looking down. 16×12. */
export const TROLLEY: Sprite = [
  '..oo........oo..',
  '.oddo......oddo.',
  'oooooooooooooooo',
  'osllllllllllllso',
  'osssssssssssssso',
  'osssvvvvvvvvssso',
  'osssvvveevvvssso',
  'osssvvvvvvvvssso',
  'oddddddddddddddo',
  'oooooooooooooooo',
  '......oeeo......',
  '......oooo......',
]

/** A, happy: ^ ^ eyes on the visor, for the finale. */
export const TROLLEY_HAPPY: Sprite = TROLLEY.map((row, y) =>
  y === 5 ? 'osssvhvvvvhvssso' : y === 6 ? 'ossshvhvvhvhssso' : row,
)

/** A: the claw on the end of its cable, open and closed. 12×8. */
export const CLAW_OPEN: Sprite = [
  '.....oo.....',
  '.....od.....',
  '..oooooooo..',
  '..oddddddo..',
  '.od......do.',
  '.od......do.',
  'od........do',
  'oo........oo',
]

export const CLAW_CLOSED: Sprite = [
  '.....oo.....',
  '.....od.....',
  '..oooooooo..',
  '..oddddddo..',
  '..od....do..',
  '...od..do...',
  '...od..do...',
  '...oo..oo...',
]

/** B: the hopper, a boxy little robot that stands on the smallest so far. 14×16. */
export const HOPPER: Sprite = [
  '.....oaao.....',
  '......oo......',
  '.oooooooooooo.',
  'osllllllllllso',
  'osvvvvvvvvvvso',
  'osvvvvvveevvso',
  'osvvvvvvvvvvso',
  'osssssssssssso',
  'oooooooooooooo',
  '.osssssssssso.',
  'oodssssssssdoo',
  '.osssssssssso.',
  '..oooooooooo..',
  '...od....do...',
  '..oddo..oddo..',
  '..oooo..oooo..',
]

/** B, happy: the same robot with ^ ^ eyes, for the finale. */
export const HOPPER_HAPPY: Sprite = HOPPER.map((row, y) =>
  y === 5 ? 'osvvhvvvvhvvso' : y === 4 ? 'osvhvhvvhvhvso' : row,
)

/** C: the rover, on tracks in the front lane, with a periscope camera and a lifting arm. 20×16. */
export const ROVER: Sprite = [
  '.oooo...............',
  '.oeeo...............',
  '.oooo...............',
  '..od................',
  '..od................',
  'oooooooooooooo......',
  'osllllllllllso......',
  'osvvvvvvvvvvsooooooo',
  'osvvvvvvvvvvsddddddo',
  'ossssssssssssooooodo',
  'oooooooooooooo...odo',
  'otltltltltltlto..ooo',
  'oltltltltltltlo.....',
  '.oooooooooooooo.....',
  '....................',
  '....................',
]

/** C, happy: the camera blinks to a ^ for the finale. */
export const ROVER_HAPPY: Sprite = ROVER.map((row, y) => (y === 1 ? '.ohho...............' : row))

/** E: the crane's small trolley, riding a thin rail at the top edge. 10×6. */
export const TROLLEY_SMALL: Sprite = [
  '.oo....oo.',
  'oooooooooo',
  'osllllllso',
  'osvvvevvso',
  'oddddddddo',
  'oooooooooo',
]

/** E and F: the hook on the end of the cable. The shank is columns 1–2. 6×6. */
export const HOOK: Sprite = ['.oo...', '.od...', '.od...', '.od.o.', '.oddo.', '..oo..']
