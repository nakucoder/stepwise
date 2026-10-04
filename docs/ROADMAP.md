# Roadmap ideas

Feature ideas for Stepwise. Most are drawn from Juan's own DSA study notes, which describe how
Juan actually learned this material, so they are a good guide to what will help other learners.

Each idea lists its phase and what it means for the engine types, so nothing here becomes a
surprise refactor. Built so far, for bubble sort: the [trace panel](#trace-panel),
["best for" guidance](#best-for-guidance), custom input with presets (Step 8), and
["The idea"](#the-idea). The site is deployed; see the
[deployment checklist](#deployment-checklist).

| Idea                                                    | Phase        | Type impact                                |
| ------------------------------------------------------- | ------------ | ------------------------------------------ |
| [Phone layout redesign](#phone-layout-redesign)         | 1, next      | None; layout only                          |
| [Watch and Do it modes](#watch-and-do-it-modes) (core)  | 1, then      | Ask frames become explicit decision points |
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

Order from here: the [phone layout redesign](#phone-layout-redesign), then
[Watch and Do it modes](#watch-and-do-it-modes). (Step 8, custom input, and
["The idea"](#the-idea) are done.)

### Phone layout redesign

**Next, before Do it mode.** Do it mode will be played on phones too, so the phone layout
comes first.

**Problem:** on phones, in portrait and in landscape, the workspace stacks the desktop panels.
Learners see the bars moving but lose the explanation, stats, and trace while scrolling.

**Goal:** on phones, the bars and the "What's happening" explanation are **always on screen
together**. Everything else is **one tap away, never a scroll away**.

**"The idea" must fit this too.** On desktop it fills the rail at step 1 and the band's "The
idea" button reopens it. On phones it needs its own home in the chosen layout: shown first at
step 1 without hiding the bars entirely, reopenable in one tap (for example as a tab next to
Trace / Code / Stats, or a sheet), with its Start / Back button in thumb reach. Its four
questions are longer than one screen in Explorer, so the panel scrolls on its own, never the
page.

**Process:**

1. Two phone layout options as screenshots, in portrait (390×844) and landscape (844×390),
   both learning levels.
2. Juan picks one.
3. Then build it.

**Ideas to consider:**

- The topics sidebar in a menu.
- The stage plus a one-line caption, always visible.
- Tabs for Trace / Code / Stats (and The idea).
- Playback controls fixed at the bottom, within thumb reach.
- Two columns in landscape.

### The idea

**Built for bubble sort.** Before step 1, a beginner asks why the algorithm works the way it
does: why the two numbers on the left, why pairs and not three at a time, why left to right,
when it stops. Every algorithm answers those in its required `idea` field (a lead sentence and
question-and-answer points, per level), shown in the rail at step 1 and reopened from the
band's "The idea" button. See rule 4 in CLAUDE.md.

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

**When:** after custom input and the [phone layout redesign](#phone-layout-redesign), and
**before any more algorithms**, so every new algorithm is built to support both modes from the
start.

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

**Built (Step 5) for bubble sort:** one row per comparison (`i`, `j`, `a[j]`, `a[j+1]`,
`swap?`; Explorer shows round, spot, left, right, swap?, counting from 1). The question adds
the row with "?" and its answer fills it in. Each algorithm declares its columns in
`Algorithm.trace`, and `buildTraceRows` builds the table from frames `0..current`.

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

**Built (Step 6):** `Algorithm.bestFor` is **required**, with a short Engineer phrase (shown
after "Best for:") and a full plain Explorer sentence, shown in the workspace band.

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

Done in Step 7: Stepwise is live on Cloudflare Pages. How it works is in the "Deploy" section
of `CLAUDE.md`.

- [x] **Single-page app fallback:** Pages serves `index.html` for every route (no top-level
      `404.html`), so deep links like `/sorting/bubble-sort` work on load and refresh.
- [x] **Content Security Policy:** `public/_headers` allows the no-flash inline script by its
      sha256 hash, and `npm run check` fails if the script changes without the hash.
- [x] Security headers (HSTS, `nosniff`, Referrer-Policy, Permissions-Policy, no framing) and
      caching (hashed assets immutable, HTML `no-cache`).
