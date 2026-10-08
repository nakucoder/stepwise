import './RobotScene.css'
import { SCOUT_PATHS } from './sprites'

/** The scout, as the "Robots" icon on the Show as switch (14 × 16 pixels). */
export function PixelScout() {
  return (
    <svg
      className="pixel-scout"
      viewBox="0 0 14 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d={SCOUT_PATHS.steel} fill="var(--robot-steel)" />
      <path d={SCOUT_PATHS.dark} fill="var(--robot-steel-dark)" />
      <path d={SCOUT_PATHS.light} fill="var(--robot-steel-light)" />
      <path d={SCOUT_PATHS.visor} fill="var(--robot-visor)" />
      <path d={SCOUT_PATHS.eye} fill="var(--robot-eye)" />
      <path d={SCOUT_PATHS.antenna} fill="var(--robot-eye)" />
      <path d={SCOUT_PATHS.outline} fill="var(--robot-outline)" />
    </svg>
  )
}
