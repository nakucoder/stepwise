import { describe, expect, it } from 'vitest'
import { heapSort } from '../algorithms/sorting/heapSort'
import { beaverHoldMs, CLIMB_AT, HAUL_AT, posesOf, type Action } from '../characters/beaver/steps'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame } from '../engine/types'
import { BETWEEN_MS } from '../hooks/useDoIt'
import { beaverCuesForStep, haulAt, SHRUG_AT } from './beaverCues'
import { BEAVER_HAUL_HIT_MS, BEAVER_VOICE_MS, type BeaverVoice } from './beaverVoices'
import { CHIME_LEAD_MS, CORRECT, rightMoveCues, VOICE_MS, type Note } from './cues'

/** The site's default list, the beaver's fit list (1 to 12), and one with duplicates. */
const INPUTS = [DEFAULT_INPUT, [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8], [3, 3, 1, 2, 3, 1]]
const RUNS = INPUTS.map((input) => collectFrames(heapSort, input).frames)
const FRAMES = RUNS[0] ?? []
/** The four speeds, as step delays: 0.5×, 1×, 2×, 4×. */
const DELAYS = [1600, 800, 400, 200] as const

/** Each moment's sounds, in order. Starting, settling and the handover are silent. */
const VOICES_OF: Readonly<Record<Action, readonly BeaverVoice[]>> = {
  start: [],
  look: ['beaver-look'],
  climb: ['beaver-found', 'beaver-climb'],
  stop: ['beaver-stop'],
  settle: [],
  handover: [],
  haul: ['beaver-haul'],
  finale: ['beaver-fanfare'],
}

const cues = (frames: readonly Frame[], k: number, delay = 800, reduced = false, asking = false) =>
  beaverCuesForStep(frames, k, 'forward', delay, reduced, asking)
/** When a note stops sounding (its cut, or its full length). */
const endOf = (note: Note) => note.at + Math.min(note.duration ?? Infinity, VOICE_MS[note.voice])
/** How long step k lasts: the player's delay, or the beaver's move when that is longer. */
const stepOf = (frames: readonly Frame[], k: number, delay: number) =>
  Math.max(delay, beaverHoldMs(frames, k, delay))

describe('beaver cues: each moment makes its sound', () => {
  it('every moment comes up in these runs, and plays its own sounds', () => {
    const heard = new Set<string>()
    for (const frames of RUNS) {
      const poses = posesOf(frames)
      frames.forEach((_, k) => {
        if (k === 0) return
        const action = poses[k]?.action
        if (!action) throw new Error('a pose')
        heard.add(action)
        expect(
          cues(frames, k).map((n) => n.voice),
          `${action} at ${String(k)}`,
        ).toEqual(VOICES_OF[action])
      })
    }
    expect([...heard].sort()).toEqual(
      ['climb', 'finale', 'handover', 'haul', 'look', 'settle', 'stop'].sort(),
    )
  })

  it('each sound lands with its move: the look at once, the "!" at the climb’s start and the climb at the lift, the stop at the shrug', () => {
    for (const delay of DELAYS) {
      FRAMES.forEach((_, k) => {
        const action = posesOf(FRAMES)[k]?.action
        const ms = beaverHoldMs(FRAMES, k, delay)
        const at = cues(FRAMES, k, delay).map((n) => [n.voice, n.at])
        if (action === 'look') expect(at).toEqual([['beaver-look', 0]])
        if (action === 'climb') {
          expect(at).toEqual([
            ['beaver-found', 0],
            ['beaver-climb', Math.round(ms * CLIMB_AT.walk)],
          ])
        }
        if (action === 'stop') expect(at).toEqual([['beaver-stop', Math.round(ms * SHRUG_AT)]])
        if (action === 'finale') expect(at).toEqual([['beaver-fanfare', 0]])
      })
    }
  })

  it('the haul’s logs land as the stack is set down, at every speed', () => {
    for (const delay of DELAYS) {
      const k = FRAMES.findIndex((_, i) => i > 0 && posesOf(FRAMES)[i]?.action === 'haul')
      const ms = beaverHoldMs(FRAMES, k, delay)
      const [note] = cues(FRAMES, k, delay)
      expect(note?.voice).toBe('beaver-haul')
      expect(note?.at).toBe(haulAt(ms))
      expect((note?.at ?? 0) + BEAVER_HAUL_HIT_MS).toBe(Math.round(ms * HAUL_AT.land))
    }
  })

  it('nothing is cut short at any speed, 4× included, with reduced motion on or off, in Watch and Do it', () => {
    for (const frames of RUNS) {
      for (const delay of [...DELAYS, BETWEEN_MS]) {
        for (const reduced of [false, true]) {
          for (const asking of [false, true]) {
            frames.forEach((_, k) => {
              const step = stepOf(frames, k, delay)
              for (const note of cues(frames, k, delay, reduced, asking)) {
                const where = `${note.voice} at step ${String(k)}, ${String(delay)} ms`
                expect(note.duration, where).toBeUndefined()
                // The finale plays in full; "Your turn!" waits with the question for the learner.
                if (note.voice === 'beaver-fanfare' || note.voice === 'beaver-turn') continue
                expect(endOf(note), where).toBeLessThanOrEqual(step - 10)
              }
            })
          }
        }
      }
    }
  })

  it('at 4× every sound has room to spare: the room each one gets is at least its length', () => {
    for (const frames of RUNS) {
      frames.forEach((_, k) => {
        const step = stepOf(frames, k, 200)
        for (const note of cues(frames, k, 200)) {
          if (note.voice === 'beaver-fanfare') continue
          expect(step - 10 - note.at, note.voice).toBeGreaterThanOrEqual(VOICE_MS[note.voice])
        }
      })
    }
  })

  it('reduced motion: nothing moves, so the sounds play from the step’s start, one after another', () => {
    for (const delay of DELAYS) {
      FRAMES.forEach((_, k) => {
        const action = posesOf(FRAMES)[k]?.action
        const at = cues(FRAMES, k, delay, true).map((n) => [n.voice, n.at])
        if (action === 'climb') {
          expect(at).toEqual([
            ['beaver-found', 0],
            ['beaver-climb', BEAVER_VOICE_MS['beaver-found']],
          ])
        } else for (const [, start] of at) expect(start).toBe(0)
      })
    }
  })
})

