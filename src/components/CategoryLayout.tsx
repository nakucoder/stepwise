import type { CSSProperties, ReactNode } from 'react'
import type { CategoryInfo } from '../data/categories'
import { CategorySidebar } from './CategorySidebar'
import './CategoryLayout.css'

interface CategoryLayoutProps {
  readonly category: CategoryInfo
  /** The page's h1, shown in the category color band. */
  readonly title: string
  /** A smaller line under the title (e.g. the real name under an Explorer name). */
  readonly subtitle?: string
  /** Extra content in the band, after the title. */
  readonly bandExtra?: ReactNode
  readonly className?: string
  readonly children: ReactNode
}

/** Sidebar + category-colored header band, shared by the category and workspace pages. */
export function CategoryLayout({
  category,
  title,
  subtitle,
  bandExtra,
  className,
  children,
}: CategoryLayoutProps) {
  return (
    <div
      className="category-layout"
      style={{ '--c': category.color, '--on': category.onColor } as CSSProperties}
    >
      <CategorySidebar current={category} />
      <main id="main" tabIndex={-1} className={`category-main ${className ?? ''}`}>
        <header className="band">
          <div className="band-title">
            <h1>{title}</h1>
            {subtitle && <p className="band-subtitle">{subtitle}</p>}
          </div>
          {bandExtra}
        </header>
        {children}
      </main>
    </div>
  )
}
