/**
 * TEMPORARY (sounds/heap-sort-beaver, DO NOT MERGE): heap sort's builder beaver's sound options,
 * A, B and C for each of its seven sounds. Not linked from the site's menus; reached at
 * /design/beaver-sounds on the PR preview. Every sound plays through the engine's chain (its gain,
 * the master 0.2, the compressor). A full round plays one heap sort of the site's default list
 * with one set (or a mix of picks), at the chosen speed, as in Watch or as in Do it.
 */
import { useEffect, useRef, useState } from 'react'
import { SPEEDS, type Speed } from '../../engine/player'
import { CART_VOICE_MS, playCartVoice, type CartVoice } from '../../sound/cartVoices'
import { placeNote, ROUND_INPUT, roundSchedule, type RoundMode } from './round'
import {
  makeChain,
  measure,
  OPTIONS,
  playOption,
  SLOT_INFO,
  SLOTS,
  VERSIONS,
  type Level,
  type Slot,
  type Version,
} from './voices'
import './BeaverSounds.css'

type Mix = Readonly<Record<Slot, Version>>
type Levels = Partial<Record<`${Slot}-${Version}`, Level>>

const ALL = (v: Version): Mix =>
  Object.fromEntries(SLOTS.map((slot) => [slot, v])) as Record<Slot, Version>

/** The cart's real sounds, measured beside the options for comparison. */
const CART_REFERENCE: readonly (readonly [CartVoice, string])[] = [
  ['cart-look', 'looking'],
  ['cart-stay', 'stays right (its calmest)'],
  ['cart-move', 'goes left'],
  ['cart-deliver', 'Delivered! (its special)'],
  ['cart-fanfare', 'finale'],
]

