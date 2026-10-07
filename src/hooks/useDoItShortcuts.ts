import { useEffect } from 'react'

/** Elements where keys type text: shortcuts are ignored there. */
const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/**
 * Do it mode's keys, by key (in lower case), e.g. t = trade places and k = keep (Explorer;
 * the kind of decision chooses the letters, see doItKinds.ts), h = help, escape = let go of a
 * picked value (Engineer). A key without an action does nothing.
 */
export type DoItKeys = Readonly<Partial<Record<string, () => void>>>

/**
 * Do it mode's keys, while a question is waiting.
 * (Space and the arrows don't step in Do it mode: the learner makes each move.)
 */
export function useDoItShortcuts(active: boolean, keys: DoItKeys): void {
  useEffect(() => {
    if (!active) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof Element && event.target.closest(TYPING)) return
      const action = keys[event.key.toLowerCase()]
      if (!action || event.repeat) return
      event.preventDefault()
      action()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [active, keys])
}
