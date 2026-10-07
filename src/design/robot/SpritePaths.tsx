/** TEMPORARY (design/robot, never merged): draws a pixel sprite from spriteData.ts. */
import type { Sprite } from './spriteData'

const COLORS: Readonly<Record<string, string>> = {
  o: 'var(--robot-outline)',
  s: 'var(--robot-steel)',
  d: 'var(--robot-steel-dark)',
  l: 'var(--robot-steel-light)',
  v: 'var(--robot-visor)',
  e: 'var(--robot-eye)',
  a: 'var(--robot-eye)',
  h: 'var(--robot-eye)',
  t: 'var(--robot-steel-dark)',
}

function pathFor(sprite: Sprite, code: string): string {
  let d = ''
  sprite.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row.charAt(x) === code) d += `M${String(x)} ${String(y)}h1v1h-1z`
    }
  })
  return d
}

/** The sprite as SVG paths, drawn at 1 unit per pixel from (0, 0). */
export function SpritePaths({ sprite }: { readonly sprite: Sprite }) {
  const codes = [...new Set(sprite.join('').replaceAll('.', ''))]
  return (
    <>
      {codes.map((code) => (
        <path key={code} d={pathFor(sprite, code)} fill={COLORS[code]} />
      ))}
    </>
  )
}
