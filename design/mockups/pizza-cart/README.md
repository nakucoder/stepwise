# Quick sort's pizza cart: J, "Delivery cart and pizza boxes"

Chosen on 2026-10-23 after several rounds of mockups on PR #94 (`mockup/quick-sort-dog`, DO NOT
MERGE; the page is `/design/robot-dog` on its preview,
https://mockup-quick-sort-dog.stepwise-lab.pages.dev/design/robot-dog). The mockup code is on that
branch only (`src/design/robotDog/`, final look at commit `6557df8`). This folder is the spec for
building the real renderer. The robot dog was planned for quick sort but never read as a dog in
the mockups; it is one option for linear search, whose character is decided when it is built.

Every value is a **stack of takeout pizza boxes** on a dolly that carries its digit. **One box =
one:** a 7 is exactly 7 boxes, every box the same on a stage. A small **delivery cart** rolls in a
street lane under the stacks: it takes a stack on its deck and rolls it to its new place. The
**leader** (the pivot) has its own red boxes and a blue ribbon. Placing the leader is the special
move, **"Delivered!"**.

## Screenshots

From the mockup (commit `6557df8`), the input 7 2 11 5 1 9 12 4 7 10 6 8 (1 to 12 mixed up, with a
7 twice; the last value, 8, is the leader), at the real stage sizes, light and dark.

| Moment                                         | Stage                   | Light                         | Dark                         |
| ---------------------------------------------- | ----------------------- | ----------------------------- | ---------------------------- |
| Compare: is 2 smaller than the leader?         | Desktop (698 × 163)     | `desktop-compare-light.png`   | `desktop-compare-dark.png`   |
| Move left: 5 rides the cart into the left zone | Desktop                 | `desktop-left-light.png`      | `desktop-left-dark.png`      |
| "Delivered!": the leader in its place, open    | Desktop                 | `desktop-delivered-light.png` | `desktop-delivered-dark.png` |
| Finale                                         | Desktop                 | `desktop-finale-light.png`    | `desktop-finale-dark.png`    |
| Compare, plain thin boxes (3 px)               | Phone on its side, 130% | `side-130-compare-light.png`  | `side-130-compare-dark.png`  |
| "Delivered!", 12 px boxes                      | Phone upright           | `upright-delivered-light.png` | `upright-delivered-dark.png` |

## The look

### The cart

- A six-wheeled sidewalk delivery robot seen from the side (three wheels show): a white shell, a
  dark deck on top (where a stack rides), a **face screen** at the front (7 × 5, teal eyes and
  mouth), an **antenna** over the face, a small orange **flag** on a pole at the back, and an
  **orange line** down its side. Nothing else on its side: **no logo, no word**. No real company's
  look.
- **26 × 15 sprite pixels**, the deck on row 4 (rows 0–3 are the flag and antenna). Drawn at a
  whole number of screen pixels per pixel, `s = clamp(floor(min(col12 × 2 / 26, h × 0.26 / 11)), 1, 3)`
  where `col12 = w / 12` (the stage's grid of 12, not the run's count). **No compact cart:** the
  sideways stages use the same cart at 1×.
- Its wheels turn (two frames, the hubs go round) while it rolls.
- Colors: shell `#eef1f5`, deck `#3a4150`, screen `#15171c`, eyes and antenna tip `#3fe0c5`, line
  and flag `#e0783a`, wheels `#2a2f38`, hubs `#a3acb9`, outline `#15171c` (light) and `#0b0d12`
  (dark).

### The boxes

Box 2 of the box study, the takeout print, drawn as pixel art at **real size** (one screen pixel
per pixel), one stack per value:

