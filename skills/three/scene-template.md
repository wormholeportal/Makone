# Three.js World Template (WorldModule contract)

## Required Code Structure

Every world lives in `worlds/<name>/` with a `world.json`
(`{ "name", "type", "entry": "main.js", "brief", "budget" }`) and a `main.js`
following this structure. Contract source of truth: `runtime/world.js`.

```javascript
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// Optional: import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
// Optional: import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
// Optional: import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

export default function createWorld(container) {
  const W = container.clientWidth, H = container.clientHeight;

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // ── Scene ──
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 20, 80);

  // ── Camera ──
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
  camera.position.set(10, 8, 15);

  // ── Controls ──
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.05;
  orbit.target.set(0, 2, 0);

  // ── Lighting ──
  // Always add ambient + directional at minimum
  const ambient = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
  sun.position.set(10, 15, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  // ── Objects ──
  // Create your scene objects here...

  // ── Per-frame update ──
  // IMPORTANT: no requestAnimationFrame here. The player page (gallery/play.html)
  // owns the loop and calls renderFrame(dt) — that's what makes headless capture
  // and bot play deterministic. renderFrame IS your loop body.
  let t = 0;
  function renderFrame(dt) {
    t += dt;
    // Update animations here (use dt for frame-rate independence)...
    orbit.update();
    renderer.render(scene, camera);
  }

  // ── Return WorldModule ──
  return {

    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getCanvas: () => renderer.domElement,
    getOrbitControls: () => orbit,
    renderFrame,

    resize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    },

    dispose() {
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    },

    // cinematic cap only: play() pause() seekTo(t) getProgress() + duration
    // game cap only:      getState() act(input) observe()
  };
}
```

## Available Addons (import from "three/addons/...")

| Addon | Path |
|-------|------|
| OrbitControls | controls/OrbitControls.js |
| TransformControls | controls/TransformControls.js |
| EffectComposer | postprocessing/EffectComposer.js |
| RenderPass | postprocessing/RenderPass.js |
| UnrealBloomPass | postprocessing/UnrealBloomPass.js |
| RectAreaLightUniformsLib | lights/RectAreaLightUniformsLib.js |

## Physics

Physics is **opt-in** and only for objects whose motion is essential (quality
first — decorations stay static meshes). v2 plans a thin Rapier wrapper at
`runtime/physics.js`; until it exists, don't invent one — most motion (waves,
sway, orbits, walk cycles) is cheaper and more controllable as direct animation
in `renderFrame(dt)`. If a world truly needs rigid-body physics, step it from
`renderFrame(dt)` (never a second loop) and free the WASM world in `dispose()`.

## Key Rules

1. **Always** `export default function createWorld(container)` — this is how the player loads your world
2. **Always** return the WorldModule with every base method (see `runtime/world.js`; `harness/verify.mjs` checks it)
3. **Always** enable shadow maps when using shadows
4. **Always** handle resize properly
5. **Always** animate with the `dt` passed to `renderFrame(dt)` — never wall-clock or fixed increments
6. **Always** implement dispose to clean up resources
7. Use `THREE.SRGBColorSpace` on color textures: `texture.colorSpace = THREE.SRGBColorSpace`
8. Use ES module imports: `import { X } from "three/addons/..."`

## CRITICAL: Animation Loop Must Not Allocate

**The single most common cause of pages freezing is allocating inside the animation loop.** Every frame runs ~60 times per second — any allocation there creates massive GC pressure and will lock up the browser tab within seconds to minutes.

### NEVER do these inside `animate()` / `loop()` / `tick()`:

- ❌ `new THREE.PlaneGeometry(...)`, `new THREE.BoxGeometry(...)`, or ANY `new *Geometry(...)`
- ❌ `new THREE.MeshStandardMaterial(...)` or any `new *Material(...)`
- ❌ `new THREE.Texture(...)`, `new THREE.DataTexture(...)`
- ❌ `geometry.dispose()` / `material.dispose()` — if you're disposing every frame you're also creating every frame
- ❌ `new THREE.Vector3(...)`, `new THREE.Quaternion(...)`, `new THREE.Matrix4(...)`, `new THREE.Color(...)` in hot paths — reuse scratch instances declared outside the loop
- ❌ `scene.add(mesh)` / `scene.remove(mesh)` in a tight loop without a pooling strategy
- ❌ `new Array(N)` / `new Float32Array(N)` for large N — allocate once, reuse

### Correct patterns

**Mutating existing geometry (e.g. flag wave, water ripple):**
```javascript
// ✅ Cache the rest-pose vertices ONCE, outside animate()
const flagGeo = new THREE.PlaneGeometry(1.2, 0.7, 10, 5);
const flag = new THREE.Mesh(flagGeo, flagMat);
const restPositions = flagGeo.attributes.position.array.slice(); // copy once
const posAttr = flagGeo.attributes.position;

function animate() {
  for (let i = 0; i < posAttr.count; i++) {
    const x = restPositions[i * 3];
    const y = restPositions[i * 3 + 1];
    const wave = Math.sin(x * 5 + t * 4) * 0.05 * (x + 0.6);
    posAttr.setZ(i, wave);
  }
  posAttr.needsUpdate = true;
  flagGeo.computeVertexNormals();
}
```

**Reusable scratch vectors:**
```javascript
// ✅ Declare once, mutate in the loop
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

function animate() {
  _v.set(x, y, z); // reuse, don't new
  obj.position.copy(_v);
}
```

**Many similar objects — use InstancedMesh, not loops of Mesh:**
```javascript
// ❌ 200 draw calls, 200 meshes
for (let i = 0; i < 200; i++) scene.add(new THREE.Mesh(geo, mat));

// ✅ 1 draw call
const inst = new THREE.InstancedMesh(geo, mat, 200);
const m = new THREE.Matrix4();
for (let i = 0; i < 200; i++) {
  m.setPosition(x, y, z);
  inst.setMatrixAt(i, m);
}
scene.add(inst);
```

### Other perf rules

- **Shadow maps**: 1024×1024 is usually enough; only use 2048 for a hero shadow. Tighten `shadow.camera` frustum to the scene bounds.
- **`MeshPhysicalMaterial` with `transmission`** is expensive — don't use it for many objects (>3-4). For "glass marbles" etc., `MeshStandardMaterial` with low roughness + envMap looks great and is cheap.
- **Setting `material.opacity`** has no effect unless `material.transparent = true` was set at creation.
- **`TubeGeometry(curve, tubularSegments, radius, radialSegments)`** — keep `tubularSegments × radialSegments` modest; 200×6 is smooth enough for most rails.

## Cinematic Camera Paths

For cinematic mode, implement `seekTo(t)` where t is 0-1 progress:

```javascript
const cameraPath = [
  { pos: [10, 8, 15], target: [0, 2, 0], t: 0 },
  { pos: [5, 3, 10],  target: [0, 1, 0], t: 0.3 },
  { pos: [-8, 5, 8],  target: [0, 2, 0], t: 0.6 },
  { pos: [0, 10, 0],  target: [0, 0, 0], t: 1.0 },
];

function seekTo(t) {
  // Interpolate between keyframes based on t (0-1)
  // Update camera.position and orbit.target
}
```
