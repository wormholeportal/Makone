# Making a world, start to finish

A full pass at one small world, with the commands and the judgement calls. The
workflow itself lives in `skills/world/SKILL.md`; this is what it looks like when you
actually run it.

Every command below takes a world name. Substitute your own for `<world>`.

---

## 0. Commit to a brief

Before any code, one sentence, concrete enough to smell:

> dusk falls; a lighthouse throws its first beam across the water

Not "a lighthouse". Not "a moody sea scene". A specific moment. Everything after this
is judged against that sentence, so a vague one gives you nothing to judge against.

```bash
npm run create -- <world> --type scene --brief "…"
```

You now have `worlds/<world>/` with a `world.json` and a `main.js` that renders a
box on a plane.

## 1. Blocking — masses only

Put the large shapes where they go. Ground plane, the hero mass, two or three
supporting masses, and the camera. Grey boxes are fine; do not touch materials yet.

```bash
npm run capture -- <world> --shots 4
```

Then **look at the four frames**. Ask only about composition:

- Is the hero at the visual centre of gravity, or stranded?
- Does the silhouette read? Squint — if the shapes merge, they will still merge later.
- Is there enough negative space, or is the frame stuffed?

If composition does not work, fix it now. No amount of lighting saves a bad layout —
this is the step people skip and then spend three hours failing to rescue.

## 2. Build — form language

Give each mass real form. Procedural geometry, CSG where a shape needs a fillet or a
hollow (`skills/craft/solid.md`), shared geometry for anything repeated.

The one rule that catches people: **share geometry**. Thirty rocks should be one
`IcosahedronGeometry` instance and thirty meshes, not thirty geometries. Audit it:

```js
const geos = new Set();
scene.traverse((o) => o.geometry && geos.add(o.geometry.uuid));
console.log('unique geometries:', geos.size);   // healthy: under ~40 hand-built
```

For rocks specifically: icosahedron plus *smooth correlated* noise. Per-vertex random
displacement gives you crumpled paper, not stone.

## 3. Light it — colour language

Pin the palette first — three to five colours as constants at the top of the file, named
for what they are:

```js
const DUSK_TOP = 0x141d38;      // zenith
const DUSK_HORIZON = 0xcf7448;  // where the sun just went
const BEAM_COLOR = 0xffe0a3;
```

Then place lights. Two things to get right:

- The key light tells the story — whatever the brief points at.
- The fill light keeps the unlit side *readable*. Dead black is not mood, it is a
  missing decision.

Bloom is off by default. On a bright scene it is always wrong — bright pixels bloom,
everything blooms, the frame goes white (`principles.md`, axiom E5).

## 4. Bring it to life

Waves, a rotating beam, a flicker in a lamp. All of it inside `renderFrame(dt)` —
never your own `requestAnimationFrame`, because the page owns the loop and that is what
makes the world steppable and screenshot-able.

```bash
npm run capture -- <world> --after 6 --shots 4
```

`--after 6` simulates six seconds first, then shoots. Every frame has to hold up once
things have moved — a composition that only works at t=0 is not finished.

## 5. Finish — the honest pass

```bash
npm run capture -- <world> --shots 4
npm run verify -- <world>
```

Now put the frames next to the brief and ask: **which frame is the weakest?** Fix that
one. Re-capture. Repeat until nothing stands out as weak. This is the whole method; it
is not glamorous and it works.

`verify` is the mechanical half — the contract is complete, nothing threw, the world is
inside its budget, and `animated: true` means something visibly moved rather than you
believing it did:

```json
{ "world": "<world>", "timeline": false, "interactive": false,
  "animated": true, "motion": 0.0421,
  "triangles": 12750, "drawCalls": 25, "pass": true, "problems": [] }
```

Then commit, and — if you want a copy someone can open with no server —

```bash
npm run export -- <world>      # worlds/<world>/<world>.html
```

---

## What goes wrong the first time

Worth reading, because the same three things go wrong for everyone:

1. **A light cone pointed the wrong way.** The cone was widest at the lamp instead
   of at the far end, and the fade ran backwards. Invisible in the code, obvious the
   moment the frames were laid side by side. Look at the pictures.
2. **The unlit side was pure black.** It read as "unfinished" rather than "night".
   A cool fill light at a fraction of the key fixed it.
3. **The first budget was a guess.** 12,750 triangles against a declared 120,000 is not
   a pass so much as a number nobody checked. Set the budget from a measurement, with
   headroom — a budget you cannot fail teaches you nothing.
