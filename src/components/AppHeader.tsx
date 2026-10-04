import type { MouseEvent } from 'react'
import { Link, NavLink } from 'react-router'
import { usePreferences } from '../preferences/preferences'
import './AppHeader.css'
import { WELCOME_PATH } from './LevelGate'
import { LevelToggle } from './LevelToggle'
import { ThemeToggle } from './ThemeToggle'

/** Moves focus to <main> without adding "#main" to the address, which deep links shouldn't carry. */
function skipToMain(event: MouseEvent<HTMLAnchorElement>) {
  const main = document.getElementById('main')
  if (!main) return
  event.preventDefault()
  main.focus()
}

export function AppHeader() {
  const { level } = usePreferences()

  return (
    <header className="app-header">
      <a className="skip-link" href="#main" onClick={skipToMain}>
        Skip to content
      </a>
      {/* The logo opens the welcome screen; "Topics" keeps the home tiles one click away. */}
      <Link className="wordmark" to={WELCOME_PATH}>
        Stepwise
      </Link>
      {/* Until a level is chosen, the level picker is the page, so these would skip past it. */}
      {level && (
        <nav className="app-nav" aria-label="Main">
          <NavLink to="/" end>
            Topics
          </NavLink>
        </nav>
      )}
      <div className="app-header-controls">
        {level && <LevelToggle />}
        <ThemeToggle />
      </div>
    </header>
  )
}