export function BeaverSoundsPage() {
  const context = useRef<AudioContext | null>(null)
  const master = useRef<GainNode | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [speed, setSpeed] = useState<Speed>(1)
  const [mode, setMode] = useState<RoundMode>('watch')
  const [mix, setMix] = useState<Mix>(ALL('A'))
  const [playing, setPlaying] = useState<string | null>(null)
  const [levels, setLevels] = useState<Levels | null>(null)
  const [cartLevels, setCartLevels] = useState<Partial<Record<CartVoice, Level>> | null>(null)
  const [measuring, setMeasuring] = useState(false)

  const stop = () => {
    master.current?.disconnect()
    master.current = null
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    setPlaying(null)
  }

  useEffect(
    () => () => {
      master.current?.disconnect()
      if (timer.current !== null) clearTimeout(timer.current)
      void context.current?.close()
    },
    [],
  )

  /** A fresh chain for each play, so a new play stops the last one. */
  const start = (label: string, ms: number) => {
    stop()
    context.current ??= new AudioContext()
    const ctx = context.current
    void ctx.resume()
    const out = makeChain(ctx)
    master.current = out
    setPlaying(label)
    timer.current = setTimeout(() => {
      setPlaying(null)
    }, ms + 100)
    return { ctx, out, t0: ctx.currentTime + 0.05 }
  }

  const playOne = (slot: Slot, v: Version) => {
    const option = OPTIONS[slot][v]
    const { ctx, out, t0 } = start(`${SLOT_INFO[slot].title} ${v}`, option.ms)
    playOption(ctx, out, option, t0)
  }

  const playRound = (label: string, picks: Mix) => {
    const round = roundSchedule(speed, OPTIONS.finale[picks.finale].ms, mode)
    const how = mode === 'doit' ? 'as in Do it' : 'as in Watch'
    const { ctx, out, t0 } = start(`A full round, ${label}, ${how}, at ${String(speed)}×`, round.ms)
    for (const note of round.notes) {
      const option = OPTIONS[note.slot][picks[note.slot]]
      const { start: at, room } = placeNote(note, option.hitMs)
      playOption(ctx, out, option, t0 + at / 1000, room)
    }
  }

  const measureAll = async () => {
    setMeasuring(true)
    const found: Levels = {}
    for (const slot of SLOTS) {
      for (const v of VERSIONS) {
        const option = OPTIONS[slot][v]
        found[`${slot}-${v}`] = await measure((c, out, when) => {
          playOption(c, out, option, when)
        }, option.ms)
      }
    }
    const cart: Partial<Record<CartVoice, Level>> = {}
    for (const [voice] of CART_REFERENCE) {
      cart[voice] = await measure((c, out, when) => {
        playCartVoice(c, out, voice, when)
      }, CART_VOICE_MS[voice])
    }
    setLevels(found)
    setCartLevels(cart)
    setMeasuring(false)
  }

  return (
    <main className="beaver-sounds" id="main">
      <h1>Builder beaver sounds: options</h1>
      <p className="beaver-sounds-note">
        Temporary page for picking heap sort’s builder beaver sounds (not linked from the site, not
        wired into Watch or Do it). Three versions of each sound, all made in code, played through
        the site’s own sound chain. Lengths are each sound’s full length; every one fits its moment
        at 4×.
      </p>

      <section className="beaver-sounds-round" aria-labelledby="round-title">
        <h2 id="round-title">Play a full round</h2>
        <p>
          One heap sort of {ROUND_INPUT.join(' ')} with the beaver’s moments and their real timing
          (starting, settling and the handover are silent). As in Do it, “Your turn!” plays each
          time a question waits, and a pretend learner answers after a moment.
        </p>
        <div className="beaver-sounds-row">
          <label>
            Speed{' '}
            <select
              value={speed}
              onChange={(e) => {
                setSpeed(Number(e.target.value) as Speed)
              }}
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </label>
          <label>
            Play as{' '}
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as RoundMode)
              }}
            >
              <option value="watch">Watch</option>
              <option value="doit">Do it</option>
            </select>
          </label>
          {VERSIONS.map((v) => (
            <button
              key={v}
              type="button"
              className="beaver-sounds-button"
              onClick={() => {
                playRound(`all ${v}`, ALL(v))
              }}
            >
              ▶ Round, all {v}
            </button>
          ))}
          <button
            type="button"
            className="beaver-sounds-button"
            onClick={() => {
              playRound('my mix', mix)
            }}
          >
            ▶ Round, my mix
          </button>
          <button type="button" className="beaver-sounds-button is-stop" onClick={stop}>
            ■ Stop
          </button>
        </div>
        <p className="beaver-sounds-status" role="status">
          {playing ? `Playing: ${playing}` : 'Nothing playing.'}
        </p>
      </section>

      {SLOTS.map((slot) => {
        const info = SLOT_INFO[slot]
        return (
          <section key={slot} className="beaver-sounds-slot" aria-labelledby={`slot-${slot}`}>
            <h2 id={`slot-${slot}`}>{info.title}</h2>
            <p className="beaver-sounds-moment">
              {info.moment} <span className="beaver-sounds-budget">Room: {info.budget}.</span>
            </p>
            <div className="beaver-sounds-options">
              {VERSIONS.map((v) => {
                const option = OPTIONS[slot][v]
                const level = levels?.[`${slot}-${v}`]
                const picked = mix[slot] === v
                return (
                  <div key={v} className="beaver-sounds-option">
                    <button
                      type="button"
                      className="beaver-sounds-button"
                      onClick={() => {
                        playOne(slot, v)
                      }}
                    >
                      ▶ {v}. {option.name}
                    </button>
                    <p>{option.line}</p>
                    <p className="beaver-sounds-meta">
                      {option.ms} ms
                      {option.hitMs !== undefined ? ` · thud at ${String(option.hitMs)} ms` : ''}
                      {level
                        ? ` · RMS ${level.rms.toFixed(3)} · peak ${level.peak.toFixed(2)}`
                        : ''}
                    </p>
                    <button
                      type="button"
                      className={`beaver-sounds-pick${picked ? ' is-picked' : ''}`}
                      aria-pressed={picked}
                      onClick={() => {
                        setMix({ ...mix, [slot]: v })
                      }}
                    >
                      {picked ? '✓ In my mix' : 'Use in my mix'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      <section className="beaver-sounds-round" aria-labelledby="levels-title">
        <h2 id="levels-title">Levels</h2>
        <p>
          Renders every option through the chain offline and shows its RMS (over the sounding 10 ms
          windows) and peak, measured as the other characters’ were, beside the pizza cart’s real
          sounds for comparison.
        </p>
        <button
          type="button"
          className="beaver-sounds-button"
          disabled={measuring}
          onClick={() => {
            void measureAll()
          }}
        >
          {measuring ? 'Measuring…' : 'Measure levels'}
        </button>
        {levels && <p>Shown under each option.</p>}
        {cartLevels && (
          <ul className="beaver-sounds-reference">
            {CART_REFERENCE.map(([voice, label]) => {
              const level = cartLevels[voice]
              return (
                <li key={voice}>
                  Pizza cart, {label}: RMS {level?.rms.toFixed(3)} · peak {level?.peak.toFixed(2)}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
