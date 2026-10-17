import './SpaceshipScene.css'
import { fighterPaths } from './sprites'

const ICON = fighterPaths(9)

/** The smallest fighter, as the "Spaceships" icon on the Show as switch (9 × 9 pixels). */
export function PixelFighter() {
  return (
    <svg
      className="pixel-fighter"
      viewBox="0 0 9 9"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICON.hull} fill="var(--space-hull)" />
      <path d={ICON.wing} fill="var(--space-wing)" />
      <path d={ICON.glow} fill="var(--space-glow)" />
      <path d={ICON.outline} fill="var(--space-outline)" />
    </svg>
  )
}
