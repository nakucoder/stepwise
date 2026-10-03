import type { Category, Level } from '../engine/types'

/**
 * Category content shown on the home page, sidebar and category pages.
 * Components read from here; nothing about a category is hard-coded in UI code.
 */

export interface AlgorithmEntry {
  /** URL segment, e.g. "bubble-sort" in /sorting/bubble-sort. */
  readonly id: string
  readonly name: string
}

export interface CategoryInfo {
  readonly id: Category
  /** Position in the order most people learn these topics (1-based). */
  readonly number: number
  readonly name: string
  /** One short sentence per level. Explorer text uses no jargon. */
  readonly description: Readonly<Record<Level, string>>
  /** A compact, human-written list of what's inside, for Engineer home cards. */
  readonly algorithmSummary: string
  readonly algorithms: readonly AlgorithmEntry[]
  /** CSS custom properties from tokens.css: the category fill and its text color. */
  readonly color: string
  readonly onColor: string
}

export const CATEGORIES: readonly CategoryInfo[] = [
  {
    id: 'sorting',
    number: 1,
    name: 'Sorting',
    description: {
      explorer: 'Put a jumble of numbers in order, smallest to biggest.',
      engineer: 'Put things in order, from bubble sort to quick sort.',
    },
    algorithmSummary: 'Bubble, selection, insertion, merge, quick, heap, counting',
    algorithms: [
      { id: 'bubble-sort', name: 'Bubble sort' },
      { id: 'selection-sort', name: 'Selection sort' },
      { id: 'insertion-sort', name: 'Insertion sort' },
      { id: 'merge-sort', name: 'Merge sort' },
      { id: 'quick-sort', name: 'Quick sort' },
      { id: 'heap-sort', name: 'Heap sort' },
      { id: 'counting-sort', name: 'Counting sort' },
    ],
    color: 'var(--cat-sorting)',
    onColor: 'var(--cat-on-sorting)',
  },
  {
    id: 'searching',
    number: 2,
    name: 'Searching',
    description: {
      explorer: 'Find the number you want without checking every one.',
      engineer: 'Find one item fast by ruling out half the list each time.',
    },
    algorithmSummary: 'Linear, binary, jump, interpolation',
    algorithms: [
      { id: 'linear-search', name: 'Linear search' },
      { id: 'binary-search', name: 'Binary search' },
      { id: 'jump-search', name: 'Jump search' },
      { id: 'interpolation-search', name: 'Interpolation search' },
    ],
    color: 'var(--cat-searching)',
    onColor: 'var(--cat-on-searching)',
  },
  {
    id: 'linked-lists',
    number: 3,
    name: 'Linked lists',
    description: {
      explorer: 'A chain where each link knows where the next one is.',
      engineer: 'Chains of nodes, each one pointing to the next.',
    },
    algorithmSummary: 'Insert, delete, reverse, find the middle, detect a loop',
    algorithms: [
      { id: 'insert', name: 'Insert a node' },
      { id: 'delete', name: 'Delete a node' },
      { id: 'reverse', name: 'Reverse a list' },
      { id: 'find-middle', name: 'Find the middle' },
      { id: 'detect-loop', name: 'Detect a loop' },
    ],
    color: 'var(--cat-linked-lists)',
    onColor: 'var(--cat-on-linked-lists)',
  },
  {
    id: 'trees',
    number: 4,
    name: 'Trees',
    description: {
      explorer: 'Things that branch out, like a family tree.',
      engineer: 'Branching data: search trees, heaps and traversals.',
    },
    algorithmSummary: 'BST insert and delete, BFS, pre/in/post-order, heaps',
    algorithms: [
      { id: 'bst-insert', name: 'BST insert' },
      { id: 'bst-delete', name: 'BST delete' },
      { id: 'level-order', name: 'Level-order (BFS)' },
      { id: 'pre-order', name: 'Pre-order traversal' },
      { id: 'in-order', name: 'In-order traversal' },
      { id: 'post-order', name: 'Post-order traversal' },
      { id: 'heap-insert', name: 'Heap insert' },
      { id: 'heap-remove', name: 'Heap remove' },
    ],
    color: 'var(--cat-trees)',
    onColor: 'var(--cat-on-trees)',
  },
  {
    id: 'graphs',
    number: 5,
    name: 'Graphs',
    description: {
      explorer: 'Dots joined by lines, like roads between towns.',
      engineer: 'Maps and networks: shortest paths, BFS and DFS.',
    },
    algorithmSummary: 'BFS, DFS, Dijkstra, A*, topological sort, Prim, Kruskal',
    algorithms: [
      { id: 'bfs', name: 'Breadth-first search' },
      { id: 'dfs', name: 'Depth-first search' },
      { id: 'dijkstra', name: 'Dijkstra' },
      { id: 'a-star', name: 'A* search' },
      { id: 'topological-sort', name: 'Topological sort' },
      { id: 'prim', name: 'Prim' },
      { id: 'kruskal', name: 'Kruskal' },
    ],
    color: 'var(--cat-graphs)',
    onColor: 'var(--cat-on-graphs)',
  },
  {
    id: 'hashing',
    number: 6,
    name: 'Hashing',
    description: {
      explorer: 'Give everything its own locker so you find it in one go.',
      engineer: 'Jump straight to the right bucket instead of searching.',
    },
    algorithmSummary: 'Chaining, linear probing, quadratic probing, resizing',
    algorithms: [
      { id: 'chaining', name: 'Separate chaining' },
      { id: 'linear-probing', name: 'Linear probing' },
      { id: 'quadratic-probing', name: 'Quadratic probing' },
      { id: 'resizing', name: 'Resizing' },
    ],
    color: 'var(--cat-hashing)',
    onColor: 'var(--cat-on-hashing)',
  },
  {
    id: 'pattern-matching',
    number: 7,
    name: 'Pattern matching',
    description: {
      explorer: 'Spot a word hiding inside a long sentence.',
      engineer: 'Find a word inside a long text without rereading it.',
    },
    algorithmSummary: 'Brute force, KMP, Boyer-Moore',
    algorithms: [
      { id: 'brute-force', name: 'Brute force' },
      { id: 'kmp', name: 'Knuth-Morris-Pratt' },
      { id: 'boyer-moore', name: 'Boyer-Moore' },
    ],
    color: 'var(--cat-pattern-matching)',
    onColor: 'var(--cat-on-pattern-matching)',
  },
  {
    id: 'dynamic-programming',
    number: 8,
    name: 'Dynamic programming',
    description: {
      explorer: 'Remember answers you already worked out, so you never redo them.',
      engineer: 'Solve each small piece once, save it, and reuse it.',
    },
    algorithmSummary: 'Fibonacci, longest common subsequence, knapsack',
    algorithms: [
      { id: 'fibonacci', name: 'Fibonacci' },
      { id: 'longest-common-subsequence', name: 'Longest common subsequence' },
      { id: 'knapsack', name: 'Knapsack' },
    ],
    color: 'var(--cat-dynamic-programming)',
    onColor: 'var(--cat-on-dynamic-programming)',
  },
]

export function findCategory(id: string | undefined): CategoryInfo | undefined {
  return CATEGORIES.find((category) => category.id === id)
}

export function findAlgorithm(
  category: CategoryInfo,
  id: string | undefined,
): AlgorithmEntry | undefined {
  return category.algorithms.find((algorithm) => algorithm.id === id)
}
