/**
 * Quick sort's pizza cart: which of its sounds a step makes, and when. Pure, like cuesForStep,
 * and built on the cart's own poses and times (src/characters/pizzaCart/steps.ts), so a sound
 * always lands with the move it belongs to:
 *
 * - Looking (the curious "hm?") as the cart rolls under the value it compares.
 * - Found it (boop-beep and roll) as it carries a stack into the left zone.
 * - Stays right (a hush), the quietest, as the stack wobbles.
 * - A trade with itself (knock-knock) as the stack is nudged.
 * - "Delivered!" (ding-dong and steam), the special moment, as the leader is set down in its gap
 *   and the lid flips up; at a fast speed it starts sooner, so it always ends inside the held step.
 * - A range done (blip-blip-bloop) as the green mark goes under it.
 * - The finale's toy-horn fanfare with the stacks' hop wave, in full.
 *
 * Picking the leader has no sound of its own. Every frequent sound fits inside its step, ending
 * 10 ms early (cut with a short fade only if it ever needs to be; at 4× none does). With reduced
 * motion nothing moves, so each sound plays at its step's start.
 */
import {
  DELIVER_AT,
  DELIVER_MS,
  deliverMs,
  posesOf,
  type Action,
} from '../characters/pizzaCart/steps'
import type { Frame } from '../engine/types'
import { CART_VOICE_MS, type CartVoice } from './cartVoices'
import type { Move, Note } from './cues'

/** Room left at the end of a step, so a sound has faded before the next one (as the quack). */
const STEP_MARGIN_MS = 10

/** Each moment's sound; picking the leader (and the first frame) has none. */
const VOICE_OF: Readonly<Partial<Record<Action, CartVoice>>> = {
  look: 'cart-look',
  carry: 'cart-move',
  stay: 'cart-stay',
  nudge: 'cart-nudge',
  deliver: 'cart-deliver',
  done: 'cart-done',
  finale: 'cart-fanfare',
}

/** A frequent sound at `at` ms, cut to fit what is left of the step if it must be. */
function fitted(voice: CartVoice, at: number, stepMs: number): Note {
  const room = stepMs - STEP_MARGIN_MS - at
  return { voice, at, ...(room < CART_VOICE_MS[voice] ? { duration: Math.max(0, room) } : {}) }
}

/**
 * When "Delivered!" sounds: as the leader is set down (the drop, 950 ms of the 1.6 s at 1×), or
 * sooner when that would run past the held step, so it always plays in full inside it.
 */
export function deliverAt(stepDelayMs: number): number {
  const hold = deliverMs(stepDelayMs)
  const drop = Math.round(DELIVER_AT.drop * (hold / DELIVER_MS))
  return Math.max(0, Math.min(drop, hold - STEP_MARGIN_MS - CART_VOICE_MS['cart-deliver']))
}

export function cartCuesForStep(
  frames: readonly Frame[],
  index: number,
  move: Move,
  stepDelayMs: number,
  reducedMotion: boolean,
): Note[] {
  if (move === 'jump' || index <= 0) return []
  const frame = frames[index]
  if (!frame) return []
  // One step back: the frame's own compare still sounds; nothing else replays.
  if (move === 'back') return frame.decision ? [fitted('cart-look', 0, stepDelayMs)] : []
  const voice = VOICE_OF[posesOf(frames)[index]?.action ?? 'idle']
  if (!voice) return []
  if (voice === 'cart-fanfare') return [{ voice, at: 0 }]
  if (voice === 'cart-deliver') return [{ voice, at: reducedMotion ? 0 : deliverAt(stepDelayMs) }]
  return [fitted(voice, 0, stepDelayMs)]
}
