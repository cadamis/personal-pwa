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
  See [Why the TS config looks like this](#why-the-ts-config-looks-like-this)
  before adding compiler flags — some deliberately-omitted ones are omitted for
  a reason.
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

## Why the TS config looks like this

This repo is maintained by AI coding agents rather than humans, so the test for
any compiler flag is: **when it fires, does the cheapest way to satisfy it make
the code safer, or merely quieter?** `strictNullChecks` forces you to handle the
branch — safer. A rule you can silence with `as Foo` just moves the risk
somewhere less visible while adding false confidence.

Deliberately **not** enabled, don't re-add without a concrete reason:

- **`noUncheckedIndexedAccess`** — measured against this codebase it produced
  two unsafe `as Exercise` casts and four dead `if (!x) continue` guards on
  bounded loops, against one genuine catch. Note it never applied to
  `Record<FiniteUnion, T>` lookups anyway, so the safety it appeared to provide
  really comes from typing lookup tables properly (see `ExerciseId` and
  `findExercise` in [program.ts](health-trainer/src/data/program.ts)). Prefer
  that: narrow the key type at the source, and widen in exactly one guarded
  place when reading persisted data.
- **`noUnusedLocals` / `noUnusedParameters`** — these fail the *build* over a
  lint concern. An unused local never caused a runtime bug, but it does break
  an agent mid-refactor the moment it comments a call out to test something.
- **`exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`** — both
  very noisy against React props, and both usually "fixed" with a cast.

Kept on purpose: `strict` (the point of the exercise), `skipLibCheck` (stops
agents burning turns on unfixable third-party `.d.ts` errors),
`noFallthroughCasesInSwitch` (real bug class, near-zero false positives),
`noImplicitOverride` (inert today, but Phaser games are class-heavy), and
`allowJs` (lets an app convert to TS file-by-file instead of in one commit).

## Known exceptions

- **`teabug/` is still JavaScript.** It was imported from a standalone project
  and its TypeScript conversion was deliberately deferred so it could ship and
  be playable first. Roughly 1,900 lines across `src/` still need converting to
  strict TS extending [tsconfig.base.json](tsconfig.base.json); its 83 tests
  (`npm test`) are the safety net for doing that. Everything else about the app
  already matches the conventions above. New apps should not follow this
  precedent.
