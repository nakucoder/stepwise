/**
 * The character registry: each character's name on the "Show as" switch, its icon, the scene
 * that draws it on the stage, and its own step sounds if it has them. Which algorithm uses
 * which character is `Algorithm.character` (bubble sort: ducks).
 *
 * The look preference is "bars" or "character", so one choice carries across algorithms; the
 * stage and the sounds get the look resolved for the algorithm on screen ("bars", or its
 * character's id).
 */
import type { ComponentType } from 'react'
import { PixelDuck } from '../components/PixelDuck'
import { DuckScene } from './ducks/DuckScene'
import { PenguinScene } from './penguins/PenguinScene'
import { PixelCart } from './pizzaCart/PixelCart'
import { PizzaCartScene } from './pizzaCart/PizzaCartScene'
import { pizzaHoldMs } from './pizzaCart/steps'
import { PixelPenguin } from './penguins/PixelPenguin'
import { penguinHoldMs } from './penguins/steps'
import { PixelScout } from './robot/PixelScout'
import { RobotScene } from './robot/RobotScene'
import { robotHoldMs } from './robot/steps'
import { PixelFighter } from './spaceships/PixelFighter'
import { SpaceshipScene } from './spaceships/SpaceshipScene'
import { spaceshipHoldMs } from './spaceships/steps'
import { fitsRange, type ValueRange } from '../engine/input'
import type { Algorithm, CharacterId, Frame, Level } from '../engine/types'
import type { Look } from '../preferences/preferences'
import { cuesForStep, type StepCues } from '../sound/cues'
import { penguinCuesForStep } from '../sound/penguinCues'
import { robotCuesForStep } from '../sound/robotCues'
import { spaceshipCuesForStep } from '../sound/spaceshipCues'

/** What the stage gives a character's scene. */
export interface SceneProps {
  /** The frame on screen. */
  readonly frame: Frame
  /** The whole run and where the frame is in it (the robots follow the run, not one frame). */
  readonly frames: readonly Frame[]
  readonly index: number
  /** The player's delay between steps, so a move fits its step (src/characters/pixel.ts). */
  readonly stepDelayMs: number
  /** Only final poses: no motion. */
  readonly reducedMotion: boolean
  /** The learning level on screen (a scene may say more or less, like the stage's tags). */
  readonly level: Level
  /** Do it: a question is waiting for the learner's answer (Watch: never). */
  readonly asking: boolean
}

/**
 * How the stage draws a character. The scene takes the place of the bars in the stage's field
 * and plays its own moves (the stage's bar swap never runs under it). Merge sort's second row
 * is drawn by the bars, or by a scene that says it draws it (`twoRows`). The pointer and role
 * tags under the values stay the stage's.
 *
 * Engineer's value buttons for a second-row question (merge sort) lie over the element in the
 * field marked `data-pick-band` (its top to its bottom, or to the bottom of the tags under the
 * stage with `data-pick-band="to-bottom"`); without one, over the whole column.
 */
export interface CharacterScene {
  /** Draws the values. */
  readonly Scene: ComponentType<SceneProps>
  /** The stage view's class while it shows, for the character's CSS (e.g. "is-ducks"). */
  readonly className: string
  /** Another class for the view at this moment (the ducks' finale bob: "is-celebrating"). */
  readonly viewClass?: (state: {
    readonly allSorted: boolean
    readonly reducedMotion: boolean
  }) => string | false
  /** From this many values, the role tags under the values are symbols instead of words. */
  readonly symbolsFrom?: number
  /**
   * The scene draws merge sort's second row itself. The stage then describes both rows to
   * screen readers, and the one row of tags under the values shows both: the second row's
   * role where it has one, and the pointers of both rows (src/components/stageRoles.ts).
   */
  readonly twoRows?: boolean
}

export interface CharacterInfo {
  /** Shown on the "Show as" switch, e.g. "Ducks". */
  readonly name: string
  /** A small pixel icon beside the name, if the character has one yet. */
  readonly icon: ComponentType | null
  /** Whether the stage can draw it yet. Until it can, its algorithm shows bars, no switch. */
  readonly drawn: boolean
  /** How the stage draws it (every drawn character has one). */
  readonly scene?: CharacterScene
  /** Its own sounds for each step, if it has them. Absent: the bars' sounds. */
  readonly cues?: StepCues
  /**
   * How long frame `index` must stay on screen so the character's special move can finish (the
   * robots' carry): the player and Do it wait at least that long. Absent: never longer than
   * the step.
   */
  readonly holdMs?: (frames: readonly Frame[], index: number, stepDelayMs: number) => number
  /**
   * The values it can draw, if fewer than the bars' 0–99, and what the stage says when the
   * numbers on screen don't fit (it shows bars then, with a button to use the numbers' ranks).
   */
  readonly range?: { readonly values: ValueRange; readonly note: string }
}

