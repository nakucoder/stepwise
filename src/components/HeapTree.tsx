import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { Frame, Level } from '../engine/types'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { swapDurationMs } from '../lib/motion'
import { swappedPair } from '../lib/swappedPair'
import {
  describeTree,
  heapEnd,
  NODE_R,
  nodeAt,
  stageHeight,
  stageNodeAt,
  TREE_NAME,
  treeBox,
} from './heapTree'
import './HeapTree.css'

interface HeapTreeProps {
  readonly frame: Frame
  readonly level: Level
  /** The player's delay between steps, so a climb's move fits inside its step. */
  readonly stepDelayMs: number
  /** Where it sits: over the bars (with its name in its corner), or filling a phone's sheet. */
  readonly placement: 'stage' | 'sheet'
}

/** Percent, for a position over the bars. */
const percent = (fraction: number) => `${String(fraction * 100)}%`

/**
 * Heap sort's tree: the values inside the heap, each a number in a circle at its place in the
 * pyramid, with lines from each parent to its children. The same values and highlights as the
 * bars: the parent and the child it is compared with in the "looking" color, a climb in the
 * "trading" color (it slides along its line), and the lines from the parent the step looks at to
 * its children marked like the arcs on the bars. Sorted values leave the tree.
 *
 * Over the bars it spans the stage's width (circles at fractions of the box, lines stretched to
 * it without thickening); in a phone's sheet it is one drawing scaled to the sheet.
 */
export function HeapTree({ frame, level, stepDelayMs, placement }: HeapTreeProps) {
  const { array } = frame
  const count = array.length
  const end = heapEnd(frame)
  const onStage = placement === 'stage'
  const comparing = frame.highlights.comparing ?? []
  const swapping = frame.highlights.swapping ?? []
  const parent = frame.heap?.parent ?? null
  const children = parent === null ? [] : (frame.heap?.children ?? [])
  // While the parent is compared, its whole family is (as with the arcs on the bars).
  const looking = parent !== null && comparing.includes(parent)
  const trades = (child: number) =>
    parent !== null &&
    children.includes(child) &&
    swapping.includes(parent) &&
    swapping.includes(child)

  // A trade slides the two values along the line between their places, as the bars slide; the
  // top's value leaving for the end slides its replacement up from the end's place.
  const figureRef = useRef<HTMLElement>(null)
  const nodeRefs = useRef<(Element | null)[]>([])
  const previousArray = useRef(array)
  const reducedMotion = useReducedMotion()
  useLayoutEffect(() => {
    const previous = previousArray.current
    previousArray.current = array
    const pair = swappedPair(previous, array)
    if (!pair || reducedMotion) return
    // How far place `from` is from place `to`: in the box's pixels over the bars, in the
    // drawing's units in a sheet.
    const offset = (from: number, to: number) => {
      if (!onStage) {
        const [a, b] = [nodeAt(from, count), nodeAt(to, count)]
        return [a.x - b.x, a.y - b.y]
      }
      const box = figureRef.current?.getBoundingClientRect()
      const [a, b] = [stageNodeAt(from, count), stageNodeAt(to, count)]
      return [(a.x - b.x) * (box?.width ?? 0), (a.y - b.y) * (box?.height ?? 0)]
    }
    // Over the bars a circle is centered on its place by its own transform.
    const centered = onStage ? ' translate(-50%, -50%)' : ''
    const timing = { duration: swapDurationMs(stepDelayMs), easing: 'ease-in-out' }
    const animations = pair.flatMap((k, side) => {
      const node = nodeRefs.current[k]
      const other = pair[1 - side] ?? k
      if (!node || typeof node.animate !== 'function') return []
      const [dx = 0, dy = 0] = offset(other, k)
      return [
        node.animate(
          [
            { transform: `translate(${String(dx)}px, ${String(dy)}px)${centered}` },
            { transform: onStage ? centered.trim() : 'none' },
          ],
          timing,
        ),
      ]
    })
    return () => {
      for (const animation of animations) animation.cancel()
    }
  }, [array, count, onStage, reducedMotion, stepDelayMs])

  const values = array.slice(0, end)
  const edgeClass = (child: number) =>
    trades(child) ? 'is-trading' : looking && children.includes(child) ? 'is-looking' : ''
  const roleOf = (k: number) =>
    swapping.includes(k) ? 'is-swapping' : comparing.includes(k) ? 'is-comparing' : ''
  const nodeClass = (k: number) => (roleOf(k) ? `heap-tree-node ${roleOf(k)}` : 'heap-tree-node')
  const edges = values.flatMap((_, child) => (child === 0 ? [] : [child]))

  if (onStage) {
    // Lines in a drawing stretched to the box (its strokes keep their width), then the circles.
    const W = 1000
    const H = 1000
    return (
      <figure
        ref={figureRef}
        className="heap-tree is-stage"
        style={{ '--tree-h': stageHeight(count) } as CSSProperties}
        role="img"
        aria-label={describeTree(values, level)}
      >
        <figcaption className="heap-tree-name" aria-hidden="true">
          {TREE_NAME[level]}
        </figcaption>
        <svg
          className="heap-tree-lines"
          viewBox={`0 0 ${String(W)} ${String(H)}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {edges.map((child) => {
            const from = stageNodeAt(Math.floor((child - 1) / 2), count)
            const to = stageNodeAt(child, count)
            const kind = edgeClass(child)
            return (
              <line
                key={child}
                className={kind ? `heap-tree-edge ${kind}` : 'heap-tree-edge'}
                x1={from.x * W}
                y1={from.y * H}
                x2={to.x * W}
                y2={to.y * H}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>
        {values.map((value, k) => {
          const { x, y } = stageNodeAt(k, count)
          return (
            <span
              key={k}
              ref={(element) => {
                nodeRefs.current[k] = element
              }}
              className={nodeClass(k)}
              style={{ left: percent(x), top: percent(y) }}
              aria-hidden="true"
            >
              <span className="heap-tree-value">{value}</span>
            </span>
          )
        })}
      </figure>
    )
  }

  const box = treeBox(count)
  return (
    // Its height in the drawing's units, for an upright phone's sheet (WorkspacePhone.css).
    <figure className="heap-tree is-sheet" style={{ '--tree-units': box.height } as CSSProperties}>
      <svg
        className="heap-tree-svg"
        viewBox={`0 0 ${String(box.width)} ${String(box.height)}`}
        // The tree stands at the sheet's foot, clear of the sheet's Close in a top corner.
        preserveAspectRatio="xMidYMax meet"
        role="img"
        aria-label={describeTree(values, level)}
      >
        {/* The lines first, so every circle sits on top of its lines. */}
        {edges.map((child) => {
          const from = nodeAt(Math.floor((child - 1) / 2), count)
          const to = nodeAt(child, count)
          const kind = edgeClass(child)
          return (
            <line
              key={`edge-${String(child)}`}
              className={kind ? `heap-tree-edge ${kind}` : 'heap-tree-edge'}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
            />
          )
        })}
        {values.map((value, k) => {
          const { x, y } = nodeAt(k, count)
          return (
            <g
              key={k}
              ref={(element) => {
                nodeRefs.current[k] = element
              }}
              className={nodeClass(k)}
            >
              <circle cx={x} cy={y} r={NODE_R} />
              <text className="heap-tree-value" x={x} y={y}>
                {value}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
