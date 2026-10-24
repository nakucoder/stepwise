import { describe, expect, it } from 'vitest'
import { quickSort } from '../../algorithms/sorting/quickSort'
import { DEFAULT_INPUT } from '../../data/defaultInput'
import { collectFrames } from '../../engine/collect'
import { BASE_STEP_DELAY_MS } from '../../engine/player'
import type { Frame } from '../../engine/types'
import {
  cartMood,
  DELIVER_AT,
  DELIVER_MS,
  deliverMs,
  FINALE_HOP_MS,
  FINALE_MS,
  finaleHopAt,
  moodFrames,
  moodMs,
  MOODS,
  pizzaHoldMs,
  pizzaMoves,
  pizzaPoses,
  restingFrame,
  type Action,
  type Mood,
} from './steps'

/** The spec's input: 1 to 12 mixed up, a 7 twice, the last value (8) the leader. */
const SPEC = [7, 2, 11, 5, 1, 9, 12, 4, 7, 10, 6, 8]
const FRAMES = collectFrames(quickSort, SPEC).frames
const POSES = pizzaPoses(FRAMES)
const LAST = FRAMES.length - 1

const first = (action: Action) => POSES.findIndex((pose) => pose.action === action)

/** Each stack's value in a pose: the first frame's values, followed through every swap. */
const valuesOf = (frames: readonly Frame[], k: number) =>
  pizzaPoses(frames)[k]?.order.map((id) => frames[0]?.array[id])

describe('pizzaPoses: the nine moments', () => {
  it('starts idle at the left, every stack in its column', () => {
    expect(POSES[0]).toMatchObject({ action: 'idle', cart: 0, leader: null, final: false })
    expect(POSES[0]?.order).toEqual(SPEC.map((_, k) => k))
  })

  it('has every moment in the spec input, in the order the run meets them', () => {
    const moments: Action[] = ['pick', 'look', 'nudge', 'stay', 'carry', 'deliver', 'done']
    for (const action of moments) expect(first(action), action).toBeGreaterThan(0)
    expect(first('pick')).toBeLessThan(first('look'))
    expect(first('look')).toBeLessThan(first('deliver'))
    expect(POSES[LAST]?.action).toBe('finale')
    expect(POSES.filter((pose) => pose.action === 'finale')).toHaveLength(1)
  })

  it('follows every stack through the swaps, so each keeps its own value', () => {
    FRAMES.forEach((frame, k) => {
      expect(valuesOf(FRAMES, k)).toEqual(frame.array)
    })
    // With pivot rules that carry the leader to the end first, too.
    for (const pivot of ['first', 'middle', 'random'] as const) {
      const frames = collectFrames(quickSort, SPEC, { options: { pivot } }).frames
      frames.forEach((frame, k) => {
        expect(valuesOf(frames, k)).toEqual(frame.array)
      })
    }
  })

  it('tells two equal stacks apart: they keep their own identities', () => {
    const final = POSES[LAST]
    const sevens = SPEC.flatMap((v, id) => (v === 7 ? [id] : []))
    expect(sevens).toHaveLength(2)
    expect(sevens.map((id) => final?.order.indexOf(id)).sort()).toEqual([5, 6])
  })

  it('puts the cart under the stack it works on, for each moment', () => {
    FRAMES.forEach((frame, k) => {
      const pose = POSES[k]
      const p = frame.partition
      if (!pose || !p || pose.final) return
      const expected = {
        range: p.pivot,
        pick: p.pivot,
        compare: p.next,
        left: p.wall - 1,
        right: p.next - 1,
        place: p.pivot,
        done: p.lo,
      }[p.event]
      expect(pose.cart, `frame ${String(k)}`).toBe(expected)
    })
    // The finale: the middle of the stage.
    expect(POSES[LAST]?.cart).toBe((SPEC.length - 1) / 2)
  })

  it('reds the leader from the pick until it is placed, open on the placing frame only', () => {
    FRAMES.forEach((frame, k) => {
      const pose = POSES[k]
      const p = frame.partition
      expect(pose?.leader, `frame ${String(k)}`).toBe(p && p.event !== 'done' ? p.pivot : null)
      expect(pose?.open).toBe(p?.event === 'place' ? p.pivot : null)
    })
  })

  it('rings the value compared, and marks the values in place', () => {
    const k = first('look')
    expect(POSES[k]?.compared).toBe(FRAMES[k]?.partition?.next)
    expect(POSES[k + 1]?.compared).toBeNull()
    expect(POSES[LAST]?.sorted).toHaveLength(SPEC.length)
  })

  it('zones the range: smaller or equal on the left, bigger after it, the rest not checked', () => {
    const k = first('stay')
    const p = FRAMES[k]?.partition
    if (!p) throw new Error('no partition')
    POSES[k]?.zones.forEach((zone, c) => {
      const expected =
        c < p.lo || c >= p.hi
          ? 'out'
          : c === p.pivot
            ? 'leader'
            : c < p.wall
              ? 'left'
              : c < p.next
                ? 'bigger'
                : 'unchecked'
      expect(zone, `column ${String(c)}`).toBe(expected)
    })
  })

  it('is a trade with itself (a nudge) when the value is already on the left', () => {
    const k = first('nudge')
    expect(FRAMES[k]?.array).toEqual(FRAMES[k - 1]?.array)
    expect(FRAMES[k]?.partition?.event).toBe('left')
  })
})

