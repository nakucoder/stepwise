import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { heapSort } from '../algorithms/sorting/heapSort'
import { collectFrames } from '../engine/collect'
import { answerAt, askedAt, decisionIndexes } from '../engine/decision'
import { STORAGE_KEYS } from '../lib/storage'
import type { Look } from '../preferences/preferences'
import { PreferencesProvider } from '../preferences/PreferencesProvider'
import { CHIME_LEAD_MS, type Note } from '../sound/cues'
import { SoundContext, type SoundPlayer } from '../sound/SoundContext'
import { setPhone } from '../test/matchMedia'
import { WorkspacePage } from './WorkspacePage'

/*
 * Heap sort's sounds on the page, Sound on: the builder beaver plays its own (the picks from PR
 * #116) in Watch and in Do it, with "Your turn!" each time a question waits; heap sort as bars
 * keeps the bars' sounds.
 */

// Testing Library drains pending work with a zero-length timer through a global `jest`.
const jestShim = { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) }

beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { jest: jestShim })
  setPhone(false)
  // jsdom has no layout: every box is the desktop's stage field, so the scene draws.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 436,
    height: 253,
    top: 0,
    left: 0,
    right: 436,
    bottom: 253,
  } as DOMRect)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'jest')
})

/** The site's default list: within the beaver's 1 to 12. */
const NUMBERS = [5, 2, 8, 1, 9, 3]
const FRAMES = collectFrames(heapSort, NUMBERS).frames

function renderAt(look: Look, mode: 'watch' | 'do' = 'watch') {
  localStorage.setItem(STORAGE_KEYS.level, 'explorer')
  localStorage.setItem(STORAGE_KEYS.look, look)
  localStorage.setItem(STORAGE_KEYS.sound, 'on')
  const play = vi.fn<SoundPlayer['play']>()
  const engine: SoundPlayer = { isEnabled: true, setEnabled: vi.fn(), play, stopAll: vi.fn() }
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) })
  const query = `numbers=${NUMBERS.join(',')}${mode === 'do' ? '&mode=do' : ''}`
  render(
    <SoundContext value={engine}>
      <PreferencesProvider>
        <MemoryRouter initialEntries={[`/sorting/heap-sort?${query}`]}>
          <Routes>
            <Route path=":categoryId/:algorithmId" element={<WorkspacePage />} />
          </Routes>
        </MemoryRouter>
      </PreferencesProvider>
    </SoundContext>,
  )
  return { user, play }
}

const isBeaver = () => document.querySelector('.stage-view')?.classList.contains('is-beaver')
const answers = () => screen.getByRole('group', { name: 'Your move' })
const button = (name: string) => within(answers()).getByRole('button', { name })
const question = () => document.querySelector('.do-it-question')?.textContent ?? null
const isDone = () => document.querySelector('.do-it-panel')?.classList.contains('is-done')
const step = () =>
  Number(/Step (\d+) of/.exec(document.querySelector('.progress')?.textContent ?? '')?.[1] ?? 0)
/** Every voice asked for so far, in order. */
const voices = (play: ReturnType<typeof renderAt>['play']) =>
  play.mock.calls.flatMap(([notes]: [readonly Note[]]) => notes.map((n) => n.voice))
/** The voices of the last step's sounds. */
const lastVoices = (play: ReturnType<typeof renderAt>['play']) =>
  (play.mock.calls.at(-1)?.[0] ?? []).map((n) => n.voice)

function watchToTheEnd() {
  for (let k = 0; k < 200 && step() < FRAMES.length; k++) {
    act(() => {
      vi.advanceTimersByTime(800)
    })
  }
  expect(step()).toBe(FRAMES.length)
}

function playOn() {
  for (let k = 0; k < 80 && !question() && !isDone(); k++) {
    act(() => {
      vi.advanceTimersByTime(2000)
    })
  }
}

describe('heap sort’s sounds with the builder beaver', () => {
  it('Watch: every moment plays the beaver’s own sound, never the bars’, and no "Your turn!"', async () => {
    const { user, play } = renderAt('character')
    expect(isBeaver()).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Play' }))
    watchToTheEnd()
    const heard = voices(play)
    expect(new Set(heard)).toEqual(
      new Set([
        'beaver-look',
        'beaver-found',
        'beaver-climb',
        'beaver-stop',
        'beaver-haul',
        'beaver-fanfare',
      ]),
    )
    expect(heard.at(-1)).toBe('beaver-fanfare')
  })

  it('Do it: "Your turn!" plays each time a question waits, and each answer plays its move', async () => {
    const { user, play } = renderAt('character', 'do')
    // Do it's frames, as the page asks them at this level.
    const frames = askedAt(FRAMES, 'explorer')
    const asks = decisionIndexes(frames)
    await user.click(button('Start'))
    playOn()
    for (const k of asks) {
      expect(question()).not.toBeNull()
      // Arriving at the question: the beaver looks, then turns to the learner.
      expect(lastVoices(play)).toEqual(['beaver-look', 'beaver-turn'])
      const climbs = answerAt(frames, k)?.kind === 'trade'
      await user.click(button(climbs ? 'Climb up' : 'Stay on top'))
      // The right move's chime, then the beaver's own move, after the chime.
      const [notes = []] = play.mock.calls.at(-1) ?? []
      expect(notes.slice(0, 2).map((n) => n.voice)).toEqual(['chime', 'chime'])
      const move = notes.filter((n) => n.voice.startsWith('beaver-'))
      expect(move.map((n) => n.voice)).toEqual(
        climbs ? ['beaver-found', 'beaver-climb'] : ['beaver-stop'],
      )
      for (const n of move) expect(n.at).toBeGreaterThanOrEqual(CHIME_LEAD_MS)
      playOn()
    }
    expect(isDone()).toBe(true)
    const heard = voices(play)
    expect(heard.filter((v) => v === 'beaver-turn')).toHaveLength(asks.length)
    expect(heard).toContain('beaver-haul')
    expect(heard).toContain('beaver-fanfare')
  })
})

describe('heap sort as bars keeps the bars’ sounds', () => {
  it('Watch: nothing of the beaver’s', async () => {
    const { user, play } = renderAt('bars')
    expect(isBeaver()).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Play' }))
    watchToTheEnd()
    const heard = voices(play)
    expect(heard.length).toBeGreaterThan(0)
    expect(heard.some((v) => v.startsWith('beaver-'))).toBe(false)
  })

  it('Do it: no "Your turn!", nothing of the beaver’s', async () => {
    const { user, play } = renderAt('bars', 'do')
    await user.click(button('Start'))
    playOn()
    expect(question()).not.toBeNull()
    const heard = voices(play)
    expect(heard.length).toBeGreaterThan(0)
    expect(heard.some((v) => v.startsWith('beaver-'))).toBe(false)
  })
})
