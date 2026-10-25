/**
 * Merge sort's spaceships' sounds, from the recipes in design/mockups/spaceships/README.md
 * ("Sounds"), all made in code: no recording. Juan picked them from three versions each
 * (design/mockups/spaceships/sounds/): the split's two tones pulling apart, the compare's
 * targeting lock-on, the engine fly-by through the gate and the gate's hyperspace "vwoom"; the
 * finale's arcade fanfare is the first build's, unchanged.
 *
 * Each sound has its own gain into the engine's master (0.2, then a compressor), the chain the
 * gains were set through. The gate's sound is played in two parts (the shimmer as it flashes,
 * then the vwoom as it shuts) so each can land on its moment; they share a gain. The names say
 * the moment (the peel, the face-off, the zip through the gate). The fly-by's pitch is the
 * moving ship's value: `frequency` is its `f`.
 */

export type SpaceshipVoice =
  'ship-peel' | 'ship-blips' | 'ship-zip' | 'ship-gate-flash' | 'ship-gate-shut' | 'ship-fanfare'

/** Each sound's own gain, from the recipes (the gate's flash and shoomp share theirs). */
export const SPACESHIP_GAINS: Readonly<Record<SpaceshipVoice, number>> = {
  'ship-peel': 1.89,
  'ship-blips': 1.02,
  'ship-zip': 1.84,
  'ship-gate-flash': 1.45,
  'ship-gate-shut': 1.45,
  'ship-fanfare': 1.4,
}

/** How long each lasts, in ms (its last part's end). */
export const SPACESHIP_VOICE_MS: Readonly<Record<SpaceshipVoice, number>> = {
  'ship-peel': 340,
  'ship-blips': 165,
  'ship-zip': 300,
  'ship-gate-flash': 150,
  'ship-gate-shut': 550,
  'ship-fanfare': 1000,
}

/** When the fly-by is loudest (ms in): it swells to here, then passes. */
export const FLY_BY_PEAK_MS = 130

/** The fly-by's `f` for a ship: 520 Hz for a puff, 280 for the longest trail (`share` = |v| / L). */
export const zipHz = (share: number) => 520 - 240 * Math.min(1, Math.max(0, share))

/** The finale's run up: frequency (Hz) and start (s). */
export const FANFARE_RUN: readonly (readonly [number, number])[] = [
  [523, 0],
  [659, 0.09],
  [784, 0.18],
  [1047, 0.27],
]

/** The finale's chord, at 0.4 s. */
export const FANFARE_CHORD: readonly number[] = [1047, 1319]

/** The lock-on's three rising beeps: frequency (Hz) and start (s); then it holds the last. */
export const LOCK_ON_BEEPS: readonly (readonly [number, number])[] = [
  [1760, 0],
  [2093, 0.035],
  [2349, 0.07],
]

/** A glide: [time (s), value] points, exponential between them, from the part's start. */
type Glide = readonly (readonly [number, number])[]

interface Filter {
  readonly type: BiquadFilterType
  readonly frequency: number | Glide
  readonly to?: number
  readonly q?: number
}

interface Tremolo {
  readonly rate: number
  readonly depth: number
}

interface ToneOptions {
  readonly type: OscillatorType
  /** Hz, or a glide through several points. */
  readonly from: number | Glide
  readonly to?: number
  /** Level points ([time (s), share of `level`], linear), in place of the attack and decay. */
  readonly env?: Glide
  readonly at: number
  readonly length: number
  readonly level: number
  readonly attack?: number
  readonly filter?: Filter
  readonly tremolo?: Tremolo
  readonly sustain?: boolean
}

interface NoiseOptions {
  readonly at: number
  readonly length: number
  readonly level: number
  readonly filter: Filter
  readonly attack?: number
  readonly env?: Glide
  readonly tremolo?: Tremolo
}

/**
 * Builds one sound's nodes: the spec's building blocks, `tone` and `noise`, exactly as the
 * penguins' (penguinVoices.ts); every source it starts is listed.
 */
export class Patch {
  readonly sources: AudioScheduledSourceNode[] = []
  private readonly context: BaseAudioContext
  private readonly out: AudioNode
  private readonly t: number

  constructor(context: BaseAudioContext, out: AudioNode, t: number) {
    this.context = context
    this.out = out
    this.t = t
  }

  /** 0, linear to `level` by the attack; with sustain, held until 20 ms before the end, then
   * linear to 0; without, exponential to 0.001 at the end. */
  private envelope(at: number, length: number, level: number, attack: number, sustain: boolean) {
    const env = this.context.createGain()
    const start = this.t + at
    const end = start + length
    env.gain.setValueAtTime(0, start)
    env.gain.linearRampToValueAtTime(level, start + attack)
    if (sustain) {
      env.gain.setValueAtTime(level, Math.max(start + attack, end - 0.02))
      env.gain.linearRampToValueAtTime(0, end)
    } else {
      env.gain.exponentialRampToValueAtTime(0.001, end)
    }
    env.connect(this.out)
    return env
  }

