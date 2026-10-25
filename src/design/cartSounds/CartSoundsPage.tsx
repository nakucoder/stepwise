/**
 * TEMPORARY (sounds/quick-sort-cart, DO NOT MERGE): the pizza cart's sound options, A, B and C for
 * each of its seven sounds. Not linked from the site's menus; reached at /design/cart-sounds on
 * the PR preview. Every sound plays through the engine's chain (its gain, the master 0.2, the
 * compressor). A full round plays one quick sort of the site's default list with one set (or a
 * mix of picks), at the chosen speed.
 */
import { useEffect, useRef, useState } from 'react'
import { SPEEDS, type Speed } from '../../engine/player'
import { ROUND_INPUT, roundSchedule } from './round'
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
import './CartSounds.css'

type Mix = Readonly<Record<Slot, Version>>
type Levels = Partial<Record<`${Slot}-${Version}`, Level>>

const ALL = (v: Version): Mix =>
  Object.fromEntries(SLOTS.map((slot) => [slot, v])) as Record<Slot, Version>

export function CartSoundsPage() {
  const context = useRef<AudioContext | null>(null)
  const master = useRef<GainNode | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [speed, setSpeed] = useState<Speed>(1)
  const [mix, setMix] = useState<Mix>(ALL('A'))
  const [playing, setPlaying] = useState<string | null>(null)
  const [levels, setLevels] = useState<Levels | null>(null)
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
    const round = roundSchedule(speed, OPTIONS.finale[picks.finale].ms)
    const { ctx, out, t0 } = start(`A full round, ${label}, at ${String(speed)}×`, round.ms)
    for (const note of round.notes) {
      const option = OPTIONS[note.slot][picks[note.slot]]
      playOption(ctx, out, option, t0 + note.at / 1000, note.room)
    }
  }

  const measureAll = async () => {
    setMeasuring(true)
    const found: Levels = {}
    for (const slot of SLOTS) {
      for (const v of VERSIONS) found[`${slot}-${v}`] = await measure(OPTIONS[slot][v])
    }
    setLevels(found)
    setMeasuring(false)
  }

  return (
    <main className="cart-sounds" id="main">
      <h1>Pizza cart sounds: options</h1>
      <p className="cart-sounds-note">
        Temporary page for picking quick sort’s pizza cart sounds (not linked from the site, not
        wired into Watch or Do it). Three versions of each sound, all made in code, played through
        the site’s own sound chain. Lengths are each sound’s full length; every one fits its moment
        at 4×.
      </p>

      <section className="cart-sounds-round" aria-labelledby="round-title">
        <h2 id="round-title">Play a full round</h2>
        <p>
          One quick sort of {ROUND_INPUT.join(' ')} with the cart’s moments, as in Watch (picking
          the leader is silent).
        </p>
        <div className="cart-sounds-row">
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
          {VERSIONS.map((v) => (
            <button
              key={v}
              type="button"
              className="cart-sounds-button"
              onClick={() => {
                playRound(`all ${v}`, ALL(v))
              }}
            >
              ▶ Round, all {v}
            </button>
          ))}
          <button
            type="button"
            className="cart-sounds-button"
            onClick={() => {
              playRound('my mix', mix)
            }}
          >
            ▶ Round, my mix
          </button>
          <button type="button" className="cart-sounds-button is-stop" onClick={stop}>
            ■ Stop
          </button>
        </div>
        <p className="cart-sounds-status" role="status">
          {playing ? `Playing: ${playing}` : 'Nothing playing.'}
        </p>
      </section>

      {SLOTS.map((slot) => {
        const info = SLOT_INFO[slot]
        return (
          <section key={slot} className="cart-sounds-slot" aria-labelledby={`slot-${slot}`}>
            <h2 id={`slot-${slot}`}>{info.title}</h2>
            <p className="cart-sounds-moment">
              {info.moment} <span className="cart-sounds-budget">Room: {info.budget}.</span>
            </p>
            <div className="cart-sounds-options">
              {VERSIONS.map((v) => {
                const option = OPTIONS[slot][v]
                const level = levels?.[`${slot}-${v}`]
                const picked = mix[slot] === v
                return (
                  <div key={v} className="cart-sounds-option">
                    <button
                      type="button"
                      className="cart-sounds-button"
                      onClick={() => {
                        playOne(slot, v)
                      }}
                    >
                      ▶ {v}. {option.name}
                    </button>
                    <p>{option.line}</p>
                    <p className="cart-sounds-meta">
                      {option.ms} ms
                      {level
                        ? ` · RMS ${level.rms.toFixed(3)} · peak ${level.peak.toFixed(2)}`
                        : ''}
                    </p>
                    <button
                      type="button"
                      className={`cart-sounds-pick${picked ? ' is-picked' : ''}`}
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

      <section className="cart-sounds-round" aria-labelledby="levels-title">
        <h2 id="levels-title">Levels</h2>
        <p>
          Renders every option through the chain offline and shows its RMS (over the sounding 10 ms
          windows) and peak, measured as the other characters’ were. For comparison: the spaceships’
          lock-on is RMS 0.033 (peak 0.07), their fly-by 0.048 (0.23), their gate 0.107 (0.43) and
          their fanfare 0.113 (0.29).
        </p>
        <button
          type="button"
          className="cart-sounds-button"
          disabled={measuring}
          onClick={() => {
            void measureAll()
          }}
        >
          {measuring ? 'Measuring…' : 'Measure levels'}
        </button>
        {levels && <p>Shown under each option.</p>}
      </section>
    </main>
  )
}