describe('beaver cues: "Your turn!" in Do it', () => {
  it('plays when a question waits, as the beaver turns to the learner at the end of its look', () => {
    const asks = FRAMES.flatMap((frame, k) => (frame.decision ? [k] : []))
    expect(asks.length).toBeGreaterThan(0)
    for (const k of asks) {
      const ms = beaverHoldMs(FRAMES, k, BETWEEN_MS)
      expect(cues(FRAMES, k, BETWEEN_MS, false, true)).toEqual([
        { voice: 'beaver-look', at: 0 },
        { voice: 'beaver-turn', at: ms },
      ])
      // Reduced motion: right after the look's sniff.
      expect(cues(FRAMES, k, BETWEEN_MS, true, true)).toEqual([
        { voice: 'beaver-look', at: 0 },
        { voice: 'beaver-turn', at: BEAVER_VOICE_MS['beaver-look'] },
      ])
    }
  })

  it('never plays in Watch, nor when no question waits', () => {
    for (const delay of DELAYS) {
      FRAMES.forEach((_, k) => {
        expect(cues(FRAMES, k, delay).some((n) => n.voice === 'beaver-turn')).toBe(false)
      })
    }
  })
})

describe('beaver cues: a right move in Do it', () => {
  it('the chime first; the "eep!" waits for it, the rest stay with their moves, nothing cut', () => {
    FRAMES.forEach((_, k) => {
      const own = cues(FRAMES, k, BETWEEN_MS)
      const right = rightMoveCues(own)
      expect(right.slice(0, CORRECT.length)).toEqual(CORRECT)
      right.slice(CORRECT.length).forEach((note, i) => {
        const before = own[i]
        expect(note.voice).toBe(before?.voice)
        expect(note.at).toBe(Math.max(before?.at ?? 0, CHIME_LEAD_MS))
        expect(note.duration).toBeUndefined()
        if (note.voice !== 'beaver-fanfare') {
          expect(endOf(note)).toBeLessThanOrEqual(stepOf(FRAMES, k, BETWEEN_MS) - 10)
        }
      })
    })
  })
})

describe('beaver cues: back and jumps', () => {
  it('one step back: the frame’s own look still sounds, nothing else replays', () => {
    FRAMES.forEach((frame, k) => {
      const back = beaverCuesForStep(FRAMES, k, 'back', 800, false)
      expect(back).toEqual(k > 0 && frame.decision ? [{ voice: 'beaver-look', at: 0 }] : [])
    })
  })

  it('a jump, and the first frame, are silent', () => {
    FRAMES.forEach((_, k) => {
      expect(beaverCuesForStep(FRAMES, k, 'jump', 800, false, true)).toEqual([])
    })
    expect(cues(FRAMES, 0)).toEqual([])
  })
})
