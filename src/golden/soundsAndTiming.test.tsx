/**
 * A golden record of what the characters sound like and how long their moves take: every note
 * the sound engine is asked to play, the robots' hold on each frame, and every animation the
 * robot scene starts, at each speed, with reduced motion off and on. Refactors must leave it
 * exactly as it is; a change here is a change the learner would see or hear.
 */
import { render, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bubbleSort } from '../algorithms/sorting/bubbleSort'
import { insertionSort } from '../algorithms/sorting/insertionSort'
import { selectionSort } from '../algorithms/sorting/selectionSort'
import { PixelDuck } from '../components/PixelDuck'
import type { StageLook } from '../characters/registry'
import { spriteScale } from '../characters/robot/geometry'
import { RobotScene } from '../characters/robot/RobotScene'
import {
  HOOK_PATHS,
  SCOUT_HAPPY_PATHS,
  SCOUT_PATHS,
  TROLLEY_PATHS,
} from '../characters/robot/sprites'
import {
  carryMs,
  fitMs,
  HOP_MS,
  LOCK_BLINK_MS,
  LOCK_MOVE_MS,
  PLATFORM_FADE_MS,
  robotHoldMs,
  SCAN_MS,
} from '../characters/robot/steps'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Algorithm, Frame } from '../engine/types'
import { swapDurationMs } from '../lib/motion'
import { rightMoveCues, type Move, type Note } from '../sound/cues'
import { SoundContext, type SoundPlayer } from '../sound/SoundContext'
import { useStepSounds } from '../sound/useStepSounds'
import { setReducedMotion } from '../test/matchMedia'

/** The four speeds, as step delays: 0.5×, 1×, 2×, 4×. */
const DELAYS = [1600, 800, 400, 200] as const
const MOTION = [false, true] as const
const framesOf = (algorithm: Algorithm) => collectFrames(algorithm, DEFAULT_INPUT).frames

const CASES: readonly (readonly [string, Algorithm, StageLook])[] = [
  ['bubble sort, ducks', bubbleSort, 'ducks'],
  ['bubble sort, bars', bubbleSort, 'bars'],
  ['selection sort, robots', selectionSort, 'robot'],
  ['selection sort, bars', selectionSort, 'bars'],
  ['insertion sort, bars', insertionSort, 'bars'],
]

/** A value, compactly: numbers and strings as they are, anything else as JSON. */
const show = (value: unknown): string =>
  typeof value === 'number' || typeof value === 'string' ? String(value) : JSON.stringify(value)

/** One note on one line: its voice, then every other field in order. */
const noteLine = (note: Note): string =>
  Object.entries(note)
    .map(([key, value]) => (key === 'voice' ? show(value) : `${key}=${show(value)}`))
    .join(' ')

// ---------- Sounds: every note the engine is asked to play ----------

/**
 * Plays a run through useStepSounds: forward to the end, three steps back, then a jump to the
 * start. One line per note; a step that plays nothing gets one line with "-".
 */
function soundsOf(
  frames: readonly Frame[],
  look: StageLook,
  stepDelayMs: number,
  decorate?: (notes: Note[], move: Move) => Note[],
): string {
  const play = vi.fn<SoundPlayer['play']>()
  const engine: SoundPlayer = { isEnabled: true, setEnabled: vi.fn(), play, stopAll: vi.fn() }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SoundContext value={engine}>{children}</SoundContext>
  )
  const view = renderHook(
    ({ index }: { index: number }) => {
      useStepSounds({ frames, index, look, stepDelayMs, enabled: true, decorate })
    },
    { wrapper, initialProps: { index: 0 } },
  )
  const last = frames.length - 1
  const path: (readonly [number, string])[] = []
  for (let k = 1; k <= last; k++) path.push([k, 'forward'])
  for (let k = last - 1; k >= last - 3; k--) path.push([k, 'back'])
  path.push([0, 'jump'])
  const lines: string[] = []
  for (const [index, label] of path) {
    const calls = play.mock.calls.length
    view.rerender({ index })
    const played = play.mock.calls.slice(calls).flatMap(([notes]) => notes)
    const head = `#${String(index)} ${label}`
    if (played.length === 0) lines.push(`${head} -`)
    for (const note of played) lines.push(`${head} ${noteLine(note)}`)
  }
  view.unmount()
  return lines.join('\n')
}

/** Do it mode's right move: the chime, then the step's own sounds (WorkspacePage's decorate). */
const doItDecorate = (notes: Note[], move: Move) =>
  move === 'forward' ? rightMoveCues(notes) : notes

describe('golden: the sounds of every step', () => {
  afterEach(() => {
    setReducedMotion(false)
  })

  for (const [name, algorithm, look] of CASES) {
    const frames = framesOf(algorithm)
    for (const reduced of MOTION) {
      for (const delay of DELAYS) {
        it(`${name}, ${String(delay)} ms, reduced motion ${reduced ? 'on' : 'off'}`, () => {
          setReducedMotion(reduced)
          expect(soundsOf(frames, look, delay)).toMatchSnapshot()
        })
      }
      it(`${name}, Do it right moves, reduced motion ${reduced ? 'on' : 'off'}`, () => {
        setReducedMotion(reduced)
        expect(soundsOf(frames, look, 800, doItDecorate)).toMatchSnapshot()
      })
    }
  }
})

