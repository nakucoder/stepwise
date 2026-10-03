import type { CSSProperties } from 'react'
import { NavLink } from 'react-router'
import { CATEGORIES, type CategoryInfo } from '../data/categories'

/**
 * The numbered topic list from design D. The current topic is open and lists its
 * algorithms; NavLink marks the current page with aria-current="page".
 */
export function CategorySidebar({ current }: { current: CategoryInfo }) {
  return (
    <nav className="sidebar" aria-label="Topics">
      <ol>
        {CATEGORIES.map((category) => {
          const isOpen = category.id === current.id
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
              </NavLink>
              {isOpen && (
                <ul className="sidebar-algorithms">
                  {category.algorithms.map((algorithm) => (
                    <li key={algorithm.id}>
                      <NavLink to={`/${category.id}/${algorithm.id}`}>{algorithm.name}</NavLink>
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
