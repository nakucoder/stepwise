import type { Challenge, DoItState } from '../engine/doIt'
import type { Frame, Hints, Level } from '../engine/types'
import { challengeLines, doItWords, finishLines, pickedLine, type DoItWords } from './doItText'

interface DoItPanelProps {
  readonly state: DoItState
  readonly frame: Frame
  /** The help ladder for the question on screen (absent between questions). */
  readonly hints: Hints | undefined
  readonly challenge: Challenge
  readonly count: number
  readonly name: string
  readonly level: Level
  /** Engineer: the value picked first, waiting for its neighbor. */
  readonly picked?: number | null
  readonly onMoreHelp: () => void
  readonly onShowMe: () => void
}

/**
 * Do it mode's "What's happening": the challenge, then each question, the help ladder, what a
 * right move did, and the finish, in the level's own words.
 */
export function DoItPanel(props: DoItPanelProps) {
  const { state, frame, hints, challenge, count, name, level, picked } = props
  const W = doItWords(level)
  const done = state.phase === 'done'
  const pickedValue = picked === null || picked === undefined ? undefined : frame.array[picked]
  return (
    <section
      className={done ? 'explain do-it-panel is-done' : 'explain do-it-panel'}
      aria-labelledby="do-it-heading"
    >
      {state.phase === 'intro' && (
        <>
          <h2 id="do-it-heading">{W.yourTurn}</h2>
          {challengeLines(challenge, count, name, level).map((line, k) => (
            <p key={line} className={k === 0 ? 'do-it-lead' : 'do-it-line'}>
              {line}
            </p>
          ))}
        </>
      )}
      {state.phase === 'asking' && (
        <>
          <h2 id="do-it-heading">{W.yourTurn}</h2>
          <p className="do-it-question">{frame.explanation[level]}</p>
          <p className="do-it-line">
            {picked !== null && picked !== undefined && pickedValue !== undefined
              ? pickedLine(picked, pickedValue)
              : W.questionHint}
          </p>
          {state.hint > 0 && hints && (
            <HintBox
              words={W}
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
          <p className="do-it-lead">{frame.explanation[level]}</p>
        </>
      )}
      {done && <Finish challenge={challenge} firstTry={state.firstTry} name={name} level={level} />}
    </section>
  )
}

function Finish({
  challenge,
  firstTry,
  name,
  level,
}: {
  readonly challenge: Challenge
  readonly firstTry: number
  readonly name: string
  readonly level: Level
}) {
  const { title, lines } = finishLines(challenge, firstTry, name, level)
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
  readonly words: DoItWords
  readonly wrong: boolean
  readonly level: 1 | 2
  readonly hints: Hints
  readonly onMoreHelp: () => void
  readonly onShowMe: () => void
}

/** The help ladder, one step at a time. Neutral colors: a wrong move is never shown in red. */
function HintBox({ words: W, wrong, level, hints, onMoreHelp, onShowMe }: HintBoxProps) {
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
  level,
}: {
  readonly state: DoItState
  readonly frame: Frame
  readonly challenge: Challenge
  readonly level: Level
}) {
  const W = doItWords(level)
  return (
    <dl className="stats challenge">
      <div className="stat">
        <dt>{W.tradesFound}</dt>
        <dd>
          {frame.stats.swaps}
          <small> of {challenge.trades}</small>
        </dd>
      </div>
      <div className="stat">
        <dt>{W.questions}</dt>
        <dd>
          {state.answered}
          <small> of {challenge.decisions}</small>
        </dd>
      </div>
    </dl>
  )
}
