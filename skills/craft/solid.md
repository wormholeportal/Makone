# solid — Manifold CSG solid modeling

`runtime/solid.js` wraps manifold-3d (WASM CSG). When to use: fillets, shells, holes,
boolean union/difference/intersection, convex hulls. When not to: if plane/box/cylinder/sphere/lathe is enough — pure three is cheaper.

## Usage

```js
import * as MK from '/runtime/solid.js';

export default async function createWorld(container) {
  await MK.init();                              // ~1s; fails gracefully to plain box, no try/catch needed

  mesh.geometry = MK.rbGeo(w, h, d, r);         // rounded box (cached by size, zero cost on repeat)
  mesh.geometry = MK.latheGeo([[r,y], ...]);    // lathe shell (bowl/pot/cup: outer base → outer wall → rim → inner wall → inner base)

  // generic boolean (returns Manifold solid, convert to three at the end via toGeometry)
  const g = MK.toGeometry(
    MK.subtract(MK.cube(2, 1, 1), MK.cylinder(2, 0.3)));  // beam with hole
  const h = MK.toGeometry(MK.hull(MK.sphere(0.5), MK.sphere(0.3).translate([2,0,0])));
}
```

Tested in anger: a street-food stall framed with `rbGeo`, its soup pot and bowls turned on
`latheGeo`.

## Scar rules (lessons from VR era, don't step on them again)

1. **Take only positions+indices from Manifold, let three compute normals** (`toGeometry` includes
   `toNonIndexed + computeVertexNormals`). Using Manifold vertex attributes directly → all-black mesh.
2. **Rounded box = convex hull of 8 corner spheres**, not edge chamfering — clean, robust, no degenerate faces. `rbGeo` has it built in.
3. **init must handle failure**: WASM load can fail/timeout (9s), all helpers degrade to plain geometry.
   World code works without checking `MK.on()`, just no fillets.
4. **CSG result is flat-shaded** (non-indexed) — feature not bug, pairs with CSG's hard-surface language.
   Want smooth surfaces, don't use CSG.
5. **Boolean ops happen once at build time**, never in `renderFrame` (cousin to E4: per-frame CSG = stall).
   Only consider three-bvh-csg for high-frequency/runtime booleans (backup, see architecture selection table).

## When to go to text-to-cad

When you need to **manufacture** (STEP export, 3D print, engineering dimensions) not **build a world**:
`npx skills install earthtojake/text-to-cad` and use in parallel (see `skills/cad-export/`, P4).
