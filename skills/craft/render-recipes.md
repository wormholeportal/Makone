# Render recipe per game type — match the pipeline to the view

> **Every Three.js rendering primitive has a context it was built for.
> Applying a 3D-perspective tool to a 2D-orthographic scene doesn't give
> you "extra polish" — it gives you a broken render.**
>
> A perspective FPS benefits from HDR + bloom + ACES tone-map + procedural
> sky. The same stack applied to a 2D side-scrolling platformer **washes
> out the screen**, makes pixels mushy, and destroys the saturated
> color clarity the genre depends on.
>
> Decide the rendering recipe by **game-view type**, not by "what makes
> things look fancier".

## The view-type taxonomy

These are the categories that share a rendering recipe:

| View type | Examples | Camera | Distinguishing trait |
|---|---|---|---|
| **3D perspective explorer** | First-person, third-person 3D, open-world | Perspective, ~50–70° FOV | Depth matters; player rotates view freely |
| **3D perspective action** | Combat arenas, racing, third-person shooters | Perspective, often follow-cam | Fast motion through 3D space |
| **2.5D side-scroller** | Platformers, side-scroll fighters, runners | **Orthographic** or low-FOV perspective at distance | Fixed view axis (usually +Z); side-on |
| **2D top-down** | Roguelikes, arcade tops, RTS-lite | **Orthographic** looking straight down | Looking down −Y; tile-aligned |
| **Isometric** | Tactical, builder, classic RPG | Orthographic at fixed angle (~30°) | Reads as 2.5D but is true 3D |
| **Pixel art / retro** | Pixel platformers, NES-style | Orthographic + low resolution + nearest filtering | Visible pixels are a feature |

## Rendering recipes by type

### 1. 3D perspective (explorer / action)

This is what the Tier-3 lib was DEFAULT-built for.

```js
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
renderer.shadowMap.enabled = true        // depending on perf budget

new ProceduralSky(scene, 'noon')         // dome works because perspective FOV
                                         // doesn't see sphere edges
new StudioLighting(scene, 'studio-3point') // 3-point rig pops 3D subjects
scene.fog = new THREE.FogExp2(...)       // perspective depth-buffer → fog works

new PostFX(renderer, scene, camera, 'cinematic')  // bloom + AA + vignette
```

Why this works: **perspective projection has depth-variance** (objects at different `z` produce different `gl_FragCoord.z`), so fog, atmospheric scattering, and depth-of-field all have something to bite on. Bloom benefits emissive highlights against a darker mid-tone scene.

### 2. 2D orthographic (side-scroller / top-down)

```js
renderer.toneMapping = THREE.NoToneMapping  // ⚠️ critical — ACES will crush saturation
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = false          // single-plane scene; shadows look odd in ortho

scene.background = new THREE.Color(0x6bb6ff)  // solid color OR
                                              // a HUGE plane far behind, parented to camera

// NO scene.fog — orthographic = uniform depth = fog is a flat overlay

// Use MeshLambertMaterial (cheaper, no PBR cost) and avoid emissive
// unless you've specifically opted into bloom

// Lighting: 1 directional + 1 hemisphere is enough; 3-point rig is overkill
const hemi = new THREE.HemisphereLight(0xffffff, 0xa8c8ff, 0.9)
const sun  = new THREE.DirectionalLight(0xfff5d0, 1.1)
sun.position.set(5, 10, 8)

// NO PostFX bloom in default 2D scenes. Saturated palettes push pixels to
// near-1.0 already; bloom blows them to pure white.
// Render directly: renderer.render(scene, camera)
```

**Background layering for parallax**:
```js
// Each layer at a different Z. Camera moves in X — parallax is automatic
// for objects at different Z when the camera's projection is orthographic
// (no it isn't — orthographic has no parallax!). For ortho, you must
// MANUALLY parent the layer to the camera with offset multipliers:
backgroundLayer.position.x = camera.position.x * 0.2  // 20% scroll = far
midLayer.position.x        = camera.position.x * 0.6  // 60% scroll = mid
foregroundLayer.position.x = camera.position.x * 1.0  // full = locked to world
```

