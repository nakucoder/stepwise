import { createContext, useContext } from 'react'
import type { Level } from '../engine/types'

export type Theme = 'light' | 'dark'

export const isLevel = (value: string): value is Level =>
  value === 'explorer' || value === 'engineer'

export const isTheme = (value: string): value is Theme => value === 'light' || value === 'dark'

export interface Preferences {
  /** The learning level the user picked, or null if they haven't picked one yet. */
  readonly level: Level | null
  readonly setLevel: (level: Level) => void
  /** The theme in effect: the user's choice if they made one, otherwise the system setting. */
  readonly theme: Theme
  readonly setTheme: (theme: Theme) => void
}

export const PreferencesContext = createContext<Preferences | null>(null)

export function usePreferences(): Preferences {
  const preferences = useContext(PreferencesContext)
  if (!preferences) throw new Error('usePreferences must be used inside <PreferencesProvider>')
  return preferences
}
