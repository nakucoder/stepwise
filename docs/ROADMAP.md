# Roadmap ideas

Feature ideas for Stepwise, drawn from Juan's own DSA study notes. They describe how Juan
actually learned this material, so they are a good guide to what will help other learners.

Each idea lists its phase and what it means for the engine types, so nothing here becomes a
surprise refactor. Nothing on this page is built yet.

| Idea                                                    | Phase  | Type impact                            |
| ------------------------------------------------------- | ------ | -------------------------------------- |
| [Trace panel](#trace-panel)                             | 1      | Uses `Frame.variables` (already added) |
| [Big O explorer page](#big-o-explorer-page)             | 1      | None; a standalone page                |
| [Everyday examples](#everyday-examples-explorer-mode)   | 1      | Content in `explanation.explorer`      |
| ["Best for" guidance](#best-for-guidance)               | 1      | New `Algorithm` metadata field         |
| [Engineer tips](#engineer-mode-tips)                    | 1      | Static content, Engineer mode only     |
| [Sliding window](#sliding-window)                       | 2      | Array frames; may need a `window` role |
| [Fibonacci recursion tree](#fibonacci-memoization-tree) | DP     | Needs `TreeFrame`                      |
| [A\*](#a-search)                                        | Graphs | Needs `GraphFrame`                     |

## Phase 1

### Trace panel

Writing out a trace table by hand, one row per loop iteration with a column per variable, is
the most reliable way to understand what code really does. The trace panel brings that habit
into the visualizer.

- Shows a table that grows one row per step: the columns are the step's variables (for
  bubble sort: `pass`, `j`, `a[j]`, `a[j+1]`, `swapped`).
- The current step's row is highlighted. Stepping backward removes rows, so the table always
  matches the visualization.
- Values that haven't been assigned yet show as "—".
- Visible in both levels. In Explorer mode the column headers get friendly labels ("which
  pass", "left number", "right number") instead of variable names.

**Engine:** reads `Frame.variables`. The table is built by collecting the variables of
frames `0..current`, so no extra state is needed.

### Big O explorer page

An interactive page that makes growth rates feel real instead of abstract.

- A slider for **n** (the number of items). For each complexity class, show how many steps
  that many items would take, updating live as the slider moves.
- Use the rating scale from the notes, best to worst: **Excellent** O(1), **Great**
  O(log n), **Good** O(n), **Fair** O(n log n), **Slow** O(n²), **Bad** O(2ⁿ), **Avoid** O(n!).
  The rating name and its color carry most of the meaning for Explorer mode.
- Big numbers need care: O(2ⁿ) and O(n!) overflow quickly, so show "more than the atoms in
  the universe" style comparisons rather than `Infinity`.
- Graph algorithms such as Dijkstra get a short side note: their formula counts vertices
  and edges separately, and in practice they behave close to O(n log n).
- Each class links to the algorithms on the site that have it.

### Everyday examples (Explorer mode)

Concrete, real-world pictures make each idea stick for kids and beginners. Use these in
Explorer explanations and on the Big O page:

| Concept   | Everyday picture                                                                         |
| --------- | ---------------------------------------------------------------------------------------- |
| O(log n)  | Guessing a secret number when you're told "higher" or "lower": halve the range each time |
| O(2ⁿ)     | Every possible guest list for a party: each friend is either invited or not              |
| O(n!)     | Every possible delivery route: the order of stops matters, so options explode            |
| Recursion | Russian nesting dolls: keep opening until you reach the one that doesn't open            |

More will be added as algorithms are built. Each example should be something a 10-year-old
has actually experienced.

### "Best for" guidance

Every algorithm page answers "when would I actually use this?" with a short, practical line.
Examples of the tone:

- Bubble sort and insertion sort: small lists, or lists that are already nearly sorted.
- Merge sort: large lists when you need guaranteed speed and have memory to spare.
- Quick sort: large lists when memory is tight.
- Built-in sort (Timsort): what Python and JavaScript already use, the right default.

**Engine:** add an optional `bestFor` field to `Algorithm`, with per-level text like
`explanation` (`Readonly<Record<Level, string>>`). Add it when the first algorithm page is
built, not before.

### Engineer-mode tips

Two habits from the notes, shown as short callouts in Engineer mode:

- **The Golden Question:** before choosing a data structure, ask what you need to do with the
  data most often, and whether your bottleneck is time (user-facing, latency-sensitive work)
  or memory (embedded devices, huge datasets). Then pick the best Big O for that bottleneck.
- **The Senior Reflex:** before writing a loop, ask whether it's O(n) or O(n²). Before storing
  data, ask whether it costs O(1) or O(n) extra space. Doing this automatically is what makes
  code scale.

Good places for these: the Big O page, and next to the complexity readout on algorithm pages.

## Later phases

### Sliding window

**Phase 2 (LeetCode patterns).** A fixed-size frame slides across an array. Instead of
re-adding every number in the window, it subtracts the number that leaves and adds the number
that enters, which turns an O(n²) brute force into O(n).

- Visualize the window as a bracket over the bars, with the running sum and best-so-far in
  the trace panel.
- Clearly show the two phases: building the first window, then sliding it.
- **Engine:** fits array frames. The window edges can be `pointers` (`left`, `right`); a
  dedicated `window` highlight role may read better and would be a small, deliberate addition.

### Fibonacci memoization tree

**Dynamic programming category.** Show the recursive call tree for `fib(n)`: plain recursion
recomputes the same branches over and over, while memoization fills in a lookup table so
repeated calls return instantly. Comparing the two trees side by side shows _why_ DP matters.

- Pair it with the iterative version and its trace table (`i`, `temp`, `a`, `b`) to show the
  same answer with O(1) space.
- **Engine:** needs tree frames, the planned `TreeFrame` variant of the `Frame` union.

### A\* search

**Graphs category.** Dijkstra's algorithm with a sense of direction: it also estimates the
remaining distance to the goal, so it explores toward the target instead of in every
direction. It's the idea behind map routing.

- Show it right after Dijkstra on the same graph so the difference in explored nodes is
  obvious.
- **Engine:** needs the planned `GraphFrame` variant.
