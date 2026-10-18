import { describe, expect, it } from 'vitest'
import {
  FANFARE_CHORD,
  FANFARE_RUN,
  isSpaceshipVoice,
  playSpaceshipVoice,
  SPACESHIP_GAINS,
  SPACESHIP_VOICE_MS,
  zipHz,
  type SpaceshipVoice,
} from './spaceshipVoices'

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

const WHEN = 2

function play(voice: SpaceshipVoice, options: { frequency?: number; cutMs?: number } = {}) {
  const { context, nodes } = recordingContext()
  const out = { connect() {} } as unknown as AudioNode
  const sound = playSpaceshipVoice(context, out, voice, WHEN, options)
  const of = (kind: Node['kind']) => nodes.filter((n) => n.kind === kind)
  return { sound, nodes, of }
}

const near = (a: number | undefined, b: number) => {
  expect(a).toBeCloseTo(b, 6)
}
/** The level an envelope rises to (its first linear ramp), and when. */
const riseOf = (gain: Node['gain']) => gain.changes.find(([kind]) => kind === 'linear')
/** The envelopes: every gain but the sound's own (the first) and a tremolo's. */
const envelopes = (nodes: Node[]) =>
  nodes.filter((n) => n.kind === 'gain' && n !== nodes[0] && n.gain.changes.length > 0)
const at = (t: number | undefined) => Math.round(((t ?? 0) - WHEN) * 1e6) / 1e6