// ---------- Timing: the robots' hold on each frame ----------

describe('golden: how long each frame holds the player, with the robots', () => {
  const frames = framesOf(selectionSort)
  for (const delay of DELAYS) {
    it(`selection sort, ${String(delay)} ms`, () => {
      const lines = frames.map(
        (_, k) => `#${String(k)} hold=${String(robotHoldMs(frames, k, delay))}`,
      )
      expect(lines.join('\n')).toMatchSnapshot()
    })
  }
})

// ---------- Timing: every animation the robot scene starts ----------

interface Recorded {
  readonly part: string
  readonly keyframes: unknown
  readonly options: unknown
}

describe('golden: the robot scene’s animations', () => {
  const frames = framesOf(selectionSort)
  let recorded: Recorded[] = []
  let size = { width: 342, height: 300 }

  beforeEach(() => {
    recorded = []
    const animate = vi.fn(function (this: Element, keyframes: unknown, options: unknown) {
      const part = this.closest('[data-part]')?.getAttribute('data-part') ?? this.tagName
      recorded.push({ part, keyframes, options })
      return { cancel: vi.fn(), currentTime: 0 }
    })
    Object.assign(Element.prototype, { animate })
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          ...size,
          top: 0,
          left: 0,
          right: size.width,
          bottom: size.height,
        }) as DOMRect,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(Element.prototype, 'animate')
    size = { width: 342, height: 300 }
  })

  /** Steps the scene forward through the run, then back three, then jumps to the start. */
  function animationsOf(stepDelayMs: number, reducedMotion: boolean): string {
    const scene = (index: number) => (
      <RobotScene
        frames={frames}
        index={index}
        stepDelayMs={stepDelayMs}
        reducedMotion={reducedMotion}
      />
    )
    const view = render(scene(0))
    const last = frames.length - 1
    const path: (readonly [number, string])[] = []
    for (let k = 1; k <= last; k++) path.push([k, 'forward'])
    for (let k = last - 1; k >= last - 3; k--) path.push([k, 'back'])
    path.push([0, 'jump'])
    const lines: string[] = []
    for (const [index, label] of path) {
      const from = recorded.length
      view.rerender(scene(index))
      const started = recorded.slice(from)
      const head = `#${String(index)} ${label}`
      if (started.length === 0) lines.push(`${head} -`)
      for (const { part, keyframes, options } of started) {
        lines.push(`${head} ${part} ${show(options)} ${show(keyframes)}`)
      }
    }
    view.unmount()
    return lines.join('\n')
  }

  for (const reduced of MOTION) {
    for (const delay of DELAYS) {
      it(`342 × 300, ${String(delay)} ms, reduced motion ${reduced ? 'on' : 'off'}`, () => {
        expect(animationsOf(delay, reduced)).toMatchSnapshot()
      })
    }
  }

  // Sprite scales 1 and 3 (342 × 300 is 2).
  for (const [width, height] of [
    [160, 120],
    [1000, 450],
  ] as const) {
    it(`${String(width)} × ${String(height)}, 800 ms`, () => {
      size = { width, height }
      expect(animationsOf(800, false)).toMatchSnapshot()
    })
  }
})

// ---------- The timing and pixel rules themselves ----------

describe('golden: timing and pixel rules', () => {
  it('move lengths at each speed', () => {
    const lines = DELAYS.map((d) =>
      [
        `${String(d)} ms:`,
        `swap=${String(swapDurationMs(d))}`,
        `carry=${String(carryMs(d))}`,
        `scan=${String(fitMs(SCAN_MS, d))}`,
        `lock=${String(fitMs(LOCK_MOVE_MS + LOCK_BLINK_MS, d))}`,
        `hop=${String(fitMs(HOP_MS, d))}`,
        `platform=${String(fitMs(PLATFORM_FADE_MS, d))}`,
      ].join(' '),
    )
    expect(lines.join('\n')).toMatchSnapshot()
  })

  it('the robots’ sprite scale over a grid of stage sizes', () => {
    const lines: string[] = []
    for (const height of [20, 72, 100, 144, 216, 288, 300, 432, 500, 900]) {
      const row = [8, 16, 24, 32, 47, 48, 57, 64, 80, 96, 110, 200].map(
        (pitch) => `${String(pitch)}:${String(spriteScale(height, pitch))}`,
      )
      lines.push(`h=${String(height)} ${row.join(' ')}`)
    }
    expect(lines.join('\n')).toMatchSnapshot()
  })

  it('the duck’s pixel paths', () => {
    const { container } = render(<PixelDuck />)
    const paths = [...container.querySelectorAll('path')].map(
      (path) => `${path.getAttribute('fill') ?? ''} ${path.getAttribute('d') ?? ''}`,
    )
    expect(paths.join('\n')).toMatchSnapshot()
  })

  it('the robots’ pixel paths', () => {
    const groups = { SCOUT_PATHS, SCOUT_HAPPY_PATHS, TROLLEY_PATHS, HOOK_PATHS }
    const lines = Object.entries(groups).flatMap(([group, paths]) =>
      Object.entries(paths).map(([part, d]) => `${group}.${part} ${d}`),
    )
    expect(lines.join('\n')).toMatchSnapshot()
  })
})
