import { useEffect, useRef } from 'react'
import type { Frame } from '../engine/types'
import type { StageLook } from '../characters/registry'
import { cuesForStep, type Move, type Note } from './cues'
import { useSoundEngine } from './SoundContext'

/** One step forward (including a tick while playing) or back; anything else is a jump. */
export function moveBetween(from: number, to: number): Move {
  if (to === from + 1) return 'forward'
  if (to === from - 1) return 'back'
  return 'jump'
}

/** Events that let a page start audio (a tap, a click or a key). */
const UNLOCK_EVENTS = ['pointerup', 'keydown'] as const

interface StepSoundsOptions {
  readonly frames: readonly Frame[]
  readonly index: number
  readonly look: StageLook
  readonly stepDelayMs: number
  /** The saved sound choice. */
  readonly enabled: boolean
  /** Changes a step's notes before they play (Do it mode adds its chime to a right move). */
  readonly decorate?: (notes: Note[], move: Move) => Note[]
}

/**
 * Plays each step's sounds as the player moves: one step forward or back sounds, jumps (Home,
 * End, Run, a preset, new numbers) are silent and stop anything still playing.
 *
 * Browsers only start audio after a tap or key press. When sound was saved as on, the engine
 * waits for the learner's first one on this page; the Sound button starts it directly.
 */
export function useStepSounds({
  frames,
  index,
  look,
  stepDelayMs,
  enabled,
  decorate,
}: StepSoundsOptions) {
  const engine = useSoundEngine()
  const last = useRef<{ frames: readonly Frame[]; index: number } | null>(null)

  useEffect(() => {
    const previous = last.current
    last.current = { frames, index }
    if (!previous || (previous.frames === frames && previous.index === index)) return
    const frame = frames[index]
    if (!enabled || !frame) return
    const move = previous.frames === frames ? moveBetween(previous.index, index) : 'jump'
    const from = move === 'jump' ? null : (frames[previous.index] ?? null)
    const notes = cuesForStep(frame, from, move, look, stepDelayMs)
    engine.play(decorate ? decorate(notes, move) : notes)
  }, [engine, frames, index, look, stepDelayMs, enabled, decorate])

  useEffect(() => {
    if (!enabled) {
      engine.setEnabled(false)
      return
    }
    if (engine.isEnabled) return
    const unlock = () => {
      engine.setEnabled(true)
      for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlock, true)
    }
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock, true)
    return () => {
      for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlock, true)
    }
  }, [engine, enabled])

  // Leaving the page stops anything still sounding.
  useEffect(
    () => () => {
      engine.stopAll()
    },
    [engine],
  )
}
