import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { findImplementation } from '../algorithms'
import { AlgorithmSummary } from '../components/AlgorithmSummary'
import { CategoryLayout } from '../components/CategoryLayout'
import { CodePanel } from '../components/CodePanel'
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
import { stepDelayMs } from '../engine/player'
import { groupCaption } from '../engine/trace'
import type { Algorithm } from '../engine/types'
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

function Workspace({ category, entry, implementation }: WorkspaceProps) {
  const level = usePreferences().level ?? 'engineer'
  const isExplorer = level === 'explorer'
  const isBuilt = implementation !== undefined

  const frames = useMemo(
    () => (implementation ? collectFrames(implementation, DEFAULT_INPUT).frames : []),
    [implementation],
  )
  const player = usePlayer(frames)
  usePlayerShortcuts(player, isBuilt)

  const { frame } = player
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
            <label className="band-input">
              Your numbers
              <input
                name="numbers"
                value={DEFAULT_INPUT.join(' ')}
                readOnly
                aria-describedby="numbers-note"
              />
            </label>
            {/* Outside the label, so it describes the field instead of joining its name. */}
            <span id="numbers-note" className="visually-hidden">
              Choosing your own numbers is coming soon.
            </span>
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
              <span>{implementation?.trace?.rowDescription?.[level] ?? 'one row per step'}</span>
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
        </aside>

        <PlayerControls player={isBuilt ? player : null} />
      </div>

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </CategoryLayout>
  )
}
