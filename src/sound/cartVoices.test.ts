import { describe, expect, it } from 'vitest'
import { CART_GAINS, CART_VOICE_MS, isCartVoice, playCartVoice, type CartVoice } from './cartVoices'

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
const VOICES = Object.keys(CART_GAINS) as CartVoice[]

function play(voice: CartVoice, cutMs?: number) {
  const { context, nodes } = recordingContext()
  const out = { connect() {} } as unknown as AudioNode
  const sound = playCartVoice(context, out, voice, WHEN, cutMs === undefined ? {} : { cutMs })
  return { sound, nodes }
}

describe('the pizza cart’s voices: the seven picked on the listening page (PR #99)', () => {
  it('each sound has the gain it was measured at', () => {
    expect(CART_GAINS).toEqual({
      'cart-look': 1.2,
      'cart-move': 1.52,
      'cart-stay': 3.75,
      'cart-nudge': 2.78,
      'cart-deliver': 3.16,
      'cart-done': 1.67,
      'cart-fanfare': 1.85,
    })
    for (const voice of VOICES) expect(play(voice).nodes[0]?.gain.value).toBe(CART_GAINS[voice])
  })

  it('each fits its moment: a frequent one 170 ms (a 4× step, less 10 ms to fade), "Delivered!" its 400 ms hold, the finale about a second', () => {
    expect(CART_VOICE_MS).toEqual({
      'cart-look': 140,
      'cart-move': 160,
      'cart-stay': 60,
      'cart-nudge': 80,
      'cart-deliver': 390,
      'cart-done': 150,
      'cart-fanfare': 980,
    })
  })

  it('each lasts as long as it says: its last source stops 20 ms after its end', () => {
    for (const voice of VOICES) {
      const { nodes, sound } = play(voice)
      const sources = nodes.filter((n) => n.kind === 'oscillator' || n.kind === 'buffer')
      expect(sources.length, voice).toBeGreaterThan(0)
      const lastStop = Math.max(...sources.map((s) => s.stopAt ?? 0))
      expect(lastStop - WHEN - 0.02, voice).toBeCloseTo(CART_VOICE_MS[voice] / 1000, 6)
      expect(sound.end).toBeCloseTo(WHEN + CART_VOICE_MS[voice] / 1000, 6)
      expect(Math.min(...sources.map((s) => s.startAt ?? Infinity))).toBeCloseTo(WHEN, 6)
    }
  })

  it('cut short only when asked: its own gain fades to 0 by the cut', () => {
    expect(play('cart-move').nodes[0]?.gain.changes).toEqual([])
    const { nodes, sound } = play('cart-move', 100)
    expect(nodes[0]?.gain.changes).toEqual([
      ['set', 1.52, WHEN + 0.088],
      ['linear', 0, WHEN + 0.1],
    ])
    expect(sound.end).toBeCloseTo(WHEN + 0.1, 6)
    // A cut longer than the sound changes nothing.
    expect(play('cart-stay', 100).nodes[0]?.gain.changes).toEqual([])
  })

  it('knows its own voices', () => {
    for (const voice of VOICES) expect(isCartVoice(voice)).toBe(true)
    expect(isCartVoice('ship-zip')).toBe(false)
    expect(isCartVoice('blip')).toBe(false)
  })
})
