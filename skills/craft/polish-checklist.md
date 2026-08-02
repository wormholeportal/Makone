# Visual Polish Checklist — the last-mile pass

> If a world looks "generated" rather than "made", it is usually missing at least four of these.
> They are cheap individually; together they are the difference between a tech demo and a work.
>
> This is a **checklist**, not a tutorial — the WHY is in the other pages in `skills/craft/`.
> Everything below is written against what `runtime/` actually contains. (It used to reference a
> `game/lib` toolbox — `PostFX`, `ProceduralSky`, `StudioLighting`, `treeKit`, `dressing` — that
> no longer exists in this repo. Following it therefore threw, and people fell back to hand-rolling
> a single ambient light. If you find a page here calling something that is not in `runtime/`, that
> page is stale: fix it rather than working around it.)

## The 8 musts

### 1. Tone mapping and exposure set on purpose

```js
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;     // and then TUNE it against a capture
```

No bloom by default (docs/principles.md E5): bloom multiplies bright pixels, so a bright scene with
bloom goes white. If the world is genuinely dark with isolated bright accents, add it deliberately
with `EffectComposer` + `UnrealBloomPass` from `three/addons`, and drive it from `renderFrame`.

### 2. A real sky, not `scene.background = <colour>`

A flat colour reads as "demo" and turns the horizon into a hard line. A two-colour gradient dome is
about fifteen lines and costs one draw call:

```js
const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x2c3f6b) }, low: { value: new THREE.Color(0xd59a6a) } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 low;
    void main(){ gl_FragColor = vec4(mix(low, top, smoothstep(-0.02, 0.38, normalize(vP).y)), 1.0); }`,
}));
```

Add stars, a sun sprite or a cloud layer on top of it as the world needs. If the world is an
interior, the "sky" is whatever is beyond the windows — build that instead, and give it depth.

### 3. Key + fill + rim, never key + ambient

One `DirectionalLight` plus one `AmbientLight` is flat. Three directions plus a hemisphere gives
volume and separates the subject from the background:

```js
const key = new THREE.DirectionalLight(0xfff2dd, 2.2); key.castShadow = true;
const rim = new THREE.DirectionalLight(0x5f7fd8, 0.8);          // separates from the background
scene.add(key, rim, new THREE.HemisphereLight(0x9fb4e0, 0x2e2a20, 0.85));   // sky/ground fill
```

For a single object, `runtime/studio.js` already is this rig — `createStudio(container, root)`.

### 4. Surfaces, not solid colours

`new MeshStandardMaterial({ color: 0x654321 })` for wood is a brown blob. Draw the texture — this
repo generates every map at build time (D4: pure code, nothing downloaded):

```js
import { grainTexture, scaleTexture, dialTexture } from '/runtime/forms.js';
mat.bumpMap = grainTexture({ repeat: [10, 4], cell: 6 });     // leather, cast iron, clay, sand
```

A canvas is a legitimate texture source: plank grain, parquet, a film strip, a stained-glass
window, a score display, engraved brass scales. All of those are in `worlds/` already; go read one.

### 5. Real geometry, not primitives + scale

A "tree" that is one cylinder and one icosahedron reads as programmer art. Options that work:
recursive growth for branching things, `LatheGeometry` for anything turned, `ExtrudeGeometry` with
holes for anything cut from sheet, and `runtime/solid.js` (Manifold CSG) for fillets and booleans.
`runtime/forms.js` has the shapes three has no primitive for — knurls, sprockets, bent tubes,
filleted shells.

**Rocks**: `IcosahedronGeometry` + *smooth correlated* noise (a sum of sines of the position), never
per-vertex random — random gives crumpled paper, not stone.

### 6. Dress the ground, then instance it

An empty plane reads as WIP. Scatter grass, pebbles, leaves, litter, debris — but merge or instance
it or the draw-call budget dies:

```js
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
scene.add(new THREE.Mesh(mergeGeometries(parts), mat));        // static scatter → 1 call
const chairs = new THREE.InstancedMesh(geo, mat, 140);         // repeated prop → 1 call
```

A reading-room scene put 22,000 books on its shelves in one draw call this way.

### 7. Atmospheric perspective, matched to the horizon

```js
scene.fog = new THREE.Fog(0x5a5a6a, 34, 96);        // linear, for a scene with a horizon
scene.fog = new THREE.FogExp2(0x0a1526, 0.008);     // exponential, for water/night/interiors
```

The fog colour must match the horizon colour or the far plane looks painted on. Keep `FogExp2`
below ~0.02 unless you *want* the mid-ground gone — above that you are left with near props
floating in a void, which is the most common way a "moody" world becomes an empty one.

### 8. Ambient motion

Static worlds look like screenshots. Slow drifting particles — dust in a light shaft, marine snow,
blowing sand, embers, leaves — sell "alive" for almost nothing. A `Points` cloud with a small
vertex shader is the pattern used throughout `worlds/`; games can use
`runtime/game/particlesystem.js`. Seed the motes **inside** the beams: motes where there is no
light are just noise.

## Then read the numbers

```bash
node harness/capture.mjs <name> --shots 4 --sheet
node harness/verify.mjs <name>
```

`verify` reports `luma` — `median`, `dark`, `bright`. Read them against the `key` you declared in
`world.json`:

- `natural` with `dark` above ~0.4 → you are hiding, not lighting. Raise the fill, cut the fog.
- `low` with `bright` near zero → mud. It needs a lit focal subject, not more ambient.
- `median` under 0.06 on anything → nobody can see your work.

## Anti-patterns

- ❌ `MeshBasicMaterial` on a non-emissive object — it ignores every light you placed
- ❌ one directional + one ambient — flat
- ❌ flat `scene.background` colour with no sky
- ❌ trees / characters / rocks from a single primitive
- ❌ empty ground plane
- ❌ turning the key light **down** to fix a blown highlight — fix the material or the exposure
- ❌ every accent fully saturated — pick a palette, keep one scream hue

## Budget

The whole polish stack is cheap; what is not cheap is shadows and draw calls. See
`skills/craft/performance.md` and the `budget` field in `world.json` — `verify` enforces it.
