# Design directions

Static mockups for choosing Stepwise's visual direction. They are **not part of the app**:
`npm run build` only bundles `index.html`, and nothing in `src/` imports from here.

| Direction                                     | Idea                                                          |
| --------------------------------------------- | ------------------------------------------------------------- |
| [A. Lab instrument](mockups/a-lab-instrument) | Bench instrument panel; LCD screen (light), CRT screen (dark) |
| [B. Engineer's notebook](mockups/b-notebook)  | Engineering computation pad; blueprint in dark mode           |
| [C. Color block](mockups/c-color-block)       | Saturated flat color fields, one color per category           |

Every workspace shows the same frozen bubble sort step, described in
[mockups/shared/fake-data.md](mockups/shared/fake-data.md).

## Viewing the mockups

Fonts are self-hosted from `node_modules` (`@fontsource`), so open the mockups through the
Vite dev server rather than as files:

```bash
npm install
npm run dev
```

Then visit, for example:

- http://localhost:5173/design/mockups/a-lab-instrument/home.html
- http://localhost:5173/design/mockups/a-lab-instrument/workspace.html
- http://localhost:5173/design/mockups/a-lab-instrument/workspace.html?level=explorer

The theme follows your OS setting. The Explorer/Engineer toggle on each workspace works.

## Screenshots

[screenshots/](screenshots) has every screen at 1440×900, captured with headless Chrome:
home and workspace in light and dark, plus the workspace in Explorer mode (light).
File names follow `<direction>--<screen>--<variant>.png`.

## After a direction is chosen

- Port its tokens into `src/styles/tokens.css` and build the real components.
- Remove the `@fontsource` packages the chosen direction doesn't use.
- Keep or delete this folder; it is reference material only.
