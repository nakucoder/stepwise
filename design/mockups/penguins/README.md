# Insertion sort penguins: B, "Snow-brick towers"

Chosen on 2026-10-08 from three mockups (A Ice pillars, B Snow-brick towers, C Ice shelf),
compared on a phone through the preview of PR #58. That branch was never merged and is deleted.
This folder is the spec for building the real renderer.

Each value is a **tower of snow bricks** whose height is the value, with a **penguin** standing
centered on top. The one being placed rides out on a little **wooden sled** into a lane on the
ice in front of the line and waits there. The bigger towers slide right to make room. Then the
sled zooms along the lane, the penguin on its belly, and the tower slides off into its gap.

Insertion sort is the shift version, drawn as permutations: in the frames the key sits in the
gap it is waiting for, so bars, Do it and the checks work unchanged. The penguins tell the shift
story: the key waits in the lane at the slot it came from until it slides into its gap.

## Screenshots

Phone portrait, 390×844 at 2×, light and dark. The bars below each scene show the same step.

| Step                       | Light                     | Dark                     |
| -------------------------- | ------------------------- | ------------------------ |
| Round start                | `phone-start-light.png`   | `phone-start-dark.png`   |
| Compare                    | `phone-compare-light.png` | `phone-compare-dark.png` |
| Shift, mid-glide           | `phone-shift-light.png`   | `phone-shift-dark.png`   |
| Slide into place, mid-zoom | `phone-slide-light.png`   | `phone-slide-dark.png`   |
| Already in place           | `phone-inplace-light.png` | `phone-inplace-dark.png` |
| Frosted shelf              | `phone-shelf-light.png`   | `phone-shelf-dark.png`   |
| Finale (the final pose)    | `phone-finale-light.png`  | `phone-finale-dark.png`  |

## Scene and geometry

Everything is laid out in the stage field's own pixels: the towers fill it like bars, and the
sprites are pixel art at **s** screen pixels per sprite pixel. Numbers in "units" below are
sprite pixels (multiply by s).

- **Sprite scale:** `s = clamp(round(min(h / 144, pitch / 32)), 1, 3)` for a field `w × h` with
  `n` values, `pitch = w / n`. Sprites never disappear (s is at least 1).
- **Slots:** slot k's center is `round(pitch × (k + 0.5))`. A tower is
  `round(min(pitch − 2s, 0.72 × pitch))` wide, centered on its slot.
- **Bottom, from the field's bottom up:** a 1-unit margin, then the **lane** (7 units), then the
  **ground band** (3 units). The line's towers stand on the ground band's top,
  `floorY = h − 10s`. The lane's base is `h − s`.
- **Room on top:** 16 units above the tallest tower for its penguin (14 tall) and a 2-unit hop.
- **Heights:** the crates' rule. With `available = floorY − 16s` and `largest` the biggest
  value, a tower is `round(available × (10 + 81 × |value| / max(largest, 9)) / 132)` tall: 10 +
  9 × value of 132 for 1–9, the tallest at 69%, under the 75% cap. A tower is never shorter
  than its number needs: `ceil(1.2 × font + 3s)`, with `font = max(9s, 10 px)`.
- **A tower:** snow fill; a mortar line (1 unit) every 6 units from the top, inset 1 unit from
  each side; one vertical joint per course, 5 units tall, at the middle and at the quarter in
  turn (staggered like brickwork); a 1-unit outline; its number centered near the top
  (monospace, bold, `font`, baseline at `min(height − s, 2s + font)`).
- **The sled:** under the waiting tower, its top at the tower's bottom. A 2-unit wooden board 1
  unit wider than the tower on each side, and under it a 1-unit dark runner 2 units wider on
  each side. The waiting tower's bottom is at `laneBase − 3s`.
- **The penguin:** centered on its tower, standing on the top: its left edge at
  `round(towerWidth / 2) − 6s`, its top 14 units above the tower's top. Lying on its belly (the
  slide): left edge at `round(towerWidth / 2) − 8s`, top 8 units above. The standing sprite is
  exactly symmetric, so it centers to the pixel.
- **Drawing order:** the line's towers first; the key (waiting, or sliding back in) last, in
  front.
- **Comparing:** a 2-unit bar in the "looking" yellow across the top of each compared tower
  (the key's and its left neighbor's). Role colors go on the ice and the towers' tops, never on
  a penguin.

## Sprites

One letter per pixel: `o` outline, `k` black back, `w` white belly, `b` beak, `f` feet, `e` eye.
Every sprite also gets a **1-pixel rim**: the empty pixels touching it on any side (left, right,
above, below), in ice-light, so a black penguin shows on the dark stage.

Standing, 12 × 14 (facing us, symmetric):

```
....oooo....
...okkkko...
..okkkkkko..
..okekkeko..
..okkbbkko..
.okkkbbkkko.
okkwwwwwwkko
okkwwwwwwkko
okwwwwwwwwko
okwwwwwwwwko
.okwwwwwwko.
..owwwwwwo..
..offooffo..
..oo....oo..
```

