# Contributing

Thanks for helping improve Makone Arcade. The project is designed so a new game
submission is small and reviewable.

## Development Setup

```bash
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm run check
```

## Submit A Game

1. Create `games/your-game-id.js`.
2. Add metadata to `src/games/catalog.ts`.
3. Keep the `id` equal to the filename without `.js`.
4. Test the game route at `/#/play/your-game-id`.
5. Open a pull request.

Example catalog entry:

```ts
{
  id: 'your-game-id',
  title: 'Your Game',
  tagline: 'A short hook for the detail sheet.',
  controls: 'WASD to move',
  tags: ['Arcade', 'Single player'],
  cat: 'ARCADE',
  accent: '#f28b78',
  pos: [0, 12],
}
```

## Game Module Contract

Each game default-exports a `createScene(container)` function:

```js
import * as THREE from 'three'

export default async function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  let raf = 0
  function loop() {
    raf = requestAnimationFrame(loop)
    renderer.render(scene, camera)
  }
  loop()

  return {
    resize(width, height) {
      renderer.setSize(width, height)
    },
    dispose() {
      cancelAnimationFrame(raf)
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
```

The host owns the container. The game owns its own renderer, animation loop,
input listeners, UI nodes, audio, physics worlds, and cleanup.

## Review Checklist

- The game starts without console errors.
- It cleans up all animation frames, event listeners, DOM nodes, and WebGL
  resources in `dispose()`.
- It remains playable on a low-power laptop.
- It avoids overlapping the site back button and game menus.
- It does not load remote scripts or require a backend server.
- It uses only the allowed imports listed in `games/README.md`.

## Covers

If visuals changed, run:

```bash
npm run gen-covers
```

This regenerates kiosk screenshots in `games/covers/`.

## License

By contributing, you agree that your contribution is licensed under the MIT
License used by this repository.