describe('pizzaMoves: what one step forward plays', () => {
  const kinds = (k: number) => pizzaMoves(FRAMES, k, POSES).map((m) => m.kind)

  it('picks the leader: the cart rolls under it and its boxes pop red', () => {
    expect(kinds(first('pick'))).toEqual(['roll', 'pop'])
  })

  it('carries the leader to the end first under another pivot rule', () => {
    const frames = collectFrames(quickSort, SPEC, { options: { pivot: 'first' } }).frames
    const k = frames.findIndex((f) => f.partition?.event === 'pick')
    const [move] = pizzaMoves(frames, k)
    expect(move).toMatchObject({ kind: 'carry', from: 0, to: SPEC.length - 1 })
    expect(move?.kind === 'carry' && frames[0]?.array[move.stack]).toBe(SPEC[0])
  })

  it('a trade: the value carried goes left to the wall, the bigger one slides to its place', () => {
    const k = first('carry')
    const [move] = pizzaMoves(FRAMES, k, POSES)
    const frame = FRAMES[k]
    if (move?.kind !== 'carry' || !frame?.partition) throw new Error('no carry')
    expect(move.to).toBe(frame.partition.wall - 1)
    expect(move.to).toBeLessThan(move.from)
    const value = (id: number) => SPEC[id] ?? 0
    expect(value(move.stack)).toBeLessThanOrEqual(frame.array[frame.partition.pivot] ?? 0)
    expect(value(move.other)).toBeGreaterThan(frame.array[frame.partition.pivot] ?? 0)
  })

  it('a nudge, a wobble, a delivery, a range done, and the finale', () => {
    expect(kinds(first('nudge'))).toContain('nudge')
    expect(kinds(first('stay'))).toEqual(['stay'])
    const deliver = first('deliver')
    expect(kinds(deliver)).toEqual(['carry', 'deliver', 'done'])
    expect(kinds(first('done'))).toContain('done')
    expect(kinds(LAST)).toContain('finale')
  })

  it('compares: the cart only rolls to the value checked', () => {
    const k = first('look')
    expect(kinds(k).every((kind) => kind === 'roll')).toBe(true)
  })

  it('plays nothing from the first frame, or for a frame out of the run', () => {
    expect(pizzaMoves(FRAMES, 0)).toEqual([])
    expect(pizzaMoves(FRAMES, FRAMES.length)).toEqual([])
  })
})

