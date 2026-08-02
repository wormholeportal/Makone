# parts — the contract, and how to cut an object into them

## The contract

```js
// worlds/<name>/parts/<part>.js
import { HORN, PALETTE } from '../params.js';

export const params = HORN;                       // this part's slice of the single source of truth
export const datum = 'mounted';                   // optional; omit when the part stands on y=0
export const inventory = [                        // identity details, each one mapped to real geometry
  `flare is a power curve (t^${params.flare}), not a cone`,
];
export default function build(p = params) { return object3d; }
```

Three hard rules:

1. **Pure function.** No `new Scene`, no event listeners, no reading `window`. If a part needs the
   scene to exist, the harness cannot instantiate it alone and the whole loop collapses.
2. **Datum.** `y = 0` is the contact face, `+Z` is the front, units are metres. A part that hangs
   off another declares `datum = 'mounted'` — that is a statement, not a way to silence the warning.
3. **Name the pivots.** Anything that moves gets `.name`, so the assembly can drive it
   (`getObjectByName('platter')`). This is what lets one part serve a still object and a playable
   world without being rewritten.

## params.js is the single source of truth

Every dimension lives there, in metres, named. Parts import their slice; `main.js` imports the
assembly offsets. Nothing is retyped.

**Inventory strings interpolate from params.** A hand-typed "slopes 14°" survived a change to 7.5°
on the gramophone and lied on the sheet until the review caught it. Write:

```js
`arm slopes ${params.armDrop}° down toward the record`
```

An inventory line that can drift from the geometry it describes is worse than no line at all.

## How to cut

Split by **how it is made and how it moves**, not by what your eye groups:

| cut on | example |
|---|---|
| fabrication method | lathe-of-revolution (horn, grip) vs rounded box (cabinet) vs swept tube (elbow) |
| motion | anything with its own pivot is its own part (platter, arm, crank) |
| material | brass, wood and nickel rarely belong in one part |

Do **not** cut on visual grouping ("the top half"). Those cuts leave you editing two files to
change one form.

Rules of thumb: 3–7 parts for one object. A part under ~30 lines usually belongs to its neighbour.
A part over ~150 lines usually wants splitting again.

## Joints

Two pieces that are each correct still read as glued primitives if they meet badly.

- **Match the tangent.** A swept tube entering a lathe must exit along the lathe's axis. On the
  gramophone the elbow left vertically while the bell leaned 18°, and the `top` view showed a
  visible cusp. Fix: give the curve a final control point along the bell's axis.
- **Run one past the other.** End the tube ~30 mm *inside* the flare so the seam sits where nothing
  looks at it. Butt joints are visible; buried joints are not.
- **Share the radius.** The tube radius and the lathe's first profile radius must be the same
  number, from params — not two numbers that happen to be close.

## Geometry notes that cost time to relearn

- `MK.rbGeo(w, h, d, r)` clamps `r` to `min(w,h,d)/2`. Asking for a 14 mm fillet on an 18 mm slab
  silently gives you 9 mm.
- `LatheGeometry` on an open profile needs `side: THREE.DoubleSide`, or the inside of a horn is a
  hole.
- CSG output is flat-shaded by design (`runtime/solid.js` scar rule 4). Want smooth, don't use CSG.
- Generated `CanvasTexture` is pure code and fine (record grooves); downloaded textures are not (D4).
- **Materials need the multi-angle check too, not just geometry.** A flat disc facing up with
  roughness below ~0.5 mirrors the whole studio: the gramophone's record came out black from one
  azimuth and blown-out white from two others. Keep flat upward faces at roughness ≥ 0.5, and check
  any polished surface from more than one angle before believing it.
- Share one geometry across repeated pieces (feet, slats). The facts table reports the reuse ratio.