- **Outline:** every box has a **1 px very dark outline `#1c1210`**, inside its own height: its
  top line is the line between it and the box above (or the lid). The bottom box is closed by the
  dolly's own top line, so every box is the same. Against the dark stage no very dark colour stands
  out (ours is 1.6:1, pure black 1.8:1); between boxes it sits on white and red in both themes
  (16.7:1 on white, 3.9:1 on the stripes' red), which is what separates the boxes.
- **Boxes of 6 px and up:** white `#f7f4ec` with red `#d23b2c` stripes, 2 px each, down the
  front; the stack is seen a little from above, so the **3/4 lid** shows over the top box (`lid`
  rows deep, leaning `ceil(lid / 2)` to the right) and the **right side** shows (red `#a12a1f`
  and white `#d8d3c8` columns).
  - **"PIZZA"** on every box where it fits: a 3 × 5 pixel font (P, I, Z, A only), red on a white
    band, the word 19 × 5 px, the band 21 × 7 px, centred on the front. It needs a front at least
    21 px wide and 7 rows under the box's top line (an 8 px box). Never shrunk or squeezed.
  - **The lid's small pizza mark** (a crust ring `#e9b04f` and sauce `#cc3b22`) only where the
    lid is at least 6 px deep, where it reads as a circle; otherwise a plain white lid.
- **Boxes under 6 px (the sideways phone stages):** **plain white** boxes with the outline: no
  stripes, no word, no lid (the box's front only). One thin red band across the middle is allowed
  only from 5 px boxes (at 3 and 4 px the bands of a stack run together into pinstripes); no
  current stage has 5 px boxes.
- **The dolly:** a dark bar `#3a4150` with a 1 px border, as wide as the stack plus 4 px, just
  tall enough for its digit: `font + 2`, the digit (monospace, bold) on a white plate.
  `font = clamp(floor(min(col12 × 0.42, h × 0.16)), 9, 16)`.
- **Width:** `round(min(colW × 0.86, 48))`, where `colW = w / n` (fewer numbers, wider stacks; the
  height never depends on the count).

### The leader

- **Its own red boxes**, `#b52a20`, with a lighter red lid `#e3685c` and **white** lettering, so
  it stands apart from the red-and-white stripes. It keeps the character colour rule: the
  character never takes a role colour.
- Plus the leader role's mark, so it doesn't rely on colour alone: a **blue ribbon**
  (`--role-pivot`, 1 px white edges) down the front of every box and a **bow** (9 × 7, blue with a
  white edge) at the top. Same outlines as every box.
- It turns red when it is picked (the boxes pop), stays red until it is placed, then goes back to
  stripes with the green "in place" mark under it.
- **Duplicates:** two 5s are two identical stacks of 5. A duplicate of the leader's value stays
  striped; only the leader is red and ribboned, so the two are told apart even at the same height.

### The stage

- **The street lane** along the bottom, the cart's body high (`11 × s` px): street `#d3d8df`
  (dark `#0b2a47`) with a curb line `#7d8696` (dark `#6f93ba`). The stacks stand on their dollies
  at the curb; the cart rolls in the lane, under them, so it never hides a value.
- **The zones, in the lane:** smaller than or equal to the leader is a solid sand band `#f0d397`
  with a solid edge `#a8741f` (dark `#7a6531`, `#e0b65a`); bigger is hatched `#a9b4c4` (dark
  `#4b6f96`) with a dashed edge; not checked yet is bare. Values outside the range being worked
  on are dimmed to 40%.
- **Marks** (role colours as marks only): a yellow ring (`--role-comparing`) round the whole stack
  being compared, dolly included; a green bar (`--role-sorted`) under a stack in its final place.
- **Steam** (three small white puffs) only on "Delivered!".
- All colours above go into `tokens.css` with the renderer, and every number drawn on a fill gets
  a contrast pair in `tokens.test.ts`.

## Values: one box = one

- **One box per count, every box identical on a stage**, sized for **12** (the most the pizza look
  allows), not for the run's biggest value, so a 7 is the same on every run. Whole pixels,
  **capped at 12 px** (on tall stages boxes would be cubes, not pizza boxes).
- `lid = max(3, round(min(col12 × 0.86, 48) × 0.12))` if `floor((laneTop − dolly − lid) / 12)` is
  at least 6, else 0 (the box's front only). Then `box = min(12, floor((laneTop − dolly − lid) / 12))`.
- The stack is `value × box` px tall; the lid (when there is one) sits over it, inside the space
  set aside for it, so the tallest stack still fits.

Measured box heights (12 numbers, the stage field's real sizes):

| Stage                                   | One box | Lid | Stripes | "PIZZA" | A 12 stands |
| --------------------------------------- | ------- | --- | ------- | ------- | ----------- |
| Phone on its side, 130% text (479 × 60) | 3 px    | no  | plain   | no      | 36 px       |
| On its side, Explorer (479 × 75)        | 4 px    | no  | plain   | no      | 48 px       |
| On its side, 100% (612 × 140)           | 7 px    | yes | yes     | no      | 84 px       |
| Phone upright (366 × 324)               | 12 px   | yes | yes     | yes     | 144 px      |
| Desktop (698 × 163)                     | 8 px    | yes | yes     | yes     | 96 px       |

On the sideways phones the boxes are thin, so counting them is hard there; the height still shows
the value, and the plain white boxes keep reading as boxes. A trim (a compact cart behind the
digits) won 1 px there but made the cart too small to see; it was dropped.

## The range rule (for the renderer PR)

- **"The pizza look uses 1–12."** The rule follows the **look**, not the level: an Engineer who
  picks the cart gets 1–12 too. Kids get it automatically because Explorer starts on the character
  look. **Bars keep 0–99** for everyone.
- The character's registry entry carries its value range (1–12). `parseNumbers`,
  `describeProblem` and `presetNumbers` take a range, with today's 0–99 as the default, so the
  other sorts are unchanged.
- **When big numbers meet the pizza look** (switching the look, a link, or typed numbers): keep
  the learner's numbers and **keep showing bars**, with the message **"The pizza cart carries 1 to
  12 boxes."** and a button **"Use 1–12, same order"**, which replaces each value by its rank (42
  7 88 → 2 1 3). Ranks keep every comparison and swap, so the run is the same. Never swap the
  numbers silently.
  **As built (fix after #101):** the message stays on screen with the bars. On a desktop the
  stage's top row stays at the top of the screen when the page scrolls (Do it's Start scrolls a
  laptop's page to the answers); on a phone the message takes the band's title (read aloud
  still), so the stage keeps its height. The Numbers field says **"Pizza cart: 1 to 12"** while
  the look is on, and a number outside it gets a note as it is typed ("With 31, you'll see bars
  instead."); it can still run.
- **Presets** pick from 1–12 for the pizza look: "Mixed up" is a shuffle, "Already in order" a
  1-to-12 staircase. The default list (5 2 8 1 9 3) already fits.
- **`check:fit`:** the cart's cases use a 1–12 list (e.g. 7 2 11 5 1 9 12 4 3 10 6 8); quick sort's
  bars and pivot-rule cases keep the list with 88 in it.
- **Golden snapshots:** none mention quick sort; the cart adds its own new record later.

## The moments and the cart's moods

The cart shows its mood with its face, antenna and flag; it never talks or guides, and the words
under the stage stay the explanation. Moods are frame lists timed to the step: a **frequent** mood
fits inside the step (`fitMs`, at most 0.9 of the step), **"Delivered!"** is the special move,
held (`specialMs`, and the step waits for it through the registry's `holdMs`), and the **finale**
plays in full. Every frame lasts at least one screen frame (60 Hz) at 4×.

| #   | Moment                             | What the cart does                                                                                                                                                                    | Mood (frames)                                                                                   | At 4× (budget 180 ms)           |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | Start                              | Waits at the left, wheels still.                                                                                                                                                      | Idle: eyes and a smile                                                                          | still                           |
| 2   | Pick the leader                    | Rolls under the leader; its boxes pop red with the ribbon. With a pivot rule other than "last", it carries the leader to the end of the range first.                                  | Looking                                                                                         | 180 ms                          |
| 3   | Compare                            | Rolls under the value checked (ringed yellow).                                                                                                                                        | Looking: eyes up to the box, across to the leader and back; the antenna tilts toward the leader | 180 ms (84 + 96)                |
| 4   | Move left (a trade)                | Rolls under the stack, lifts it 2 px (× its scale) on its deck and rolls it into the left zone; the other stack slides along the curb to the place it left.                           | Found it: wide eyes, a small "!", the antenna wiggles fast                                      | 180 ms (4 × 30 wiggle, 60 hold) |
| 5   | Leave right                        | Stays put; the stack wobbles once; the bigger zone grows.                                                                                                                             | **Stays right: always calm**, one blink, antenna and flag still                                 | 180 ms (126 + blink 54)         |
| 6   | A trade with itself (a nudge)      | Lifts the stack 3 px (× its scale) and sets it down in place.                                                                                                                         | Found it                                                                                        | 180 ms                          |
| 7   | Place the leader: **"Delivered!"** | The special move: carries the leader into its gap; the top box opens on its whole pizza (where it has a lid), the lid flips up behind it and a puff of steam rises; the cart bounces. | Delivered: a proud smile, the antenna bounces                                                   | 163 ms (`specialMs`), held      |
| 8   | A range done                       | Rolls to the range; the green mark goes under the value.                                                                                                                              | Range done: happy ^ ^ eyes, the antenna and the flag wave                                       | 180 ms (3 × 60)                 |
| 9   | Finale                             | The stacks hop in a wave, left to right; the cart bounces.                                                                                                                            | Finale: happy ^ ^ eyes, the antenna and the flag wave on                                        | 840 ms, in full                 |

Own lengths at 1×: looking 560 ms, found it 270, stays right 370, delivered 650, range done 330,
finale 840 (6 × 140). In the mockup "Delivered!" took about two steps at 1× (the carry 1.5 steps,
the lid flip from 1.3 steps, the steam to about 2.5); the renderer sets its exact `holdMs` and
divides it by the speed above 1× (`specialMs`), like the robots' carry.

**Reduced motion:** final poses only (each mood's last frame, no wiggle, no steam animation);
sounds, when they come, still play at each step's moment.

**Do it:** unchanged from bars: **L** / **R** in Explorer, picks on the stage in Engineer (the
pick buttons lie over the stacks). The cart's mood follows the learner's move.

## The frame data it needs

Nothing new: `Frame.partition` (the range, the leader, the wall, the next value, the event) and
the swaps between frames carry everything. Each value is followed through the swaps by its first
column, so a stack keeps its own boxes as it moves.

## Built

The renderer (`src/characters/pizzaCart/`, with the range rule above) shipped in #96 and its
sounds (`src/sound/cartVoices.ts`, `src/sound/cartCues.ts`) in #100, picked by ear from three
versions each on a listening page (PR #99, never merged): looking, a curious "hm?"; goes left,
boop-beep and roll; stays right, a hush; a trade with itself, knock-knock; "Delivered!", a
doorbell ding-dong and steam, as the leader is set down (sooner at 2× and 4×, so it ends inside
the held step); a range done, blip-blip-bloop; the finale, a toy-horn fanfare. Picking the
leader is silent. The cart's sounds have their own golden record (`src/golden/cartSounds.test.tsx`).
