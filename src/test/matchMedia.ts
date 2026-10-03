/**
 * jsdom has no window.matchMedia, so tests get a stand-in whose
 * `(prefers-color-scheme: dark)` result can be switched with setSystemDark().
 */

type Listener = (event: MediaQueryListEvent) => void

let systemDark = false
const listeners = new Set<Listener>()

export function setSystemDark(dark: boolean): void {
  systemDark = dark
  for (const listener of [...listeners]) {
    listener({ matches: dark, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent)
  }
}

export function resetMatchMedia(): void {
  systemDark = false
  listeners.clear()
}

export function installMatchMedia(): void {
  window.matchMedia = (query: string): MediaQueryList => {
    const isDarkQuery = query.includes('prefers-color-scheme: dark')
    return {
      get matches() {
        return isDarkQuery && systemDark
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: Listener) => {
        if (isDarkQuery) listeners.add(listener)
      },
      removeEventListener: (_type: string, listener: Listener) => {
        listeners.delete(listener)
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  }
}
