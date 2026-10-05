import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { CategoryDiagram } from '../components/CategoryDiagram'
import { builtFirst, isAlgorithmBuilt, isCategoryBuilt } from '../data/availability'
import { CATEGORIES } from '../data/categories'
import { usePreferences } from '../preferences/preferences'
import './HomePage.css'

const COPY = {
  explorer: {
    title: 'What do you want to watch run?',
    lede: 'Pick a topic, type in your own numbers, and watch what happens one step at a time.',
  },
  engineer: {
    title: 'Eight topics, in the order most people learn them',
    lede: 'Each one has worked examples you can step through with your own numbers, a trace table that fills in as it runs, and the code for every step.',
  },
} as const

/** "1 ready to try, 6 coming soon", "7 on the way" or "3 to try", in plain words. */
function explorerCount(ready: number, total: number): string {
  if (ready === 0) return `${String(total)} on the way`
  if (ready === total) return `${String(total)} to try`
  return `${String(ready)} ready to try, ${String(total - ready)} coming soon`
}

export function HomePage() {
  const level = usePreferences().level ?? 'engineer'
  const copy = COPY[level]
  const isExplorer = level === 'explorer'
  // Explorer puts topics that work today first, so kids land on something they can run.
  const categories = isExplorer ? builtFirst(CATEGORIES, isCategoryBuilt) : CATEGORIES

  return (
    <main id="main" tabIndex={-1} className={`home home-${level}`}>
      <title>Stepwise</title>
      <h1>{copy.title}</h1>
      <p className="home-lede">{copy.lede}</p>

      <ol className="home-cards">
        {categories.map((category) => {
          const nameId = `category-${category.id}-name`
          const descriptionId = `category-${category.id}-description`
          const soonId = `category-${category.id}-soon`
          const count = category.algorithms.length
          const ready = category.algorithms.filter((a) => isAlgorithmBuilt(category, a)).length
          const isSoon = isExplorer && ready === 0
          return (
            <li key={category.id}>
              <Link
                to={`/${category.id}`}
                className="home-card"
                aria-labelledby={nameId}
                aria-describedby={isSoon ? `${soonId} ${descriptionId}` : descriptionId}
                style={{ '--c': category.color, '--on': category.onColor } as CSSProperties}
              >
                <span className="home-card-head">
                  <span className="home-card-number" aria-hidden="true">
                    {category.number}
                  </span>
                  <h2 id={nameId}>{category.name}</h2>
                </span>
                <CategoryDiagram id={category.id} className="home-card-diagram" />
                <p id={descriptionId} className="home-card-description">
                  {category.description[level]}
                </p>
                <p className="home-card-algorithms">
                  {isSoon && (
                    <>
                      <span id={soonId} className="soon-tag">
                        Coming soon
                      </span>{' '}
                    </>
                  )}
                  {isExplorer ? explorerCount(ready, count) : category.algorithmSummary}
                </p>
              </Link>
            </li>
          )
        })}
      </ol>
    </main>
  )
}
