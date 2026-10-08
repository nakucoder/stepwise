/**
 * The character registry: each character's name on the "Show as" switch, and its icon. Which
 * algorithm uses which character is `Algorithm.character` (bubble sort: ducks).
 *
 * The look preference is "bars" or "character", so one choice carries across algorithms; the
 * stage and the sounds get the look resolved for the algorithm on screen ("bars", or its
 * character's id).
 */
import type { ComponentType } from 'react'
import { PixelDuck } from '../components/PixelDuck'
import { PixelScout } from './robot/PixelScout'
import type { Algorithm, CharacterId } from '../engine/types'
import type { Look } from '../preferences/preferences'

export interface CharacterInfo {
  /** Shown on the "Show as" switch, e.g. "Ducks". */
  readonly name: string
  /** A small pixel icon beside the name, if the character has one yet. */
  readonly icon: ComponentType | null
  /** Whether the stage can draw it yet. Until it can, its algorithm shows bars, no switch. */
  readonly drawn: boolean
}

export const CHARACTERS: Readonly<Record<CharacterId, CharacterInfo>> = {
  ducks: { name: 'Ducks', icon: PixelDuck, drawn: true },
  // Selection sort's "Scout and Crane" (design/mockups/robot/README.md).
  robot: { name: 'Robots', icon: PixelScout, drawn: true },
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
