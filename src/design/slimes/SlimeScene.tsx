/**
 * TEMPORARY (design/slimes, never merged): the three slime designs for merge sort, drawn the
 * real renderer's way: in the stage field's own pixels, two rows (main, buffer) on one column
 * grid, sprites at whole pixels, each value in its own column. Each moment loops its move.
 *
 * A. Jelly towers: translucent jelly columns, a slime on each; a membrane holds each group.
 * B. Goo tubes: glass tubes filled with goo up to the value, a slime riding the goo; each group
 *    stands in a rack, and a value moving between rows pours from tube to tube.
 * C. Slime mountain: each group is one connected slime, its values the peaks, one face on the
 *    tallest; a split pinches it in two, a merge joins it back.
 */
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import { HOP, shapesOf, SLIME_PATHS, slimeLayout, type Design, type Shape } from './layout'
import type { Moment } from './steps'

const LOOP_MS = 2600

function Slime({ s }: { readonly s: number }) {
  return (
    <g transform={`scale(${String(s)})`}>
      <path d={SLIME_PATHS.rim} className="slime-rim" />
      <path d={SLIME_PATHS.body} className="slime-body" />
      <path d={SLIME_PATHS.shine} className="slime-shine" />
      <path d={SLIME_PATHS.white} className="slime-white" />
      <path d={SLIME_PATHS.dark} className="slime-dark" />
      <path d={SLIME_PATHS.outline} className="slime-outline" />
    </g>
  )
}

function Draw({
  shape,
  s,
  extra = '',
}: {
  readonly shape: Shape
  readonly s: number
  readonly extra?: string
}) {
  const className = `${shape.className}${extra}`
  if (shape.kind === 'text') {
    return (
      <text className={className} x={shape.x} y={shape.y}>
        {shape.text}
      </text>
    )
  }
  if (shape.kind === 'slime') {
    return (
      <g className={className} transform={`translate(${String(shape.x)}, ${String(shape.y)})`}>
        <Slime s={s} />
      </g>
    )
  }
  return (
    <rect
      className={className}
      x={shape.x}
      y={shape.y}
      width={shape.w}
      height={shape.h}
      {...(shape.rx ? { rx: shape.rx } : {})}
    />
  )
}

interface SceneProps {
  readonly design: Design
  readonly moment: Moment
  readonly width: number
  readonly height: number
  readonly motion: boolean
  readonly replay: number
  readonly title: string
}

const anchor = (shapes: readonly Shape[], part: string) =>
  shapes.find((s) => s.part === part && s.kind === 'rect')

