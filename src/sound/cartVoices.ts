/**
 * Quick sort's pizza cart's sounds, all made in code: no recording. Juan picked them from three
 * versions each on the listening page (PR #99, `/design/cart-sounds`): the curious "hm?" as it
 * looks, the boop-beep and roll as a stack goes left, the hush as one stays right, the
 * knock-knock of a nudge, the ding-dong and steam of "Delivered!", the blip-blip-bloop of a range
 * done, and the toy-horn fanfare for the finale.
 *
 * Built like the spaceships' (spaceshipVoices.ts), on the same `Patch` (`tone` and `noise`). Each
 * sound has its own gain into the engine's master (0.2, then a compressor), the chain the gains
 * were set through on the listening page, by measurement (RMS over the sounding 10 ms windows,
 * and the peak): the stay the quietest, "Delivered!" the loudest peaks, the finale a celebration.
 */
import { Patch } from './spaceshipVoices'

export type CartVoice =
  | 'cart-look'
  | 'cart-move'
  | 'cart-stay'
  | 'cart-nudge'
  | 'cart-deliver'
  | 'cart-done'
  | 'cart-fanfare'

/** Each sound's own gain, from the listening page's measurements. */
export const CART_GAINS: Readonly<Record<CartVoice, number>> = {
  'cart-look': 1.2,
  'cart-move': 1.52,
  'cart-stay': 3.75,
  'cart-nudge': 2.78,
  'cart-deliver': 3.16,
  'cart-done': 1.67,
  'cart-fanfare': 1.85,
}

/** How long each lasts, in ms (its last part's end). */
export const CART_VOICE_MS: Readonly<Record<CartVoice, number>> = {
  'cart-look': 140,
  'cart-move': 160,
  'cart-stay': 60,
  'cart-nudge': 80,
  'cart-deliver': 390,
  'cart-done': 150,
  'cart-fanfare': 980,
}

const SOFT_SQUARE = { type: 'square', filter: { type: 'lowpass', frequency: 3000 } } as const

/** A small bell: a sine and a quiet inharmonic partial, ringing down. */
function bell(p: Patch, f: number, at: number, length: number, level: number) {
  p.tone({ type: 'sine', from: f, at, length, level, attack: 0.003 })
  p.tone({ type: 'sine', from: f * 2.76, at, length: length * 0.5, level: level * 0.25 })
}

/** The recipes. Times are seconds from the sound's start. */
function build(voice: CartVoice, p: Patch): void {
  switch (voice) {
    // Looking: a wobbly little "hm?" that rises and settles, the antenna tilting.
    case 'cart-look':
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
      return
    // Found it, goes left: a "boop-beep" going up, over a soft rumble of the wheels rolling.
    case 'cart-move':
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
      return
    // Stays right: a tiny breath of soft noise, almost silent; the stack just wobbles.
    case 'cart-stay':
      p.noise({
        at: 0,
        length: 0.06,
        level: 0.3,
        attack: 0.012,
        filter: { type: 'lowpass', frequency: 1500 },
      })
      return
    // A trade with itself: two light knocks on cardboard, like tapping the box.
    case 'cart-nudge':
      for (const at of [0, 0.05]) {
        p.noise({
          at,
          length: 0.03,
          level: 0.5,
          filter: { type: 'bandpass', frequency: 900, q: 4 },
        })
        p.tone({ type: 'triangle', from: 330, at, length: 0.03, level: 0.25, attack: 0.002 })
      }
      return
    // "Delivered!": a doorbell "ding-dong" with a hiss of steam as the lid opens.
    case 'cart-deliver': {
      bell(p, 1319, 0, 0.22, 0.4)
      bell(p, 1047, 0.14, 0.25, 0.4)
      const at = 0.12
      const length = 0.27
      p.noise({
        at,
        length,
        level: 0.12,
        env: [
          [length * 0.3, 1],
          [length, 0],
        ],
        filter: { type: 'bandpass', frequency: 3000, to: 7000, q: 0.8 },
      })
      return
    }
    // A range done: two quick blips and a higher one, a little robot "all set!".
    case 'cart-done':
      p.tone({ ...SOFT_SQUARE, from: 1175, at: 0, length: 0.035, level: 0.17, sustain: true })
      p.tone({ ...SOFT_SQUARE, from: 1175, at: 0.045, length: 0.035, level: 0.17, sustain: true })
      p.tone({ ...SOFT_SQUARE, from: 1568, at: 0.09, length: 0.06, level: 0.17, sustain: true })
      return
    // Finale: a toy horn goes "honk-honk!", then a run up into a bright wobbling chord.
    case 'cart-fanfare': {
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
      return
    }
  }
}

export interface CartSound {
  /** The sound's own gain node (its level is the recipe's gain). */
  readonly gain: GainNode
  readonly sources: readonly AudioScheduledSourceNode[]
  /** When it stops sounding (context seconds). */
  readonly end: number
}

/**
 * Schedules one cart sound at `when` (context seconds) into `out`. `cutMs`, if given and shorter
 * than the sound, ends it there, fading in `fadeMs`.
 */
export function playCartVoice(
  context: BaseAudioContext,
  out: AudioNode,
  voice: CartVoice,
  when: number,
  options: { readonly cutMs?: number; readonly fadeMs?: number } = {},
): CartSound {
  const gain = context.createGain()
  gain.gain.value = CART_GAINS[voice]
  gain.connect(out)
  const patch = new Patch(context, gain, when)
  build(voice, patch)
  const { cutMs, fadeMs = 12 } = options
  let end = when + CART_VOICE_MS[voice] / 1000
  if (cutMs !== undefined && cutMs < CART_VOICE_MS[voice]) {
    end = when + cutMs / 1000
    gain.gain.setValueAtTime(CART_GAINS[voice], Math.max(when, end - fadeMs / 1000))
    gain.gain.linearRampToValueAtTime(0, end)
  }
  return { gain, sources: patch.sources, end }
}

export function isCartVoice(voice: string): voice is CartVoice {
  return voice in CART_GAINS
}
