# Heap sort's builder beaver: B2, "Builder beaver and logs"

Chosen on 2026-11-04 after four rounds of mockups on PR #110 (`mockup/heap-sort-character`, DO NOT
MERGE; the page is `/design/heap-sort` on its preview,
https://mockup-heap-sort-character.stepwise-lab.pages.dev/design/heap-sort). The mockup code is on
that branch only (`src/design/heapSort/`). This folder is the spec for building the real renderer.

The rounds: a stegosaurus herd and monkeys in a tree (round one), one monkey with banana crates
(round two), a beaver with logs and an eagle with stick bundles (round three), then B2's full scenes
and a before/after round for the screens. The plan's dinosaurs were dropped for heap sort.

Every value is a **stack of side-on logs**, **one log = one**, so a 7 is exactly 7 logs. A
**builder beaver** works in a lane under the stacks: it carries a stack over its head to its new
place. The tree view is the beaver's **dam**, a pyramid of log ends. The special move is
**hauling the top stack to the woodpile** at the end (the finished part).

## Screenshots

From the mockup (PR #110), at the real stage sizes, light and dark. The numbers: 7 2 11 5 1 9 12 4
3 10 6 8 (1 to 12 mixed up).

| Moment                                   | Screen                             | Light                        | Dark                        |
| ---------------------------------------- | ---------------------------------- | ---------------------------- | --------------------------- |
| The beaver's moods (6×, then 1× and 2×)  | —                                  | `moods-light.png`            | `moods-dark.png`            |
| A climb: the child's stack carried up    | Desktop, dam beside (436 × 253)    | `desktop-climb-light.png`    | `desktop-climb-dark.png`    |
| The top hauled to the woodpile (special) | Desktop                            | `desktop-woodpile-light.png` | `desktop-woodpile-dark.png` |
| The finale                               | Desktop                            | `desktop-finale-light.png`   | `desktop-finale-dark.png`   |
| Looking at a family                      | Phone upright, dam above (366×156) | `upright-family-light.png`   | `upright-family-dark.png`   |
| A climb                                  | Phone upright                      | `upright-climb-light.png`    | `upright-climb-dark.png`    |
| A climb                                  | On its side, 100%, Watch (612×159) | `side-watch-climb-light.png` | `side-watch-climb-dark.png` |
| A stop (the shrug)                       | On its side, 100%, Do it (612×131) | `side-doit-stop-light.png`   | `side-doit-stop-dark.png`   |
| A climb (option A)                       | 740 × 300 at 130%, the tightest    | `tightest-a-climb-light.png` | `tightest-a-climb-dark.png` |

## The look

### The beaver

- **B2, the builder beaver:** dark brown fur, cream cheeks and muzzle, two big white front teeth
  (a dark line between them), a dark nose, a small round ear, dark feet and paws, a flat
  **paddle tail** cross-hatched in grey-brown, and an **orange hard hat** with a darker brim. No
  real company's or character's look. It never talks, never guides, never leaves the stage.
- **On the stage it is the compact B2, 30 × 16 sprite pixels**, facing right (mirrored to walk
  left), so it fits a lane under the stacks. The large B2 (40 × 30, the round-three study) is the
  reference for the look only.
- **Scale:** whole screen pixels per pixel,
  `s = clamp(floor(min(col12 × 2.5 / 30, h × 0.26 / 16)), 1, 3)`, where `col12 = (w + gap) / 12`
  (the stage's grid of 12, never the run's count) and `h` is the field's height. It may span two
  and a half columns: the lane is under the stacks, so it never hides a value.
- **Colours** (the same in both themes): outline `#1e1108`, fur `#6b3d24`, cream `#ead2a8`, feet
  and paws `#3d2214`, tail `#3f332e` with hatch `#272019`, eye `#15171c` with a white shine,
  nose `#1e1108`, teeth `#fbf7ee`, hat `#e2762b`, brim `#a8501a`, mouth `#6a1f12`.

### Its moods

Its moods show in its eyes, mouth and arms (the moods still).

| Mood    | When                           | How                                                      |
| ------- | ------------------------------ | -------------------------------------------------------- |
| waiting | at rest                        | sitting up, paws at its chest, one eye                   |
| walking | between places                 | on all fours, two leg frames, mirrored when going left   |
| looking | a family compared (ask)        | sitting up, eye up and ahead                             |
| found   | the start of a climb           | on all fours, wide eye with a shine, a small "!" over it |
| shrug   | a stop (it stays)              | arms out to the sides, a flat half-closed eye            |
| carry   | holding a stack                | standing, both arms up, the stack on its paws            |
| proud   | the special move, the handover | arms up, happy closed eyes, a smile                      |
| happy   | the finale                     | arms up, happy closed eyes, an open smile                |

### The logs

- **A log seen side-on:** bark `#7a4a26` with darker streaks `#55331a` (from 7 px), a rounded
  left end (from 5 px), and its **round cut end at the right**, pale wood `#e8c48a`, about 0.9 of
  its height wide. A **ring and a center** `#b07a44` only from 7 px; under that the cut end is
  plain. **Under 5 px a plain log** (bark and a paler cut end). At 1 px a stack is a plain column.
- **Outline** `#24150c` round every log, inside its own height: its top line is the line between
  it and the log over it, and one line closes the stack under the bottom log (as the pizza
  boxes). Every log on a stage is identical.
- **Height:** `log = clamp(floor((h − lane − plate − lift − 1) / 12), 1, 12)`, sized for 12 (the
  most the look carries), whole pixels, never from the run's numbers. **Width:**
  `round(min(colW × 0.9, 44))`, where `colW` is the run's column (fewer numbers, wider stacks).
- **The number** sits on a plate under each stack: `#f6efe2` with a 1 px `#5b4630` edge, the digit
  `#15171c`, monospace bold. `font = clamp(floor(min(col12 × 0.42, h × 0.16)), 10, 16)`, the
  plate `font + 2` high.

### The lane

- Along the bottom of the field, `16 × s + 2` px high: a muddy bank `#d8c7a8` with a `#8a7350`
  curb (dark: `#3b3027`, curb `#a08560`). The stacks stand on their plates at the curb; the beaver
  works in the lane under them, so it never hides a value. A carried stack is lifted `2 × s` px.

### The tree view: the dam

- **A node is a log's round cut end:** a bark ring, pale wood, two growth rings, a dark outline,
  and its **number right on the wood** (no disc), about 0.42 of the log end's size.
- **The dam:** a mound of mud `#6e5a48` (flecked `#57473a`) in the pyramid's shape, from the top
  log out to the leftmost and rightmost logs and down to the ground, with a stick `#a07a4a` from
  each log to the two it rests on. Finished values leave the dam and the mound shrinks with the
  heap.
- **Same values and marks as the stacks:** the parent and the child it's compared with ringed
  yellow, a climb ringed pink, and the family's sticks marked in those colours, as the site's
  tree marks its lines. A climb slides the two log ends along their stick; the top leaving drops
  out of the dam toward the woodpile.

### Marks and zones

- **Role colours only as marks from the frame's highlights**, never on the beaver or the logs: a
  yellow ring (`--role-comparing`, with a dark edge) round a stack (plate included) or a log end
  being compared, a pink ring (`--role-swapping`) for a climb or the top leaving, and a green bar
  (`--role-sorted`) on the curb under a stack in its final spot. The band's arcs are the site's.
- **The pyramid's part and the woodpile** (the finished end) keep the site's two heap tints, with
  a dashed fence (`--color-line`) between them.
- All colours above go into `tokens.css` with the renderer, and the digit on its plate gets a
  contrast pair in `tokens.test.ts`.

## Layout per screen

Measured with 12 numbers (the field's size as the site has it, bars; then the mockup's sizes).
With 6 numbers the logs and the beaver are the same (sized from the grid of 12); only the stacks
are wider.

| Screen                                         | Layout                                                     | Field     | Beaver           | One log | A 12   | Stack width (12 / 6) | Number |
| ---------------------------------------------- | ---------------------------------------------------------- | --------- | ---------------- | ------- | ------ | -------------------- | ------ |
| Desktop, 1440 × 900                            | **The dam beside the stacks** (250 px wide, at the left)   | 436 × 253 | 3× (90 × 48)     | 12 px   | 144 px | 26 / 44 px           | 15 px  |
| Phone upright, 390 × 844                       | The dam above the band (as the site's tree), 366 × 148     | 366 × 156 | 2× (60 × 32)     | 8 px    | 96 px  | 21 / 44 px           | 13 px  |
| Phone on its side, 844 × 390, 100%, Watch      | No dam on the stage (the tree's sheet)                     | 612 × 159 | 2× (60 × 32)     | 8 px    | 96 px  | 39 / 44 px           | 16 px  |
| Phone on its side, 844 × 390, 100%, Do it      | The same                                                   | 612 × 131 | 2× (60 × 32)     | 6 px    | 72 px  | 39 / 44 px           | 16 px  |
| 740 × 300 at 130% (the tightest), **option A** | **Arcs-only band**, minimum stage height (Watch and Do it) | 468 × 76  | **1× (30 × 16)** | 3 px    | 36 px  | 27 / 44 px           | 12 px  |

- **Desktop: the dam beside the stacks.** With the beaver look the dam doesn't go over the band (the
  site's tree place): it stands beside the band and field, 250 px wide, at their left, on the same
  lane, so the band and field get the tree's height too (164 + 4 + 85 = 253) and the stacks the
  width left of it (698 − 250 − 12 = 436). Its log ends are 28 px; it sits on the ground, each row
  a little closer than a log's size so the logs rest on the two under them. Before (the dam over
  the band): a 698 × 85 field, the beaver 1× and 4 px plain logs.
- **Phone upright: as the site is now**, the dam over the band where the site shows its tree on
  the stage (log ends 33 px).
- **Phone on its side, 844 × 390 at 100%:** as measured; the tree stays in its sheet.
- **The tightest phone (740 × 300 at 130%): option A.** The band keeps only the arcs (13 px,
  0.625rem; no row numbers: the rows show in the dam, in the tree's sheet), saving 13 px, and the
  stage keeps a **minimum height like the pizza cart's** (the question and the hint keep a fixed
  height and scroll), so Do it gets Watch's field: 63 + 13 = **76 px**. The beaver stays 1×: every
  pixel of a bigger beaver comes out of the logs (option B, a 2× beaver, left 1 px logs). Before:
  Watch 468 × 63 (2 px logs) and Do it with the hint 468 × 33, where a stack of 12 doesn't fit.

## Values: one log = one

- **"The log look uses 1–12."** The rule follows the **look**, not the level, as the pizza cart's:
  an Engineer who picks the beaver gets 1–12 too; bars keep 0–99 for everyone. The registry entry
  carries the range (`range`, 1–12); `parseNumbers`, `describeProblem` and the presets take it.
- **When big numbers meet the log look** (switching the look, a link, typed numbers): keep the
  learner's numbers and keep showing bars, with the message **"The beaver's logs go up to 12."**
  and the **"Use 1–12, same order"** button (`RangeNotice`, `rankNumbers`: each value by its rank,
  so every comparison and swap is the same). Never change numbers silently. The Numbers field says
  **"Beaver: 1 to 12"** while the look is on, with a note as numbers outside it are typed.
- **`check:fit`:** heap sort's character cases use a 1–12 list (`TWELVE_SMALL`); bars keep the list
  with 88 in it.

## The moments and the moves

The moves follow heap sort's frames (`Frame.heap`: the phase, the event, the size, the parent,
its children) and each value's identity through the swaps. A frequent move fits inside the step
(`fitMs`, at most 0.9 of it); the special move is held (`specialMs`, and the step waits for it
through the registry's `holdMs`); the finale plays in full. Lengths at 1× from the mockup.

| #   | Moment                             | What the beaver does                                                                                                                                                                                                                                      | Mood               | At 1×         |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- |
| 1   | Start                              | Sits at the left.                                                                                                                                                                                                                                         | waiting            | still         |
| 2   | Looking at a family (ask)          | Walks under the parent's stack and looks up (the parent and the bigger child ringed yellow, the arcs and the dam's sticks marked).                                                                                                                        | looking            | 500 ms        |
| 3   | A climb                            | "!" (found, 0–15%), walks under the bigger child's stack (15–40%), lifts it over its head (40–50%), **carries it up to the parent's place** (50–90%) while **the parent's stack slides down** along the curb to the child's place, sets it down (90–98%). | found, walk, carry | 820 ms        |
| 4   | A stop                             | Looks (0–30%), **shrugs** (30–70%), and moves on half a column (70–100%). Nothing moves.                                                                                                                                                                  | looking, shrug     | 760 ms        |
| 5   | Settles (nothing under it)         | Walks to the value.                                                                                                                                                                                                                                       | waiting            | 400 ms        |
| 6   | The handover (the dam is built)    | Walks to the top's stack, proud.                                                                                                                                                                                                                          | proud              | 600 ms        |
| 7   | **The top hauled to the woodpile** | The special move: walks to the top (0–20%), lifts its stack over its head (20–30%), **hauls it to the end of the pyramid** with a proud bob at each step (30–85%), sets it down on the woodpile (85–93%); the stack from the end slides up to the top.    | carry, proud       | 2000 ms, held |
| 8   | The dam shrinking                  | (Each top leaving: the fence moves left, the woodpile grows, the dam loses its top log.)                                                                                                                                                                  | —                  | —             |
| 9   | Finale                             | Walks to the end, happy, bobbing; **the stacks hop in a wave**, left to right.                                                                                                                                                                            | happy              | 1600 ms, full |

- **The special move's hold:** in the mockup the step waited 2000 ms + a beat at 1×; the renderer
  sets its exact `holdMs` and divides it by the speed above 1× (`specialMs`), as the cart's
  "Delivered!".
- **Reduced motion:** final poses only (each step's mood, no walk, no bob, no hop).
- **Do it:** unchanged from bars (Explorer **T** / **K**; Engineer taps the child that climbs or
  presses **K**). The beaver's mood follows the learner's move.

## Open items for the renderer

- **Prove in `check:fit` that Do it on the tightest phone gets the 76 px field** (option A: the
  arcs-only band and the fixed question/hint strip), with the hint open, at every step, as the
  cart's `sameSizeProbe` does; and that nothing changes size during a run.
- **The desktop dam beside the stacks** changes the stage's layout for this look only: bars keep
  the site's tree over the band. Check the desktop and laptop heights (`check:fit`'s tree cases)
  and "The idea" beside the stage.
- **Sounds** come after the renderer (picked by ear, as the cart's).
