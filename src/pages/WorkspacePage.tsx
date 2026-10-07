import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { findImplementation } from '../algorithms'
import { AlgorithmSummary } from '../components/AlgorithmSummary'
import { AnswerBar } from '../components/AnswerBar'
import { CategoryLayout } from '../components/CategoryLayout'
import { CodePanel } from '../components/CodePanel'
import { ChallengeTiles, DoItPanel } from '../components/DoItPanel'
import { DO_IT_KINDS, doItKindOf, pickOutcome } from '../components/doItKinds'
import { challengeLines, doItWords, finishLines, pickedLine } from '../components/doItText'
import { IdeaPanel } from '../components/IdeaPanel'
import { LookToggle } from '../components/LookToggle'
import { ModeSwitch, type Mode } from '../components/ModeSwitch'
import { NumbersForm } from '../components/NumbersForm'
import { PlayerControls } from '../components/PlayerControls'
import { SoundToggle } from '../components/SoundToggle'
import { Stage } from '../components/Stage'
import { TraceTable } from '../components/TraceTable'
import {
  findAlgorithm,
  findCategory,
  type AlgorithmEntry,
  type CategoryInfo,
} from '../data/categories'
import { DEFAULT_INPUT } from '../data/defaultInput'
import { collectFrames } from '../engine/collect'
import { challengeOf } from '../engine/doIt'
import { numbersParam, parseNumbers } from '../engine/input'
import { stepDelayMs } from '../engine/player'
import { groupCaption } from '../engine/trace'
import type { Algorithm, Level } from '../engine/types'
import { BETWEEN_MS, useDoIt } from '../hooks/useDoIt'
import { useDoItShortcuts } from '../hooks/useDoItShortcuts'
import { usePlayer } from '../hooks/usePlayer'
import { usePhoneLayout } from '../hooks/useMediaQuery'
import { usePlayerShortcuts } from '../hooks/usePlayerShortcuts'
import { usePreferences } from '../preferences/preferences'
import { rightMoveCues, TRY_AGAIN, type Move, type Note } from '../sound/cues'
import { useSoundEngine } from '../sound/SoundContext'
import { useStepSounds } from '../sound/useStepSounds'
import { NotFoundPage } from './NotFoundPage'
import './WorkspacePage.css'
import './WorkspacePhone.css'
import './WorkspaceDoIt.css'

export function WorkspacePage() {
  const { categoryId, algorithmId } = useParams()
  const category = findCategory(categoryId)
  const entry = category && findAlgorithm(category, algorithmId)
  if (!category || !entry) return <NotFoundPage />

  return (
    // A new key per algorithm gives each one a fresh player.
    <Workspace
      key={`${category.id}/${entry.id}`}
      category={category}
      entry={entry}
      implementation={findImplementation(category.id, entry.id)}
    />
  )
}

interface WorkspaceProps {
  readonly category: CategoryInfo
  readonly entry: AlgorithmEntry
  /** Undefined for algorithms that aren't built yet. */
  readonly implementation: Algorithm | undefined
}

/** The details a phone opens one at a time, below the bars and the caption. */
type SheetId = 'idea' | 'numbers' | 'trace' | 'code' | 'key'

