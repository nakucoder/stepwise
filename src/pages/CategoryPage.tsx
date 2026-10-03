import { Link, useParams } from 'react-router'
import { CategoryLayout } from '../components/CategoryLayout'
import { findCategory } from '../data/categories'
import { usePreferences } from '../preferences/preferences'
import './CategoryPage.css'
import { NotFoundPage } from './NotFoundPage'

/** A topic's algorithms as a simple numbered list, in design D's style. */
export function CategoryPage() {
  const level = usePreferences().level ?? 'engineer'
  const category = findCategory(useParams().categoryId)
  if (!category) return <NotFoundPage />

  return (
    <CategoryLayout
      category={category}
      title={category.name}
      className="category-page"
      bandExtra={<p className="band-description">{category.description[level]}</p>}
    >
      <title>{`${category.name} – Stepwise`}</title>
      <h2 className="category-page-heading">
        {level === 'explorer' ? 'Pick one to watch' : 'Algorithms'}
      </h2>
      <ol className="category-page-list">
        {category.algorithms.map((algorithm) => (
          <li key={algorithm.id}>
            <Link to={`/${category.id}/${algorithm.id}`}>
              {level === 'explorer' ? (
                <span className="category-page-names">
                  {algorithm.explorerName}
                  {/* The real name too, so the vocabulary sinks in. */}
                  <span className="category-page-real-name">{algorithm.name}</span>
                </span>
              ) : (
                algorithm.name
              )}
            </Link>
          </li>
        ))}
      </ol>
    </CategoryLayout>
  )
}
