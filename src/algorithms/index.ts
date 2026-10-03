import type { Algorithm } from '../engine/types'
import { bubbleSort } from './sorting/bubbleSort'

/** Every implemented algorithm, keyed by its URL: "category/algorithm-id". */
export const ALGORITHMS: Readonly<Record<string, Algorithm>> = Object.fromEntries(
  [bubbleSort].map((algorithm) => [`${algorithm.category}/${algorithm.id}`, algorithm]),
)

export function findImplementation(
  categoryId: string | undefined,
  algorithmId: string | undefined,
): Algorithm | undefined {
  return ALGORITHMS[`${String(categoryId)}/${String(algorithmId)}`]
}
