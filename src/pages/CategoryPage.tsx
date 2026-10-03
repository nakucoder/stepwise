import { Link, useParams } from 'react-router'
import { findCategory } from '../data/categories'
import { NotFoundPage } from './NotFoundPage'
import './SimplePage.css'

// Minimal for now; the styled category page (sidebar, header band) comes with the workspace.
export function CategoryPage() {
  const category = findCategory(useParams().categoryId)
  if (!category) return <NotFoundPage />

  return (
    <main id="main" tabIndex={-1} className="simple-page">
      <title>{`${category.name} – Stepwise`}</title>
      <h1>{category.name}</h1>
      <ul>
        {category.algorithms.map((algorithm) => (
          <li key={algorithm.id}>
            <Link to={`/${category.id}/${algorithm.id}`}>{algorithm.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
