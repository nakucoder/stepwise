/**
 * Selection sort's robots: which of their four sounds a step makes, and when. Pure, like
 * cuesForStep, and built on the robot's own moves (src/characters/robot/steps.ts), so a sound
 * always lands with the move it belongs to:
 *
 * - Scan, soft, at every comparison (in place of the blip).
 * - Lock-on when a new smallest is found.
 * - The claw during the carry: the whine as the hook starts down, the CLANK as it grips, the
 *   whirr as it lifts. The carry speeds up at 2× and 4×, and so do these moments.
 * - The finale with the dance.
 *
 * With reduced motion nothing moves, so each sound plays at its step's moment, the claw's parts
 * as its recipe spaces them.
 */
import type { Frame } from '../engine/types'
import { CARRY_AT, carryMs, DANCE_DELAY_MS, robotMoves } from '../characters/robot/steps'
import type { Move, Note } from './cues'
import { CLANK_HIT_MS, CLAW_PART_AT_MS, ROBOT_VOICE_MS } from './robotVoices'

export function robotCuesForStep(
  frames: readonly Frame[],
  index: number,
  move: Move,
  stepDelayMs: number,
  reducedMotion: boolean,
): Note[] {
  if (move === 'jump') return []
  const frame = frames[index]
  if (!frame) return []
  // One step back: the frame's own comparison still scans; nothing else replays.
  if (move === 'back') {
    return frame.decision?.kind === 'new-smallest' ? [{ voice: 'robot-scan', at: 0 }] : []
  }
  return robotMoves(frames, index).flatMap((m): Note[] => {
    switch (m.kind) {
      case 'scan':
        return [{ voice: 'robot-scan', at: 0 }]
      case 'lock':
        return [{ voice: 'robot-lock', at: 0 }]
      case 'carry':
        return reducedMotion ? clawAsRecipe() : clawWithCarry(carryMs(stepDelayMs))
      case 'finale':
        return [{ voice: 'robot-finale', at: reducedMotion ? 0 : DANCE_DELAY_MS }]
      default:
        return []
    }
  })
}

/** The claw's three parts on the carry's moments. The whine stops where the clank begins. */
function clawWithCarry(carry: number): Note[] {
  const whine = Math.round(carry * CARRY_AT.hookDown)
  const clank = Math.max(whine, Math.round(carry * CARRY_AT.grip) - CLANK_HIT_MS)
  const whirr = Math.round(carry * CARRY_AT.lift)
  return [
    {
      voice: 'claw-whine',
      at: whine,
      ...(clank - whine < ROBOT_VOICE_MS['claw-whine'] ? { duration: clank - whine } : {}),
    },
    { voice: 'claw-clank', at: clank },
    { voice: 'claw-whirr', at: Math.max(whirr, clank + CLANK_HIT_MS) },
  ]
}

/** The claw as its recipe plays it: whine, then the clank at 0.28 s, the whirr at 0.46 s. */
function clawAsRecipe(): Note[] {
  return [
    { voice: 'claw-whine', at: CLAW_PART_AT_MS['claw-whine'] },
    { voice: 'claw-clank', at: CLAW_PART_AT_MS['claw-clank'] },
    { voice: 'claw-whirr', at: CLAW_PART_AT_MS['claw-whirr'] },
  ]
}
