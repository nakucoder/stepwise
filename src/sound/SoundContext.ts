import { createContext, useContext } from 'react'
import { SoundEngine } from './engine'

/** What the UI needs from the engine; tests provide a fake. */
export type SoundPlayer = Pick<SoundEngine, 'isEnabled' | 'setEnabled' | 'play' | 'stopAll'>

/** One engine for the whole app. It sets nothing up until sound is turned on. */
export const SoundContext = createContext<SoundPlayer>(new SoundEngine())

export function useSoundEngine(): SoundPlayer {
  return useContext(SoundContext)
}
