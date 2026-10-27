import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { Frame, Level } from '../engine/types'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { swapDurationMs } from '../lib/motion'
import { swappedPair } from '../lib/swappedPair'
import { describeTree, heapEnd, NODE_R, nodeAt, TREE_NAME, treeBox } from './heapTree'
import './HeapTree.css'

interface HeapTreeProps {
  readonly frame: Frame
  readonly level: Level
  /** The player's delay between steps, so a climb's move fits inside its step. */
  readonly stepDelayMs: number
  /** Where it sits: over the bars (with its name in its corner), or filling a phone's sheet. */
  readonly placement: 'stage' | 'sheet'
}

/**
 * Heap sort's tree over the bars: the values inside the heap, each a number in a circle at its
 * place in the pyramid, with lines from each parent to its children. The same values and
 * highlights as the bars: the parent and the child it is compared with in the "looking" color,
 * a climb in the "trading" color (it slides along its line), and the lines from the parent the
 * step looks at to its children marked like the arcs on the bars. Sorted values leave the tree.
 */
export function HeapTree({ frame, level, stepDelayMs, placement }: HeapTreeProps) {
  const { array } = frame
  const count = array.length
  const end = heapEnd(frame)
  const box = treeBox(count)
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
  const nodeRefs = useRef<(SVGGElement | null)[]>([])
  const previousArray = useRef(array)
  const reducedMotion = useReducedMotion()
  useLayoutEffect(() => {
    const previous = previousArray.current
    previousArray.current = array
    const pair = swappedPair(previous, array)
    if (!pair || reducedMotion) return
    const timing = { duration: swapDurationMs(stepDelayMs), easing: 'ease-in-out' }
    const animations = pair.flatMap((k, side) => {
      const node = nodeRefs.current[k]
      const other = pair[1 - side] ?? k
      if (!node || typeof node.animate !== 'function') return []
      const from = nodeAt(other, count)
      const to = nodeAt(k, count)
      return [
        node.animate(
          [
            { transform: `translate(${String(from.x - to.x)}px, ${String(from.y - to.y)}px)` },
            { transform: 'none' },
          ],
          timing,
        ),
      ]
    })
    return () => {
      for (const animation of animations) animation.cancel()
    }
  }, [array, count, reducedMotion, stepDelayMs])

  const values = array.slice(0, end)
  const edgeClass = (child: number) =>
    trades(child) ? 'is-trading' : looking && children.includes(child) ? 'is-looking' : ''

  return (
    <figure
      className={`heap-tree is-${placement}`}
      style={{ '--tree-units': box.height } as CSSProperties}
    >
      {placement === 'stage' && (
        <figcaption className="heap-tree-name" aria-hidden="true">
          {TREE_NAME[level]}
        </figcaption>
      )}
      <svg
        className="heap-tree-svg"
        viewBox={`0 0 ${String(box.width)} ${String(box.height)}`}
        // In a sheet the tree stands at its foot, clear of the sheet's Close in a top corner.
        preserveAspectRatio={placement === 'sheet' ? 'xMidYMax meet' : 'xMidYMid meet'}
        role="img"
        aria-label={describeTree(values, level)}
      >
        {/* The lines first, so every circle sits on top of its lines. */}
        {values.map((_, child) => {
          if (child === 0) return null
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
          const role = swapping.includes(k)
            ? 'is-swapping'
            : comparing.includes(k)
              ? 'is-comparing'
              : ''
          return (
            <g
              key={k}
              ref={(element) => {
                nodeRefs.current[k] = element
              }}
              className={role ? `heap-tree-node ${role}` : 'heap-tree-node'}
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
