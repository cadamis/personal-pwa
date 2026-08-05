#!/usr/bin/env node
// Builds every top-level PWA subdirectory into ./_site for GitHub Pages.
import { existsSync, readdirSync, readFileSync, cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const outDir = join(root, '_site');
const ignore = new Set(['scripts', '_site', 'node_modules']);

mkdirSync(outDir, { recursive: true });

const apps = readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !ignore.has(e.name))
  .map((e) => e.name)
  .sort();

const deployed = [];

for (const name of apps) {
  const appDir = join(root, name);
  const pkgPath = join(appDir, 'package.json');
  const destDir = join(outDir, name);

  if (existsSync(pkgPath)) {
    console.log(`\n[build-pages] ${name}: found package.json, building...`);
    execSync('npm ci', { cwd: appDir, stdio: 'inherit' });
    execSync('npm run build', { cwd: appDir, stdio: 'inherit' });

    const candidate = ['dist', 'build'].map((d) => join(appDir, d)).find(existsSync);
    if (!candidate) {
      console.warn(`[build-pages] ${name}: no dist/ or build/ output found, skipping.`);
      continue;
    }
    cpSync(candidate, destDir, { recursive: true });
    deployed.push(name);
  } else if (existsSync(join(appDir, 'index.html'))) {
    console.log(`[build-pages] ${name}: static app, copying as-is.`);
    cpSync(appDir, destDir, { recursive: true });
    deployed.push(name);
  } else {
    console.log(`[build-pages] ${name}: no package.json or index.html, skipping.`);
  }
}

writeFileSync(join(outDir, 'index.html'), landingPage(deployed));

console.log(`\n[build-pages] Done. Deployed: ${deployed.join(', ') || '(none)'}`);

// --------------------------------------------------------------- landing page

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

/**
 * Pulls the display name, description and an icon out of an app's built output,
 * so the index doesn't have to hard-code anything per app. Falls back to the
 * directory name, which is what the list used to show for everything.
 */
function appMeta(name) {
  const destDir = join(outDir, name);
  const icon = ['icon.svg', 'icon-192.png', 'apple-touch-icon.png', 'icon-512.png'].find((file) =>
    existsSync(join(destDir, file)),
  );

  let title = name;
  let description = '';
  for (const file of ['manifest.webmanifest', 'manifest.json']) {
    const path = join(destDir, file);
    if (!existsSync(path)) continue;
    try {
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      title = manifest.name || manifest.short_name || name;
      description = manifest.description || '';
    } catch {
      // A malformed manifest shouldn't take the whole index down with it.
    }
    break;
  }

  return { name, title, description, icon };
}

function landingPage(names) {
  const items = names.map(appMeta).map(
    ({ name, title, description, icon }) => `
        <li>
          <a href="./${name}/">
            ${
              icon
                ? `<img src="./${name}/${icon}" alt="" width="52" height="52" />`
                : `<span class="fallback" aria-hidden="true">${escapeHtml(title.slice(0, 1).toUpperCase())}</span>`
            }
            <span class="text">
              <span class="name">${escapeHtml(title)}</span>
              ${description ? `<span class="desc">${escapeHtml(description)}</span>` : ''}
            </span>
            <span class="chevron" aria-hidden="true">›</span>
          </a>
        </li>`,
  );

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="color-scheme" content="dark" />
    <meta name="theme-color" content="#14121a" />
    <title>personal-pwa</title>
    <style>
      /* Deliberately plain: one file, no assets, no build step. The only real
         job here is being easy to tap on a phone. */
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: max(24px, env(safe-area-inset-top)) 16px calc(40px + env(safe-area-inset-bottom));
        background: #14121a;
        color: #f2eef7;
        font: 16px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        -webkit-text-size-adjust: 100%;
      }
      main { max-width: 620px; margin: 0 auto; }
      h1 { margin: 0 0 4px; font-size: 1.35rem; letter-spacing: 0.01em; }
      p.sub { margin: 0 0 22px; color: #9c93ad; font-size: 0.9rem; }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
      a {
        display: flex;
        align-items: center;
        gap: 14px;
        /* Comfortably over the 44px minimum touch target. */
        min-height: 76px;
        padding: 12px 14px;
        border: 1px solid #322d42;
        border-radius: 16px;
        background: #221f2e;
        color: inherit;
        text-decoration: none;
        -webkit-tap-highlight-color: transparent;
        transition: background 120ms ease, transform 120ms ease;
      }
      a:hover { background: #2a2639; }
      a:active { background: #322d45; transform: scale(0.985); }
      a:focus-visible { outline: 2px solid #7f6bd6; outline-offset: 2px; }
      img, .fallback { flex: 0 0 auto; width: 52px; height: 52px; border-radius: 13px; }
      .fallback {
        display: grid;
        place-items: center;
        background: #3a3350;
        font-size: 1.4rem;
        font-weight: 600;
      }
      .text { min-width: 0; }
      .name { display: block; font-weight: 600; }
      .desc {
        margin-top: 2px;
        color: #9c93ad;
        font-size: 0.85rem;
        /* Two lines is plenty on a narrow screen. */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .chevron { margin-left: auto; color: #6f6684; font-size: 1.5rem; line-height: 1; }
      .empty { color: #9c93ad; }
    </style>
  </head>
  <body>
    <main>
      <h1>personal-pwa</h1>
      <p class="sub">Add any of these to your home screen to install it.</p>
      <ul>${items.join('') || '\n        <li class="empty">No apps deployed yet.</li>'}
      </ul>
    </main>
  </body>
</html>
`;
}
