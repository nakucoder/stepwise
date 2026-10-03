import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { CategoryDiagram } from '../components/CategoryDiagram'
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

export function HomePage() {
  const level = usePreferences().level ?? 'engineer'
  const copy = COPY[level]

  return (
    <main id="main" tabIndex={-1} className={`home home-${level}`}>
      <title>Stepwise</title>
      <h1>{copy.title}</h1>
      <p className="home-lede">{copy.lede}</p>

      <ol className="home-cards">
        {CATEGORIES.map((category) => {
          const nameId = `category-${category.id}-name`
          const descriptionId = `category-${category.id}-description`
          const count = category.algorithms.length
          return (
            <li key={category.id}>
              <Link
                to={`/${category.id}`}
                className="home-card"
                aria-labelledby={nameId}
                aria-describedby={descriptionId}
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
                  {level === 'explorer' ? `${String(count)} to try` : category.algorithmSummary}
                </p>
              </Link>
            </li>
          )
        })}
      </ol>
    </main>
  )
}
