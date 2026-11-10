/**
 * Heap sort's builder beaver's sounds, all made in code: no recording. Juan picked them from three
 * versions each on the listening page (PR #116, `/design/beaver-sounds`): the sniff-sniff as it
 * looks at a family, the eep! as it finds a bigger child, the log roll up of a climb, the shrug
 * puff of a stop, the drumroll and pile of the haul to the woodpile, the tail pat and "eh?" as Do
 * it's question waits, and the marimba fanfare for the finale.
 *
 * Built like the pizza cart's (cartVoices.ts), on the shared `Patch` (`tone` and `noise`). Each
 * sound has its own gain into the engine's master (0.2, then a compressor), the chain the gains
 * were set through on the listening page, by measurement against the cart's (RMS over the sounding
 * 10 ms windows, and the peak): the frequent sounds 0.025–0.036 RMS, the stop the quietest
 * (0.009), the haul the special (0.064, the loudest peak: 0.50), the finale a celebration (0.062,
 * peak 0.48). The cart's, for comparison: 0.030–0.038, 0.012, 0.066 (peak 0.40) and 0.096.
 */
import { Patch } from './spaceshipVoices'

export type BeaverVoice =
  | 'beaver-look'
  | 'beaver-found'
  | 'beaver-climb'
  | 'beaver-stop'
  | 'beaver-haul'
  | 'beaver-turn'
  | 'beaver-fanfare'

/** Each sound's own gain, from the listening page's measurements. */
export const BEAVER_GAINS: Readonly<Record<BeaverVoice, number>> = {
  'beaver-look': 5.25,
  'beaver-found': 1.7,
  'beaver-climb': 3.1,
  'beaver-stop': 3.3,
  'beaver-haul': 2.75,
  'beaver-turn': 2.4,
  'beaver-fanfare': 3.2,
}

/** How long each lasts, in ms (its last part's end). */
export const BEAVER_VOICE_MS: Readonly<Record<BeaverVoice, number>> = {
  'beaver-look': 120,
  'beaver-found': 100,
  'beaver-climb': 185,
  'beaver-stop': 90,
  'beaver-haul': 480,
  'beaver-turn': 190,
  'beaver-fanfare': 1400,
}

/** When the haul's logs land on the pile (ms from its start): placed on the stack's set-down. */
export const BEAVER_HAUL_HIT_MS = 390

/** A hollow wood knock: a short band of noise and a low triangle, like tapping a log. */
function knock(p: Patch, f: number, at: number, level: number, length: number) {
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
function thud(p: Patch, at: number, level: number, from: number, length: number) {
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

/** The recipes. Times are seconds from the sound's start. */
function build(voice: BeaverVoice, p: Patch): void {
  switch (voice) {
    // Looking: two tiny rising sniffs, the beaver noses up at the family.
    case 'beaver-look':
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
      return
    // Found a bigger one: a chirpy little squeak that leaps up, the beaver surprised.
    case 'beaver-found':
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
      return
    // A climb: four quick woody knocks climbing in pitch, the stack bumping up a ramp.
    case 'beaver-climb':
      for (const [k, f] of [262, 294, 330, 392].entries()) knock(p, f, k * 0.045, 0.28, 0.05)
      return
    // A stop: a tiny falling breath of air, "eh, fine."
    case 'beaver-stop':
      p.noise({
        at: 0,
        length: 0.09,
        level: 0.25,
        attack: 0.02,
        filter: { type: 'lowpass', frequency: 1400, to: 500 },
      })
      return
    // The haul: a woody drumroll building as it hauls, then three logs clatter onto the pile with
    // a ding (at BEAVER_HAUL_HIT_MS).
    case 'beaver-haul':
      for (let k = 0; k < 10; k++) knock(p, 330, k * 0.038, 0.1 + k * 0.025, 0.03)
      thud(p, 0.39, 0.6, 170, 0.07)
      thud(p, 0.42, 0.5, 150, 0.06)
      thud(p, 0.445, 0.45, 190, 0.035)
      bell(p, 1568, 0.39, 0.09, 0.22)
      return
    // Your turn (Do it): a soft flat pat of the paddle tail, then a tiny rising chirp.
    case 'beaver-turn':
      p.noise({ at: 0, length: 0.05, level: 0.45, filter: { type: 'lowpass', frequency: 900 } })
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
      return
    // The finale: a log thud on the downbeat, a marimba run up two octaves, and a ringing chord
    // with a bell.
    case 'beaver-fanfare':
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
      return
  }
}

export interface BeaverSound {
  /** The sound's own gain node (its level is the recipe's gain). */
  readonly gain: GainNode
  readonly sources: readonly AudioScheduledSourceNode[]
  /** When it stops sounding (context seconds). */
  readonly end: number
}

/**
 * Schedules one beaver sound at `when` (context seconds) into `out`. `cutMs`, if given and shorter
 * than the sound, ends it there, fading in `fadeMs`.
 */
export function playBeaverVoice(
  context: BaseAudioContext,
  out: AudioNode,
  voice: BeaverVoice,
  when: number,
  options: { readonly cutMs?: number; readonly fadeMs?: number } = {},
): BeaverSound {
  const gain = context.createGain()
  gain.gain.value = BEAVER_GAINS[voice]
  gain.connect(out)
  const patch = new Patch(context, gain, when)
  build(voice, patch)
  const { cutMs, fadeMs = 12 } = options
  let end = when + BEAVER_VOICE_MS[voice] / 1000
  if (cutMs !== undefined && cutMs < BEAVER_VOICE_MS[voice]) {
    end = when + cutMs / 1000
    gain.gain.setValueAtTime(BEAVER_GAINS[voice], Math.max(when, end - fadeMs / 1000))
    gain.gain.linearRampToValueAtTime(0, end)
  }
  return { gain, sources: patch.sources, end }
}

export function isBeaverVoice(voice: string): voice is BeaverVoice {
  return voice in BEAVER_GAINS
}
