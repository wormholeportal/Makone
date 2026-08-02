# Using references/

Makone ships with **33 external reference libraries** covering water, sky, clouds, fire, particles, terrain, vegetation, buildings, characters, shaders, post-processing, camera, animation, indoor props, procedural textures. Read this skill BEFORE writing code for any scene that touches those domains.

## When to use references/

Any of these cues in a user request → open `references/`:

- "ocean", "water surface", "waves" → spiri0-ocean / water-addons
- "sky", "sunset", "sky" → sky / takram-atmosphere
- "clouds", "cumulus", "volumetric clouds" → volumetric-clouds-leo
- "rain", "snow", "particles" → three-nebula / simple-snow
- "fire", "flame" → fire-shader
- "lightning" → lightning
- "tree", "forest" → ez-tree
- "grass", "meadow" → gpu-grass
- "terrain", "hills" → procedural-terrain / three-terrain
- "rocks", "boulders" → procedural-rock
- "city", "skyline" → procedural-city / three-bvh-csg
- "characters" (placeholder) → mannequin-js
- "flock", "swarm" → boids-flock
- "slime", "metaball" → marching-cubes
- "cat", "dog", "bird", "fish", "snake", "butterfly", or any named animal species → creatures (20 procedural species: Cat/Dog/Horse/Rabbit/Fox/Deer, Sparrow/Crow/Hawk/Hummingbird/Swan, Goldfish/Koi/Shark/Clownfish, Snake/Eel, Butterfly/Bee/Dragonfly/Beetle)
- "furniture", "desk", "chair", "table", "mug", "bookshelf" → 3d-assets (16 parametric classes — see SKILL.md for the full class list + prompt mapping)
- "indoor scene", "room", "interior", "diorama" → compose `3d-assets` classes on top of a room shell (BoxGeometry walls + three-bvh-csg for door/window holes)
- "wood texture", "marble", "rust", "fabric", "brick" → tsl-textures (WebGPU only — see SKILL.md for fallback if on WebGL)
- "custom shader", "GLSL" → lygia
- "cinematic", "filmic", "bloom", "DoF" → postprocessing
- "reflection", "SSR", "wet floor" → realism-effects is **currently broken** (three.js 0.183 incompatibility). Use `scene.environment` + metal/roughness material + postprocessing BloomEffect; see `references/realism-effects/SKILL.md` fallback
- "smooth camera", "flythrough" → camera-controls
- "animation timeline", "keyframes" → theatre-core
- "thick lines", "laser", "trail" → three-fatline

## Discovery

```bash
# List everything available
cat $MAKONE_REFERENCES/MANIFEST.json

# Glob for all skill + example files
# (via tool): glob references/*/SKILL.md
# (via tool): glob references/*/example.js
```

Each library has TWO files:

- **`references/<name>/example.js`** — canonical, runnable code. The exact
  `import` lines + factory functions, ready to copy into `scene.js`. **Read
  this first** — it's the source of truth for the API. Most factories take a
  small params object and return a `THREE.Object3D` or `THREE.Group`.

- **`references/<name>/SKILL.md`** — human-readable explanation: prompt-to-
  parameter mapping, gotchas, when NOT to use, license notes. Read this
  second to understand the WHY and pick the right parameters.

**Rule of thumb**: `example.js` is the HOW, `SKILL.md` is the WHY.
If something errors like "X is not defined", open the example.js first — the
first line is always the correct import.

## Install types — what's where

| type | Where the code lives | Import pattern |
|------|---------------------|----------------|
| `npm` | `node_modules/<pkg>/` — declared in package.json | `import X from '<pkg>'` |
| `clone` | `references/<name>/source/` — cloned by fetch script | Read-only reference; copy patterns into scene.js |
| `builtin` | `three/addons/...` — ships with three.js | `import { X } from 'three/addons/...'` |
| `inline` | Full code inside SKILL.md itself | Copy-paste the snippet into scene.js |

## Usage flow

1. **Identify category** from user prompt (see cue table above).
2. **Read `references/<name>/example.js`** — this is the source of truth.
   Copy the imports verbatim; use the exported factory function(s). Most are
   plug-and-play: `scene.add(createSky({ elevation: 5 }))`.
3. If you need to tune parameters or hit a gotcha, **then** read
   `references/<name>/SKILL.md` for prompt→param mapping + caveats.
4. For `clone` type, example.js is usually a guidance stub — follow its
   pointers into `references/<name>/source/` if you need deeper integration.
5. **Write scene.js**, run `scene_diagnostics` to catch missing imports,
   then `node harness/capture.mjs <world>` to verify.
6. If `scene_diagnostics` says "X is not defined", re-open the example.js —
   the correct import is on the first lines.

## Composition patterns

Real scenes layer multiple references. Example — "sunset ocean with seabirds":

```js
// 1. sky (builtin) — sets the mood
import { Sky } from 'three/addons/objects/Sky.js'
// ... configure with elevation=5, turbidity=10, rayleigh=3

// 2. spiri0-ocean (clone) — the hero surface
//    read references/spiri0-ocean/source/... for the compute shader
//    then pull in the IFFT ocean class

// 3. boids-flock (inline) — seabirds
//    paste the Boids snippet from references/boids-flock/SKILL.md

// 4. postprocessing (npm) — finishing cinematic pass
import { EffectComposer, BloomEffect } from 'postprocessing'
```

## Hard rules

1. **Prefer references/ over winging it from training data** — three-nebula / ez-tree / postprocessing APIs have changed; always verify via SKILL.md.
2. **If a library is missing** (`npm` not installed, or `clone` source/ empty), tell the user `npm install && npm run references:fetch`. **Fall back gracefully** with vanilla three.js — don't block the scene.
3. **Respect license fields** in MANIFEST.json. Lygia is dual-licensed (BSD-3 + Prosperity) — commercial use by large companies may require a paid license. Surface this in your response if the user says "commercial".
4. **Don't mutate references/** — it's read-only. `write_file references/...` will refuse.
5. **When reading `clone` source**, use `glob references/<name>/source/**/*.{js,ts,glsl,wgsl}` to explore before deep-reading.

## Makone-specific conventions

- Follow user memory: physics is opt-in (only where motion is essential), rocks use Icosahedron + correlated noise (never per-vertex random scale), quality comes first over raw feature-count.
- Every generated scene must still export `createScene(container)` returning a full `SceneControls` object (see `skills/three/scene-template.md`).
- Capture the result and review before declaring done.

## Keeping this skill current

When a library is added to `MANIFEST.json`, its SKILL.md appears automatically in `glob references/*/SKILL.md` — no update needed here. When a library is removed, its SKILL.md goes with its directory. The routing table above should be kept in sync by whoever edits the manifest.
