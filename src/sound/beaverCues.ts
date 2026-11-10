/**
 * Heap sort's builder beaver: which of its sounds a step makes, and when. Pure, like
 * cartCuesForStep, and built on the beaver's own moves and times (src/characters/beaver/steps.ts),
 * so a sound always lands with the move it belongs to (the times of the listening page, PR #116):
 *
 * - Looking (sniff-sniff) as the step starts: the beaver walks under the parent and looks up.
 * - Found a bigger one (eep!) with the "!" at a climb's start, then the climb (log roll up) as it
 *   lifts the child's stack (40% of the move).
 * - A stop (shrug puff), the quietest, as it shrugs (30% of the move).
 * - The haul to the woodpile (drumroll and pile), the special move: placed so its logs land
 *   (BEAVER_HAUL_HIT_MS) as the stack is set down (85% of the move).
 * - The finale's marimba fanfare with the stacks' hop wave, in full.
 * - Do it: "Your turn!" (the tail pat and "eh?") as the beaver turns to face the learner, when the
 *   look ends and the question waits.
 *
 * Starting, settling and the handover have no sound of their own. Every move is held (the step
 * waits for it), so each sound ends inside its step at every speed, 10 ms early (cut with a short
 * fade only if it ever needs to be; at 4× none does). With reduced motion nothing moves, so the
 * sounds play at the step's start, one after another.
 */
import { beaverHoldMs, CLIMB_AT, HAUL_AT, posesOf, type Action } from '../characters/beaver/steps'
import type { Frame } from '../engine/types'
import { BEAVER_HAUL_HIT_MS, BEAVER_VOICE_MS, type BeaverVoice } from './beaverVoices'
import type { Move, Note } from './cues'

/** Room left at the end of a step, so a sound has faded before the next one (as the quack). */
const STEP_MARGIN_MS = 10

/** The stop's sound starts as the beaver shrugs: 30% into the move. */
export const SHRUG_AT = 0.3

/** A sound at `at` ms, cut to fit what is left of a step `stepMs` long if it must be. */
function fitted(voice: BeaverVoice, at: number, stepMs: number): Note {
  const room = stepMs - STEP_MARGIN_MS - at
  return { voice, at, ...(room < BEAVER_VOICE_MS[voice] ? { duration: Math.max(0, room) } : {}) }
}

/** A moment's sounds: each voice and when it starts (ms into the step). */
type Placed = readonly (readonly [BeaverVoice, number])[]

/** Where each moment's sounds start, from the move's length at this speed (`ms`). */
function moment(action: Action, ms: number, reducedMotion: boolean): Placed {
  const r = reducedMotion
  switch (action) {
    case 'look':
      return [['beaver-look', 0]]
    case 'climb':
      return [
        ['beaver-found', 0],
        ['beaver-climb', r ? BEAVER_VOICE_MS['beaver-found'] : Math.round(ms * CLIMB_AT.walk)],
      ]
    case 'stop':
      return [['beaver-stop', r ? 0 : Math.round(ms * SHRUG_AT)]]
    case 'haul':
      return [['beaver-haul', r ? 0 : haulAt(ms)]]
    default:
      return []
  }
}

/** When the haul starts in a move `ms` long: its logs land as the stack is set down. */
export function haulAt(ms: number): number {
  return Math.max(0, Math.round(ms * HAUL_AT.land) - BEAVER_HAUL_HIT_MS)
}

export function beaverCuesForStep(
  frames: readonly Frame[],
  index: number,
  move: Move,
  stepDelayMs: number,
  reducedMotion: boolean,
  asking = false,
): Note[] {
  if (move === 'jump' || index <= 0) return []
  const frame = frames[index]
  if (!frame) return []
  // One step back: the frame's own compare still sounds; nothing else replays.
  if (move === 'back') return frame.decision ? [fitted('beaver-look', 0, stepDelayMs)] : []
  const action = posesOf(frames)[index]?.action
  if (!action) return []
  if (action === 'finale') return [{ voice: 'beaver-fanfare', at: 0 }]
  // The move's length at this speed; the step waits for it (the registry's hold).
  const ms = beaverHoldMs(frames, index, stepDelayMs)
  const step = Math.max(stepDelayMs, ms)
  const placed = moment(action, ms, reducedMotion)
  const notes = placed.map(([voice, at]) => fitted(voice, at, step))
  // Do it: the question waits, and the beaver turns to face the learner as its look ends (after
  // the look's own sound). The learner's move comes next, so nothing cuts it but that move.
  if (asking) {
    const after = Math.max(0, ...placed.map(([voice, at]) => at + BEAVER_VOICE_MS[voice]))
    notes.push({ voice: 'beaver-turn', at: reducedMotion ? after : Math.max(ms, after) })
  }
  return notes
}
