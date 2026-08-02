# Three.js Visual Performance Contract

Good Three.js game visuals come from art direction plus budgets, not from
turning on every effect.

Official docs to respect:
- `InstancedMesh` reduces draw calls for many objects with shared geometry and
  material: [three.js InstancedMesh docs](https://threejs.org/docs/api/en/objects/InstancedMesh).
- Three.js resources are not freed automatically; dispose geometries,
  materials, textures, render targets, skeletons, controls, and passes when no
  longer needed: [How to dispose objects](https://threejs.org/manual/en/how-to-dispose-of-objects.html).
- Linear workflow and correct texture color spaces matter; color textures need
  `SRGBColorSpace`, and post-processing needs correct output conversion:
  [Color management](https://threejs.org/manual/en/color-management.html).

## Pick One Render Recipe

| Game view | Default recipe |
|---|---|
| Top-down / isometric action | Orthographic or high FOV perspective, no bloom unless dark, drop shadows, high color grammar. |
| Third-person 3D | Perspective, 3-point/studio lighting, limited real shadows, camera lead/lag. |
| Shmup / runner / arcade | Saturated emissive accents, no heavy depth effects, strict danger contrast. |
| Puzzle / board | Stable camera, clean AO/drop shadows, readable material categories. |
| Horror / mood | Fog and darkness allowed only when danger remains readable. |

If the recipe conflicts with genre readability, genre wins.

## Default Budgets

For first playable:

| Budget | Target |
|---|---|
| Draw calls | < 120, excellent < 80 |
| Unique geometries | < 40 for hand-built scenes |
| Unique materials | < 60 |
| Dynamic shadow-casting meshes | < 100, preferably < 40 |
| Dynamic lights | 1 key + optional fill/rim; avoid many shadow lights |
| PostFX passes | 0-2; bloom only for dark scenes with isolated bright accents |
| DPR | clamp to 1.5 unless screenshot mode |
| Texture size | 512-1024 for generated assets unless hero object |

Exceed a budget only if the design doc names the player-facing reason.

## Visual Hierarchy Order

1. Player
2. Immediate danger
3. Goal/progress
4. Interactable affordances
5. Rewards
6. Background/world dressing

Particles, bloom, fog, and camera shake must never outrank danger.

## Performance Rules

- Reuse geometries/materials. If a factory is called in a loop, suspect it.
- Use `InstancedMesh` for repeated props, pickups, bullets, trees, crowd
  enemies, and debris.
- Pool objects created more than 5 times per second.
- Use fake/drop shadows for top-down and dense scenes.
- Call `renderFrame()` once before the loop.
- On `dispose()`, traverse scene-owned resources and dispose only what is not
  shared globally.
- Inspect `renderer.info` after MVP and after polish.

## "Looks Expensive, Runs Cheap" Stack

- Silhouette-first models.
- Saturated color grammar.
- Contact/drop shadows.
- Rim light or outline accents.
- Instanced particle bursts.
- One memorable hero prop or enemy silhouette.
- Camera framing that shows next action, not just the player center.

This beats high-poly noise for both performance and game readability.
