import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { findCategory } from '../data/categories'
import { CategorySidebar } from './CategorySidebar'
import { LevelToggle } from './LevelToggle'
import { LookToggle } from './LookToggle'
import { ThemeToggle } from './ThemeToggle'

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {open ? (
        <path stroke="currentColor" strokeWidth="3" d="M5 5l14 14M19 5L5 19" />
      ) : (
        <path fill="currentColor" d="M3 5h18v3H3zM3 10.5h18v3H3zM3 16h18v3H3z" />
      )}
    </svg>
  )
}

/**
 * The phone header's menu: the level and theme switches and the list of topics, which are
 * the header controls and the sidebar on wider screens. It opens below the header, closes on
 * Escape, on the button, or when a link in it goes somewhere.
 */
export function SiteMenu() {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const current = findCategory(pathname.split('/')[1])

  // Following a link in the menu (or anywhere) closes it.
  const [shownFor, setShownFor] = useState(pathname)
  if (shownFor !== pathname) {
    setShownFor(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen(!open)
        }}
      >
        <MenuIcon open={open} />
        <span className="menu-label">Menu</span>
      </button>
      {open && (
        <div id={panelId} className="site-menu">
          <div className="site-menu-settings">
            <LevelToggle />
            <LookToggle />
            <ThemeToggle />
          </div>
          <CategorySidebar current={current} />
        </div>
      )}
    </>
  )
}
