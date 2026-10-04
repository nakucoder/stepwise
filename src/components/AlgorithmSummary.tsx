import type { Algorithm, Level } from '../engine/types'

interface AlgorithmSummaryProps {
  readonly algorithm: Pick<Algorithm, 'complexity' | 'bestFor'>
  readonly level: Level
}

/**
 * The line in the category band under design D: Big O with the worst case circled, and
 * what the algorithm is best for. Explorer gets a plain sentence instead of Big O.
 */
export function AlgorithmSummary({ algorithm, level }: AlgorithmSummaryProps) {
  if (level === 'explorer') {
    return (
      <div className="band-summary">
        <p>{algorithm.bestFor.explorer}</p>
      </div>
    )
  }

  const { time, space } = algorithm.complexity
  return (
    <div className="band-summary">
      <p>
        Time <span className="circled">{time.worst}</span> worst,{' '}
        <span className="mono">{time.best}</span> best. Space <span className="mono">{space}</span>.
      </p>
      <p>Best for: {algorithm.bestFor.engineer}.</p>
    </div>
  )
}
