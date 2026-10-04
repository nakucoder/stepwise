# Roadmap ideas

Feature ideas for Stepwise. Most are drawn from Juan's own DSA study notes, which describe how
Juan actually learned this material, so they are a good guide to what will help other learners.

Each idea lists its phase and what it means for the engine types, so nothing here becomes a
surprise refactor. Nothing on this page is built yet. Things to do at deploy time are in the
[deployment checklist](#deployment-checklist).

| Idea                                                    | Phase        | Type impact                                |
| ------------------------------------------------------- | ------------ | ------------------------------------------ |
| [Watch and Do it modes](#watch-and-do-it-modes) (core)  | 1, next      | Ask frames become explicit decision points |
| [Trace panel](#trace-panel)                             | 1            | Uses `Frame.variables` (already added)     |
| [Big O explorer page](#big-o-explorer-page)             | 1            | None; a standalone page                    |
| [Everyday examples](#everyday-examples-explorer-mode)   | 1            | Content in `explanation.explorer`          |
| ["Best for" guidance](#best-for-guidance)               | 1            | New `Algorithm` metadata field             |
| [Engineer tips](#engineer-mode-tips)                    | 1            | Static content, Engineer mode only         |
| [Hint ladder](#hint-ladder)                             | 1            | Hints derived from `Frame` data            |
| [Sliding window](#sliding-window)                       | 2            | Array frames; may need a `window` role     |
| [Fibonacci recursion tree](#fibonacci-memoization-tree) | DP           | Needs `TreeFrame`                          |
| [A\*](#a-search)                                        | Graphs       | Needs `GraphFrame`                         |
| [AI helper](#ai-helper)                                 | After deploy | Reads the current `Frame`; needs a backend |

## Phase 1

### Watch and Do it modes

**A core feature.** Every algorithm page has two modes:

- **Watch:** the step-by-step playback that exists today.
- **Do it:** the learner performs the algorithm themselves, and the site checks each move.
  - **Explorer (guided):** at each decision the site asks the question, e.g. "Is 5 bigger than
    2?", and the learner answers with buttons such as **Trade places** / **Keep them**.
  - **Engineer (free):** no buttons say what to do. The learner clicks bars to compare and swap,
    and the site checks whether that move is the one the algorithm would make.
  - **A wrong move starts the [hint ladder](#hint-ladder):** nudge, then concept, then show me.

**Built on the ask-then-answer frames.** Each ask frame is a decision point and the answer
frame right after it is the correct move to check against, so Do it mode needs no second copy
of the algorithm's logic.

**This replaces the separate quiz/predict mode** that was planned earlier.

**When:** right after custom input, and **before any more algorithms**, so every new algorithm
is built to support both modes from the start.

**Engine:** algorithms must mark their decision points (see the rule in CLAUDE.md). Bubble sort
already follows the ask-then-answer shape; its ask frames are currently recognizable only by
the trace value `swap?` = "?". Do it mode should add an explicit marker on the ask frame (for
example a `decision` field naming the choices) rather than rely on that convention.

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

### Hint ladder

Help that a learner asks for one rung at a time, so they get only as much as they need. No AI:
every hint is built from the current frame's data, so it is **safe for kids, free, and works
offline**.

1. **Nudge:** where to look. "Look at the two highlighted bars."
2. **Concept:** the rule that applies. "Bubble sort swaps a pair when the left one is bigger."
3. **Show me:** what happens on this step. "5 is bigger than 3, so they trade places."

- Hints come in both learning levels, like explanations (plain words for Explorer).
- They are generated from the frame's highlights, pointers, trace `variables`, and the change
  to the next frame, so they always match what is on screen.
- In [Do it mode](#watch-and-do-it-modes), a wrong move starts the ladder at the nudge.
- **Design the help panel so a future "Ask a question" box fits in it** (see
  [AI helper](#ai-helper)): the hint rungs stack at the top, with room reserved below.

**Engine:** probably a pure function per algorithm, `hints(frame, nextFrame)`, returning the
three rungs per level. Unit-test it like explanations (every rung non-empty for every frame).
Decide the exact shape when the first algorithm is built.

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

### AI helper

**After the site is deployed.** An "Ask a question" box in the help panel, answered by a hosted
LLM API.

- **Backend:** an AWS Lambda function calls the LLM API, so the API key never reaches the
  browser.
- **Context:** the request includes the current frame's state (array, highlights, pointers,
  trace variables, active code line, algorithm) along with the learner's question.
- **Guides, never answers:** it responds with questions and hints that lead the learner to the
  answer, and never states the answer itself.
- **Engineer mode first.** Explorer (kids) only after a dedicated child-safety review.
- **Limits:** per-user rate limits and a **monthly spend cap** that switches the feature off
  when reached.
- **Privacy:** chats are **not stored**. No accounts, no personal data, no logging of message
  content.

**Engine:** none; it reads the existing `Frame`. The help panel from the
[hint ladder](#hint-ladder) is designed to hold the question box.

## Deployment checklist

Things that don't matter in development but must be done when Stepwise is deployed:

- **Single-page app fallback:** serve `index.html` for every route, so deep links like
  `/sorting/bubble-sort` work on reload.
- **Content Security Policy:** `index.html` has a small inline script that applies the saved
  theme before first paint (so dark mode never flashes white). A strict CSP blocks inline
  scripts, so `script-src` must include that script's **sha256 hash** (or a nonce). The hash
  changes whenever the script's text changes, including formatting, so recompute it on every
  change, ideally automatically at build time.
