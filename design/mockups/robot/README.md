# Selection sort robot: E, "Scout and Crane"

Chosen on 2026-10-07 from six mockups (A Gantry, B Hopper, C Rover, D Hopper + claw, E Scout
and Crane, F Hopper with a crane arm), compared on a phone through the preview of PR #47. That
branch was never merged and is deleted. This folder is the spec for building the real renderer.

E is a team of two in the same steel and blue-grey. The **scout** is a small hopping robot
that checks the crates. The **crane** is a trolley on a thin rail at the top of the stage that
does the carrying. Values are wooden **crates** whose height is the value.

## Screenshots

Phone portrait, 390×844 at 2×, light and dark. The bars below each scene show the same step.

| Step                    | Light                         | Dark                         |
| ----------------------- | ----------------------------- | ---------------------------- |
| Compare                 | `phone-compare-light.png`     | `phone-compare-dark.png`     |
| Lock-on                 | `phone-lock-light.png`        | `phone-lock-dark.png`        |
| Carry, mid-air          | `phone-carry-light.png`       | `phone-carry-dark.png`       |
| Carry, extra hard       | `phone-carry-extra-light.png` | `phone-carry-extra-dark.png` |
| Sorted part             | `phone-sorted-light.png`      | `phone-sorted-dark.png`      |
| Finale (the final pose) | `phone-finale-light.png`      | `phone-finale-dark.png`      |

## Scene and geometry

All numbers are in scene units. In the mockup the scene is an SVG 216 wide (6 slots of 32,
plus 16 on each side) and 144 tall. The real stage scales it.

- **Floor** at y = 132, a 3-unit line in the theme's line color.
- **Slots:** slot k starts at x = 32k. A crate is 24 wide at x = 32k + 4.
- **Crates:** height = 10 + 9 × value for values 1–9, so the tallest is 91, which is 69% of
  the 132 above the floor. **Cap: the tallest crate is at most 75% of the height above the
  floor.** That leaves room for the crane above and for the scout on top. A crate has a
  1-unit outline, wood fill, a darker plank line every 9 units, 3×3 steel corners, and its
  number near the top (monospace, 9 units, bold).
- **Sorted platform:** a 4-unit bar in the sorted green under each finished slot (x = 32k + 1,
  width 30, y = 135).
- **Gate:** a steel post between the sorted part and the rest, at x = 32 × (sorted count),
  from y = 98 to 138. It has a green light on top (6×5 outline, 4×3 green). It isn't drawn
  when nothing is sorted or everything is.

## The scout

A 14×16 pixel sprite. Each letter is one pixel: `o` outline, `s` steel, `d` dark steel,
`l` light steel, `v` visor, `e` eye, `a` antenna light.

```
.....oaao.....
......oo......
.oooooooooooo.
osllllllllllso
osvvvvvvvvvvso
osvvvvvveevvso
osvvvvvvvvvvso
osssssssssssso
oooooooooooooo
.osssssssssso.
oodssssssssdoo
.osssssssssso.
..oooooooooo..
...od....do...
..oddo..oddo..
..oooo..oooo..
```

For the finale, rows 4 and 5 become `osvhvhvvhvhvso` and `osvvhvvvvhvvso` (^ ^ eyes, `h`
in the eye color).

- **Where it stands:** on top of the smallest so far. For the crate in slot k, the scout is
  at (32k + 9, crate top − 16).
- **Hop:** an arc from one crate top to another. It moves straight in x, and y rises to 14
  above the higher of the two tops and comes back down.
- **Scan beam (compare):** a thin wedge from the visor, (x + 10, y + 5) to (x + 10, y + 7),
  to the checked crate's top edge, from (crate x + 2, top − 2) to (crate x + 22, top − 2).
  It's filled with the "looking" yellow at 45% opacity and drawn **in front of** the crates,
  so tall crates in between never hide it. A solid 2-unit yellow line marks the top of the
  checked crate. The beam fades in over the last 40% of 900 ms.
- **Lock-on:** a reticle of four corner brackets around the top of the new smallest. The box
  runs from (−4, −4) to (28, 18) relative to the crate's top-left. Each arm is 7 long and 2
  thick, in yellow with a 1-unit dark outline.
  - It moves from the old smallest to the new one in 700 ms, scaling 1.35 at 55% of the way,
    then 0.92 at 75%, then 1.
  - Then it blinks twice in 500 ms (opacity 1 → 0.2 → 1 → 0.2 → 1).
  - At the same time, the scout hops onto the new smallest (700 ms, linear).
- **End-of-round signal:** in the first 12% of the carry (about 410 ms), both arms wave three
  times. Each arm is a 3×6 outlined bar beside the body, raised 7 units, then lowered. An
  8×5 glow in the eye color sits behind the antenna.
- **Step-off:** the scout is standing on the crate that has to be lifted, so it hops onto the
  next crate, to the right, or to the left if the smallest is the last crate. That hop runs
  from 12% to 22% of the carry. The scout stays there until the next round.

## The crane

- **Rail:** a 2-unit steel line across the whole scene at y = 1–3. That's all there is at the
  top.
