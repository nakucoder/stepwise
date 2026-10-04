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
npm run check        # format:check, lint, typecheck, test, build, check:csp, in that order
```

**Run `npm run check` before every commit**; it must pass. It runs the same checks as CI
(format, lint, typecheck, tests, build, CSP hash) and stops at the first failure.

## Architecture

```
src/
  engine/              Framework-agnostic frame types and player logic. No React, no DOM.
    types.ts           Frame, Algorithm, Idea, Level, TraceValue, HighlightRole, Complexity, ...
    collect.ts         collectFrames: run a generator into an array, with a frame cap
    player.ts          PlayerState + playerReducer (play, step, seek, speed, tick); no timers
    validateFrames.ts  Shared checks for rule 2; every algorithm's tests call it
    jargon.ts          Words Explorer text must avoid
    input.ts           The learner's numbers: parseNumbers (limits, per-level messages), presets
  algorithms/
    sorting/           One file per algorithm, each exporting an Algorithm, plus its test
  components/          React components (presentational; they render Frames)
  hooks/               React hooks: usePlayer (drives playerReducer on a timer), useReducedMotion,
                       usePhoneLayout (PHONE_QUERY: the phone layout's breakpoint)
  pages/               Route-level React components
  styles/              Design tokens as CSS custom properties (tokens.css) and global styles
  test/setup.ts        Vitest setup (jest-dom matchers, RTL cleanup)
```

### Data flow

1. An `Algorithm` exposes `run(input)`, a generator that yields one `Frame` per step.
2. `collectFrames` collects **all** frames into an array up front (capped at 10,000 so a
   runaway algorithm can't freeze the page). Stepping backward, forward, or scrubbing is just
   changing an index into that array, via `playerReducer`. Timers live in the UI (a hook sends
   `tick` while playing), never in the engine.
3. React components receive a `Frame` and render it. They never compute algorithm state.

### The Frame type

A `Frame` is a full, self-contained snapshot of one step: the array state, highlighted indices
by role (`comparing`, `swapping`, `sorted`, `pivot`), optional named `pointers` (`i`, `j`,
`low`, `mid`, `high`, drawn as labeled arrows), optional trace `variables`, the active source
line, a short explanation for each learning level (`explanation.explorer` and
`explanation.engineer`), and running `stats` (`comparisons`, `swaps`).

`pointers` and `variables` are deliberately separate. **Pointers** are index markers drawn on
the array. **Variables** are the values shown in the trace panel, one row per step, like a
hand-written trace table (`i`, `temp`, `a`, `b`). A loop index can appear in both.

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
- **First visit (decided):** when no level is saved, show a small level picker so the user
  chooses Explorer or Engineer before starting. Don't silently default to either level.
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
     non-empty (Explorer without jargon), `stats` never decrease. **Use
     `validateFrames(frames, algorithm)` from `src/engine/` and expect `[]`**, then add the
     algorithm's own checks;
   - trace `variables` agree with the frame (e.g. a variable that names an index matches the
     pointer of the same name, and `temp` holds the value being swapped);
   - the input array is not mutated.
3. **Mark every decision point**, for Do it mode (see `docs/ROADMAP.md`). Wherever the learner
   could make a choice (compare, swap, pick a pivot, …), yield an **ask frame** whose
   explanation asks the question, followed **immediately** by its **answer frame**, the correct
   move. Do it mode checks the learner's move against that answer, so never merge the two into
   one frame. Until the engine has an explicit marker, mark ask frames in the trace (bubble sort
   uses `swap?` = "?"); when Do it mode adds the marker, every algorithm must set it.
4. **Explain the idea.** Every algorithm sets `idea` (required by the type): for each level, a
   lead sentence and the questions a beginner actually asks about _why_ it works this way (why
   these pairs or parts, why this direction or order, when it stops), each with a short answer.
   It is shown in the rail at step 1 and reopened from the band (on phones, in The idea
   sheet). Explorer text passes the jargon check (`src/algorithms/index.test.ts` checks every
   algorithm), and the panel must still fit beside the bars at 1440×900 in both levels.
5. **Small, focused commits using Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`,
   `test:`, `refactor:`, `style:`). One logical change per commit.
6. **Ask before adding any new dependency**, including dev dependencies. Explain why it's
   needed and what the alternative without it would be.
7. **The design direction below is mandatory for all UI work.**

## Workflow

- **Never commit directly to `main`.** It is protected: changes land only through pull
  requests, and the `ci` check must pass first. Force pushes and deletion are blocked.
- **Work on a feature branch named `type/short-name`**, using the Conventional Commit type:
  `feat/`, `fix/`, `chore/`, `docs/`, plus `design/` for design explorations and mockups
  (e.g. `feat/bubble-sort`, `docs/workflow`, `design/directions`).
