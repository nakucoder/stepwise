import type { MouseEvent } from 'react'
import { Link } from 'react-router'
import { usePreferences } from '../preferences/preferences'
import './AppHeader.css'
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
      <Link className="wordmark" to="/">
        Stepwise
      </Link>
      <div className="app-header-controls">
        {/* Until a level is chosen, the level picker is the page, so the toggle would repeat it. */}
        {level && <LevelToggle />}
        <ThemeToggle />
      </div>
    </header>
  )
}
