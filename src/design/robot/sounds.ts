/**
 * TEMPORARY (design/robot, never merged): the robot's candidate sounds, made in code with Web
 * Audio (no recordings, nothing to license, $0). Nothing is created until a button is tapped,
 * so the page is silent until then. The master level matches src/sound/engine.ts (0.2, then a
 * compressor).
 *
 * The rule from the ducks: frequent events soft (scan), the special moment the robot's own
 * sound (lock-on, the claw), the finale a celebration. Each sound has the first version ("Old")
 * and three new ones to compare.
 */

export type RobotSound = 'scan' | 'lock' | 'claw' | 'finale'
export type VariantId = 'old' | 'v1' | 'v2' | 'v3'

interface Out {
  readonly context: BaseAudioContext
  /** Where a sound connects: a gain node per sound, set to that version's level. */
  readonly out: AudioNode
}

export interface Variant {
  readonly id: VariantId
  readonly label: string
  /** One line: what it sounds like. */
  readonly summary: string
  /** Overall level of this version (so the versions of one sound are about equally loud). */
  readonly gain: number
  readonly play: (o: Out, at: number) => void
}

// ---------- Building blocks ----------

interface Filter {
  readonly type: BiquadFilterType
  readonly frequency: number
  /** Sweep the filter to this frequency over the note. */
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
  /** Wobble the pitch: rate in Hz, depth in Hz. */
  readonly vibrato?: { readonly rate: number; readonly depth: number }
  /** Wobble the volume (a buzz or a flutter): rate in Hz, depth 0–1. */
  readonly tremolo?: { readonly rate: number; readonly depth: number }
  /** Hold the level, then fade quickly at the end (instead of decaying all the way). */
  readonly sustain?: boolean
}

function filtered(
  o: Out,
  input: AudioNode,
  filter: Filter | undefined,
  when: number,
  end: number,
): AudioNode {
  if (!filter) return input
  const node = o.context.createBiquadFilter()
  node.type = filter.type
  node.frequency.setValueAtTime(filter.frequency, when)
  if (filter.to !== undefined) node.frequency.exponentialRampToValueAtTime(filter.to, end)
  node.Q.value = filter.q ?? 0.7
  input.connect(node)
  return node
}

function envelope(
  o: Out,
  input: AudioNode,
  when: number,
  end: number,
  level: number,
  attack: number,
  sustain: boolean,
): AudioNode {
  const gain = o.context.createGain()
  gain.gain.setValueAtTime(0, when)
  gain.gain.linearRampToValueAtTime(level, when + attack)
  if (sustain) {
    gain.gain.setValueAtTime(level, Math.max(when + attack, end - 0.02))
    gain.gain.linearRampToValueAtTime(0, end)
  } else {
    gain.gain.exponentialRampToValueAtTime(0.001, end)
  }
  input.connect(gain)
  return gain
}

function wobble(
  o: Out,
  input: AudioNode,
  options: ToneOptions['tremolo'],
  when: number,
  end: number,
): AudioNode {
  if (!options) return input
  const c = o.context
  const node = c.createGain()
  node.gain.value = 1 - options.depth / 2
  const lfo = c.createOscillator()
  lfo.frequency.value = options.rate
  const depth = c.createGain()
  depth.gain.value = options.depth / 2
  lfo.connect(depth)
  depth.connect(node.gain)
  lfo.start(when)
  lfo.stop(end + 0.02)
  input.connect(node)
  return node
}

function tone(o: Out, options: ToneOptions): void {
  const c = o.context
  const when = c.currentTime + options.at
  const end = when + options.length
  const oscillator = c.createOscillator()
  oscillator.type = options.type
  oscillator.frequency.setValueAtTime(options.from, when)
  if (options.to !== undefined) oscillator.frequency.exponentialRampToValueAtTime(options.to, end)
  if (options.vibrato) {
    const lfo = c.createOscillator()
    lfo.frequency.value = options.vibrato.rate
    const depth = c.createGain()
    depth.gain.value = options.vibrato.depth
    lfo.connect(depth)
    depth.connect(oscillator.frequency)
    lfo.start(when)
    lfo.stop(end + 0.02)
  }
  let node = filtered(o, oscillator, options.filter, when, end)
  node = wobble(o, node, options.tremolo, when, end)
  node = envelope(
    o,
    node,
    when,
    end,
    options.level,
    options.attack ?? 0.005,
    options.sustain ?? false,
  )
  node.connect(o.out)
  oscillator.start(when)
  oscillator.stop(end + 0.02)
}