- **Trolley:** a 10×6 sprite whose wheels sit on the rail (y = 1–7):

  ```
  .oo....oo.
  oooooooooo
  osllllllso
  osvvvevvso
  oddddddddo
  oooooooooo
  ```

  It parks with its left edge at 192 + 16 − 20, near the right end, which leaves room to roll
  in the dance. Over slot k, its left edge is at 32k + 11 (crate x + 7), so the cable lines
  up with the crate's center.

- **Cable:** 1 unit wide, hanging from the trolley's bottom center (trolley x + 5, y = 7). It's
  2 long at rest.
- **Hook:** a 6×6 sprite hung from the end of the cable, with its shank (columns 1–2) on the
  cable. It hooks 2 units into the crate's top.

  ```
  .oo...
  .od...
  .od...
  .od.o.
  .oddo.
  ..oo..
  ```

## The carry (3.4 s)

Fractions are of the 3.4 s carry, eased in and out between keys.

| From – to   | What happens                                                              |
| ----------- | ------------------------------------------------------------------------- |
| 0 – 0.12    | The scout signals (arms and glow)                                         |
| 0.12 – 0.22 | The scout steps onto the next crate                                       |
| 0.14 – 0.30 | The trolley rolls from its parking spot to above the smallest             |
| 0.30 – 0.40 | The hook lowers to the crate's top                                        |
| 0.42        | The hook grips, and the crate hangs from it until 0.87                    |
| 0.44 – 0.53 | The crate is lifted (see the carry rule below)                            |
| 0.53 – 0.75 | The trolley carries it to the front. The front crate slides the other way |
| 0.75 – 0.85 | The crate is lowered into the front slot                                  |
| 0.86 – 0.90 | The front slot's sorted platform and the moved gate appear                |
| 0.88 – 0.95 | The hook lets go and rises back to 2                                      |

- **The other crate** (the one at the front) slides to where the smallest was, from 0.53 to
  0.75. While it slides it's drawn as a **dashed outline** so it never seems to crash through
  the crates in between: a 2-unit stroke, dashes 3 and 2, in the theme's line color, with its
  number in the theme's ink. The solid crate reappears where it lands.
- **The carry rule:** lift as high as fits, go over if it clears, otherwise pass in front with
  a shadow.
  - The crate needs its bottom at least 2 above the top of every crate between the front and
    where it came from. If the scout is standing on one of those, add the scout's 16.
  - It can go no higher than its top at y = 12, which is the trolley's bottom, plus 1 of
    cable and 6 of hook, less the 2 of grip.
  - **If it fits, it goes over them.** Otherwise it's lifted to that top and **passes in front
    of them**: it's drawn above the other crates, with a small shadow just under its bottom
    edge. The shadow is a 22×3 bar in the outline color at 35% opacity, at (crate x + 3,
    bottom + 1).
  - In selection sort the crates passed are never smaller than the one carried. So a small
    crate past tall ones always goes over, and a big one past bigger ones passes in front.

## The finale dance (about 1.15 s)

The dance is timed to the Finale sound (below). In the step it starts after the sorted
platform lights up (fading in over 350 ms, with the dance starting 400 ms in). When the
Finale sound plays, sound and dance start together. Times are ms from the dance's start.

| Time            | The scout                                                                                 | The crane                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 360, 450, 540   | A 4-unit hop over 80 ms. The antenna glows for 55 ms on each beat (one per "bleep-bloop") | The trolley rolls 0 → −6 (400) → +6 (500) → −4 (600) → 0 (700)                                        |
| 300 – 840       |                                                                                           | The hook swings around the cable's top: 0° → 12° (420) → −10° (540) → 7° (660) → −3° (780) → 0° (840) |
| 700 – 820       | The arms appear at 700 and rise 7 by 820 ("bee-DOO!")                                     |                                                                                                       |
| 820 – 900       |                                                                                           | The hook dips like a bow: the cable goes from 2 to 8                                                  |
| 900 – 1150, end | Holds: arms up, ^ ^ eyes                                                                  | Holds: hook bowed                                                                                     |

## Reduced motion

Nothing moves. Every step shows its final pose:

- The beam is drawn straight to the checked crate.
- The reticle sits on the smallest.
- The carried crate is already at the front, with the scout on the crate it stepped onto.
- The gate and platform are in place.
- In the finale, the scout's arms are up with ^ ^ eyes, and the hook hangs bowed (cable 8).

## Colors

The robot and crate colors are fixed, like the ducks'. They read on the light and the dark
stage alike, and they aren't role colors. The blue-grey is far less saturated than the pivot
blue. In the renderer they move to `src/styles/tokens.css` with contrast tests.

| Token                 | Hex       | Used for                        |
| --------------------- | --------- | ------------------------------- |
| `--robot-outline`     | `#15171c` | Outlines, cable                 |
| `--robot-steel`       | `#8d99a8` | Body, rail, gate post           |
| `--robot-steel-dark`  | `#5a6574` | Shading, crate corners          |
| `--robot-steel-light` | `#c8d0da` | Highlights                      |
| `--robot-visor`       | `#2a3340` | Visor glass                     |
| `--robot-eye`         | `#c9efff` | Eye, antenna light, signal glow |
| `--crate-wood`        | `#c99a62` | Crate fill                      |
| `--crate-plank`       | `#a7794a` | Plank lines                     |
| `--crate-on`          | `#15171c` | The number on a crate           |

