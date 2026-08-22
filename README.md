# personal-pwa

Umbrella repo for a collection of small, independent Progressive Web Apps. Each
top-level subdirectory is its own standalone PWA — its own `package.json`
(if it needs a build step), its own `manifest.json`, its own service worker.
Nothing is shared between them beyond living in this repo and this deploy
pipeline.

On every merge to `main`, [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)
builds every subdirectory and publishes the result to GitHub Pages. Each app
ends up served at its own path, e.g.:

```
https://cadamis.github.io/personal-pwa/<app-name>/
```

so each one can be installed independently as its own app on a phone.

## The apps

| App                                        | What it is                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [health-trainer](health-trainer/)          | Personal strength + mobility trainer for short daily sessions.                              |
| [teabug](teabug/)                          | Run a cosy country tea room: brew, bake, and serve the regulars.                            |
| [cuteness-overload](cuteness-overload/)    | A bullet-heaven romp through the Snuggle Meadow. Collect silly power-ups, out-cute the Grumps. |
| [last-hybrid](last-hybrid/)                | A top-down adventure through a haunted wood. Shift between human and wolf to survive the night. |

The deployed landing page at `/personal-pwa/` builds this same list for itself,
reading each app's name, description and icon out of its manifest — so nothing
there has to be kept in step by hand. This table is for people reading the repo.

## Tech stack requirements

Every app in this repo is expected to use:

- **TypeScript**, strict mode — extend the shared [tsconfig.base.json](tsconfig.base.json)
  rather than redefining strictness settings.
- **Vite** as the build tool, with output in `dist/`.
- A **current, actively maintained UI framework**, chosen per app to fit
  what that app is (React/Vue/Svelte/Solid for CRUD-style apps, Phaser for
  2D games, Three.js/React Three Fiber for 3D). No single framework is
  mandated across the whole repo — pick what fits.

See [CLAUDE.md](CLAUDE.md) for the full detail on these requirements and how
to scaffold a new app.

## Adding a new PWA

Scaffold a new directory in the repo root with `npm create vite@latest
<app-name>`, choosing a template for the framework you picked. Two shapes
are supported by the build:

- **Built app** (the norm) — a directory with a `package.json`. The workflow
  runs `npm ci` and `npm run build` inside it, then publishes whatever
  `dist/` (or `build/`) contains.
- **Static app** — just an `index.html` (plus a manifest, service worker,
  icons, etc.) at the root of the directory, no build step. It's copied to
  the deploy as-is.

Make sure each app's `manifest.json` uses a relative `start_url`/`scope`
(e.g. `"."` or `"./"`) rather than an absolute `/`, since it will be served
from a subpath, not the domain root.

Directories starting with `.` and the `scripts/` folder are ignored by the
build.