### 3. Pixel art / retro

Render at low resolution, scale up with nearest-neighbor filtering:

```js
const PIXEL_SIZE = 4   // each game pixel = 4 screen pixels
renderer.setPixelRatio(1)
renderer.setSize(targetW / PIXEL_SIZE, targetH / PIXEL_SIZE, false)
renderer.domElement.style.imageRendering = 'pixelated'
renderer.domElement.style.width = targetW + 'px'
renderer.domElement.style.height = targetH + 'px'

renderer.toneMapping = THREE.NoToneMapping
texture.magFilter = THREE.NearestFilter
texture.minFilter = THREE.NearestFilter
```

PostFX bloom in pixel art destroys the pixel grid. Don't.

### 4. Isometric

Treat as 3D perspective for materials/lighting, but watch out:
- Fog: skip (objects at the same Y are at different camera distances → fog accents axes weirdly).
- Bloom: gentle is fine.
- Shadows: short, soft (helps read elevation).

## The pitfalls catalog

These are the specific things that go wrong when you mismatch recipe to view type.

### ⚠️ ACES tone mapping + saturated palette → mushy colors

ACES is designed for HDR scenes (sun + interior lighting at the same time).
Applied to a flat-shaded 2D scene with already-saturated colors, it
**compresses the highlights and rolls off mid-tones** — your bright cyans
become teals, your bright reds become salmon.

**Diagnostic**: turn off tone mapping (`NoToneMapping`). If everything
suddenly looks more saturated and the bright sky is no longer pure white,
you needed `NoToneMapping`.

### ⚠️ Bloom on a saturated 2D scene → screen washes white

Bloom samples pixels above a threshold (default ~0.7) and spreads them.
A saturated 2D scene already has pixels at or near 1.0 across the screen
(the sky, the bright character colors, the UI text). All of them bloom.
Bloom amount × pixel count = entire frame goes white-soft.

**Diagnostic**: take a screenshot, identify whether more than ~20% of
the frame is above the bloom threshold. If yes, bloom doesn't belong.

### ⚠️ Fog in an orthographic scene → flat foggy overlay

`THREE.Fog` and `THREE.FogExp2` use `gl_FragCoord.z` (camera-relative
depth) to compute fog density. Orthographic projection produces uniform
depth across the view — so fog applies almost uniformly across the
whole image, dimming everything by the same constant amount. It looks
like a translucent grey filter, not atmospheric perspective.

**Fix**: skip fog in orthographic scenes. For depth cueing, use color
desaturation per layer (e.g., distant hills are lighter / bluer) — done in
materials, not in fog.

### ⚠️ Sphere sky-dome that doesn't follow camera

A `ProceduralSky` is implemented as a back-side sphere centered on the
origin. The camera looks "out" through the sphere from inside. If the
camera moves far from origin (e.g., side-scrolling level 50 units wide,
camera at x=40), the camera approaches the sphere edge → distortion,
parallax, possibly clipping outside.

**Fixes**:
- Solid `scene.background` color (works for any view type)
- Add `sky.mesh.position.copy(camera.position)` in your update loop
- Use a HUGE radius (200+) so camera movement stays well within

### ⚠️ Forward dynamic lights cost N×M (lights × lit objects)

Each `PointLight` / `SpotLight` / `DirectionalLight` makes every lit
mesh's shader compute one extra light contribution per pixel. 30 dynamic
lights × 100 lit meshes = 3000 light evaluations per pixel × frame.
Mid-range GPUs choke past ~10–15 dynamic lights.

**Fix**: emissive material + bloom is FREE per-pixel cost (the emissive
contribution is computed regardless). For "everything glows" effects,
prefer emissive + PostFX bloom over individual lights. See `lighting-budget.md`.

### ⚠️ Mirroring a 2D-style character with `rotation.y`

In a side-on view (camera looking +Z, character at z=0), rotating around
Y by π should mirror left-facing → right-facing. It does mathematically,
but if the character mesh is roughly symmetric front-to-back (e.g., a
capsule body with head/cap on top), the rotated version looks identical
to the un-rotated. Players see no facing change.

