import type { ReactNode } from 'react'
import { usePreferences } from '../preferences/preferences'
import { LevelPicker } from './LevelPicker'

/**
 * Shows the level picker until a learning level is saved, then the page itself.
 * The URL is left untouched, so a first visit to a deep link lands there after picking.
 */
export function LevelGate({ children }: { children: ReactNode }) {
  const { level } = usePreferences()
  return level ? children : <LevelPicker />
}
