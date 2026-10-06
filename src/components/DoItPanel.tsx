import type { Challenge, DoItState } from '../engine/doIt'
import type { Frame, Hints } from '../engine/types'
import { DO_IT_WORDS as W, challengeLines, finishLines } from './doItText'

interface DoItPanelProps {
  readonly state: DoItState
  readonly frame: Frame
  /** The help ladder for the question on screen (absent between questions). */
  readonly hints: Hints | undefined
  readonly challenge: Challenge
  readonly count: number
  readonly name: string
  readonly onMoreHelp: () => void
  readonly onShowMe: () => void
}

/**
 * Do it mode's "What's happening": the challenge, then each question, the help ladder, what a
 * right move did, and the finish. Explorer wording (Engineer comes with its own free mode).
 */
export function DoItPanel(props: DoItPanelProps) {
  const { state, frame, hints, challenge, count, name } = props
  const done = state.phase === 'done'
  return (
    <section
      className={done ? 'explain do-it-panel is-done' : 'explain do-it-panel'}
      aria-labelledby="do-it-heading"
    >
      {state.phase === 'intro' && (
        <>
          <h2 id="do-it-heading">{W.yourTurn}</h2>
          {challengeLines(challenge, count, name).map((line, k) => (
            <p key={line} className={k === 0 ? 'do-it-lead' : 'do-it-line'}>
              {line}
            </p>
          ))}
        </>
      )}
      {state.phase === 'asking' && (
        <>
          <h2 id="do-it-heading">{W.yourTurn}</h2>
          <p className="do-it-question">{frame.explanation.explorer}</p>
          <p className="do-it-line">{W.questionHint}</p>
          {state.hint > 0 && hints && (
            <HintBox
              wrong={state.last === 'wrong'}
              level={state.hint === 2 ? 2 : 1}
              hints={hints}
              onMoreHelp={props.onMoreHelp}
              onShowMe={props.onShowMe}
            />
          )}
        </>
      )}
      {state.phase === 'playing' && (
        <>
          <h2 id="do-it-heading">
            {state.last === 'right' ? W.right : state.last === 'shown' ? W.shown : W.watching}
          </h2>
          <p className="do-it-lead">{frame.explanation.explorer}</p>
        </>
      )}
      {done && <Finish challenge={challenge} firstTry={state.firstTry} name={name} />}
    </section>
  )
}

function Finish({
  challenge,
  firstTry,
  name,
}: {
  readonly challenge: Challenge
  readonly firstTry: number
  readonly name: string
}) {
  const { title, lines } = finishLines(challenge, firstTry, name)
  return (
    <>
      <h2 id="do-it-heading" className="do-it-finish">
        {title}
      </h2>
      {lines.map((line, k) => (
        <p key={line} className={k === 0 ? 'do-it-lead' : 'do-it-line'}>
          {line}
        </p>
      ))}
    </>
  )
}

interface HintBoxProps {
  readonly wrong: boolean
  readonly level: 1 | 2
  readonly hints: Hints
  readonly onMoreHelp: () => void
  readonly onShowMe: () => void
}

/** The help ladder, one step at a time. Neutral colors: a wrong move is never shown in red. */
function HintBox({ wrong, level, hints, onMoreHelp, onShowMe }: HintBoxProps) {
  return (
    <div className="hint-box">
      <p className="hint-lead">{wrong ? W.wrongLead : W.helpLead}</p>
      <ol className="hint-rungs">
        <li>{hints.nudge}</li>
        {level >= 2 && <li>{hints.concept}</li>}
      </ol>
      <div className="hint-actions">
        {level < 2 && (
          <button type="button" onClick={onMoreHelp}>
            {W.moreHelp}
          </button>
        )}
        <button type="button" onClick={onShowMe}>
          {W.showMe}
        </button>
      </div>
    </div>
  )
}

/** The challenge counters, in place of Comparisons and Swaps. */
export function ChallengeTiles({
  state,
  frame,
  challenge,
}: {
  readonly state: DoItState
  readonly frame: Frame
  readonly challenge: Challenge
}) {
  return (
    <dl className="stats challenge">
      <div className="stat">
        <dt>Trades found</dt>
        <dd>
          {frame.stats.swaps}
          <small> of {challenge.trades}</small>
        </dd>
      </div>
      <div className="stat">
        <dt>Questions</dt>
        <dd>
          {state.answered}
          <small> of {challenge.decisions}</small>
        </dd>
      </div>
    </dl>
  )
}
