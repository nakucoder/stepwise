/**
 * TEMPORARY (design/robot, never merged): the robot's four candidate sounds, made in code with
 * Web Audio (no recordings, nothing to license). Nothing is created until a button is tapped,
 * so the page is silent until then. Levels match src/sound/engine.ts (master 0.2, compressed).
 *
 * The rule from the ducks: frequent events soft (scan), the special moment the robot's own
 * sound (lock-on, the claw), the finale a celebration.
 */

export type RobotSound = 'scan' | 'lock' | 'claw' | 'finale'

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

/** A short tone with a quick start and a fade, through an optional low-pass filter. */
function tone(
  a: { context: AudioContext; master: GainNode },
  options: {
    readonly type: OscillatorType
    readonly from: number
    readonly to?: number
    readonly at: number
    readonly length: number
    readonly level: number
    readonly lowpass?: number
  },
): void {
  const { context: c, master: out } = a
  const when = c.currentTime + options.at
  const end = when + options.length
  const oscillator = c.createOscillator()
  oscillator.type = options.type
  oscillator.frequency.setValueAtTime(options.from, when)
  if (options.to !== undefined) oscillator.frequency.exponentialRampToValueAtTime(options.to, end)
  const gain = c.createGain()
  gain.gain.setValueAtTime(0, when)
  gain.gain.linearRampToValueAtTime(options.level, when + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.001, end)
  let node: AudioNode = oscillator
  if (options.lowpass !== undefined) {
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = options.lowpass
    oscillator.connect(filter)
    node = filter
  } else {
    oscillator.connect(gain)
  }
  if (node !== oscillator) node.connect(gain)
  gain.connect(out)
  oscillator.start(when)
  oscillator.stop(end + 0.02)
}

/** A burst of noise (made in code), low-passed: the body of the clunk. */
function noise(
  a: { context: AudioContext; master: GainNode },
  at: number,
  length: number,
  level: number,
  lowpass: number,
): void {
  const { context: c, master: out } = a
  const when = c.currentTime + at
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * length), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let k = 0; k < data.length; k++) data[k] = Math.random() * 2 - 1
  const source = c.createBufferSource()
  source.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = lowpass
  const gain = c.createGain()
  gain.gain.setValueAtTime(level, when)
  gain.gain.exponentialRampToValueAtTime(0.001, when + length)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(out)
  source.start(when)
}

/** Plays one of the robot's sounds. Only ever called from a tap. */
export function playRobotSound(sound: RobotSound): void {
  const a = audio()
  if (!a) return
  if (sound === 'scan') {
    // Soft: a short, rounded beep, like the bars' blip but sine and quieter (it plays a lot).
    tone(a, { type: 'sine', from: 880, at: 0, length: 0.07, level: 1.3 })
  } else if (sound === 'lock') {
    // A quick two-note chirp going up, with a little upward slide on the second note.
    tone(a, { type: 'triangle', from: 1175, at: 0, length: 0.05, level: 0.85 })
    tone(a, { type: 'triangle', from: 1568, to: 1760, at: 0.055, length: 0.07, level: 0.85 })
  } else if (sound === 'claw') {
    // The servo whirrs as the claw moves (a gliding buzz, filtered so it isn't harsh), then the
    // crate lands with a clunk (a low thump plus a short burst of noise).
    tone(a, {
      type: 'sawtooth',
      from: 160,
      to: 320,
      at: 0,
      length: 0.32,
      level: 0.7,
      lowpass: 900,
    })
    tone(a, {
      type: 'sawtooth',
      from: 320,
      to: 240,
      at: 0.34,
      length: 0.16,
      level: 0.6,
      lowpass: 900,
    })
    tone(a, { type: 'sine', from: 110, to: 55, at: 0.52, length: 0.16, level: 0.9 })
    noise(a, 0.52, 0.08, 0.6, 700)
  } else {
    // A celebration: a rising run of beeps (one per crate), then a happy "beep-boop".
    const run = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]
    run.forEach((frequency, k) => {
      tone(a, {
        type: 'square',
        from: frequency,
        at: k * 0.09,
        length: 0.08,
        level: 0.45,
        lowpass: 2400,
      })
    })
    tone(a, { type: 'square', from: 1568, at: 0.62, length: 0.1, level: 0.45, lowpass: 2400 })
    tone(a, {
      type: 'square',
      from: 523.25,
      to: 784,
      at: 0.74,
      length: 0.22,
      level: 0.4,
      lowpass: 2000,
    })
  }
}
