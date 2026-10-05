import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { Level } from '../engine/types'
import { readPref, STORAGE_KEYS, writePref } from '../lib/storage'
import {
  isLevel,
  isLook,
  isTheme,
  PreferencesContext,
  type Look,
  type Preferences,
  type Theme,
} from './preferences'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => undefined
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => {
    query.removeEventListener('change', onChange)
  }
}

function getSystemTheme(): Theme {
  if (typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/**
 * Holds the learning level, theme and stage look, saves them to localStorage, and mirrors them onto
 * <html> as data-level and data-theme so CSS tokens can respond.
 *
 * The theme follows the system until the user picks one; their choice then overrides it.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<Level | null>(() => readPref(STORAGE_KEYS.level, isLevel))
  const [chosenTheme, setChosenTheme] = useState<Theme | null>(() =>
    readPref(STORAGE_KEYS.theme, isTheme),
  )
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme)
  const theme = chosenTheme ?? systemTheme
  const [chosenLook, setChosenLook] = useState<Look | null>(() =>
    readPref(STORAGE_KEYS.look, isLook),
  )
  const look = chosenLook ?? (level === 'explorer' ? 'ducks' : 'bars')

  useEffect(() => {
    const root = document.documentElement
    if (level) root.dataset.level = level
    else delete root.dataset.level
  }, [level])

  useEffect(() => {
    // Without an explicit choice, leave data-theme unset so CSS follows the system setting.
    const root = document.documentElement
    if (chosenTheme) root.dataset.theme = chosenTheme
    else delete root.dataset.theme
  }, [chosenTheme])

  const setLevel = useCallback((next: Level) => {
    setLevelState(next)
    writePref(STORAGE_KEYS.level, next)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setChosenTheme(next)
    writePref(STORAGE_KEYS.theme, next)
  }, [])

  const setLook = useCallback((next: Look) => {
    setChosenLook(next)
    writePref(STORAGE_KEYS.look, next)
  }, [])

  const value = useMemo<Preferences>(
    () => ({ level, setLevel, theme, setTheme, look, setLook }),
    [level, setLevel, theme, setTheme, look, setLook],
  )

  return <PreferencesContext value={value}>{children}</PreferencesContext>
}
