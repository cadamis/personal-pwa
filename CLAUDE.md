# personal-pwa

Umbrella repo for a collection of independent PWAs, one per top-level
subdirectory. See [README.md](README.md) for the overall structure and the
GitHub Pages deploy pipeline.

## Stack requirements for every app

These apply to every subdirectory, regardless of what kind of app it is
(CRUD-style app, game, etc.):

- **Language**: TypeScript in strict mode. Each app's `tsconfig.json` should
  extend the shared base rather than redefining strictness settings:
  ```json
  { "extends": "../tsconfig.base.json" }
  ```
- **Build tool**: Vite, for every app. Build output must land in `dist/`
  (Vite's default) so [scripts/build-pages.mjs](scripts/build-pages.mjs) can
  find and publish it.
- **UI framework**: current and actively maintained, chosen per app to fit
  what that app actually is — there's no single framework mandated across
  the repo:
  - CRUD/data-style apps (trackers, dashboards, lists): React, Vue, Svelte,
    or Solid.
  - 2D games: Phaser.
  - 3D games: Three.js, or React Three Fiber if a React-flavored API is
    preferred.
  - No jQuery, no unmaintained/abandoned frameworks, no untyped JS.
- **PWA basics**: every app must be independently installable — a
  `manifest.json` with a relative `start_url`/`scope` (`"."`, not `"/"`,
  since it's served from a subpath), a service worker (`vite-plugin-pwa` is
  the easiest way to generate one), and icons.

## Scaffolding a new app

From the repo root:

```bash
npm create vite@latest <app-name>
```

Pick a template matching the framework decision above, then point its
`tsconfig.json` at the shared base and confirm the build output is `dist/`.
