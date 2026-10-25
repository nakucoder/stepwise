import { describe, expect, it } from 'vitest'
import { quickSort } from '../algorithms/sorting/quickSort'
import { pizzaHoldMs, posesOf, type Action } from '../characters/pizzaCart/steps'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import type { Frame } from '../engine/types'
import { cartCuesForStep, deliverAt } from './cartCues'
import type { CartVoice } from './cartVoices'
import { CHIME_LEAD_MS, CORRECT, rightMoveCues, VOICE_MS, type Note } from './cues'

/** The site's default list, the cart's fit list (1 to 12), and one with a nudge and duplicates. */
const INPUTS = [DEFAULT_INPUT, [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8], [1, 4, 2, 4, 3]]
const RUNS = INPUTS.map((input) => collectFrames(quickSort, input).frames)
const FRAMES = RUNS[0] ?? []
/** The four speeds, as step delays: 0.5×, 1×, 2×, 4×. */
const DELAYS = [1600, 800, 400, 200] as const

const VOICE_OF: Readonly<Record<Action, CartVoice | null>> = {
  idle: null,
  pick: null,
  look: 'cart-look',
  carry: 'cart-move',
  stay: 'cart-stay',
  nudge: 'cart-nudge',
  deliver: 'cart-deliver',
  done: 'cart-done',
  finale: 'cart-fanfare',
}

const cues = (frames: readonly Frame[], k: number, delay = 800, reduced = false) =>
  cartCuesForStep(frames, k, 'forward', delay, reduced)
/** When a note stops sounding (its cut, or its full length). */
const endOf = (note: Note) => note.at + Math.min(note.duration ?? Infinity, VOICE_MS[note.voice])

describe('pizza cart cues: each moment makes its sound', () => {
  it('every moment comes up in these runs, and plays its own sound, at once', () => {
    const heard = new Set<string>()
    for (const frames of RUNS) {
      const poses = posesOf(frames)
      frames.forEach((_, k) => {
        if (k === 0) return
        const action = poses[k]?.action ?? 'idle'
        const voice = VOICE_OF[action]
        if (voice === null || voice === 'cart-deliver') {
          if (voice === null) expect(cues(frames, k), action).toEqual([])
          return
        }
        heard.add(action)
        expect(cues(frames, k), action).toEqual([{ voice, at: 0 }])
      })
    }
    expect([...heard].sort()).toEqual(['carry', 'done', 'finale', 'look', 'nudge', 'stay'])
  })

  it('"Delivered!": as the leader is set down (950 ms in at 1×), sooner at 2× and 4× so it ends inside the held step', () => {
    expect(DELAYS.map(deliverAt)).toEqual([950, 950, 400, 0])
    for (const frames of RUNS) {
      const poses = posesOf(frames)
      const placing = frames.flatMap((_, k) => (poses[k]?.action === 'deliver' ? [k] : []))
      expect(placing.length).toBeGreaterThan(0)
      for (const k of placing) {
        for (const delay of DELAYS) {
          expect(cues(frames, k, delay)).toEqual([{ voice: 'cart-deliver', at: deliverAt(delay) }])
          expect(cues(frames, k, delay, true)).toEqual([{ voice: 'cart-deliver', at: 0 }])
        }
      }
    }
  })

  it('picking the leader, the first frame, a jump, or past the end: silent', () => {
    const poses = posesOf(FRAMES)
    const pick = poses.findIndex((p, k) => k > 0 && p.action === 'pick')
    expect(pick).toBeGreaterThan(0)
    expect(cues(FRAMES, pick)).toEqual([])
    expect(cues(FRAMES, 0)).toEqual([])
    expect(cartCuesForStep(FRAMES, 3, 'jump', 800, false)).toEqual([])
    expect(cues(FRAMES, FRAMES.length)).toEqual([])
  })

  it('one step back: a compare frame’s "hm?" sounds again; nothing else replays', () => {
    FRAMES.forEach((frame, k) => {
      const back = cartCuesForStep(FRAMES, k, 'back', 800, false)
      expect(back).toEqual(frame.decision && k > 0 ? [{ voice: 'cart-look', at: 0 }] : [])
    })
    expect(FRAMES.some((f) => f.decision)).toBe(true)
  })

  it('reduced motion: the same sounds, each at its step’s start', () => {
    for (const frames of RUNS) {
      frames.forEach((_, k) => {
        for (const delay of DELAYS) {
          const moving = cues(frames, k, delay)
          expect(cues(frames, k, delay, true)).toEqual(moving.map((n) => ({ ...n, at: 0 })))
        }
      })
    }
  })
})

describe('nothing is cut short, even at 4×', () => {
  it.each(DELAYS)(
    'at a %i ms step every sound plays in full and ends 10 ms before the next step',
    (delay) => {
      for (const frames of RUNS) {
        const heard = new Set<string>()
        for (const reduced of [false, true]) {
          frames.forEach((_, k) => {
            for (const note of cues(frames, k, delay, reduced)) {
              heard.add(note.voice)
              expect(note.duration, note.voice).toBeUndefined()
              if (note.voice === 'cart-fanfare') continue
              // "Delivered!"'s step waits for it (its hold); the others get the step.
              const step = Math.max(delay, pizzaHoldMs(frames, k, delay))
              expect(endOf(note), note.voice).toBeLessThanOrEqual(step - 10)
            }
          })
        }
        expect(heard.size).toBeGreaterThanOrEqual(6)
      }
      // All seven sounds come up across the runs.
      const all = new Set(
        RUNS.flatMap((frames) => frames.flatMap((_, k) => cues(frames, k, delay))).map(
          (n) => n.voice,
        ),
      )
      expect(all.size).toBe(7)
    },
  )
})

describe('Do it: a right move', () => {
  it('the cart’s sound waits for the chime; "Delivered!", later than that, stays on the drop', () => {
    const poses = posesOf(FRAMES)
    const carry = poses.findIndex((p) => p.action === 'carry')
    const deliver = poses.findIndex((p) => p.action === 'deliver')
    expect(rightMoveCues(cues(FRAMES, carry))).toEqual([
      ...CORRECT,
      { voice: 'cart-move', at: CHIME_LEAD_MS },
    ])
    expect(rightMoveCues(cues(FRAMES, deliver))).toEqual([
      ...CORRECT,
      { voice: 'cart-deliver', at: 950 },
    ])
  })
})
