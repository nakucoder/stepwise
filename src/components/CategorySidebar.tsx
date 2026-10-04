import type { CSSProperties } from 'react'
import { NavLink } from 'react-router'
import { builtFirst, isAlgorithmBuilt, isCategoryBuilt } from '../data/availability'
import { CATEGORIES, type CategoryInfo } from '../data/categories'
import { usePreferences } from '../preferences/preferences'

/**
 * The numbered topic list from design D. The current topic is open and lists its
 * algorithms; NavLink marks the current page with aria-current="page". On phones it lives in
 * the header's menu, where there may be no current topic (the home page).
 */
export function CategorySidebar({ current }: { current: CategoryInfo | undefined }) {
  const isExplorer = usePreferences().level === 'explorer'
  // Explorer: what works today first, the rest marked "soon".
  const categories = isExplorer ? builtFirst(CATEGORIES, isCategoryBuilt) : CATEGORIES

  return (
    <nav className="sidebar" aria-label="Topics">
      <ol>
        {categories.map((category) => {
          const isOpen = category.id === current?.id
          const algorithms = isExplorer
            ? builtFirst(category.algorithms, (a) => isAlgorithmBuilt(category, a))
            : category.algorithms
          return (
            <li
              key={category.id}
              style={{ '--c': category.color, '--on': category.onColor } as CSSProperties}
            >
              <NavLink
                to={`/${category.id}`}
                end
                className={isOpen ? 'sidebar-category open' : 'sidebar-category'}
              >
                <span className="sidebar-number" aria-hidden="true">
                  {category.number}
                </span>
                {category.name}
                {isExplorer && !isCategoryBuilt(category) && (
                  <>
                    {' '}
                    <span className="soon-tag">Soon</span>
                  </>
                )}
              </NavLink>
              {isOpen && (
                <ul className="sidebar-algorithms">
                  {algorithms.map((algorithm) => (
                    <li key={algorithm.id}>
                      <NavLink to={`/${category.id}/${algorithm.id}`}>
                        {isExplorer ? algorithm.explorerName : algorithm.name}
                        {isExplorer && !isAlgorithmBuilt(category, algorithm) && (
                          <>
                            {' '}
                            <span className="soon-tag">Soon</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
