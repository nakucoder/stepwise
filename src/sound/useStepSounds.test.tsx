import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame } from '../engine/types'
import { cuesForStep } from './cues'
import { SoundContext, type SoundPlayer } from './SoundContext'
import { moveBetween, useStepSounds } from './useStepSounds'

const FRAMES = collectFrames(bubbleSort, DEFAULT_INPUT).frames
const OTHER = collectFrames(bubbleSort, [3, 1, 2]).frames
const frame = (index: number): Frame => {
  const found = FRAMES[index]
  if (!found) throw new Error(`no frame ${String(index)}`)
  return found
}

function fakeEngine(enabledAtStart = false) {
  let enabled = enabledAtStart
  const play = vi.fn<SoundPlayer['play']>()
  const stopAll = vi.fn<SoundPlayer['stopAll']>()
  const setEnabled = vi.fn((on: boolean) => {
    enabled = on
  })
  const engine: SoundPlayer = {
    get isEnabled() {
      return enabled
    },
    setEnabled,
    play,
    stopAll,
  }
  return { engine, play, stopAll, setEnabled }
}

interface Props {
  readonly frames: readonly Frame[]
  readonly index: number
  readonly enabled: boolean
}

function setup(start: Props, engineOn = start.enabled) {
  const fake = fakeEngine(engineOn)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SoundContext value={fake.engine}>{children}</SoundContext>
  )
  const view = renderHook(
    (props: Props) => {
      useStepSounds({ ...props, look: 'ducks', stepDelayMs: 800 })
    },
    { initialProps: start, wrapper },
  )
  return { ...fake, ...view }
}

describe('moveBetween', () => {
  it('one step forward or back; anything else is a jump', () => {
    expect(moveBetween(3, 4)).toBe('forward')
    expect(moveBetween(4, 3)).toBe('back')
    expect(moveBetween(0, 9)).toBe('jump')
    expect(moveBetween(9, 0)).toBe('jump')
    expect(moveBetween(5, 3)).toBe('jump')
  })
})

describe('useStepSounds', () => {
  it('makes no sound when the page opens', () => {
    const { play } = setup({ frames: FRAMES, index: 0, enabled: true })
    expect(play).not.toHaveBeenCalled()
  })

  it('a step forward (or a tick while playing) plays that step’s cues', () => {
    const { play, rerender } = setup({ frames: FRAMES, index: 0, enabled: true })
    rerender({ frames: FRAMES, index: 1, enabled: true })
    expect(play).toHaveBeenLastCalledWith(cuesForStep(frame(1), frame(0), 'forward', 'ducks', 800))
    expect(play.mock.lastCall?.[0]).toHaveLength(2)
  })

  it('a step back plays the step it lands on', () => {
    const { play, rerender } = setup({ frames: FRAMES, index: 3, enabled: true })
    rerender({ frames: FRAMES, index: 2, enabled: true })
    expect(play).toHaveBeenLastCalledWith(cuesForStep(frame(2), frame(3), 'back', 'ducks', 800))
    expect(play.mock.lastCall?.[0]).not.toHaveLength(0)
  })

  it('jumps are silent, and stop anything still sounding', () => {
    const { play, rerender } = setup({ frames: FRAMES, index: 1, enabled: true })
    rerender({ frames: FRAMES, index: FRAMES.length - 1, enabled: true })
    expect(play).toHaveBeenLastCalledWith([])
    rerender({ frames: FRAMES, index: 0, enabled: true })
    expect(play).toHaveBeenLastCalledWith([])
  })

  it('new numbers count as a jump, whatever the step', () => {
    const { play, rerender } = setup({ frames: FRAMES, index: 1, enabled: true })
    rerender({ frames: OTHER, index: 2, enabled: true })
    expect(play).toHaveBeenLastCalledWith([])
  })

  it('muted: nothing plays, and the engine is kept off', () => {
    const { play, setEnabled, rerender } = setup({ frames: FRAMES, index: 0, enabled: false })
    rerender({ frames: FRAMES, index: 1, enabled: false })
    rerender({ frames: FRAMES, index: 2, enabled: false })
    expect(play).not.toHaveBeenCalled()
    expect(setEnabled).toHaveBeenLastCalledWith(false)
  })

  it('saved as on: starts the audio at the first tap or key press, not before', () => {
    const { setEnabled } = setup({ frames: FRAMES, index: 0, enabled: true }, false)
    expect(setEnabled).not.toHaveBeenCalled()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(setEnabled).toHaveBeenCalledExactlyOnceWith(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(setEnabled).toHaveBeenCalledTimes(1)
  })

  it('turning sound off turns the engine off', () => {
    const { setEnabled, rerender } = setup({ frames: FRAMES, index: 0, enabled: true })
    rerender({ frames: FRAMES, index: 0, enabled: false })
    expect(setEnabled).toHaveBeenLastCalledWith(false)
  })

  it('leaving the page stops everything', () => {
    const { stopAll, unmount } = setup({ frames: FRAMES, index: 0, enabled: true })
    unmount()
    expect(stopAll).toHaveBeenCalled()
  })
})
