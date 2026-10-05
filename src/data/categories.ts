import type { Category, Level } from '../engine/types'

/**
 * Category content shown on the home page, sidebar and category pages.
 * Components read from here; nothing about a category is hard-coded in UI code.
 */

export interface AlgorithmEntry {
  /** URL segment, e.g. "bubble-sort" in /sorting/bubble-sort. */
  readonly id: string
  readonly name: string
  /** Jargon-free name shown in Explorer mode, e.g. "Bubble the biggest to the end". */
  readonly explorerName: string
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
      { id: 'bubble-sort', name: 'Bubble sort', explorerName: 'Bubble the biggest to the end' },
      {
        id: 'selection-sort',
        name: 'Selection sort',
        explorerName: 'Pick the smallest, one at a time',
      },
      { id: 'insertion-sort', name: 'Insertion sort', explorerName: 'Slot each card into place' },
      {
        id: 'merge-sort',
        name: 'Merge sort',
        explorerName: 'Split in half, then zip back together',
      },
      { id: 'quick-sort', name: 'Quick sort', explorerName: 'Pick a leader and split around it' },
      { id: 'heap-sort', name: 'Heap sort', explorerName: 'Build a pyramid, then take the top' },
      {
        id: 'counting-sort',
        name: 'Counting sort',
        explorerName: 'Count every number, then line them up',
      },
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
      { id: 'linear-search', name: 'Linear search', explorerName: 'Check one by one' },
      {
        id: 'binary-search',
        name: 'Binary search',
        explorerName: 'Guess the middle, then halve it',
      },
      { id: 'jump-search', name: 'Jump search', explorerName: 'Jump ahead, then step back' },
      {
        id: 'interpolation-search',
        name: 'Interpolation search',
        explorerName: 'Make a smart guess, like in a dictionary',
      },
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
      { id: 'insert', name: 'Insert a node', explorerName: 'Add a link to the chain' },
      { id: 'delete', name: 'Delete a node', explorerName: 'Take a link out of the chain' },
      { id: 'reverse', name: 'Reverse a list', explorerName: 'Turn the chain around' },
      {
        id: 'find-middle',
        name: 'Find the middle',
        explorerName: 'Find the middle with a fast and a slow walker',
      },
      {
        id: 'detect-loop',
        name: 'Detect a loop',
        explorerName: 'Spot a chain that goes in a circle',
      },
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
      { id: 'bst-insert', name: 'BST insert', explorerName: 'Add a number to a sorted tree' },
      { id: 'bst-delete', name: 'BST delete', explorerName: 'Remove a number from a sorted tree' },
      {
        id: 'level-order',
        name: 'Level-order (BFS)',
        explorerName: 'Visit the tree level by level',
      },
      {
        id: 'pre-order',
        name: 'Pre-order traversal',
        explorerName: 'Visit each parent before its children',
      },
      {
        id: 'in-order',
        name: 'In-order traversal',
        explorerName: 'Read the tree from left to right',
      },
      {
        id: 'post-order',
        name: 'Post-order traversal',
        explorerName: 'Visit the children before the parent',
      },
      {
        id: 'heap-insert',
        name: 'Heap insert',
        explorerName: 'Add to the pyramid and let it rise',
      },
      { id: 'heap-remove', name: 'Heap remove', explorerName: 'Take the top off the pyramid' },
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
      {
        id: 'bfs',
        name: 'Breadth-first search',
        explorerName: 'Spread out like ripples in a pond',
      },
      { id: 'dfs', name: 'Depth-first search', explorerName: 'Follow one path as far as it goes' },
      { id: 'dijkstra', name: 'Dijkstra', explorerName: 'Find the shortest route on a map' },
      {
        id: 'a-star',
        name: 'A* search',
        explorerName: 'Find the shortest route, heading for the goal',
      },
      {
        id: 'topological-sort',
        name: 'Topological sort',
        explorerName: 'Put tasks in do-this-first order',
      },
      { id: 'prim', name: 'Prim', explorerName: 'Connect every town, growing from one' },
      { id: 'kruskal', name: 'Kruskal', explorerName: 'Connect every town, cheapest roads first' },
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
      {
        id: 'chaining',
        name: 'Separate chaining',
        explorerName: 'Lockers that can hold a short list',
      },
      {
        id: 'linear-probing',
        name: 'Linear probing',
        explorerName: 'If a locker is taken, try the next one',
      },
      {
        id: 'quadratic-probing',
        name: 'Quadratic probing',
        explorerName: 'If a locker is taken, jump further each time',
      },
      { id: 'resizing', name: 'Resizing', explorerName: 'Move everything to more lockers' },
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
      { id: 'brute-force', name: 'Brute force', explorerName: 'Try every starting spot' },
      { id: 'kmp', name: 'Knuth-Morris-Pratt', explorerName: 'Never re-read what already matched' },
      { id: 'boyer-moore', name: 'Boyer-Moore', explorerName: 'Check from the end and skip ahead' },
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
      { id: 'fibonacci', name: 'Fibonacci', explorerName: 'Each number adds the two before it' },
      {
        id: 'longest-common-subsequence',
        name: 'Longest common subsequence',
        explorerName: 'Find the letters two words share, in order',
      },
      { id: 'knapsack', name: 'Knapsack', explorerName: 'Pack the most value into a bag' },
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
