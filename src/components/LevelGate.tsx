import { useEffect, useRef, type ReactNode } from 'react'
import { usePreferences } from '../preferences/preferences'
import { LevelPicker } from './LevelPicker'

/**
 * Shows the level picker until a learning level is saved, then the page itself.
 * The URL is left untouched, so a first visit to a deep link lands there after picking.
 */
export function LevelGate({ children }: { children: ReactNode }) {
  const { level } = usePreferences()
  const hadLevel = useRef(level !== null)

  // The chosen card is gone after picking, so start keyboard users at the page's <main>.
  useEffect(() => {
    if (level && !hadLevel.current) document.getElementById('main')?.focus()
    hadLevel.current = level !== null
  }, [level])

  return level ? children : <LevelPicker />
}
