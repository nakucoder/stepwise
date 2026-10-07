import { createContext, useContext } from 'react'
import type { Level } from '../engine/types'

export type Theme = 'light' | 'dark'

export const isLevel = (value: string): value is Level =>
  value === 'explorer' || value === 'engineer'

export const isTheme = (value: string): value is Theme => value === 'light' || value === 'dark'

/**
 * How the stage draws the numbers: plain bars, or the algorithm's character (bubble sort's
 * ducks). One choice for every algorithm; an algorithm without a character always shows bars.
 */
export type Look = 'bars' | 'character'

export const isLook = (value: string): value is Look => value === 'bars' || value === 'character'

/** What may be saved: a look, or "ducks" from before characters had a registry. */
export const isSavedLook = (value: string): value is Look | 'ducks' =>
  isLook(value) || value === 'ducks'

/** A saved look as a look: an old "ducks" is the character, so nobody's choice resets. */
export const lookFromSaved = (saved: Look | 'ducks' | null): Look | null =>
  saved === 'ducks' ? 'character' : saved

/** Sound is saved as on or off; with nothing saved it is off. */
export type SoundSetting = 'on' | 'off'

export const isSoundSetting = (value: string): value is SoundSetting =>
  value === 'on' || value === 'off'

export interface Preferences {
  /** The learning level the user picked, or null if they haven't picked one yet. */
  readonly level: Level | null
  readonly setLevel: (level: Level) => void
  /** The theme in effect: the user's choice if they made one, otherwise the system setting. */
  readonly theme: Theme
  readonly setTheme: (theme: Theme) => void
  /** The look in effect: the user's choice if they made one, else the character for Explorer, bars for Engineer. */
  readonly look: Look
  readonly setLook: (look: Look) => void
  /** Whether steps make sounds. Off until the user turns it on. */
  readonly sound: boolean
  readonly setSound: (on: boolean) => void
}

export const PreferencesContext = createContext<Preferences | null>(null)

export function usePreferences(): Preferences {
  const preferences = useContext(PreferencesContext)
  if (!preferences) throw new Error('usePreferences must be used inside <PreferencesProvider>')
  return preferences
}
