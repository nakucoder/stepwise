/**
 * Merge sort's spaceships: which of their sounds a step makes, and when. Pure, like
 * cuesForStep, and built on the spaceships' own moves and times (src/characters/spaceships/
 * steps.ts), so a sound always lands with the move it belongs to
 * (design/mockups/spaceships/README.md, "Sounds"):
 *
 * - The split (two tones pulling apart), soft, as a squadron peels.
 * - The face-off (a targeting lock-on), soft, as the leads pull forward; on a merge's first
 *   compare, after the gate has opened.
 * - The engine fly-by, loudest as the ship crosses the gate (50% of its flight), pitched by its
 *   value: lower for a longer trail.
 * - The gate shutting, the special moment: the shimmer at once, then the vwoom as the gate starts
 *   to shut. Both move with the shut at every speed, and the vwoom plays in full, ringing out
 *   past a fast step.
 * - The finale's fanfare with the take-offs, in full.
 *
 * Frequent sounds fit inside their step, cut with a short fade on a fast one (like the quack).
 * With reduced motion nothing moves, so each sound plays at its step's start, still cut to fit
 * its step so one never runs into the next; the gate's two parts keep the recipe's own 0.1 s
 * apart, and the fanfare plays at once, in full.
 */
import { fitMs } from '../characters/pixel'
import {
  openAndCompareMs,
  posesOf,
  SHUT_AT,
  SHUT_MS,
  shutMs,
  spaceshipMoves,
  TAKE_AT,
  TAKE_MS,
  TAKEOFF_AT,
} from '../characters/spaceships/steps'
import type { Frame } from '../engine/types'
import type { Move, Note } from './cues'
import { FLY_BY_PEAK_MS, SPACESHIP_VOICE_MS, zipHz, type SpaceshipVoice } from './spaceshipVoices'

/** Room left at the end of a step, so a cut sound has faded before the next one (as the quack). */
const STEP_MARGIN_MS = 10
/** With reduced motion, the vwoom follows the shimmer by the recipe's own 0.1 s. */
const SHOOMP_AFTER_FLASH_MS = 100

/** A frequent sound at `at` ms, cut to fit what is left of the step. */
function fitted(
  voice: SpaceshipVoice,
  at: number,
  stepDelayMs: number,
  extra: Partial<Note> = {},
): Note {
  const room = stepDelayMs - STEP_MARGIN_MS - at
  return {
    voice,
    at,
    ...extra,
    ...(room < SPACESHIP_VOICE_MS[voice] ? { duration: Math.max(0, room) } : {}),
  }
}

/** The fly-by's pitch for ship `id`: its value as a share of the run's largest. */
function zipFor(frames: readonly Frame[], id: number): number {
  const values = frames[0]?.array ?? []
  const largest = Math.max(0, ...values.map((v) => Math.abs(v)))
  return zipHz(largest > 0 ? Math.abs(values[id] ?? 0) / largest : 0)
}

export function spaceshipCuesForStep(
  frames: readonly Frame[],
  index: number,
  move: Move,
  stepDelayMs: number,
  reducedMotion: boolean,
): Note[] {
  if (move === 'jump') return []
  const frame = frames[index]
  if (!frame) return []
  // One step back: the frame's own compare still sounds; nothing else replays.
  if (move === 'back') return frame.decision ? [fitted('ship-blips', 0, stepDelayMs)] : []
  const moves = spaceshipMoves(frames, index, posesOf(frames))
  const opening = moves.some((m) => m.kind === 'gate-open')
  return moves.flatMap((m): Note[] => {
    switch (m.kind) {
      case 'split':
        return [fitted('ship-peel', 0, stepDelayMs)]
      case 'compare': {
        // On a merge's first compare the leads pull forward once the gate has opened.
        const at = opening && !reducedMotion ? Math.round(openAndCompareMs(stepDelayMs).open) : 0
        return [fitted('ship-blips', at, stepDelayMs)]
      }
      case 'take': {
        // Loudest as the ship crosses the gate's bar (the middle of the gate's flash).
        const crossing = ((TAKE_AT.gateFrom + TAKE_AT.gateTo) / 2) * fitMs(TAKE_MS, stepDelayMs)
        const at = reducedMotion ? 0 : Math.max(0, Math.round(crossing) - FLY_BY_PEAK_MS)
        return [fitted('ship-zip', at, stepDelayMs, { frequency: zipFor(frames, m.ship) })]
      }
      case 'shut': {
        // The shimmer, then the vwoom as the gate starts to shut (its moment of the hold).
        const at = reducedMotion
          ? SHOOMP_AFTER_FLASH_MS
          : Math.round((SHUT_AT.flash / SHUT_MS) * shutMs(stepDelayMs))
        return [
          { voice: 'ship-gate-flash', at: 0 },
          { voice: 'ship-gate-shut', at, ringOut: true },
        ]
      }
      case 'finale':
        return [{ voice: 'ship-fanfare', at: reducedMotion ? 0 : TAKEOFF_AT }]
      default:
        return []
    }
  })
}
