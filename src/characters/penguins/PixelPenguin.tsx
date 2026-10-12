import './PenguinScene.css'
import { STANDING_PATHS } from './sprites'

/** A penguin standing, as the "Penguins" icon on the Show as switch (12 × 14 pixels, no rim). */
export function PixelPenguin() {
  return (
    <svg
      className="pixel-penguin"
      viewBox="0 0 12 14"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d={STANDING_PATHS.belly} fill="var(--penguin-belly)" />
      <path d={STANDING_PATHS.back} fill="var(--penguin-back)" />
      <path d={STANDING_PATHS.orange} fill="var(--penguin-orange)" />
      <path d={STANDING_PATHS.eye} fill="var(--penguin-belly)" />
      <path d={STANDING_PATHS.outline} fill="var(--penguin-outline)" />
    </svg>
  )
}
