import { describe, expect, it } from 'vitest'
import { heapSort } from '../../algorithms/sorting/heapSort'
import { heapEnd } from '../../components/heapTree'
import { DEFAULT_INPUT } from '../../data/defaultInput'
import { collectFrames } from '../../engine/collect'
import type { Frame } from '../../engine/types'
import { specialMs } from '../pixel'
import {
  beaverHoldMs,
  beaverMove,
  beaverPoses,
  CLIMB_MS,
  damNodes,
  FINALE_MS,
  HAUL_MS,
  haulMs,
  isHaul,
  moveMs,
  STOP_MS,
  type Action,
  type BeaverMove,
  type BeaverPose,
} from './steps'

/** The spec's numbers: 1 to 12, mixed up. */
const SPEC = [7, 2, 11, 5, 1, 9, 12, 4, 3, 10, 6, 8]
const RUNS: readonly (readonly number[])[] = [
  SPEC,
  DEFAULT_INPUT,
  [],
  [5],
  [3, 3, 3],
  [1, 2, 3, 4, 5, 6],
  [6, 5, 4, 3, 2, 1],
  [2, 2, 1, 2, 2, 1, 2],
]
const FRAMES = collectFrames(heapSort, SPEC).frames
const POSES = beaverPoses(FRAMES)
const LAST = FRAMES.length - 1
const firstOf = (action: Action) => POSES.findIndex((pose) => pose.action === action)
const move = (k: number): BeaverMove => {
  const m = beaverMove(FRAMES, k, POSES)
  if (!m) throw new Error(`no move into ${String(k)}`)
  return m
}
const pose = (k: number): BeaverPose => {
  const p = POSES[k]
  if (!p) throw new Error(`no pose ${String(k)}`)
  return p
}
const frame = (k: number): Frame => {
  const f = FRAMES[k]
  if (!f) throw new Error(`no frame ${String(k)}`)
  return f
}

describe('the stacks follow their values through every swap', () => {
  it.each(RUNS)('each column holds the stack with its value, at every frame (%j)', (...input) => {
    const frames = collectFrames(heapSort, input).frames
    const values = frames[0]?.array ?? []
    beaverPoses(frames).forEach((p, k) => {
      expect(p.order.map((id) => values[id])).toEqual(frames[k]?.array)
      expect([...p.order].sort((a, b) => a - b)).toEqual(values.map((_, id) => id))
    })
  })
})

describe('the dam matches the stacks at every frame', () => {
  it.each(RUNS)('the pyramid’s log ends: the same stacks, values and rings (%j)', (...input) => {
    const frames = collectFrames(heapSort, input).frames
    const values = frames[0]?.array ?? []
    beaverPoses(frames).forEach((p, k) => {
      const f = frames[k]
      if (!f) throw new Error('no frame')
      const nodes = damNodes(p, values)
      // Only the pyramid's values: finished ones have left the dam.
      expect(nodes).toHaveLength(heapEnd(f))
      for (const node of nodes) {
        expect(node.id).toBe(p.order[node.k])
        expect(node.value).toBe(f.array[node.k])
        const ring = f.highlights.swapping?.includes(node.k)
          ? 'trading'
          : f.highlights.comparing?.includes(node.k)
            ? 'looking'
            : null
        expect(node.ring).toBe(ring)
      }
    })
  })

  it('marks the family’s sticks: yellow while compared, pink to the child that climbs', () => {
    const ask = firstOf('look')
    expect(pose(ask).sticks).toBe('looking')
    expect(pose(ask).children).toEqual(frame(ask).heap?.children)
    const climb = firstOf('climb')
    expect(pose(climb).sticks).toBe('trading')
    expect(pose(firstOf('settle')).sticks).toBeNull()
    expect(pose(0).sticks).toBeNull()
  })
})