/** A burst of noise (made in code), shaped by a filter. */
function noise(
  o: Out,
  options: {
    readonly at: number
    readonly length: number
    readonly level: number
    readonly filter: Filter
    readonly attack?: number
  },
): void {
  const c = o.context
  const when = c.currentTime + options.at
  const end = when + options.length
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * (options.length + 0.03)), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let k = 0; k < data.length; k++) data[k] = Math.random() * 2 - 1
  const source = c.createBufferSource()
  source.buffer = buffer
  const node = filtered(o, source, options.filter, when, end)
  envelope(o, node, when, end, options.level, options.attack ?? 0.002, false).connect(o.out)
  source.start(when)
}

/**
 * A struck piece of metal: a few partials at inharmonic ratios (like a bar or a plate, not a
 * string), each fading fast, the high ones fastest.
 */
function metal(
  o: Out,
  at: number,
  base: number,
  level: number,
  length: number,
  ratios: readonly number[] = [1, 2.36, 3.74, 5.2],
): void {
  ratios.forEach((ratio, k) => {
    tone(o, {
      type: 'sine',
      from: base * ratio,
      at,
      length: length / (1 + k * 0.45),
      level: level / (1 + k * 0.55),
      attack: 0.001,
    })
  })
}

/** A short, bright tick: the click of a latch or a relay. */
function click(o: Out, at: number, level: number, frequency = 3200): void {
  noise(o, { at, length: 0.012, level, filter: { type: 'bandpass', frequency, q: 1.2 } })
}

/** Note frequencies for the runs and jingles. */
const NOTE: Readonly<Record<string, number>> = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  C6: 1046.5,
  E6: 1318.51,
  G6: 1567.98,
  C7: 2093,
}
const n = (name: string) => NOTE[name] ?? 440

// ---------- The versions ----------

const SCAN: readonly Variant[] = [
  {
    id: 'old',
    label: 'Old',
    summary: 'A short, soft sine beep.',
    gain: 1,
    play: (o, at) => {
      tone(o, { type: 'sine', from: 880, at, length: 0.07, level: 1.3 })
    },
  },
  {
    id: 'v1',
    label: 'V1',
    summary: 'A buzzy sweep up ("zzwip"): a sawtooth gliding up through a fast buzz.',
    gain: 0.58,
    play: (o, at) => {
      tone(o, {
        type: 'sawtooth',
        from: 280,
        to: 1500,
        at,
        length: 0.15,
        level: 0.9,
        attack: 0.01,
        filter: { type: 'lowpass', frequency: 1200, to: 3200 },
        tremolo: { rate: 70, depth: 0.85 },
        sustain: true,
      })
    },
  },
  {
    id: 'v2',
    label: 'V2',
    summary: 'A shimmering sweep: two slightly detuned tones gliding up through a moving filter.',
    gain: 1.3,
    play: (o, at) => {
      for (const detune of [1, 1.012]) {
        tone(o, {
          type: 'square',
          from: 480 * detune,
          to: 1900 * detune,
          at,
          length: 0.17,
          level: 0.5,
          attack: 0.015,
          filter: { type: 'bandpass', frequency: 900, to: 3400, q: 3 },
          tremolo: { rate: 38, depth: 0.5 },
          sustain: true,
        })
      }
    },
  },
  {
    id: 'v3',
    label: 'V3',
    summary: 'A scanner-light swipe: a whoosh of noise sweeping up over a faint gliding tone.',
    gain: 2.3,
    play: (o, at) => {
      noise(o, {
        at,
        length: 0.13,
        level: 2.2,
        attack: 0.02,
        filter: { type: 'bandpass', frequency: 700, to: 5200, q: 6 },
      })
      tone(o, { type: 'sine', from: 900, to: 2300, at, length: 0.12, level: 0.35, attack: 0.02 })
    },
  },
]

