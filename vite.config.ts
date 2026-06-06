import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

import { cloudflare } from "@cloudflare/vite-plugin";

// Each game in /games/*.js is loaded as a real ES module via import.meta.glob,
// so Vite/Rollup code-splits one chunk per game automatically — visitors only
// download the game they open. The two heavy shared deps (three, rapier) are
// pulled into their own long-lived cacheable chunks below.
export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      // Small public toolkit used by bundled and contributed games.
      'makone/game': path.resolve(__dirname, 'src/runtime/game/index.ts'),
    },
    // Force a single three.js instance across all packages, otherwise addons /
    // physics helpers can bundle their own copy and trip shader-struct errors.
    dedupe: ['three'],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('rapier3d')) return 'rapier'
        },
      },
    },
  },
})