export const CHARACTERS: Readonly<Record<CharacterId, CharacterInfo>> = {
  ducks: {
    name: 'Ducks',
    icon: PixelDuck,
    drawn: true,
    scene: {
      Scene: DuckScene,
      className: 'is-ducks',
      // When every value is in its final spot, the ducks bob for joy (not with reduced motion).
      viewClass: ({ allSorted, reducedMotion }) => allSorted && !reducedMotion && 'is-celebrating',
      // With this many values the words don't fit under each duck; symbols do (the key explains).
      symbolsFrom: 9,
    },
    // The step's cues, with the ducks' quack and drop of water on a trade (src/sound/cues.ts).
    cues: ({ frames, index, from, move, stepDelayMs }) => {
      const frame = frames[index]
      return frame ? cuesForStep(frame, from, move, 'ducks', stepDelayMs) : []
    },
  },
  // Selection sort's "Scout and Crane" (design/mockups/robot/README.md).
  robot: {
    name: 'Robots',
    icon: PixelScout,
    drawn: true,
    // The whole scene: crates, the scout and the crane (src/characters/robot).
    scene: { Scene: RobotScene, className: 'is-robot' },
    // Their own sounds, tied to their moves (src/sound/robotCues.ts).
    cues: ({ frames, index, move, stepDelayMs, reducedMotion }) =>
      robotCuesForStep(frames, index, move, stepDelayMs, reducedMotion),
    // The carry keeps its full time; the step waits for it (src/characters/robot/steps.ts).
    holdMs: robotHoldMs,
  },
  // Insertion sort's "Snow-brick towers" (design/mockups/penguins/README.md).
  penguins: {
    name: 'Penguins',
    icon: PixelPenguin,
    drawn: true,
    // The whole scene: snow-brick towers and their penguins (src/characters/penguins).
    scene: { Scene: PenguinScene, className: 'is-penguins' },
    // Their own sounds, tied to their moves (src/sound/penguinCues.ts).
    cues: ({ frames, index, move, stepDelayMs, reducedMotion }) =>
      penguinCuesForStep(frames, index, move, stepDelayMs, reducedMotion),
    // The slide into place keeps its full time; the step waits for it.
    holdMs: penguinHoldMs,
  },
  // Merge sort's "Squadrons and a stargate" (design/mockups/spaceships/README.md).
  spaceships: {
    name: 'Spaceships',
    icon: PixelFighter,
    drawn: true,
    // The whole scene, both rows: squadrons, the halves under the gate (src/characters/spaceships).
    scene: { Scene: SpaceshipScene, className: 'is-spaceships', twoRows: true },
    // Their own sounds, tied to their moves (src/sound/spaceshipCues.ts).
    cues: ({ frames, index, move, stepDelayMs, reducedMotion }) =>
      spaceshipCuesForStep(frames, index, move, stepDelayMs, reducedMotion),
    // The gate's flash and shut keeps its full time; the step waits for it.
    holdMs: spaceshipHoldMs,
  },
  // Quick sort's "Delivery cart and pizza boxes" (design/mockups/pizza-cart/README.md).
  pizzaCart: {
    name: 'Pizza cart',
    icon: PixelCart,
    drawn: true,
    // The whole scene: the stacks of pizza boxes, the street and the cart (src/characters/pizzaCart).
    scene: { Scene: PizzaCartScene, className: 'is-pizza-cart' },
    // "Delivered!" keeps its full time; the step waits for it.
    holdMs: pizzaHoldMs,
    // One box per count: a stack of 12 is the most a stage can hold.
    range: { values: { min: 1, max: 12 }, note: 'The pizza cart carries 1 to 12 boxes.' },
  },
}

/** The algorithm's character, if the stage can draw it yet (else none: bars, no switch). */
export function drawnCharacter(
  algorithm: Pick<Algorithm, 'character'> | undefined,
): CharacterId | undefined {
  const character = algorithm?.character
  return character && CHARACTERS[character].drawn ? character : undefined
}

/** What the stage draws: bars, or a character. */
export type StageLook = 'bars' | CharacterId

/**
 * The look for this algorithm: its character when the learner wants one and it has one, and the
 * numbers fit its range (else bars: the stage says why, `rangeNote`).
 */
export function stageLook(
  look: Look,
  algorithm: Pick<Algorithm, 'character'> | undefined,
  numbers?: readonly number[],
): StageLook {
  const character = algorithm?.character
  if (look !== 'character' || !character) return 'bars'
  return numbers && rangeNote(character, numbers) ? 'bars' : character
}

/** The values the learner's look can draw, if they are fewer than the bars' (the pizza cart's 1–12). */
export function lookRange(
  look: Look,
  algorithm: Pick<Algorithm, 'character'> | undefined,
): ValueRange | undefined {
  const character = algorithm?.character
  return look === 'character' && character ? CHARACTERS[character].range?.values : undefined
}

/** What the stage says when the numbers don't fit the character's range; null when they do. */
export function rangeNote(character: CharacterId, numbers: readonly number[]): string | null {
  const range = CHARACTERS[character].range
  return range && !fitsRange(numbers, range.values) ? range.note : null
}