describe('spaceship voices: the recipes (design/mockups/spaceships/README.md)', () => {
  it('each sound has its own gain: peel 1.6, blips 1.2, zip 1.5, gate 3.5, fanfare 1.4', () => {
    expect(SPACESHIP_GAINS).toEqual({
      'ship-peel': 1.6,
      'ship-blips': 1.2,
      'ship-zip': 1.5,
      'ship-gate-flash': 3.5,
      'ship-gate-shut': 3.5,
      'ship-fanfare': 1.4,
    })
    for (const voice of Object.keys(SPACESHIP_GAINS) as SpaceshipVoice[]) {
      expect(play(voice).nodes[0]?.gain.value).toBe(SPACESHIP_GAINS[voice])
    }
  })

  it('peel: a triangle 880 → 440 Hz (low-pass 2000), 0.35 s at 0.3, and noise band-passed 1200 → 600 Hz', () => {
    const { of, nodes, sound } = play('ship-peel')
    const [tone] = of('oscillator')
    expect(tone?.type).toBe('triangle')
    expect(tone?.frequency.changes).toEqual([
      ['set', 880, WHEN],
      ['exp', 440, WHEN + 0.35],
    ])
    expect(of('filter').map((f) => [f.type, f.frequency.changes, f.Q.value])).toEqual([
      ['lowpass', [['set', 2000, WHEN]], 0.7],
      [
        'bandpass',
        [
          ['set', 1200, WHEN],
          ['exp', 600, WHEN + 0.3],
        ],
        1,
      ],
    ])
    expect(of('buffer').map((n) => (n.buffer as { length: number }).length)).toEqual([
      Math.ceil((0.3 + 0.03) * 8000),
    ])
    expect(envelopes(nodes).map((g) => riseOf(g.gain)?.[1])).toEqual([0.3, 0.25])
    near(sound.end, WHEN + 0.35)
  })

  it('face-off: two square blips, 660 Hz at 0 and 880 Hz at 0.08 s, 0.06 s each at 0.25', () => {
    const { of, nodes, sound } = play('ship-blips')
    expect(
      of('oscillator').map((o) => [o.type, o.frequency.changes[0]?.[1], at(o.startAt)]),
    ).toEqual([
      ['square', 660, 0],
      ['square', 880, 0.08],
    ])
    expect(of('filter').map((f) => [f.type, f.frequency.changes[0]?.[1]])).toEqual([
      ['lowpass', 2500],
      ['lowpass', 2500],
    ])
    expect(envelopes(nodes).map((g) => riseOf(g.gain)?.[1])).toEqual([0.25, 0.25])
    near(sound.end, WHEN + 0.14)
  })

  it('the zip: a sine f → 4f over 0.25 s at 0.35, and high-passed noise rising over 0.05 s', () => {
    const { of, nodes, sound } = play('ship-zip', { frequency: 400 })
    const [tone] = of('oscillator')
    expect(tone?.type).toBe('sine')
    expect(tone?.frequency.changes).toEqual([
      ['set', 400, WHEN],
      ['exp', 1600, WHEN + 0.25],
    ])
    expect(of('filter').map((f) => [f.type, f.frequency.changes[0]?.[1]])).toEqual([
      ['highpass', 2500],
    ])
    const [sine, noise] = envelopes(nodes).map((g) => riseOf(g.gain))
    expect(sine?.[1]).toBe(0.35)
    expect(noise).toEqual(['linear', 0.2, WHEN + 0.05])
    near(sound.end, WHEN + 0.25)
  })

  it('the zip is pitched by value: 520 Hz for a puff, 280 for the longest trail', () => {
    expect([0, 0.5, 1].map(zipHz)).toEqual([520, 400, 280])
    expect(zipHz(-1)).toBe(520)
    expect(zipHz(2)).toBe(280)
    expect(play('ship-zip').of('oscillator')[0]?.frequency.changes[0]?.[1]).toBe(520)
  })

  it('the gate: the flash, a triangle 1568 Hz for 0.15 s at 0.3', () => {
    const { of, nodes, sound } = play('ship-gate-flash')
    expect(of('oscillator').map((o) => [o.type, o.frequency.changes[0]?.[1]])).toEqual([
      ['triangle', 1568],
    ])
    expect(envelopes(nodes).map((g) => riseOf(g.gain)?.[1])).toEqual([0.3])
    near(sound.end, WHEN + 0.15)
  })

  it('the gate shuts: a sine 180 → 60 Hz over 0.4 s at 0.9 (10 ms attack), and noise low-passed 1200 → 200 Hz', () => {
    const { of, nodes, sound } = play('ship-gate-shut')
    expect(of('oscillator')[0]?.frequency.changes).toEqual([
      ['set', 180, WHEN],
      ['exp', 60, WHEN + 0.4],
    ])
    expect(of('filter')[0]?.frequency.changes).toEqual([
      ['set', 1200, WHEN],
      ['exp', 200, WHEN + 0.35],
    ])
    const [sine, noise] = envelopes(nodes).map((g) => riseOf(g.gain))
    expect(sine).toEqual(['linear', 0.9, WHEN + 0.01])
    expect(noise?.[1]).toBe(0.6)
    near(sound.end, WHEN + 0.4)
  })

  it('finale: a square run 523–1047 Hz, a chord of 1047 and 1319 Hz with an 8 Hz tremolo, and the fly-off’s rush', () => {
    const { of, sound } = play('ship-fanfare')
    const squares = of('oscillator').filter((o) => o.type === 'square')
    expect(squares.map((o) => [o.frequency.changes[0]?.[1], at(o.startAt)])).toEqual([
      ...FANFARE_RUN.map(([f, t]) => [f, t]),
      ...FANFARE_CHORD.map((f) => [f, 0.4]),
    ])
    // The run's notes, 0.08 s each; the chord's, 0.5 s (each held, a 20 ms fade at its end).
    expect(squares.map((o) => at(o.stopAt))).toEqual([0.1, 0.19, 0.28, 0.37, 0.92, 0.92])
    // The chord's tremolos: two LFOs at 8 Hz.
    expect(
      of('oscillator')
        .filter((o) => o.type === '')
        .map((o) => o.frequency.value),
    ).toEqual([8, 8])
    const rush = of('filter').find((f) => f.type === 'bandpass')
    expect(rush?.Q.value).toBe(1.5)
    expect(rush?.frequency.changes).toEqual([
      ['set', 600, WHEN + 0.4],
      ['exp', 3000, WHEN + 1],
    ])
    near(of('buffer')[0]?.startAt, WHEN + 0.4)
    near(sound.end, WHEN + 1)
  })

  it('a sound cut short (a fast step) fades out there', () => {
    const { nodes, sound } = play('ship-peel', { cutMs: 190 })
    const own = nodes[0]?.gain.changes ?? []
    expect(own.at(-1)).toEqual(['linear', 0, WHEN + 0.19])
    near(own.at(-2)?.[2], WHEN + 0.19 - 0.012)
    near(sound.end, WHEN + 0.19)
    // A cut longer than the sound changes nothing.
    expect(play('ship-peel', { cutMs: 500 }).nodes[0]?.gain.changes).toEqual([])
  })

  it('knows its own voices', () => {
    for (const voice of Object.keys(SPACESHIP_VOICE_MS)) expect(isSpaceshipVoice(voice)).toBe(true)
    for (const voice of ['quack', 'blip', 'robot-scan', 'penguin-tap']) {
      expect(isSpaceshipVoice(voice)).toBe(false)
    }
  })
})
