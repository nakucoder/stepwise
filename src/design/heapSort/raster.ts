/**
 * TEMPORARY (mockup/heap-sort-character, DO NOT MERGE): a small raster the mockups draw their
 * pixel art into, from simple shapes (discs, thick lines, polygons), then outline.
 */

export type Grid = string[]

/** A small raster to draw sprites into: shapes fill codes, then an outline goes round them. */
export class Raster {
  readonly w: number
  readonly h: number
  readonly cells: string[][]
  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.cells = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'))
  }

  get(x: number, y: number): string {
    return this.cells[y]?.[x] ?? '.'
  }

  set(x: number, y: number, code: string): void {
    const row = this.cells[Math.round(y)]
    const at = Math.round(x)
    if (row && at >= 0 && at < this.w) row[at] = code
  }

  /** A filled ellipse (pixel centers inside it). */
  disc(cx: number, cy: number, rx: number, ry: number, code: string): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.set(x, y, code)
  }

  /** A thick line through the points (a disc of the thickness swept along it). */
  path(points: readonly (readonly [number, number])[], thick: number, code: string): void {
    for (let k = 1; k < points.length; k++) {
      const [x0, y0] = points[k - 1] ?? [0, 0]
      const [x1, y1] = points[k] ?? [0, 0]
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4))
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thick / 2, thick / 2, code)
      }
    }
  }

  /** A filled polygon (pixel centers inside it, even-odd). */
  polygon(points: readonly (readonly [number, number])[], code: string): void {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        let inside = false
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i] ?? [0, 0]
          const [xj, yj] = points[j] ?? [0, 0]
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
        }
        if (inside) this.set(x, y, code)
      }
  }

  /** Every empty pixel touching a filled one (4 ways) becomes the outline. */
  outline(code = 'o', keep: readonly string[] = []): void {
    const marks: [number, number][] = []
    const filled = (x: number, y: number) => {
      const c = this.get(x, y)
      return c !== '.' && c !== code && !keep.includes(c)
    }
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (
          this.get(x, y) === '.' &&
          (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))
        )
          marks.push([x, y])
    for (const [x, y] of marks) this.set(x, y, code)
  }

  grid(): Grid {
    return this.cells.map((row) => row.join(''))
  }
}

/** Points along a spiral: from radius r0 at angle a0 to r1 at a1 (radians, y down). */
export function spiral(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
): [number, number][] {
  const points: [number, number][] = []
  const n = 24
  for (let k = 0; k <= n; k++) {
    const t = k / n
    const a = a0 + (a1 - a0) * t
    const r = r0 + (r1 - r0) * t
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return points
}
