# Architecture

Makone Arcade is a Vite React app that hosts standalone game modules.

## Runtime Flow

```text
HomePage
  -> createIsland(...)
  -> games from src/games/registry.ts
  -> metadata from src/games/catalog.ts

PlayPage
  -> findGame(route id)
  -> GameCanvas
  -> lazy import /games/<id>.js
  -> createScene(container)
```

## Game Loading

`src/games/registry.ts` uses `import.meta.glob('/games/*.js')` so each game is
built as its own lazy chunk. The registry joins three things:

- metadata from `src/games/catalog.ts`
- optional generated cover URLs from `games/covers/*.jpg`
- lazy module loaders from `games/*.js`

Contributors should edit `src/games/catalog.ts`, not the loader logic.

## Game Contract

Games are responsible for their own:

- renderer and scene
- requestAnimationFrame loop
- input listeners
- DOM HUD
- audio
- physics worlds
- resource disposal

`GameCanvas` provides the host container, calls `resize()`, and calls
`dispose()` when the route changes or unmounts. It also clears leftover DOM as a
fallback.

## UI Layers

- Site HUD: home island UI and play-page back button.
- Game HUD: DOM or canvas UI created inside each game container.
- Modal panels: `GlassPanel` from `makone/game`.

Game HUD should leave the left edge clear enough for the site back button and
avoid placing important controls under modal overlays.

## Performance Policy

The shell and games should detect low-power devices and scale down:

- device pixel ratio
- real-time shadows
- shadow map size
- post-processing strength
- terrain or decoration density

This keeps the arcade usable on ordinary laptops, not only gaming machines.

## Static Deployment

The app uses React Router `HashRouter`, so static hosts do not need rewrite
rules. Deploy the `dist/` directory produced by `npm run build`.
