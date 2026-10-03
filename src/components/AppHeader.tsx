import { Link } from 'react-router'
import { usePreferences } from '../preferences/preferences'
import './AppHeader.css'
import { LevelToggle } from './LevelToggle'
import { ThemeToggle } from './ThemeToggle'

export function AppHeader() {
  const { level } = usePreferences()

  return (
    <header className="app-header">
      <a className="skip-link" href="#main">
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
