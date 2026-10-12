/**
 * The character registry: each character's name on the "Show as" switch, its icon, and its own
 * step sounds if it has them. Which algorithm uses which character is `Algorithm.character`
 * (bubble sort: ducks).
 *
 * The look preference is "bars" or "character", so one choice carries across algorithms; the
 * stage and the sounds get the look resolved for the algorithm on screen ("bars", or its
 * character's id).
 */
import type { ComponentType } from 'react'
import { PixelDuck } from '../components/PixelDuck'
import { PixelScout } from './robot/PixelScout'
import { robotHoldMs } from './robot/steps'
import type { Algorithm, CharacterId, Frame } from '../engine/types'
import type { Look } from '../preferences/preferences'
import { cuesForStep, type StepCues } from '../sound/cues'
import { robotCuesForStep } from '../sound/robotCues'

export interface CharacterInfo {
  /** Shown on the "Show as" switch, e.g. "Ducks". */
  readonly name: string
  /** A small pixel icon beside the name, if the character has one yet. */
  readonly icon: ComponentType | null
  /** Whether the stage can draw it yet. Until it can, its algorithm shows bars, no switch. */
  readonly drawn: boolean
  /** Its own sounds for each step, if it has them. Absent: the bars' sounds. */
  readonly cues?: StepCues
  /**
   * How long frame `index` must stay on screen so the character's special move can finish (the
   * robots' carry): the player and Do it wait at least that long. Absent: never longer than
   * the step.
   */
  readonly holdMs?: (frames: readonly Frame[], index: number, stepDelayMs: number) => number
}

export const CHARACTERS: Readonly<Record<CharacterId, CharacterInfo>> = {
  ducks: {
    name: 'Ducks',
    icon: PixelDuck,
    drawn: true,
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
    // Their own sounds, tied to their moves (src/sound/robotCues.ts).
    cues: ({ frames, index, move, stepDelayMs, reducedMotion }) =>
      robotCuesForStep(frames, index, move, stepDelayMs, reducedMotion),
    // The carry keeps its full time; the step waits for it (src/characters/robot/steps.ts).
    holdMs: robotHoldMs,
  },
  // Insertion sort's "Snow-brick towers" (design/mockups/penguins). Named only: no renderer yet.
  penguins: { name: 'Penguins', icon: null, drawn: false },
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

/** The look for this algorithm: its character when the learner wants one and it has one. */
export function stageLook(
  look: Look,
  algorithm: Pick<Algorithm, 'character'> | undefined,
): StageLook {
  const character = algorithm?.character
  return look === 'character' && character ? character : 'bars'
}
