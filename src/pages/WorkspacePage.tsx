import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { findImplementation } from '../algorithms'
import { AlgorithmSummary } from '../components/AlgorithmSummary'
import { CategoryLayout } from '../components/CategoryLayout'
import { CodePanel } from '../components/CodePanel'
import { IdeaPanel } from '../components/IdeaPanel'
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
import { usePlayerShortcuts } from '../hooks/usePlayerShortcuts'
import { usePreferences } from '../preferences/preferences'
import { NotFoundPage } from './NotFoundPage'
import './WorkspacePage.css'

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

const LINK_NOTICE: Record<Level, string> = {
  explorer: 'The numbers in that link didn’t work, so here are the starting numbers.',
  engineer: 'The link’s ?numbers= value was invalid, so the default list is shown.',
}

function Workspace({ category, entry, implementation }: WorkspaceProps) {
  const level = usePreferences().level ?? 'engineer'
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

  return (
    <CategoryLayout
      category={category}
      title={isExplorer ? entry.explorerName : entry.name}
      subtitle={isExplorer ? entry.name : undefined}
      className="workspace"
      bandExtra={
        // Unbuilt algorithms get no numbers field: it would show numbers that nothing uses.
        implementation && (
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
            <NumbersForm
              numbers={numbers}
              level={level}
              onRun={run}
              notice={linkFailed ? LINK_NOTICE[level] : undefined}
            />
          </>
        )
      }
    >
      <title>{`${entry.name} – Stepwise`}</title>

      <div className="workspace-grid">
        <div className="workspace-left">
          <section className="stage" aria-labelledby="stage-heading">
            <h2 id="stage-heading" className="visually-hidden">
              Visualization
            </h2>
            {implementation && frame ? (
              <Stage
                frame={frame}
                level={level}
                pointerLabels={implementation.pointerLabels}
                stepDelayMs={stepDelayMs(player.state.speed)}
                caption={groupCaption(frame, implementation.trace, level)}
              />
            ) : (
              <p className="empty-note">
                {entry.name} isn’t built yet. <Link to="/sorting/bubble-sort">Try bubble sort</Link>
                , which is ready.
              </p>
            )}
          </section>

          {isExplorer ? (
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
          ) : (
            <section className="panel code-panel" aria-labelledby="code-heading">
              <div className="panel-head">
                <h2 id="code-heading">Code</h2>
                <span>python</span>
              </div>
              {implementation && frame ? (
                <CodePanel source={implementation.source.python} activeLine={frame.activeLine} />
              ) : (
                <p className="empty-note">The code, with the current line marked, goes here.</p>
              )}
            </section>
          )}
        </div>

        <aside className="workspace-rail" aria-label="Step details">
          {showIdea ? (
            <IdeaPanel
              ref={ideaPanelRef}
              idea={implementation.idea[level]}
              actionLabel={
                index === 0 ? (isExplorer ? 'Got it, let’s start' : 'Start') : 'Back to the steps'
              }
              onAction={closeIdea}
            />
          ) : (
            <>
              <section className="explain" aria-labelledby="explain-heading">
                <h2 id="explain-heading">What's happening</h2>
                {explanation === undefined ? (
                  <p className="empty-note">Each step is explained here.</p>
                ) : (
                  <p className="explain-text">{explanation}</p>
                )}
              </section>

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

              <section className="panel trace" aria-labelledby="trace-heading">
                <div className="panel-head">
                  <h2 id="trace-heading">{isExplorer ? 'What happened so far' : 'Trace table'}</h2>
                  <span>
                    {implementation?.trace?.rowDescription?.[level] ?? 'one row per step'}
                  </span>
                </div>
                {implementation?.trace ? (
                  <TraceTable
                    frames={frames}
                    index={player.state.index}
                    trace={implementation.trace}
                    level={level}
                    labelledBy="trace-heading"
                  />
                ) : (
                  <p className="empty-note">Rows appear here as the steps run.</p>
                )}
              </section>
            </>
          )}
        </aside>

        <PlayerControls player={isBuilt ? player : null} />
      </div>

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </CategoryLayout>
  )
}
