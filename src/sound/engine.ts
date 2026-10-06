/**
 * Plays the notes from cuesForStep with the Web Audio API. Plips, blips and splashes are made in code;
 * the quack is one small CC0 recording (see CREDITS.md), fetched only when sound is turned on.
 *
 * - Nothing is set up until sound is turned on, which happens on a tap (phones only allow
 *   audio after one).
 * - The latest step wins: a new step stops whatever the last one was still playing.
 * - Steps closer than MIN_GAP_MS (holding an arrow key) don't each start a sound: the newest
 *   one waits for the gap, replacing any that was waiting.
 * - At most MAX_VOICES sound at once, whatever a cue asks for.
 * - Every sound ends with a short fade, including one cut short or stopped by the next step,
 *   so nothing clicks.
 */
import { VOICE_MS, type Note } from './cues'
import quackUrl from './duck-quack.wav'

export const MIN_GAP_MS = 60
export const MAX_VOICES = 4
/** Overall loudness: present but never startling. */
const MASTER_GAIN = 0.2
/** How long a sound takes to fade out when it is cut short or stopped. */
export const FADE_MS = 12
/** Each voice's peak level. The quack sits a little below the splash, which must be heard. */
export const LEVELS = { quack: 0.6, plip: 0.4, blip: 0.8, splash: 1.6 } as const
/** A varied quack's pitch and speed move by up to this many semitones either way. */
export const QUACK_VARY_SEMITONES = 1.2

/** How long a note sounds: its own cut, or the voice's full length. */
const lengthOf = (note: Note): number => Math.min(note.duration ?? Infinity, VOICE_MS[note.voice])

/** The notes that may play: each starts while fewer than `max` earlier notes still sound. */
export function capVoices(notes: readonly Note[], max: number = MAX_VOICES): Note[] {
  const kept: Note[] = []
  for (const note of [...notes].sort((a, b) => a.at - b.at)) {
    const sounding = kept.filter((k) => k.at + lengthOf(k) > note.at).length
    if (sounding < max) kept.push(note)
  }
  return kept
}

interface Playing {
  readonly stop: () => void
}

/** Fetches and decodes the quack recording. */
async function fetchQuack(context: AudioContext): Promise<AudioBuffer> {
  const response = await fetch(quackUrl)
  return context.decodeAudioData(await response.arrayBuffer())
}

export interface SoundEngineOptions {
  /** Makes the AudioContext; tests pass a fake. */
  readonly createContext?: () => AudioContext
  /** The clock for the gap between steps; tests pass a fake. */
  readonly now?: () => number
  /** Loads the quack recording; tests pass a fake. */
  readonly loadQuack?: (context: AudioContext) => Promise<AudioBuffer>
  /** Random numbers in [0, 1) for varying quacks; tests pass a fixed one. */
  readonly random?: () => number
}

