/**
 * TEMPORARY (sounds/quick-sort-cart, DO NOT MERGE): one full quick sort with the cart's sounds,
 * from quick sort's real frames. Each step plays its moment's sound at its start; a step lasts
 * the player's delay, or "Delivered!"'s hold (pizzaHoldMs) when that is longer, as in usePlayer.
 * A frequent sound longer than what is left of its step is cut to fit, 10 ms early (as the
 * spaceships' cues). Picking the leader has no sound of its own (it isn't one of the seven).
 */
import { quickSort } from '../../algorithms/sorting/quickSort'
import { pizzaHoldMs, pizzaPoses, type Action } from '../../characters/pizzaCart/steps'
import { collectFrames } from '../../engine/collect'
import { stepDelayMs, type Speed } from '../../engine/player'
import type { Slot } from './voices'

/** The round's numbers: the site's default list. */
export const ROUND_INPUT = [5, 2, 8, 1, 9, 3]

const SLOT_OF: Readonly<Partial<Record<Action, Slot>>> = {
  look: 'look',
  carry: 'move',
  stay: 'stay',
  nudge: 'nudge',
  deliver: 'deliver',
  done: 'done',
  finale: 'finale',
}

export interface RoundNote {
  readonly slot: Slot
  /** When it starts (ms from the round's start). */
  readonly at: number
  /** The longest it may sound (ms) before the next step: Infinity for the finale. */
  readonly room: number
}

export interface Round {
  readonly notes: readonly RoundNote[]
  /** The whole round, finale included (ms). */
  readonly ms: number
}

export function roundSchedule(speed: Speed, finaleMs: number): Round {
  const { frames } = collectFrames(quickSort, ROUND_INPUT)
  const poses = pizzaPoses(frames)
  const delay = stepDelayMs(speed)
  const notes: RoundNote[] = []
  let t = 0
  poses.forEach((pose, k) => {
    const step = Math.max(delay, pizzaHoldMs(frames, k, delay))
    const slot = k > 0 ? SLOT_OF[pose.action] : undefined
    if (slot) notes.push({ slot, at: t, room: slot === 'finale' ? Infinity : step - 10 })
    t += k === poses.length - 1 ? Math.max(step, finaleMs) : step
  })
  return { notes, ms: t }
}
