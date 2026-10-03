import { usePreferences } from '../preferences/preferences'

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M14.5 3a9 9 0 1 0 6.5 15.2A8 8 0 0 1 14.5 3z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <path
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
        d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"
      />
    </svg>
  )
}

/** Switches between light and dark. The label names the theme it switches to. */
export function ThemeToggle() {
  const { theme, setTheme } = usePreferences()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${next} theme`}
      onClick={() => {
        setTheme(next)
      }}
    >
      {next === 'dark' ? <MoonIcon /> : <SunIcon />}
      <span className="theme-toggle-text">{next === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
