/**
 * A golden record of the builder beaver's sounds: every note the sound engine is asked to play on
 * heap sort with the beaver showing, at each speed, with reduced motion off and on, in Watch
 * (forward, three steps back, a jump) and in Do it (right moves, and "Your turn!" as each question
 * waits). Like the records of the other characters' sounds (soundsAndTiming.test.tsx,
 * penguinSounds.test.tsx, spaceshipSounds.test.tsx, cartSounds.test.tsx), a change here is a
 * change the learner would hear.
 */
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { heapSort } from '../algorithms/sorting/heapSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame } from '../engine/types'
import { rightMoveCues, type Move, type Note } from '../sound/cues'
import { SoundContext, type SoundPlayer } from '../sound/SoundContext'
import { useStepSounds } from '../sound/useStepSounds'
import { setReducedMotion } from '../test/matchMedia'

/** The four speeds, as step delays: 0.5×, 1×, 2×, 4×. */
const DELAYS = [1600, 800, 400, 200] as const
const MOTION = [false, true] as const
const FRAMES = collectFrames(heapSort, DEFAULT_INPUT).frames

const show = (value: unknown): string =>
  typeof value === 'number' || typeof value === 'string' ? String(value) : JSON.stringify(value)

/** One note on one line: its voice, then every other field in order. */
const noteLine = (note: Note): string =>
  Object.entries(note)
    .map(([key, value]) => (key === 'voice' ? show(value) : `${key}=${show(value)}`))
    .join(' ')

/** Plays the run through useStepSounds: forward to the end, three steps back, a jump to the
 * start. One line per note, and per stop of everything ("stopAll"); "-" for a silent step. */
function soundsOf(
  frames: readonly Frame[],
  stepDelayMs: number,
  decorate?: (notes: Note[], move: Move) => Note[],
): string {
  // Do it: a question waits on each decision frame.
  const doIt = decorate !== undefined
  const lines: string[] = []
  let head = ''
  const engine: SoundPlayer = {
    isEnabled: true,
    setEnabled: vi.fn(),
    play: (notes) => {
      if (notes.length === 0) lines.push(`${head} -`)
      for (const note of notes) lines.push(`${head} ${noteLine(note)}`)
    },
    stopAll: () => {
      if (head) lines.push(`${head} stopAll`)
    },
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SoundContext value={engine}>{children}</SoundContext>
  )
  const view = renderHook(
    ({ index }: { index: number }) => {
      useStepSounds({
        frames,
        index,
        look: 'beaver',
        stepDelayMs,
        enabled: true,
        decorate,
        asking: doIt && frames[index]?.decision !== undefined,
      })
    },
    { wrapper, initialProps: { index: 0 } },
  )
  const last = frames.length - 1
  const path: (readonly [number, string])[] = []
  for (let k = 1; k <= last; k++) path.push([k, 'forward'])
  for (let k = last - 1; k >= last - 3; k--) path.push([k, 'back'])
  path.push([0, 'jump'])
  for (const [index, label] of path) {
    head = `#${String(index)} ${label}`
    view.rerender({ index })
  }
  head = ''
  view.unmount()
  return lines.join('\n')
}

const doItDecorate = (notes: Note[], move: Move) =>
  move === 'forward' ? rightMoveCues(notes) : notes

describe('golden: the builder beaver’s sounds at every step', () => {
  afterEach(() => {
    setReducedMotion(false)
  })

  for (const reduced of MOTION) {
    for (const delay of DELAYS) {
      it(`heap sort, beaver, ${String(delay)} ms, reduced motion ${reduced ? 'on' : 'off'}`, () => {
        setReducedMotion(reduced)
        expect(soundsOf(FRAMES, delay)).toMatchSnapshot()
      })
    }
    it(`heap sort, beaver, Do it right moves, reduced motion ${reduced ? 'on' : 'off'}`, () => {
      setReducedMotion(reduced)
      expect(soundsOf(FRAMES, 800, doItDecorate)).toMatchSnapshot()
    })
  }
})
