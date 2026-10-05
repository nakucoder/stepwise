import type { CSSProperties, ReactNode } from 'react'
import { SPEEDS } from '../engine/player'
import type { Player } from '../hooks/usePlayer'

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M6 5h2v14H6zM20 5v14L9 12z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M7 4v16l13-8z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  )
}

function StepIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M16 5h2v14h-2zM4 5v14l11-7z" />
    </svg>
  )
}

const speedLabel = (speed: number) => `${String(speed)}×`

interface PlayerControlsProps {
  readonly player: Player | null
  /**
   * "phone": no key hints, one Speed button that cycles through the speeds, and the progress
   * as a thin bar. Laid out at the bottom (portrait) or down the right edge (landscape).
   */
  readonly layout?: 'desktop' | 'phone'
  /** Phone only: one more control after Speed (the Sound button). */
  readonly extra?: ReactNode
}

/**
 * The chunky playback bar from design D. Back and Step use aria-disabled at the ends rather
 * than disabled, so a keyboard user who steps to the end doesn't lose focus.
 * With no player (an algorithm that isn't built yet), everything is truly disabled.
 */
export function PlayerControls({ player, layout = 'desktop', extra }: PlayerControlsProps) {
  const ready = player !== null && player.state.frameCount > 0
  const playing = player?.state.status === 'playing'
  const atStart = !ready || player.isAtStart
  const atEnd = !ready || player.isAtEnd
  const isPhone = layout === 'phone'
  const currentSpeed = player?.state.speed ?? 1
  const progress = ready
    ? `Step ${String(player.state.index + 1)} of ${String(player.state.frameCount)}`
    : 'No steps yet'

  if (isPhone) {
    const fraction = ready ? (player.state.index + 1) / player.state.frameCount : 0
    const nextSpeed = SPEEDS[(SPEEDS.indexOf(currentSpeed) + 1) % SPEEDS.length] ?? 1
    return (
      <div className="controls controls-phone" role="group" aria-label="Playback">
        <p className="progress" style={{ '--done': fraction } as CSSProperties}>
          <span>{progress}</span>
        </p>
        <button
          type="button"
          className="control"
          disabled={!ready}
          aria-disabled={atStart}
          onClick={atStart ? undefined : player.stepBack}
          aria-keyshortcuts="ArrowLeft"
        >
          <BackIcon />
          Back
        </button>
        <button
          type="button"
          className="control control-play"
          disabled={!ready || player.state.frameCount < 2}
          onClick={player?.togglePlay}
          aria-keyshortcuts="Space"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="control"
          disabled={!ready}
          aria-disabled={atEnd}
          onClick={atEnd ? undefined : player.stepForward}
          aria-keyshortcuts="ArrowRight"
        >
          <StepIcon />
          Step
        </button>
        <button
          type="button"
          className="control control-speed"
          disabled={!ready}
          aria-label={`Speed ${speedLabel(currentSpeed)}. Change to ${speedLabel(nextSpeed)}`}
          onClick={() => {
            player?.setSpeed(nextSpeed)
          }}
        >
          {speedLabel(currentSpeed)}
        </button>
        {extra}
      </div>
    )
  }

  return (
    <div className="controls" role="group" aria-label="Playback">
      <button
        type="button"
        className="control"
        disabled={!ready}
        aria-disabled={atStart}
        // At the start there is nothing to go back to; don't let the click pause playback.
        onClick={atStart ? undefined : player.stepBack}
        aria-keyshortcuts="ArrowLeft"
      >
        <BackIcon />
        Back <kbd aria-hidden="true">←</kbd>
      </button>
      <button
        type="button"
        className="control control-play"
        disabled={!ready || player.state.frameCount < 2}
        onClick={player?.togglePlay}
        aria-keyshortcuts="Space"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
        {playing ? 'Pause' : 'Play'} <kbd aria-hidden="true">space</kbd>
      </button>
      <button
        type="button"
        className="control"
        disabled={!ready}
        aria-disabled={atEnd}
        onClick={atEnd ? undefined : player.stepForward}
        aria-keyshortcuts="ArrowRight"
      >
        <StepIcon />
        Step <kbd aria-hidden="true">→</kbd>
      </button>
      <div className="speed" role="group" aria-labelledby="speed-label">
        <span id="speed-label">Speed</span>
        <div className="speed-steps">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              aria-pressed={currentSpeed === speed}
              disabled={!ready}
              onClick={() => {
                player?.setSpeed(speed)
              }}
            >
              {speedLabel(speed)}
            </button>
          ))}
        </div>
      </div>
      <p className="progress">{progress}</p>
    </div>
  )
}
