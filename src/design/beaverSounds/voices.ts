/**
 * TEMPORARY (sounds/heap-sort-beaver, DO NOT MERGE): three versions (A, B, C) of each of heap
 * sort's builder beaver's seven sounds, for Juan to pick by ear on /design/beaver-sounds. Nothing
 * here is wired into heap sort's Watch or Do it.
 *
 * Built like the pizza cart's (src/sound/cartVoices.ts), on the shared `Patch` (`tone` and
 * `noise`), and played through the engine's chain: the sound's own gain, the master 0.2, then a
 * compressor. The gains were set by measurement against the other characters' sounds (the page's
 * "Measure levels" measures these and the cart's real ones side by side): frequent sounds soft,
 * the stop the quietest, the haul the loudest, the finale a celebration. Times are seconds from
 * the sound's start.
 */
import {
  CLIMB_AT,
  CLIMB_MS,
  HAUL_AT,
  HAUL_MS,
  LOOK_MS,
  STOP_MS,
} from '../../characters/beaver/steps'
import { specialMs } from '../../characters/pixel'
import { stepDelayMs } from '../../engine/player'
import { Patch } from '../../sound/spaceshipVoices'

export type Slot = 'look' | 'found' | 'climb' | 'stop' | 'haul' | 'turn' | 'finale'
export type Version = 'A' | 'B' | 'C'

export const SLOTS: readonly Slot[] = ['look', 'found', 'climb', 'stop', 'haul', 'turn', 'finale']
export const VERSIONS: readonly Version[] = ['A', 'B', 'C']

/** Every beaver move is held: its 1× length, divided by the speed above 1×. At 4×: */
const at4 = (ms: number) => specialMs(ms, stepDelayMs(4))
/** A sound must end 10 ms before the next step (it fades out there). */
const FADE = 10

/** How long Do it's question waits in a round (a pretend learner thinking). */
export const THINK_MS = 700

export interface SlotInfo {
  readonly title: string
  readonly moment: string
  /** The most it may last at 4× (ms), from where it starts to 10 ms before the next step. */
  readonly budgetMs: number
  readonly budget: string
}

const LOOK_4 = at4(LOOK_MS)
const CLIMB_4 = at4(CLIMB_MS)
const STOP_4 = at4(STOP_MS)
const HAUL_4 = at4(HAUL_MS)

export const SLOT_INFO: Readonly<Record<Slot, SlotInfo>> = {
  look: {
    title: '1. Looking',
    moment: 'A family compared: the beaver walks under the parent and looks up. Frequent.',
    budgetMs: LOOK_4 - FADE,
    budget: `the step is ${String(LOOK_4)} ms at 4×; starts with it`,
  },
  found: {
    title: '2. Found a bigger one',
    moment: 'The "!" over its head at the start of a climb: a little discovery.',
    budgetMs: CLIMB_4 * CLIMB_AT.walk - FADE,
    budget: `${String(CLIMB_4 * CLIMB_AT.walk)} ms at 4×, until the lift (the climb's sound)`,
  },
  climb: {
    title: '3. A climb',
    moment:
      'It lifts the child’s stack over its head and carries it up; the parent slides down. Frequent.',
    budgetMs: CLIMB_4 * (1 - CLIMB_AT.walk) - FADE,
    budget: `${String(CLIMB_4 * (1 - CLIMB_AT.walk))} ms at 4×, from the lift to the step's end`,
  },
  stop: {
    title: '4. A stop',
    moment: 'It looks, shrugs and moves on; nothing moves. The calmest; it happens a lot.',
    budgetMs: STOP_4 * 0.7 - FADE,
    budget: `${String(STOP_4 * 0.7)} ms at 4×, from the shrug to the step's end`,
  },
  haul: {
    title: '5. Hauled to the woodpile',
    moment:
      'The special move: it hauls the top stack to the woodpile. The thud lands as the stack is set down.',
    budgetMs: HAUL_4 - FADE,
    budget: `held ${String(HAUL_4)} ms at 4×; set down at ${String(HAUL_4 * HAUL_AT.land)} ms, ${String(HAUL_4 * (1 - HAUL_AT.land) - FADE)} ms left after it`,
  },
  turn: {
    title: '6. Your turn! (Do it)',
    moment: 'Do it: the beaver turns to face the learner while the question waits.',
    budgetMs: 250,
    budget: 'kept under 250 ms, so a quick answer never cuts it off',
  },
  finale: {
    title: '7. Finale',
    moment: 'Everything is sorted: the beaver bobs at the end, the stacks hop in a wave.',
    budgetMs: 1600,
    budget: 'plays in full: the finale is 1600 ms',
  },
}

