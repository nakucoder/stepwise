import { useCallback, useSyncExternalStore } from 'react'

/** Whether a CSS media query matches right now. Updates live (rotation, resizing). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => undefined
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => {
        list.removeEventListener('change', onChange)
      }
    },
    [query],
  )
  const getSnapshot = () =>
    typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  return useSyncExternalStore(subscribe, getSnapshot)
}

/**
 * Phones, in either orientation: narrow, or short (a phone on its side is about 390px tall).
 * Keep in sync with the `@media` blocks marked "phone layout" in the CSS.
 */
export const PHONE_QUERY = '(max-width: 699px), (max-height: 499px)'

/** True when the phone layout applies: one screen, no page scroll, details in sheets. */
export function usePhoneLayout(): boolean {
  return useMediaQuery(PHONE_QUERY)
}
