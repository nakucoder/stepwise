import { describe, expect, it } from 'vitest'
import {
  BEAVER_GAINS,
  BEAVER_VOICE_MS,
  isBeaverVoice,
  playBeaverVoice,
  type BeaverVoice,
} from './beaverVoices'

interface Param {
  value: number
  readonly changes: [string, number, number][]
}

interface Node {
  readonly kind: 'gain' | 'filter' | 'oscillator' | 'buffer'
  type: string
  readonly gain: Param
  readonly frequency: Param
  startAt?: number
  stopAt?: number
}

/** Enough of an AudioContext to record every node, its gain's changes and its times. */
function recordingContext() {
  const nodes: Node[] = []
  const param = (value: number): Param & Record<string, unknown> => {
    const changes: [string, number, number][] = []
    return {
      value,
      changes,
      setValueAtTime: (v: number, t: number) => changes.push(['set', v, t]),
      linearRampToValueAtTime: (v: number, t: number) => changes.push(['linear', v, t]),
      exponentialRampToValueAtTime: (v: number, t: number) => changes.push(['exp', v, t]),
    }
  }
  const make = (kind: Node['kind']) => {
    const node = {
      kind,
      type: '',
      gain: param(1),
      frequency: param(0),
      Q: param(0),
      buffer: null,
      connect() {},
      start(t: number) {
        node.startAt = t
      },
      stop(t: number) {
        node.stopAt = t
      },
    } as Node & Record<string, unknown>
    nodes.push(node)
    return node
  }
  const context = {
    sampleRate: 8000,
    createGain: () => make('gain'),
    createBiquadFilter: () => make('filter'),
    createOscillator: () => make('oscillator'),
    createBufferSource: () => make('buffer'),
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
  } as unknown as BaseAudioContext
  return { context, nodes }
}

const WHEN = 2
const VOICES = Object.keys(BEAVER_GAINS) as BeaverVoice[]

function play(voice: BeaverVoice, cutMs?: number) {
  const { context, nodes } = recordingContext()
  const out = { connect() {} } as unknown as AudioNode
  const sound = playBeaverVoice(context, out, voice, WHEN, cutMs === undefined ? {} : { cutMs })
  return { sound, nodes }
}

describe('the builder beaver’s voices: the seven picked on the listening page (PR #116)', () => {
  it('each sound has the gain it was measured at', () => {
    expect(BEAVER_GAINS).toEqual({
      'beaver-look': 5.25,
      'beaver-found': 1.7,
      'beaver-climb': 3.1,
      'beaver-stop': 3.3,
      'beaver-haul': 2.75,
      'beaver-turn': 2.4,
      'beaver-fanfare': 3.2,
    })
    for (const voice of VOICES) expect(play(voice).nodes[0]?.gain.value).toBe(BEAVER_GAINS[voice])
  })

  it('each has its length: the frequent ones short, the haul under its 700 ms hold at 4×, the finale under its 1.6 s', () => {
    expect(BEAVER_VOICE_MS).toEqual({
      'beaver-look': 120,
      'beaver-found': 100,
      'beaver-climb': 185,
      'beaver-stop': 90,
      'beaver-haul': 480,
      'beaver-turn': 190,
      'beaver-fanfare': 1400,
    })
  })

  it('each lasts as long as it says: its last source stops 20 ms after its end', () => {
    for (const voice of VOICES) {
      const { nodes, sound } = play(voice)
      const sources = nodes.filter((n) => n.kind === 'oscillator' || n.kind === 'buffer')
      expect(sources.length, voice).toBeGreaterThan(0)
      const lastStop = Math.max(...sources.map((s) => s.stopAt ?? 0))
      expect(lastStop - WHEN - 0.02, voice).toBeCloseTo(BEAVER_VOICE_MS[voice] / 1000, 6)
      expect(sound.end).toBeCloseTo(WHEN + BEAVER_VOICE_MS[voice] / 1000, 6)
      expect(Math.min(...sources.map((s) => s.startAt ?? Infinity))).toBeCloseTo(WHEN, 6)
    }
  })

  it('cut short only when asked: its own gain fades to 0 by the cut', () => {
    expect(play('beaver-climb').nodes[0]?.gain.changes).toEqual([])
    const { nodes, sound } = play('beaver-climb', 100)
    expect(nodes[0]?.gain.changes).toEqual([
      ['set', 3.1, WHEN + 0.088],
      ['linear', 0, WHEN + 0.1],
    ])
    expect(sound.end).toBeCloseTo(WHEN + 0.1, 6)
    // A cut longer than the sound changes nothing.
    expect(play('beaver-stop', 100).nodes[0]?.gain.changes).toEqual([])
  })

  it('knows its own voices', () => {
    for (const voice of VOICES) expect(isBeaverVoice(voice)).toBe(true)
    expect(isBeaverVoice('cart-look')).toBe(false)
    expect(isBeaverVoice('blip')).toBe(false)
  })
})
