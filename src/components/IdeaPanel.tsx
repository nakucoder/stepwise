import { useId, type Ref } from 'react'
import type { Idea } from '../engine/types'

interface IdeaPanelProps {
  readonly idea: Idea
  /** The button under the answers: "Start" at step 1, "Back to the steps" later. */
  readonly actionLabel: string
  readonly onAction: () => void
  /** Focused when the panel is opened from the band, so keyboard users land on it. */
  readonly ref?: Ref<HTMLElement>
}

/**
 * "The idea": why the algorithm works the way it does. It fills the rail at step 1, where the
 * explanation, stats and trace have nothing to show yet, and the band's "The idea" button
 * brings it back at any step.
 */
export function IdeaPanel({ idea, actionLabel, onAction, ref }: IdeaPanelProps) {
  const headingId = useId()
  return (
    <section ref={ref} className="idea" aria-labelledby={headingId} tabIndex={-1}>
      <h2 id={headingId} className="idea-title">
        The idea
      </h2>
      <p className="idea-lead">{idea.lead}</p>
      <dl className="idea-points">
        {idea.points.map((point) => (
          <div key={point.question} className="idea-point">
            <dt>{point.question}</dt>
            <dd>{point.answer}</dd>
          </div>
        ))}
      </dl>
      {/* Pinned to the bottom of the panel, so it stays in reach if the answers scroll. */}
      <div className="idea-actions">
        <button type="button" className="idea-action" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </section>
  )
}