/** After the set-down, at 4×: what the haul's sound has left past its thud. */
export const HAUL_TAIL_MS = HAUL_4 * (1 - HAUL_AT.land) - FADE
/** When the stack is set down at 4×: the latest the haul's thud can land. */
export const HAUL_LAND_MS = HAUL_4 * HAUL_AT.land

export interface Option {
  readonly name: string
  readonly line: string
  /** How long it lasts (ms): its last part's end. */
  readonly ms: number
  /** The haul's: when its thud lands (ms from its start), placed on the set-down. */
  readonly hitMs?: number
  /** Its own gain into the master, set by measurement. */
  readonly gain: number
  readonly build: (p: Patch) => void
}

const SOFT_SQUARE = { type: 'square', filter: { type: 'lowpass', frequency: 2600 } } as const

/** A hollow wood knock: a short band of noise and a low triangle, like tapping a log. */
function knock(p: Patch, f: number, at: number, level: number, length = 0.04) {
  p.noise({ at, length: length * 0.6, level, filter: { type: 'bandpass', frequency: f * 3, q: 5 } })
  p.tone({ type: 'triangle', from: f, to: f * 0.85, at, length, level: level * 0.8, attack: 0.002 })
}

/** A marimba note: a sine and its fourth partial, the partial dying first. */
function marimba(p: Patch, f: number, at: number, length: number, level: number) {
  p.tone({ type: 'sine', from: f, at, length, level, attack: 0.003 })
  p.tone({
    type: 'sine',
    from: f * 4,
    at,
    length: length * 0.25,
    level: level * 0.3,
    attack: 0.002,
  })
}

/** A log landing: a low drop with a woody knock on top. */
function thud(p: Patch, at: number, level: number, from = 170, length = 0.09) {
  p.tone({ type: 'sine', from, to: 55, at, length, level, attack: 0.002 })
  p.noise({
    at,
    length: 0.035,
    level: level * 0.45,
    filter: { type: 'bandpass', frequency: 700, q: 2 },
  })
}

/** A small bell: a sine and a quiet inharmonic partial, ringing down. */
function bell(p: Patch, f: number, at: number, length: number, level: number) {
  p.tone({ type: 'sine', from: f, at, length, level, attack: 0.003 })
  p.tone({ type: 'sine', from: f * 2.76, at, length: length * 0.5, level: level * 0.25 })
}

