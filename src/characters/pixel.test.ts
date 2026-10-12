import { afterEach, describe, expect, it } from 'vitest'
import { BASE_STEP_DELAY_MS } from '../engine/player'
import { swapDurationMs } from '../lib/motion'
import { setReducedMotion } from '../test/matchMedia'
import { fitMs, pixelScale, specialMs, spritePath } from './pixel'
import { SCENE_H, SLOT, spriteScale } from './robot/geometry'
import { CARRY_MS, carryMs } from './robot/steps'

/** The four speeds, as step delays: 0.5×, 1×, 2×, 4×. */
const DELAYS = [1600, 800, 400, 200] as const

/** The bath duck's grid, as PixelDuck draws it. */
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

// The duck's four paths as its old, private copy of this rule made them, frozen.
const OUTLINE =
  'M7 0h1v1h-1zM8 0h1v1h-1zM9 0h1v1h-1zM10 0h1v1h-1zM6 1h1v1h-1zM11 1h1v1h-1zM5 2h1v1h-1zM12 2h1v1h-1zM5 3h1v1h-1zM9 3h1v1h-1zM12 3h1v1h-1zM5 4h1v1h-1zM12 4h1v1h-1zM6 5h1v1h-1zM12 5h1v1h-1zM7 6h1v1h-1zM11 6h1v1h-1zM0 7h1v1h-1zM1 7h1v1h-1zM6 7h1v1h-1zM12 7h1v1h-1zM0 8h1v1h-1zM2 8h1v1h-1zM5 8h1v1h-1zM13 8h1v1h-1zM0 9h1v1h-1zM3 9h1v1h-1zM4 9h1v1h-1zM5 9h1v1h-1zM14 9h1v1h-1zM0 10h1v1h-1zM14 10h1v1h-1zM1 11h1v1h-1zM14 11h1v1h-1zM2 12h1v1h-1zM13 12h1v1h-1zM3 13h1v1h-1zM4 13h1v1h-1zM5 13h1v1h-1zM6 13h1v1h-1zM7 13h1v1h-1zM8 13h1v1h-1zM9 13h1v1h-1zM10 13h1v1h-1zM11 13h1v1h-1zM12 13h1v1h-1zM13 13h1v1h-1z'
const BODY =
  'M7 1h1v1h-1zM8 1h1v1h-1zM9 1h1v1h-1zM10 1h1v1h-1zM6 2h1v1h-1zM7 2h1v1h-1zM8 2h1v1h-1zM9 2h1v1h-1zM10 2h1v1h-1zM11 2h1v1h-1zM6 3h1v1h-1zM7 3h1v1h-1zM8 3h1v1h-1zM10 3h1v1h-1zM11 3h1v1h-1zM6 4h1v1h-1zM7 4h1v1h-1zM8 4h1v1h-1zM9 4h1v1h-1zM10 4h1v1h-1zM11 4h1v1h-1zM7 5h1v1h-1zM8 5h1v1h-1zM9 5h1v1h-1zM10 5h1v1h-1zM11 5h1v1h-1zM8 6h1v1h-1zM9 6h1v1h-1zM10 6h1v1h-1zM7 7h1v1h-1zM8 7h1v1h-1zM9 7h1v1h-1zM10 7h1v1h-1zM11 7h1v1h-1zM1 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM8 8h1v1h-1zM9 8h1v1h-1zM10 8h1v1h-1zM11 8h1v1h-1zM12 8h1v1h-1zM1 9h1v1h-1zM2 9h1v1h-1zM6 9h1v1h-1zM7 9h1v1h-1zM8 9h1v1h-1zM9 9h1v1h-1zM10 9h1v1h-1zM11 9h1v1h-1zM12 9h1v1h-1zM13 9h1v1h-1zM1 10h1v1h-1zM2 10h1v1h-1zM3 10h1v1h-1zM4 10h1v1h-1zM5 10h1v1h-1zM6 10h1v1h-1zM11 10h1v1h-1zM12 10h1v1h-1zM13 10h1v1h-1zM2 11h1v1h-1zM3 11h1v1h-1zM4 11h1v1h-1zM5 11h1v1h-1zM6 11h1v1h-1zM7 11h1v1h-1zM11 11h1v1h-1zM12 11h1v1h-1zM13 11h1v1h-1zM3 12h1v1h-1zM4 12h1v1h-1zM5 12h1v1h-1zM6 12h1v1h-1zM7 12h1v1h-1zM8 12h1v1h-1zM9 12h1v1h-1zM10 12h1v1h-1zM11 12h1v1h-1zM12 12h1v1h-1z'
