/**
 * TEMPORARY (design/penguins, never merged): the penguins' candidate sounds, made in code with
 * Web Audio ($0, nothing to license). Nothing is created until a button is tapped. The chain
 * matches src/sound/engine.ts: each sound's gain, then a master of 0.2, then a compressor.
 *
 * The rule: frequent events soft (the tap at a comparison, the swish of a shift), the special
 * moment the penguins' own (the slide into place: a whoosh, then a honk), the finale a
 * celebration. Three versions of each, to compare by ear.
 *
 * The honks also have a fourth version (V4) from a CC0 recording: AntumDeluge's "Penguin Sounds"
 * (OpenGameArt, CC0), cut from Bidone's recording at Leipzig Zoo (Freesound 66150, CC0). It is
 * fetched only when tapped.
 */
import honkUrl from './penguin-honk.wav'

const honkFor = new WeakMap<BaseAudioContext, Promise<AudioBuffer>>()

/** The recorded honk, decoded for this context (fetched once). */
export function recordedHonk(context: BaseAudioContext): Promise<AudioBuffer> {
  let decoded = honkFor.get(context)
  if (!decoded) {
    decoded = fetch(honkUrl)
      .then((response) => response.arrayBuffer())
      .then((data) => context.decodeAudioData(data))
    honkFor.set(context, decoded)
  }
  return decoded
}

/** Plays the recorded honk at `at`, at `rate` (1 = as recorded), cut to `length` seconds. */
function sampleHonk(o: Out, at: number, rate: number, level: number, length?: number) {
  void recordedHonk(o.context).then((buffer) => {
    const source = o.context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = rate
    const gain = o.context.createGain()
    const end = at + Math.min(length ?? Infinity, buffer.duration / rate)
    gain.gain.setValueAtTime(level, at)
    gain.gain.setValueAtTime(level, Math.max(at, end - 0.02))
    gain.gain.linearRampToValueAtTime(0, end)
    source.connect(gain)
    gain.connect(o.out)
    source.start(at)
    source.stop(end + 0.02)
  })
}

export type PenguinSound = 'tap' | 'swish' | 'slide' | 'inplace' | 'finale'
export type VariantId = 'v1' | 'v2' | 'v3' | 'v4'

interface Out {
  readonly context: BaseAudioContext
  readonly out: AudioNode
}

export interface Variant {
  readonly id: VariantId
  readonly label: string
  readonly summary: string
  /** This version's own gain (versions of one sound about equally loud). */
  readonly gain: number
  readonly play: (o: Out, at: number) => void
}

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

function shaped(o: Out, input: AudioNode, filter: Filter | undefined, at: number, length: number) {
  if (!filter) return input
  const node = o.context.createBiquadFilter()
  node.type = filter.type
  node.Q.value = filter.q ?? 0.7
  node.frequency.setValueAtTime(filter.frequency, at)
  if (filter.to !== undefined) node.frequency.exponentialRampToValueAtTime(filter.to, at + length)
  input.connect(node)
  return node
}

function envelope(
  o: Out,
  at: number,
  length: number,
  level: number,
  attack: number,
  sustain: boolean,
) {
  const env = o.context.createGain()
  const end = at + length
  env.gain.setValueAtTime(0, at)
  env.gain.linearRampToValueAtTime(level, at + attack)
  if (sustain) {
    env.gain.setValueAtTime(level, Math.max(at + attack, end - 0.02))
    env.gain.linearRampToValueAtTime(0, end)
  } else {
    env.gain.exponentialRampToValueAtTime(0.001, end)
  }
  env.connect(o.out)
  return env
}

function lfo(o: Out, rate: number, depth: number, target: AudioParam, at: number, end: number) {
  const osc = o.context.createOscillator()
  osc.frequency.value = rate
  const gain = o.context.createGain()
  gain.gain.value = depth
  osc.connect(gain)
  gain.connect(target)
  osc.start(at)
  osc.stop(end + 0.02)
}

