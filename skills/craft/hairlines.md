# Hairlines — geometry thinner than a pixel

> **Below about 1.5 px on screen, geometry stops being the right representation of a thin
> thing. It does not get thin — it gets INTERMITTENT, and then it crawls when the camera moves.
> Decide which of three answers you are using, and write the decision down.**

## The arithmetic, first

Everything here follows from one division. Do it before you model the thing:

```
px = feature_width / (subject_size / frame_width)
```

- bicycle spoke: 1.9 mm on a 1.0 m wheel, 1280 px frame → **2.4 px**. Fine as geometry.
- clipper shroud: 45 mm on an 82 m ship, 1280 px frame → **0.7 px**. Not fine.
- clipper buntline: 14 mm on the same ship → **0.2 px**. Nowhere near fine.

Note what the ratio does NOT depend on: absolute scale. Building the ship as a 1:48 model does
not help — a 1 mm thread on a 1.7 m model is the same 0.7 px. **You cannot escape this by
rescaling.** The only levers are frame resolution, drawn width, and representation.

## The three answers

| when | do this | what it costs |
|---|---|---|
| **≥ ~1.5 px** at your review size | real diameter, real geometry, **instanced** | nothing. This is the default and most objects live here |
| **0.7–1.5 px** | keep geometry, **exaggerate the diameter 1.5–3×**, and declare it | a stated lie. Acceptable; an undeclared one is not |
| **< 0.7 px** | **screen-space lines** — `three/addons/lines/{LineSegments2,LineSegmentsGeometry,LineMaterial}` | no shading, no shadows, no thickness in the world |

### Declaring an exaggeration

A fudged number that lives in the geometry is invisible to the next person. A fudged number
that lives in `params.js` next to the real one is a decision:

```js
export const ROPE = {
  shroud:  { real: 0.052, draw: 0.098 },   // 2× — 0.7 px flickers, 1.4 px does not
  ratline: { real: 0.012, px: 0.95 },      // screen-space: no world diameter at all
};
```

Two different keys on purpose: `draw` means "geometry, this many metres"; `px` means "not
geometry at all". You can read the representation off the parameter table.

### Screen-space lines, in practice

Constant pixel width at every zoom, one draw call per width class, thousands of segments per
call, and per-vertex colour for tone. On the clipper: **1,034 lines / 6,373 segments in 4 draw
calls.**

```js
const geo = new LineSegmentsGeometry();
geo.setPositions(flatXYZ);            // 2 points per segment
geo.setColors(flatRGB);               // vertexColors: true — the only "lighting" you get
const mat = new LineMaterial({ linewidth: 1.3, vertexColors: true, worldUnits: false });
const seg = new LineSegments2(geo, mat);
seg.frustumCulled = false;            // the bounding sphere of a whole rig is useless anyway
```

## Four traps, each of which cost a session

**1. `LineMaterial.resolution` is not optional, and `window.innerWidth` is the wrong source.**
It converts pixel width into clip space, so a wrong value silently scales every line. A part is
a pure `build(params) -> Object3D` and must not read `window` (parts.md rule 1) — and reading it
once would be wrong after a resize anyway. Take it from the renderer at draw time:

```js
seg.onBeforeRender = (renderer) => { mat.resolution.copy(renderer.getDrawingBufferSize(tmp)); };
```

**2. Hairlines must not cast shadows — and you were not going to want them to.** A shadow map
of 4096 texels over a 100 m subject is 2.4 cm a texel. Sampling a 5 cm rope on that grid is
noise, and if anything downstream reads the same map (a translucent material, say) the noise
gets printed on it. On the clipper this arrived as black spikes across six sails. Turn
`castShadow` off for rope and wire, deliberately, with the reason written down.

**3. A line lying exactly ON a surface fights it for depth and comes out as ragged speckle.**
Anything sewn to a sail, painted on a panel, or wrapped round a tube needs to be lifted clear
of it — 10–15 cm at ship scale, and it is usually the truth anyway (a reef band IS on the front
of the canvas). Same rule as coincident faces; it just looks like dirt instead of z-fighting.

**4. Contrast reads before width does.** Standing rigging is tarred and nearly black; running
rigging is bare manila and pale. Draw both in one brown and a rig becomes a grey thicket at any
line width. Draw them apart and you can read the ship: dark lines hold things up, light lines
make things move. **When a hairline is not reading, try the colour before the width.**

## Thin SURFACES have the same disease

A sail, a leaf, a flag, a sheet of paper: zero thickness, and therefore at exactly its own depth
in the shadow map. `shadowSide: DoubleSide` guarantees self-shadowing acne — ragged black
patches that look like dirt on the material. Use `shadowSide: BackSide` and a real
`normalBias` (0.4 at ship scale, not the 0.05 you would use on a bench object). See
`shadow-strategy.md` for choosing the map itself.

## The thing that actually reads

Count, not width. A thousand hairlines at 1 px reads as a rig you could climb; two hundred at
3 px reads as a diagram of one. If a thing is impressive because there is a lot of it, spend
the budget on **more of them**, thinner — that is what the screen-space path buys you.
