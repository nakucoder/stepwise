import { describe, expect, it } from 'vitest'
import { mergeSort } from '../algorithms/sorting/mergeSort'
import { fitMs, specialMs } from '../characters/pixel'
import {
  openAndCompareMs,
  posesOf,
  SHUT_AT,
  SHUT_MS,
  spaceshipHoldMs,
  spaceshipMoves,
  TAKE_AT,
  TAKE_MS,
  takeoffAt,
} from '../characters/spaceships/steps'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import { CHIME_LEAD_MS, rightMoveCues, VOICE_MS, type Note } from './cues'
import { spaceshipCuesForStep } from './spaceshipCues'
import { zipHz } from './spaceshipVoices'

const FRAMES = collectFrames(mergeSort, DEFAULT_INPUT).frames
const POSES = posesOf(FRAMES)
const DELAYS = [1600, 800, 400, 200] as const
const LARGEST = Math.max(...DEFAULT_INPUT)

/** The first frame whose moves are exactly these kinds. */
const frameOf = (kinds: string) =>
  FRAMES.findIndex(
    (_, k) =>
      spaceshipMoves(FRAMES, k, POSES)
        .map((m) => m.kind)
        .join('+') === kinds,
  )
const SPLIT = frameOf('split')
const FIRST_COMPARE = frameOf('gate-open+compare')
const COMPARE = frameOf('compare')
const TAKE = frameOf('take')
const SHUT = frameOf('shut')
const FINALE = frameOf('finale')

const cues = (index: number, stepDelayMs = 800, reducedMotion = false) =>
  spaceshipCuesForStep(FRAMES, index, 'forward', stepDelayMs, reducedMotion)
/** When a note stops sounding (its cut, or its full length). */
const endOf = (note: Note) => note.at + Math.min(note.duration ?? Infinity, VOICE_MS[note.voice])

describe('spaceship cues: each move makes its sound', () => {
  it('found every kind of step in 5 2 8 1 9 3', () => {
    expect([SPLIT, FIRST_COMPARE, COMPARE, TAKE, SHUT, FINALE].every((k) => k > 0)).toBe(true)
  })

  it('a split: the peel, as the squadron peels', () => {
    expect(cues(SPLIT)).toEqual([{ voice: 'ship-peel', at: 0 }])
  })

  it('a compare: the face-off blips as the leads pull forward', () => {
    expect(cues(COMPARE)).toEqual([{ voice: 'ship-blips', at: 0 }])
  })

  it('a merge’s first compare: the blips once the gate has opened (300 ms, fitted)', () => {
    for (const delay of DELAYS) {
      const [blips] = cues(FIRST_COMPARE, delay)
      expect(blips?.voice).toBe('ship-blips')
      expect(blips?.at).toBe(Math.round(openAndCompareMs(delay).open))
    }
    expect(cues(FIRST_COMPARE, 800)[0]?.at).toBe(300)
  })

  it('a take or a rest: the zip as the ship reaches the gate (45% of its flight), pitched by its value', () => {
    for (const delay of DELAYS) {
      const [zip] = cues(TAKE, delay)
      expect(zip?.voice).toBe('ship-zip')
      expect(zip?.at).toBe(Math.round(TAKE_AT.gateFrom * fitMs(TAKE_MS, delay)))
    }
    expect(cues(TAKE, 800)[0]?.at).toBe(293)
    // Every take's zip is its own ship's value: 520 Hz for a puff, 280 for the longest.
    FRAMES.forEach((_, k) => {
      const take = spaceshipMoves(FRAMES, k, POSES).find((m) => m.kind === 'take')
      if (take?.kind !== 'take') return
      const value = DEFAULT_INPUT[take.ship] ?? 0
      expect(cues(k)[0]?.frequency).toBe(zipHz(value / LARGEST))
    })
    const nine = FRAMES.findIndex((_, k) =>
      spaceshipMoves(FRAMES, k, POSES).some(
        (m) => m.kind === 'take' && DEFAULT_INPUT[m.ship] === LARGEST,
      ),
    )
    expect(cues(nine)[0]?.frequency).toBe(280)
  })

  it('the gate shuts: the flash at once, then the shoomp as it starts to shut, ringing out', () => {
    for (const delay of DELAYS) {
      expect(cues(SHUT, delay)).toEqual([
        { voice: 'ship-gate-flash', at: 0 },
        {
          voice: 'ship-gate-shut',
          at: Math.round((SHUT_AT.flash / SHUT_MS) * specialMs(SHUT_MS, delay)),
          ringOut: true,
        },
      ])
    }
    // The flash ends with the gate's flash phase at 1×; the shoomp at 100 ms (1×), 25 ms (4×).
    expect(cues(SHUT, 800)[1]?.at).toBe(100)
    expect(cues(SHUT, 200)[1]?.at).toBe(25)
  })

  it('the finale: the fanfare with the first take-off, in full', () => {
    for (const delay of DELAYS) {
      expect(cues(FINALE, delay)).toEqual([{ voice: 'ship-fanfare', at: takeoffAt(0) }])
    }
  })

  it('the first frame, a jump, or past the end: silent', () => {
    expect(cues(0)).toEqual([])
    expect(spaceshipCuesForStep(FRAMES, TAKE, 'jump', 800, false)).toEqual([])
    expect(cues(FRAMES.length)).toEqual([])
  })

  it('one step back: a compare frame’s blips sound again; nothing else replays', () => {
    FRAMES.forEach((frame, k) => {
      const back = spaceshipCuesForStep(FRAMES, k, 'back', 800, false)
      expect(back).toEqual(frame.decision ? [{ voice: 'ship-blips', at: 0 }] : [])
    })
  })
})