function tone(o: Out, t: ToneOptions) {
  const end = t.at + t.length
  const osc = o.context.createOscillator()
  osc.type = t.type
  osc.frequency.setValueAtTime(t.from, t.at)
  if (t.to !== undefined) osc.frequency.exponentialRampToValueAtTime(t.to, end)
  if (t.vibrato) lfo(o, t.vibrato.rate, t.vibrato.depth, osc.frequency, t.at, end)
  let node: AudioNode = shaped(o, osc, t.filter, t.at, t.length)
  if (t.tremolo) {
    const trem = o.context.createGain()
    trem.gain.value = 1 - t.tremolo.depth / 2
    lfo(o, t.tremolo.rate, t.tremolo.depth / 2, trem.gain, t.at, end)
    node.connect(trem)
    node = trem
  }
  node.connect(envelope(o, t.at, t.length, t.level, t.attack ?? 0.005, t.sustain ?? false))
  osc.start(t.at)
  osc.stop(end + 0.02)
}

function noise(
  o: Out,
  at: number,
  length: number,
  level: number,
  filter: Filter,
  attack = 0.002,
  tremolo?: { rate: number; depth: number },
) {
  const rate = o.context.sampleRate
  const buffer = o.context.createBuffer(1, Math.ceil((length + 0.03) * rate), rate)
  const data = buffer.getChannelData(0)
  for (let k = 0; k < data.length; k++) data[k] = Math.random() * 2 - 1
  const source = o.context.createBufferSource()
  source.buffer = buffer
  let node: AudioNode = shaped(o, source, filter, at, length)
  if (tremolo) {
    const trem = o.context.createGain()
    trem.gain.value = 1 - tremolo.depth / 2
    lfo(o, tremolo.rate, tremolo.depth / 2, trem.gain, at, at + length)
    node.connect(trem)
    node = trem
  }
  node.connect(envelope(o, at, length, level, attack, false))
  source.start(at)
  source.stop(at + length + 0.02)
}

/** A penguin honk: a nasal sawtooth bray through a formant, raspy with a fast tremolo. */
function honk(o: Out, at: number, f: number, length: number, level: number) {
  tone(o, {
    type: 'sawtooth',
    from: f,
    to: f * 0.88,
    at,
    length,
    level,
    attack: 0.015,
    filter: { type: 'bandpass', frequency: f * 2.3, q: 2.5 },
    tremolo: { rate: 24, depth: 0.55 },
    sustain: true,
  })
  tone(o, {
    type: 'sawtooth',
    from: f * 1.5,
    to: f * 1.35,
    at,
    length: length * 0.9,
    level: level * 0.35,
    attack: 0.015,
    filter: { type: 'bandpass', frequency: f * 3.2, q: 3 },
    sustain: true,
  })
}