export function SlimeScene({ design, moment, width, height, motion, replay, title }: SceneProps) {
  const ref = useRef<SVGSVGElement>(null)
  const values = moment.after.main.concat(moment.after.buffer ?? []).filter((v) => v !== null)
  const geo = slimeLayout({ width, height }, moment.after.main.length, Math.max(...values, 1))
  const { s } = geo
  const before = useMemo(() => shapesOf(design, moment.before, geo), [design, moment, geo])
  const after = useMemo(() => shapesOf(design, moment.after, geo), [design, moment, geo])
  // What changed between the two states: groups that go away or appear, values that move.
  const parts = (list: readonly Shape[]) => new Set(list.map((sh) => sh.part))
  const gone = [...parts(before)].filter((p) => p.startsWith('group-') && !parts(after).has(p))
  const moved = [...parts(after)].filter((p) => {
    if (!p.startsWith('v-')) return false
    const a = anchor(before, p)
    const b = anchor(after, p)
    return a && b && (a.x !== b.x || a.y + a.h !== b.y + b.h)
  })

  useLayoutEffect(() => {
    const svg = ref.current
    if (!svg || !motion || typeof svg.animate !== 'function') return
    const run: Animation[] = []
    const loop = { duration: LOOP_MS, iterations: Infinity }
    const all = (selector: string) => [...svg.querySelectorAll<SVGElement>(selector)]
    // Values that move: from where they stood before to where they stand now.
    for (const part of moved) {
      const a = anchor(before, part)
      const b = anchor(after, part)
      if (!a || !b) continue
      const dx = a.x + a.w / 2 - (b.x + b.w / 2)
      const dy = a.y + a.h - (b.y + b.h)
      if (design === 'tubes') {
        // The pour: the goo drains from the old tube and fills the new one.
        for (const goo of all(`[data-part="${part}"] .goo, [data-part="${part}"] .chip`)) {
          goo.style.transformBox = 'fill-box'
          goo.style.transformOrigin = '50% 100%'
          run.push(
            goo.animate(
              [
                { transform: 'scaleY(0)' },
                { transform: 'scaleY(0)', offset: 0.35 },
                { transform: 'scaleY(1)', offset: 0.7 },
                { transform: 'scaleY(1)' },
              ],
              loop,
            ),
          )
        }
        for (const ghost of all(`[data-ghost="${part}"]`)) {
          ghost.style.transformBox = 'fill-box'
          ghost.style.transformOrigin = '50% 100%'
          run.push(
            ghost.animate(
              [
                { transform: 'scaleY(1)' },
                { transform: 'scaleY(1)', offset: 0.15 },
                { transform: 'scaleY(0)', offset: 0.5 },
                { transform: 'scaleY(0)' },
              ],
              loop,
            ),
          )
        }
        for (const rider of all(`[data-part="${part}"] .rider`)) {
          run.push(
            rider.animate(
              [
                { opacity: 0 },
                { opacity: 0, offset: 0.6 },
                { opacity: 1, offset: 0.7 },
                { opacity: 1 },
              ],
              loop,
            ),
          )
        }
      } else {
        const lift = -HOP * s * 2
        for (const el of all(`[data-part="${part}"]`)) {
          run.push(
            el.animate(
              [
                { transform: `translate(${String(dx)}px, ${String(dy)}px)` },
                { transform: `translate(${String(dx)}px, ${String(dy)}px)`, offset: 0.2 },
                {
                  transform: `translate(${String(dx / 2)}px, ${String(dy / 2 + lift)}px)`,
                  offset: 0.45,
                },
                { transform: 'translate(0px, 0px)', offset: 0.7 },
                { transform: 'translate(0px, 0px)' },
              ],
              { ...loop, easing: 'ease-in-out' },
            ),
          )
        }
      }
    }
    // Groups: the old ones fade (the mountain's bridge pinches), the new ones appear.
    for (const el of all('[data-was]')) {
      if (design === 'mountain') {
        el.style.transformBox = 'fill-box'
        el.style.transformOrigin = '50% 50%'
      }
      run.push(
        el.animate(
          [
            { opacity: 1, transform: 'scaleX(1)' },
            { opacity: 1, transform: 'scaleX(1)', offset: 0.25 },
            {
              opacity: 0,
              transform: design === 'mountain' ? 'scaleX(0.4)' : 'scaleX(1)',
              offset: 0.55,
            },
            { opacity: 0, transform: 'scaleX(1)' },
          ],
          loop,
        ),
      )
    }
    for (const el of all('[data-new]')) {
      run.push(
        el.animate(
          [
            { opacity: 0 },
            { opacity: 0, offset: 0.45 },
            { opacity: 1, offset: 0.7 },
            { opacity: 1 },
          ],
          loop,
        ),
      )
      if (design === 'jelly' || design === 'mountain') {
        // The join wobbles: the special moment for A and C.
        el.style.transformBox = 'fill-box'
        el.style.transformOrigin = '50% 100%'
        run.push(
          el.animate(
            [
              { transform: 'scale(1, 1)' },
              { transform: 'scale(1, 1)', offset: 0.6 },
              { transform: 'scale(1.04, 0.94)', offset: 0.72 },
              { transform: 'scale(0.98, 1.03)', offset: 0.84 },
              { transform: 'scale(1, 1)' },
            ],
            loop,
          ),
        )
      }
    }
    for (const el of all('[data-part="marks"]')) {
      run.push(
        el.animate([{ opacity: 0.25 }, { opacity: 1, offset: 0.5 }, { opacity: 0.25 }], {
          duration: 1200,
          iterations: Infinity,
        }),
      )
    }
    if (moment.after.final) {
      all('[data-part="final"]').forEach((el) => {
        run.push(
          el.animate(
            [
              { opacity: 0 },
              { opacity: 0, offset: 0.1 },
              { opacity: 1, offset: 0.3 },
              { opacity: 1 },
            ],
            loop,
          ),
        )
      })
      all('.rider').forEach((el, k) => {
        const t = 0.35 + k * 0.06
        run.push(
          el.animate(
            [
              { transform: 'translateY(0)' },
              { transform: 'translateY(0)', offset: t },
              { transform: `translateY(${String(-HOP * s)}px)`, offset: t + 0.05 },
              { transform: 'translateY(0)', offset: t + 0.1 },
              { transform: 'translateY(0)' },
            ],
            loop,
          ),
        )
      })
    }
    return () => {
      for (const animation of run) animation.cancel()
    }
    // A replay, a new moment, size or design restarts the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment, replay, motion, width, height, design])

  // Draw the "after" state, grouped by part so a value moves as one; plus the groups that are
  // going away (animated out), and for the pour, the old goo draining.
  const byPart = new Map<string, Shape[]>()
  for (const shape of after) byPart.set(shape.part, [...(byPart.get(shape.part) ?? []), shape])
  const newGroups = new Set(
    [...parts(after)].filter((p) => p.startsWith('group-') && !parts(before).has(p)),
  )
  return (
    <svg
      ref={ref}
      className={`slime-scene design-${design}`}
      width={width}
      height={height}
      style={{ '--slime-font': `${String(geo.font)}px` } as CSSProperties}
      role="img"
      aria-label={`${title}: ${moment.caption}`}
    >
      {motion &&
        gone.flatMap((part) =>
          before
            .filter((sh) => sh.part === part)
            .map((sh, k) => (
              <g key={`was-${part}-${String(k)}`} data-was={part}>
                <Draw shape={sh} s={s} />
              </g>
            )),
        )}
      {motion &&
        design === 'tubes' &&
        moved.flatMap((part) =>
          before
            .filter(
              (sh) =>
                sh.part === part &&
                (sh.className.startsWith('goo') || sh.className.startsWith('chip')),
            )
            .map((sh, k) => (
              <g key={`ghost-${part}-${String(k)}`} data-ghost={part}>
                <Draw shape={sh} s={s} extra=" is-ghost" />
              </g>
            )),
        )}
      {[...byPart].map(([part, shapes]) => (
        <g key={part} data-part={part} {...(newGroups.has(part) ? { 'data-new': part } : {})}>
          {shapes.map((sh, k) => (
            <Draw key={k} shape={sh} s={s} />
          ))}
        </g>
      ))}
    </svg>
  )
}