export class SoundEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private quack: AudioBuffer | null = null
  private quackLoading = false
  private playing: Playing[] = []
  private waiting: ReturnType<typeof setTimeout> | null = null
  private lastStart = -Infinity
  private enabled = false
  private readonly createContext: () => AudioContext
  private readonly now: () => number
  private readonly loadQuack: (context: AudioContext) => Promise<AudioBuffer>
  private readonly random: () => number

  constructor({
    createContext = () => new AudioContext(),
    now = () => performance.now(),
    loadQuack = fetchQuack,
    random = Math.random,
  }: SoundEngineOptions = {}) {
    this.createContext = createContext
    this.now = now
    this.loadQuack = loadQuack
    this.random = random
  }

  get isEnabled(): boolean {
    return this.enabled
  }

  /** Whether the quack recording is ready to play. */
  get hasQuack(): boolean {
    return this.quack !== null
  }

  /** Turns sound on or off. Turning it on should happen in a tap or click handler. */
  setEnabled(on: boolean): void {
    this.enabled = on
    if (!on) {
      this.stopAll()
      return
    }
    if (!this.context) {
      this.context = this.createContext()
      const compressor = this.context.createDynamicsCompressor()
      this.master = this.context.createGain()
      this.master.gain.value = MASTER_GAIN
      this.master.connect(compressor)
      compressor.connect(this.context.destination)
    }
    void this.context.resume()
    this.startLoadingQuack(this.context)
  }

  /** Plays one step's notes, replacing anything still sounding from the step before. */
  play(notes: readonly Note[]): void {
    if (!this.enabled || !this.context) return
    this.stopAll()
    if (notes.length === 0) return
    const wait = this.lastStart + MIN_GAP_MS - this.now()
    if (wait > 0) {
      this.waiting = setTimeout(() => {
        this.waiting = null
        this.start(notes)
      }, wait)
      return
    }
    this.start(notes)
  }

  /** Stops everything with a quick fade, including notes that were scheduled for later. */
  stopAll(): void {
    if (this.waiting !== null) {
      clearTimeout(this.waiting)
      this.waiting = null
    }
    for (const voice of this.playing) voice.stop()
    this.playing = []
  }

  private startLoadingQuack(context: AudioContext): void {
    if (this.quack || this.quackLoading) return
    this.quackLoading = true
    this.loadQuack(context)
      .then((buffer) => {
        this.quack = buffer
      })
      .catch(() => {
        // Offline or blocked: ducks stay quiet (the splash still plays); try again next time.
      })
      .finally(() => {
        this.quackLoading = false
      })
  }

  private start(notes: readonly Note[]): void {
    const context = this.context
    if (!context) return
    this.lastStart = this.now()
    const base = context.currentTime
    for (const note of capVoices(notes)) {
      const voice = this.voice(note, base + note.at / 1000)
      if (voice) this.playing.push(voice)
    }
  }

  /** One sound, scheduled at `when` (context seconds), with a soft start and end. */
  private voice(note: Note, when: number): Playing | null {
    const context = this.context
    const master = this.master
    if (!context || !master) return null
    const fade = FADE_MS / 1000
    let length = lengthOf(note) / 1000
    const gain = context.createGain()
    gain.connect(master)

    let source: AudioScheduledSourceNode
    const extra: AudioScheduledSourceNode[] = []
    if (note.voice === 'quack') {
      if (!this.quack) return null
      // A varied quack moves pitch and speed together by a little, like a real duck.
      const jitter = note.vary ? ((this.random() * 2 - 1) * QUACK_VARY_SEMITONES) / 12 : 0
      const rate = (note.rate ?? 1) * 2 ** jitter
      const level = LEVELS.quack * (note.vary ? 0.9 + this.random() * 0.1 : 1)
      const sample = context.createBufferSource()
      sample.buffer = this.quack
      sample.playbackRate.value = rate
      length = Math.min(length, this.quack.duration / rate)
      sample.connect(gain)
      source = sample
      gain.gain.setValueAtTime(0, when)
      gain.gain.linearRampToValueAtTime(level, when + 0.004)
      gain.gain.setValueAtTime(level, when + Math.max(0.004, length - fade))
      gain.gain.linearRampToValueAtTime(0, when + length)
    } else if (note.voice === 'plip') {
      // A drop of water: a pure tone that leaps up and dies away fast. Quiet on purpose.
      const frequency = note.frequency ?? 600
      const drop = context.createOscillator()
      drop.type = 'sine'
      drop.frequency.setValueAtTime(frequency, when)
      drop.frequency.exponentialRampToValueAtTime(frequency * 1.8, when + 0.035)
      drop.connect(gain)
      source = drop
      gain.gain.setValueAtTime(0, when)
      gain.gain.linearRampToValueAtTime(LEVELS.plip, when + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.001, when + length)
    } else if (note.voice === 'splash') {
      // Water, clearly heard: a burst of noise through a band sweeping down, over a low plunk.
      gain.gain.setValueAtTime(0, when)
      gain.gain.linearRampToValueAtTime(LEVELS.splash, when + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.001, when + length)
      const noise = context.createBufferSource()
      noise.buffer = this.noiseBuffer(context)
      const band = context.createBiquadFilter()
      band.type = 'bandpass'
      band.Q.value = 0.8
      band.frequency.setValueAtTime(3000, when)
      band.frequency.exponentialRampToValueAtTime(500, when + length)
      noise.connect(band)
      band.connect(gain)
      source = noise
      const plunk = context.createOscillator()
      plunk.type = 'sine'
      plunk.frequency.setValueAtTime(320, when)
      plunk.frequency.exponentialRampToValueAtTime(110, when + length * 0.5)
      const plunkGain = context.createGain()
      plunkGain.gain.value = 0.6
      plunk.connect(plunkGain)
      plunkGain.connect(gain)
      extra.push(plunk)
    } else {
      // A soft retro blip, an octave lower, with the edge filtered off.
      gain.gain.setValueAtTime(0, when)
      gain.gain.linearRampToValueAtTime(LEVELS.blip, when + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, when + length)
      const oscillator = context.createOscillator()
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime((note.frequency ?? 0) / 2, when)
      const soft = context.createBiquadFilter()
      soft.type = 'lowpass'
      soft.frequency.value = 2500
      oscillator.connect(soft)
      soft.connect(gain)
      source = oscillator
    }
    for (const node of [source, ...extra]) {
      node.start(when)
      node.stop(when + length + 0.02)
    }
    return {
      stop: () => {
        // Fade from wherever the level is now, then stop: a cut, never a click.
        const now = context.currentTime
        gain.gain.cancelScheduledValues(now)
        gain.gain.setValueAtTime(gain.gain.value, now)
        gain.gain.linearRampToValueAtTime(0, now + fade)
        for (const node of [source, ...extra]) {
          try {
            node.stop(now + fade)
          } catch {
            // Already stopped or never started: nothing to do.
          }
        }
      },
    }
  }

  private noiseBuffer(context: AudioContext): AudioBuffer {
    if (this.noise) return this.noise
    const length = Math.ceil(context.sampleRate * (VOICE_MS.splash / 1000))
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let k = 0; k < data.length; k++) data[k] = Math.random() * 2 - 1
    this.noise = buffer
    return buffer
  }
}
