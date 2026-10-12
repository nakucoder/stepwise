import { describe, expect, it } from 'vitest'
import {
  CALL_MS,
  CHIRPS,
  isPenguinVoice,
  PENGUIN_GAINS,
  PENGUIN_VOICE_MS,
  playPenguinVoice,
  type PenguinVoice,
} from './penguinVoices'

/** A parameter that records its value and every change: [kind, value, time]. */
function param(initial = 0) {
  const changes: [string, number, number][] = []
  return {
    changes,
    value: initial,
    setValueAtTime(v: number, t: number) {
      changes.push(['set', v, t])
    },
    linearRampToValueAtTime(v: number, t: number) {
      changes.push(['linear', v, t])
    },
    exponentialRampToValueAtTime(v: number, t: number) {
      changes.push(['exp', v, t])
    },
  }
}

interface Node {
  readonly kind: 'gain' | 'filter' | 'oscillator' | 'buffer'
  type: string
  readonly gain: ReturnType<typeof param>
  readonly frequency: ReturnType<typeof param>
  readonly Q: ReturnType<typeof param>
  readonly playbackRate: ReturnType<typeof param>
  buffer: unknown
  startAt?: number
  stopAt?: number
  readonly to: Node[]
}

/** Enough of an AudioContext to record every node, its settings and its times. */
function recordingContext() {
  const nodes: Node[] = []
  const make = (kind: Node['kind']) => {
    const node: Node & {
      connect: (to: Node | ReturnType<typeof param>) => void
      start: (t: number) => void
      stop: (t: number) => void
    } = {
      kind,
      type: '',
      gain: param(1),
      frequency: param(),
      Q: param(),
      playbackRate: param(1),
      buffer: null,
      to: [],
      connect(to) {
        if ('kind' in to) node.to.push(to)
      },
      start(t) {
        node.startAt = t
      },
      stop(t) {
        node.stopAt = t
      },
    }
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
      length,
      getChannelData: () => new Float32Array(length),
    }),
  } as unknown as BaseAudioContext
  return { context, nodes }
}

const RECORDING = { duration: CALL_MS / 1000 } as AudioBuffer
const WHEN = 2

function play(voice: PenguinVoice, cutMs?: number, recording: AudioBuffer | null = RECORDING) {
  const { context, nodes } = recordingContext()
  const out = { connect() {} } as unknown as AudioNode
  const sound = playPenguinVoice(context, out, voice, WHEN, {
    recording,
    ...(cutMs === undefined ? {} : { cutMs }),
  })
  const of = (kind: Node['kind']) => nodes.filter((n) => n.kind === kind)
  return { sound, nodes, of }
}

const near = (a: number | undefined, b: number) => {
  expect(a).toBeCloseTo(b, 6)
}
/** The level an envelope rises to (its first linear ramp). */
const peakOf = (gain: Node['gain']) => gain.changes.find(([kind]) => kind === 'linear')?.[1]