Flippers up (the finale), 12 × 14:

```
....oooo....
...okkkko...
o.okkkkkko.o
kooekkkkeook
kkokkbbkkokk
.kokkbbkkok.
..okwwwwko..
.okwwwwwwko.
.okwwwwwwko.
.okwwwwwwko.
..owwwwwwo..
..owwwwwwo..
..offooffo..
..oo....oo..
```

Belly slide, 16 × 8 (facing left, the way it slides):

```
.....oooo.......
...ookkkkooooo..
.bbokekkkkkkkkoo
bbookkkkkkkkkkko
..okwwwwwwwwwwko
..okwwwwwwwwwwoo
...oowwwwwwwooff
.....ooooooo..ff
```

## The ice, the frosted shelf and the caption

- **Ground band** (3 units) under the whole line, in ice-ground. The **lane** in front of it (7
  units) in ice-lane, with a 1-unit ice-light line 2 units above the lane's base.
- **In order so far:** the ground under each tower that is in order (the first `i` after round
  `i`) turns to **frost**: white across the tower's width plus 1 unit each side, with two
  1-unit sparkles in ice-shade (2 units in from the left, 4 in from the right, 1 unit down). No
  role color: the left part is in order but not final.
- **The stage caption** says it in words: "round 3: the first 3 are in order", and when
  everything is final, "all in order".
- **Final:** only at the end, the ground under every tower turns to the sorted green
  (`--role-sorted`), as the platform did for the robots.

## The moves

Frequent moves fit inside the step (at faster speeds they are fitted to `0.9 × step`); the
special move keeps its full time and the step waits for it (`holdMs`). Times are at 1×, where a
step is 800 ms.

| Step                 | Move                                                                                                                                                                                                                                                     | Time                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Round start          | The key's tower moves from its slot into the lane, onto its sled (the sled fades in), straight down and forward, eased in and out. It waits there, at the slot it came from.                                                                             | 600 ms, fits the step                                                             |
| Compare              | The yellow bars fade in on the two tops.                                                                                                                                                                                                                 | 300 ms, fits                                                                      |
| Shift                | The bigger tower glides one slot right into the gap, eased in and out, its penguin riding. The key keeps waiting where it is.                                                                                                                            | 600 ms, fits                                                                      |
| **Slide into place** | The penguin lies on its belly; the sled zooms along the lane to the gap (eased in, 0–78%), then the tower slides off it up into the line (eased out, 78–100%) while the sled fades. Ice spray (three white pixels) 20–75%. The penguin stands up at 90%. | **1600 ms, the step waits**; divided by the speed above 1×, never faster below it |
| Already in place     | The key's tower steps straight back into its slot (400 ms), then its penguin hops 4 units (300 ms).                                                                                                                                                      | 700 ms, fits                                                                      |
| Round ends           | The newly in-order tower's frost fades in.                                                                                                                                                                                                               | 350 ms, fits                                                                      |
| Finale               | The green fades in (350 ms). From 400 ms, each penguin raises its flippers in turn, left to right, 110 ms apart; after the last, all hop 4 units together (260 ms). They hold the flippers-up pose.                                                      | about 1.2 s, in full                                                              |

Only one step forward plays a move; going back or jumping shows the frame's pose, and a resize
mid-move rebuilds the move from where it had got to (as the robots do).

**Reduced motion:** nothing moves. Each step shows its final pose: the key on its sled in the
lane; the shifted tower in its new slot; the key back in its gap, standing; the frost in place;
at the end, the green and every penguin with its flippers up. Sounds still play at each step's
moment.

## Colors

Fixed in both themes, like the ducks' and the robots'. Never yellow on a penguin (yellow means
"looking"); the beak and feet are the ducks' orange. In the renderer they move to
`src/styles/tokens.css`, with contrast tests for the tower numbers.

| Token               | Hex       | Used for                                   |
| ------------------- | --------- | ------------------------------------------ |
| `--penguin-outline` | `#15171c` | Outlines, the sled's runner, tower numbers |
| `--penguin-back`    | `#1d2433` | The penguin's back and head                |
| `--penguin-belly`   | `#fbfcfd` | Belly and eye                              |
| `--penguin-orange`  | `#ff8a1f` | Beak and feet                              |
| `--ice-light`       | `#f2fbff` | The sprites' rim, the lane's line          |
| `--ice-ground`      | `#dff1fb` | The ground band                            |
| `--ice-lane`        | `#c4e2f3` | The lane                                   |
| `--ice-shade`       | `#9cc9e4` | Frost sparkles                             |
| `--snow`            | `#f4f7fb` | Tower fill                                 |
| `--snow-mortar`     | `#b9c9d8` | Mortar lines and joints                    |
| `--sled`            | `#a7794a` | The sled's board                           |
| (frost)             | `#ffffff` | Frost, ice spray                           |

Role colors appear only as the comparing bars on the towers' tops (`--role-comparing`) and the
final green (`--role-sorted`).

## Sounds