const LOCK: readonly Variant[] = [
  {
    id: 'old',
    label: 'Old',
    summary: 'Two quick rising notes.',
    gain: 1,
    play: (o, at) => {
      tone(o, { type: 'triangle', from: 1175, at, length: 0.05, level: 0.85 })
      tone(o, { type: 'triangle', from: 1568, to: 1760, at: at + 0.055, length: 0.07, level: 0.85 })
    },
  },
  {
    id: 'v1',
    label: 'V1',
    summary: '"Bip-bip, beeeep": two quick bips that snap into a steady tone.',
    gain: 0.43,
    play: (o, at) => {
      for (const start of [0, 0.065]) {
        tone(o, {
          type: 'square',
          from: 1320,
          at: at + start,
          length: 0.035,
          level: 0.5,
          filter: { type: 'lowpass', frequency: 3500 },
          sustain: true,
        })
      }
      tone(o, {
        type: 'square',
        from: 1760,
        at: at + 0.13,
        length: 0.18,
        level: 0.45,
        filter: { type: 'lowpass', frequency: 3000 },
        sustain: true,
      })
      tone(o, { type: 'sine', from: 1760, at: at + 0.13, length: 0.18, level: 0.5, sustain: true })
    },
  },
  {
    id: 'v2',
    label: 'V2',
    summary: 'A fast rising chirp that lands with a click and a short ring.',
    gain: 1.15,
    play: (o, at) => {
      tone(o, { type: 'sine', from: 650, to: 2600, at, length: 0.085, level: 0.9, sustain: true })
      click(o, at + 0.085, 1.4, 3000)
      tone(o, { type: 'sine', from: 2600, at: at + 0.09, length: 0.12, level: 0.6, attack: 0.002 })
    },
  },
  {
    id: 'v3',
    label: 'V3',
    summary: 'Three bips climbing fast, then a steady pulsing "locked" tone.',
    gain: 0.82,
    play: (o, at) => {
      ;['C6', 'E6', 'G6'].forEach((note, k) => {
        tone(o, {
          type: 'square',
          from: n(note),
          at: at + k * 0.04,
          length: 0.028,
          level: 0.45,
          filter: { type: 'lowpass', frequency: 4000 },
          sustain: true,
        })
      })
      tone(o, {
        type: 'triangle',
        from: n('C7'),
        at: at + 0.13,
        length: 0.2,
        level: 0.8,
        tremolo: { rate: 18, depth: 0.6 },
        sustain: true,
      })
    },
  },
]

const CLAW: readonly Variant[] = [
  {
    id: 'old',
    label: 'Old',
    summary: 'A low buzz, then a dull thump.',
    gain: 1,
    play: (o, at) => {
      tone(o, {
        type: 'sawtooth',
        from: 160,
        to: 320,
        at,
        length: 0.32,
        level: 0.7,
        filter: { type: 'lowpass', frequency: 900 },
      })
      tone(o, {
        type: 'sawtooth',
        from: 320,
        to: 240,
        at: at + 0.34,
        length: 0.16,
        level: 0.6,
        filter: { type: 'lowpass', frequency: 900 },
      })
      tone(o, { type: 'sine', from: 110, to: 55, at: at + 0.52, length: 0.16, level: 0.9 })
      noise(o, {
        at: at + 0.52,
        length: 0.08,
        level: 0.6,
        filter: { type: 'lowpass', frequency: 700 },
      })
    },
  },
  {
    id: 'v1',
    label: 'V1',
    summary: 'Servo whine up, a ringing metal CLANK as it grips, then a motor whirr as it lifts.',
    gain: 1.0,
    play: (o, at) => {
      // The servo: a whine gliding up, with a little wobble.
      tone(o, {
        type: 'sawtooth',
        from: 260,
        to: 540,
        at,
        length: 0.3,
        level: 1.3,
        attack: 0.02,
        filter: { type: 'bandpass', frequency: 700, to: 1300, q: 4 },
        vibrato: { rate: 9, depth: 6 },
        sustain: true,
      })
      // The grip: a struck metal plate plus the latch's click.
      metal(o, at + 0.32, 620, 0.55, 0.32)
      click(o, at + 0.32, 1, 3600)
      // The lift: a motor's rippling whirr, rising a little.
      tone(o, {
        type: 'square',
        from: 170,
        to: 260,
        at: at + 0.5,
        length: 0.3,
        level: 1.1,
        attack: 0.03,
        filter: { type: 'lowpass', frequency: 1000 },
        tremolo: { rate: 28, depth: 0.7 },
        sustain: true,
      })
    },
  },
  {
    id: 'v2',
    label: 'V2',
    summary: 'A heavier hydraulic whine, a deep bell-like CLANG, then a low rumbling lift.',
    gain: 0.85,
    play: (o, at) => {
      tone(o, {
        type: 'triangle',
        from: 180,
        to: 380,
        at,
        length: 0.34,
        level: 0.9,
        attack: 0.03,
        vibrato: { rate: 12, depth: 5 },
        sustain: true,
      })
      tone(o, {
        type: 'sawtooth',
        from: 360,
        to: 760,
        at,
        length: 0.34,
        level: 0.35,
        attack: 0.03,
        filter: { type: 'lowpass', frequency: 1800 },
        sustain: true,
      })
      metal(o, at + 0.36, 420, 0.65, 0.45, [1, 1.41, 2.66, 3.9])
      click(o, at + 0.36, 1.4, 2400)
      noise(o, {
        at: at + 0.56,
        length: 0.3,
        level: 1.2,
        attack: 0.05,
        filter: { type: 'lowpass', frequency: 500 },
      })
      tone(o, {
        type: 'sawtooth',
        from: 110,
        to: 150,
        at: at + 0.56,
        length: 0.3,
        level: 0.5,
        attack: 0.05,
        filter: { type: 'lowpass', frequency: 600 },
        sustain: true,
      })
    },
  },
  {
    id: 'v3',
    label: 'V3',
    summary: 'A toy robot: a quick zippy whine, a bright double "cla-CLANK", a rising whirr.',
    gain: 0.8,
    play: (o, at) => {
      tone(o, {
        type: 'square',
        from: 330,
        to: 680,
        at,
        length: 0.26,
        level: 0.6,
        attack: 0.01,
        filter: { type: 'lowpass', frequency: 1500 },
        vibrato: { rate: 14, depth: 10 },
        sustain: true,
      })
      metal(o, at + 0.28, 880, 0.55, 0.12, [1, 2.4, 3.8])
      metal(o, at + 0.31, 900, 0.9, 0.25, [1, 2.4, 3.8])
      click(o, at + 0.31, 1.4, 4200)
      tone(o, {
        type: 'sine',
        from: 240,
        to: 520,
        at: at + 0.46,
        length: 0.28,
        level: 0.8,
        attack: 0.02,
        tremolo: { rate: 32, depth: 0.6 },
        sustain: true,
      })
    },
  },
]

