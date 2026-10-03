import './AppHeader.css'
import { LevelToggle } from './LevelToggle'
import { ThemeToggle } from './ThemeToggle'

export function AppHeader() {
  return (
    <header className="app-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <a className="wordmark" href="/">
        Stepwise
      </a>
      <div className="app-header-controls">
        <LevelToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}
