import type { ReactNode, Ref } from 'react'
import type { DoItPhase } from '../engine/doIt'
import type { Level } from '../engine/types'
import { DO_IT_KINDS, type DecisionKind } from './doItKinds'
import { doItWords } from './doItText'

function TradeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
        d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"
      />
    </svg>
  )
}

function KeepIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="none" stroke="currentColor" strokeWidth="2.5" d="M4 9h16M4 15h16" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7v.5"
      />
      <rect x="11" y="16.5" width="2" height="2" fill="currentColor" />
    </svg>
  )
}

function StartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M7 4v16l13-8z" />
    </svg>
  )
}

interface AnswerBarProps {
  readonly phase: DoItPhase
  /** Explorer answers with Trade places / Keep them; Engineer swaps on the stage. */
  readonly level: Level
  /** The kind of decision being asked: its answers' labels and keys (doItKinds.ts). */
  readonly kind?: DecisionKind
  readonly layout: 'desktop' | 'phone'
  /** "Question 3 of 14", shown on phones (desktop has the counters in the rail). */
  readonly progress: { readonly current: number; readonly total: number }
  readonly onStart: () => void
  readonly onTrade: () => void
  readonly onKeep: () => void
  readonly onHelp: () => void
  readonly onRestart: () => void
  readonly onWatch: () => void
  /** The button that takes focus when a phase begins (Start, Trade places or Play again). */
  readonly firstRef: Ref<HTMLButtonElement>
  /** Phones: the Sound button, in the bar's top row (desktop has it on the stage). */
  readonly sound?: ReactNode
}

/**
 * Do it mode's bar, where Back / Play / Step are in Watch mode. Trade places and Keep them look
 * exactly alike, so color never gives the answer away. Between questions they stay in place
 * but do nothing (aria-disabled), so keyboard focus is never lost.
 */
export function AnswerBar(props: AnswerBarProps) {
  const { phase, layout, progress, firstRef, sound, level, kind = 'trade-or-keep' } = props
  const W = doItWords(level, kind)
  const keys = DO_IT_KINDS[kind].keys
  const isPhone = layout === 'phone'
  const isEngineer = level === 'engineer'
  const asking = phase === 'asking'
  const className = `controls answer-bar${isPhone ? ' answer-bar-phone' : ''}${isEngineer ? ' is-engineer' : ''}`
  // Phones: a slim top row with Sound on the left and the question count on the right.
  const top = isPhone && (
    <div className="answer-top">
      {sound}
      {phase !== 'intro' && phase !== 'done' && (
        <p className="answer-progress">
          {/* On a short landscape screen the short form shows; the full one is still read. */}
          <span className="progress-full">
            {W.progress} {progress.current} of {progress.total}
          </span>
          <span className="progress-short" aria-hidden="true">
            {progress.current} of {progress.total}
          </span>
        </p>
      )}
    </div>
  )

  if (phase === 'intro') {
    return (
      <div className={`${className} is-single`} role="group" aria-label="Your move">
        {top}
        <button
          ref={firstRef}
          type="button"
          className="answer answer-start"
          onClick={props.onStart}
        >
          <StartIcon />
          {W.start}
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className={`${className} is-done`} role="group" aria-label="Your move">
        {top}
        <button ref={firstRef} type="button" className="answer" onClick={props.onRestart}>
          {W.playAgain}
        </button>
        <button type="button" className="answer" onClick={props.onWatch}>
          {W.watchIt}
        </button>
      </div>
    )
  }

  return (
    <div className={className} role="group" aria-label="Your move">
      {top}
      {!isEngineer && (
        <button
          ref={firstRef}
          type="button"
          className="answer answer-choice answer-trade"
          aria-disabled={!asking}
          aria-keyshortcuts={keys.act}
          onClick={asking ? props.onTrade : undefined}
        >
          <TradeIcon />
          <span>
            {W.trade} {!isPhone && <kbd aria-hidden="true">{keys.act}</kbd>}
          </span>
        </button>
      )}
      <button
        ref={isEngineer ? firstRef : undefined}
        type="button"
        className="answer answer-choice answer-keep"
        aria-disabled={!asking}
        aria-keyshortcuts={keys.keep}
        onClick={asking ? props.onKeep : undefined}
      >
        <KeepIcon />
        <span>
          {W.keep} {!isPhone && <kbd aria-hidden="true">{keys.keep}</kbd>}
        </span>
      </button>
      <button
        type="button"
        className="answer answer-help"
        aria-disabled={!asking}
        aria-keyshortcuts="H"
        onClick={asking ? props.onHelp : undefined}
      >
        <HelpIcon />
        <span>
          {W.help} {!isPhone && <kbd aria-hidden="true">H</kbd>}
        </span>
      </button>
      {!isPhone && (
        <button type="button" className="answer answer-quiet" onClick={props.onRestart}>
          {W.startOver}
        </button>
      )}
    </div>
  )
}
