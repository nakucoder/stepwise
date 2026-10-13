/**
 * Insertion sort's penguins: which of their sounds a step makes, and when. Pure, like
 * cuesForStep, and built on the penguins' own moves (src/characters/penguins/steps.ts), so a
 * sound always lands with the move it belongs to (design/mockups/penguins/README.md, "Sounds"):
 *
 * - Tap, soft, at every comparison.
 * - Swish, soft, as a bigger tower shifts right.
 * - The slide into place: the whoosh, placed to end as the sled reaches the gap (78% of the
 *   slide) and cut where the call starts, as the penguin stands up (90%). The call rings out
 *   into the next step. The slide speeds up at 2× and 4×, and so do these moments.
 * - Already in place: the call, short and higher, with the hop, cut to fit a fast step.
 * - The finale with the flipper wave, in full.
 *
 * With reduced motion nothing moves, so each sound plays at its step's moment: the whoosh at
 * once and the call after it (0.9 s, or sooner when the slide is shorter), the short call and
 * the finale at once.
 */
import { FLAP_DELAY_MS, inPlaceMs, penguinMoves, slideMs } from '../characters/penguins/steps'
import type { Frame } from '../engine/types'
import type { Move, Note } from './cues'
import { PENGUIN_VOICE_MS } from './penguinVoices'

/** The slide's moments, as fractions of it: the sled reaches the gap; the penguin stands up. */
const SLED_AT_GAP = 0.78
const STANDS_UP = 0.9
/** Room left at the end of a step, so a cut sound has faded before the next one (as the quack). */
const STEP_MARGIN_MS = 10

const WHOOSH_MS = PENGUIN_VOICE_MS['penguin-whoosh']
const SHORT_CALL_MS = PENGUIN_VOICE_MS['penguin-call-short']

/** The slide's two sounds: the whoosh, cut where the call starts, then the call, ringing out. */
function slideCues(stepDelayMs: number, reducedMotion: boolean): Note[] {
  const slide = slideMs(stepDelayMs)
  const callAt = reducedMotion
    ? Math.min(WHOOSH_MS, Math.round(STANDS_UP * slide))
    : Math.round(STANDS_UP * slide)
  const whooshAt = reducedMotion ? 0 : Math.max(0, Math.round(SLED_AT_GAP * slide) - WHOOSH_MS)
  const whooshFor = callAt - whooshAt
  return [
    {
      voice: 'penguin-whoosh',
      at: whooshAt,
      ...(whooshFor < WHOOSH_MS ? { duration: whooshFor } : {}),
    },
    { voice: 'penguin-call', at: callAt, ringOut: true },
  ]
}

/** Already in place: the short call with the hop, cut to fit the step (like the quack). */
function inPlaceCue(stepDelayMs: number, reducedMotion: boolean): Note {
  const at = reducedMotion ? 0 : Math.round(inPlaceMs(stepDelayMs).back)
  const room = stepDelayMs - STEP_MARGIN_MS - at
  return {
    voice: 'penguin-call-short',
    at,
    ...(room < SHORT_CALL_MS ? { duration: Math.max(0, room) } : {}),
  }
}

export function penguinCuesForStep(
  frames: readonly Frame[],
  index: number,
  move: Move,
  stepDelayMs: number,
  reducedMotion: boolean,
): Note[] {
  if (move === 'jump') return []
  const frame = frames[index]
  if (!frame) return []
  // One step back: the frame's own comparison still taps; nothing else replays.
  if (move === 'back') return frame.decision ? [{ voice: 'penguin-tap', at: 0 }] : []
  return penguinMoves(frames, index).flatMap((m): Note[] => {
    switch (m.kind) {
      case 'compare':
        return [{ voice: 'penguin-tap', at: 0 }]
      case 'shift':
        return [{ voice: 'penguin-swish', at: 0 }]
      case 'slide':
        return slideCues(stepDelayMs, reducedMotion)
      case 'in-place':
        return [inPlaceCue(stepDelayMs, reducedMotion)]
      case 'finale':
        return [{ voice: 'penguin-finale', at: reducedMotion ? 0 : FLAP_DELAY_MS }]
      default:
        return []
    }
  })
}
