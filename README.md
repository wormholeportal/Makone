<div align="center">

<img src="public/favicon.svg" alt="Makone Arcade" width="88" height="88" />

<h1>Makone Arcade</h1>

<p><b>Make games with code. Share them instantly.</b></p>

<p>A code-first browser arcade for self-contained procedural games.</p>

<p>
  <a href="https://makone.dev"><img src="https://img.shields.io/badge/Website-makone.dev-f28b78?style=flat-square" alt="Website" /></a>
  <a href="https://threejs.org"><img src="https://img.shields.io/badge/Three.js-555?style=flat-square&logo=threedotjs&logoColor=white" alt="Three.js" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-b9a3f3?style=flat-square" alt="MIT License" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-7bcf9e?style=flat-square" alt="PRs welcome" /></a>
</p>

<p>
  <a href="CONTRIBUTING.md">Submit a game</a> &nbsp;·&nbsp;
  <a href="docs/ARCHITECTURE.md">Architecture</a> &nbsp;·&nbsp;
  <a href="https://x.com/0xWormhole404">X</a>
</p>

</div>

---

Makone Arcade is a static web arcade where **every game is a single JavaScript
file**. No build server, no asset pipeline, no accounts — geometry, textures, and
effects are generated in code with [Three.js](https://threejs.org). Visitors land
on a 3D island, walk up to a kiosk, and the game's code is fetched on the spot.

- **Static & CDN-friendly** — deploy the `dist/` folder anywhere. No backend.
- **One file per game** — each game is lazy-loaded as its own chunk; players only
  download what they open.
- **Procedural-first** — no `.glb`, `.png`, or audio downloads, so the site stays light.
- **Contributor-friendly** — submit a game with one file and one metadata entry.

## Quick start

```bash
npm ci
npm run dev      # http://localhost:5173
npm run check    # typecheck + production build
```

## Submit a game

A game is one ES module that default-exports `createScene(container)`:

```js
import * as THREE from 'three'

export default async function createScene(container) {
  // build the world, wire up input, run your own animation loop
  return {
    resize: (w, h) => {/* update camera + renderer */},
    dispose: () => {/* tear everything down */},
  }
}
```

1. Drop `games/your-game-id.js` into [`games/`](games/).
2. Add a matching entry to [`src/games/catalog.ts`](src/games/catalog.ts).
3. Run `npm run check` and open a pull request.

See [`games/README.md`](games/README.md) for the full module contract and allowed
imports, and [CONTRIBUTING.md](CONTRIBUTING.md) for the review checklist.

## Deploy

Deploy `dist/` to any static host — GitHub Pages, Cloudflare Pages, Vercel,
Netlify, or S3 + CDN. The app uses `HashRouter`, so no SPA rewrite rules are needed.

## License

[MIT](LICENSE). Contributions are accepted under the same license.
