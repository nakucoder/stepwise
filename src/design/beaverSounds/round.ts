/**
 * TEMPORARY (sounds/heap-sort-beaver, DO NOT MERGE): one full heap sort with the beaver's sounds,
 * from heap sort's real frames and the beaver's real moves (src/characters/beaver/steps.ts). A step
 * lasts the player's delay, or the beaver's move when that is longer (beaverHoldMs, as in
 * usePlayer). Each sound starts at its moment in the move:
 *
 * - looking: the step's start; found: the climb's start; the climb: the lift (40%);
 * - a stop: the shrug (30%); the haul: placed so its thud lands on the set-down (85%);
 * - the finale: its start, in full.
 *
 * In Do it, "Your turn!" plays as each look ends and the question waits (THINK_MS, a pretend
 * learner). A sound longer than what is left of its step is cut to fit, 10 ms early (as the
 * other characters' cues). Starting, settling and the handover have no sound of their own.
 */
import { heapSort } from '../../algorithms/sorting/heapSort'
import { beaverHoldMs, beaverMove, CLIMB_AT, HAUL_AT, posesOf } from '../../characters/beaver/steps'
import { collectFrames } from '../../engine/collect'
import { stepDelayMs, type Speed } from '../../engine/player'
import { THINK_MS, type Slot } from './voices'

/** The round's numbers: the site's default list (all within the beaver's 1–12). */
export const ROUND_INPUT = [5, 2, 8, 1, 9, 3]

export type RoundMode = 'watch' | 'doit'

export interface RoundNote {
  readonly slot: Slot
  /** Its moment (ms from the round's start): the haul's is the set-down, where its thud lands. */
  readonly at: number
  /** The earliest it may start (the haul, placed back from its thud, never before its step). */
  readonly earliest: number
  /** When the next step starts (ms from the round's start): Infinity for the finale. */
  readonly until: number
}

export interface Round {
  readonly notes: readonly RoundNote[]
  /** The whole round, finale included (ms). */
  readonly ms: number
}

/** Where a sound starts and how long it may sound, for one note and its option's thud. */
export function placeNote(note: RoundNote, hitMs = 0): { start: number; room: number } {
  const start = Math.max(note.earliest, note.at - hitMs)
  return { start, room: note.until - start - 10 }
}

export function roundSchedule(speed: Speed, finaleMs: number, mode: RoundMode = 'watch'): Round {
  const { frames } = collectFrames(heapSort, ROUND_INPUT)
  const poses = posesOf(frames)
  const delay = stepDelayMs(speed)
  const notes: RoundNote[] = []
  let t = 0
  poses.forEach((_, k) => {
    const move = k > 0 ? beaverMove(frames, k) : null
    // The move's length at this speed (the hold), and the step: the move or the delay if longer.
    const moveLen = beaverHoldMs(frames, k, delay)
    const step = Math.max(delay, moveLen)
    const until = t + step
    const note = (slot: Slot, share: number) => {
      notes.push({ slot, at: t + moveLen * share, earliest: t, until })
    }
    switch (move?.action) {
      case 'look':
        note('look', 0)
        break
      case 'climb':
        note('found', 0)
        note('climb', CLIMB_AT.walk)
        break
      case 'stop':
        note('stop', 0.3)
        break
      case 'haul':
        note('haul', HAUL_AT.land)
        break
      case 'finale':
        notes.push({ slot: 'finale', at: t, earliest: t, until: Infinity })
        break
      default:
        break
    }
    t = k === poses.length - 1 ? t + Math.max(step, finaleMs) : until
    if (mode === 'doit' && move?.action === 'look') {
      notes.push({ slot: 'turn', at: t, earliest: t, until: t + THINK_MS })
      t += THINK_MS
    }
  })
  return { notes, ms: t }
}
