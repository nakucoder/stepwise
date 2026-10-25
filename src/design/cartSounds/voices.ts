/**
 * TEMPORARY (sounds/quick-sort-cart, DO NOT MERGE): three versions (A, B, C) of each of the pizza
 * cart's seven sounds, for Juan to pick by ear on /design/cart-sounds. Nothing here is wired into
 * quick sort's Watch or Do it.
 *
 * Built like the spaceships' (src/sound/spaceshipVoices.ts), on the same `Patch` (`tone` and
 * `noise`), and played through the engine's chain: the sound's own gain, the master 0.2, then a
 * compressor. The gains were set by measurement against the other characters' sounds (see the
 * page's "Measure levels"): frequent sounds soft, "Delivered!" the loudest, the finale a
 * celebration. Times are seconds from the sound's start.
 */
import { Patch } from '../../sound/spaceshipVoices'

export type Slot = 'look' | 'move' | 'stay' | 'nudge' | 'deliver' | 'done' | 'finale'
export type Version = 'A' | 'B' | 'C'

export const SLOTS: readonly Slot[] = ['look', 'move', 'stay', 'nudge', 'deliver', 'done', 'finale']
export const VERSIONS: readonly Version[] = ['A', 'B', 'C']

export interface SlotInfo {
  readonly title: string
  readonly moment: string
  /** The most it may last at 4× (ms): a frequent sound fits its step, less 10 ms to fade. */
  readonly budgetMs: number
  readonly budget: string
}

/** At 4× a step is 200 ms; "Delivered!" holds the step for specialMs(1600) = 400 ms. */
export const SLOT_INFO: Readonly<Record<Slot, SlotInfo>> = {
  look: {
    title: '1. Looking',
    moment: 'The cart checks a box against the leader (compare).',
    budgetMs: 170,
    budget: 'frequent: 180 ms at 4×',
  },
  move: {
    title: '2. Found it, goes left',
    moment: 'The cart rolls a stack into the left zone and sets it down.',
    budgetMs: 170,
    budget: 'frequent: 180 ms at 4×',
  },
  stay: {
    title: '3. Stays right',
    moment: 'The stack stays where it is; the bigger zone grows. The calmest.',
    budgetMs: 170,
    budget: 'frequent: 180 ms at 4×',
  },
  nudge: {
    title: '4. Self-swap nudge',
    moment: 'A trade with itself: the stack is lifted and set down in place.',
    budgetMs: 170,
    budget: 'frequent: 180 ms at 4×',
  },
  deliver: {
    title: '5. Delivered!',
    moment: 'The leader is placed: the lid flips up, steam rises. The special moment.',
    budgetMs: 390,
    budget: 'special: held 400 ms at 4×',
  },
  done: {
    title: '6. Range done',
    moment: 'A range is finished; the green mark goes under it.',
    budgetMs: 170,
    budget: 'frequent: 180 ms at 4×',
  },
  finale: {
    title: '7. Finale',
    moment: 'Everything is sorted: the stacks hop in a wave, the cart bounces.',
    budgetMs: 1000,
    budget: 'plays in full (the hop wave is 840 ms)',
  },
}

export interface Option {
  readonly name: string
  readonly line: string
  /** How long it lasts (ms): its last part's end. */
  readonly ms: number
  /** Its own gain into the master, set by measurement. */
  readonly gain: number
  readonly build: (p: Patch) => void
}

const SOFT_SQUARE = { type: 'square', filter: { type: 'lowpass', frequency: 3000 } } as const

/** A small bell: a sine and a quiet inharmonic partial, ringing down. */
function bell(p: Patch, f: number, at: number, length: number, level: number) {
  p.tone({ type: 'sine', from: f, at, length, level, attack: 0.003 })
  p.tone({ type: 'sine', from: f * 2.76, at, length: length * 0.5, level: level * 0.25 })
}

/** Steam: a hiss that swells in and fades away. */
function steam(p: Patch, at: number, length: number, level: number, from = 3000, to = 7000) {
  p.noise({
    at,
    length,
    level,
    env: [
      [length * 0.3, 1],
      [length, 0],
    ],
    filter: { type: 'bandpass', frequency: from, to, q: 0.8 },
  })
}

