/**
 * jsdom has no window.matchMedia, so tests get a stand-in. The media features the app reads
 * can be switched with setSystemDark() and setReducedMotion(); listeners are notified like
 * a real MediaQueryList.
 */

type Listener = (event: MediaQueryListEvent) => void

const DARK = '(prefers-color-scheme: dark)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

const matches = new Map<string, boolean>()
const listeners = new Map<string, Set<Listener>>()

function setFeature(query: string, value: boolean): void {
  matches.set(query, value)
  for (const listener of [...(listeners.get(query) ?? [])]) {
    listener({ matches: value, media: query } as MediaQueryListEvent)
  }
}

export function setSystemDark(dark: boolean): void {
  setFeature(DARK, dark)
}

export function setReducedMotion(reduce: boolean): void {
  setFeature(REDUCED_MOTION, reduce)
}

export function resetMatchMedia(): void {
  matches.clear()
  listeners.clear()
}

export function installMatchMedia(): void {
  window.matchMedia = (rawQuery: string): MediaQueryList => {
    const query = rawQuery.trim()
    return {
      get matches() {
        return matches.get(query) ?? false
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: Listener) => {
        const set = listeners.get(query) ?? new Set<Listener>()
        set.add(listener)
        listeners.set(query, set)
      },
      removeEventListener: (_type: string, listener: Listener) => {
        listeners.get(query)?.delete(listener)
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  }
}
