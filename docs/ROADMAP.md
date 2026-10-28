# Roadmap ideas

Feature ideas for Stepwise. Most are drawn from Juan's own DSA study notes, which describe how
Juan actually learned this material, so they are a good guide to what will help other learners.

Each idea lists its phase and what it means for the engine types, so nothing here becomes a
surprise refactor. Built so far, for bubble sort, selection sort, insertion sort, merge sort and
quick sort: the [trace panel](#trace-panel), ["best for" guidance](#best-for-guidance), custom
input with presets (Step 8), ["The idea"](#the-idea), [sound](#sound),
[Watch and Do it modes](#watch-and-do-it-modes), the [hint ladder](#hint-ladder), and a
[character](#a-character-for-every-algorithm) for each: [Bath time](#bath-time-ducks) ducks
for bubble sort, the Scout and Crane robots for selection sort, the Snow-brick towers'
penguins for insertion sort, the spaceship squadrons for merge sort, and the pizza delivery cart
for quick sort. The site is deployed; see the
[deployment checklist](#deployment-checklist).

| Idea                                                                | Phase                     | Type impact                                 |
| ------------------------------------------------------------------- | ------------------------- | ------------------------------------------- |
| [Watch and Do it modes](#watch-and-do-it-modes) (built)             | 1                         | Ask frames become explicit decision points  |
| [Phone layout](#phone-layout) (built)                               | 1                         | None; layout only                           |
| [Bath time ducks](#bath-time-ducks) (built)                         | 1                         | None; a second look for the same `Frame`    |
| [Sound](#sound) (built)                                             | 1                         | None; cues are read from each `Frame`       |
| [A character for every algorithm](#a-character-for-every-algorithm) | 1, per algorithm or topic | A look and cues per algorithm, same `Frame` |
| [Trace panel](#trace-panel)                                         | 1                         | Uses `Frame.variables` (already added)      |
| [Big O explorer page](#big-o-explorer-page)                         | 1                         | None; a standalone page                     |
| [Everyday examples](#everyday-examples-explorer-mode)               | 1                         | Content in `explanation.explorer`           |
| ["Best for" guidance](#best-for-guidance)                           | 1                         | New `Algorithm` metadata field              |
| [Engineer tips](#engineer-mode-tips)                                | 1                         | Static content, Engineer mode only          |
| [Hint ladder](#hint-ladder) (built)                                 | 1                         | Hints derived from `Frame` data             |
| [Sliding window](#sliding-window)                                   | 2                         | Array frames; may need a `window` role      |
| [Fibonacci recursion tree](#fibonacci-memoization-tree)             | DP                        | Needs `TreeFrame`                           |
| [A\*](#a-search)                                                    | Graphs                    | Needs `GraphFrame`                          |
| [AI helper](#ai-helper)                                             | After deploy              | Reads the current `Frame`; needs a backend  |

## Phase 1

**Built:** bubble sort (Watch, Do it, ducks, sounds), **selection sort** (Watch, Do it, the
Scout and Crane robots, and their sounds), **insertion sort** (Watch, Do it, the penguins,
and their sounds), **merge sort** (Watch, Do it, the spaceship squadrons, and their sounds) and
**quick sort** (Watch, Do it, the pivot choice, the pizza cart, and its sounds).
Custom input, ["The idea"](#the-idea), the [phone layout](#phone-layout) and Do it mode are
done.

**Merge sort, built:** two-row frames (#74), the spaceships picked from mockups (#75, reverted
in #76) and specced (#77), Watch with bars (#78), Do it (#79: "which goes next?", **L** / **R**
in Explorer, a tap on the second row in Engineer), a fit fix for short landscape screens with
the hint open plus the `check:fit` browser test (#80), each character's scene from the registry
(#81) and scenes that draw both rows (#82), the spaceships renderer (#83) and their sounds (#85).

**Quick sort, built:** bars in Watch (#88) and Do it (#89: "left or right of the leader?",
**L** / **R** in Explorer; in Engineer a[j], then its slot a[i], or Keep order), the pivot rules
(#91: first, last, middle or a seeded random leader), "the idea" fitting beside the bars (#92,
#93), the pizza cart picked from mockups (PR #94, DO NOT MERGE, a reference only) and specced
(#95, [`design/mockups/pizza-cart/`](../design/mockups/pizza-cart/README.md)), its renderer with
the range rule (#96: "the pizza look uses 1–12", bars keep 0–99, and a "Use 1–12, same order"
button when big numbers meet the pizza look), a CI timing fix for its Do it test (#98), and its
sounds (#100), picked by ear from three versions each on a listening page (PR #99, DO NOT
MERGE, a reference only).

**Next: heap sort,** the next sort in the plan (`src/data/categories.ts`): bars first, in Watch
and Do it, then mockups of its dinosaurs, the user picks, the renderer, its sounds and the docs.
CLAUDE.md, "How to add a character", lists the pieces.

**Follow-ups** from building the robots, the penguins, the spaceships and the pizza cart. None
blocks the next algorithm:

- **The ducks' whole-pixel scaling.** The duck is sized in CSS, not at a whole number of screen
  pixels per sprite pixel like the robots and the penguins (CLAUDE.md, "Scaling"). Changing it
  is a visible change, so it needs its own PR and screenshots.
- **The ducks' sounds in their own module.** Each character's scene now comes from the
  registry (`scene`), so Stage has no character branches; `cuesForStep` in `src/sound/cues.ts`
  still branches on the ducks' look (`isDucks`) for the quack and the drop, where the robots,
  the penguins and the spaceships have their own cues modules.
- **`rightMoveCues` names voices.** Do it's chime delays `quack`, `robot-lock` and
  `penguin-swish` by name, and spaceship and pizza cart sounds by `isSpaceshipVoice` and
  `isCartVoice` (they start no sooner than the chime's lead); a per-voice "waits for the chime"
  flag would keep that knowledge with each character.
- **One sound builder.** `penguinVoices.ts` and `spaceshipVoices.ts` each have their own copy of
  the robots' patch builder (the penguins' with tremolo on noise, `honk()` and `call()`; the
  spaceships' with glides through several points and level-point envelopes), so the earlier
  characters' sounds stayed untouched. The pizza cart's sounds reuse the spaceships' `Patch`
  (now exported); it could move to a module of its own that every character shares.
- **Envelopes that start at full level.** In the robots' and penguins' builders (and the
  spaceships' plain envelopes) a sound's envelope is 1 until its first scheduled event; a noise
  source starting a sample early could let one full-level sample through. It was heard in a
  spaceship prototype, never in a build; the spaceships' level-point envelopes start at 0, and
  a shared builder should do the same everywhere.
- **The slide is slightly louder than its spec.** Measured through the real chain, the slide
  into place peaks at about 0.41 (0.36 in the spec) because the whoosh is random noise; its RMS
  is 0.078 against 0.069. Nothing clips; a small trim of the whoosh would bring it in line.
- **Words break at 150% text on short landscape screens.** At 740×300 and 740×360 with 150%
  text, the side column's labels (Numbers, Sound, Help) break mid-word. `check:fit` covers
  130%, where they fit.
- **Duck numbers spill at 915×340 with 130% text** (the normal layout, not the phone one): the
  numbers spill a little out of their water.
- **The spaceships' finale is slightly louder on average than their gate.** Measured through the
  real chain, the finale's RMS is 0.113 and the gate's 0.107, though the gate's peak (about 0.45)
  is well above the finale's (0.29). The spec wants the gate loudest; a small raise of its gain
  would settle it.
- **A merge's first lock-on at 4×.** After the gate opens (108 ms) only 82 ms of the step are
  left, so the lock-on's held tone is cut off.
- **Quick sort's median-of-three pivot.** The engine has first, last, middle and a seeded random
  pivot; median-of-three (the middle of the first, middle and last values) could be a fifth rule
  for Engineer.
- **Quick sort with the bars look: compares make no sound.** The bars blip a comparison of two
  highlighted values; quick sort highlights the value checked and the pivot (its own role), so
  only its trades blip. The pizza cart has its own "hm?" for every compare; the bars could blip
  the value checked and the leader.
- **Engineer's Do it on a small desktop scrolls the stage away.** At 1024x768 (and on a tablet
  in the desktop layout), Start scrolls the page to the answers, past the whole stage: the
  learner answers without seeing the values. Found while fixing the pizza cart's message, which
  now stays on screen whenever any of the stage is.
- **A "race" page:** several sorts side by side on the same numbers, comparisons and swaps
  counted separately, with random, sorted and reversed inputs (a race of the characters for
  Explorer). Build it after more sorts exist.
- **Linear search's character,** possibly the robot dog (it was planned for quick sort but never
  read as a dog in the mockups, PR #94); decided when linear search is built.
- **Speed up check:fit.** It takes ~6 min in CI; run cases side by side.
- **Dependabot alerts are off.** Version updates run, but alerts and security updates are
  disabled in the repo settings (secret scanning and push protection are on). Turning them on
  is free.
- **Do it's hint words are pale in dark mode on a short screen on its side.** With 115% text or
  more at 740x300, the compact hint (`WorkspaceDoIt.css`) puts the hint's words straight on
  Explorer's yellow strip (`.hint-box` is `display: contents`), but they keep the hint box's
  `--color-ink`: near white on yellow in dark mode, about 1.4:1. Every sort; the words should take
  the strip's text color. Next, its own small PR.
- **Heap sort's explanation hidden behind the tree's sheet.** On an upright phone (390x844) with
  130% text, Engineer, 12 numbers and The tree open, the strip under the bars shows only "What's
  happening" and the counts: the question line is hidden. The controls fit (the sheet's tree is
  capped at 0.95px a unit); giving the line back needs about 50px more (a smaller phone band, for
  example the complexity line).

### Bath time (ducks)

**Built: style 1, "ducks on lily pads"**, chosen from four mockups (in `design/mockups/ducks/`).
The same frames, drawn as ducks instead of bars, to make Explorer more joyful without losing
any precision.

- **What carries the value:** a column of water whose height is the value, with the number in
  the water, exactly like a bar. A same-size pixel duck rides a lily pad on top. The ducks are
  the data's riders, never a mascot, and are never yellow (yellow means "looking"): cream with
  an orange beak.
- **Roles live on the water:** yellow rings for looking, pink rings and a splash for trading,
  green rings for done, always with the word under the duck (symbols, an eye ⇄ ✓, with 9 or
  more ducks or on a phone's narrow columns, where the words don't fit).
- **Motion that explains:** when two trade places, the columns slide past each other and the
  duck of the bigger one hops over the other duck, with a splash where it lands. When the list
  is sorted, the ducks bob happily left to right. All of it is skipped with reduced motion.
- **Bars / Ducks switch** on the stage in both levels (on phones it lives in the Menu, which
  keeps the stage's height for the data). Ducks are the default in Explorer, bars in Engineer;
  the choice is saved in `localStorage` like the level and theme.
- **The ducks never disappear** in duck mode. On short or narrow stages (a phone on its side, the
  strip above an open phone sheet, 12 values) they shrink in whole-pixel steps (3×, 2×, 1×) so the
  pixel art stays sharp, and the pads, rings and splash shrink with them.
- **Phone landscape:** the sheet buttons are a column beside the controls and the explanation is
  a strip across the top of the stage that wraps to as many lines as it needs (never cut off), so
  the stage gets the full height.
- **Why style 1:** in the mockups, the styles where duck size carries the value (2 and 3) left
  most of the stage empty and became unreadable with 12 ducks on a phone; heights stayed
  readable.

### Sound

**Built.** Steps can make sounds, muted until the learner turns on **Sound** (on the stage next
to Bars / Ducks on desktop; in the controls on phones). The choice is saved like the theme.

- **Ducks quack rarely, so each quack is fun.** A comparison blips softly, the same as bars,
  the bigger value higher. On a trade, only the duck that hops quacks, once, as it takes off (a
  CC0 recording, see `CREDITS.md`), then lands on its lily pad with a clear drop of water. Each
  trade's quack varies its pitch and speed a little (up to 1.2 semitones either way), so repeats
  never sound identical. The finale, when everything is sorted, is a rising scale of quacks in
  time with the bob, one octave at most, never varied.
- **Bars blip,** pitched by rank: a bigger value sounds higher. Each value's note comes from its
  rank among the list's different values, on a three-octave pentatonic scale, so any list
  sounds pleasant and equal values sound the same. The finale is a rising scale of blips.
- **Fast speeds:** every step's sounds fit inside the step; at 4× the trade's quack is cut short
  with a quick fade. Anything still sounding when the next step comes fades out in 12 ms, so
  nothing clicks.
- **When:** one step forward (including while playing) or back sounds. Jumps (Home, End, Run, a
  preset, new numbers) are silent. A new step cuts off the last one, so sounds never pile up,
  even at 4×. The two exceptions are the penguins' call as a tower slides into place and the
  spaceships' gate shutting: each rings out into the next step forward (a step back, a jump or
  turning Sound off still stops it).
- **Never the only signal:** every sound repeats something already shown in words and color.
- **Do it mode:** a right move plays a short chime going up (the hopping duck's quack, the
  robots' lock-on, the penguins' swish and any spaceship or pizza cart sound follow it); a wrong
  move, one soft low hum that dips a little, never a buzzer.
- On iPhone, the silent switch mutes web audio.

### A character for every algorithm

**Bubble sort has its ducks; the other algorithms get characters too.** Original pixel-art
characters with matching sounds, chosen so that what the character does explains the
algorithm, the way the ducks bubbling up show bubble sort.

**Who gets a character:**

- **One character per algorithm,** chosen so that what it does explains that algorithm, the
  way the ducks bubbling up show bubble sort.
- **Characters come back** where their move fits another algorithm (the owl searches a list,
  then a tree), with a new move that reuses their art and sounds.

**How a character gets made:**

- **Bars first, characters later.** Every algorithm ships first with bars, in both Watch and Do
  it. Its character comes later and never blocks the algorithm.
- **Mockups first, Juan picks, then build,** like the ducks' four styles and the robots' six.
- **Original pixel art only.**
- **Sound follows the ducks' rule:** frequent events get soft sounds, the special moment gets
  the character's sound, and the finale is a celebration.
- **Values stay shown as heights,** as with the ducks: the character rides on its value's
  column and never replaces it (see [Bath time](#bath-time-ducks), "Why style 1").
- **Bars stay available for every algorithm,** with the same Bars / character switch on the
  stage.
- **The ducks' rules carry over:** the characters are the data, not mascots (they never talk,
  never guide and never leave the stage), and they never take a role color (yellow means
  "looking"). Their motion explains a step, is skipped with reduced motion, and they never
  disappear on small screens.

**The cast:** one character per algorithm, 41 in all; names as in `src/data/categories.ts`.

| Topic               | Algorithm                  | Character               | Why it fits                                                                               |
| ------------------- | -------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| Sorting             | Bubble sort                | Ducks (built)           | The bigger duck hops over its neighbor, so the biggest bubbles up to the end.             |
| Sorting             | Selection sort             | Scout and Crane (built) | The scout finds the smallest; the crane carries it to the front.                          |
| Sorting             | Insertion sort             | Penguins (built)        | Each penguin waits on a sled while the bigger ones slide right, then slides into its gap. |
| Sorting             | Merge sort                 | Spaceships (built)      | They split into squadrons; at the stargate the smaller lead flies through first.          |
| Sorting             | Quick sort                 | Pizza cart (built)      | It rolls stacks of pizza boxes to either side of the leader.                              |
| Sorting             | Heap sort                  | Dinosaurs               | The biggest rises to the top, then leaves for its place at the end.                       |
| Sorting             | Counting sort              | Sorter bot              | It drops each item into its numbered bin, then reads the bins out in order.               |
| Searching           | Linear search              | To be decided           | Decided when we build it (the robot dog is one option).                                   |
| Searching           | Binary search              | Owl                     | It looks at the middle, then halves the branch.                                           |
| Searching           | Jump search                | Frogs                   | They hop ahead in blocks, then step back.                                                 |
| Searching           | Interpolation search       | Spaceship               | It calculates where to land from the value.                                               |
| Linked lists        | Insert a node              | Robot train             | It couples a new car into the train.                                                      |
| Linked lists        | Delete a node              | Robot train             | It uncouples a car and joins the train back up.                                           |
| Linked lists        | Reverse a list             | Robot train             | It recouples every car the other way round.                                               |
| Linked lists        | Find the middle            | Tortoise and Hare       | Slow and fast pointers: when the hare reaches the end, the tortoise is at the middle.     |
| Linked lists        | Detect a loop              | Tortoise and Hare       | Slow and fast pointers meet if the track loops (Floyd's "tortoise and hare").             |
| Trees               | BST insert                 | Owl                     | Binary search in a tree, down to the empty branch.                                        |
| Trees               | BST delete                 | Gardener bot            | It prunes a branch and regrafts what was below it.                                        |
| Trees               | Level-order (BFS)          | Ants                    | They explore level by level.                                                              |
| Trees               | Pre-order traversal        | Gardener bot            | It waters each branch before its children.                                                |
| Trees               | In-order traversal         | Gardener bot            | It waters the left branches, the node, then the right.                                    |
| Trees               | Post-order traversal       | Gardener bot            | It waters the children before their branch.                                               |
| Trees               | Heap insert                | Dinosaurs               | A new dino climbs past the smaller ones.                                                  |
| Trees               | Heap remove                | Dinosaurs               | The top dino leaves, and the rest settle.                                                 |
| Graphs              | Breadth-first search       | Ants                    | They spread out from the anthill, one ring of trails at a time.                           |
| Graphs              | Depth-first search         | Spaceship               | It explores deep along one route, then backs up.                                          |
| Graphs              | Dijkstra                   | Delivery drone          | It finds the cheapest route to every stop.                                                |
| Graphs              | A* search                  | Delivery drone          | The same, plus a homing compass toward the goal.                                          |
| Graphs              | Topological sort           | Ducks                   | The ducklings line up after their parents.                                                |
| Graphs              | Prim                       | Scout and Crane         | They build the cheapest bridges outward from one island.                                  |
| Graphs              | Kruskal                    | Slimes                  | Groups merge as the cheapest links join them (union-find).                                |
| Hashing             | Separate chaining          | Octopus                 | Each arm holds a chain of jars (its only role).                                           |
| Hashing             | Linear probing             | Locker bot              | If a locker is taken, it tries the next one.                                              |
| Hashing             | Quadratic probing          | Rats                    | They try burrows 1, 4, 9, … away.                                                         |
| Hashing             | Resizing                   | Locker bot              | It moves everything to a bigger wall of lockers.                                          |
| Pattern matching    | Brute force                | Crab                    | It walks sideways one step at a time.                                                     |
| Pattern matching    | Knuth-Morris-Pratt         | Crab                    | It learns which steps it can skip.                                                        |
| Pattern matching    | Boyer-Moore                | Robot train             | Letter cars slide along the text and leap ahead on a mismatch.                            |
| Dynamic programming | Fibonacci                  | Bees                    | Each honeycomb cell remembers its answer.                                                 |
| Dynamic programming | Longest common subsequence | Bees                    | They fill a honeycomb grid, cell by cell.                                                 |
| Dynamic programming | Knapsack                   | Delivery drone          | It picks the most valuable cargo it can carry.                                            |

**20 characters for 40 algorithms**, plus linear search's, to be decided when it is built (the
robot dog is one option): 12 animals (dinosaurs included) and 8 robots (the pizza cart joined
for quick sort), under one theme, "dinosaurs, animals and robots". A character that comes back (the owl, the ducks, the
spaceship, the Scout and Crane, …) gets a new move for its new algorithm and reuses
its art and sounds. Each new character still goes the same way: mockups first, Juan picks, then
the renderer, then its sounds, then the docs. Ninjas, monkeys and a caterpillar were considered
and dropped. The frogs get a setting of their own, distinct from the ducks' pond.

**Selection sort: built (#51, #53, #55, #56), E "Scout and Crane",** chosen on 2026-10-07 from six
mockups compared on a phone (PR #47, never merged). The values are crates. The scout (a small hopping robot) scans each
crate with a beam and hops onto each new smallest, which the reticle locks onto. At the end of a
round it signals and steps aside, and a crane on a thin rail at the top lifts the smallest to
the front. It goes over the crates it passes if it clears them, otherwise in front of them with
a shadow. The finale is a short dance in time with the sound. The full spec, with
screenshots, sprites, timings, colors and the four Web Audio sound recipes, is in
`design/mockups/robot/README.md`. Three choices made while building it now apply to every
character (CLAUDE.md, "Characters"): the special move (the carry) keeps its full time and the
step waits for it, while frequent moves fit the step; the values fill the stage like bars,
with the sprites in whole-pixel sizes; and every sprite is centered on its value (the spec's
off-center scout was changed to centered).

**Insertion sort: built (#60, #65, #67 to #71), B "Snow-brick towers",** chosen on 2026-10-08
from three mockups compared on a phone (PR #58, never merged). Each value is a tower of snow bricks with a penguin centered on
top. The one being placed rides out on a wooden sled into a lane on the ice and waits while the
bigger towers slide right; then the sled zooms along the lane, the penguin on its belly, and the
tower slides off into its gap (the special move, 1.6 s, the step waits). "In order so far" is a
frosted shelf under those towers and the stage caption; green only when everything is final. The
finale is a flipper wave and a hop. Sounds: a glassy plink at each comparison, a skate scrape for
each shift, a whoosh and a real penguin call (CC0, see `CREDITS.md`) for the slide, the call short
and higher when a tower is already in place, and a chirpy run ending in a honk. The full spec, with
screenshots, sprites, geometry, timings, colors and the sound recipes, is in
[`design/mockups/penguins/README.md`](../design/mockups/penguins/README.md), whose "As built"
section lists where the build differs. Building it added the shared pixel helpers
(`src/characters/pixel.ts`), sounds and hold times read from the character registry, and golden
records of every character's sounds and timing.

**Merge sort: built (#78, #79, #83, #85), B "Squadrons and a stargate",** chosen on 2026-10-13
from three spaceship mockups compared on a phone (PR #75, merged by mistake and reverted in
#76). Every number is its own fighter, facing up, and every fighter is the same hand-drawn ship:
**the number is the length of its engine trail**, with its digit on a plate at the trail's end
(the mockup's bigger-number-bigger-ship read badly with small ships and left the stage empty).
On a short stage the trails are dropped and bigger digits do the comparing. The squadrons form
a tree, one row per split level, and every fighter keeps its column (its index in the frames).
A split peels a squadron into two that drop a row. In a merge, a stargate opens over the two
halves, their leads pull forward, and the smaller swoops up through the gate like an arcade
fighter (a curved path, a thrust burst, banking with its own banked frames). The special move
is the gate flashing and shutting when a merge is done (the step waits). The finale is a loop
off the top and back, ringed green. The sounds were picked by ear from three versions each:
two tones pulling apart at a split, a targeting lock-on at each compare, an engine fly-by
through the gate (lower for a longer trail), a hyperspace "vwoom" as the gate shuts, and an
arcade fanfare. The spaceship now covers merge sort,
interpolation search and depth-first search. **Slimes were tried first and dropped** for merge
sort after three rounds of mockups: the value was only a label (you had to read the digits),
and blobs splitting and merging read as one thing changing shape rather than separate values
regrouped. They keep Kruskal, where groups do merge into one. The full spec (geometry, sprites,
moves and timings, colors, sound recipes and levels, the frame data, screenshots of the mockup
and of the build, and the picked sounds) is in
[`design/mockups/spaceships/README.md`](../design/mockups/spaceships/README.md), whose "Changes
from the mockup" lists where the build differs.

**Quick sort: built (#96, #100), J "Delivery cart and pizza boxes",** chosen on 2026-10-23
after several rounds of mockups (PR #94, never merged; the robot dog was tried first and never
read as a dog). Every value is a stack of takeout pizza boxes on a dolly carrying its digit,
**one box per count**, so a 7 is exactly 7 boxes; that is why the pizza look uses 1–12 (bars
keep 0–99, and a "Use 1–12, same order" button swaps big numbers for their ranks). A small
sidewalk delivery cart rolls in a street lane under the stacks and carries each one to its side
of the leader, whose boxes turn red with a blue ribbon. The special move is **"Delivered!"**:
the leader rolls into its gap, its lid flips open on a pizza and steam rises (the step waits).
The finale is a hop wave. The sounds were picked by ear from three versions each (PR #99, never
merged): a curious "hm?" at each compare, a boop-beep and roll as a stack goes left, a hush as
one stays right, a knock-knock for a trade with itself, a doorbell ding-dong and steam for
"Delivered!", a blip-blip-bloop when a range is done, and a toy-horn fanfare. On phones the
cart's stage keeps a floor of height so the boxes keep their look all run. The full spec is in
[`design/mockups/pizza-cart/README.md`](../design/mockups/pizza-cart/README.md).

**All original:** every design is our own, and sounds are generated in code or CC0 recordings
only, each credited in `CREDITS.md`. Each new recording also needs the user's OK first
(CLAUDE.md, "Sound"), like the quack did.

**Engine:** none for the look, which draws the same `Frame`. Some behaviors may need cues the
frames don't carry yet (the robot's "smallest so far", the owl's
dark half); add them to the algorithm's frames, never to the UI.

### Phone layout

**Built: option B, "focus with sheets"**, chosen from two screenshot options (the mockups are
in `design/mockups/phone/`). It applies below 700px wide or 500px tall (`PHONE_QUERY` in
`src/hooks/useMediaQuery.ts`):

- The bars and "What's happening" fill the screen. A row of buttons opens one sheet at a time:
  The idea, Numbers, Trace (So far) and Code (Colors in Explorer). In portrait an open sheet
  shrinks the bars to a live strip; in landscape it opens beside them.
- The idea opens at step 1 and folds away on the next step, like the desktop rail. A good Run
  in the Numbers sheet closes it and shows the new bars.
- Controls are under the thumbs: along the bottom in portrait, down the right edge in
  landscape, with one Speed button that cycles and a thin progress bar.
- The header is one 48px row; the level and theme switches and the topics are in its Menu.
- `100dvh`, safe-area insets (`viewport-fit=cover`), 44px touch targets, and the page never
  scrolls; only a sheet scrolls inside itself.

What follows is the brief it was built from.

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

**Process (done):**

1. Two phone layout options as screenshots, in portrait (390×844) and landscape (844×390),
   both learning levels.
2. Juan picked B.
3. Built it.

**Ideas to consider:**

- The topics sidebar in a menu.
- The stage plus a one-line caption, always visible.
- Tabs for Trace / Code / Stats (and The idea).
- Playback controls fixed at the bottom, within thumb reach.
- Two columns in landscape.

### The idea

**Built for every sort.** Before step 1, a beginner asks why the algorithm works the way it
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
  - **Engineer (free):** no buttons say what to do. The learner picks a value and then its
    neighbor to swap them, or keeps their order, and the site checks whether that move is the
    one the algorithm would make.
  - **A wrong move starts the [hint ladder](#hint-ladder):** nudge, then concept, then show me.

**Built on the ask-then-answer frames.** Each ask frame is a decision point and the answer
frame right after it is the correct move to check against, so Do it mode needs no second copy
of the algorithm's logic.

**This replaces the separate quiz/predict mode** that was planned earlier.

**Built before any more algorithms** (PRs #41 to #44, 2026-10-06), so every new algorithm
supports both modes from the start.

**Engine:** every ask frame sets `decision` (CLAUDE.md, rule 3), and `answerAt` reads the right
move from the frame after it, so Do it mode needs no second copy of the algorithm. The trace
still shows `swap?` = "?" on ask frames, like a hand-written trace, but nothing relies on it.

**Built for both levels:** the Watch | Do it switch, the challenge, the help ladder, the
finish, the chime and the hum, announcements for screen readers, and the phone layouts in both
orientations. In landscape, help shows only its latest step, beside its buttons, so the stage
keeps its height.

- **Explorer:** guided questions with Trade places / Keep them; keys T / K / H. Selection and
  insertion sort add **S** (new smallest; slide it right); merge sort asks "which goes next?"
  with **L** / **R** (the left or right half's front; the same values take the left).
- **Engineer:** the values on the stage are buttons, one per column (bar and tags), so each
  target stays tall however short the bars get. Pick one, then its neighbor, to swap; picking
  another value moves the pick, and picking it again lets go. Keep order (K) for no swap,
  H for help, Esc lets go. The values are one tab stop: arrows move, Enter picks. The words are
  Engineer's own (comparisons, swaps, `a[j] > a[j+1]`), and the finish counts decisions right
  first time. In merge sort the learner taps the front that goes next on the second row (Help
  only, no Keep order).

**Decided (2026-10-05),** from the mockups in `design/mockups/do-it/` (layout A):

- **Layout A, the answer bar.** In Do it mode the playback bar becomes the answer bar: Trade
  places / Keep them (Explorer) or Keep order (Engineer), plus Help. The question takes the place
  of "What's happening", and the Comparisons / Swaps tiles become the challenge counters. On
  phones the answers sit where Back / Play / Step were. A **Watch | Do it** switch sits in the
  band; Do it is in the address (`?mode=do`).
- **Both answers look alike,** so color never gives the answer away.
- **Engineer:** tap or click one value, then its neighbor, to swap; Keep order for no swap.
  Keyboard: the values become one group of buttons (arrows move, Enter picks, K keeps, Esc
  cancels).
- **Right move:** the `correct` sound, then the step plays on to the next question.
- **Wrong move:** nothing moves, the gentle `tryAgain` sound, and Help opens at the nudge (then
  the concept, then Show me). Never red, no limit on tries.
- **Challenge:** at the start, "Bubble sort needs 7 trades for these numbers. Can you find them
  all?" At the finish, the ducks bob, the scale plays, and an encouraging count:
  "12 of 14 on the first try!" plus an invitation to play again for a perfect run. The count is
  shown only at the finish, never during play, and is never a grade.
- **Must work** with the keyboard, screen readers, phones in both orientations, reduced motion,
  and muted sound.

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

**Built** for every sort, as Do it mode's Help (see "Engine" below).

Help that a learner asks for one rung at a time, so they get only as much as they need. No AI:
every hint is built from the current frame's data, so it is **safe for kids, free, and works
offline**.

1. **Nudge:** where to look. "Look at the two numbers marked in yellow: 5 and 3."
2. **Concept:** the rule that applies. "Bubble sort swaps a pair when the left one is bigger."
3. **Show me:** what happens on this step. "5 is bigger than 3, so they trade places."

- Hints come in both learning levels, like explanations (plain words for Explorer).
- They are generated from the frame's highlights, pointers, trace `variables`, and the change
  to the next frame, so they always match what is on screen.
- In [Do it mode](#watch-and-do-it-modes), a wrong move starts the ladder at the nudge.
- **Design the help panel so a future "Ask a question" box fits in it** (see
  [AI helper](#ai-helper)): the hint rungs stack at the top, with room reserved below.

**Engine (built):** each algorithm's `hints(ask, answer)` returns `{ nudge, concept, showMe }`
per level for a decision frame. The tests check every rung is non-empty at every decision, and
that Explorer passes the jargon check. Hints name the colour ("marked in yellow") and the
numbers, so they read the same on bars and ducks. In Do it mode (`src/engine/doIt.ts`), Help
opens one rung at a time up to the concept; Show me says the answer and makes the move. Asking
for help is free; only a wrong move or Show me means a question wasn't right on the first try.

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
