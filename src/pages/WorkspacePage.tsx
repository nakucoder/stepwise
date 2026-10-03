import { useParams } from 'react-router'
import { CategoryLayout } from '../components/CategoryLayout'
import { findAlgorithm, findCategory } from '../data/categories'
import { usePreferences } from '../preferences/preferences'
import { NotFoundPage } from './NotFoundPage'
import './WorkspacePage.css'

const SPEEDS = ['0.5×', '1×', '2×', '4×'] as const

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

function StepIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M16 5h2v14h-2zM4 5v14l11-7z" />
    </svg>
  )
}

/**
 * The workspace layout from design D, with empty panels. The player, visualization and
 * real content arrive in Step 4; until then the controls are disabled.
 */
export function WorkspacePage() {
  const level = usePreferences().level ?? 'engineer'
  const { categoryId, algorithmId } = useParams()
  const category = findCategory(categoryId)
  const algorithm = category && findAlgorithm(category, algorithmId)
  if (!category || !algorithm) return <NotFoundPage />

  const isExplorer = level === 'explorer'

  return (
    <CategoryLayout
      category={category}
      title={algorithm.name}
      className="workspace"
      bandExtra={
        <label className="band-input">
          Your numbers
          <input name="numbers" placeholder="5 2 8 1 9 3" disabled />
        </label>
      }
    >
      <title>{`${algorithm.name} – Stepwise`}</title>

      <div className="workspace-grid">
        <div className="workspace-left">
          <section className="stage" aria-labelledby="stage-heading">
            <h2 id="stage-heading" className="visually-hidden">
              Visualization
            </h2>
            <p className="empty-note">
              The animation for {algorithm.name.toLowerCase()} goes here.
            </p>
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
              <p className="empty-note">The code, with the current line marked, goes here.</p>
            </section>
          )}
        </div>

        <aside className="workspace-rail" aria-label="Step details">
          <section className="explain" aria-labelledby="explain-heading">
            <h2 id="explain-heading">What's happening</h2>
            <p className="empty-note">Each step is explained here.</p>
          </section>

          <dl className="stats">
            <div className="stat">
              <dt>Comparisons</dt>
              <dd>—</dd>
            </div>
            <div className="stat">
              <dt>Swaps</dt>
              <dd>—</dd>
            </div>
          </dl>

          <section className="panel trace" aria-labelledby="trace-heading">
            <div className="panel-head">
              <h2 id="trace-heading">{isExplorer ? 'What happened so far' : 'Trace table'}</h2>
              <span>one row per step</span>
            </div>
            <p className="empty-note">Rows appear here as the steps run.</p>
          </section>
        </aside>

        <div className="controls" role="group" aria-label="Playback">
          <button type="button" className="control" disabled>
            <BackIcon />
            Back <kbd>←</kbd>
          </button>
          <button type="button" className="control control-play" disabled>
            <PlayIcon />
            Play <kbd>space</kbd>
          </button>
          <button type="button" className="control" disabled>
            <StepIcon />
            Step <kbd>→</kbd>
          </button>
          <div className="speed" role="group" aria-labelledby="speed-label">
            <span id="speed-label">Speed</span>
            <div className="speed-steps">
              {SPEEDS.map((speed) => (
                <button key={speed} type="button" aria-pressed={speed === '1×'} disabled>
                  {speed}
                </button>
              ))}
            </div>
          </div>
          <p className="progress">No steps yet</p>
        </div>
      </div>
    </CategoryLayout>
  )
}
