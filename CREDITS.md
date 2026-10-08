# Credits

Stepwise's code and design are original (see `CLAUDE.md`). Third-party material used in the
site is listed here.

## Sounds

| Sound                                       | Source                                                                                                                                                                   | Author                                                | License                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------- |
| Duck quack (`src/sound/duck-quack.wav`)     | [“Duck Quack - Sound Effect (HD).mp3”, Freesound 515408](https://freesound.org/people/Tabby+Gus./sounds/515408/)                                                         | Tabby Gus.                                            | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)        |
| Penguin call (`src/sound/penguin-honk.wav`) | [“Penguin Sounds”, OpenGameArt](https://opengameart.org/content/penguin-sounds), from [“Pinguine Wasser pltschert.mp3”, Freesound 66150](https://freesound.org/s/66150/) | AntumDeluge, from a recording by Bidone (Leipzig Zoo) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (both) |

The quack is trimmed to a single quack (0.225 s), mixed to mono and normalized. The penguin call
is AntumDeluge's `penguin_01` (cut from Bidone's recording, background noise removed), decoded to
a 0.464 s mono WAV, normalized, with 5 ms fades; insertion sort's penguins will use it for their
honks. CC0 needs no attribution; we credit both anyway. Every other sound is original and made in code with the Web
Audio API, so there is nothing to credit: the blips, the drop of water, Do it's chime and hum,
and selection sort's robot sounds (the scanner swipe, the lock-on, the claw and the finale; their
recipes are in `design/mockups/robot/README.md`).

## Fonts

Archivo, Atkinson Hyperlegible Next and Atkinson Hyperlegible Mono, under the
[SIL Open Font License 1.1](https://openfontlicense.org), bundled through Fontsource.
