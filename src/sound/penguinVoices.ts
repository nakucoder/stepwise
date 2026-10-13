/**
 * Insertion sort's penguins' sounds, rebuilt exactly from the recipes in
 * design/mockups/penguins/README.md ("Sounds"). Four are made in code; the two calls play one
 * CC0 recording, the penguin call (`penguin-honk.wav`, credited in CREDITS.md), which the
 * engine fetches when Sound is turned on.
 *
 * Each sound has its own gain (the recipe's "gain") into the engine's master (0.2, then a
 * compressor), the chain the recipes were measured through. The slide into place is played in
 * two parts (the whoosh, then the call) so each can land on its moment of the slide.
 */

export type PenguinVoice =
  | 'penguin-tap'
  | 'penguin-swish'
  | 'penguin-whoosh'
  | 'penguin-call'
  | 'penguin-call-short'
  | 'penguin-finale'

/** Each sound's own gain, from the recipes (the slide's whoosh and call share theirs). */
export const PENGUIN_GAINS: Readonly<Record<PenguinVoice, number>> = {
  'penguin-tap': 2.8,
  'penguin-swish': 1.65,
  'penguin-whoosh': 4.05,
  'penguin-call': 4.05,
  'penguin-call-short': 1.83,
  'penguin-finale': 1.43,
}

/** The recorded call's length, in ms (0.464 s at its natural speed). */
export const CALL_MS = 464

/** How long each lasts, in ms (its last part's end). */
export const PENGUIN_VOICE_MS: Readonly<Record<PenguinVoice, number>> = {
  'penguin-tap': 90,
  'penguin-swish': 180,
  'penguin-whoosh': 900,
  'penguin-call': CALL_MS,
  'penguin-call-short': 200,
  'penguin-finale': 850,
}

/** The two calls: how fast the recording plays, how loud, and (the short one) where it stops. */
export const CALLS = {
  'penguin-call': { rate: 1, level: 0.3, cut: Infinity },
  'penguin-call-short': { rate: 1.25, level: 0.34, cut: 0.2 },
} as const

/** The finale's run of chirps: frequency (Hz) and start (s). */
export const CHIRPS: readonly (readonly [number, number])[] = [
  [1047, 0],
  [1175, 0.07],
  [1319, 0.14],
  [1568, 0.21],
  [1760, 0.28],
  [2093, 0.35],
]

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

/** Builds one sound's nodes (the spec's building blocks); every source it starts is listed. */
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

  /** A nasal bray: two sawtooths through band-passes, the first with a tremolo. */
  honk(at: number, f: number, length: number, level: number): void {
    this.tone({
      type: 'sawtooth',
      from: f,
      to: 0.88 * f,
      at,
      length,
      level,
      attack: 0.015,
      filter: { type: 'bandpass', frequency: 2.3 * f, q: 2.5 },
      tremolo: { rate: 24, depth: 0.55 },
      sustain: true,
    })
    this.tone({
      type: 'sawtooth',
      from: 1.5 * f,
      to: 1.35 * f,
      at,
      length: length * 0.9,
      level: level * 0.35,
      attack: 0.015,
      filter: { type: 'bandpass', frequency: 3.2 * f, q: 3 },
      sustain: true,
    })
  }

  /** The recorded call at `rate`, held at `level` and dropped linearly to 0 over its last
   * 20 ms; it ends at `at + min(cut, duration / rate)`. Returns that end (context seconds). */
  call(recording: AudioBuffer, at: number, rate: number, level: number, cut = Infinity): number {
    const start = this.t + at
    const end = start + Math.min(cut, recording.duration / rate)
    const source = this.context.createBufferSource()
    source.buffer = recording
    source.playbackRate.value = rate
    const env = this.context.createGain()
    env.gain.setValueAtTime(level, start)
    env.gain.setValueAtTime(level, Math.max(start, end - 0.02))
    env.gain.linearRampToValueAtTime(0, end)
    source.connect(env)
    env.connect(this.out)
    source.start(start)
    source.stop(end)
    this.sources.push(source)
    return end
  }

  private run(source: AudioScheduledSourceNode, start: number, end: number) {
    source.start(start)
    source.stop(end + 0.02)
    this.sources.push(source)
  }
}

