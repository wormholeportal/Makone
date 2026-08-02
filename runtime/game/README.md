# runtime/game — game-feel toolkit

A small, dependency-light toolkit of "game feel" primitives: timers, screen
shake, hit flashes, instanced particles, and DOM UI over the canvas.

This started as a **port of an earlier TypeScript toolkit** (`src/runtime/game/`
in the OSS Makone repo) to plain ESM JavaScript, so it runs in the browser with
no build step. The translation was mechanical — only TypeScript syntax was
stripped, so every class kept its method names, argument order and defaults.
What has since changed is the *surface*, not the semantics: five classes no
game ever called were deleted (see the bottom of this file), and the
`core/ feel/ particles/ ui/` folders were flattened away.

`three` is imported with a bare specifier and resolved by the page's import map
(see `play.html`).

## Usage

```js
import { HUDLayer, ScreenShake, ParticleSystem } from '/runtime/game/index.js'
```

## What's in here

| Class | One-liner |
| --- | --- |
| `Stopwatch` | Counts up from 0; start / stop / reset. |
| `Cooldown` | "Is this action ready yet?" gate for dashes, jumps, weapon fire. |
| `ScreenShake` | Adds a decaying oscillating offset on top of whatever owns the camera transform. |
| `Flash` | Briefly drives a mesh's emissive toward a color for hit / status feedback. |
| `ParticleSystem` | `InstancedMesh`-backed emitter — one draw call, flat typed-array particle state. |
| `HUDLayer` | DOM overlay on the canvas with placed text, bars, custom elements, and a full-screen flash. |
| `GlassPanel` | Frosted-glass DOM panel for menus, dialogs, and drop-in banners. |

## Notes

- Everything is ticked by **your** update loop: call `.tick(dt)` each frame.
  Nothing here uses `setTimeout` for game time (it is throttled in background tabs).
- `ScreenShake.tick(dt)` must be called **after** your camera-positioning code,
  not before. It piggybacks an offset on a transform another system owns.
- Dispose what you create: `ParticleSystem.dispose()`, `HUDLayer.dispose()`,
  `GlassPanel.dispose()`.

## Layout

```
index.js             re-exports the public surface
timer.js             Stopwatch, Cooldown
screenshake.js       ScreenShake
flash.js             Flash
particlesystem.js    ParticleSystem
hudlayer.js          HUDLayer
glasspanel.js        GlassPanel
```

## What is deliberately not here

The port started with five more classes — `EventBus`, `EventQueue`, `Countdown`,
`Scheduler`, `Repeater` — and after five games not one of them had a caller.
That is not "not yet": each is 20–40 lines you can write in place, so importing
one costs more thought than writing it. What did get used every single time is
the opposite kind of thing — instanced-particle pooling, a DOM layer over the
canvas, a decaying shake, frosted-glass CSS: fiddly to get right, boring to
retype. **Adoption is the filter.** If something here stops earning its import,
delete it rather than documenting it harder.