describe('penguin voices: the recipes (design/mockups/penguins/README.md)', () => {
  it('each sound has its own gain: tap 2.8, swish 1.65, slide 4.05, in place 1.83, finale 1.43', () => {
    expect(PENGUIN_GAINS).toEqual({
      'penguin-tap': 2.8,
      'penguin-swish': 1.65,
      'penguin-whoosh': 4.05,
      'penguin-call': 4.05,
      'penguin-call-short': 1.83,
      'penguin-finale': 1.43,
    })
    for (const voice of Object.keys(PENGUIN_GAINS) as PenguinVoice[]) {
      expect(play(voice).nodes[0]?.gain.value).toBe(PENGUIN_GAINS[voice])
    }
  })

  it('tap: two sines, 1760 Hz for 0.09 s at 0.4 and 2637 Hz for 0.07 s at 0.25', () => {
    const { of, sound } = play('penguin-tap')
    const tones = of('oscillator')
    expect(tones.map((o) => [o.type, o.frequency.changes[0]?.[1]])).toEqual([
      ['sine', 1760],
      ['sine', 2637],
    ])
    for (const o of tones) near(o.startAt, WHEN)
    near(tones[0]?.stopAt, WHEN + 0.09 + 0.02)
    near(tones[1]?.stopAt, WHEN + 0.07 + 0.02)
    const envelopes = of('gain').slice(1)
    expect(envelopes.map((g) => peakOf(g.gain))).toEqual([0.4, 0.25])
    near(sound?.end, WHEN + 0.09)
  })

  it('swish: high-passed noise at 3000 Hz with a 40 Hz tremolo, and band-passed noise at 900 Hz', () => {
    const { of } = play('penguin-swish')
    const noises = of('buffer')
    expect(noises).toHaveLength(2)
    expect(noises.map((n) => (n.buffer as { length: number }).length)).toEqual([
      Math.ceil((0.18 + 0.03) * 8000),
      Math.ceil((0.1 + 0.03) * 8000),
    ])
    expect(of('filter').map((f) => [f.type, f.frequency.changes[0]?.[1]])).toEqual([
      ['highpass', 3000],
      ['bandpass', 900],
    ])
    // The tremolo: an LFO at 40 Hz, half its depth (0.25) around 1 − 0.25.
    const lfo = of('oscillator')
    expect(lfo.map((o) => o.frequency.value)).toEqual([40])
    expect(of('gain').map((g) => g.gain.value)).toEqual(expect.arrayContaining([0.75, 0.25]))
    // The scrape rises over 20 ms to 0.9; the band-passed one over 2 ms to 0.4.
    const envelopes = of('gain').filter((g) => g.gain.changes.length > 0 && g !== of('gain')[0])
    expect(envelopes.map((g) => [peakOf(g.gain), g.gain.changes[1]?.[2]])).toEqual([
      [0.9, WHEN + 0.02],
      [0.4, WHEN + 0.002],
    ])
  })

  it('whoosh: noise band-passed from 400 to 2500 Hz (Q 1.5), 0.9 s, rising over 0.15 s to 1.4', () => {
    const { of, sound } = play('penguin-whoosh')
    const [filter] = of('filter')
    expect(filter?.type).toBe('bandpass')
    expect(filter?.Q.value).toBe(1.5)
    expect(filter?.frequency.changes).toEqual([
      ['set', 400, WHEN],
      ['exp', 2500, WHEN + 0.9],
    ])
    const envelope = of('gain')[1]
    expect(envelope?.gain.changes[1]).toEqual(['linear', 1.4, WHEN + 0.15])
    near(sound?.end, WHEN + 0.9)
  })

  it('the slide’s call: the whole recording at its own speed, at 0.3, fading over its last 20 ms', () => {
    const { of, sound } = play('penguin-call')
    const [call] = of('buffer')
    expect(call?.buffer).toBe(RECORDING)
    expect(call?.playbackRate.value).toBe(1)
    near(call?.startAt, WHEN)
    near(call?.stopAt, WHEN + 0.464)
    expect(of('gain')[1]?.gain.changes).toEqual([
      ['set', 0.3, WHEN],
      ['set', 0.3, WHEN + 0.464 - 0.02],
      ['linear', 0, WHEN + 0.464],
    ])
    near(sound?.end, WHEN + 0.464)
  })

  it('already in place: the call at 1.25×, at 0.34, cut at 0.2 s with its 20 ms fade', () => {
    const { of, sound } = play('penguin-call-short')
    const [call] = of('buffer')
    expect(call?.playbackRate.value).toBe(1.25)
    near(call?.stopAt, WHEN + 0.2)
    const changes = of('gain')[1]?.gain.changes ?? []
    expect(changes[0]).toEqual(['set', 0.34, WHEN])
    near(changes[1]?.[2], WHEN + 0.18)
    expect(changes[2]?.[0]).toBe('linear')
    near(changes[2]?.[2], WHEN + 0.2)
    near(sound?.end, WHEN + 0.2)
  })

  it('a call cut shorter still (a fast step) ends there, with the same 20 ms fade', () => {
    const { of, sound } = play('penguin-call-short', 97)
    near(of('buffer')[0]?.stopAt, WHEN + 0.097)
    near(of('gain')[1]?.gain.changes[1]?.[2], WHEN + 0.077)
    near(sound?.end, WHEN + 0.097)
  })

  it('no recording yet: no call (nothing to play), but the whoosh still plays', () => {
    expect(play('penguin-call', undefined, null).sound).toBeNull()
    expect(play('penguin-call-short', undefined, null).sound).toBeNull()
    expect(play('penguin-whoosh', undefined, null).sound).not.toBeNull()
  })

  it('the whoosh, cut where the call starts, fades out there', () => {
    const { nodes, sound } = play('penguin-whoosh', 360)
    const own = nodes[0]?.gain.changes ?? []
    expect(own.at(-1)).toEqual(['linear', 0, WHEN + 0.36])
    near(own.at(-2)?.[2], WHEN + 0.36 - 0.012)
    near(sound?.end, WHEN + 0.36)
  })

  it('finale: six square chirps up the scale, then a honk at 0.5 s', () => {
    const { of, sound } = play('penguin-finale')
    const squares = of('oscillator').filter((o) => o.type === 'square')
    expect(
      squares.map((o) => [
        o.frequency.changes[0]?.[1],
        Math.round(((o.startAt ?? 0) - WHEN) * 1e6) / 1e6,
      ]),
    ).toEqual(CHIRPS.map(([f, at]) => [f, at]))
    const saws = of('oscillator').filter((o) => o.type === 'sawtooth')
    expect(saws.map((o) => o.frequency.changes)).toEqual([
      [
        ['set', 520, WHEN + 0.5],
        ['exp', 520 * 0.88, WHEN + 0.85],
      ],
      [
        ['set', 780, WHEN + 0.5],
        ['exp', 702, WHEN + 0.5 + 0.315],
      ],
    ])
    // The bray's band-passes, at 2.3 f (Q 2.5) and 3.2 f (Q 3); the chirps' low-pass at 3500.
    const filters = of('filter').map((f) => [f.type, f.frequency.changes[0]?.[1], f.Q.value])
    expect(filters.filter(([type]) => type === 'lowpass')).toHaveLength(6)
    expect(filters.filter(([type]) => type === 'bandpass')).toEqual([
      ['bandpass', 1196, 2.5],
      ['bandpass', 1664, 3],
    ])
    // The bray's tremolo: 24 Hz.
    expect(
      of('oscillator')
        .filter((o) => o.type === '')
        .map((o) => o.frequency.value),
    ).toEqual([24])
    near(sound?.end, WHEN + 0.85)
  })

  it('knows its own voices', () => {
    for (const voice of Object.keys(PENGUIN_VOICE_MS)) expect(isPenguinVoice(voice)).toBe(true)
    for (const voice of ['quack', 'blip', 'robot-scan', 'claw-clank']) {
      expect(isPenguinVoice(voice)).toBe(false)
    }
  })
})