  /**
   * An envelope through level points (shares of `level`, linear between them), from 0 at the
   * part's start. It is silent until then: a gain is 1 before its first event, and a noise source
   * starting a sample early would let one full-level sample through (a click).
   */
  private shaped(at: number, level: number, points: Glide) {
    const env = this.context.createGain()
    const start = this.t + at
    env.gain.value = 0
    env.gain.setValueAtTime(0, start)
    for (const [t, share] of points) env.gain.linearRampToValueAtTime(share * level, start + t)
    env.connect(this.out)
    return env
  }

  /** Sets a parameter at the part's start: a value, or a glide through its points. */
  private glide(param: AudioParam, spec: Glide, at: number) {
    const [first, ...rest] = spec
    param.setValueAtTime(first?.[1] ?? 0, this.t + at + (first?.[0] ?? 0))
    for (const [t, value] of rest) param.exponentialRampToValueAtTime(value, this.t + at + t)
  }

  private filter(spec: Filter, at: number, length: number): BiquadFilterNode {
    const filter = this.context.createBiquadFilter()
    filter.type = spec.type
    filter.Q.value = spec.q ?? 0.7
    if (typeof spec.frequency !== 'number') {
      this.glide(filter.frequency, spec.frequency, at)
      return filter
    }
    filter.frequency.setValueAtTime(spec.frequency, this.t + at)
    if (spec.to !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(spec.to, this.t + at + length)
    }
    return filter
  }

  /** A gain of 1 − depth/2, plus an LFO at `rate` through a gain of depth/2 into it. */
  private tremolo(node: AudioNode, spec: Tremolo, start: number, end: number): AudioNode {
    const tremolo = this.context.createGain()
    tremolo.gain.value = 1 - spec.depth / 2
    const lfo = this.context.createOscillator()
    lfo.frequency.value = spec.rate
    const depth = this.context.createGain()
    depth.gain.value = spec.depth / 2
    lfo.connect(depth)
    depth.connect(tremolo.gain)
    node.connect(tremolo)
    this.run(lfo, start, end)
    return tremolo
  }

  tone(o: ToneOptions): void {
    const start = this.t + o.at
    const end = start + o.length
    const osc = this.context.createOscillator()
    osc.type = o.type
    if (typeof o.from === 'number') {
      osc.frequency.setValueAtTime(o.from, start)
      if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(o.to, end)
    } else {
      this.glide(osc.frequency, o.from, o.at)
    }
    let node: AudioNode = osc
    if (o.filter) {
      const filter = this.filter(o.filter, o.at, o.length)
      node.connect(filter)
      node = filter
    }
    if (o.tremolo) node = this.tremolo(node, o.tremolo, start, end)
    node.connect(
      o.env
        ? this.shaped(o.at, o.level, o.env)
        : this.envelope(o.at, o.length, o.level, o.attack ?? 0.005, o.sustain ?? false),
    )
    this.run(osc, start, end)
  }

  /** White noise, `length` + 30 ms long, through the filter (and tremolo), with a tone's
   * envelope without sustain (or its level points). */
  noise(o: NoiseOptions): void {
    const start = this.t + o.at
    const end = start + o.length
    const rate = this.context.sampleRate
    const buffer = this.context.createBuffer(1, Math.ceil((o.length + 0.03) * rate), rate)
    const data = buffer.getChannelData(0)
    for (let k = 0; k < data.length; k++) data[k] = Math.random() * 2 - 1
    const source = this.context.createBufferSource()
    source.buffer = buffer
    let node: AudioNode = this.filter(o.filter, o.at, o.length)
    source.connect(node)
    if (o.tremolo) node = this.tremolo(node, o.tremolo, start, end)
    node.connect(
      o.env
        ? this.shaped(o.at, o.level, o.env)
        : this.envelope(o.at, o.length, o.level, o.attack ?? 0.002, false),
    )
    this.run(source, start, end)
  }

  private run(source: AudioScheduledSourceNode, start: number, end: number) {
    source.start(start)
    source.stop(end + 0.02)
    this.sources.push(source)
  }
}

