import type { ValueRange } from '../engine/input'

interface RangeNoticeProps {
  /** What the stage says, e.g. "The pizza cart carries 1 to 12 boxes." */
  readonly note: string
  /** The values the character can draw. */
  readonly range: ValueRange
  /** Use the numbers' ranks instead: the same order, so the same comparisons and swaps. */
  readonly onUse: () => void
}

/**
 * Over the stage, in place of its caption, when the numbers don't fit the character the learner
 * picked (the pizza cart carries 1 to 12): the stage keeps the numbers and shows bars, and this
 * says why, with a button that swaps each number for its rank. Never done silently.
 */
export function RangeNotice({ note, range, onUse }: RangeNoticeProps) {
  return (
    <div className="range-notice" role="status">
      <p>{note}</p>
      <button type="button" onClick={onUse}>
        Use {range.min}–{range.max}, same order
      </button>
    </div>
  )
}
