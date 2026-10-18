# Merge sort spaceships: B, "Squadrons and a stargate"

Chosen on 2026-10-13 from three spaceship mockups (A Modular mothership, B Squadrons and a
stargate, C Docking station), compared on a phone through the preview of PR #75. PR #75 was
merged by mistake and reverted in #76, so the mockup code is not on `main`; it can be read in
git history (commit `63fae5d`, `src/design/slimes/`). This folder is the spec for building the
real renderer. It replaces the slimes, which were tried for merge sort over three rounds of
mockups and dropped (see "Why not slimes" at the end).

Every number is its own **fighter**, facing up, and **a bigger number is a bigger ship**, with
its digit on it. Fighters fly in **squadrons** (the groups of merge sort), laid out as a
**formation tree**: one row per split level, the whole list at the top. **Every fighter keeps
its own column**, which is its index in merge sort's frames.

- **Split:** a squadron peels into two that drop a row and fly apart.
- **Merge:** a **stargate** opens over the two squadrons. Their **lead ships** (the leftmost of
  each, the fronts of the two halves) pull forward and face off. The smaller flies up through
  the gate first and takes the next place in the new squadron on the other side.
- **Merge done:** the gate flashes and shuts (the special move).
- **Finale:** the whole squadron loops off the top and back in, ringed green.

## Screenshots

From the mockup (commit `63fae5d`, tab B), phone portrait, 390 × 844 at 2×, light and dark.
The stage is deep space in both themes; only the page around it changes. The input is
5 2 8 1 9 3 (38 steps).

| Moment                                      | Step | Light                     | Dark                     |
| ------------------------------------------- | ---- | ------------------------- | ------------------------ |
| Start: one squadron in formation            | 1    | `phone-start-light.png`   | `phone-start-dark.png`   |
| Split, mid-peel (6 into 3 + 3)              | 2    | `phone-split-light.png`   | `phone-split-dark.png`   |
| Compare: leads forward, ringed (2 vs 3)     | 28   | `phone-compare-light.png` | `phone-compare-dark.png` |
| The smaller (2) flying up through the gate  | 29   | `phone-gate-light.png`    | `phone-gate-dark.png`    |
| A half has run out: the 9 goes, no question | 36   | `phone-runout-light.png`  | `phone-runout-dark.png`  |
| Merge done: the gate flashes and shuts      | 37   | `phone-shut-light.png`    | `phone-shut-dark.png`    |
| Finale, the final pose (green rings)        | 38   | `phone-finale-light.png`  | `phone-finale-dark.png`  |
| Do it: "which goes next?", L and R (2 vs 1) | 26   | `phone-doit-light.png`    | `phone-doit-dark.png`    |