**Fix**: use `mesh.scale.x = facing  // -1 or 1` instead. This is a
true geometric mirror that flips visible features (any asymmetric detail
flips, any directional decorations flip).

### ⚠️ Shadows in flat 2D scenes look "wrong"

Shadows cast in 2.5D side-scroll: the directional light's angle determines
where the shadow falls. If light comes from above-front, every block casts
a shadow on the block below — looking like ugly dark stripes in the
playfield. Better: disable shadows entirely; use the dark-bottom-fill trick
(top of block is bright, bottom is darker) via two materials, or
shading-by-vertex-colors.

## Three.js orientation conventions (don't get them backward)

Three.js uses **right-handed coordinates**. The default camera looks along
**−Z**. This convention silently breaks many "endless runner" / "follow
camera" setups:

| If you say... | The convention is... |
|---|---|
| "World ahead of player" | −Z (further away from default camera) |
| "World behind player" | +Z (toward default camera) |
| "Camera follows behind player" | Camera at +Z relative to target |
| "Player runs forward" | Player's velocity is −Z (decreasing z) |
| "Things scroll past camera" (endless runner) | World objects move from −Z (far) toward +Z (past camera) |

### The classic "blank page" sin

A common bug pattern for endless runners and third-person follow cameras:

```js
// WRONG — spawns chunks BEHIND the camera
for (let i = 0; i < POOL; i++) spawnChunkAt(+i * length) // chunks at +Z
// Then scroll AWAY from camera (further behind)
chunk.position.z -= speed * dt
```

Symptom: **blank page**. The world is entirely behind the camera; the
camera looks at −Z and sees nothing.

```js
// RIGHT — spawn chunks AHEAD of the camera, scroll toward camera
for (let i = 0; i < POOL; i++) spawnChunkAt(-i * length) // chunks at −Z
chunk.position.z += speed * dt
// Recycle when chunk passes camera
if (chunk.position.z > +someBuffer) recycle()
```

### The "mesh nose vs physics fwd" mismatch

A related and very visible bug: your physics code uses a **fwd vector**
(usually `(-sin(rot.y), 0, -cos(rot.y))` so that `rot.y=0` faces -Z by
convention), but your character/car/ship mesh was built with its "nose"
at local +Z. The two are **180° apart**.

**Symptom**: vehicles look like they're driving rear-first. Players in
chase camera often don't notice (you see the back of the vehicle either
way), but **other vehicles in the world look wrong from the side**.

**Standard fix — wrap-inner pattern**:
```js
function buildVehicle() {
  const wrap = new THREE.Group()  // physics writes wrap.rotation.y = facing
  const inner = new THREE.Group() // all geometry goes here
  // ... build parts (nose at local +Z, brake lights at local -Z, etc.) ...
  inner.rotation.y = Math.PI      // pre-rotate to match physics fwd convention
  wrap.add(inner)
  // proxy userData (wheels, body refs) onto wrap if needed
  return wrap
}
```

Now `wrap.rotation.y = physicsFacing` rotates the visible "nose" to match
the physics forward direction. The internal geometry can be built with
the natural "nose-points-forward-along-+Z" convention.

Alternative: build the mesh nose at -Z to begin with. Same outcome.

**Diagnostic**: spawn a stationary test vehicle facing all four cardinal
directions, then walk around it. Does the nose visually point the direction
the physics says it's facing? If not, you have a 180° (or 90°) mismatch.

### When you set up a chase camera, sanity-check direction

After wiring up a follow-cam, before any other work:

1. Place a single visible cube at world position (0, 0, **−5**) (definitely
   ahead of camera).
2. Place another at (0, 0, **+5**) (definitely behind camera).
3. If you see cube A and not cube B → you're set up correctly.
4. If you see cube B and not cube A → your "ahead" direction is flipped.
   Either flip your spawn signs OR rotate the camera 180° around Y.

This 30-second check saves a "the game runs but it's blank" debugging
session every single time.

## Bloom hygiene checklist (run BEFORE shipping any scene with PostFX bloom)

