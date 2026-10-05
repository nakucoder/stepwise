# Design

Stepwise's visual direction is **D. Blend**. See [DECISION.md](DECISION.md) for what was
compared and why.

These are static mockups, **not part of the app**: `npm run build` only bundles `index.html`,
and nothing in `src/` imports from here.

## Contents

| Path                                                       | What it is                                            |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| [DECISION.md](DECISION.md)                                 | Decision record: directions compared, why D, levels   |
| [mockups/d-blend/](mockups/d-blend)                        | The chosen direction: home and workspace (HTML + CSS) |
| [mockups/shared/fake-data.md](mockups/shared/fake-data.md) | The frozen bubble sort steps shown in the mockups     |
| [screenshots/](screenshots)                                | Screenshots of all four directions, kept as a record  |

The mockup code for directions A, B and C was removed once D was chosen (their fonts were
removed too, so they would no longer render). Their screenshots remain in `screenshots/`.

## Viewing D

Fonts are self-hosted from `node_modules` (`@fontsource`), so open the mockups through the
Vite dev server rather than as files:

```bash
npm install
npm run dev
```

Then visit:

- http://localhost:5173/design/mockups/d-blend/home.html
- http://localhost:5173/design/mockups/d-blend/workspace.html
- Add `?level=explorer` to either URL for Explorer mode.

The theme follows your OS setting. The Explorer/Engineer toggle works on both pages.

## Screenshots

All at 1440×900, captured with headless Chrome. File names follow
`<direction>--<screen>--<variant>.png`.

- **D (chosen):** home and workspace in light and dark (Engineer), plus home and workspace in
  Explorer (light).
- **A, B, C (not chosen):** home and workspace in light and dark, plus the workspace in
  Explorer (light).

## Next

Port D's tokens into `src/styles/tokens.css` and build the real components from these
mockups.
