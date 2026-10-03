/**
 * Safe access to user preferences in localStorage.
 *
 * localStorage can throw (private browsing, blocked storage, quota) or hold values written
 * by an older version of the app, so every read is wrapped in try/catch and validated, and
 * every write is best-effort. Stepwise stores only these preferences: no accounts, no age,
 * no personal data.
 */

export const STORAGE_KEYS = {
  level: 'stepwise:level',
  theme: 'stepwise:theme',
} as const

/** Returns the stored value if it passes `isValid`, otherwise `null`. Never throws. */
export function readPref<T extends string>(
  key: string,
  isValid: (value: string) => value is T,
): T | null {
  try {
    const value = window.localStorage.getItem(key)
    return value !== null && isValid(value) ? value : null
  } catch {
    return null
  }
}

/** Stores a value; returns whether it was saved. Never throws. */
export function writePref(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
