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

## Adding a new PWA

Drop a new directory in the repo root, e.g. `my-app/`. Two supported shapes:

- **Static app** — just an `index.html` (plus a manifest, service worker,
  icons, etc.) at the root of the directory. It's copied to the deploy as-is.
- **Built app** — a directory with a `package.json`. The workflow runs
  `npm ci` and `npm run build` inside it, then publishes whatever `dist/` (or
  `build/`) contains.

Make sure each app's `manifest.json` uses a relative `start_url`/`scope`
(e.g. `"."` or `"./"`) rather than an absolute `/`, since it will be served
from a subpath, not the domain root.

Directories starting with `.` and the `scripts/` folder are ignored by the
build.