/** The recipes. Times are seconds from the sound's start. Returns when the sound ends. */
function build(
  voice: PenguinVoice,
  p: Patch,
  when: number,
  recording: AudioBuffer | null,
  cutMs?: number,
): number {
  switch (voice) {
    // Tap: a glassy plink, at every comparison.
    case 'penguin-tap':
      p.tone({ type: 'sine', from: 1760, at: 0, length: 0.09, level: 0.4 })
      p.tone({ type: 'sine', from: 2637, at: 0, length: 0.07, level: 0.25 })
      return when + 0.09
    // Swish: a skate scrape, as a bigger tower shifts right.
    case 'penguin-swish':
      p.noise({
        at: 0,
        length: 0.18,
        level: 0.9,
        filter: { type: 'highpass', frequency: 3000 },
        attack: 0.02,
        tremolo: { rate: 40, depth: 0.5 },
      })
      p.noise({ at: 0, length: 0.1, level: 0.4, filter: { type: 'bandpass', frequency: 900 } })
      return when + 0.18
    // The slide into place, part 1: the whoosh.
    case 'penguin-whoosh':
      p.noise({
        at: 0,
        length: 0.9,
        level: 1.4,
        filter: { type: 'bandpass', frequency: 400, to: 2500, q: 1.5 },
        attack: 0.15,
      })
      return when + 0.9
    // The slide into place, part 2, and already in place (short and higher): the call.
    case 'penguin-call':
    case 'penguin-call-short': {
      if (!recording) return when
      const { rate, level, cut } = CALLS[voice]
      return p.call(recording, 0, rate, level, Math.min(cut, (cutMs ?? Infinity) / 1000))
    }
    // Finale: a chirpy run up, ending in a honk.
    case 'penguin-finale':
      for (const [frequency, at] of CHIRPS) {
        p.tone({
          type: 'square',
          from: frequency,
          at,
          length: 0.06,
          level: 0.4,
          filter: { type: 'lowpass', frequency: 3500 },
          sustain: true,
        })
      }
      p.honk(0.5, 520, 0.35, 0.9)
      return when + 0.85
  }
}

export interface PenguinSound {
  /** The sound's own gain node (its level is the recipe's gain). */
  readonly gain: GainNode
  readonly sources: readonly AudioScheduledSourceNode[]
  /** When it stops sounding (context seconds). */
  readonly end: number
}

/**
 * Schedules one penguin sound at `when` (context seconds) into `out`. The calls need the
 * recording: without it there is nothing to play (null). `cutMs`, if given, ends the sound
 * early: a call stops there with its own 20 ms fade; anything else fades in `fadeMs` (the
 * whoosh, cut where the call starts).
 */
export function playPenguinVoice(
  context: BaseAudioContext,
  out: AudioNode,
  voice: PenguinVoice,
  when: number,
  options: {
    readonly recording: AudioBuffer | null
    readonly cutMs?: number
    readonly fadeMs?: number
  },
): PenguinSound | null {
  const isCall = voice === 'penguin-call' || voice === 'penguin-call-short'
  if (isCall && !options.recording) return null
  const gain = context.createGain()
  gain.gain.value = PENGUIN_GAINS[voice]
  gain.connect(out)
  const patch = new Patch(context, gain, when)
  let end = build(voice, patch, when, options.recording, options.cutMs)
  const { cutMs, fadeMs = 12 } = options
  if (!isCall && cutMs !== undefined && cutMs < PENGUIN_VOICE_MS[voice]) {
    end = when + cutMs / 1000
    gain.gain.setValueAtTime(PENGUIN_GAINS[voice], Math.max(when, end - fadeMs / 1000))
    gain.gain.linearRampToValueAtTime(0, end)
  }
  return { gain, sources: patch.sources, end }
}

export function isPenguinVoice(voice: string): voice is PenguinVoice {
  return voice in PENGUIN_GAINS
}
