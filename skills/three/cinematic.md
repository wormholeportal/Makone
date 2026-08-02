# Cinematic Camera (WorldModule `cinematic` cap)

## Contract

A world opts into a timeline purely by implementing, on
top of the WorldModule base (see `runtime/world.js`):

```typescript
play(): void            // enter cinematic mode, start advancing
pause(): void
seekTo(t: number): void // t is 0..1 normalized position on the timeline
getProgress(): number   // 0..1
duration: number        // seconds for one full 0→1 pass
```

`harness/capture.mjs <name> --at 0,0.5,0.9` seeks and screenshots those
timeline positions — that's how you review your shots.

## Minimal Template

```javascript
export default function createWorld(container) {
  // ... renderer / scene / camera / orbit setup per skills/three/scene-template.md ...

  // ── Camera path ──
  const cameraPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(20, 10, 20),
    new THREE.Vector3(-15, 8, 15),
    new THREE.Vector3(-20, 5, -10),
    new THREE.Vector3(10, 12, -20),
    new THREE.Vector3(20, 10, 20),   // loop back
  ], true);  // closed = true for looping

  const lookAtPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2, 0),
    new THREE.Vector3(2, 1, 3),
    new THREE.Vector3(-1, 2, -2),
    new THREE.Vector3(0, 2, 0),
  ], true);

  // ── State ──
  let mode = 'orbit';         // 'orbit' | 'cinematic'
  let cinemaT = 0;            // 0..1 normalized timeline position
  let playing = false;
  const DURATION = 30;

  // ── Per-frame (the player page calls this; no rAF of your own) ──
  function renderFrame(dt) {
    // ... update scene animations with dt ...

    if (mode === 'orbit') {
      orbit.update();
    } else {
      if (playing) cinemaT = (cinemaT + dt / DURATION) % 1;
      camera.position.copy(cameraPath.getPoint(cinemaT));
      camera.lookAt(lookAtPath.getPoint(cinemaT));
    }
    renderer.render(scene, camera);
  }

  return {
    // ... base methods per skills/three/scene-template.md ...
    renderFrame,
    duration: DURATION,
    play()  { mode = 'cinematic'; orbit.enabled = false; playing = true; },
    pause() { playing = false; },
    seekTo(t) {
      cinemaT = Math.max(0, Math.min(1, t));
      mode = 'cinematic'; orbit.enabled = false;
    },
    getProgress() { return cinemaT; },
  };
}
```

## Key Rules

1. **cinemaT is 0..1 normalized.** `seekTo(t)` must land on the exact same frame
   every time — capture depends on this determinism. Only `play()` + `dt`
   advances it; `seekTo` never auto-advances.
2. **Dual-mode camera** — always support both `orbit` (free mouse) and
   `cinematic` (path-driven). Disable `orbit.enabled` in cinematic mode; a
   user dragging the mouse must not fight the path.
3. **One loop only** — everything advances inside `renderFrame(dt)`. No
   self-owned `requestAnimationFrame` (breaks headless capture).
4. **CatmullRomCurve3 for paths** — closed curves (`true` last arg) for loops.
   Separate `cameraPath` (position) and `lookAtPath` (target).
5. **duration** is real seconds for one full pass; pacing lives here, not in
   external speed knobs.

## Camera Path Design Tips

### Multi-shot cinematic (different angles):
```javascript
const shots = [
  { from: new THREE.Vector3(30, 15, 0),  to: new THREE.Vector3(0, 2, 0) },   // wide establishing
  { from: new THREE.Vector3(5, 3, 8),    to: new THREE.Vector3(0, 2, 0) },   // close-up
  { from: new THREE.Vector3(0, 25, 0.1), to: new THREE.Vector3(0, 0, 0) },   // top-down
  { from: new THREE.Vector3(-10, 4, 15), to: new THREE.Vector3(3, 2, -2) },  // tracking
];
const cameraPath = new THREE.CatmullRomCurve3(shots.map(s => s.from), true);
const lookAtPath = new THREE.CatmullRomCurve3(shots.map(s => s.to), true);
```

### Dynamic height variation:
```javascript
const pos = cameraPath.getPoint(cinemaT);
pos.y += Math.sin(cinemaT * Math.PI * 4) * 2;  // gentle bobbing
camera.position.copy(pos);
```

## Adding Cinematic to an Existing World

1. Design camera/lookAt paths with `CatmullRomCurve3`
2. Add `mode` / `cinemaT` / `playing` state and the mode branch in `renderFrame`
3. Add `play/pause/seekTo/getProgress` + `duration` to the returned module
4. Implement the whole timeline family — half of it fails `assertContract`
5. Review shots: `node harness/capture.mjs <name> --at 0,0.25,0.5,0.75`