Four are made in code with Web Audio; the two honks use one CC0 recording, the penguin call
(`src/sound/penguin-honk.wav`, credited in `CREDITS.md`). Nothing plays until Sound is on.

**The chain** (as `src/sound/engine.ts` and the robots): each sound has its own gain (below), then
a master gain of 0.2, then a `DynamicsCompressor` with default settings.

**Building blocks** (seconds; `t` is the sound's start):

- **tone(type, from, to?, at, length, level, attack = 0.005, filter?, tremolo?, sustain?):** an
  `OscillatorNode` of `type`, frequency `from`, ramped exponentially to `to` (if given) by the
  end. Path: optional `BiquadFilter` (type, frequency, ramped exponentially to `to` if given,
  Q default 0.7), then optional tremolo (a gain of `1 − depth/2`, plus an LFO at `rate` through a
  gain of `depth/2` into it), then the envelope. **Envelope:** 0 at the start, linear to `level`
  by start + attack; with `sustain`, hold until 20 ms before the end, then linear to 0; without
  it, exponential to 0.001 at the end. Oscillators and LFOs stop 20 ms after the end.
- **noise(at, length, level, filter, attack = 0.002, tremolo?):** white noise (uniform −1…1),
  `length` + 30 ms long, through the filter (and optional tremolo), with the envelope of a tone
  without sustain.
- **honk(at, f, length, level):** a nasal bray: a sawtooth `f → 0.88f`, attack 0.015,
  band-pass at `2.3f` (Q 2.5), tremolo 24 Hz depth 0.55, sustain; plus a sawtooth
  `1.5f → 1.35f`, length × 0.9, level × 0.35, attack 0.015, band-pass at `3.2f` (Q 3), sustain.
- **call(at, rate, level, cut?):** the recorded penguin call, an `AudioBufferSourceNode` at
  `playbackRate` `rate`, through a gain held at `level` and dropped linearly to 0 over the last
  20 ms; it ends at `at + min(cut, duration / rate)`.

**The recording:** `src/sound/penguin-honk.wav`, 0.464 s, mono, 44.1 kHz, 16-bit: the whole of
`penguin_01` from "Penguin Sounds" (AntumDeluge, OpenGameArt, CC0), itself cut from Bidone's
recording at Leipzig Zoo (Freesound 66150, CC0). Decoded from the Ogg, normalized to 0.9 of full
scale, with 5 ms fades in and out. Fetched only when Sound is turned on, like the quack.

### Tap: a glassy plink (gain 2.8), at every comparison

Soft: it plays at every comparison.

- tone: sine 1760 Hz, at 0, length 0.09, level 0.4
- tone: sine 2637 Hz, at 0, length 0.07, level 0.25

### Swish: a skate scrape (gain 1.65), as a bigger tower shifts right

Soft: it plays at every shift.

- noise: at 0, length 0.18, level 0.9, high-pass 3000 Hz, attack 0.02, tremolo 40 Hz depth 0.5
- noise: at 0, length 0.1, level 0.4, band-pass 900 Hz

### Slide into place: a whoosh, then the penguin's call (gain 4.05), the special moment

- the whoosh: noise, length 0.9, level 1.4, band-pass 400 → 2500 Hz, Q 1.5, attack 0.15
- the call: `call(rate 1, level 0.3)`, the whole recording

**In the step** (synced to the slide of length `T`): the call starts as the penguin stands up in
its gap, at `0.9 T` (1.44 s at 1×). The whoosh is placed to end as the sled reaches the gap: it
starts at `max(0, 0.78 T − 0.9 s)` and is cut, with a quick fade, where the call starts. With
reduced motion: the whoosh at 0 and the call at 0.9 s, as the recipe plays them back to back.

### Already in place: the call, short and higher (gain 1.83)

- the call: `call(rate 1.25, level 0.34, cut 0.2 s)` (1.25× is about 3.9 semitones up)

In the step it starts with the hop (400 ms in at 1×, fitted at faster speeds); with reduced
motion, at the step's start.

### Finale: a chirpy run up, ending in a honk (gain 1.43)

- six chirps: square, length 0.06, level 0.4, low-pass 3500 Hz, sustain, at 1047, 1175, 1319,
  1568, 1760 and 2093 Hz, at 0, 0.07, 0.14, 0.21, 0.28 and 0.35
- honk(0.5, 520 Hz, 0.35, 0.9)

It starts with the flipper wave, 400 ms into the finale step (at once with reduced motion), and
plays in full.

**Measured levels** (rendered offline through the chain above, RMS while sounding): tap 0.025,
swish 0.026, slide into place 0.069 (the loudest; peak 0.36), already in place 0.042, finale
0.088 (peak 0.22). Nothing clips.

## Fit

On the tightest stage (a phone on its side at 130% text: a 479 × 55 px field in Watch, 479 × 90
in Do it) the scene was checked to stay inside the field at every step and at every moment of
every move, including the key on its sled in the lane. Sprites are at 1× there, and most towers
sit at their minimum height (they must fit their number), as the robots' crates do on that
screen.