const FINALE: readonly Variant[] = [
  {
    id: 'old',
    label: 'Old',
    summary: 'A rising run of beeps, then "beep-boop".',
    gain: 1,
    play: (o, at) => {
      ;[523.25, 587.33, 659.25, 783.99, 880, 1046.5].forEach((frequency, k) => {
        tone(o, {
          type: 'square',
          from: frequency,
          at: at + k * 0.09,
          length: 0.08,
          level: 0.45,
          filter: { type: 'lowpass', frequency: 2400 },
        })
      })
      tone(o, {
        type: 'square',
        from: 1568,
        at: at + 0.62,
        length: 0.1,
        level: 0.45,
        filter: { type: 'lowpass', frequency: 2400 },
      })
      tone(o, {
        type: 'square',
        from: 523.25,
        to: 784,
        at: at + 0.74,
        length: 0.22,
        level: 0.4,
        filter: { type: 'lowpass', frequency: 2000 },
      })
    },
  },
  {
    id: 'v1',
    label: 'V1',
    summary: 'A brighter run up, then a bouncy "beep-boop!" and a little sparkle.',
    gain: 1.14,
    play: (o, at) => {
      ;['C5', 'D5', 'E5', 'G5', 'A5', 'C6'].forEach((note, k) => {
        const start = at + k * 0.075
        tone(o, {
          type: 'square',
          from: n(note),
          at: start,
          length: 0.07,
          level: 0.4,
          filter: { type: 'lowpass', frequency: 3000 },
          sustain: true,
        })
        tone(o, {
          type: 'triangle',
          from: n(note) * 2,
          at: start,
          length: 0.07,
          level: 0.25,
          sustain: true,
        })
      })
      tone(o, {
        type: 'square',
        from: n('G6'),
        at: at + 0.52,
        length: 0.1,
        level: 0.4,
        filter: { type: 'lowpass', frequency: 3200 },
        sustain: true,
      })
      tone(o, {
        type: 'square',
        from: 520,
        to: 1046,
        at: at + 0.66,
        length: 0.26,
        level: 0.45,
        filter: { type: 'lowpass', frequency: 2400 },
        vibrato: { rate: 9, depth: 14 },
        sustain: true,
      })
      tone(o, {
        type: 'sine',
        from: n('C7'),
        at: at + 0.94,
        length: 0.3,
        level: 0.35,
        attack: 0.002,
      })
      tone(o, {
        type: 'sine',
        from: n('E6') * 2,
        at: at + 1.0,
        length: 0.25,
        level: 0.2,
        attack: 0.002,
      })
    },
  },
  {
    id: 'v2',
    label: 'V2',
    summary: 'A short victory jingle: da-da-da-DAA, da-DAAA, with a happy wobble at the end.',
    gain: 0.68,
    play: (o, at) => {
      const notes: readonly (readonly [string, number, number])[] = [
        ['C5', 0, 0.1],
        ['E5', 0.11, 0.1],
        ['G5', 0.22, 0.1],
        ['C6', 0.33, 0.16],
        ['G5', 0.58, 0.1],
        ['C6', 0.7, 0.45],
      ]
      notes.forEach(([note, start, length], k) => {
        const vibrato = k === notes.length - 1 ? { rate: 6, depth: 9 } : undefined
        tone(o, {
          type: 'square',
          from: n(note),
          at: at + start,
          length,
          level: 0.4,
          filter: { type: 'lowpass', frequency: 2800 },
          sustain: true,
          ...(vibrato ? { vibrato } : {}),
        })
        tone(o, {
          type: 'triangle',
          from: n(note),
          at: at + start,
          length,
          level: 0.4,
          sustain: true,
          ...(vibrato ? { vibrato } : {}),
        })
      })
    },
  },
  {
    id: 'v3',
    label: 'V3',
    summary: 'Happy robot chatter: a quick arpeggio, three chirpy "bleep-bloops", then "bee-DOO!".',
    gain: 1.1,
    play: (o, at) => {
      ;['C5', 'E5', 'G5', 'C6', 'E6'].forEach((note, k) => {
        tone(o, {
          type: 'square',
          from: n(note),
          at: at + k * 0.06,
          length: 0.055,
          level: 0.4,
          filter: { type: 'lowpass', frequency: 3200 },
          sustain: true,
        })
      })
      const chatter: readonly (readonly [number, number, number])[] = [
        [1200, 1700, 0.36],
        [1500, 950, 0.45],
        [1000, 1450, 0.54],
      ]
      for (const [from, to, start] of chatter) {
        tone(o, {
          type: 'triangle',
          from,
          to,
          at: at + start,
          length: 0.07,
          level: 0.7,
          sustain: true,
        })
      }
      tone(o, {
        type: 'square',
        from: n('G6'),
        at: at + 0.7,
        length: 0.09,
        level: 0.4,
        filter: { type: 'lowpass', frequency: 3200 },
        sustain: true,
      })
      tone(o, {
        type: 'square',
        from: n('C6'),
        to: n('G6'),
        at: at + 0.82,
        length: 0.32,
        level: 0.42,
        filter: { type: 'lowpass', frequency: 2600 },
        tremolo: { rate: 12, depth: 0.4 },
        sustain: true,
      })
    },
  },
]

