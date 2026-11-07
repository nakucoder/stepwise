import type { CSSProperties } from 'react'
import type { Frame, Level } from '../engine/types'
import { describeTree, heapEnd, stageHeight, TREE_NAME, treeBox } from './heapTree'

/**
 * The place a scene draws heap sort's tree into (CharacterScene.drawsTree: the beaver's dam), with
 * the tree's words for screen readers. Over the band it is the site's tree's box, with its name
 * (HeapTree.css: its height for the run, shown on a phone where the tree fits); beside the plot it
 * runs the stage's height; in a phone's sheet it is the sheet tree's box. The scene finds it by
 * `data-tree-slot`.
 */
export function TreeSlot({
  frame,
  level,
  place,
}: {
  readonly frame: Frame
  readonly level: Level
  readonly place: 'over' | 'beside' | 'sheet'
}) {
  const count = frame.array.length
  return (
    <figure
      className={`heap-tree is-${place === 'over' ? 'stage' : place} is-slot`}
      style={
        {
          '--tree-h': stageHeight(count),
          '--tree-units': treeBox(count).height,
        } as CSSProperties
      }
      role="img"
      aria-label={describeTree(frame.array.slice(0, heapEnd(frame)), level)}
      data-tree-slot={place}
    >
      {place !== 'sheet' && (
        <figcaption className="heap-tree-name" aria-hidden="true">
          {TREE_NAME[level]}
        </figcaption>
      )}
    </figure>
  )
}
