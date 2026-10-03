# CLAUDE.md

Guidance for Claude Code (and any contributor) working in this repository.

## Project overview

**Stepwise** is a website for learning data structures and algorithms through step-by-step
visualizations.

- **Phase 1 (current):** an algorithm visualizer inspired by VisuAlgo, CSVisTool (Georgia Tech
  CS 1332), and David Galles' USFCA visualizations, with our own original implementation and
  design. All code and design are original; never copy code, assets, or layouts from them.
- **Phase 2 (later):** a LeetCode practice layer organized by patterns, with spaced repetition.
- **Phase 3 (later):** an OOP learning section (classes, the four pillars, live UML class
  diagrams, design patterns).

Stack: Vite, React, TypeScript (strict), ESLint, Prettier, Vitest + React Testing Library.
Node version is pinned in `.nvmrc` (Node 24 LTS).

## Commands

```bash
npm run dev          # start the dev server
npm run build        # typecheck + production build
npm run preview      # serve the production build
npm run lint         # ESLint
npm run format       # Prettier (write); format:check to verify only
npm run typecheck    # tsc -b
npm test             # Vitest, single run; test:watch for watch mode
```

Before every commit, `lint`, `typecheck`, and `test` must pass.

## Architecture

```
src/
  engine/              Framework-agnostic frame types and player logic. No React, no DOM.
    types.ts           Frame, Algorithm, Category, Language, HighlightRole, Complexity
  algorithms/
    sorting/           One file per algorithm, each exporting an Algorithm, plus its test
  components/          React components (presentational; they render Frames)
  pages/               Route-level React components
  styles/              Design tokens as CSS custom properties (tokens.css) and global styles
  test/setup.ts        Vitest setup (jest-dom matchers, RTL cleanup)
```

### Data flow

1. An `Algorithm` exposes `run(input)`, a generator that yields one `Frame` per step.
2. The player collects **all** frames into an array up front (`[...algorithm.run(input)]`).
   Stepping backward, forward, or scrubbing is just changing an index into that array.
3. React components receive a `Frame` and render it. They never compute algorithm state.

### The Frame type

A `Frame` is a full, self-contained snapshot of one step: the array state, highlighted indices
by role (`comparing`, `swapping`, `sorted`, `pivot`), optional named `pointers` (`i`, `j`,
`low`, `mid`, `high`, drawn as labeled arrows), the active source line, a short explanation for
each learning level (`explanation.explorer` and `explanation.engineer`), and running `stats`
(`comparisons`, `swaps`).

**`Frame` is array-only for now.** When trees and graphs are added, it will become a
discriminated union (e.g. `ArrayFrame | TreeFrame | GraphFrame` keyed on a `kind` field).
Don't add tree or graph fields to the current `Frame`; do that refactor deliberately.

## Learning levels

Stepwise is kid-friendly through **learning levels, not ages**. We never ask for or store a
user's age.

| Level      | Audience            | Language                       | UI defaults                                               |
| ---------- | ------------------- | ------------------------------ | --------------------------------------------------------- |
| `explorer` | Kids and beginners  | Plain, friendly, **no jargon** | Code panel hidden by default; larger visuals and controls |
| `engineer` | Students and coders | Precise, technical             | Code panel, complexity, and stats visible                 |

- **Every frame must have both explanations.** Unit tests check that neither is empty.
- Explorer text avoids terms like "index", "iterate", "swap operation", "O(n)". Say what is
  happening in everyday words ("compare these two numbers", "move the bigger one right").
- The level is **chosen by the user** and saved **only in `localStorage`**. No accounts, no
  age, no personal data. Wrap `localStorage` access in try/catch and fall back to a default.
- Kid-friendly must still follow the design direction: **clear and joyful, not cartoonish
  clichés** (no mascots, bubbly fonts, rainbow gradients, or confetti for its own sake).

## Rules

1. **Every algorithm is a generator yielding Frames. The UI never contains algorithm logic.**
   Algorithm logic lives only in `src/algorithms/`; `src/engine/` stays framework-agnostic
   (ESLint blocks React imports there).
2. **Every algorithm gets unit tests**, covering at least:
   - the final frame's array is correctly sorted/processed, for several inputs (empty, one
     element, duplicates, already sorted, reverse sorted);
   - frames are valid: every highlight and pointer index is in bounds, `activeLine` is null or
     a real line in the source, both `explanation.explorer` and `explanation.engineer` are
     non-empty, `stats` never decrease;
   - the input array is not mutated.
3. **Small, focused commits using Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`,
   `test:`, `refactor:`, `style:`). One logical change per commit.
4. **Ask before adding any new dependency**, including dev dependencies. Explain why it's
   needed and what the alternative without it would be.
5. **The design direction below is mandatory for all UI work.**

## Design direction (mandatory)

Stepwise must **not** look like a generic AI-built site.

**Banned:**

- purple/indigo gradients
- glassmorphism (frosted blur panels)
- soft floating card grids
- the default shadcn look
- Inter as the only font
- hero sections with vague taglines

**Inspiration:**

- **VisuAlgo:** bold, flat, saturated color-block tiles on the home page, each category with
  its own strong color.
- **CSVisTool:** a clear category sidebar and a clean, focused workspace.
- **Galles/USFCA:** utilitarian controls, user-entered input, animation speed control, nothing
  decorative that slows learning.

**Feel: a precise engineering lab instrument.**

- Flat colors and crisp borders. No soft shadows or gradients as decoration.
- Monospace for data values and code.
- A subtle grid-paper canvas behind the visualization.
- Chunky, tactile step controls.
- Motion explains the algorithm; it is never decoration. Respect `prefers-reduced-motion`.
- Light and dark themes, both first-class. All colors come from tokens in
  `src/styles/tokens.css`; no hard-coded colors in components.
- Keyboard friendly: **Space** = play/pause, **Left/Right arrows** = step back/forward. All
  controls are reachable and visibly focused via keyboard.
