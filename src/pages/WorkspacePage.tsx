import { Link, useParams } from 'react-router'
import { findAlgorithm, findCategory } from '../data/categories'
import { NotFoundPage } from './NotFoundPage'
import './SimplePage.css'

// Placeholder; the workspace layout comes next, and the player in Step 4.
export function WorkspacePage() {
  const { categoryId, algorithmId } = useParams()
  const category = findCategory(categoryId)
  const algorithm = category && findAlgorithm(category, algorithmId)
  if (!category || !algorithm) return <NotFoundPage />

  return (
    <main id="main" tabIndex={-1} className="simple-page">
      <title>{`${algorithm.name} – Stepwise`}</title>
      <h1>{algorithm.name}</h1>
      <p>
        <Link to={`/${category.id}`}>All {category.name.toLowerCase()} algorithms</Link>
      </p>
    </main>
  )
}
