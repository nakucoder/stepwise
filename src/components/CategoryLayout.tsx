import type { CSSProperties, ReactNode } from 'react'
import type { CategoryInfo } from '../data/categories'
import { CategorySidebar } from './CategorySidebar'
import './CategoryLayout.css'

interface CategoryLayoutProps {
  readonly category: CategoryInfo
  /** The page's h1, shown in the category color band. */
  readonly title: string
  /** Extra content in the band, after the title. */
  readonly bandExtra?: ReactNode
  readonly className?: string
  readonly children: ReactNode
}

/** Sidebar + category-colored header band, shared by the category and workspace pages. */
export function CategoryLayout({
  category,
  title,
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
          <h1>{title}</h1>
          {bandExtra}
        </header>
        {children}
      </main>
    </div>
  )
}
