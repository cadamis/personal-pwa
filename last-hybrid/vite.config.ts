// vitest's defineConfig, not vite's — this config carries a `test` block.
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relative so the app works from its GitHub Pages subpath
  // (/personal-pwa/last-hybrid/) rather than the domain root.
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-maskable.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'The Last Hybrid',
        short_name: 'Last Hybrid',
        description:
          'A top-down adventure through a haunted wood. Shift between human and wolf to survive the night.',
        theme_color: '#1b2430',
        background_color: '#0d1117',
        display: 'standalone',
        // Landscape suits a tablet with on-screen controls, but portrait still
        // works, so this is a preference rather than a lock.
        orientation: 'landscape',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // Phaser alone is ~1.5MB; the default 2MB precache ceiling would skip it
        // and leave the game broken offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
    globals: true,
  },
})
