# Lighting budget — when to use lights vs emissive vs baked

> Each dynamic light in a forward-rendered Three.js scene **multiplies
> the per-pixel cost of every lit material**. The cost is linear in the
> number of lights AND linear in the number of lit pixels. The math is
> brutal and doesn't show up until late-game when "everything is lit
> by everything else".
>
> 95% of the time when a scene "needs more lights for the glow effect",
> what it actually needs is **emissive materials + bloom** — which cost
> the same regardless of count.

## The cost model

For a forward-rendered scene with `L` dynamic lights:

```
per-pixel cost = base_shader_cost + L × per_light_evaluation
total cost     = total_lit_pixels × per-pixel cost
```

The per-light evaluation includes:
- Distance attenuation calculation
- Normal/half-vector math
- Shadow map sample (if shadow-casting)

Empirical rule of thumb for mid-range hardware:
| Light count | Behavior |
|---|---|
| 1–5 dynamic | smooth |
| 6–10 dynamic | smooth but starting to cost |
| 11–20 dynamic | noticeable per-pixel cost; budget the scene carefully |
| 20+ dynamic | frame rate falls quickly; almost always wrong tool |

Adding 30 PointLights to a scene with 100 lit meshes = **3000 light
evaluations per pixel × full-screen pixels** = guaranteed framerate drop.

## When you actually need a real light

A light source is the right tool when:

1. **The light must affect surfaces it doesn't visually touch** (a torch
   illuminating walls around it; a player flashlight on the floor).
2. **The light must cast a shadow** (most cases — but consider whether
   the shadow actually communicates information; many shadows are noise).
3. **Materials around the light have non-uniform normals** that need to
   read as "lit by a directional source" — a sphere needs lighting
   gradient, not just a glowing texture.

Most "magic glow" / "neon" / "explosion bloom" effects **do not** need
a real light — they need an emissive material + bloom.

## The emissive + bloom trick

A `MeshStandardMaterial` with `emissive: 0xff44aa, emissiveIntensity: 3`
**glows** independently of any light source. The emissive contribution
is computed regardless of how many lights are in the scene. The
"halo" / "bleed" effect that makes it look like a real light source
is produced by a **bloom post-process** sampling bright pixels and
spreading them.

```js
// 30 magic crystals each "glowing"
// WRONG (kills framerate):
for (let i = 0; i < 30; i++) {
  const crystal = ...
  const light = new THREE.PointLight(0xff44aa, 2, 5)
  light.position.copy(crystal.position)
  scene.add(light)
}

// RIGHT (zero extra cost):
const glowMat = new THREE.MeshStandardMaterial({
  color: 0xff44aa,
  emissive: 0xff44aa,
  emissiveIntensity: 3,
})
for (let i = 0; i < 30; i++) {
  const crystal = new THREE.Mesh(crystalGeo, glowMat)
  scene.add(crystal)
}
// + add bloom in PostFX so the bright pixels visibly halo
```

Cost difference: 30 light evaluations per pixel vs. 0.

### What emissive can't do

- Won't illuminate other surfaces. The wall next to your glowing crystal
  stays dark. If you need that, you need a light.
- Won't cast shadows.
- Won't affect normal mapping the way a directional light would.

So the decision tree:

```
Do I need surfaces away from this glow to appear lit by it?
  ├─ Yes → Real light required
  └─ No  → Emissive + bloom
```

## Hemisphere + 1 directional = enough for most scenes

For most 3D game scenes, the entire lighting setup is:

```js
const hemi = new THREE.HemisphereLight(skyColor, groundColor, 0.6)
const sun  = new THREE.DirectionalLight(0xfff5d0, 1.2)
sun.position.set(5, 10, 6)
scene.add(hemi, sun)
```

That's 2 lights. Adds 2 evaluations per pixel. Looks great.

Adding a 3rd light is justified for cinematic 3-point rigs (key+fill+rim).
Beyond that, each addition needs a real reason.

## Baked lighting (for static scenes)

For levels that don't change, **bake lighting into vertex colors or
lightmaps** at build time. Cost at runtime: zero. Result: looks like
the most expensive scene you've ever seen.

The cheap version of baked lighting:
```js
// In a level editor or load step, sample lighting at each vertex
// of static geometry and store as a vertex color attribute.
const colors = []
for (let i = 0; i < geo.attributes.position.count; i++) {
  const c = computeLightingAtVertex(geo, i, lightSources)
  colors.push(c.r, c.g, c.b)
}
geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
mat.vertexColors = true
```

After this, you can `scene.remove(...allLights)` and the scene still
looks lit. This is overkill for most projects but transformative for
big scenes that need many "lights".

## A practical budget recipe

For a scene with up to ~200 lit meshes:

| Use case | Recommended |
|---|---|
| Player avatar pulsing | emissive + 1 PointLight (only if scene is dark) |
| 50 magic orbs | emissive only — no individual lights |
| Sun / moon | 1 DirectionalLight |
| Sky ambient | 1 HemisphereLight |
| Campfire | 1 PointLight + flickering emissive logs |
| Lanterns (1-3 visible at once) | 1 PointLight each |
| Lanterns (10+ visible) | emissive only; 0 PointLights |
| Boss attack flash | flash-frame emissive intensity bump (no light) |

Total: typically **2-4 lights** for a polished-feeling 3D scene.

## Diagnostic: late-game framerate drop

If a game runs at 60fps in early states and drops to 20fps in late states,
walk through what's gotten more numerous over the run:

- Particles? (Should be InstancedMesh — cheap regardless)
- Enemies? (Each is one mesh — cheap if material shared)
- **Lights?** (Multiplicative cost — almost always the answer)

If a system spawns a light per enemy or per pickup, and the run-end state
has 30+ of those entities, that's your culprit. Convert to emissive +
bloom, the late-game framerate should restore to the early-game rate.

## The "lights are free" myth

Three.js makes it easy to add lights — `new THREE.PointLight(...)` and
`scene.add()` is trivial. There's no warning when you've crossed the
budget. The cost only shows up in the frame timing, and only when N is
large enough.

**Treat each `new THREE.PointLight`, `new THREE.SpotLight` as a budget
withdrawal**. Default-reject; opt-in only when the light is doing something
emissive can't.

## Forward vs deferred

Three.js's default renderer is forward — every light × every lit mesh.
Deferred rendering (gbuffer pass + lighting pass) breaks the N×M cost
into N + M, but Three.js doesn't ship a deferred path.

This is a fundamental engine constraint, not a tuning issue. **Inside
forward rendering, lights are expensive. Plan accordingly.**
