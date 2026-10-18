/**
 * Merge sort's spaceships' sounds, rebuilt exactly from the recipes in
 * design/mockups/spaceships/README.md ("Sounds"), all made in code: no recording.
 *
 * Each sound has its own gain (the recipe's "gain") into the engine's master (0.2, then a
 * compressor), the chain the recipes were measured through. The gate's sound is played in two
 * parts (the flash, then the shoomp) so each can land on its moment of the gate shutting; they
 * share the recipe's gain. The zip's pitch is the moving ship's value: `frequency` is its `f`.
 */

export type SpaceshipVoice =
  'ship-peel' | 'ship-blips' | 'ship-zip' | 'ship-gate-flash' | 'ship-gate-shut' | 'ship-fanfare'

/** Each sound's own gain, from the recipes (the gate's flash and shoomp share theirs). */
export const SPACESHIP_GAINS: Readonly<Record<SpaceshipVoice, number>> = {
  'ship-peel': 1.6,
  'ship-blips': 1.2,
  'ship-zip': 1.5,
  'ship-gate-flash': 3.5,
  'ship-gate-shut': 3.5,
  'ship-fanfare': 1.4,
}

/** How long each lasts, in ms (its last part's end). */
export const SPACESHIP_VOICE_MS: Readonly<Record<SpaceshipVoice, number>> = {
  'ship-peel': 350,
  'ship-blips': 140,
  'ship-zip': 250,
  'ship-gate-flash': 150,
  'ship-gate-shut': 400,
  'ship-fanfare': 1000,
}

/** The zip's `f` for a ship: 520 Hz for a puff, 280 for the longest trail (`share` = |v| / L). */
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

interface Filter {
  readonly type: BiquadFilterType
  readonly frequency: number
  readonly to?: number
  readonly q?: number
}

interface Tremolo {
  readonly rate: number
  readonly depth: number
}

interface ToneOptions {
  readonly type: OscillatorType
  readonly from: number
  readonly to?: number
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
  readonly tremolo?: Tremolo
}

/**
 * Builds one sound's nodes: the spec's building blocks, `tone` and `noise`, exactly as the
 * penguins' (penguinVoices.ts); every source it starts is listed.
 */
class Patch {
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

  private filter(spec: Filter, at: number, length: number): BiquadFilterNode {
    const filter = this.context.createBiquadFilter()
    filter.type = spec.type
    filter.Q.value = spec.q ?? 0.7
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
    osc.frequency.setValueAtTime(o.from, start)
    if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(o.to, end)
    let node: AudioNode = osc
    if (o.filter) {
      const filter = this.filter(o.filter, o.at, o.length)
      node.connect(filter)
      node = filter
    }
    if (o.tremolo) node = this.tremolo(node, o.tremolo, start, end)
    node.connect(this.envelope(o.at, o.length, o.level, o.attack ?? 0.005, o.sustain ?? false))
    this.run(osc, start, end)
  }

  /** White noise, `length` + 30 ms long, through the filter (and tremolo), with a tone's
   * envelope without sustain. */
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
    node.connect(this.envelope(o.at, o.length, o.level, o.attack ?? 0.002, false))
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
    // Peel: a falling "vweeoo", at a split.
    case 'ship-peel':
      p.tone({
        type: 'triangle',
        from: 880,
        to: 440,
        at: 0,
        length: 0.35,
        level: 0.3,
        filter: { type: 'lowpass', frequency: 2000 },
      })
      p.noise({
        at: 0,
        length: 0.3,
        level: 0.25,
        filter: { type: 'bandpass', frequency: 1200, to: 600, q: 1 },
      })
      return
    // Face-off: two blips, at every compare.
    case 'ship-blips':
      for (const [from, at] of [
        [660, 0],
        [880, 0.08],
      ] as const) {
        p.tone({
          type: 'square',
          from,
          at,
          length: 0.06,
          level: 0.25,
          filter: { type: 'lowpass', frequency: 2500 },
        })
      }
      return
    // Through the gate: a rising "zip", lower for a longer trail.
    case 'ship-zip':
      p.tone({ type: 'sine', from: frequency, to: 4 * frequency, at: 0, length: 0.25, level: 0.35 })
      p.noise({
        at: 0,
        length: 0.2,
        level: 0.2,
        filter: { type: 'highpass', frequency: 2500 },
        attack: 0.05,
      })
      return
    // Gate shuts, part 1: the flash.
    case 'ship-gate-flash':
      p.tone({ type: 'triangle', from: 1568, at: 0, length: 0.15, level: 0.3 })
      return
    // Gate shuts, part 2: the "shoomp" (the recipe's, from its 0.1 s).
    case 'ship-gate-shut':
      p.tone({ type: 'sine', from: 180, to: 60, at: 0, length: 0.4, level: 0.9, attack: 0.01 })
      p.noise({
        at: 0,
        length: 0.35,
        level: 0.6,
        filter: { type: 'lowpass', frequency: 1200, to: 200 },
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
