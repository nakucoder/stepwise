import { findImplementation } from '../algorithms'
import type { AlgorithmEntry, CategoryInfo } from './categories'

/** Whether this algorithm can be run today (it has an implementation). */
export function isAlgorithmBuilt(category: CategoryInfo, algorithm: AlgorithmEntry): boolean {
  return findImplementation(category.id, algorithm.id) !== undefined
}

/** Whether a topic has at least one algorithm that can be run today. */
export function isCategoryBuilt(category: CategoryInfo): boolean {
  return category.algorithms.some((algorithm) => isAlgorithmBuilt(category, algorithm))
}

/** Built items first, each group keeping its original order. */
export function builtFirst<T>(items: readonly T[], isBuilt: (item: T) => boolean): T[] {
  return [...items.filter(isBuilt), ...items.filter((item) => !isBuilt(item))]
}
