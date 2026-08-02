---
name: three
description: Three.js API reference and engine engineering - lookup, not design. Use when you know what you want and need the how, or when you hit a recurring engine failure mode (blank canvas, allocation churn, update-order bugs).
---

# three/ — Three.js reference + engine engineering

Lookup, not design. Come here when you know *what* you want and need the *how*.
Design decisions live in `skills/craft/` and `skills/world/`.

## API reference

| page | what it answers |
|---|---|
| `fundamentals.md` | Scene setup, cameras, renderer, Object3D hierarchy, transforms |
| `geometry.md` | Built-in shapes, BufferGeometry, custom meshes, instancing |
| `materials.md` | PBR / basic / phong / shader materials and their properties |
| `textures.md` | Texture types, UV mapping, cubemaps, HDR, texture settings |
| `lighting.md` | Light types, shadows, IBL, lighting cost |
| `shaders.md` | GLSL, ShaderMaterial, uniforms, extending built-in materials |
| `postprocessing.md` | EffectComposer, bloom, DOF, colour grading, screen-space effects |
| `animation.md` | Keyframe / skeletal animation, morph targets, mixing, procedural motion |
| `interaction.md` | Raycasting, controls, mouse/touch input, object selection |
| `loaders.md` | GLTF, textures, HDR, async loading patterns |

## Contract templates

- `scene-template.md` — the WorldModule skeleton every world starts from
- `cinematic.md` — the `cinematic` cap: camera paths, `seekTo`, timeline capture
- `reference-library.md` — the external reference library (`references/`):
  discovery, routing, integrating ez-tree / spiri0-ocean / three-nebula / lygia

## Engine engineering (recurring failure modes)

- `blank-canvas.md` — blank page? start here (docs/principles.md E3)
- `shared-resources.md` — the allocation rule (E4)
- `update-order.md` — what must happen before what, and data coherence (E6)
- `timestep.md` — when a fixed step is required
- `object-pooling.md` · `spatial-partitioning.md` — when the frame budget bites
- `mouse-picking.md` — raycasting and picking in practice

Physics has no doc yet: `runtime/` has no physics wrapper, and writing a guide
for an API that doesn't exist is how the last one rotted. Wire Rapier in a real
world first, then write the page.