export const SOUND_VARIANTS: Readonly<Record<RobotSound, readonly Variant[]>> = {
  scan: SCAN,
  lock: LOCK,
  claw: CLAW,
  finale: FINALE,
}

// ---------- Playing ----------

let context: AudioContext | null = null
let master: GainNode | null = null

function audio(): { context: AudioContext; master: GainNode } | null {
  if (typeof AudioContext === 'undefined') return null
  if (!context || !master) {
    context = new AudioContext()
    const compressor = context.createDynamicsCompressor()
    compressor.connect(context.destination)
    master = context.createGain()
    master.gain.value = 0.2
    master.connect(compressor)
  }
  if (context.state === 'suspended') void context.resume()
  return { context, master }
}

/** Plays a version into `destination` (exported so a level check can render it offline). */
export function render(variant: Variant, c: BaseAudioContext, destination: AudioNode, at: number) {
  const out = c.createGain()
  out.gain.value = variant.gain
  out.connect(destination)
  variant.play({ context: c, out }, at)
}

function start(variant: Variant, at: number): void {
  const a = audio()
  if (a) render(variant, a.context, a.master, at)
}

const find = (sound: RobotSound, id: VariantId): Variant | undefined =>
  SOUND_VARIANTS[sound].find((variant) => variant.id === id)

/** Plays one version of one sound. Only ever called from a tap. */
export function playRobotSound(sound: RobotSound, id: VariantId): void {
  const variant = find(sound, id)
  if (variant) start(variant, 0)
}

/**
 * One pass of selection sort, as it would sound: a few scans, a lock-on, more scans, then the
 * claw. Uses the chosen version of each sound. Only ever called from a tap.
 */
export function playRound(choice: Readonly<Record<RobotSound, VariantId>>): void {
  const scan = find('scan', choice.scan)
  const lock = find('lock', choice.lock)
  const claw = find('claw', choice.claw)
  if (!scan || !lock || !claw) return
  for (const at of [0, 0.32, 0.64]) start(scan, at)
  start(lock, 0.98)
  for (const at of [1.46, 1.78]) start(scan, at)
  start(claw, 2.2)
}