/** The page's address: the numbers (as typed in the link, valid or not) and the mode. */
function searchFor(numbers: string | null, mode: Mode): string {
  const parts = [
    ...(numbers === null ? [] : [`numbers=${numbers}`]),
    ...(mode === 'do' ? ['mode=do'] : []),
  ]
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

const LINK_NOTICE: Record<Level, string> = {
  explorer: 'The numbers in that link didn’t work, so here are the starting numbers.',
  engineer: 'The link’s ?numbers= value was invalid, so the default list is shown.',
}

function Workspace({ category, entry, implementation }: WorkspaceProps) {
  const { level: savedLevel, look, sound } = usePreferences()
  const level = savedLevel ?? 'engineer'
  const isExplorer = level === 'explorer'
  const isBuilt = implementation !== undefined

  // The numbers live in the address (?numbers=5,2,8), so a link or a refresh keeps them.
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const param = searchParams.get('numbers')
  const fromLink = useMemo(() => (param === null ? null : parseNumbers(param)), [param])
  const numbers = fromLink?.ok ? fromLink.values : DEFAULT_INPUT
  const linkFailed = fromLink?.ok === false

  const frames = useMemo(
    () => (implementation ? collectFrames(implementation, numbers).frames : []),
    [implementation, numbers],
  )
  const player = usePlayer(frames)

  // ---------- Do it mode (?mode=do): the learner makes each decision ----------
  // Explorer answers guided questions; Engineer picks values on the stage (free mode).
  const doItMode = isBuilt && searchParams.get('mode') === 'do'
  const mode: Mode = doItMode ? 'do' : 'watch'
  const doIt = useDoIt(frames, doItMode)
  const challenge = useMemo(() => challengeOf(frames), [frames])
  const setMode = (next: Mode) => {
    player.pause()
    doIt.restart()
    // The challenge comes first: The idea (opened by itself at step 1) folds away.
    if (sheet === 'idea') setSheet(null)
    void navigate({ search: searchFor(param, next) }, { replace: true })
  }

  usePlayerShortcuts(player, isBuilt && !doItMode)

  const engine = useSoundEngine()
  const { last, moves } = doIt.state
  const decorate = useMemo(
    () =>
      doItMode && last === 'right'
        ? (notes: Note[], move: Move) => (move === 'forward' ? rightMoveCues(notes) : notes)
        : undefined,
    [doItMode, last],
  )
  useStepSounds({
    frames,
    index: doItMode ? doIt.state.index : player.state.index,
    look,
    stepDelayMs: doItMode ? BETWEEN_MS : stepDelayMs(player.state.speed),
    enabled: sound,
    decorate,
  })
  // A wrong move: the gentle "try again" (every wrong move, even two in a row).
  useEffect(() => {
    if (doItMode && sound && last === 'wrong') engine.play(TRY_AGAIN)
  }, [doItMode, sound, last, moves, engine])

  const run = (next: readonly number[]) => {
    if (!linkFailed && numbersParam(next) === numbersParam(numbers)) {
      // Same numbers: Run means "from the top".
      player.toStart()
      doIt.restart()
      return
    }
    // Built by hand so the commas stay readable in a shared link (URLSearchParams writes %2C).
    // Replace, not push: Back should leave the page, not step through every list tried.
    void navigate({ search: searchFor(numbersParam(next), mode) }, { replace: true })
  }

  // The frame on screen: the player's in Watch mode, the learner's in Do it mode.
  const frame = doItMode ? doIt.frame : player.frame
  const shownIndex = doItMode ? doIt.state.index : player.state.index

  // "The idea" fills the rail at step 1, and the band's button reopens it at any step until
  // the learner steps away or goes back to the steps.
  const { index } = player.state
  const [ideaAt, setIdeaAt] = useState<number | null>(null)
  if (ideaAt !== null && ideaAt !== index) setIdeaAt(null)
  // In Do it mode "The idea" opens only when asked for: the challenge comes first.
  const showIdea =
    implementation !== undefined && (doItMode ? ideaAt !== null : index === 0 || ideaAt === index)
  const ideaButtonRef = useRef<HTMLButtonElement>(null)
  const ideaPanelRef = useRef<HTMLElement>(null)
  const focusIdeaPanel = useRef(false)
  useEffect(() => {
    if (!focusIdeaPanel.current) return
    focusIdeaPanel.current = false
    ideaPanelRef.current?.focus()
  })
  const openIdea = () => {
    player.pause()
    setIdeaAt(index)
    focusIdeaPanel.current = true
  }
  const closeIdea = () => {
    if (index === 0 && !doItMode) {
      // "Start": on to the first real step, with keyboard focus on the page so Space plays.
      player.stepForward()
      document.getElementById('main')?.focus()
    } else {
      setIdeaAt(null)
      ideaButtonRef.current?.focus()
    }
  }

  const explanation = frame?.explanation[level]

  // Screen readers hear the explanation after a manual step, jump or pause, but not on
  // every tick while playing (too noisy). The visible panel updates every frame.
  const [announcement, setAnnouncement] = useState('')
  if (
    !doItMode &&
    player.state.status === 'paused' &&
    explanation !== undefined &&
    explanation !== announcement
  ) {
    setAnnouncement(explanation)
  }

  // What Do it says and accepts depends on the kind of decision (doItKinds.ts): bubble sort's
  // questions are all "trade or keep".
  const kind = frame?.decision?.kind ?? doItKindOf(frames)
  const spec = DO_IT_KINDS[kind]

  // Engineer's free mode: pick values on the stage, by the kind's rule (bubble sort: a value,
  // then its neighbor, to swap them). A pick belongs to the question on screen; it lets go
  // when the question changes or the learner moves.
  const [pick, setPick] = useState<{ readonly at: number; readonly index: number } | null>(null)
  const picked =
    doItMode && !isExplorer && pick?.at === shownIndex && doIt.state.phase === 'asking'
      ? pick.index
      : null

  // The help ladder for the question on screen.
  const nextFrame = frames[shownIndex + 1]
  const hints =
    doItMode && frame?.decision && nextFrame
      ? implementation.hints(frame, nextFrame)[level]
      : undefined
  const name = implementation?.name ?? entry.name
  // In Do it mode, screen readers hear the challenge, each question, every move's result, each
  // hint as it opens, and the finish.
  const doItAnnouncement = (() => {
    if (!doItMode || !frame) return ''
    const { phase, hint } = doIt.state
    const W = doItWords(level, kind)
    if (phase === 'intro') {
      return challengeLines(challenge, numbers.length, name, level, kind).join(' ')
    }
    if (phase === 'done') {
      const { title, lines } = finishLines(challenge, doIt.state.firstTry, name, level, kind)
      return [title, ...lines].join(' ')
    }
    if (phase === 'playing') {
      const lead = last === 'right' ? `${W.right} ` : ''
      return `${lead}${frame.explanation[level]}`
    }
    const help = hints ? [hints.nudge, hints.concept].slice(0, hint).join(' ') : ''
    if (last === 'wrong') return `${W.wrongLead} ${help}`
    const pickedValue = picked === null ? undefined : frame.array[picked]
    if (picked !== null && pickedValue !== undefined) return pickedLine(picked, pickedValue, kind)
    return [frame.explanation[level], help].filter(Boolean).join(' ')
  })()

  // Keyboard focus follows the bar's buttons as phases change (Start, then the answers, then
  // Play again), so it is never lost when a button goes away.
  const answerRef = useRef<HTMLButtonElement>(null)
  const phase = doIt.state.phase
  const lastPhase = useRef(phase)
  useEffect(() => {
    const was = lastPhase.current
    lastPhase.current = phase
    if (!doItMode || was === phase) return
    // Start became the answers, the answers became Play again, or Play again became Start.
    if (was === 'intro' || phase === 'done' || phase === 'intro') answerRef.current?.focus()
  }, [doItMode, phase])

  // Explorer's two answers (and Engineer's Keep): the move each makes, at this decision.
  const choose = (answer: 'act' | 'keep') => {
    setPick(null)
    if (frame?.decision) doIt.choose(spec.choice(answer, frame.decision))
  }
  // Engineer: a tap picks a value, by the kind's rule. Bubble sort: its neighbor swaps the two
  // (checked like any move); the same value again lets go; any other value moves the pick.
  const pickValue = (index: number) => {
    const outcome = pickOutcome(spec.pick, picked, index)
    if (outcome.kind === 'hold') {
      setPick({ at: shownIndex, index })
      return
    }
    setPick(null)
    if (outcome.kind === 'let-go') return
    doIt.choose(spec.pickChoice(outcome))
  }
  const asking = doItMode && phase === 'asking'
  // The answers' keys come from the kind (bubble sort: T and K); Explorer's act key only, as
  // Engineer acts on the stage.
  useDoItShortcuts(asking, {
    ...(isExplorer
      ? {
          [spec.keys.act.toLowerCase()]: () => {
            choose('act')
          },
        }
      : {}),
    [spec.keys.keep.toLowerCase()]: () => {
      choose('keep')
    },
    h: doIt.help,
    escape: () => {
      setPick(null)
    },
  })

  // ---------- Phone layout: bars and caption fill the screen; details open in one sheet ----------
  const isPhone = usePhoneLayout()
  const [sheet, setSheet] = useState<SheetId | null>(
    isBuilt && index === 0 && !doItMode ? 'idea' : null,
  )
  const [sheetIndex, setSheetIndex] = useState(index)
  // After the learner runs new numbers, show the bars rather than "The idea" again.
  const [ideaHeld, setIdeaHeld] = useState(false)
  if (sheetIndex !== index) {
    // Like the rail on desktop: "The idea" opens at step 1 and folds away on the next step.
    setSheetIndex(index)
    setIdeaHeld(false)
    if (isBuilt && index === 0 && !ideaHeld && !doItMode) setSheet('idea')
    else if (sheet === 'idea') setSheet(null)
  }
  const sheetRef = useRef<HTMLElement>(null)
  const pillRefs = useRef(new Map<SheetId, HTMLButtonElement>())
  const focusSheet = useRef(false)
  useEffect(() => {
    if (!focusSheet.current) return
    focusSheet.current = false
    sheetRef.current?.focus()
  })
  const openSheet = (id: SheetId) => {
    if (id === 'idea' || id === 'numbers') player.pause()
    setSheet(id)
    focusSheet.current = true
  }
  const closeSheet = () => {
    if (sheet) pillRefs.current.get(sheet)?.focus()
    setSheet(null)
  }
  const pills: readonly (readonly [SheetId, string])[] = [
    ['idea', 'The idea'],
    ['numbers', 'Numbers'],
    ['trace', isExplorer ? 'So far' : 'Trace'],
    isExplorer ? ['key', 'Colors'] : ['code', 'Code'],
  ]

  // ---------- Pieces shared by both layouts ----------
  const stageSection = (mini: boolean) => (
    <section className={mini ? 'stage is-mini' : 'stage'} aria-labelledby="stage-heading">
      <h2 id="stage-heading" className="visually-hidden">
        Visualization
      </h2>
      {implementation && frame ? (
        <Stage
          look={look}
          // On phones the look switch lives in the Menu and Sound in the controls, which keeps
          // the stage's height for the data.
          toolbar={
            isPhone ? undefined : (
              <div className="stage-tools">
                <SoundToggle placement="stage" />
                <LookToggle />
              </div>
            )
          }
          frame={frame}
          level={level}
          pointerLabels={implementation.pointerLabels}
          stepDelayMs={doItMode ? BETWEEN_MS : stepDelayMs(player.state.speed)}
          caption={groupCaption(frame, implementation.trace, level)}
          pick={
            doItMode && !isExplorer
              ? {
                  labels: frame.array.map((value, k) => {
                    const role = (['comparing', 'swapping', 'sorted'] as const).find((r) =>
                      frame.highlights[r]?.includes(k),
                    )
                    return `a[${String(k)}] = ${String(value)}${role ? `, ${role}` : ''}`
                  }),
                  picked,
                  enabled: asking,
                  onPick: pickValue,
                  onCancel: () => {
                    setPick(null)
                  },
                  groupLabel: spec.pickGroupLabel,
                }
              : undefined
          }
        />
      ) : (
        <p className="empty-note">
          {entry.name} isn’t built yet. <Link to="/sorting/bubble-sort">Try bubble sort</Link>,
          which is ready.
        </p>
      )}
    </section>
  )

  const explainSection = (withStats: boolean) => (
    <section className="explain" aria-labelledby="explain-heading">
      {withStats && frame ? (
        // The counts sit beside the heading, not in it, so the region keeps its short name.
        <div className="explain-head">
          <h2 id="explain-heading">What's happening</h2>
          <span className="explain-stats">
            {frame.stats.comparisons} comparisons, {frame.stats.swaps} swaps
          </span>
        </div>
      ) : (
        <h2 id="explain-heading">What's happening</h2>
      )}
      {explanation === undefined ? (
        <p className="empty-note">Each step is explained here.</p>
      ) : (
        <p className="explain-text">{explanation}</p>
      )}
    </section>
  )

  const stats = (
    <dl className="stats">
      <div className="stat">
        <dt>Comparisons</dt>
        <dd>{frame ? frame.stats.comparisons : '—'}</dd>
      </div>
      <div className="stat">
        <dt>Swaps</dt>
        <dd>{frame ? frame.stats.swaps : '—'}</dd>
      </div>
    </dl>
  )

  const colorKey = (
    <ul className="color-key" aria-label="What the colors mean">
      <li>
        <span className="swatch" style={{ background: 'var(--role-comparing)' }} />
        Looking at these two
      </li>
      <li>
        <span className="swatch" style={{ background: 'var(--role-swapping)' }} />
        Trading places
      </li>
      <li>
        <span className="swatch" style={{ background: 'var(--role-sorted)' }} />
        In its final spot
      </li>
    </ul>
  )

  const code =
    implementation && frame ? (
      <CodePanel source={implementation.source.python} activeLine={frame.activeLine} />
    ) : (
      <p className="empty-note">The code, with the current line marked, goes here.</p>
    )

  const traceTable = (labelledBy: string) =>
    implementation?.trace ? (
      <TraceTable
        frames={frames}
        index={shownIndex}
        trace={implementation.trace}
        level={level}
        labelledBy={labelledBy}
      />
    ) : (
      <p className="empty-note">Rows appear here as the steps run.</p>
    )

  const doItPanel = doItMode && frame && (
    <DoItPanel
      state={doIt.state}
      frame={frame}
      hints={hints}
      challenge={challenge}
      count={numbers.length}
      name={name}
      level={level}
      kind={kind}
      picked={picked}
      onMoreHelp={doIt.help}
      onShowMe={doIt.showMe}
    />
  )
  const answerBar = (layout: 'desktop' | 'phone') => (
    <AnswerBar
      phase={phase}
      level={level}
      kind={kind}
      layout={layout}
      progress={{
        current: Math.min(doIt.state.answered + 1, challenge.decisions),
        total: challenge.decisions,
      }}
      onStart={doIt.start}
      onTrade={() => {
        choose('act')
      }}
      onKeep={() => {
        choose('keep')
      }}
      onHelp={doIt.help}
      onRestart={doIt.restart}
      onWatch={() => {
        setMode('watch')
      }}
      firstRef={answerRef}
      sound={layout === 'phone' && <SoundToggle placement="answers" />}
    />
  )
  const modeSwitch = isBuilt && <ModeSwitch mode={mode} onChange={setMode} />

  const traceHeading = isExplorer ? 'What happened so far' : 'Trace table'
  const ideaActionLabel =
    index === 0 ? (isExplorer ? 'Got it, let’s start' : 'Start') : 'Back to the steps'

  const numbersForm = implementation && (
    <NumbersForm
      numbers={numbers}
      level={level}
      onRun={(next) => {
        run(next)
        if (isPhone) {
          setIdeaHeld(true)
          closeSheet()
        }
      }}
      notice={linkFailed ? LINK_NOTICE[level] : undefined}
    />
  )

  const sheetContent = (id: SheetId) => {
    if (id === 'idea' && implementation) {
      return (
        <IdeaPanel
          ref={sheetRef}
          idea={implementation.idea[level]}
          actionLabel={ideaActionLabel}
          onAction={() => {
            if (index === 0) {
              player.stepForward()
              document.getElementById('main')?.focus()
            } else closeSheet()
          }}
        />
      )
    }
    const titles: Record<SheetId, string> = {
      idea: 'The idea',
      numbers: 'Your numbers',
      trace: traceHeading,
      code: 'Code',
      key: 'What the colors mean',
    }
    return (
      <section ref={sheetRef} className="sheet-panel" aria-labelledby="sheet-heading" tabIndex={-1}>
        <div className="sheet-head">
          <h2 id="sheet-heading">{titles[id]}</h2>
          <button type="button" className="sheet-close" onClick={closeSheet}>
            Close
          </button>
        </div>
        <div className="sheet-body">
          {id === 'numbers' && numbersForm}
          {id === 'trace' && traceTable('sheet-heading')}
          {id === 'code' && code}
          {id === 'key' && (
            <>
              {colorKey}
              {stats}
            </>
          )}
        </div>
      </section>
    )
  }

  return (
    <CategoryLayout
      category={category}
      title={isExplorer ? entry.explorerName : entry.name}
      subtitle={isExplorer && !isPhone ? entry.name : undefined}
      className={isPhone ? 'workspace workspace-phone' : 'workspace'}
      bandExtra={
        // Unbuilt algorithms get no numbers field: it would show numbers that nothing uses.
        implementation &&
        (isPhone ? (
          // Phones keep the band to the title, the mode switch (and Big O for Engineer); the
          // rest is in sheets.
          <>
            {modeSwitch}
            {!isExplorer && <AlgorithmSummary algorithm={implementation} level={level} />}
          </>
        ) : (
          <>
            {modeSwitch}
            <AlgorithmSummary algorithm={implementation} level={level} />
            <button
              ref={ideaButtonRef}
              type="button"
              className="idea-open"
              aria-expanded={showIdea}
              onClick={openIdea}
            >
              The idea
            </button>
            {numbersForm}
          </>
        ))
      }
    >
      <title>{`${entry.name} – Stepwise`}</title>

      {isPhone ? (
        <div className={sheet ? 'phone-grid has-sheet' : 'phone-grid'}>
          {stageSection(sheet !== null)}
          {doItPanel || explainSection(!isExplorer)}
          {sheet && <div className="sheet">{sheetContent(sheet)}</div>}
          {isBuilt && (
            <div className="pills" role="group" aria-label="Details">
              {pills.map(([id, label]) => (
                <button
                  key={id}
                  ref={(element) => {
                    if (element) pillRefs.current.set(id, element)
                  }}
                  type="button"
                  className="pill"
                  aria-expanded={sheet === id}
                  onClick={() => {
                    if (sheet === id) closeSheet()
                    else openSheet(id)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {doItMode ? (
            answerBar('phone')
          ) : (
            <PlayerControls
              player={isBuilt ? player : null}
              layout="phone"
              extra={isBuilt && <SoundToggle placement="controls" />}
            />
          )}
        </div>
      ) : (
        <div className="workspace-grid">
          <div className="workspace-left">
            {stageSection(false)}

            {isExplorer ? (
              colorKey
            ) : (
              <section className="panel code-panel" aria-labelledby="code-heading">
                <div className="panel-head">
                  <h2 id="code-heading">Code</h2>
                  <span>python</span>
                </div>
                {code}
              </section>
            )}
          </div>

          <aside className="workspace-rail" aria-label="Step details">
            {showIdea ? (
              <IdeaPanel
                ref={ideaPanelRef}
                idea={implementation.idea[level]}
                actionLabel={ideaActionLabel}
                onAction={closeIdea}
              />
            ) : (
              <>
                {doItPanel || explainSection(false)}
                {doItMode && frame ? (
                  <ChallengeTiles
                    state={doIt.state}
                    frame={frame}
                    challenge={challenge}
                    level={level}
                    kind={kind}
                  />
                ) : (
                  stats
                )}
                <section className="panel trace" aria-labelledby="trace-heading">
                  <div className="panel-head">
                    <h2 id="trace-heading">{traceHeading}</h2>
                    <span>
                      {implementation?.trace?.rowDescription?.[level] ?? 'one row per step'}
                    </span>
                  </div>
                  {traceTable('trace-heading')}
                </section>
              </>
            )}
          </aside>

          {doItMode ? answerBar('desktop') : <PlayerControls player={isBuilt ? player : null} />}
        </div>
      )}

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {doItMode ? doItAnnouncement : announcement}
      </p>
    </CategoryLayout>
  )
}
