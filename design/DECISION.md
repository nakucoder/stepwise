# Design decision: direction D, "Blend"

**Status:** decided, October 2026. **Chosen by:** Juan.

## What we compared

Four static mockups, each showing the same two screens (a home page with 8 category tiles,
and a bubble sort workspace frozen mid-step) in light and dark themes and in both learning
levels. Screenshots of all four are in [screenshots/](screenshots).

| Direction                  | Idea                                                                                                        | Fonts                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **A. Lab instrument**      | A bench instrument panel: grey-green LCD screen in light mode, phosphor CRT in dark, hardware-style keys    | Barlow Condensed, Barlow, IBM Plex Mono           |
| **B. Engineer's notebook** | An engineering computation pad: graph paper, highlighter marks, a large trace table; blueprint in dark mode | Atkinson Hyperlegible Next + Mono                 |
| **C. Color block**         | A modern take on VisuAlgo: full-bleed saturated tiles, one strong color per category, thick borders         | Archivo (wide), JetBrains Mono                    |
| **D. Blend** (chosen)      | C's layout and color, with B's trace table, annotations, numbering and blueprint stage                      | Archivo (wide), Atkinson Hyperlegible Next + Mono |

A, B and C were built first. B and C were the favorites, so D was built to combine them.

## Why D

- **It keeps C's energy.** Full-color category tiles, a category-colored header band, chunky
  controls and a big visualization stage make Stepwise feel joyful for kids without falling
  back on cartoon clichés.
- **It keeps B's thinking tools.** The trace table, one row per step with passes separated
  and the current row marked `?`, is how Juan actually learned this material. In D it has the
  same visual weight as the visualization instead of being a side panel.
- **Notebook annotations explain, they don't decorate.** `← here` beside the active code line
  and the circled `O(n²)` point at exactly what matters on the current step.
- **Numbering carries meaning.** Topics are numbered in the order most people learn them, in
  both the sidebar and the home cards.
- **The blueprint grid is reserved for the stage**, so "graph paper" always means "this is
  where the algorithm runs."
- **The most legible type.** Atkinson Hyperlegible was designed by the Braille Institute for
  low-vision readers, which also suits beginning readers. Wide Archivo appears only in big
  headings.
- **A was set aside** because it read as the most serious and could feel cold to beginners.
  B alone was quieter on the home page; C alone gave the trace table too little room.

## Learning levels as a volume knob

The level doesn't switch between two different designs. It turns the same design up or
down.

|             | **Explorer** (louder)                                                                                                                                                                    | **Engineer** (calmer)                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Home        | Full-color tiles, plain-language descriptions, "7 to try"                                                                                                                                | Neutral cards with a color strip, number chip and algorithm list                                              |
| Headline    | "What do you want to watch run?"                                                                                                                                                         | "Eight topics, in the order most people learn them"                                                           |
| Workspace   | Code panel hidden so the stage and trace table get the room; "What's happening" as a big yellow block; stats as solid color blocks; bigger text and controls; a color key in plain words | Code panel with `← here`; circled Big O in the header; color only on the header band, sidebar accent and Play |
| Trace table | Friendly column names (round, spot, left, right); counts from 1; latest 8 rows                                                                                                           | Variable names (`i`, `j`, `a[j]`, `a[j+1]`); counts from 0; full history                                      |

Rules that hold at both volumes:

- Step roles are never shown by color alone: every highlighted bar also has a text tag.
- The selected level is shown by a yellow fill and a check mark, never by an inverted
  color scheme, so it reads the same in light and dark themes.
- Small text meets WCAG AA contrast (4.5:1) on every background, including category colors.

## What this decision changes

- `@fontsource` packages are trimmed to the three fonts D uses: Archivo (variable),
  Atkinson Hyperlegible Next, and Atkinson Hyperlegible Mono.
- The mockup code for A, B and C was removed; their screenshots are kept as a record.
- Next: port D's tokens (colors, type scale, borders) into `src/styles/tokens.css` and build
  the real components from [mockups/d-blend/](mockups/d-blend).