const SHADE =
  'M7 10h1v1h-1zM8 10h1v1h-1zM9 10h1v1h-1zM10 10h1v1h-1zM8 11h1v1h-1zM9 11h1v1h-1zM10 11h1v1h-1z'
const BEAK = 'M13 3h1v1h-1zM14 3h1v1h-1zM13 4h1v1h-1zM14 4h1v1h-1zM15 4h1v1h-1z'

describe('spritePath', () => {
  it('an empty grid, or a code that isn’t there, draws nothing', () => {
    expect(spritePath([], 'o')).toBe('')
    expect(spritePath(['..', '..'], 'o')).toBe('')
    expect(spritePath(['oo'])).toBe('')
  })

  it('one 1 × 1 square per pixel, row by row, left to right', () => {
    expect(spritePath(['.o'], 'o')).toBe('M1 0h1v1h-1z')
    expect(spritePath(['o.', '.o'], 'o')).toBe('M0 0h1v1h-1zM1 1h1v1h-1z')
  })

  it('several codes in one path', () => {
    expect(spritePath(['ab', 'ba'], 'a', 'b')).toBe(
      'M0 0h1v1h-1zM1 0h1v1h-1zM0 1h1v1h-1zM1 1h1v1h-1z',
    )
  })

  it('draws the duck exactly as before', () => {
    expect(spritePath(DUCK, 'o', 'e')).toBe(OUTLINE)
    expect(spritePath(DUCK, 'b')).toBe(BODY)
    expect(spritePath(DUCK, 's')).toBe(SHADE)
    expect(spritePath(DUCK, 'k')).toBe(BEAK)
  })
})

describe('pixelScale', () => {
  it('rounds to a whole number of screen pixels, from 1 to the most allowed', () => {
    expect(pixelScale(0, 3)).toBe(1)
    expect(pixelScale(-2, 3)).toBe(1)
    expect(pixelScale(0.4, 3)).toBe(1)
    expect(pixelScale(1.4, 3)).toBe(1)
    expect(pixelScale(1.5, 3)).toBe(2)
    expect(pixelScale(2.6, 3)).toBe(3)
    expect(pixelScale(4, 3)).toBe(3)
    expect(pixelScale(4, 4)).toBe(4)
  })

  it('the robots’ scale (1×, 2×, 3×, capped there) is unchanged over a grid of stage sizes', () => {
    const before = (height: number, pitch: number) =>
      Math.max(1, Math.min(3, Math.round(Math.min(height / SCENE_H, pitch / SLOT))))
    for (const height of [20, 72, 144, 216, 300, 432, 900]) {
      for (const pitch of [8, 16, 32, 47, 48, 57, 64, 80, 96, 200]) {
        expect(spriteScale(height, pitch)).toBe(before(height, pitch))
      }
    }
    expect(spriteScale(120, 26)).toBe(1)
    expect(spriteScale(300, 57)).toBe(2)
    expect(spriteScale(450, 166)).toBe(3)
  })
})

describe('fitMs', () => {
  it('a frequent move keeps its length while it fits in 90% of the step', () => {
    expect(DELAYS.map((d) => fitMs(900, d))).toEqual([900, 720, 360, 180])
    expect(DELAYS.map((d) => fitMs(350, d))).toEqual([350, 350, 350, 180])
  })

  it('another share of the step: the ducks’ swap, 60% of it, never over 450 ms', () => {
    expect(DELAYS.map((d) => fitMs(450, d, 0.6))).toEqual([450, 450, 240, 120])
    for (const d of DELAYS) {
      expect(swapDurationMs(d)).toBe(fitMs(450, d, 0.6))
      expect(swapDurationMs(d)).toBe(Math.min(450, d * 0.6))
    }
  })
})

describe('specialMs', () => {
  it('its full length at 1× and slower, divided by the speed above 1×', () => {
    expect(DELAYS.map((d) => specialMs(3400, d))).toEqual([3400, 3400, 1700, 850])
    expect(specialMs(1600, BASE_STEP_DELAY_MS)).toBe(1600)
  })

  it('the robots’ carry is the special move, unchanged', () => {
    for (const d of DELAYS) {
      expect(carryMs(d)).toBe(specialMs(CARRY_MS, d))
      expect(carryMs(d)).toBe(CARRY_MS * Math.min(1, d / 800))
    }
  })
})

describe('reduced motion', () => {
  afterEach(() => {
    setReducedMotion(false)
  })

  it('the rules don’t depend on it: the scene and the sounds decide what reduced motion shows', () => {
    const all = () => DELAYS.flatMap((d) => [fitMs(900, d), fitMs(450, d, 0.6), specialMs(3400, d)])
    const off = all()
    setReducedMotion(true)
    expect(all()).toEqual(off)
  })
})
