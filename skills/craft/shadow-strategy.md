# Shadow strategy — real shadow maps vs cheap drop shadow vs none

## The principle

> **Shadows do two jobs: ground objects in space (the cheap job), and sell
> 3D solidity (the expensive job). Pick the cheapest tool that does the
> job your scene actually needs.**

A scene's shadow needs are determined by **camera angle** and **mesh count**.
Mismatching the tool to the need wastes cycles (real shadows on a top-down
2D-feel scene) or under-delivers (no shadows on an isometric scene that
reads flat).

## Decision matrix

| Camera | Mesh count | Right tool | Why |
|---|---|---|---|
| Pure top-down (orthographic, looking straight down) | any | **drop-shadow per entity** OR **none** | Shadow shape would be hidden under the object's own footprint. Real shadows invisible. Just attach a circle plane under each entity if you need to track altitude. |
| Side-scroller (orthographic, side view) | any | **drop-shadow per entity** | Player needs altitude feedback when jumping. Real shadows cast onto unseen back walls = wasted. Cheap circle on ground = perfect. |
| 3/4 isometric (slight tilt, ~30–55°) | < 200 dynamic | **real shadow map (1024)** | This is where real shadows have the BIGGEST impact. The tilt makes long ground shadows visible — they sell "this is 3D, not flat shapes painted on a board". Transformative upgrade. |
| 3/4 isometric (slight tilt) | > 500 dynamic | **drop-shadow per entity + ambient occlusion fake** | Real shadows on hundreds of meshes is too costly. Drop-shadows + slight darker color on faces facing down. |
| Perspective 3rd-person / first-person | < 100 dynamic | **real shadow map (1024–2048)** | Player expects realistic shadows. Anything else looks wrong. |
| Perspective with view distance > 100m | any | **real shadow map (cascaded if available) + receiveShadow on near terrain only** | Cull shadow casters by distance. |
| Stylized / cel-shaded | any camera | **real shadow map with reduced contrast + flat ambient** OR **none, use vertex-baked AO** | Hard real-shadow edges fight cel-shading. Tone them down or skip. |

## When to use REAL shadows (the expensive choice)

```js
// Setup
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const sun = new THREE.DirectionalLight(0xffeec8, 1.35)
sun.position.set(MAP_W / 2 + 14, 32, MAP_H / 2 + 18)
sun.castShadow = true
sun.shadow.mapSize.set(1024, 1024)
// CRITICAL: ortho frustum sized to your playable area, not the whole world
const sc = sun.shadow.camera
sc.left = -MAP_W / 2 - 4; sc.right = MAP_W / 2 + 4
sc.top = MAP_H / 2 + 4;   sc.bottom = -MAP_H / 2 - 4
sc.near = 1; sc.far = 80
sun.shadow.bias = -0.0006
sun.shadow.normalBias = 0.04
sun.target.position.set(MAP_W / 2, 0, MAP_H / 2)
scene.add(sun, sun.target)

// Per mesh
mesh.castShadow = true
mesh.receiveShadow = true   // ground also needs this
```

**Triggers** (use real shadows when ANY of these is true):
- Camera shows ground surface AND vertical surfaces simultaneously (iso, 3/4)
- Scene has chunky 3D props (towers, bricks, buildings) that need to feel solid
- Dynamic mesh count < 200 (cost is bearable)
- Players have asked "this looks flat" — real shadows fix that perception

**Don't trigger if**:
- Pure top-down — invisible
- Side-scroller — invisible
- 1000+ dynamic meshes — cost dominates
- Cel-shaded look — hard shadows fight the style

### The shadow camera frustum trap

The most common shadow bug: **shadow camera frustum doesn't cover the
playable area**. Symptoms: shadows appear in only one corner of the map,
or pop in/out as objects move.

Fix: size the shadow ortho frustum to your actual play extent, with a
small margin. Don't use the default (which is small).

```js
sc.left = -MAP_W / 2 - 4   // match playable area
sc.right = MAP_W / 2 + 4
sc.top = MAP_H / 2 + 4
sc.bottom = -MAP_H / 2 - 4
```

For free-roam scenes, update the shadow camera position each frame to
follow the player (keeping size constant).

## When to use DROP SHADOW (the cheap choice)