export const OPTIONS: Readonly<Record<Slot, Readonly<Record<Version, Option>>>> = {
  look: {
    A: {
      name: 'Two glances',
      line: 'Two tiny rising blips: eyes up to the box, then across to the leader.',
      ms: 110,
      gain: 2.14,
      build: (p) => {
        const blip = { type: 'triangle', length: 0.045, level: 0.3, attack: 0.003 } as const
        p.tone({ ...blip, from: 1319, at: 0 })
        p.tone({ ...blip, from: 1760, at: 0.065 })
      },
    },
    B: {
      name: 'Sonar boop',
      line: 'One soft round "boop" that bends up a little, like a question.',
      ms: 90,
      gain: 2.5,
      build: (p) => {
        p.tone({
          type: 'sine',
          from: 880,
          to: 1175,
          at: 0,
          length: 0.09,
          level: 0.4,
          attack: 0.006,
        })
      },
    },
    C: {
      name: 'Curious "hm?"',
      line: 'A wobbly little "hm?" that rises and settles, the antenna tilting.',
      ms: 140,
      gain: 1.2,
      build: (p) => {
        p.tone({
          type: 'triangle',
          from: [
            [0, 620],
            [0.07, 930],
            [0.14, 860],
          ],
          at: 0,
          length: 0.14,
          level: 0.35,
          env: [
            [0.02, 1],
            [0.1, 0.7],
            [0.14, 0],
          ],
          tremolo: { rate: 18, depth: 0.3 },
        })
      },
    },
  },
  move: {
    A: {
      name: 'Beep-boop',
      line: 'A chiptune "beep-boop", high then low: found one!',
      ms: 140,
      gain: 1.31,
      build: (p) => {
        p.tone({ ...SOFT_SQUARE, from: 1047, at: 0, length: 0.06, level: 0.2, sustain: true })
        p.tone({ ...SOFT_SQUARE, from: 784, at: 0.07, length: 0.07, level: 0.2, sustain: true })
      },
    },
    B: {
      name: 'Boop-beep and roll',
      line: 'A "boop-beep" going up, over a soft rumble of the wheels rolling.',
      ms: 160,
      gain: 1.52,
      build: (p) => {
        p.tone({ ...SOFT_SQUARE, from: 659, at: 0, length: 0.05, level: 0.2, sustain: true })
        p.tone({ ...SOFT_SQUARE, from: 988, at: 0.06, length: 0.06, level: 0.2, sustain: true })
        p.noise({
          at: 0,
          length: 0.16,
          level: 0.5,
          env: [
            [0.03, 1],
            [0.12, 0.8],
            [0.16, 0],
          ],
          filter: { type: 'lowpass', frequency: 380 },
          tremolo: { rate: 32, depth: 0.7 },
        })
      },
    },
    C: {
      name: 'Trill and thunk',
      line: 'Three quick rising blips (discovery!), then a soft thunk as the stack is set down.',
      ms: 165,
      gain: 1.52,
      build: (p) => {
        for (const [from, at] of [
          [1047, 0],
          [1319, 0.035],
          [1568, 0.07],
        ] as const) {
          p.tone({ ...SOFT_SQUARE, from, at, length: 0.03, level: 0.17, sustain: true })
        }
        p.tone({
          type: 'sine',
          from: 180,
          to: 90,
          at: 0.11,
          length: 0.055,
          level: 0.6,
          attack: 0.002,
        })
      },
    },
  },
  stay: {
    A: {
      name: 'Soft tick',
      line: 'One short, quiet sine tick; barely there.',
      ms: 50,
      gain: 2.14,
      build: (p) => {
        p.tone({ type: 'sine', from: 523, at: 0, length: 0.05, level: 0.3, attack: 0.003 })
      },
    },
    B: {
      name: 'Hush',
      line: 'A tiny breath of soft noise, almost silent: the stack just wobbles.',
      ms: 60,
      gain: 3.75,
      build: (p) => {
        p.noise({
          at: 0,
          length: 0.06,
          level: 0.3,
          attack: 0.012,
          filter: { type: 'lowpass', frequency: 1500 },
        })
      },
    },
    C: {
      name: 'Low hum',
      line: 'A low, mellow note that sinks a little: calm, nothing to do.',
      ms: 80,
      gain: 1.5,
      build: (p) => {
        p.tone({
          type: 'triangle',
          from: 392,
          to: 349,
          at: 0,
          length: 0.08,
          level: 0.3,
          attack: 0.01,
          filter: { type: 'lowpass', frequency: 1200 },
        })
      },
    },
  },
  nudge: {
    A: {
      name: 'Bump',
      line: 'A small low thud with a click: lifted and set down.',
      ms: 70,
      gain: 1.79,
      build: (p) => {
        p.tone({ type: 'sine', from: 240, to: 110, at: 0, length: 0.07, level: 0.6, attack: 0.002 })
        p.noise({
          at: 0,
          length: 0.02,
          level: 0.15,
          filter: { type: 'bandpass', frequency: 1800, q: 2 },
        })
      },
    },
    B: {
      name: 'Boing',
      line: 'A tiny springy hop, up and back down.',
      ms: 90,
      gain: 3.12,
      build: (p) => {
        p.tone({
          type: 'triangle',
          from: [
            [0, 440],
            [0.04, 700],
            [0.09, 440],
          ],
          at: 0,
          length: 0.09,
          level: 0.3,
          attack: 0.004,
        })
      },
    },
    C: {
      name: 'Knock-knock',
      line: 'Two light knocks on cardboard, like tapping the box.',
      ms: 80,
      gain: 2.78,
      build: (p) => {
        for (const at of [0, 0.05]) {
          p.noise({
            at,
            length: 0.03,
            level: 0.5,
            filter: { type: 'bandpass', frequency: 900, q: 4 },
          })
          p.tone({ type: 'triangle', from: 330, at, length: 0.03, level: 0.25, attack: 0.002 })
        }
      },
    },
  },
  deliver: {
    A: {
      name: 'Ding-dong and steam',
      line: 'A doorbell "ding-dong" (the delivery is here!) with a hiss of steam as the lid opens.',
      ms: 390,
      gain: 3.16,
      build: (p) => {
        bell(p, 1319, 0, 0.22, 0.4)
        bell(p, 1047, 0.14, 0.25, 0.4)
        steam(p, 0.12, 0.27, 0.12)
      },
    },
    B: {
      name: 'Lid pop and sparkle',
      line: 'A "pop" as the lid flips, a bright four-note run up, and the steam rising.',
      ms: 380,
      gain: 3.15,
      build: (p) => {
        p.tone({ type: 'sine', from: 250, to: 900, at: 0, length: 0.04, level: 0.5, attack: 0.002 })
        for (const [from, at, length] of [
          [1047, 0.05, 0.05],
          [1319, 0.09, 0.05],
          [1568, 0.13, 0.05],
          [2093, 0.17, 0.13],
        ] as const) {
          p.tone({ ...SOFT_SQUARE, from, at, length, level: 0.16, sustain: true })
        }
        steam(p, 0.15, 0.23, 0.12, 4000, 8000)
      },
    },
    C: {
      name: 'Ta-da chord',
      line: 'A shimmering four-note "ta-da!" strum with a soft "pssh" of steam under it.',
      ms: 390,
      gain: 7.1,
      build: (p) => {
        for (const [from, at] of [
          [784, 0],
          [988, 0.02],
          [1175, 0.04],
          [1568, 0.06],
        ] as const) {
          p.tone({
            type: 'triangle',
            from,
            at,
            length: 0.39 - at,
            level: 0.16,
            attack: 0.005,
            tremolo: { rate: 10, depth: 0.25 },
          })
        }
        steam(p, 0.1, 0.28, 0.1, 2000, 6000)
      },
    },
  },
  done: {
    A: {
      name: 'Two-note yay',
      line: 'Two notes going up, like a cheerful "ta-da" in miniature.',
      ms: 160,
      gain: 2.22,
      build: (p) => {
        p.tone({ type: 'triangle', from: 784, at: 0, length: 0.06, level: 0.3, sustain: true })
        p.tone({ type: 'triangle', from: 1047, at: 0.07, length: 0.09, level: 0.3, attack: 0.004 })
      },
    },
    B: {
      name: 'Sparkle ding',
      line: 'One small bright bell with a twinkle on top.',
      ms: 160,
      gain: 4.0,
      build: (p) => {
        bell(p, 1568, 0, 0.16, 0.3)
        p.tone({ type: 'sine', from: 3136, at: 0.03, length: 0.1, level: 0.08 })
      },
    },
    C: {
      name: 'Blip-blip-bloop',
      line: 'Two quick blips and a higher one: a little robot "all set!".',
      ms: 150,
      gain: 1.67,
      build: (p) => {
        p.tone({ ...SOFT_SQUARE, from: 1175, at: 0, length: 0.035, level: 0.17, sustain: true })
        p.tone({ ...SOFT_SQUARE, from: 1175, at: 0.045, length: 0.035, level: 0.17, sustain: true })
        p.tone({ ...SOFT_SQUARE, from: 1568, at: 0.09, length: 0.06, level: 0.17, sustain: true })
      },
    },
  },
  finale: {
    A: {
      name: 'Delivery jingle',
      line: 'An 8-bit jingle, do-mi-sol, mi-sol, DO!, with a warm bass under the last note.',
      ms: 980,
      gain: 1.47,
      build: (p) => {
        for (const [from, at] of [
          [523, 0],
          [659, 0.12],
          [784, 0.24],
          [659, 0.36],
          [784, 0.48],
        ] as const) {
          p.tone({ ...SOFT_SQUARE, from, at, length: 0.1, level: 0.25, sustain: true })
        }
        p.tone({
          ...SOFT_SQUARE,
          from: 1047,
          at: 0.6,
          length: 0.38,
          level: 0.25,
          sustain: true,
          tremolo: { rate: 8, depth: 0.3 },
        })
        p.tone({ type: 'triangle', from: 262, at: 0.6, length: 0.38, level: 0.4, sustain: true })
      },
    },
    B: {
      name: 'Doorbell fanfare',
      line: 'A quick run up two octaves, then a big "ding-dong" doorbell: delivered, all of it.',
      ms: 980,
      gain: 1.85,
      build: (p) => {
        for (const [from, at] of [
          [523, 0],
          [659, 0.07],
          [784, 0.14],
          [1047, 0.21],
          [1319, 0.28],
        ] as const) {
          p.tone({ type: 'triangle', from, at, length: 0.1, level: 0.3, attack: 0.004 })
        }
        bell(p, 1319, 0.42, 0.3, 0.4)
        bell(p, 1047, 0.62, 0.36, 0.4)
        p.tone({ type: 'triangle', from: 523, at: 0.62, length: 0.36, level: 0.25, attack: 0.01 })
      },
    },
    C: {
      name: 'Toy-horn fanfare',
      line: 'A toy horn goes "honk-honk!", then a run up into a bright wobbling chord.',
      ms: 980,
      gain: 1.85,
      build: (p) => {
        const horn = {
          type: 'square',
          filter: { type: 'lowpass', frequency: 1400 },
          sustain: true,
        } as const
        for (const [at, length] of [
          [0, 0.11],
          [0.15, 0.14],
        ] as const) {
          p.tone({ ...horn, from: 466, at, length, level: 0.22 })
          p.tone({ ...horn, from: 471, at, length, level: 0.22 })
        }
        for (const [from, at] of [
          [784, 0.36],
          [880, 0.43],
          [988, 0.5],
        ] as const) {
          p.tone({ ...SOFT_SQUARE, from, at, length: 0.06, level: 0.22, sustain: true })
        }
        for (const from of [1047, 1319, 1568]) {
          p.tone({
            ...SOFT_SQUARE,
            from,
            at: 0.58,
            length: 0.4,
            level: 0.15,
            sustain: true,
            tremolo: { rate: 8, depth: 0.3 },
          })
        }
      },
    },
  },
}

