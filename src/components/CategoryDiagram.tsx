import type { ReactNode } from 'react'
import type { Category } from '../engine/types'

/** Small line drawings of each topic, from design D. Drawn in currentColor. */
const DIAGRAMS: Readonly<Record<Category, { outline: boolean; shapes: ReactNode }>> = {
  sorting: {
    outline: false,
    shapes: (
      <>
        <rect x="4" y="44" width="14" height="14" />
        <rect x="24" y="36" width="14" height="22" />
        <rect x="44" y="28" width="14" height="30" />
        <rect x="64" y="20" width="14" height="38" />
        <rect x="84" y="12" width="14" height="46" />
        <rect x="104" y="4" width="14" height="54" />
      </>
    ),
  },
  searching: {
    outline: true,
    shapes: (
      <>
        <rect x="4" y="22" width="16" height="16" />
        <rect x="24" y="22" width="16" height="16" />
        <rect x="44" y="22" width="16" height="16" />
        <rect x="64" y="22" width="16" height="16" fill="currentColor" />
        <rect x="84" y="22" width="16" height="16" />
        <rect x="104" y="22" width="12" height="16" />
        <path d="M44 50h56M44 46v8M100 46v8" />
      </>
    ),
  },
  'linked-lists': {
    outline: true,
    shapes: (
      <>
        <rect x="2" y="20" width="24" height="20" />
        <rect x="46" y="20" width="24" height="20" />
        <rect x="90" y="20" width="24" height="20" />
        <path d="M26 30h16M38 25l5 5-5 5M70 30h16M82 25l5 5-5 5" />
      </>
    ),
  },
  trees: {
    outline: true,
    shapes: (
      <>
        <path d="M60 10 32 30M60 10l28 20M32 30 18 50M32 30l14 20M88 30l14 20" />
        <circle cx="60" cy="10" r="6" fill="currentColor" />
        <circle cx="32" cy="30" r="6" fill="currentColor" />
        <circle cx="88" cy="30" r="6" fill="currentColor" />
        <circle cx="18" cy="50" r="6" fill="currentColor" />
        <circle cx="46" cy="50" r="6" fill="currentColor" />
        <circle cx="102" cy="50" r="6" fill="currentColor" />
      </>
    ),
  },
  graphs: {
    outline: true,
    shapes: (
      <>
        <path d="M14 14 58 8l46 18-40 26L14 14l44-6M58 8l6 44M14 14l-2 34 52 4" />
        <circle cx="14" cy="14" r="6" fill="currentColor" />
        <circle cx="58" cy="8" r="6" fill="currentColor" />
        <circle cx="104" cy="26" r="6" fill="currentColor" />
        <circle cx="64" cy="52" r="6" fill="currentColor" />
        <circle cx="12" cy="48" r="6" fill="currentColor" />
      </>
    ),
  },
  hashing: {
    outline: true,
    shapes: (
      <>
        <rect x="70" y="4" width="46" height="12" />
        <rect x="70" y="24" width="46" height="12" />
        <rect x="70" y="44" width="46" height="12" />
        <path d="M6 10h20l18 20h22M6 30h20l18-20h22M6 50h38l22 0" />
        <rect x="76" y="7" width="10" height="6" fill="currentColor" stroke="none" />
        <rect x="76" y="47" width="10" height="6" fill="currentColor" stroke="none" />
        <rect x="90" y="47" width="10" height="6" fill="currentColor" stroke="none" />
      </>
    ),
  },
  'pattern-matching': {
    outline: true,
    shapes: (
      <>
        <path d="M4 12h112M4 12v14M18 12v14M32 12v14M46 12v14M60 12v14M74 12v14M88 12v14M102 12v14M116 12v14M4 26h112" />
        <rect x="46" y="36" width="42" height="14" fill="currentColor" />
        <path d="M46 26v10M88 26v10" strokeDasharray="3 3" />
      </>
    ),
  },
  'dynamic-programming': {
    outline: true,
    shapes: (
      <>
        <path d="M10 6h100v48H10zM10 22h100M10 38h100M35 6v48M60 6v48M85 6v48" />
        <rect x="10" y="6" width="25" height="16" fill="currentColor" />
        <rect x="35" y="6" width="25" height="16" fill="currentColor" />
        <rect x="10" y="22" width="25" height="16" fill="currentColor" />
        <rect x="60" y="6" width="25" height="16" fill="currentColor" />
        <rect x="35" y="22" width="25" height="16" fill="currentColor" />
      </>
    ),
  },
}

export function CategoryDiagram({ id, className }: { id: Category; className?: string }) {
  const { outline, shapes } = DIAGRAMS[id]
  return (
    <svg
      className={className}
      viewBox="0 0 120 60"
      aria-hidden="true"
      focusable="false"
      fill={outline ? 'none' : 'currentColor'}
      stroke={outline ? 'currentColor' : undefined}
      strokeWidth={outline ? 3 : undefined}
    >
      {shapes}
    </svg>
  )
}