```js
// Shared geometry — ONE circle, instanced per entity
const SHADOW_GEO = new THREE.CircleGeometry(0.5, 12)
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false,
})

function makeDropShadow(scale = 1) {
  const m = new THREE.Mesh(SHADOW_GEO, shadowMat)
  m.rotation.x = -Math.PI / 2
  m.position.y = GROUND_Y + 0.02   // tiny lift to avoid z-fighting
  m.scale.set(scale, scale, scale)
  return m
}

// Each frame, update to track entity
shadow.position.x = entity.x
shadow.position.z = entity.z
// Optional: shrink + fade with altitude for jump feedback
const alt = entity.y - GROUND_Y
const k = Math.max(0.4, 1 - alt * 0.2)
shadow.scale.set(k, k, 1)
shadow.material.opacity = Math.max(0.05, 0.35 - alt * 0.06)
```

**Cost**: essentially free — one ellipse plane per entity, shared geometry,
no shadow map render pass.

**Triggers**:
- Side-scroller / top-down (real shadows invisible)
- Many entities (drop-shadow scales linearly; real shadows cost is fixed)
- Player needs jump-altitude feedback (Klonoa, NSMB do this even in 3D worlds)
- Performance-constrained device

### The drop-shadow as altitude meter

In side-scroll 2.5D, the drop shadow does a job that real shadows can't:
it tells the player *how high they are above the ground.* When the hero
jumps, the shadow STAYS on the ground; the gap between hero feet and
shadow center reads as altitude. This is the visual cue that lets a
player time landings precisely.

## When to use NO SHADOW

- Pure cel-shaded games where the look is "graphic" not "realistic" (Wind Waker,
  Cuphead, Captain Toad)
- UI-heavy or puzzle-board games where the visual unit is "tile not object"
- Performance-constrained mobile / web with hundreds of moving entities

Often these scenes substitute with:
- Stronger color separation between objects and ground (darker ground)
- Subtle vertex-baked AO (paint darker vertex colors where things touch)
- Strong silhouettes from outlining instead

## Hybrid strategies

### Drop-shadow + real-shadow combo

Real shadows for big static structures (buildings, terrain features). Drop
shadows for fast-moving small entities (bullets, particles, small enemies).
Drop shadows skip the shadow-pass cost; real shadows on static stuff is
basically free because nothing moves in them.

### Real-shadow-but-only-on-ground

Set every mesh `castShadow = true` but only `ground.receiveShadow = true`.
This skips computing shadows on tilted/vertical surfaces (which read poorly
anyway) and just gives you ground shadows. Faster.

### Distance-fade real shadows

For free-roam scenes, fade meshes' `castShadow = false` past a distance
threshold from the camera. Far things don't need to cast shadows you
won't notice anyway.

## Real-game decisions

| Game | Camera | Shadow choice | Why |
|---|---|---|---|
| Adventure Island (Tiki Trail) | Side-scroll 2.5D | Drop-shadow under hero | Real shadows would be cast on unseen far walls. Hero altitude during jumps matters. |
| Battle City | Tilt-top + iso + close (cycle) | Real shadow map 1024 | < 50 dynamic meshes, isometric mode benefits enormously. Real shadows transformed the look from "flat board" to "tabletop diorama". |
| Garden Defense | 3/4 perspective | None currently (could add real shadow map) | High entity count (plants × zombies × bullets × suns) could push past the comfortable shadow budget if added carelessly. |
| Drift | Chase cam | None currently | Camera at low altitude; ground shadows from cars would barely be seen. Cars themselves are tiny on screen. |
| Hex Survivor | Top-down + slight tilt | None — circular hex tiles read flat-by-design | Adding shadows would clutter the readability of the hex grid which IS the gameplay surface. |

## Anti-patterns

### A1. "Real shadows are always better"

Real shadows on a pure top-down scene cost a render pass and produce
invisible output. Skip them; use drop-shadows or none.

### A2. "Drop shadows look fake"

Looking "fake" requires comparing to "real". In a top-down or side-view
where real shadows are off-camera anyway, the brain doesn't compare —
it just registers "the thing is on the ground", which is what the drop
shadow says.

### A3. "Enable shadows on everything"

`castShadow = true` on 500 small particles will tank framerate. Tag
strategically: large static structures yes, small dynamic things no
(unless they're the player).

### A4. "Default shadow camera frustum is fine"

It almost never is. The default is small and centered on origin. If your
game world isn't ±5m around (0,0,0), you'll get shadows in one corner only.
Always size the shadow frustum to your playable area.

## Cross-references

- `skills/craft/lighting-budget.md` — total lights cost. Shadow-casting
  lights cost 2-3× a non-shadow light.
- `skills/craft/render-recipes.md` — picks camera per
  genre; cross-reference the camera column with the table here to choose.
- `skills/three/shared-resources.md` — the drop-shadow
  pattern is the textbook example of shared geometry (one circle, N entities).
- `docs/principles.md` rule "Should I add real-time shadows?" — has the
  one-line decision summary.
