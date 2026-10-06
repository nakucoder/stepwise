import { useEffect } from 'react'

/** Elements where keys type text: shortcuts are ignored there. */
const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

interface DoItKeys {
  readonly t: () => void
  readonly k: () => void
  readonly h: () => void
}

/**
 * Do it mode's keys, while a question is waiting: T = trade places, K = keep them, H = help.
 * (Space and the arrows don't step in Do it mode: the learner makes each move.)
 */
export function useDoItShortcuts(active: boolean, keys: DoItKeys): void {
  const { t, k, h } = keys
  useEffect(() => {
    if (!active) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof Element && event.target.closest(TYPING)) return
      const action = { t, k, h }[event.key.toLowerCase()]
      if (!action || event.repeat) return
      event.preventDefault()
      action()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [active, t, k, h])
}
