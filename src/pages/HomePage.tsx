import './HomePage.css'

// Placeholder until the real home page lands. It also previews the design tokens.
const swatches = [
  'sorting',
  'searching',
  'linked-lists',
  'trees',
  'graphs',
  'hashing',
  'pattern-matching',
  'dynamic-programming',
]

export function HomePage() {
  return (
    <main id="main" tabIndex={-1} className="placeholder">
      <h1>Stepwise</h1>
      <p>Coming soon: step-by-step visualizations of data structures and algorithms.</p>
      <p>
        <code>bubble_sort([5, 2, 8, 1, 9, 3])</code>
      </p>
      <ul className="placeholder-swatches" aria-label="Category colors">
        {swatches.map((id) => (
          <li key={id} style={{ background: `var(--cat-${id})`, color: `var(--cat-on-${id})` }}>
            {id.replaceAll('-', ' ')}
          </li>
        ))}
      </ul>
    </main>
  )
}