Role colors appear only for:

- the scan beam and its hit line, and the lock-on reticle (`--role-comparing`, the "looking"
  yellow)
- the sorted platform and the gate's light (`--role-sorted`)

## Sounds (Web Audio, all made in code)

No recordings, so nothing to license or credit. Nothing plays until Sound is on.

**The chain.** Each sound gets its own gain node (the "gain" below). That feeds a master gain
of 0.2, then a `DynamicsCompressor` with default settings, then the speakers, the same as
`src/sound/engine.ts`.

**Building blocks** (times in seconds; `t` is the sound's start):

- **tone(type, from, to?, at, length, level, attack = 0.005, filter?, vibrato?, tremolo?,
  sustain?)** is an `OscillatorNode` of `type`.
  - Its frequency is set to `from` at the start and, if `to` is given, ramped exponentially to
    `to` by the end.
  - Signal path: optional `BiquadFilter`, then optional tremolo, then the envelope, then out.
  - **Filter:** `type` and `frequency`, ramped exponentially to `to` if given; Q is `q`
    (default 0.7).
  - **Vibrato:** an LFO at `rate` Hz, through a gain of `depth` Hz, into the oscillator's
    frequency.
  - **Tremolo:** a gain node whose base value is 1 − depth/2, plus an LFO at `rate` through a
    gain of depth/2 into that gain.
  - **Envelope:** gain 0 at the start, rising linearly to `level` by start + attack. With
    `sustain`, it holds `level` until 20 ms before the end, then drops linearly to 0 at the
    end. Without it, it decays exponentially to 0.001 at the end.
  - The oscillator and LFOs stop 20 ms after the end.
- **noise(at, length, level, filter, attack = 0.002)** is a buffer of white noise (uniform
  −1…1, `length` + 30 ms long), through the filter, with the same envelope as a tone without
  sustain.
- **metal(at, base, level, length, ratios)** is a struck-metal sound: one sine tone per ratio
  r_k (k = 0, 1, 2, …). Each has frequency base × r_k, attack 0.001, length length / (1 +
  0.45k) and level level / (1 + 0.55k), with no sustain.
- **click(at, level, frequency)** is noise lasting 0.012 s, through a band-pass at
  `frequency` with Q 1.2.

Notes: C5 523.25, E5 659.25, G5 783.99, C6 1046.5, E6 1318.51, G6 1567.98, C7 2093 Hz.

### Scan: a scanner-light swipe (gain 2.3)

Soft: it plays at every comparison.

- noise: at 0, length 0.13, level 2.2, attack 0.02, band-pass 700 → 5200 Hz, Q 6
- tone: sine 900 → 2300 Hz, at 0, length 0.12, level 0.35, attack 0.02

### Lock-on: "target acquired" (gain 0.82)

- three bips, C6, E6 and G6, at 0, 0.04 and 0.08: square, length 0.028, level 0.45, low-pass
  4000 Hz, sustain
- then a steady tone: triangle C7, at 0.13, length 0.2, level 0.8, tremolo 18 Hz depth 0.6,
  sustain

### Claw: the special moment (gain 0.8)

A quick zippy whine, a bright double "cla-CLANK", then a rising whirr.

- whine: square 330 → 680 Hz, at 0, length 0.26, level 0.6, attack 0.01, low-pass 1500 Hz,
  vibrato 14 Hz depth 10 Hz, sustain
- clank 1: metal at 0.28, base 880, level 0.55, length 0.12, ratios 1, 2.4, 3.8
- clank 2: metal at 0.31, base 900, level 0.9, length 0.25, ratios 1, 2.4, 3.8
- latch: click at 0.31, level 1.4, 4200 Hz
- whirr: sine 240 → 520 Hz, at 0.46, length 0.28, level 0.8, attack 0.02, tremolo 32 Hz
  depth 0.6, sustain

### Finale: a happy robot (gain 1.1), about 1.14 s

- arpeggio: C5, E5, G5, C6 and E6 at 0, 0.06, 0.12, 0.18 and 0.24: square, length 0.055,
  level 0.4, low-pass 3200 Hz, sustain
- three "bleep-bloops": triangle, length 0.07, level 0.7, sustain:
  - 1200 → 1700 Hz at 0.36
  - 1500 → 950 Hz at 0.45
  - 1000 → 1450 Hz at 0.54
- "bee": square G6, at 0.70, length 0.09, level 0.4, low-pass 3200 Hz, sustain
- "DOO!": square C6 → G6, at 0.82, length 0.32, level 0.42, low-pass 2600 Hz, tremolo 12 Hz
  depth 0.4, sustain

**Measured levels** (rendered offline through the chain above): scan about 0.03 RMS while
sounding, lock-on about 0.07, claw about 0.09 (the loudest, peak 0.36), finale about 0.10.
