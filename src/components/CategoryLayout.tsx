import type { CSSProperties, ReactNode } from 'react'
import type { CategoryInfo } from '../data/categories'
import { usePhoneLayout } from '../hooks/useMediaQuery'
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
  /**
   * A message that takes the title's place in the band while it lasts (phones: the numbers don't
   * fit the character, src/components/RangeNotice.tsx). The title stays for screen readers.
   */
  readonly notice?: ReactNode
  readonly className?: string
  readonly children: ReactNode
}

/**
 * Sidebar + category-colored header band, shared by the category and workspace pages.
 * On phones the sidebar moves into the header's menu.
 */
export function CategoryLayout({
  category,
  title,
  subtitle,
  bandExtra,
  notice,
  className,
  children,
}: CategoryLayoutProps) {
  const isPhone = usePhoneLayout()
  return (
    <div
      className="category-layout"
      style={{ '--c': category.color, '--on': category.onColor } as CSSProperties}
    >
      {!isPhone && <CategorySidebar current={category} />}
      <main id="main" tabIndex={-1} className={`category-main ${className ?? ''}`}>
        <header className="band">
          <div className={notice ? 'band-title has-notice' : 'band-title'}>
            <h1 className={notice ? 'visually-hidden' : undefined}>{title}</h1>
            {subtitle && <p className="band-subtitle">{subtitle}</p>}
            {notice}
          </div>
          {bandExtra}
        </header>
        {children}
      </main>
    </div>
  )
}
