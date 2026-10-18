import { describe, expect, it } from 'vitest'
import {
  FANFARE_CHORD,
  FANFARE_RUN,
  FLY_BY_PEAK_MS,
  isSpaceshipVoice,
  LOCK_ON_BEEPS,
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
  it('each sound has its own gain: split 1.89, lock-on 1.02, fly-by 1.84, gate 1.45, fanfare 1.4', () => {
    expect(SPACESHIP_GAINS).toEqual({
      'ship-peel': 1.89,
      'ship-blips': 1.02,
      'ship-zip': 1.84,
      'ship-gate-flash': 1.45,
      'ship-gate-shut': 1.45,
      'ship-fanfare': 1.4,
    })
    for (const voice of Object.keys(SPACESHIP_GAINS) as SpaceshipVoice[]) {
      expect(play(voice).nodes[0]?.gain.value).toBe(SPACESHIP_GAINS[voice])
    }
  })

  it('split: two triangles from 659 Hz pulling apart, one up to 1047 and one down to 392, warbling at 14 Hz', () => {
    const { of, nodes, sound } = play('ship-peel')
    const triangles = of('oscillator').filter((o) => o.type === 'triangle')
    expect(triangles.map((o) => o.frequency.changes)).toEqual([
      [
        ['set', 659, WHEN],
        ['exp', 1047, WHEN + 0.32],
      ],
      [
        ['set', 659, WHEN],
        ['exp', 392, WHEN + 0.32],
      ],
    ])
    for (const o of triangles) near(o.stopAt, WHEN + 0.34 + 0.02)
    // Each through a low-pass at 3500 Hz and a 14 Hz tremolo (depth 0.25).
    expect(of('filter').map((f) => [f.type, f.frequency.changes[0]?.[1]])).toEqual([
      ['lowpass', 3500],
      ['lowpass', 3500],
    ])
    const lfos = of('oscillator').filter((o) => o.type === '')
    expect(lfos.map((o) => o.frequency.value)).toEqual([14, 14])
    expect(envelopes(nodes).map((g) => riseOf(g.gain))).toEqual([
      ['linear', 0.3, WHEN + 0.01],
      ['linear', 0.3, WHEN + 0.01],
    ])
    near(sound.end, WHEN + 0.34)
  })

  it('compare: a lock-on, three square beeps rising 1760–2349 Hz, then the lock tone held', () => {
    const { of, nodes, sound } = play('ship-blips')
    expect(
      of('oscillator').map((o) => [
        o.type,
        o.frequency.changes[0]?.[1],
        at(o.startAt),
        at(o.stopAt),
      ]),
    ).toEqual([
      ...LOCK_ON_BEEPS.map(([f, t]) => [
        'square',
        f,
        t,
        Math.round((t + 0.025 + 0.02) * 1e6) / 1e6,
      ]),
      ['square', 2349, 0.105, 0.185],
    ])
    expect(
      of('filter').every((f) => f.type === 'lowpass' && f.frequency.changes[0]?.[1] === 4000),
    ).toBe(true)
    // Held beeps (sustained, 20 ms fades): 0.2 each, the lock tone 0.18.
    expect(envelopes(nodes).map((g) => riseOf(g.gain)?.[1])).toEqual([0.2, 0.2, 0.2, 0.18])
    near(sound.end, WHEN + 0.165)
  })

  it('the fly-by: an engine sawtooth at f/2 dropping (doppler), and a whoosh swelling to its peak at 130 ms', () => {
    const { of, nodes, sound } = play('ship-zip', { frequency: 400 })
    const [engine] = of('oscillator')
    expect(engine?.type).toBe('sawtooth')
    // f/2 = 200 Hz: from 1.15× down through 1.08× to 0.82× (rounded to 0.01 Hz).
    expect(
      engine?.frequency.changes.map(([kind, hz, t]) => [kind, Math.round(hz * 100) / 100, t]),
    ).toEqual([
      ['set', 230, WHEN],
      ['exp', 216, WHEN + 0.14],
      ['exp', 164, WHEN + 0.3],
    ])
    const [lowpass, bandpass] = of('filter')
    expect(lowpass?.frequency.changes).toEqual([
      ['set', 700, WHEN],
      ['exp', 2400, WHEN + 0.13],
      ['exp', 500, WHEN + 0.3],
    ])
    expect(bandpass?.type).toBe('bandpass')
    expect(bandpass?.Q.value).toBe(1.4)
    expect(bandpass?.frequency.changes).toEqual([
      ['set', 800, WHEN],
      ['exp', 2400, WHEN + 0.13],
      ['exp', 600, WHEN + 0.3],
    ])
    // Both swell to their loudest around FLY_BY_PEAK_MS, then pass; silent before they start.
    const [sawEnv, whooshEnv] = envelopes(nodes)
    expect(sawEnv?.gain.value).toBe(0)
    expect(sawEnv?.gain.changes).toEqual([
      ['set', 0, WHEN],
      ['linear', 0.28, WHEN + 0.12],
      ['linear', 0.168, WHEN + 0.2],
      ['linear', 0, WHEN + 0.3],
    ])
    expect(whooshEnv?.gain.changes).toEqual([
      ['set', 0, WHEN],
      ['linear', 0.35, WHEN + FLY_BY_PEAK_MS / 1000],
      ['linear', 0, WHEN + 0.3],
    ])
    near(sound.end, WHEN + 0.3)
  })

  it('the fly-by is pitched by value: 520 Hz for a puff, 280 for the longest trail (a deeper engine)', () => {
    expect([0, 0.5, 1].map(zipHz)).toEqual([520, 400, 280])
    expect(zipHz(-1)).toBe(520)
    expect(zipHz(2)).toBe(280)
    expect(play('ship-zip').of('oscillator')[0]?.frequency.changes[0]?.[1]).toBeCloseTo(299)
    expect(
      play('ship-zip', { frequency: 280 }).of('oscillator')[0]?.frequency.changes[0]?.[1],
    ).toBeCloseTo(161)
  })

  it('the gate, part 1: a shimmer, a triangle 1760 → 2637 Hz for 0.15 s at 0.12', () => {
    const { of, nodes, sound } = play('ship-gate-flash')
    expect(of('oscillator').map((o) => [o.type, o.frequency.changes])).toEqual([
      [
        'triangle',
        [
          ['set', 1760, WHEN],
          ['exp', 2637, WHEN + 0.15],
        ],
      ],
    ])
    expect(envelopes(nodes).map((g) => riseOf(g.gain)?.[1])).toEqual([0.12])
    near(sound.end, WHEN + 0.15)
  })

  it('the gate shuts: the vwoom, a sawtooth 160 → 260 → 45 Hz, a sine 70 → 38 Hz and a rush, swelling to 0.16 s', () => {
    const { of, nodes, sound } = play('ship-gate-shut')
    const [saw, sine] = of('oscillator')
    expect(saw?.type).toBe('sawtooth')
    expect(saw?.frequency.changes).toEqual([
      ['set', 160, WHEN],
      ['exp', 260, WHEN + 0.18],
      ['exp', 45, WHEN + 0.55],
    ])
    expect(sine?.type).toBe('sine')
    expect(sine?.frequency.changes).toEqual([
      ['set', 70, WHEN],
      ['exp', 38, WHEN + 0.55],
    ])
    const [sawFilter, rushFilter] = of('filter')
    expect(sawFilter?.Q.value).toBe(2)
    expect(sawFilter?.frequency.changes).toEqual([
      ['set', 400, WHEN],
      ['exp', 2200, WHEN + 0.16],
      ['exp', 150, WHEN + 0.55],
    ])
    expect(rushFilter?.frequency.changes).toEqual([
      ['set', 500, WHEN],
      ['exp', 3500, WHEN + 0.15],
      ['exp', 200, WHEN + 0.5],
    ])
    expect(envelopes(nodes).map((g) => g.gain.changes.slice(1))).toEqual([
      [
        ['linear', 0.45, WHEN + 0.16],
        ['linear', 0, WHEN + 0.55],
      ],
      [
        ['linear', 0.6, WHEN + 0.16],
        ['linear', 0, WHEN + 0.55],
      ],
      [
        ['linear', 0.4, WHEN + 0.15],
        ['linear', 0, WHEN + 0.5],
      ],
    ])
    near(sound.end, WHEN + 0.55)
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
