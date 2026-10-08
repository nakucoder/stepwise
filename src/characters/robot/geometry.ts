/**
 * Scout and Crane (design/mockups/robot/README.md): the scene's numbers, the sprites, and the
 * carry rule. Pure: no React, no DOM.
 *
 * The spec's scene is 216 × 144 units for 6 slots. The real stage is any size, so (as chosen
 * with the user) the crates, the floor and the rail fill the stage like bars do, while the
 * sprites are pixel art drawn at a whole number of screen pixels per unit (`scale`, 1–3), so
 * they stay sharp and never disappear. Sprite-sized distances (the scout's 16, the 2 of
 * clearance, the hook) are in sprite units times that scale.
 */

/** Spec units. */
export const SLOT = 32
export const CRATE_W = 24
/** The height above the floor that crate heights are measured against. */
export const FLOOR_UNITS = 132
/** Under the floor: its 3-unit line, then the 4-unit sorted platform. */
export const FLOOR_LINE = 3
export const PLATFORM_H = 4
export const SCENE_H = 144

export const SCOUT_W = 14
export const SCOUT_H = 16
export const TROLLEY_W = 10
export const TROLLEY_H = 6
export const HOOK = 6
/** The rail is a 2-unit line at y = 1–3; the trolley's wheels sit on it, y = 1–7. */
export const RAIL_TOP = 1
export const RAIL_H = 2
export const TROLLEY_TOP = 1
export const TROLLEY_BOTTOM = TROLLEY_TOP + TROLLEY_H
export const CABLE_REST = 2
export const CABLE_BOW = 8
/** A crate's top can go no higher than y = 12: the trolley's bottom, 1 of cable, 6 of hook,
 * less the 2 of grip. */
export const HIGHEST_TOP = TROLLEY_BOTTOM + 1 + HOOK - 2
/** A carried crate's bottom stays at least this far above the crates it passes. */
export const CLEARANCE = 2
/** The scout's hop rises this far above the higher of the two tops. */
export const HOP_RISE = 14

/**
 * A crate's height as a share of the height above the floor: 10 + 9 × value for values 1–9
 * (the spec), generally 10 + 81 × value / max(largest, 9). The tallest is 91 of 132 (69%),
 * under the spec's 75% cap.
 */
export function crateShare(value: number, largest: number): number {
  const top = Math.max(9, largest)
  return (10 + (81 * Math.abs(value)) / top) / FLOOR_UNITS
}

/** The spec's cap: no crate is taller than this share of the height above the floor. */
export const CRATE_CAP = 0.75

/**
 * Screen pixels per sprite unit: the scene's own scale (the stage's height against the
 * spec's 144, a slot's pitch against its 32), rounded to a whole number, 1 to 3.
 */
export function spriteScale(fieldHeight: number, pitch: number): number {
  const fit = Math.min(fieldHeight / SCENE_H, pitch / SLOT)
  return Math.max(1, Math.min(3, Math.round(fit)))
}

/** Where the scout steps when the crate it stands on is lifted: the next crate to the right,
 * or to the left when it's the last one. */
export function stepOffSlot(slot: number, count: number): number {
  return slot < count - 1 ? slot + 1 : slot - 1
}

export interface CarryInput {
  /** The front slot, where the carried crate goes, and the slot it comes from. */
  readonly front: number
  readonly from: number
  /** Every crate's top, in px from the top of the field (smaller is higher). */
  readonly tops: readonly number[]
  /** The carried crate's height, px. */
  readonly height: number
  /** Where the scout stands during the carry (after stepping off). */
  readonly scoutSlot: number
  /** Screen pixels per sprite unit. */
  readonly scale: number
}

export interface CarryPlan {
  /** The carried crate's top while it's carried, px from the top of the field. */
  readonly liftTop: number
  /** True: it clears every crate between, so it goes over them; false: it passes in front of
   * them, with a shadow under it. */
  readonly over: boolean
}

/**
 * The carry rule: lift as high as fits (its top at y = 12), go over if it clears, otherwise
 * pass in front with a shadow. Clearing means its bottom is at least 2 above the top of every
 * crate between the front and where it came from, plus the scout's 16 on the one it stands
 * on.
 */
export function carryPlan({ front, from, tops, height, scoutSlot, scale }: CarryInput): CarryPlan {
  const liftTop = HIGHEST_TOP * scale
  const lo = Math.min(front, from)
  const hi = Math.max(front, from)
  let lowestBottom = Infinity
  for (let k = lo + 1; k < hi; k++) {
    const top = tops[k] ?? Infinity
    const scout = k === scoutSlot ? SCOUT_H * scale : 0
    lowestBottom = Math.min(lowestBottom, top - scout - CLEARANCE * scale)
  }
  return { liftTop, over: liftTop + height <= lowestBottom }
}

// ---------- Sprites (one letter per pixel) ----------

/** o outline, s steel, d dark steel, l light steel, v visor, e eye, a antenna light. */
export const SCOUT = [
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
] as const

/** The finale's ^ ^ eyes: rows 4 and 5 (h in the eye color). */
export const SCOUT_HAPPY = SCOUT.map((row, y) =>
  y === 4 ? 'osvhvhvvhvhvso' : y === 5 ? 'osvvhvvvvhvvso' : row,
)

export const TROLLEY = [
  '.oo....oo.',
  'oooooooooo',
  'osllllllso',
  'osvvvevvso',
  'oddddddddo',
  'oooooooooo',
] as const

export const HOOK_SPRITE = ['.oo...', '.od...', '.od...', '.od.o.', '.oddo.', '..oo..'] as const

/** One SVG path for every pixel of the given codes, each a 1 × 1 square. */
export function spritePath(rows: readonly string[], ...codes: readonly string[]): string {
  let d = ''
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (codes.includes(row.charAt(x))) d += `M${String(x)} ${String(y)}h1v1h-1z`
    }
  })
  return d
}