describe('frequent sounds fit their step; the special ones play in full', () => {
  it.each(DELAYS)(
    'at a %i ms step, every peel, blip and zip ends 10 ms before the next step',
    (delay) => {
      for (const reduced of [false, true]) {
        FRAMES.forEach((_, k) => {
          for (const note of cues(k, delay, reduced)) {
            if (note.voice === 'ship-gate-shut' || note.voice === 'ship-fanfare') continue
            // The shut's step waits for the gate (its hold): the flash fits that.
            const step = Math.max(delay, spaceshipHoldMs(FRAMES, k, delay))
            expect(endOf(note)).toBeLessThanOrEqual(step - 10)
          }
        })
      }
    },
  )

  it('cut only when needed: in full at 1×; at 4× the peel and the zip are cut', () => {
    expect(cues(SPLIT, 800)[0]?.duration).toBeUndefined()
    expect(cues(TAKE, 800)[0]?.duration).toBeUndefined()
    expect(cues(SPLIT, 200)[0]).toEqual({ voice: 'ship-peel', at: 0, duration: 190 })
    // The zip at 81 ms of a 200 ms step: 109 ms of it.
    expect(cues(TAKE, 200)[0]).toMatchObject({ at: 81, duration: 109 })
  })

  it('the shoomp and the fanfare are never cut', () => {
    for (const delay of DELAYS) {
      for (const reduced of [false, true]) {
        expect(cues(SHUT, delay, reduced)[1]?.duration).toBeUndefined()
        expect(cues(FINALE, delay, reduced)[0]?.duration).toBeUndefined()
      }
    }
  })
})

describe('reduced motion: each sound at its step’s start', () => {
  it('the peel, the blips (the gate doesn’t open), the zip and the fanfare at once', () => {
    for (const k of [SPLIT, FIRST_COMPARE, COMPARE, TAKE, FINALE]) {
      for (const note of cues(k, 800, true)) expect(note.at).toBe(0)
    }
  })

  it('the gate: the flash, then the shoomp the recipe’s 0.1 s later, at every speed', () => {
    for (const delay of DELAYS) {
      expect(cues(SHUT, delay, true)).toEqual([
        { voice: 'ship-gate-flash', at: 0 },
        { voice: 'ship-gate-shut', at: 100, ringOut: true },
      ])
    }
  })
})

describe('Do it: a right move’s chime first', () => {
  it('a spaceship sound starts no sooner than the chime’s lead; the zip stays on the gate when later', () => {
    // 1×: the zip at 293 ms, already after the lead: unchanged.
    const slow = rightMoveCues(cues(TAKE, 800)).find((n) => n.voice === 'ship-zip')
    expect(slow?.at).toBe(293)
    // 4×: the zip at 81 ms waits to 120, and still ends where it did.
    const fast = rightMoveCues(cues(TAKE, 200)).find((n) => n.voice === 'ship-zip')
    expect(fast).toMatchObject({ at: CHIME_LEAD_MS, duration: 109 - (CHIME_LEAD_MS - 81) })
    // Reduced motion: the zip at 0 waits the whole lead, like the quack.
    const still = rightMoveCues(cues(TAKE, 800, true)).find((n) => n.voice === 'ship-zip')
    expect(still?.at).toBe(CHIME_LEAD_MS)
  })

  it('the chime plays first', () => {
    const notes = rightMoveCues(cues(TAKE, 200))
    expect(notes[0]?.voice).toBe('chime')
    expect(notes.filter((n) => n.voice !== 'chime').every((n) => n.at >= CHIME_LEAD_MS)).toBe(true)
  })
})
