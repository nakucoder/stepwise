/**
 * Scout and Crane's sounds (selection sort's robots), rebuilt exactly from the recipes in
 * design/mockups/robot/README.md ("Sounds"). All made in code: nothing to license or credit.
 *
 * Each sound has its own gain (the recipe's "gain") into the engine's master (0.2, then a
 * compressor), the chain the recipes were measured through. The claw is played in three parts
 * (whine, clank, whirr) so each can land on its moment of the carry.
 */

export type RobotVoice =
  'robot-scan' | 'robot-lock' | 'claw-whine' | 'claw-clank' | 'claw-whirr' | 'robot-finale'

/** Each sound's own gain, from the recipes. */
export const ROBOT_GAINS: Readonly<Record<RobotVoice, number>> = {
  'robot-scan': 2.3,
  'robot-lock': 0.82,
  'claw-whine': 0.8,
  'claw-clank': 0.8,
  'claw-whirr': 0.8,
  'robot-finale': 1.1,
}

/** How long each lasts, in ms (its last part's end). */
export const ROBOT_VOICE_MS: Readonly<Record<RobotVoice, number>> = {
  'robot-scan': 130,
  'robot-lock': 330,
  'claw-whine': 260,
  // Clank 1 at 0, clank 2 and the latch at 30 ms; clank 2 rings for 250 ms.
  'claw-clank': 280,
  'claw-whirr': 280,
  'robot-finale': 1140,
}

/** Within the claw recipe: when the clank part's loud clank (clank 2) lands. */
export const CLANK_HIT_MS = 30
/** Within the claw recipe: the parts' starts, as the recipe plays them back to back. */
export const CLAW_PART_AT_MS = { 'claw-whine': 0, 'claw-clank': 280, 'claw-whirr': 460 } as const

const C5 = 523.25
const E5 = 659.25
const G5 = 783.99
const C6 = 1046.5
const E6 = 1318.51
const G6 = 1567.98
const C7 = 2093

interface Filter {
  readonly type: BiquadFilterType
  readonly frequency: number
  readonly to?: number
  readonly q?: number
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
  readonly vibrato?: { readonly rate: number; readonly depth: number }
  readonly tremolo?: { readonly rate: number; readonly depth: number }
  readonly sustain?: boolean
}

/** Builds one sound's nodes; every source it starts is listed so it can be stopped. */
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
    if (o.vibrato) {
      const lfo = this.context.createOscillator()
      lfo.frequency.value = o.vibrato.rate
      const depth = this.context.createGain()
      depth.gain.value = o.vibrato.depth
      lfo.connect(depth)
      depth.connect(osc.frequency)
      this.run(lfo, start, end)
    }
    if (o.tremolo) {
      const tremolo = this.context.createGain()
      tremolo.gain.value = 1 - o.tremolo.depth / 2
      const lfo = this.context.createOscillator()
      lfo.frequency.value = o.tremolo.rate
      const depth = this.context.createGain()
      depth.gain.value = o.tremolo.depth / 2
      lfo.connect(depth)
      depth.connect(tremolo.gain)
      node.connect(tremolo)
      node = tremolo
      this.run(lfo, start, end)
    }
    node.connect(this.envelope(o.at, o.length, o.level, o.attack ?? 0.005, o.sustain ?? false))
    this.run(osc, start, end)
  }

  noise(at: number, length: number, level: number, filter: Filter, attack = 0.002): void {
    const start = this.t + at
    const rate = this.context.sampleRate
    const buffer = this.context.createBuffer(1, Math.ceil((length + 0.03) * rate), rate)
    const data = buffer.getChannelData(0)
    for (let k = 0; k < data.length; k++) data[k] = Math.random() * 2 - 1
    const source = this.context.createBufferSource()
    source.buffer = buffer
    const shaped = this.filter(filter, at, length)
    source.connect(shaped)
    shaped.connect(this.envelope(at, length, level, attack, false))
    this.run(source, start, start + length)
  }

  metal(at: number, base: number, level: number, length: number, ratios: readonly number[]): void {
    ratios.forEach((ratio, k) => {
      this.tone({
        type: 'sine',
        from: base * ratio,
        at,
        attack: 0.001,
        length: length / (1 + 0.45 * k),
        level: level / (1 + 0.55 * k),
      })
    })
  }

  click(at: number, level: number, frequency: number): void {
    this.noise(at, 0.012, level, { type: 'bandpass', frequency, q: 1.2 })
  }

  private run(source: AudioScheduledSourceNode, start: number, end: number) {
    source.start(start)
    source.stop(end + 0.02)
    this.sources.push(source)
  }
}

const CLANK_RATIOS = [1, 2.4, 3.8] as const

