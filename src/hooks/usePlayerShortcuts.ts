import { useEffect } from 'react'
import type { PlayerControls } from './usePlayer'

/** Elements where keys type text: every shortcut is ignored there. */
const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/**
 * Controls that Space activates natively. When one has focus, Space is left to the browser
 * (pressing that control); elsewhere (the page, the stage, nothing) Space is play/pause.
 */
const SPACE_ACTIVATES = [
  'button',
  'a[href]',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
].join(', ')

/**
 * Keyboard shortcuts for the player, listened for on the whole page:
 * Space = play/pause (unless a control has focus), Left/Right = step, Home/End = start/end.
 */
export function usePlayerShortcuts(controls: PlayerControls, enabled = true): void {
  const { togglePlay, stepBack, stepForward, toStart, toEnd } = controls

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest(TYPING)) return

      switch (event.key) {
        case ' ':
          if (target?.closest(SPACE_ACTIVATES)) return
          event.preventDefault()
          // Holding Space shouldn't flicker between play and pause.
          if (!event.repeat) togglePlay()
          return
        case 'ArrowLeft':
          event.preventDefault()
          stepBack()
          return
        case 'ArrowRight':
          event.preventDefault()
          stepForward()
          return
        case 'Home':
          event.preventDefault()
          toStart()
          return
        case 'End':
          event.preventDefault()
          toEnd()
          return
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [enabled, togglePlay, stepBack, stepForward, toStart, toEnd])
}
