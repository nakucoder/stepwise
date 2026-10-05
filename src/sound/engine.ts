/**
 * Plays the notes from cuesForStep with the Web Audio API: no audio files, no dependencies.
 *
 * - Nothing is set up until sound is turned on, which happens on a tap (phones only allow
 *   audio after one).
 * - The latest step wins: a new step stops whatever the last one was still playing.
 * - Steps closer than MIN_GAP_MS (holding an arrow key) don't each start a sound: the newest
 *   one waits for the gap, replacing any that was waiting.
 * - At most MAX_VOICES sound at once, whatever a cue asks for.
 */
import { VOICE_MS, type Note, type Voice } from './cues'

export const MIN_GAP_MS = 60
export const MAX_VOICES = 4
/** Overall loudness: present but never startling. */
const MASTER_GAIN = 0.2

/** The notes that may play: each starts while fewer than `max` earlier notes still sound. */
export function capVoices(notes: readonly Note[], max: number = MAX_VOICES): Note[] {
  const kept: Note[] = []
  for (const note of [...notes].sort((a, b) => a.at - b.at)) {
    const sounding = kept.filter((k) => k.at + VOICE_MS[k.voice] > note.at).length
    if (sounding < max) kept.push(note)
  }
  return kept
}

interface Playing {
  readonly stop: () => void
}

export interface SoundEngineOptions {
  /** Makes the AudioContext; tests pass a fake. */
  readonly createContext?: () => AudioContext
  /** The clock for the gap between steps; tests pass a fake. */
  readonly now?: () => number
}

export class SoundEngine {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private playing: Playing[] = []
  private waiting: ReturnType<typeof setTimeout> | null = null
  private lastStart = -Infinity
  private enabled = false
  private readonly createContext: () => AudioContext
  private readonly now: () => number

  constructor({
    createContext = () => new AudioContext(),
    now = () => performance.now(),
  }: SoundEngineOptions = {}) {
    this.createContext = createContext
    this.now = now
  }

  get isEnabled(): boolean {
    return this.enabled
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

  /** Stops everything now, including notes that were scheduled for later. */
  stopAll(): void {
    if (this.waiting !== null) {
      clearTimeout(this.waiting)
      this.waiting = null
    }
    for (const voice of this.playing) voice.stop()
    this.playing = []
  }

  private start(notes: readonly Note[]): void {
    const context = this.context
    if (!context) return
    this.lastStart = this.now()
    const base = context.currentTime
    for (const note of capVoices(notes)) {
      const when = base + note.at / 1000
      this.playing.push(this.voice(note.voice, note.frequency ?? 0, when))
    }
  }

  /** One sound, scheduled at `when` (context seconds), with a soft envelope so it never clicks. */
  private voice(kind: Voice, frequency: number, when: number): Playing {
    const context = this.context
    const master = this.master
    if (!context || !master) return { stop: () => undefined }
    const length = VOICE_MS[kind] / 1000
    const gain = context.createGain()
    gain.gain.setValueAtTime(0, when)
    gain.gain.linearRampToValueAtTime(kind === 'splash' ? 0.5 : 0.8, when + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.001, when + length)
    gain.connect(master)

    let source: AudioScheduledSourceNode
    if (kind === 'splash') {
      // A burst of noise through a band that sweeps down: water, not hiss.
      const noise = context.createBufferSource()
      noise.buffer = this.noiseBuffer(context)
      const band = context.createBiquadFilter()
      band.type = 'bandpass'
      band.Q.value = 1.2
      band.frequency.setValueAtTime(2400, when)
      band.frequency.exponentialRampToValueAtTime(600, when + length)
      noise.connect(band)
      band.connect(gain)
      source = noise
    } else {
      const oscillator = context.createOscillator()
      if (kind === 'squeak') {
        // A rubber duck: a reedy tone with a quick chirp up into its note, then held steady so
        // the pitch is easy to hear.
        oscillator.type = 'sawtooth'
        oscillator.frequency.setValueAtTime(frequency * 0.94, when)
        oscillator.frequency.exponentialRampToValueAtTime(frequency, when + 0.025)
        const band = context.createBiquadFilter()
        band.type = 'bandpass'
        band.Q.value = 6
        band.frequency.value = frequency * 2
        oscillator.connect(band)
        band.connect(gain)
      } else {
        // A soft retro blip, an octave lower, with the edge filtered off.
        oscillator.type = 'square'
        oscillator.frequency.setValueAtTime(frequency / 2, when)
        const soft = context.createBiquadFilter()
        soft.type = 'lowpass'
        soft.frequency.value = 2500
        oscillator.connect(soft)
        soft.connect(gain)
      }
      source = oscillator
    }
    source.start(when)
    source.stop(when + length + 0.02)
    return {
      stop: () => {
        const now = context.currentTime
        gain.gain.cancelScheduledValues(now)
        gain.gain.setValueAtTime(0, now)
        try {
          source.stop(now)
        } catch {
          // Already stopped or never started: nothing to do.
        }
      },
    }
  }

  private noiseBuffer(context: AudioContext): AudioBuffer {
    if (this.noise) return this.noise
    const length = Math.ceil(context.sampleRate * (VOICE_MS.splash / 1000))
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let k = 0; k < length; k++) data[k] = Math.random() * 2 - 1
    this.noise = buffer
    return buffer
  }
}