/** The recipes. Times are seconds from the sound's start. */
function build(voice: RobotVoice, p: Patch): void {
  switch (voice) {
    // Scan: a scanner-light swipe.
    case 'robot-scan':
      p.noise(0, 0.13, 2.2, { type: 'bandpass', frequency: 700, to: 5200, q: 6 }, 0.02)
      p.tone({ type: 'sine', from: 900, to: 2300, at: 0, length: 0.12, level: 0.35, attack: 0.02 })
      return
    // Lock-on: three bips, then a steady trembling tone ("target acquired").
    case 'robot-lock':
      ;[C6, E6, G6].forEach((frequency, k) => {
        p.tone({
          type: 'square',
          from: frequency,
          at: k * 0.04,
          length: 0.028,
          level: 0.45,
          filter: { type: 'lowpass', frequency: 4000 },
          sustain: true,
        })
      })
      p.tone({
        type: 'triangle',
        from: C7,
        at: 0.13,
        length: 0.2,
        level: 0.8,
        tremolo: { rate: 18, depth: 0.6 },
        sustain: true,
      })
      return
    // The claw: a quick zippy whine...
    case 'claw-whine':
      p.tone({
        type: 'square',
        from: 330,
        to: 680,
        at: 0,
        length: 0.26,
        level: 0.6,
        attack: 0.01,
        filter: { type: 'lowpass', frequency: 1500 },
        vibrato: { rate: 14, depth: 10 },
        sustain: true,
      })
      return
    // ...a bright double "cla-CLANK" with the latch's click (recipe 0.28 and 0.31 s)...
    case 'claw-clank':
      p.metal(0, 880, 0.55, 0.12, CLANK_RATIOS)
      p.metal(0.03, 900, 0.9, 0.25, CLANK_RATIOS)
      p.click(0.03, 1.4, 4200)
      return
    // ...then a rising whirr (recipe 0.46 s).
    case 'claw-whirr':
      p.tone({
        type: 'sine',
        from: 240,
        to: 520,
        at: 0,
        length: 0.28,
        level: 0.8,
        attack: 0.02,
        tremolo: { rate: 32, depth: 0.6 },
        sustain: true,
      })
      return
    // Finale: a happy robot. An arpeggio, three bleep-bloops, then "bee-DOO!".
    case 'robot-finale':
      ;[C5, E5, G5, C6, E6].forEach((frequency, k) => {
        p.tone({
          type: 'square',
          from: frequency,
          at: k * 0.06,
          length: 0.055,
          level: 0.4,
          filter: { type: 'lowpass', frequency: 3200 },
          sustain: true,
        })
      })
      ;(
        [
          [1200, 1700, 0.36],
          [1500, 950, 0.45],
          [1000, 1450, 0.54],
        ] as const
      ).forEach(([from, to, at]) => {
        p.tone({ type: 'triangle', from, to, at, length: 0.07, level: 0.7, sustain: true })
      })
      p.tone({
        type: 'square',
        from: G6,
        at: 0.7,
        length: 0.09,
        level: 0.4,
        filter: { type: 'lowpass', frequency: 3200 },
        sustain: true,
      })
      p.tone({
        type: 'square',
        from: C6,
        to: G6,
        at: 0.82,
        length: 0.32,
        level: 0.42,
        filter: { type: 'lowpass', frequency: 2600 },
        tremolo: { rate: 12, depth: 0.4 },
        sustain: true,
      })
      return
  }
}

export interface RobotSound {
  /** The sound's own gain node (its level is the recipe's gain). */
  readonly gain: GainNode
  readonly sources: readonly AudioScheduledSourceNode[]
}

/**
 * Schedules one robot sound at `when` (context seconds) into `out`. `cutMs`, if given, ends it
 * early with a quick fade (the whine, when the clank comes sooner at a faster speed).
 */
export function playRobotVoice(
  context: BaseAudioContext,
  out: AudioNode,
  voice: RobotVoice,
  when: number,
  cutMs?: number,
  fadeMs = 12,
): RobotSound {
  const gain = context.createGain()
  gain.gain.value = ROBOT_GAINS[voice]
  gain.connect(out)
  const patch = new Patch(context, gain, when)
  build(voice, patch)
  if (cutMs !== undefined && cutMs < ROBOT_VOICE_MS[voice]) {
    const end = when + cutMs / 1000
    gain.gain.setValueAtTime(ROBOT_GAINS[voice], Math.max(when, end - fadeMs / 1000))
    gain.gain.linearRampToValueAtTime(0, end)
  }
  return { gain, sources: patch.sources }
}

export function isRobotVoice(voice: string): voice is RobotVoice {
  return voice in ROBOT_GAINS
}