Bloom is the single feature most likely to look "the LLM made this". This
LLM has shipped 3 separate scenes with over-bloomed first versions despite
having written this exact warning. The cause is always the same: **bright
sky / emissive everywhere + low threshold = entire frame washes**.

Run this checklist mechanically. Don't skip. Don't trust your eye until
all six pass.

### ☐ 1. Sky horizon is NOT near-white

If `horizonColor` has luminance > 0.8, it WILL be over the bloom threshold
on most presets, and the entire horizon will become a halo. Use saturated
colors (pink, blue, orange) — not pastels that wash to white.

```js
// ❌ horizon halos because near-white
horizonColor: 0xffd9e8   // luminance ~0.9
// ✅ horizon stays in scene
horizonColor: 0xff97c1   // luminance ~0.7, saturated
```

### ☐ 2. `sunSize: 0` for any scene with bloom

A `ProceduralSky` sun disc is intentionally white-hot to fake HDR. Plus
bloom = a glaring circle in the middle of every frame. For bright cartoon
scenes, set `sunSize: 0` (sun light direction still works for shading).

### ☐ 3. Count materials with `emissive*Intensity > 0.5`

Walk through every material in your scene. If MORE THAN 3 of them have
`emissiveIntensity > 0.5`, you have screen-wide bloom. Pick the ONE thing
you want to glow (coin, magic crystal, player core) — strip emissive from
everything else.

### ☐ 4. Bloom threshold is AT LEAST 0.7 in a bright palette

A bright pastel scene has many pixels at 0.7+ luminance just from base
colors. A threshold of 0.4 (PostFX `cinematic` default) means ALL of them
bloom. For bright palettes use:

```js
bloom: { strength: 0.35, threshold: 0.85, radius: 0.55 }
```

The `cinematic` / `dreamy` presets are tuned for DARKER scenes with
emissive highlights. They're NOT safe defaults for bright cartoon games.

### ☐ 5. No tint that warms the whole image

`tint: { strength: 0.05 }` adds a warm cast across everything. In a bright
scene this pushes more pixels past bloom threshold AND mutes the palette.
Set `tint: false` in bright scenes.

### ☐ 6. Take a screenshot and check: is more than 15% of the frame "glowing"?

This is the final gate. Open the scene, screenshot, look at it. If you
can't draw a small circle around what's bloomed (because it's everywhere),
your bloom isn't selective. Tighten the threshold or remove bloom.

### When in doubt: just don't use bloom

A bright cartoon scene with NO bloom + crisp Lambert materials looks
**better** than the same scene with bloom on everything. Bloom is the
opposite of cartoon aesthetics — it's a photorealistic HDR feature.

The safe default for bright 3D cartoon games:
```js
const fx = new PostFX(renderer, scene, camera, {
  bloom: false,
  vignette: { offset: 0.95, darkness: 0.6 },
  fxaa: true,
  gamma: true,
})
```

If you decide to add bloom, do it AFTER everything else looks right, and
only with threshold 0.85+ + strength 0.3-0.4 + one emissive material.

## Quick recipe selector

When starting a new scene, choose by view type and check the matching
recipe block above. The 30-second version:

```
Is camera Perspective and player rotates view?  → 3D recipe
Is camera Orthographic looking +Z (side)?        → 2D side recipe
Is camera Orthographic looking -Y (top-down)?    → 2D top recipe
Is camera Orthographic at ~30° angle?            → Isometric recipe
Is the target visible-pixel style?               → Pixel-art recipe
```

If you find yourself reaching for `ProceduralSky` + `PostFX('cinematic')`
+ ACES tone mapping in a 2D scene, **stop**. That's the 3D recipe.

## The default-rejection principle

Just because the lib has a primitive doesn't mean every scene should use
it. The presence of `PostFX` doesn't mean every game needs PostFX. The
presence of `ProceduralSky` doesn't mean every scene needs a sky dome.

**Default-reject everything; opt-in only what your view type needs.**

This is the opposite of how programmer art evolves (where adding more
effects feels like more polish). For games, **subtraction can be polish** —
removing a poorly-fitted effect is often the biggest single visual lift.