export const SOUND_VARIANTS: Readonly<Record<PenguinSound, readonly Variant[]>> = {
  tap: [
    {
      id: 'v1',
      label: 'V1',
      summary: 'An ice tick: a tiny high ping with a click.',
      gain: 2.1,
      play: (o, t) => {
        tone(o, { type: 'sine', from: 2600, at: t, length: 0.05, level: 0.5 })
        noise(o, t, 0.02, 0.6, { type: 'highpass', frequency: 6000 })
      },
    },
    {
      id: 'v2',
      label: 'V2',
      summary: 'A soft knock on ice: low and woody.',
      gain: 2.2,
      play: (o, t) => {
        tone(o, { type: 'triangle', from: 700, to: 560, at: t, length: 0.07, level: 0.7 })
        noise(o, t, 0.04, 0.5, { type: 'bandpass', frequency: 1500, q: 3 })
      },
    },
    {
      id: 'v3',
      label: 'V3',
      summary: 'A glassy plink, two notes at once.',
      gain: 2.8,
      play: (o, t) => {
        tone(o, { type: 'sine', from: 1760, at: t, length: 0.09, level: 0.4 })
        tone(o, { type: 'sine', from: 2637, at: t, length: 0.07, level: 0.25 })
      },
    },
  ],
  swish: [
    {
      id: 'v1',
      label: 'V1',
      summary: 'A quick swish, rising.',
      gain: 4.2,
      play: (o, t) => {
        noise(o, t, 0.2, 1, { type: 'bandpass', frequency: 1500, to: 3500, q: 2 }, 0.03)
      },
    },
    {
      id: 'v2',
      label: 'V2',
      summary: 'A soft glide, falling, with a faint hum.',
      gain: 1.6,
      play: (o, t) => {
        noise(o, t, 0.25, 1.2, { type: 'lowpass', frequency: 2500, to: 900 }, 0.05)
        tone(o, { type: 'sine', from: 500, to: 400, at: t, length: 0.2, level: 0.1 })
      },
    },
    {
      id: 'v3',
      label: 'V3',
      summary: 'A skate scrape: a fluttering hiss.',
      gain: 1.65,
      play: (o, t) => {
        noise(o, t, 0.18, 0.9, { type: 'highpass', frequency: 3000 }, 0.02, {
          rate: 40,
          depth: 0.5,
        })
        noise(o, t, 0.1, 0.4, { type: 'bandpass', frequency: 900 })
      },
    },
  ],
  slide: [
    {
      id: 'v1',
      label: 'V1',
      summary: 'A long whoosh on the ice, then a happy honk.',
      gain: 4.05,
      play: (o, t) => {
        noise(o, t, 0.9, 1.4, { type: 'bandpass', frequency: 400, to: 2500, q: 1.5 }, 0.15)
        honk(o, t + 0.95, 470, 0.26, 0.9)
      },
    },
    {
      id: 'v2',
      label: 'V2',
      summary: 'A slide whistle going down, then a honk.',
      gain: 1.2,
      play: (o, t) => {
        tone(o, {
          type: 'triangle',
          from: 1200,
          to: 500,
          at: t,
          length: 0.8,
          level: 0.5,
          vibrato: { rate: 6, depth: 15 },
          sustain: true,
        })
        noise(o, t, 0.8, 0.6, { type: 'lowpass', frequency: 3000 }, 0.1)
        honk(o, t + 0.85, 470, 0.26, 0.9)
      },
    },
    {
      id: 'v3',
      label: 'V3',
      summary: 'An icy shimmer, then a double honk.',
      gain: 3.65,
      play: (o, t) => {
        noise(o, t, 0.7, 1, { type: 'bandpass', frequency: 3000, to: 6000, q: 3 }, 0.1)
        tone(o, {
          type: 'sine',
          from: 2200,
          to: 1800,
          at: t,
          length: 0.7,
          level: 0.15,
          tremolo: { rate: 18, depth: 0.6 },
        })
        honk(o, t + 0.75, 520, 0.14, 0.85)
        honk(o, t + 0.95, 440, 0.22, 0.9)
      },
    },
    {
      id: 'v4',
      label: 'V4 (CC0 honk)',
      summary: 'V1’s whoosh, then a real penguin’s call (a CC0 recording).',
      gain: 4.05,
      play: (o, t) => {
        noise(o, t, 0.9, 1.4, { type: 'bandpass', frequency: 400, to: 2500, q: 1.5 }, 0.15)
        sampleHonk(o, t + 0.9, 1, 0.3)
      },
    },
  ],
  inplace: [
    {
      id: 'v1',
      label: 'V1',
      summary: 'One short honk: “here I am”.',
      gain: 1.83,
      play: (o, t) => {
        honk(o, t, 620, 0.12, 0.8)
      },
    },
    {
      id: 'v2',
      label: 'V2',
      summary: 'A little rising chirp.',
      gain: 0.67,
      play: (o, t) => {
        tone(o, {
          type: 'square',
          from: 900,
          to: 1300,
          at: t,
          length: 0.08,
          level: 0.5,
          filter: { type: 'lowpass', frequency: 2500 },
          sustain: true,
        })
      },
    },
    {
      id: 'v3',
      label: 'V3',
      summary: 'Two tiny honks.',
      gain: 1.8,
      play: (o, t) => {
        honk(o, t, 640, 0.07, 0.8)
        honk(o, t + 0.11, 700, 0.08, 0.8)
      },
    },
    {
      id: 'v4',
      label: 'V4 (CC0 honk)',
      summary: 'The real penguin’s call, short and a little higher (a CC0 recording).',
      gain: 1.83,
      play: (o, t) => {
        sampleHonk(o, t, 1.25, 0.34, 0.2)
      },
    },
  ],
  finale: [
    {
      id: 'v1',
      label: 'V1',
      summary: 'Honks climbing up, then a long one.',
      gain: 2.6,
      play: (o, t) => {
        ;[262, 330, 392, 523].forEach((f, k) => {
          honk(o, t + k * 0.13, f * 1.2, 0.1, 0.8)
        })
        honk(o, t + 0.56, 523 * 1.2, 0.4, 0.9)
      },
    },
    {
      id: 'v2',
      label: 'V2',
      summary: 'Flipper claps, then honks together.',
      gain: 2.8,
      play: (o, t) => {
        for (let k = 0; k < 6; k++)
          noise(o, t + k * 0.09, 0.03, 1.4, { type: 'bandpass', frequency: 2000, q: 1.5 })
        honk(o, t + 0.6, 392, 0.35, 0.7)
        honk(o, t + 0.6, 523, 0.35, 0.5)
      },
    },
    {
      id: 'v3',
      label: 'V3',
      summary: 'A chirpy run up, ending in a honk.',
      gain: 1.43,
      play: (o, t) => {
        ;[1047, 1175, 1319, 1568, 1760, 2093].forEach((f, k) => {
          tone(o, {
            type: 'square',
            from: f,
            at: t + k * 0.07,
            length: 0.06,
            level: 0.4,
            filter: { type: 'lowpass', frequency: 3500 },
            sustain: true,
          })
        })
        honk(o, t + 0.5, 520, 0.35, 0.9)
      },
    },
  ],
}