The mockup differs from this spec in a few places, listed under
[Changes from the mockup](#changes-from-the-mockup): the screenshots show the idea and the
layout; the numbers below are the ones to build.

## Scene and geometry

Everything is laid out in the stage field's own pixels (`w × h`, with `n` values). Sprites are
pixel art at **p** screen pixels per sprite pixel; "units" below are sprite pixels (multiply by
p).

- **Depth:** `D = ceil(log2 n)` split levels; the tree has `D + 1` rows (6 values: 4 rows; 12
  values: 5).
- **Scale:** `s = clamp(round(min(h / (D + 1) / 40, w / n / 30)), 1, 3)`, and the ships use
  `p = s`. Sprites never disappear (p is at least 1).
- **Digits:** `font = max(7s, 10 px)`, monospace, bold.
- **Columns:** the bars' columns, exactly as the penguins' slots follow them (so Engineer's
  pick buttons lie over the ships). With no gap between bars that is `colW = (w − 4s) / n` and
  column c's center at `2s + (c + 0.5) × colW`. **Column c is index c of the frame:** a ship in
  the main row stands in its main-row column; a ship in the buffer stands in its buffer column.
- **Rows:** `gapY = 4 px` between rows. In the full tree, `rowH = floor((h − D × gapY) / (D + 1))`
  and row r's top is `r × (rowH + gapY)`. A group (squadron) at recursion depth d is in row d.
  Its ships stand on the row's **floor**, `rowTop + rowH − s`, bottom-aligned.

### Sizes by value

A ship is one of the hand-drawn fighters (see [Sprites](#sprites)): a square sprite of
**g × g** units, g odd (9 to 25), so it has a center column and centers to the pixel.

- **Smallest grid:** `g0 = max(9, the odd number ≥ (font + 2s) / p)`, so the digit fits on the
  smallest ship: 9 at p = 2 or 3, 13 at p = 1.
- **Room:** `maxSide = min(colW − 4s, rowH − 2s − 3s)`. The ring needs 2s on each side; the
  lead's lift is 2s, plus the gate's 2s and 1s of air.
- **Levels:** `K = min(floor((maxSide / p − g0) / 2) + 1, (25 − g0) / 2 + 1)`: as many sizes
  as fit, and as the family has drawn (its largest is 25 × 25).
- **A value's level:** `k(v) = max(1, ceil(K × |v| / L))`, with `L = max(largest, 9)`.
- **Its grid:** `g = g0 + 2 (k − 1)`, and its side in screen pixels is `g × p`.

With K ≥ 9, the numbers 1 to 9 all get different sizes. Bigger numbers share levels when they
are close (50 and 52), and the digit settles a tie. A value's size depends only on the input,
never on the step, so a ship never changes size.

- **Position:** the ship is centered on its column, `x = round(colCenter − side / 2)`, its
  bottom on the floor: `y = floor − side`. A **lead ship** during a compare is lifted 2 units:
  `y − 2p`.
- **Digit plate:** the digit (`--space-on-hull`) sits on a plate that hugs it: an outline in
  `--space-plate`, `max(2, round(font / 6))` px wide, painted under the digit. It is centered
  across the ship, its center at 60% of the ship's height (on the body, under the canopy). A
  rectangular plate covered most of a 9 × 9 or 11 × 11 ship; the hugging plate leaves the nose,
  the wings and the engines showing, so the size reads at a glance. Two-digit numbers may
  overhang the sprite sideways; they stay inside the column.
- **Brackets:** each squadron has a 1-unit line in `--space-frame` along its floor, from 0.08
  of a column inside its first ship's column to 0.08 inside its last. A squadron being formed
  in a merge gets its bracket over its whole span `[lo, hi)` at once, plus a dashed `g0 × g0`
  outline (1 px, `--space-frame`) on each column still empty.
- **The stargate:** while a merge `[lo, mid, hi)` at depth d is running, it lies across the top
  of row d + 1:
  - the bar: 2 units tall, from column `lo + 0.04` to `hi − 0.04`, in `--space-gate`;
  - two posts at its ends, 2 units wide and 8 units tall, starting 3 units above the bar.
- **Drawing order:** brackets, slots, the gate, then the ships; a ship in flight is drawn last.

### Fit

The real stage fields, for 6 values (5 2 8 1 9 3):

| Stage field                        | Plan         | s, font  | Rows   | K   | Ship sides (1 … 9)                 |
| ---------------------------------- | ------------ | -------- | ------ | --- | ---------------------------------- |
| 390 × 844 phone: 366 × 382         | full tree    | 2, 14 px | 4 × 92 | 9   | 18, 22, 26, 34 (5), 46 (8), 50 (9) |
| Desktop: about 640 × 360           | full tree    | 2, 14 px | 4 × 87 | 9   | 18 to 50 (15 would fit)            |
| 740 × 300 at 130%, Do it: 479 × 90 | zoom, 2 rows | 1, 10 px | 2 × 43 | 7   | 13 to 25 (13 would fit)            |
| 740 × 300 at 130%, Watch: 479 × 53 | zoom, 2 rows | 1, 10 px | 2 × 24 | 4   | 13, 15, 17, 19 (four sizes)        |

**Zoom (a short stage):** when the full tree gives `K < 3`, the stage shows only the split or
merge in progress, on two rows of `rowH = floor((h − gapY) / 2)`:

- **On stage:** the family's own row d on top (the parent being formed, or the squadron being
  split) and row d + 1 under it (the two halves), with only the groups inside `[lo, hi)`. At
  the start and the finale the family is the whole list.
- **When the family changes** (a new split or merge starts somewhere else), nothing flies: the
  new pose fades in over 200 ms, as a jump would show it.
- **Lost:** the rest of the tree (where this split or merge sits in the whole), and at 479 × 53
  the sizes shrink to four. The digits carry the rest.

The stage caption names the part shown ("merging the first 3 with the last 3").

With 12 values on a phone, s = 1 and the sizes are relative to the largest value. Small numbers
next to a 99 all get the smallest size, as bars would be short next to a 99.

## Sprites

### The fighters

A **family of hand-drawn pixel-art ships**, one exact grid per size level: every odd size from
9 × 9 to 25 × 25, drawn pixel by pixel and never stretched (the source is
`src/characters/spaceships/sprites.ts`). [`sprite-family.png`](sprite-family.png) shows them all
at 1× and 2×, on a light and a dark page, next to the PR #75 mockup ship (one 9 × 9 sprite
stretched to every size, which broke the whole-pixel rule).

Bigger is more detail, in one family look (the mockup ship's style and colors):

- **Scouts (9 to 13):** a dart with a canopy, short swept wings with a red tip, two engines.
- **Fighters (15 to 19):** a longer canopy with a glint, broad swept wings, twin engines; the
  19 adds engine pods.
- **Heavy cruisers (21 to 25):** a broad hull, wing cannons, a big canopy, four engines.

Codes and colors (the space tokens; nothing hard-coded):

| Code | Part                                         | Token             |
| ---- | -------------------------------------------- | ----------------- |
| `o`  | outline                                      | `--space-outline` |
| `h`  | hull                                         | `--space-hull`    |
| `w`  | highlight edge (left side)                   | `--space-flash`   |
| `d`  | shade (right side, the wings' trailing edge) | `--space-frame`   |
| `c`  | canopy                                       | `--space-gate`    |
| `a`  | wing stripe                                  | `--space-wing`    |
| `r`  | engine glow (the last row only)              | `--space-glow`    |

Every fighter, checked by `sprites.test.ts`:

- faces up, its nose tip alone on top in the center column;
- is symmetric, lit from the top left: a highlight on the left is a shade on the right;
- has a **closed outline**: no colored pixel touches empty space, so its size shows at a glance;
- has a canopy, wing stripes and its glow on the last row only (twice as long in flight: one
  more row under each nozzle);
- has more pixels than the size below it, and as many engines or more.

g = 9, the smallest on a phone (1 at p = 2: 18 px), a scout:

```
....o....
...oho...
...oco...
..owhdo..
.ohwhdho.
oahwhdhao
oddwhdddo
.ooooooo.
...r.r...
```

g = 13, the smallest at p = 1 (the zoom), a scout:

```
......o......
.....oho.....
.....oco.....
....occco....
....owhdo....
...owwhddo...
..ohhwhdhho..
.ohhhwhdhhho.
oahhhwhdhhhao
oddddwhdddddo
.oooowhdoooo.
...ooooooo...
....r...r....
```

g = 19, a fighter with engine pods:

```
.........o.........
........oho........
........oco........
.......occco.......
.......occco.......
.......ocwco.......
......owhhhdo......
......owwhddo......
.....ohhwhdhho.....
....ohhhwhdhhho....
...ohhhhwhdhhhho...
..ohhhhhwhdhhhhho..
.ohhhhhhwhdhhhhhho.
oahhhhhhwhdhhhhhhao
oddddddddhddddddddo
.ooohdoowhdoodhooo.
...oddoowhdooddo...
...ooooooooooooo...
....r...r.r...r....
```

g = 25, the largest (9 on a phone: 50 px), a heavy cruiser:

```
............o............
...........oho...........
...........oco...........
..........occco..........
..........occco..........
..........occco..........
..........ocwco..........
.........ocwhdco.........
.........owhhhdo.........
.........owhhhdo.........
........owwhhhddo........
...o...ohhwhhhdhho...o...
...o..ohhhwhhhdhhho..o...
..oho.ohhhwhhhdhhho.oho..
..ohoohhhhwhhhdhhhhooho..
.oahhhhhhhwhhhdhhhhhhhao.
oaahhhhhhhwhhhdhhhhhhhaao
oahhhhhhhhwhhhdhhhhhhhhao
oahhhhhhhhwhhhdhhhhhhhhao
odddddddddddhdddddddddddo
.ooooohdoowhhhdoodhooooo.
.....oddoowhhhdooddo.....
.....ooooooowooooooo.....
.....oo..ooooooo..oo.....
......r...r...r...r......
```

### The stargate

These are plain rectangles, not a sprite:

- **The bar:** 2 units tall, in `--space-gate`.
- **The posts:** 2 × 8 units, in `--space-gate`.
- **Its flash:** `--space-flash`.

### The starfield

The starfield is a 120 × 96 px tile behind the whole stage, at 1 screen px per pixel, not
scaled, so it stays a quiet background. It is static, with no twinkle: motion is never
decoration.

- **Stars** (`--space-star`, x, y, size): (7, 11, 1), (41, 5, 2), (88, 17, 1), (110, 44, 1),
  (23, 52, 1), (66, 38, 1), (95, 70, 2), (12, 83, 1), (54, 77, 1).
- **Bright stars** (`--space-star-bright`): (77, 59, 1), (33, 30, 1).

It can be a CSS background from an SVG `data:` URI (the CSP allows `img-src data:`) or drawn in
the scene.

## The moves

Frequent moves fit inside the step: at faster speeds they are fitted to `0.9 × step` with
`fitMs`. The special move keeps its full time and the step waits for it (`holdMs`, `specialMs`).
Times are at 1×, where a step is 800 ms.

| Frame                                | Move                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Time                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Split `[lo, mid, hi)` at depth d     | The squadron peels: both halves drop from row d to row d + 1 in their own columns, the left half banking out 3 units to the left at mid-flight and the right half 3 units to the right (a curve: 0 → 3 → 0 units sideways), eased in and out. The old bracket fades as the two new ones draw out from their centers.                                                                                                                                      | 600 ms, fits                                                                  |
| First compare of a merge             | The gate opens over row d + 1: the posts slide out from the middle to the ends as the bar grows with them (300 ms, eased out). The new squadron's bracket and empty slots fade in on row d. Then as for every compare.                                                                                                                                                                                                                                    | 300 ms, then the compare; fits                                                |
| Compare (an ask frame in Do it)      | The two lead ships pull forward 2 units (200 ms, eased out) and their yellow rings fade in (200 ms).                                                                                                                                                                                                                                                                                                                                                      | 200 ms, fits                                                                  |
| Take: the smaller lead flies through | It flies straight up its column (0–55%, eased in), through the gate's bar, into row d, then veers sideways into the next empty column of the new squadron, landing on the floor (55–100%, eased out). Its glow pixels double in length while it flies. The gate's bar brightens to `--space-flash` while the ship crosses it (45–55%). The other lead eases back into formation (200 ms). The ships left behind stay in their own columns (no shuffling). | 650 ms, fits                                                                  |
| Rest: a half has run out             | The same flight for the next ship of the other half, with no rings and no lift (nothing to ask). One ship per frame.                                                                                                                                                                                                                                                                                                                                      | 650 ms, fits                                                                  |
| **Merge done (the special move)**    | The gate **flashes** (bar and posts to `--space-flash`, 100 ms), then **shuts**: the posts slide to the middle as the bar shrinks to nothing and fades (100–600 ms, eased in). The new squadron's dashed slots are gone; its bracket brightens once (600–900 ms).                                                                                                                                                                                         | **900 ms, the step waits**; divided by the speed above 1×, never faster below |
| Finale                               | Green rings fade in on every ship (350 ms). From 400 ms, the fighters take off in turn, left to right, 80 ms apart. Each flies straight up off the top of the stage (500 ms, eased in), then comes back in from below the stage, up its own column, into its place (700 ms, eased out). They end in formation, ringed green.                                                                                                                              | 400 + 80 (n − 1) + 1200 ms, about 2 s for 6, in full                          |

Only one step forward plays a move; going back or jumping shows the frame's pose. A resize
mid-move rebuilds the move from where it had got to (as the robots and the penguins do).

**Reduced motion:** nothing moves. Each step shows its final pose:

- the halves in their new row after a split;
- at a compare, the leads lifted with their rings, and the gate open;
- after a take, the ship in its new column;
- after a merge, no gate;
- at the end, every ship in formation, ringed green.

Sounds still play at each step's moment.

## Colors

Fixed in both themes, like the ducks', the robots' and the penguins': the stage is deep space
whatever the page's theme. In the renderer they move to `src/styles/tokens.css`, with a
contrast test for the digit on its plate (`--space-on-hull` on `--space-plate`).

| Token                 | Hex       | Used for                                       |
| --------------------- | --------- | ---------------------------------------------- |
| `--space-bg`          | `#0b1026` | The stage                                      |
| `--space-star`        | `#c9d3ff` | Stars                                          |
| `--space-star-bright` | `#ffffff` | The two bright stars                           |
| `--space-outline`     | `#05070f` | The fighters' outline and base                 |
| `--space-hull`        | `#e8ecf4` | The fighters' hull                             |
| `--space-wing`        | `#ff5a5f` | The wing stripe                                |
| `--space-glow`        | `#ff7a2f` | Engine glow                                    |
| `--space-plate`       | `#f4f6fb` | The digit's plate                              |
| `--space-on-hull`     | `#0b1026` | The digit                                      |
| `--space-frame`       | `#8fa3c8` | Brackets and the empty slots' outlines         |
| `--space-gate`        | `#5fe3ff` | The stargate                                   |
| `--space-flash`       | `#ffffff` | The gate's flash, and its bar as a ship passes |

**Yellow and green:**

- **Yellow** (`--role-comparing`) is only the ring on the two lead ships at a compare: a 1-unit
  outline, 1 unit out from the ship's square. Nothing else on the stage is yellow, not even the
  gate's flash or a star.
- **Green** (`--role-sorted`) is only the same ring on every ship at the very end.
- A ship's own colors never change. The words under the stage say what the rings mean.

## Sounds

Five sounds, all made in code with Web Audio: no recording. If one is ever wanted (a real
engine or a whistle), it must be CC0, approved first, fetched only when Sound is turned on, and
credited in `CREDITS.md`, like the quack and the penguin call. Nothing plays until Sound is on.

**The chain** (as `src/sound/engine.ts`): each sound has its own gain (below), then the master
gain of 0.2, then a `DynamicsCompressor` with default settings; at most 4 voices at once.

**Building blocks:** `tone(…)` and `noise(…)` exactly as in the penguins' spec
(`design/mockups/penguins/README.md`, "Sounds"): an oscillator or white noise, an optional
filter (ramped exponentially to `to`), optional tremolo, and the envelope (linear attack, then
exponential to 0.001, or held with `sustain`). Seconds; `t` is the sound's start. `k` is the
moving ship's size level (1 to K) and `K` the number of levels, so a bigger ship sounds lower.

### Peel: a falling "vweeoo" (gain 1.6), at a split

- tone: triangle 880 → 440 Hz, at 0, length 0.35, level 0.3, low-pass 2000 Hz
- noise: at 0, length 0.3, level 0.25, band-pass 1200 → 600 Hz, Q 1

Soft. It starts with the peel.

### Face-off: two blips (gain 1.2), at every compare

- tone: square 660 Hz, at 0, length 0.06, level 0.25, low-pass 2500 Hz
- tone: square 880 Hz, at 0.08, length 0.06, level 0.25, low-pass 2500 Hz

Soft: it plays at every compare. It starts as the leads pull forward. The first compare of a
merge plays it after the gate opens (300 ms in, fitted).

### Through the gate: a rising "zip" (gain 1.5), at every take and rest

- tone: sine `f → 4f` with `f = 520 − 240 × (k − 1) / max(1, K − 1)` Hz (520 for the smallest,
  280 for the biggest), at 0, length 0.25, level 0.35
- noise: at 0, length 0.2, level 0.2, high-pass 2500 Hz, attack 0.05

It starts as the ship reaches the gate, at `0.45 T` of the flight (fitted with it).

### Gate shuts: a "shoomp" (gain 3.5), the special moment, the loudest

- tone: sine 180 → 60 Hz, at 0.1, length 0.4, level 0.9, attack 0.01
- noise: at 0.1, length 0.35, level 0.6, low-pass 1200 → 200 Hz
- the flash: tone triangle 1568 Hz, at 0, length 0.15, level 0.3

It starts with the flash and plays in full; the step waits for it.

### Finale: an arcade fanfare (gain 1.4)

- the run: square, low-pass 3500 Hz, sustain, length 0.08, level 0.35, at 523, 659, 784 and
  1047 Hz, at 0, 0.09, 0.18 and 0.27
- the chord: square, low-pass 3500 Hz, sustain, at 0.4, length 0.5, level 0.3, 1047 and
  1319 Hz, tremolo 8 Hz depth 0.3
- the fly-off: noise, at 0.4, length 0.6, level 0.5, band-pass 600 → 3000 Hz, Q 1.5, attack 0.1

It starts with the take-offs, 400 ms into the finale (at once with reduced motion), and plays
in full.

**Balance by measurement** when built (render through the real chain, compare RMS and peaks,
as for the penguins):

- **Loudest to softest:** the gate's shoomp, then the finale, then the zip, then the peel, then
  the blips.
- **Overlaps:** nothing clips when a zip overlaps the next step's blips at 4×.

These recipes are a starting point; the levels may move to meet that.

**Reduced motion:** every sound plays at its step's start (the zip too, with no flight to
wait for); the gate's shoomp and the finale still play in full.

## The frame data it needs

Merge sort's frames on #74's two rows carry everything:

- **The main row** (`array`) holds every squadron, each in its own columns, and the squadron
  being formed, `[lo, k)`. While a value is out in the buffer, its main-row slot is `vacant`.
- **The buffer row** (`buffer.values`) holds the two halves being merged: the left in
  `[i, mid)`, the right in `[j, hi)`, each value in its own column. Already-taken buffer slots
  are null.
- **Trace variables:** `lo`, `mid`, `hi` and `depth` on every frame of a split or merge, so the
  scene knows the family, its row and where the gate goes.
- **Pointers:** `i`, `j` (the two leads: buffer columns) and `k` (the next column of the new
  squadron), so each fighter is followed by identity as it is copied, and equal values stay
  told apart.
- **The event kind,** one per frame: `split`, `compare` (the ask frame, with a `decision` on
  the pair `[i, j]` for Do it), `take` (its answer frame), `rest` (a half ran out, no
  question), `merged` (the frame after a merge's last copy: the gate shuts; the hold goes on
  this frame) and the finale.

Which ships form a squadron, and its depth row, comes from replaying the splits and merges from
the first frame (a pure function of `frames` up to k, like the robots' and penguins' poses).

**Do it:** a new kind of choice, "which goes next?" (rule 3: a `kind` in `Decision` and a row
in `src/components/doItKinds.ts`).

- **Explorer:** **L** (the left half's lead) or **R** (the right half's lead).
- **Engineer:** taps a lead ship, or uses the arrows and Enter.
- **Badges:** they sit above each lead, outside the ship, never over its digit.

## Changes from the mockup

- **Whole-pixel ships, hand-drawn.** The mockup stretched one 9 × 9 sprite to any size. Here
  each size has its own hand-drawn grid (g = 9, 11, … 25: scouts, fighters, heavy cruisers),
  drawn at p screen pixels per pixel, as CLAUDE.md asks. On a phone that is 18 to 50 px (the
  mockup had 22 to 54).
- **The digit's plate hugs it** (an outline in the plate's color) instead of a rectangle,
  which covered most of a small ship.
- **Sizes on a short stage.** The mockup dropped to one size in zoom on the 479 × 53 field and
  had 14–30 px at 479 × 90. With the level rule there are 4 sizes at 479 × 53 and 7 at
  479 × 90 (13 × 13 to 25 × 25).
- **The glow** sits under the two nozzle gaps (the mockup had it one column further out).
- **No yellow but the rings:** the mockup's gate flash and two of its stars were a pale cream;
  here they are white.
- **The L and R badges** go above the lead, outside it. In the mockup they sat in the ship's
  top corner and covered the digit of a small ship (`phone-doit-*.png`, the 1).
- **The peel** banks sideways; the mockup only dropped straight down.
- **The gate opens** with a move on the first compare of a merge; in the mockup it just
  appeared.
- **The finale ring** fits inside the field: `maxSide` leaves 2s per side for it (the mockup's
  9 touched the stage's edge).

## Why not slimes

The slimes were the planned merge sort character. Three rounds of mockups in PR #75 tried them:
blobs that split and merge, a split tree, an arena, a pond, size slimes and a slime cutter. The
user's feedback across those rounds:

- **The value was only a label.** You had to read the digits to know which goes first; the
  slime itself didn't show the number.
- **A blob splitting and merging read as one thing changing shape,** not as separate values
  being regrouped.
- **The queues read backwards** in some designs, with a half's front facing away from the
  merge point.

The spaceships fix all three. The ship's size is the number. Every ship stays its own object
after the splits, and only squadrons split and form. Both halves read left to right, with
their leads under the gate. The slimes stay in the cast for Kruskal, where groups really do
merge into one.