export const OPTIONS: Readonly<Record<Slot, Readonly<Record<Version, Option>>>> = {
  look: {
    A: {
      name: 'Knock-knock',
      line: 'Two soft hollow knocks, the second higher, like tapping a log to check it.',
      ms: 95,
      gain: 3.0,
      build: (p) => {
        knock(p, 392, 0, 0.3)
        knock(p, 523, 0.055, 0.3)
      },
    },
    B: {
      name: 'Sniff-sniff',
      line: 'Two tiny rising sniffs: the beaver noses up at the family.',
      ms: 120,
      gain: 5.25,
      build: (p) => {
        for (const [at, f] of [
          [0, 2200],
          [0.07, 3000],
        ] as const) {
          p.noise({
            at,
            length: 0.05,
            level: 0.4,
            attack: 0.012,
            filter: { type: 'bandpass', frequency: f, to: f * 1.4, q: 3 },
          })
        }
      },
    },
    C: {
      name: 'Marimba "hm?"',
      line: 'Two soft marimba notes stepping up, a quiet question.',
      ms: 130,
      gain: 2.2,
      build: (p) => {
        marimba(p, 659, 0, 0.07, 0.3)
        marimba(p, 880, 0.06, 0.07, 0.3)
      },
    },
  },
  found: {
    A: {
      name: 'Ping!',
      line: 'A quick grace note into a bright xylophone ping: there it is!',
      ms: 150,
      gain: 2.4,
      build: (p) => {
        marimba(p, 1175, 0, 0.03, 0.25)
        marimba(p, 1568, 0.025, 0.125, 0.35)
      },
    },
    B: {
      name: 'Eep!',
      line: 'A chirpy little squeak that leaps up, the beaver surprised.',
      ms: 100,
      gain: 1.7,
      build: (p) => {
        p.tone({
          type: 'triangle',
          from: [
            [0, 900],
            [0.05, 1900],
            [0.1, 1700],
          ],
          at: 0,
          length: 0.1,
          level: 0.3,
          env: [
            [0.01, 1],
            [0.07, 0.8],
            [0.1, 0],
          ],
        })
      },
    },
    C: {
      name: 'Chip-chip!',
      line: 'Two 8-bit blips an octave apart, the "!" popping up.',
      ms: 110,
      gain: 1.4,
      build: (p) => {
        p.tone({ ...SOFT_SQUARE, from: 784, at: 0, length: 0.04, level: 0.2, sustain: true })
        p.tone({ ...SOFT_SQUARE, from: 1568, at: 0.05, length: 0.06, level: 0.2, sustain: true })
      },
    },
  },
  climb: {
    A: {
      name: 'Hup and creak',
      line: 'A short "hup!" of effort, then the wood creaks as the stack goes up.',
      ms: 240,
      gain: 5.5,
      build: (p) => {
        p.tone({
          type: 'triangle',
          from: 200,
          to: 290,
          at: 0,
          length: 0.07,
          level: 0.4,
          attack: 0.006,
          filter: { type: 'lowpass', frequency: 900 },
        })
        p.noise({
          at: 0.08,
          length: 0.16,
          level: 0.35,
          env: [
            [0.04, 1],
            [0.12, 0.7],
            [0.16, 0],
          ],
          filter: { type: 'bandpass', frequency: 500, to: 900, q: 6 },
          tremolo: { rate: 38, depth: 0.8 },
        })
      },
    },
    B: {
      name: 'Log roll up',
      line: 'Four quick woody knocks climbing in pitch, the stack bumping up a ramp.',
      ms: 210,
      gain: 3.1,
      build: (p) => {
        for (const [k, f] of [262, 294, 330, 392].entries()) knock(p, f, k * 0.045, 0.28, 0.05)
      },
    },
    C: {
      name: 'Heave and slide',
      line: 'A low rising heave (up goes the stack) over a soft scrape sliding down (the parent).',
      ms: 230,
      gain: 0.95,
      build: (p) => {
        p.tone({
          ...SOFT_SQUARE,
          filter: { type: 'lowpass', frequency: 700 },
          from: 165,
          to: 330,
          at: 0,
          length: 0.18,
          level: 0.22,
          sustain: true,
        })
        p.noise({
          at: 0.03,
          length: 0.2,
          level: 0.3,
          env: [
            [0.05, 1],
            [0.2, 0],
          ],
          filter: { type: 'bandpass', frequency: 1600, to: 600, q: 2 },
        })
      },
    },
  },
  stop: {
    A: {
      name: 'Soft tock',
      line: 'One quiet low woodblock tap; barely there.',
      ms: 45,
      gain: 2.4,
      build: (p) => {
        knock(p, 330, 0, 0.2, 0.045)
      },
    },
    B: {
      name: 'Shrug puff',
      line: 'A tiny falling breath of air: "eh, fine."',
      ms: 90,
      gain: 3.3,
      build: (p) => {
        p.noise({
          at: 0,
          length: 0.09,
          level: 0.25,
          attack: 0.02,
          filter: { type: 'lowpass', frequency: 1400, to: 500 },
        })
      },
    },
    C: {
      name: 'Hm-mm',
      line: 'Two very soft round notes stepping down: nothing to do here.',
      ms: 120,
      gain: 0.65,
      build: (p) => {
        p.tone({ type: 'sine', from: 494, at: 0, length: 0.055, level: 0.22, sustain: true })
        p.tone({ type: 'sine', from: 440, at: 0.06, length: 0.06, level: 0.22, attack: 0.008 })
      },
    },
  },
  haul: {
    A: {
      name: 'Heave, ho, THUD',
      line: 'Two effort notes as it carries ("heave… ho!"), then a big log thud and a rattle onto the pile.',
      ms: 380,
      hitMs: 290,
      gain: 2.4,
      build: (p) => {
        const effort = {
          type: 'triangle',
          at: 0,
          length: 0.11,
          level: 0.35,
          attack: 0.01,
          filter: { type: 'lowpass', frequency: 1100 },
        } as const
        p.tone({ ...effort, from: 220, to: 262 })
        p.tone({ ...effort, from: 294, to: 392, at: 0.14 })
        thud(p, 0.29, 0.75, 180, 0.09)
        for (const [at, f] of [
          [0.315, 440],
          [0.34, 523],
        ] as const) {
          knock(p, f, at, 0.25, 0.04)
        }
      },
    },
    B: {
      name: 'Drumroll and pile',
      line: 'A woody drumroll building as it hauls, then three logs clatter onto the pile with a ding.',
      ms: 480,
      hitMs: 390,
      gain: 2.75,
      build: (p) => {
        for (let k = 0; k < 10; k++) knock(p, 330, k * 0.038, 0.1 + k * 0.025, 0.03)
        thud(p, 0.39, 0.6, 170, 0.07)
        thud(p, 0.42, 0.5, 150, 0.06)
        thud(p, 0.445, 0.45, 190, 0.035)
        bell(p, 1568, 0.39, 0.09, 0.22)
      },
    },
    C: {
      name: 'Marimba stack-up',
      line: 'A marimba run up as it carries (do-mi-sol-do), two logs "clonk-clonk" and a bell on top.',
      ms: 410,
      hitMs: 320,
      gain: 2.75,
      build: (p) => {
        for (const [k, f] of [523, 659, 784, 1047].entries()) marimba(p, f, k * 0.07, 0.09, 0.3)
        thud(p, 0.32, 0.55, 200, 0.06)
        thud(p, 0.36, 0.5, 160, 0.05)
        bell(p, 2093, 0.32, 0.09, 0.2)
      },
    },
  },
  turn: {
    A: {
      name: 'Boo-dee?',
      line: 'A friendly two-note marimba "boo-dee?", up a sixth: your go!',
      ms: 180,
      gain: 1.8,
      build: (p) => {
        marimba(p, 523, 0, 0.08, 0.3)
        marimba(p, 880, 0.08, 0.1, 0.33)
      },
    },
    B: {
      name: 'Tail pat, "eh?"',
      line: 'A soft flat pat of the paddle tail, then a tiny rising chirp.',
      ms: 190,
      gain: 2.4,
      build: (p) => {
        p.noise({
          at: 0,
          length: 0.05,
          level: 0.45,
          filter: { type: 'lowpass', frequency: 900 },
        })
        p.tone({ type: 'sine', from: 140, to: 80, at: 0, length: 0.05, level: 0.4 })
        p.tone({
          type: 'triangle',
          from: 1047,
          to: 1480,
          at: 0.08,
          length: 0.11,
          level: 0.25,
          attack: 0.01,
        })
      },
    },
    C: {
      name: 'Da-da-di?',
      line: 'Three little 8-bit notes, up-down-up: a chiptune "your turn?".',
      ms: 200,
      gain: 1.05,
      build: (p) => {
        for (const [from, at] of [
          [659, 0],
          [523, 0.065],
          [988, 0.13],
        ] as const) {
          p.tone({
            ...SOFT_SQUARE,
            from,
            at,
            length: at > 0.1 ? 0.07 : 0.055,
            level: 0.18,
            sustain: true,
          })
        }
      },
    },
  },
  finale: {
    A: {
      name: 'Lumberjack jingle',
      line: 'A bouncy 8-bit tune, sol-do-mi-sol, mi-sol-DO!, over a woodblock beat.',
      ms: 1300,
      gain: 1.5,
      build: (p) => {
        const notes = [
          [392, 0, 0.1],
          [523, 0.12, 0.1],
          [659, 0.24, 0.1],
          [784, 0.36, 0.16],
          [659, 0.56, 0.1],
          [784, 0.68, 0.1],
          [1047, 0.8, 0.5],
        ] as const
        for (const [from, at, length] of notes) {
          p.tone({
            ...SOFT_SQUARE,
            from,
            at,
            length,
            level: 0.22,
            sustain: true,
            ...(length > 0.3 ? { tremolo: { rate: 8, depth: 0.3 } } : {}),
          })
        }
        p.tone({ type: 'triangle', from: 262, at: 0.8, length: 0.5, level: 0.35, sustain: true })
        for (let k = 0; k < 7; k++) knock(p, k % 2 ? 523 : 392, k * 0.12, 0.2, 0.04)
      },
    },
    B: {
      name: 'Marimba fanfare',
      line: 'A log thud on the downbeat, a marimba run up two octaves, and a ringing chord with a bell.',
      ms: 1400,
      gain: 3.2,
      build: (p) => {
        thud(p, 0, 0.6, 160, 0.12)
        for (const [k, f] of [392, 523, 659, 784, 1047, 1319].entries()) {
          marimba(p, f, 0.1 + k * 0.08, 0.14, 0.28)
        }
        for (const f of [523, 659, 784, 1047]) {
          p.tone({
            type: 'triangle',
            from: f,
            at: 0.62,
            length: 0.78,
            level: 0.13,
            attack: 0.01,
            tremolo: { rate: 7, depth: 0.25 },
          })
        }
        bell(p, 2093, 0.62, 0.6, 0.18)
      },
    },
    C: {
      name: 'Hop-hop parade',
      line: 'Six springy hops climbing up (the stacks hopping in a wave), then a bright held chord.',
      ms: 1500,
      gain: 1.7,
      build: (p) => {
        for (const [k, f] of [392, 440, 523, 587, 659, 784].entries()) {
          p.tone({
            type: 'triangle',
            from: [
              [0, f],
              [0.05, f * 1.5],
              [0.1, f],
            ],
            at: 0.32 + k * 0.12,
            length: 0.11,
            level: 0.3,
            attack: 0.004,
          })
        }
        for (const f of [784, 988, 1175, 1568]) {
          p.tone({
            ...SOFT_SQUARE,
            from: f,
            at: 1.05,
            length: 0.45,
            level: 0.11,
            sustain: true,
            tremolo: { rate: 8, depth: 0.3 },
          })
        }
        p.tone({ type: 'triangle', from: 392, at: 1.05, length: 0.45, level: 0.35, sustain: true })
        knock(p, 330, 0, 0.3, 0.05)
        knock(p, 440, 0.16, 0.3, 0.05)
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
 * Renders a sound through the chain offline and measures it as the other characters' were: the
 * peak, and the RMS over the 10 ms windows that are sounding (above −50 dBFS).
 */
export async function measure(
  play: (context: BaseAudioContext, out: AudioNode, when: number) => void,
  ms: number,
  sampleRate = 48000,
): Promise<Level> {
  const length = Math.ceil(((ms + 100) / 1000) * sampleRate)
  const context = new OfflineAudioContext(1, length, sampleRate)
  play(context, makeChain(context), 0.01)
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