describe('the cart’s moods', () => {
  it('has one mood for each moment', () => {
    const moods = Object.fromEntries(
      (
        ['idle', 'pick', 'look', 'carry', 'nudge', 'stay', 'deliver', 'done', 'finale'] as const
      ).map((action) => [action, cartMood({ action })]),
    )
    expect(moods).toEqual({
      idle: 'idle',
      pick: 'look',
      look: 'look',
      carry: 'found',
      nudge: 'found',
      stay: 'stay',
      deliver: 'delivered',
      done: 'done',
      finale: 'finale',
    })
  })

  it('takes the spec’s own lengths at 1×', () => {
    expect(
      Object.fromEntries((Object.keys(MOODS) as Mood[]).map((mood) => [mood, moodMs(mood)])),
    ).toEqual({ idle: 0, look: 560, found: 270, stay: 370, delivered: 650, done: 330, finale: 840 })
  })

  it('stays calm on the right: no wiggle, no "!", the antenna and flag still', () => {
    for (const frame of MOODS.stay.frames) {
      expect(frame.antenna ?? 'up').toBe('up')
      expect(frame.flag ?? 'a').toBe('a')
      expect(frame.bang).toBeFalsy()
    }
    expect(MOODS.stay.frames.some((f) => f.face === 'blink')).toBe(true)
  })

  it('says "!" and wiggles only when one goes left', () => {
    const banged = (Object.keys(MOODS) as Mood[]).filter((m) => MOODS[m].frames.some((f) => f.bang))
    expect(banged).toEqual(['found'])
  })

  it('fits a frequent mood inside the step at every speed, every frame at least a screen frame', () => {
    for (const delay of [1600, 800, 400, 200]) {
      for (const mood of ['look', 'found', 'stay', 'done'] as const) {
        const frames = moodFrames(mood, delay)
        const total = frames.reduce((sum, f) => sum + f.ms, 0)
        expect(total).toBeLessThanOrEqual(delay * 0.9 + 1e-9)
        for (const frame of frames.slice(0, -1)) expect(frame.ms).toBeGreaterThanOrEqual(1000 / 60)
      }
    }
    // At 4×: 180 ms, the spec's budget (found it: 4 × 30 wiggle, 60 hold).
    expect(moodFrames('found', 200).map((f) => Math.round(f.ms))).toEqual([30, 30, 30, 30, 60, 0])
  })

  it('holds "Delivered!" (163 ms at 4×) and plays the finale in full', () => {
    const delivered = moodFrames('delivered', 200).reduce((sum, f) => sum + f.ms, 0)
    expect(delivered).toBeCloseTo(162.5)
    expect(moodFrames('finale', 200).reduce((sum, f) => sum + f.ms, 0)).toBe(840)
    expect(moodFrames('finale', 1600).reduce((sum, f) => sum + f.ms, 0)).toBe(840)
  })

  it('rests on its last frame (reduced motion shows only that)', () => {
    expect(restingFrame('found')).toMatchObject({ face: 'idle' })
    expect(restingFrame('delivered')).toMatchObject({ face: 'proud' })
    expect(restingFrame('finale')).toMatchObject({ face: 'happy' })
  })
})

describe('"Delivered!" timing and the hold', () => {
  it('takes two steps at 1×, its full time slower, divided by the speed faster', () => {
    expect(DELIVER_MS).toBe(2 * BASE_STEP_DELAY_MS)
    expect(deliverMs(1600)).toBe(1600)
    expect(deliverMs(800)).toBe(1600)
    expect(deliverMs(400)).toBe(800)
    expect(deliverMs(200)).toBe(400)
  })

  it('lands the leader, then the lid and the steam, all inside its time', () => {
    const { drop, lid, steam, puff, puffGap } = DELIVER_AT
    expect(drop + lid).toBeLessThanOrEqual(DELIVER_MS)
    expect(steam + 2 * puffGap + puff).toBeLessThanOrEqual(DELIVER_MS)
    // The proud mood starts as the leader lands and ends with the move.
    expect(drop + moodMs('delivered')).toBeLessThanOrEqual(DELIVER_MS)
  })

  it('holds only the placing frames', () => {
    FRAMES.forEach((frame, k) => {
      const placing = k > 0 && frame.partition?.event === 'place'
      expect(pizzaHoldMs(FRAMES, k, 800), `frame ${String(k)}`).toBe(placing ? 1600 : 0)
      expect(pizzaHoldMs(FRAMES, k, 200)).toBe(placing ? 400 : 0)
    })
  })

  it('also holds when the leader is already in its place (nothing to carry)', () => {
    const frames = collectFrames(quickSort, [1, 2, 3]).frames
    const k = frames.findIndex((f) => f.partition?.event === 'place')
    expect(frames[k]?.array).toEqual(frames[k - 1]?.array)
    expect(pizzaHoldMs(frames, k, 800)).toBe(1600)
    expect(pizzaMoves(frames, k).map((m) => m.kind)).toContain('deliver')
  })
})

describe('the finale', () => {
  it('hops the stacks left to right inside 840 ms', () => {
    expect(finaleHopAt(0, 12)).toBe(0)
    expect(finaleHopAt(11, 12) + FINALE_HOP_MS).toBe(FINALE_MS)
    expect(finaleHopAt(0, 1)).toBe(0)
  })

  it('plays on the last frame of every run, and on no other', () => {
    for (const input of [SPEC, DEFAULT_INPUT, [1, 2], [2, 1], [5, 5, 5]]) {
      const frames = collectFrames(quickSort, input).frames
      const poses = pizzaPoses(frames)
      expect(poses.map((p) => p.final).lastIndexOf(true)).toBe(frames.length - 1)
      expect(poses.filter((p) => p.final)).toHaveLength(1)
    }
  })
})
