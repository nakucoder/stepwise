# Merge sort spaceships: B, "Squadrons and a stargate"

Chosen on 2026-10-13 from three spaceship mockups (A Modular mothership, B Squadrons and a
stargate, C Docking station), compared on a phone through the preview of PR #75. PR #75 was
merged by mistake and reverted in #76, so the mockup code is not on `main`; it can be read in
git history (commit `63fae5d`, `src/design/slimes/`). This folder is the spec for building the
real renderer. It replaces the slimes, which were tried for merge sort over three rounds of
mockups and dropped (see "Why not slimes" at the end).

Every number is its own **fighter**, facing up. **Every fighter is the same ship; the number is
the length of its engine trail**, which hangs down from its engines like a bar: a short puff for
the smallest, a long blazing trail for the largest. Its digit sits on a small plate at the
trail's end. Fighters fly in **squadrons** (the groups of merge sort), laid out as a **formation
tree**: one row per split level, the whole list at the top. **Every fighter keeps its own
column**, which is its index in merge sort's frames.

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
layout; the numbers below are the ones to build. In particular the mockup (and a first build)
made a bigger number a bigger ship; the small ships didn't read as spaceships and most of the
stage sat empty, so the value became the engine trail.

The engine-trail design, from the build (390 × 844, light and dark: the start, a compare, a
ship through the gate, the finale), in [`trails/`](trails/):

| Input                        | Light                                | Dark                                |
| ---------------------------- | ------------------------------------ | ----------------------------------- |
| 5 2 8 1 9 3                  | `trails/default-light.png`           | `trails/default-dark.png`           |
| 1 2 3 5 8 9 15 22            | `trails/eight-light.png`             | `trails/eight-dark.png`             |
| 740 × 300 at 130%, a compare | `trails/short-740x300-130-light.png` | `trails/short-740x300-130-dark.png` |

