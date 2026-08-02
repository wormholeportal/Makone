# forms — the shapes a made object is full of

`runtime/forms.js`. Pure geometry and generated textures: no scene, no lights, no materials, so a
part can call any of it and stay a pure `build(params) -> Object3D` (D7).

```js
import { fluteGeo, sprocketGeo, tube, bentTube, shellGeo, prismoid,
         scaleTexture, dialTexture, grainTexture } from '/runtime/forms.js';
```

Promoted out of `worlds/*/forms.js` by the rule of three — a knurled ring was written for a
camera's focus ring, then a bicycle's sprockets, then an espresso machine's group head.

## What is in it, and which way its axis points

Half the cost of assembling an object is finding out that a lathe runs on +Y and a torus on +Z.

| helper | axis | for |
|---|---|---|
| `fluteGeo(rOut, rIn, h, teeth)` | +Y | knurling: focus rings, dial rims, knobs |
| `sprocketGeo(r, teeth, t, {holeFrac})` | +Z | chainrings, cogs, gear wheels |
| `tube(a, b, r0, r1, mat)` | a → b | a frame, a stand, a strut. Returns a **Mesh** |
| `bentTube(points, r, mat)` | along the path | fork blades, handlebars, cables, steam wands |
| `shellGeo(w, d, h, planR, bevel)` | +Y, on y=0 | a stadium in plan with filleted edges: camera body, radio case |
| `prismoid(w0, d0, w1, d1, h, dz)` | +Y, on y=0 | four flat slopes: a pentaprism hump, a plinth |
| `scaleTexture(labels)` | wraps u | f-stops, distance scales — for an **open** cylinder |
| `dialTexture(labels)` | disc uv | speed dials, gauges, clock faces — for a `CircleGeometry` |
| `grainTexture()` | tiles | value noise as a **bumpMap**: leather, cast iron, clay |

## Four things that cost a round each to find out

- **`CylinderGeometry` is CLOSED by default.** A bezel with a solid front cap sits in front of the
  glass and no amount of material tuning makes the element visible. Pass `openEnded = true`, and
  give the hole a wall (an inner tube with `side: THREE.BackSide`).
- **`ExtrudeGeometry`'s bevel grows the profile OUTWARD by `bevelSize`.** Draw the shape `b`
  smaller all round, or a 142mm camera body measures 149mm. `shellGeo` already does this.
- **`curveSegments` is per curve, and holes are curves.** At `curveSegments: 1` a sprocket's bore
  comes out as a triangle while its teeth look fine, because the teeth are `lineTo`.
- **A `metalness: 1` surface facing the camera renders black**: the reflection is the room times a
  dark base colour and there is nothing left. Give it a `clearcoat`, or lighten the base colour —
  `envMapIntensity` alone does not save it.

## The rule this file lives under

Local first: write the shape in `worlds/<name>/forms.js`. It moves here when a **third** world
wants it — two is a coincidence. A bicycle's own `forms.js` keeps its `spokeSet`, because a
three-cross lacing pattern is nobody else's business yet.