let context: AudioContext | null = null
let master: GainNode | null = null

/** The page's audio chain, made on the first tap. */
function chain(): { context: AudioContext; master: GainNode } {
  if (!context || !master) {
    context = new AudioContext()
    const compressor = context.createDynamicsCompressor()
    master = context.createGain()
    master.gain.value = 0.2
    master.connect(compressor)
    compressor.connect(context.destination)
  }
  void context.resume()
  return { context, master }
}

export function find(sound: PenguinSound, id: VariantId): Variant | undefined {
  return SOUND_VARIANTS[sound].find((variant) => variant.id === id)
}

/** Plays one version through its own gain into the chain (or into `into`, for measuring). */
export function start(
  variant: Variant,
  at: number,
  into?: { context: BaseAudioContext; out: AudioNode },
) {
  const c =
    into ??
    (() => {
      const made = chain()
      return { context: made.context, out: made.master }
    })()
  const gain = c.context.createGain()
  gain.gain.value = variant.gain
  gain.connect(c.out)
  variant.play({ context: c.context, out: gain }, c.context.currentTime + at)
}

export function playPenguinSound(sound: PenguinSound, id: VariantId): void {
  const variant = find(sound, id)
  if (variant) start(variant, 0.02)
}

/** A round: tap, swish, tap, swish, tap, the slide into place; then an "already in place". */
export function playRound(choice: Readonly<Record<PenguinSound, VariantId>>): void {
  const tap = find('tap', choice.tap)
  const swish = find('swish', choice.swish)
  const slide = find('slide', choice.slide)
  const inplace = find('inplace', choice.inplace)
  if (!tap || !swish || !slide || !inplace) return
  start(tap, 0.02)
  start(swish, 0.4)
  start(tap, 0.82)
  start(swish, 1.2)
  start(tap, 1.62)
  start(slide, 2.0)
  start(tap, 3.6)
  start(inplace, 3.9)
}
