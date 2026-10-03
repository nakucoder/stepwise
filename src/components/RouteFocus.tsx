import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/**
 * After an in-app navigation, moves focus to the new page's <main> so keyboard and
 * screen-reader users start at the new content instead of the link they clicked.
 * The first page load is left alone.
 */
export function RouteFocus() {
  const { pathname } = useLocation()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    document.getElementById('main')?.focus()
  }, [pathname])

  return null
}
