## Summary

What changed?

## Type

- [ ] New game
- [ ] Game update
- [ ] Site/runtime change
- [ ] Documentation

## Game Checklist

- [ ] The game is a single file under `games/`.
- [ ] `src/games/catalog.ts` has matching metadata.
- [ ] The game disposes animation frames, listeners, DOM nodes, and WebGL resources.
- [ ] HUD elements do not overlap the site back button or built-in overlays.
- [ ] Performance is acceptable on low-power machines.

## Verification

- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Manual browser check
