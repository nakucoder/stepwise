import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { findImplementation } from '../algorithms'
import { AlgorithmSummary } from '../components/AlgorithmSummary'
import { CategoryLayout } from '../components/CategoryLayout'
import { CodePanel } from '../components/CodePanel'
import { IdeaPanel } from '../components/IdeaPanel'
import { LookToggle } from '../components/LookToggle'
import { NumbersForm } from '../components/NumbersForm'
import { PlayerControls } from '../components/PlayerControls'
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
import { numbersParam, parseNumbers } from '../engine/input'
import { stepDelayMs } from '../engine/player'
import { groupCaption } from '../engine/trace'
import type { Algorithm, Level } from '../engine/types'
import { usePlayer } from '../hooks/usePlayer'
import { usePhoneLayout } from '../hooks/useMediaQuery'
import { usePlayerShortcuts } from '../hooks/usePlayerShortcuts'
import { usePreferences } from '../preferences/preferences'
import { NotFoundPage } from './NotFoundPage'
import './WorkspacePage.css'
import './WorkspacePhone.css'

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

const LINK_NOTICE: Record<Level, string> = {
  explorer: 'The numbers in that link didn’t work, so here are the starting numbers.',
  engineer: 'The link’s ?numbers= value was invalid, so the default list is shown.',
}

function Workspace({ category, entry, implementation }: WorkspaceProps) {
  const { level: savedLevel, look } = usePreferences()
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
  usePlayerShortcuts(player, isBuilt)

  const run = (next: readonly number[]) => {
    if (!linkFailed && numbersParam(next) === numbersParam(numbers)) {
      // Same numbers: Run means "from the top".
      player.toStart()
      return
    }
    // Built by hand so the commas stay readable in a shared link (URLSearchParams writes %2C).
    // Replace, not push: Back should leave the page, not step through every list tried.
    void navigate({ search: `?numbers=${numbersParam(next)}` }, { replace: true })
  }

  const { frame } = player

  // "The idea" fills the rail at step 1, and the band's button reopens it at any step until
  // the learner steps away or goes back to the steps.
  const { index } = player.state
  const [ideaAt, setIdeaAt] = useState<number | null>(null)
  if (ideaAt !== null && ideaAt !== index) setIdeaAt(null)
  const showIdea = implementation !== undefined && (index === 0 || ideaAt === index)
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
    if (index === 0) {
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
    player.state.status === 'paused' &&
    explanation !== undefined &&
    explanation !== announcement
  ) {
    setAnnouncement(explanation)
  }

  // ---------- Phone layout: bars and caption fill the screen; details open in one sheet ----------
  const isPhone = usePhoneLayout()
  const [sheet, setSheet] = useState<SheetId | null>(isBuilt && index === 0 ? 'idea' : null)
  const [sheetIndex, setSheetIndex] = useState(index)
  // After the learner runs new numbers, show the bars rather than "The idea" again.
  const [ideaHeld, setIdeaHeld] = useState(false)
  if (sheetIndex !== index) {
    // Like the rail on desktop: "The idea" opens at step 1 and folds away on the next step.
    setSheetIndex(index)
    setIdeaHeld(false)
    if (isBuilt && index === 0 && !ideaHeld) setSheet('idea')
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
          // On phones the switch lives in the Menu, which keeps the stage's height for the data.
          toolbar={isPhone ? undefined : <LookToggle />}
          frame={frame}
          level={level}
          pointerLabels={implementation.pointerLabels}
          stepDelayMs={stepDelayMs(player.state.speed)}
          caption={groupCaption(frame, implementation.trace, level)}
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
        index={player.state.index}
        trace={implementation.trace}
        level={level}
        labelledBy={labelledBy}
      />
    ) : (
      <p className="empty-note">Rows appear here as the steps run.</p>
    )

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
          // Phones keep the band to the title (and Big O for Engineer); the rest is in sheets.
          !isExplorer && <AlgorithmSummary algorithm={implementation} level={level} />
        ) : (
          <>
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
          {explainSection(!isExplorer)}
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
          <PlayerControls player={isBuilt ? player : null} layout="phone" />
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
                {explainSection(false)}
                {stats}
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

          <PlayerControls player={isBuilt ? player : null} />
        </div>
      )}

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </CategoryLayout>
  )
}
