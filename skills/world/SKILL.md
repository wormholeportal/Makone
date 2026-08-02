---
name: world
description: The master workflow for making any world (scene / cinematic / living / game) - brief-first, six steps, each closed by looking at real frames. Use for every "make me a ..." request.
---

# world — master workflow

A world is a **work**, not a dump of assets. A work is held together by **one specific feeling worth being obsessive about**.
This skill locks in the forks in the road; no checklist. Only two hard goals: visual quality and (if it's a game) playability.
Everything else is your judgment call.

## Six steps

### 0. Commit to a brief (non-skippable)

One sentence, concrete enough to smell: "the wet light of a fishing harbour at 4am" not "a fishing harbour".
Write it into `world.json` as `brief`. After this, every self-review asks one question: **does this frame get closer to that?**
If it's a game: first do Step 0 (the fantasy test) in `skills/game/fantasy-test.md`.

### 1. Blocking (form layout)

```bash
node harness/create.mjs <name> --brief "..."
```

Only mass out forms: ground/water surface, hero, two or three supporting masses, camera position. Grey-box is fine; don't tweak materials.
`capture --shots 4` to check composition: is the hero at the visual centre? Does the silhouette hold? Enough negative space?
**If composition doesn't work, don't go to the next step** — every bit of polish after this can't save bad composition.

### 2. Construction (form language)

Give each mass real form. Procedural geometry + CSG (`skills/craft/solid.md`) + shared geometry (docs/principles.md E4).
Rocks: Icosahedron + smooth correlated noise, never per-vertex random (crumpled-paper shapes).
Pure code, no external assets.

### 3. Light up (light and colour)

**First, commit to a key — out loud, in `world.json`.** This is a fork, not a preference:

```json
"key": "natural"     // or "low" or "high"
```

The key is a claim about the frame's **value range**, not about the time of day. An aurora over
sea ice is a night scene and still measures `natural`, because the sky is enormous and bright; a
shuttered cathedral at noon can be `low`. What matters is where the pixels sit.

| key | the frame | what you owe it |
|---|---|---|
| `natural` | fills the middle of the range | not crushed, not blown — typically daylight or a lit room |
| `low` | lives in the bottom, deliberately | **a real highlight.** A dark frame with nothing bright in it is mud, not mood |
| `high` | lives in the top | shape has to survive without shadows to carve it — snow, fog, a studio |

`natural` is the default and you should have a reason to leave it. Not because bright is better —
the deep sea is `low` and has to be — but because **"dark" is the cheapest fake atmosphere there is.**
Turn the lights down and bad form, flat materials and thin detail all disappear; the frame reads
as moody when it is actually just empty. If you find yourself reaching for night, ask whether the
subject needs it or whether you are hiding.

`verify` measures the frame and reports `luma` (median / dark / bright), and it fails you when the
picture contradicts the key you declared — a `natural` world that is 60% black, or a `low` world
with no highlight anywhere. Declared intent, measured result, same contract as `budget`.

Then pin down the colour language (3-5 key colours as consts at the file top) and place the lights.
Attend both directions: key light tells the story, fill light keeps the backlit side readable
(dead black = lazy, dark ≠ mood). Palette families: `skills/craft/palette-families.md`.
No bloom by default (E5); never add it to bright scenes.

### 4. Bring it to life (time)

Let the world breathe: wind, waves, light sweeps, people moving (`skills/craft/actors.md`).
All animation via `renderFrame(dt)`, no independent rAF.
`capture --after 3 --shots 4`: does each shot still hold after motion?

### 5. Finish (honesty check)

```bash
node harness/capture.mjs <name> --shots 4
node harness/capture.mjs <name> --shots 4 --ref <last-run>.png   # optional: before/after, one frame
node harness/verify.mjs <name>
node harness/catalog.mjs                  # only if world.json changed
node harness/export.mjs <name>            # worlds/<name>/<name>.html — one file, opens by double-click
                                          #   a PASSING verify already did this; run it by hand
                                          #   only when you skipped with --no-export
```

Frame by frame against the brief: which frame is weakest? **Fix the weakest frame, re-capture, until no obvious weak frames.**
verify must pass (contract/console/budget).

**Export before you call it done.** A passing `verify` now writes the bundle itself, because
"the workflow says to" was not enough: ten objects were built, reviewed and committed without one
and nothing complained. `node harness/export.mjs --check` is the gate that would have.

It is what a human can actually open and send to someone without the repo, and it is a second
honesty check: the export runs under `file://` with three,
the runtime and manifold's wasm inlined, so anything that only worked because a dev server
happened to be there fails here. Read the reported size and whether CSG was inlined; a world
that suddenly exports much smaller has lost something.

Then git commit.

## Rules for the forks in the road

- At each step end: capture and **actually look at the images**. Skip a step = rework.
- Spot yourself stacking features while the brief doesn't get stronger → stop, go back to step 0 and re-read the brief.
- Single main.js up to 1500 lines; extract shared code only via rule-of-three (docs/principles.md).
- For games: add the six steps and fun-compiler level from `skills/game/workflow.md`.
