#!/usr/bin/env node
// Builds every top-level PWA subdirectory into ./_site for GitHub Pages.
import { existsSync, readdirSync, statSync, cpSync, mkdirSync, writeFileSync } from 'node:fs';
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

const links = deployed.map((name) => `<li><a href="./${name}/">${name}</a></li>`).join('\n      ');
writeFileSync(
  join(outDir, 'index.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>personal-pwa</title>
  </head>
  <body>
    <h1>personal-pwa</h1>
    <ul>
      ${links || '<li>No apps deployed yet.</li>'}
    </ul>
  </body>
</html>
`,
);

console.log(`\n[build-pages] Done. Deployed: ${deployed.join(', ') || '(none)'}`);