/** The recipes. Times are seconds from the sound's start. */
function build(voice: SpaceshipVoice, p: Patch, frequency: number): void {
  switch (voice) {
    // Split: two tones pulling apart, one note splitting in two (one up, one down), warbling.
    case 'ship-peel':
      for (const to of [1047, 392]) {
        p.tone({
          type: 'triangle',
          from: [
            [0, 659],
            [0.32, to],
          ],
          at: 0,
          length: 0.34,
          level: 0.3,
          attack: 0.01,
          filter: { type: 'lowpass', frequency: 3500 },
          tremolo: { rate: 14, depth: 0.25 },
        })
      }
      return
    // Compare: a targeting lock-on, three quick rising beeps, then the lock tone held.
    case 'ship-blips': {
      const beep = {
        type: 'square',
        level: 0.2,
        attack: 0.002,
        sustain: true,
        filter: { type: 'lowpass', frequency: 4000 },
      } as const
      for (const [from, at] of LOCK_ON_BEEPS) p.tone({ ...beep, from, at, length: 0.025 })
      p.tone({ ...beep, from: 2349, at: 0.105, length: 0.06, level: 0.18 })
      return
    }
    // Through the gate: an engine fly-by, a whoosh that swells and passes as its engine note
    // drops (doppler); lower for a longer trail. Loudest at FLY_BY_PEAK_MS.
    case 'ship-zip': {
      const f = frequency
      const engine = f / 2
      p.tone({
        type: 'sawtooth',
        from: [
          [0, engine * 1.15],
          [0.14, engine * 1.08],
          [0.3, engine * 0.82],
        ],
        at: 0,
        length: 0.3,
        level: 0.28,
        env: [
          [0.12, 1],
          [0.2, 0.6],
          [0.3, 0],
        ],
        filter: {
          type: 'lowpass',
          frequency: [
            [0, 700],
            [0.13, 2400],
            [0.3, 500],
          ],
        },
      })
      p.noise({
        at: 0,
        length: 0.3,
        level: 0.35,
        env: [
          [0.13, 1],
          [0.3, 0],
        ],
        filter: {
          type: 'bandpass',
          frequency: [
            [0, 2 * f],
            [0.13, 6 * f],
            [0.3, 1.5 * f],
          ],
          q: 1.4,
        },
      })
      return
    }
    // Gate shuts, part 1: a bright shimmer as it flashes.
    case 'ship-gate-flash':
      p.tone({
        type: 'triangle',
        from: [
          [0, 1760],
          [0.15, 2637],
        ],
        at: 0,
        length: 0.15,
        level: 0.12,
      })
      return
    // Gate shuts, part 2: the hyperspace "vwoom", a deep swell that rushes in and drops away.
    case 'ship-gate-shut':
      p.tone({
        type: 'sawtooth',
        from: [
          [0, 160],
          [0.18, 260],
          [0.55, 45],
        ],
        at: 0,
        length: 0.55,
        level: 0.45,
        env: [
          [0.16, 1],
          [0.55, 0],
        ],
        filter: {
          type: 'lowpass',
          frequency: [
            [0, 400],
            [0.16, 2200],
            [0.55, 150],
          ],
          q: 2,
        },
      })
      p.tone({
        type: 'sine',
        from: [
          [0, 70],
          [0.55, 38],
        ],
        at: 0,
        length: 0.55,
        level: 0.6,
        env: [
          [0.16, 1],
          [0.55, 0],
        ],
      })
      p.noise({
        at: 0,
        length: 0.5,
        level: 0.4,
        env: [
          [0.15, 1],
          [0.5, 0],
        ],
        filter: {
          type: 'lowpass',
          frequency: [
            [0, 500],
            [0.15, 3500],
            [0.5, 200],
          ],
        },
      })
      return
    // Finale: an arcade fanfare, a run up, a chord, and the fly-off's rush.
    case 'ship-fanfare': {
      const square = { type: 'square', filter: { type: 'lowpass', frequency: 3500 } } as const
      for (const [from, at] of FANFARE_RUN) {
        p.tone({ ...square, from, at, length: 0.08, level: 0.35, sustain: true })
      }
      for (const from of FANFARE_CHORD) {
        p.tone({
          ...square,
          from,
          at: 0.4,
          length: 0.5,
          level: 0.3,
          sustain: true,
          tremolo: { rate: 8, depth: 0.3 },
        })
      }
      p.noise({
        at: 0.4,
        length: 0.6,
        level: 0.5,
        filter: { type: 'bandpass', frequency: 600, to: 3000, q: 1.5 },
        attack: 0.1,
      })
      return
    }
  }
}

export interface SpaceshipSound {
  /** The sound's own gain node (its level is the recipe's gain). */
  readonly gain: GainNode
  readonly sources: readonly AudioScheduledSourceNode[]
  /** When it stops sounding (context seconds). */
  readonly end: number
}

/**
 * Schedules one spaceship sound at `when` (context seconds) into `out`. `frequency` is the zip's
 * `f` (zipHz). `cutMs`, if given and shorter than the sound, ends it there, fading in `fadeMs`.
 */
export function playSpaceshipVoice(
  context: BaseAudioContext,
  out: AudioNode,
  voice: SpaceshipVoice,
  when: number,
  options: { readonly frequency?: number; readonly cutMs?: number; readonly fadeMs?: number } = {},
): SpaceshipSound {
  const gain = context.createGain()
  gain.gain.value = SPACESHIP_GAINS[voice]
  gain.connect(out)
  const patch = new Patch(context, gain, when)
  build(voice, patch, options.frequency ?? zipHz(0))
  const { cutMs, fadeMs = 12 } = options
  let end = when + SPACESHIP_VOICE_MS[voice] / 1000
  if (cutMs !== undefined && cutMs < SPACESHIP_VOICE_MS[voice]) {
    end = when + cutMs / 1000
    gain.gain.setValueAtTime(SPACESHIP_GAINS[voice], Math.max(when, end - fadeMs / 1000))
    gain.gain.linearRampToValueAtTime(0, end)
  }
  return { gain, sources: patch.sources, end }
}

export function isSpaceshipVoice(voice: string): voice is SpaceshipVoice {
  return voice in SPACESHIP_GAINS
}