- **Open PRs with `gh pr create`**, with a description of what changed and why. Watch CI with
  `gh pr checks` or `gh run watch`.
- **Don't merge a PR unless the user says to.** The user reviews PRs on GitHub.

## Deploy

Stepwise is a static site on **Cloudflare Pages** (free plan), project `stepwise-lab`:
**https://stepwise-lab.pages.dev**.

**Hard rule: it must cost $0, forever.** No paid plan, no card on file, nothing that can bill.
That means:

- **No Pages Functions** (no `functions/` folder, no `_worker.js`): they count against Workers
  usage. The site stays purely static.
- **No Cloudflare Web Analytics or other injected scripts**: the CSP would block them anyway.
- Anything new on Cloudflare's side needs the user's OK first, even if it says "free".

**How it deploys** (`.github/workflows/ci.yml`):

- The `ci` job runs the same checks as `npm run check`, then uploads `dist/`. The deploy jobs
  ship exactly that build, so nothing is deployed that didn't pass.
- `deploy-production`: every push to `main`, in the GitHub environment `production` (only
  `main` may deploy to it). Production deploys run one at a time and are never cancelled.
- `deploy-preview`: every pull request from this repo gets a preview at
  `<branch>.stepwise-lab.pages.dev`, linked in one comment on the PR that updates on each push.
  Previews are public but marked `noindex` by Pages.
- Deploys use `cloudflare/wrangler-action`, pinned by SHA, with an exact `WRANGLER_VERSION` at
  the top of the workflow. Dependabot updates the action but **not** that version; bump it by
  hand every few months (standing reminder: issue #25). Wrangler is never a project dependency.
- Secrets (repo level): `CLOUDFLARE_API_TOKEN` (permission: Account → Cloudflare Pages → Edit,
  nothing else) and `CLOUDFLARE_ACCOUNT_ID`. The user sets them with `gh secret set` in their
  own terminal. **Never ask for a token in chat.**

**Routing:** there is no top-level `404.html`, so Pages serves `index.html` for every unknown
path and the app's router handles it; deep links work on load and refresh. **Never add a
top-level `404.html`**: it would turn that off. `public/assets/404.html` makes missing files
under `/assets/` a real 404 instead of the app shell.

**Headers** (`public/_headers`): CSP, HSTS, `nosniff`, Referrer-Policy, Permissions-Policy on
every response; HTML is `no-cache`; `/assets/*` (content-hashed by Vite) is cached for a year
as `immutable`. When two rules set the same header Pages joins the values, so `/assets/*`
removes the inherited `Cache-Control` with `! Cache-Control` before setting its own.

**The CSP and the no-flash script:** the inline script in `index.html` is allowed by its
**sha256 hash** in `_headers`. Any change to that script's text, even whitespace, changes the
hash. `npm run check` (and CI) runs `check:csp`, which fails and prints the new hash if they
disagree. Update `_headers` with it. Never "fix" this with `'unsafe-inline'`.

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
- **Phones get their own layout** (below 700px wide or 500px tall; see the ROADMAP's "Phone
  layout"). `usePhoneLayout()` picks the structure in React, and the CSS media queries marked
  "phone layout" must use the same `PHONE_QUERY`. The bars and "What's happening" always stay
  on screen; everything else is one tap away in a sheet, never a page scroll away. Touch
  targets are at least 44px, heights use `dvh`, and padding respects safe areas. Any new
  workspace panel needs a home in a phone sheet, checked at 390×844 and 844×390.

### Design D ("Blend") and its tokens

The chosen direction is **D. Blend**: see `design/DECISION.md` and the reference mockups in
`design/mockups/d-blend/`. Build UI from those, using the tokens in `src/styles/tokens.css`:

- `--color-*` neutrals and UI colors; `--role-*` step roles (comparing, swapping, sorted,
  pivot); `--cat-*` category colors. Every fill has a matching text token (`--cat-on-*`,
  `--role-on-*`, `--color-on-selected`); always pair them, never pick text colors ad hoc.
- `--color-on-bright` / `--color-on-deep` are fixed text colors for saturated fills; they don't
  flip with the theme.
- `--level-*` sizes are the learning-level "volume knob": `data-level="explorer"` on `<html>`
  turns them up. Engineer is the default.
- Fonts: `--font-display` (wide Archivo, big headings only), `--font-text` (Atkinson
  Hyperlegible Next, everything else), `--font-mono` (code, values, trace table).
- **Selected states** use `--color-selected` fill plus a ✓, never an ink/background
  inversion (it flips meaning in dark mode).
- `src/styles/tokens.test.ts` keeps the two dark blocks in sync and checks every text/fill
  pair for 4.5:1 contrast. Add new pairs there when you add tokens.