/** Schedules one option at `when` (context seconds) into `out`; `cutMs` ends it early with a fade. */
export function playOption(
  context: BaseAudioContext,
  out: AudioNode,
  option: Option,
  when: number,
  cutMs?: number,
): void {
  const gain = context.createGain()
  gain.gain.value = option.gain
  gain.connect(out)
  option.build(new Patch(context, gain, when))
  if (cutMs !== undefined && cutMs < option.ms) {
    const end = when + cutMs / 1000
    gain.gain.setValueAtTime(option.gain, Math.max(when, end - 0.012))
    gain.gain.linearRampToValueAtTime(0, end)
  }
}

/** The engine's chain: the master gain of 0.2, then a compressor with default settings. */
export function makeChain(context: BaseAudioContext): GainNode {
  const compressor = context.createDynamicsCompressor()
  const master = context.createGain()
  master.gain.value = 0.2
  master.connect(compressor)
  compressor.connect(context.destination)
  return master
}

export interface Level {
  readonly rms: number
  readonly peak: number
}

/**
 * Renders one option through the chain offline and measures it as the spaceships' spec does: the
 * peak, and the RMS over the 10 ms windows that are sounding (above −50 dBFS).
 */
export async function measure(option: Option, sampleRate = 48000): Promise<Level> {
  const length = Math.ceil(((option.ms + 100) / 1000) * sampleRate)
  const context = new OfflineAudioContext(1, length, sampleRate)
  playOption(context, makeChain(context), option, 0.01)
  const data = (await context.startRendering()).getChannelData(0)
  let peak = 0
  for (const x of data) peak = Math.max(peak, Math.abs(x))
  const win = Math.round(sampleRate * 0.01)
  const floor = 10 ** (-50 / 20)
  let sum = 0
  let count = 0
  for (let s = 0; s + win <= data.length; s += win) {
    let w = 0
    for (let k = s; k < s + win; k++) w += (data[k] ?? 0) ** 2
    if (Math.sqrt(w / win) > floor) {
      sum += w
      count += win
    }
  }
  return { rms: count ? Math.sqrt(sum / count) : 0, peak }
}