describe('the moments and moods', () => {
  it('1, start: it sits at the left, waiting', () => {
    expect(pose(0)).toMatchObject({ action: 'start', mood: 'waiting', beaver: 0, left: false })
  })

  it('2, a family compared: it walks under the parent’s stack and looks up', () => {
    const k = firstOf('look')
    const parent = frame(k).heap?.parent ?? -1
    expect(pose(k)).toMatchObject({ mood: 'looking', beaver: parent })
    expect(pose(k).looking).toEqual(frame(k).highlights.comparing)
    const m = move(k)
    expect(m.timing).toBe('fit')
    expect(m.beats.at(-1)).toMatchObject({ mood: 'looking', at: [parent, parent], to: 1 })
  })

  it('3, a climb: "!", walks under the child, lifts its stack, carries it up while the parent slides down', () => {
    const k = firstOf('climb')
    const [parent = -1, child = -1] = frame(k).highlights.swapping ?? []
    const m = move(k)
    expect(m.ms).toBe(CLIMB_MS)
    expect(m.timing).toBe('fit')
    expect(m.beats.map((b) => b.mood)).toEqual([
      'found',
      'walking',
      'carry',
      'carry',
      'carry',
      'waiting',
    ])
    expect(m.beats[0]).toMatchObject({ from: 0, bang: true })
    expect(m.beats[1]?.at).toEqual([pose(k - 1).beaver, child])
    expect(m.beats[3]).toMatchObject({ at: [child, parent], left: true, from: 0.5, to: 0.9 })
    // The child's stack goes up to the parent's place; the parent's slides down to the child's.
    expect(m.carry).toMatchObject({ from: child, to: parent, lift: [0.4, 0.5], land: [0.9, 0.98] })
    expect(m.carry?.stack).toBe(pose(k).order[parent])
    expect(m.carry?.other).toBe(pose(k).order[child])
    expect(frame(k).array[parent]).toBeGreaterThan(frame(k).array[child] ?? 0)
    expect(pose(k)).toMatchObject({ beaver: parent, mood: 'waiting' })
    expect(pose(k).trading).toEqual([parent, child])
  })

  it('4, a stop: it looks, shrugs and moves on half a column; nothing moves', () => {
    const k = firstOf('stop')
    const parent = frame(k).heap?.parent ?? -1
    const m = move(k)
    expect(m.ms).toBe(STOP_MS)
    expect(m.carry).toBeNull()
    expect(m.beats.map((b) => [b.mood, b.from, b.to])).toEqual([
      ['looking', 0, 0.3],
      ['shrug', 0.3, 0.7],
      ['walking', 0.7, 1],
    ])
    expect(pose(k)).toMatchObject({ mood: 'shrug', beaver: parent + 0.5 })
    expect(pose(k).order).toEqual(pose(k - 1).order)
  })

  it('5, a value settles with nothing under it: it walks to it', () => {
    const k = firstOf('settle')
    const m = move(k)
    expect(m.beats[0]).toMatchObject({ mood: 'walking', from: 0, to: 1 })
    expect(pose(k)).toMatchObject({ mood: 'waiting', beaver: frame(k).heap?.parent })
  })

  it('6, the handover: the dam is built, it walks to the top’s stack, proud', () => {
    const k = firstOf('handover')
    expect(frame(k).heap).toMatchObject({ phase: 'extract', event: 'start' })
    expect(pose(k)).toMatchObject({ mood: 'proud', beaver: 0 })
  })

  it('7, the special move: it hauls the top’s stack to the end of the pyramid, held', () => {
    const k = firstOf('haul')
    const end = frame(k).heap?.size ?? -1
    const m = move(k)
    expect(m.ms).toBe(HAUL_MS)
    expect(m.timing).toBe('special')
    expect(m.beats.map((b) => b.mood)).toEqual(['carry', 'proud', 'carry', 'proud'])
    expect(m.beats[1]).toMatchObject({ at: [0, end], from: 0.3, to: 0.85, bobs: 6, left: false })
    expect(m.carry).toMatchObject({ from: 0, to: end, lift: [0.2, 0.3], land: [0.85, 0.93] })
    // The old top lands on the woodpile, in place: its green bar appears as it is set down.
    expect(m.carry?.stack).toBe(pose(k).order[end])
    expect(m.done).toEqual([end])
    expect(m.doneAt).toBe(0.93)
    expect(pose(k)).toMatchObject({ mood: 'proud', beaver: end, end })
  })

  it('8, the dam shrinking: each top leaving takes a log end from the dam', () => {
    const hauls = POSES.flatMap((p, k) => (p.action === 'haul' ? [k] : []))
    expect(hauls).toHaveLength(SPEC.length - 1)
    for (const k of hauls) {
      expect(pose(k).end).toBe(pose(k - 1).end - 1 - (pose(k).end === 0 ? 1 : 0))
    }
  })

  it('9, the finale: it walks to the end, happy and bobbing; the stacks hop in a wave, in full', () => {
    const m = move(LAST)
    expect(pose(LAST)).toMatchObject({ final: true, mood: 'happy', beaver: SPEC.length - 1 })
    expect(m).toMatchObject({ action: 'finale', ms: FINALE_MS, timing: 'full', wave: true })
    expect(m.beats.at(-1)).toMatchObject({ mood: 'happy', bobs: 3, to: 1 })
    expect(moveMs(m, 200)).toBe(FINALE_MS)
  })

  it('covers every move end to end, from 0 to 1, in order', () => {
    for (let k = 1; k <= LAST; k++) {
      const { beats } = move(k)
      expect(beats[0]?.from).toBe(0)
      expect(beats.at(-1)?.to).toBe(1)
      beats.forEach((beat, b) => {
        expect(beat.to).toBeGreaterThanOrEqual(beat.from)
        if (b > 0) expect(beat.from).toBe(beats[b - 1]?.to)
      })
    }
  })

  it('faces the way it last walked', () => {
    for (let k = 1; k <= LAST; k++) {
      const before = pose(k - 1)
      const now = pose(k)
      if (now.beaver !== before.beaver) expect(now.left).toBe(now.beaver < before.beaver)
      else expect(now.left).toBe(before.left)
    }
  })
})

describe('timing', () => {
  it('fits a frequent move inside the step, at every speed', () => {
    const k = firstOf('climb')
    for (const delay of [1600, 800, 400, 200]) {
      expect(moveMs(move(k), delay)).toBeLessThanOrEqual(delay * 0.9)
    }
  })

  it('holds the haul in full at 1× and slower, divided by the speed above', () => {
    expect(haulMs(1600)).toBe(2000)
    expect(haulMs(800)).toBe(2000)
    expect(haulMs(400)).toBe(1000)
    expect(haulMs(200)).toBe(500)
    for (const delay of [1600, 800, 400, 200]) expect(haulMs(delay)).toBe(specialMs(2000, delay))
  })

  it('makes only the hauls wait, for the haul’s length', () => {
    for (let k = 0; k <= LAST; k++) {
      const haul = pose(k).action === 'haul' && k > 0
      expect(isHaul(FRAMES, k)).toBe(haul)
      expect(beaverHoldMs(FRAMES, k, 800)).toBe(haul ? 2000 : 0)
    }
  })
})
