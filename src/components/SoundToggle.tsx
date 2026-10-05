import { usePreferences } from '../preferences/preferences'
import { useSoundEngine } from '../sound/SoundContext'

function SpeakerIcon({ on }: { readonly on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3 9h4l5-4v14l-5-4H3z" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        d={on ? 'M15.5 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11' : 'M16 9.5l5 5M21 9.5l-5 5'}
      />
    </svg>
  )
}

interface SoundToggleProps {
  /** "stage": beside the Bars/Ducks switch. "controls": a cell in the phone controls. */
  readonly placement: 'stage' | 'controls'
}

/**
 * Turns step sounds on or off. Muted until the learner turns it on; the choice is saved.
 * On = yellow fill + check mark, as everywhere. Sound always repeats what the stage shows.
 */
export function SoundToggle({ placement }: SoundToggleProps) {
  const { sound, setSound } = usePreferences()
  const engine = useSoundEngine()
  const toggle = () => {
    // Started right here in the click: browsers only allow audio to start from a tap or key.
    engine.setEnabled(!sound)
    setSound(!sound)
  }
  const button = (
    <button
      type="button"
      className={placement === 'controls' ? 'control control-sound' : undefined}
      aria-pressed={sound}
      onClick={toggle}
    >
      <SpeakerIcon on={sound} />
      <span className="sound-label">Sound</span>
    </button>
  )
  if (placement === 'controls') return button
  return <div className="look-toggle-track sound-toggle">{button}</div>
}
