/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): B2, the builder beaver, as it works on the
 * stage: a compact sprite (30 × 16) for the lane under the log stacks, as the pizza cart rolls
 * under its boxes. The same beaver as the round-three studies (dark fur, cream cheeks and muzzle,
 * big front teeth, a cross-hatched paddle tail, an orange hard hat), drawn to fit the lane. It
 * faces right; the scene mirrors it to walk left.
 *
 * Its moods (the pizza cart's formula): looking, found a bigger one, a shrug (it stays), carrying
 * a stack over its head, proud (the special move), happy (the finale). Codes as the studies' B2:
 * o outline, f fur, l cream, d feet and paws, t tail, x tail's hatch, e eye, s shine, n nose,
 * w teeth, h hat, H hat's brim, m mouth.
 */
import { Raster, type Grid } from './raster'

export type BeaverPose =
  'idle' | 'walk' | 'walk2' | 'look' | 'found' | 'shrug' | 'carry' | 'proud' | 'happy'

export const LANE_BEAVER_W = 30
export const LANE_BEAVER_H = 16

/** The poses that stand up (the others are on all fours). */
const UPRIGHT: readonly BeaverPose[] = ['idle', 'look', 'shrug', 'carry', 'proud', 'happy']

export function laneBeaverRows(pose: BeaverPose): Grid {
  const r = new Raster(LANE_BEAVER_W, LANE_BEAVER_H)
  const upright = UPRIGHT.includes(pose)
  // The paddle tail, flat on the ground behind, cross-hatched.
  r.disc(5, 13.2, 4.6, 1.6, 't')
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) if (r.get(x, y) === 't' && (x + y) % 3 === 0) r.set(x, y, 'x')

  let head: [number, number]
  if (upright) {
    // Sitting up: a round body, cream belly, a big foot forward.
    r.disc(14, 10.2, 5.4, 4.6, 'f')
    r.disc(15.5, 11, 3, 3.2, 'l')
    r.disc(16.5, 14.2, 3.2, 1.1, 'd')
    head = [18, 5.6]
    const paws: [number, number][] =
      pose === 'carry' || pose === 'proud' || pose === 'happy'
        ? [
            [12, 1],
            [22, 1],
          ]
        : pose === 'shrug'
          ? [
              [8, 6],
              [25, 6],
            ]
          : [[21, 9]]
    // Arms from the shoulders to the paws.
    for (const [px, py] of paws) {
      const sx = px < 16 ? 12 : 17
      r.path(
        [
          [sx, 8],
          [px, py],
        ],
        1.8,
        'f',
      )
      r.disc(px, py, 1.1, 0.9, 'd')
    }
  } else {
    // On all fours: a long low body, short legs (they swap between the two walk frames).
    r.disc(14, 10.4, 7.6, 3.8, 'f')
    r.disc(15, 12.4, 4.6, 1.3, 'l')
    const step = pose === 'walk2' ? 1 : 0
    for (const x of [9 + step, 12 - step, 17 + step, 20 - step]) r.disc(x, 14, 1, 1.2, 'd')
    head = [23, 8.4]
  }

  // The head: dark fur, cream cheek and muzzle, the nose, the teeth.
  const [hx, hy] = head
  r.disc(hx, hy, 3.6, 3.3, 'f')
  r.disc(hx + 1.6, hy + 1.2, 2.6, 1.7, 'l')
  r.set(hx + 4, hy, 'n')
  r.set(hx + 2, hy + 3, 'w')
  r.set(hx + 2, hy + 4, 'w')
  r.set(hx + 3, hy + 3, 'w')
  r.set(hx + 3, hy + 4, 'w')
  // The hard hat: a low dome and a brim, tipped back a little.
  for (let y = hy - 5; y <= hy - 3; y++)
    for (let x = hx - 4; x <= hx + 3; x++)
      if (((x - hx + 0.5) / 3.8) ** 2 + ((y - (hy - 2.6)) / 2.6) ** 2 <= 1) r.set(x, y, 'h')
  for (let x = hx - 4; x <= hx + 5; x++) r.set(x, hy - 2.5, 'H')

  // The eye, by mood.
  const ex = hx + 1
  const ey = hy - 1
  if (pose === 'proud' || pose === 'happy') {
    // Happy closed eyes: a little arch.
    r.set(ex - 1, ey, 'e')
    r.set(ex, ey - 1, 'e')
    r.set(ex + 1, ey, 'e')
  } else if (pose === 'found') {
    // Wide eyes: 2 × 2 with a shine.
    r.set(ex, ey - 1, 'e')
    r.set(ex + 1, ey - 1, 's')
    r.set(ex, ey, 'e')
    r.set(ex + 1, ey, 'e')
  } else if (pose === 'shrug') {
    // Half-closed: a flat line.
    r.set(ex, ey, 'e')
    r.set(ex + 1, ey, 'e')
  } else if (pose === 'look') {
    // Looking up and ahead.
    r.set(ex + 1, ey - 1, 'e')
    r.set(ex + 1, ey, 'e')
  } else {
    r.set(ex, ey, 'e')
    r.set(ex, ey + 1, 'e')
  }
  // A smile when proud or happy, an open mouth when happy.
  if (pose === 'proud' || pose === 'happy') r.set(hx + 1, hy + 2.6, 'm')
  if (pose === 'happy') r.set(hx, hy + 2.4, 'm')
  r.outline('o')
  return r.grid()
}

/** Where a carried stack rests on the beaver's raised paws: the sprite's top row. */
export const CARRY_TOP = 1