The arcade flight and the bigger digits were proposed before they were wired in, in
[`flight/`](flight/): one take through the gate and the finale at 0.25× on the phone
(`take-phone-025x.gif`, `finale-phone-025x.gif`), every fighter banking (`bank-frames.png`),
and stills of the digits at a compare (390 × 844, 6 and 12 numbers; 740 × 300 at 130%, 6, 12
and Engineer; light and dark). One change since: in the clips the thrust burst makes the flame
longer and drops the plate; as built, the flame stays exactly as long as the trail and the plate
stays put, and the burst is brighter, wider and flickers instead (see
[The engine trail](#the-engine-trail)).

## Scene and geometry

Everything is laid out in the stage field's own pixels (`w × h`, with `n` values). Sprites are
pixel art at **p** screen pixels per sprite pixel, a whole number from 1 to 3; "units" below
are sprite pixels (multiply by p). The source is `src/characters/spaceships/geometry.ts`.

- **Depth:** `D = ceil(log2 n)` split levels; the tree has `D + 1` rows (6 or 8 values: 4 rows;
  12 values: 5).
- **Columns:** the bars' columns, exactly as the penguins' slots follow them (so Engineer's
  pick buttons lie over the ships); the spaceships' look sets no gap between them, so the pitch
  is `w / n`. **Column c is index c of the frame:** a ship in the main row stands in its
  main-row column; a ship in the buffer stands in its buffer column.
- **Rows:** `gapY = 4 px` between rows. In the full tree, `rowH = floor((h − D × gapY) / (D + 1))`
  and row r's top is `r × (rowH + gapY)`. A group (squadron) at recursion depth d is in row d.
- **Digits:** monospace, bold, **never under 13 px**; the plate is `round(1.1 × font)` tall. In
  the full tree, `font = clamp(floor(rowH / 5), 16, 18) px` (smaller, to 13, only if no tree
  fits at 16); in the zoom, see [Fit](#fit). A plate is never wider than its column.

### One ship, and its trail

**Every value on a stage flies the same fighter**, never stretched: the biggest of the hand-
drawn family that fits (the 25 × 25 heavy cruiser wherever it can), at the biggest whole scale
that fits it.

- **Across:** the ship, its ring on each side (2 units) and a pixel of air each side fit the
  column's pitch.
- **Down, each row holds:** the headroom (the gate's bar, the lead's lift and the ring: 2 units
  each), the ship, the **longest trail**, a pixel, the digit's plate, and the row's bottom line
  (1 unit, the squadron's bracket). In the full tree the longest trail must be at least as long
  as the ship. In the zoom there are no trails.
- **The value is the trail's length:** `trail(v) = round(trailMax × |v| / L)` to the pixel, with
  `L` the run's largest value and `trailMax` the longest trail the row holds, at least a 2-unit
  puff. It is proportional, like a bar, and scaled to the run's largest, so lengths compare
  across all rows. A value's trail depends only on the input, never on the step, and never
  changes length, not even in flight.
- **Nothing crosses rows:** the lead lifted with its ring stays under the gate's bar at its
  row's top; the longest trail and its plate end above the row's bottom line.
- **Position:** the ship is centered on its column, `x = round(colCenter − side / 2)`, its top
  under the headroom, `y = rowTop + 6p`. A **lead ship** during a compare is lifted 2 units:
  `y − 2p`. Its trail falls from its engines; its plate is at the trail's end.
- **Digit plate:** at the bottom end of the trail, like the bars' labels: the digit in
  `--space-on-hull` on `--space-plate`, centered on the column, always readable; it never
  covers the ship.
- **Brackets:** each squadron has a 1-unit line in `--space-frame` on its row's bottom line, from
  0.08 of a column inside its first ship's column to 0.08 inside its last. A squadron being
  formed in a merge gets its bracket over its whole span `[lo, hi)` at once, plus a dashed
  outline the size of the ship (1 px, `--space-frame`) where each ship will sit, on each column
  still empty.
- **The stargate:** while a merge `[lo, mid, hi)` at depth d is running, it lies across the top
  of row d + 1, above the halves' ships:
  - the bar: 2 units tall, from column `lo + 0.04` to `hi − 0.04`, in `--space-gate`;
  - two posts at its ends, 2 units wide and 8 units tall, starting 3 units above the bar.
- **Drawing order:** brackets, slots, the gate, then the ships with their trails and plates; a
  ship in flight is drawn last.

The sizes and the trails come from the shortest the field has been in the run (at this width),
so nothing changes size between steps while the stage's height follows the explanation beside
it.

### Fit

The real stage fields (from the build):

| Stage field                        | Plan         | Rows   | Ship          | Font  | Longest trail | Trails (px)                |
| ---------------------------------- | ------------ | ------ | ------------- | ----- | ------------- | -------------------------- |
| 390 × 844 phone: 366 × 336         | full tree    | 4 × 81 | 25 × 25 at 1× | 16 px | 30 px         | 17, 7, 27, 3, 30, 10       |
| 390 × 844 at a compare: 366 × 315  | full tree    | 4 × 75 | 23 × 23 at 1× | 16 px | 26 px         | 14, 6, 23, 3, 26, 9        |
| 390 × 844, 1 2 3 5 8 9 15 22       | full tree    | 4 × 81 | 25 × 25 at 1× | 16 px | 30 px         | 2, 3, 4, 7, 11, 12, 20, 30 |
| 390 × 844, 12 values: 366 × 336    | full tree    | 5 × 64 | 19 × 19 at 1× | 16 px | 19 px         |                            |
| Desktop, Explorer: about 698 × 291 | full tree    | 4 × 69 | 21 × 21 at 1× | 16 px | 22 px         | 12, 5, 20, 2, 22, 7        |
| Desktop, Engineer: about 678 × 125 | zoom, 2 rows | 2 × 60 | 25 × 25 at 1× | 18 px | none          |                            |
| 740 × 300 at 130%: 479 × 88        | zoom, 2 rows | 2 × 42 | 15 × 15 at 1× | 17 px | none          |                            |
| 740 × 300 at 130%: 479 × 69        | zoom, beside | 2 × 32 | 23 × 23 at 1× | 16 px | none          |                            |
| 740 × 300 at 130%: 479 × 53        | zoom, beside | 2 × 24 | 15 × 15 at 1× | 16 px | none          |                            |
| 740 × 300 at 130%, 12: 479 × 49    | zoom, beside | 2 × 22 | 9 × 9 at 1×   | 14 px | none          |                            |

The trails column is for 5 2 8 1 9 3 (and 1 2 3 5 8 9 15 22 on its row). The sizes come from
the shortest the field has been in the run: at 740 × 300 Engineer's field runs from 53 to 69 px
tall, so it is sized as the 53.

**Zoom (a short stage):** when no fighter fits the full tree with a trail as long as itself,
the stage shows only the split or merge in progress, on two rows of
`rowH = floor((h − gapY) / 2)`. Its trails would be a few px, so **there are none: the digits
do the comparing**, made as big as the room allows:

- **Plates under the ships:** the biggest ship that leaves room for a 16 px digit (or as near
  as fits, down to 13), then the digit grows into the room left under it, to 18 px.
- **Plates beside the ships:** the plate level with the ship's middle, the ship and its plate
  centered on the column together; the biggest digit to 16 px that leaves a ship beside it.
  Chosen whenever it gives a bigger digit than under (or as big, with a bigger ship).
- **On stage:** the family's own row d on top (the parent being formed, or the squadron being
  split) and row d + 1 under it (the two halves), with only the groups inside `[lo, hi)`. At
  the start and the finale the family is the whole list.
- **When the family changes** (a new split or merge starts somewhere else), nothing flies: the
  new pose fades in over 200 ms, as a jump would show it.
- **Lost:** the rest of the tree (where this split or merge sits in the whole), and the trails.

The stage caption names the split or merge in progress.

## Sprites

### The fighters

A **family of hand-drawn pixel-art ships**, every odd size from 9 × 9 to 25 × 25, drawn pixel
by pixel and never stretched (the source is `src/characters/spaceships/sprites.ts`).
[`sprite-family.png`](sprite-family.png) shows them all at 1× and 2×, on a light and a dark
page, next to the PR #75 mockup ship (one 9 × 9 sprite stretched to every size, which broke the
whole-pixel rule).

**A stage flies one of them for every value:** the biggest that fits, the 25 × 25 heavy cruiser
wherever it can (a phone, a desktop), a smaller one where the stage is shorter or more crowded
(see [Fit](#fit)). The family keeps one look (the mockup ship's style and colors); bigger is more
detail:

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
- has more pixels than the size below it, and as many engines or more;
- has its engines in its last row, where its trail starts;
- has a frame banking right (and so left), below.

g = 9, a scout: the ship with 12 numbers at 740 × 300 and 130% (479 × 49):

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

g = 13, a scout:

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

g = 25, the heavy cruiser: the ship every value flies on a phone (366 × 336) and a desktop:

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

### Banking

For the turns of a flight every fighter has a **frame banking right**
(`FIGHTERS_BANK_RIGHT`); banking left is its mirror. [`flight/bank-frames.png`](flight/bank-frames.png)
shows every size banking left, level and banking right. Whole pixels: a banked ship is a
different drawing, never the level one rotated or skewed. Banking right:

- **the dipped right wing** pulls in a column or two (foreshortened) and goes into shade (`d`);
- **the raised left wing** catches the light along its leading edge (`w`);
- **the hull** shows more of its left flank: the ridge's highlight widens;
- **the nose and the engines stay put**, so the ship stays centered on its value and its trail
  hangs from the same place.

They were drafted from each level fighter with those edits and checked by eye at 8× and 12×;
the 9 × 9 scout's wing is shaded by hand. `sprites.test.ts` checks each: the same grid and
codes, the right wing shorter and the left as wide, the nose and engines unchanged, more shade
and more light than the level ship, and banking left the exact mirror.

g = 25, banking right:

```
............o............
...........oho...........
...........oco...........
..........occco..........
..........occco..........
..........occco..........
..........ocwco..........
.........ocwwdco.........
.........owwhhdo.........
.........owwhhdo.........
........owwwhhddo........
...o...owhwwhhdhdo...o...
...o..owhhwwhhdhddo..o...
..owo.ohhhwwhhdhddo.odo..
..ohoowhhhwwhhdhdddoodo..
.oahwwhhhhwwhhdhddddddo..
oaahhhhhhhwwhhdhddddddo..
oahhhhhhhhwwhhdhddddddo..
oahhhhhhhhwwhhdhddddddo..
odddddddddddhdddddddddo..
.ooooohdoowwhhdooddoooo..
.....oddoowwhhdooddo.....
.....ooooooowooooooo.....
.....oo..ooooooo..oo.....
......r...r...r...r......
```

### The engine trail

The value: a trail falling from every engine of the ship, `trail(v)` px long (see
[One ship, and its trail](#one-ship-and-its-trail)), in whole sprite pixels, starting in the
row of the engines' glow. Under each engine a flame 3 units wide:

- **The middle column:** `--space-flash` (white) for the first 30%, then `--space-glow`
  (orange) to 80%, then `--space-wing` (red) to the end.
- **The two sides:** 55% as long, orange then red, so the flame tapers.
- **The tip:** every other engine throws a red spark one unit past its end (a flicker in the
  still pose).

The trail is drawn with its ship, so it travels with it: through the gate, and off the top and
back in at the finale. On the deep-space stage it reads the same in both themes.

**With the engines on full** (the thrust burst, while a ship speeds up in flight), the trail
swaps for two brighter, wider frames that flicker every 40 ms (`boostRects`). They are
**exactly as long as the trail**, so the value still reads, and the plate stays where it is:

- **under each engine a flame 5 units wide** (the trail's is 3);
- **the middle column:** white for 65% (or 50%, the other frame), then orange to the end, no red;
- **the columns either side:** white for 30%, then orange to 75% (or 85%);
- **the outer columns:** orange, then red, to 60% (or 50%);
- red is drawn first and white last; no spark past the end.

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

| Frame                                | Move                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Time                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Split `[lo, mid, hi)` at depth d     | The squadron peels: both halves drop from row d to row d + 1 in their own columns, the left half banking out 3 units to the left at mid-flight and the right half 3 units to the right (a curve: 0 → 3 → 0 units sideways), eased in and out. The old bracket fades as the two new ones draw out from their centers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 600 ms, fits                                                                  |
| First compare of a merge             | The gate opens over row d + 1: the posts slide out from the middle to the ends as the bar grows with them (300 ms, eased out). The new squadron's bracket and empty slots fade in on row d. Then as for every compare.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 300 ms, then the compare; fits                                                |
| Compare (an ask frame in Do it)      | The two lead ships pull forward 2 units (200 ms, eased out) and their yellow rings fade in (200 ms).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 200 ms, fits                                                                  |
| Take: the smaller lead flies through | Like an arcade fighter (`flight.ts`), a **swoop**: up its column through the gate's bar, across through the middle of the free band (under the new squadron's parked ships, over the gate), then up into the next empty column of the new squadron, both corners rounded into curves (as wide as 1.5 ships, narrower where a wider curve would cross a ship the square route doesn't), so it never covers a parked ship. **A slow start**, speeding up to the gate (it crosses the bar at 50%) **with its engines on full** (the brighter, wider, flickering trail, from 4%); then it **eases into its slot**, at rest by 86%, and **bobs** up 2 units and settles. It **banks** the way it turns, with the banked frames switched along the path, and levels out as it slows. Its trail and plate travel with it. Its glow pixels double in length while it flies. The gate's bar brightens to `--space-flash` while the ship crosses it (45–55%). The other lead eases back into formation (200 ms). The ships left behind stay in their own columns (no shuffling). | 650 ms, fits                                                                  |
| Rest: a half has run out             | The same flight for the next ship of the other half, with no rings and no lift (nothing to ask). One ship per frame.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 650 ms, fits                                                                  |
| **Merge done (the special move)**    | The gate **flashes** (bar and posts to `--space-flash`, 100 ms), then **shuts**: the posts slide to the middle as the bar shrinks to nothing and fades (100–600 ms, eased in). The new squadron's dashed slots are gone; its bracket brightens once (600–900 ms).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **900 ms, the step waits**; divided by the speed above 1×, never faster below |
| Finale                               | Green rings fade in on every ship (350 ms). From 400 ms, the fighters take off in turn, left to right, 80 ms apart. Each flies straight up off the top of the stage with its trail, starting slow, its engines on full (500 ms), then comes back in from below the stage, up its own column, easing into its place and bobbing up 2 units and back (700 ms). They end in formation, ringed green.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 400 + 80 (n − 1) + 1200 ms, about 2 s for 6, in full                          |

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

| Token                 | Hex       | Used for                                                                                    |
| --------------------- | --------- | ------------------------------------------------------------------------------------------- |
| `--space-bg`          | `#0b1026` | The stage                                                                                   |
| `--space-star`        | `#c9d3ff` | Stars                                                                                       |
| `--space-star-bright` | `#ffffff` | The two bright stars                                                                        |
| `--space-outline`     | `#05070f` | The fighters' outline and base                                                              |
| `--space-hull`        | `#e8ecf4` | The fighters' hull                                                                          |
| `--space-wing`        | `#ff5a5f` | The wing stripe; the trail's red end                                                        |
| `--space-glow`        | `#ff7a2f` | Engine glow; the trail's orange flame                                                       |
| `--space-plate`       | `#f4f6fb` | The digit's plate                                                                           |
| `--space-on-hull`     | `#0b1026` | The digit                                                                                   |
| `--space-frame`       | `#8fa3c8` | Brackets, the empty slots, the fighters' shade                                              |
| `--space-gate`        | `#5fe3ff` | The stargate, the fighters' canopy                                                          |
| `--space-flash`       | `#ffffff` | The gate's flash, its bar as a ship passes, the fighters' highlight, the trail's white core |

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
moving ship's value as a share of the run's largest (its trail's share of the longest), so a
longer trail sounds lower.

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

- tone: sine `f → 4f` with `f = 520 − 240 × |v| / L` Hz (520 for a puff, 280 for the longest
  trail), at 0, length 0.25, level 0.35
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

**As built** (`src/sound/spaceshipVoices.ts`, `src/sound/spaceshipCues.ts`):

- **Every sound lands on its move**, from the spaceships' own moves and times
  (`src/characters/spaceships/steps.ts`), at every speed:

  | Sound                  | When                                  | 0.5× / 1× | 2×     | 4×     |
  | ---------------------- | ------------------------------------- | --------- | ------ | ------ |
  | Peel                   | the split starts                      | 0         | 0      | 0      |
  | Blips (first compare)  | the gate has opened                   | 300 ms    | 216 ms | 108 ms |
  | Blips (other compares) | the leads pull forward                | 0         | 0      | 0      |
  | Zip                    | the ship reaches the gate, 45% of `T` | 293 ms    | 162 ms | 81 ms  |
  | Gate: the flash        | the gate flashes                      | 0         | 0      | 0      |
  | Gate: the shoomp       | the gate starts to shut               | 100 ms    | 50 ms  | 25 ms  |
  | Fanfare                | the first take-off                    | 400 ms    | 400 ms | 400 ms |

- **The gate's sound is two parts,** the flash and the shoomp, sharing the recipe's gain, so the
  shoomp moves with the shut as the special move speeds up (`specialMs`). The shoomp
  **rings out** (`ringOut`): at 4× the step waits only 225 ms, so it plays in full into the
  next step; only a step back, a jump, leaving or Sound off cut it.
- **Frequent sounds fit their step:** the peel, the blips and the zip end 10 ms before the next
  step, cut with a 12 ms fade when they would not (like the quack). At 4× the peel is cut to
  190 ms, the zip to 109 ms and a merge's first blips to 82 ms (the second blip barely sounds).
- **Reduced motion:** each sound at its step's start, still cut to fit its step, so one never
  runs into the next at 2× or 4×. The gate's flash and shoomp keep the recipe's own 0.1 s apart
  at every speed (nothing moves to line up with), and the shoomp still rings out; the fanfare
  plays at once, in full.
- **One step back** replays a compare frame's blips and nothing else; a **jump** is silent (as
  the other characters).
- **Do it:** a right move's chime plays first. A spaceship sound on that step starts no sooner
  than 120 ms (`CHIME_LEAD_MS`), as the quack waits for it: the zip keeps its gate crossing when
  that is later (293 ms at 1×) and waits only when it would collide (81 → 120 ms at 4×, ending
  where it did).
- **The zoom:** when a short stage fades in a new family instead of flying it, the step's sound
  still plays at its moment: the sound follows the frame's event, not the layout.
- **Measured levels** (headless Chrome, through the real chain: the sound's gain, the master
  0.2 and the compressor; 8 renders each; RMS over the 10 ms windows that are sounding, above
  −50 dBFS; the method gives the penguins' finale 0.088, peak 0.23, as their spec):

  | Sound                                                   | RMS   | Peak (median, max) |
  | ------------------------------------------------------- | ----- | ------------------ |
  | Gate shuts (flash, then the shoomp)                     | 0.133 | 0.69, 0.74         |
  | Finale fanfare                                          | 0.113 | 0.29, 0.30         |
  | Zip, a puff (520 Hz) / the longest trail (280 Hz)       | 0.033 | 0.14, 0.16         |
  | Peel                                                    | 0.026 | 0.10, 0.11         |
  | Blips                                                   | 0.025 | 0.10, 0.10         |
  | 4×: the ringing gate under the next split's peel        | 0.137 | 0.69, 0.73         |
  | 4×: the ringing gate under the next merge's first blips | 0.140 | 0.68, 0.72         |
  | 4×, reduced motion: the gate under the next peel        | 0.135 | 0.68, 0.73         |
  | 4×: a cut zip, then the next compare's blips            | 0.045 | 0.16, 0.18         |

  The order is the spec's (the shoomp, the finale, the zip, the peel, the blips), so the
  recipes' gains stay as written. Nothing clips: the loudest moment of any render peaks at
  0.74.

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

- **The value is the engine trail, not the ship's size.** The mockup (and a first build) made a
  bigger number a bigger ship; the small ships didn't read as spaceships and most of the stage
  sat empty. Now every value flies the same ship, and its trail is as long as its value says.
- **Whole-pixel ships, hand-drawn.** The mockup stretched one 9 × 9 sprite to any size. Here
  the ship is a hand-drawn grid (the 25 × 25 heavy cruiser on a phone), drawn at p screen pixels
  per pixel, as CLAUDE.md asks; the family's smaller grids fly only on stages too short for it.
- **The digit is at the trail's end**, on a small plate like the bars' labels, so it never
  covers the ship, and it is big: 16 to 18 px on the tree. On a short stage's zoom the trails
  are dropped and the digit (13 to 18 px) does the comparing, under or beside the ship.
- **The rows hold a ship and its longest trail**, the ships at the top of their row, so the
  trails use the row height.
- **The glow** sits under the nozzles, where the trail starts (the mockup had it one column
  further out).
- **No yellow but the rings:** the mockup's gate flash and two of its stars were a pale cream;
  here they are white.
- **The L and R badges** go above the lead, outside it. In the mockup they sat in the ship's
  top corner and covered the digit of a small ship (`phone-doit-*.png`, the 1).
- **The peel** banks sideways; the mockup only dropped straight down.
- **The gate opens** with a move on the first compare of a merge; in the mockup it just
  appeared.
- **A ship swoops through the gate like an arcade fighter:** a curved path, a slow start and
  a thrust burst, an eased arrival with a bob, and banking with its own banked frames; never
  over a parked ship. The mockup's path went straight up into the new row in its own column.
- **The finale ring** fits inside the field: the ship leaves 2 units per side for it (the
  mockup's 9 touched the stage's edge).

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

The spaceships fix all three. The trail's length is the number (and on a short stage, a big
digit). Every ship stays its own object
after the splits, and only squadrons split and form. Both halves read left to right, with
their leads under the gate. The slimes stay in the cast for Kruskal, where groups really do
merge into one.
