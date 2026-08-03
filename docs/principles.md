# Principles

> **Re-read this at the start of every session.** Every rule below traces to at
> least one bug that actually shipped in this codebase, or one world that passed
> every check and still was not worth looking at. These are not "general best
> practices" — they are scar tissue.

## Meta-philosophy

1. **Axioms, not patches.** When a problem shows up twice, find the rule that
   would have prevented both occurrences. Write that rule. Don't write "in
   the X case, do Y" — write "X kind of system always needs Y".
2. **Rule of three for abstraction.** Don't extract code into `runtime/`
   until **three** worlds need it. Two = coincidence. Three = pattern.
   Premature extraction creates a primitive that's wrong because you didn't
   have enough use cases to know the right shape.
3. **Single-file worlds until they hurt.** A world is a directory, but keep
   everything in `main.js` until it hurts: 1500 lines is comfortable, 2500 is
   the warning, 3000 is the cliff. Don't pre-split into modules — split when
   this world actually justifies it (3+ distinct modes, or past the cliff).
4. **Verify before you ship.** Every change observable in browser → run
   `node harness/capture.mjs <world>` and LOOK at the frames; run
   `node harness/verify.mjs <world>` for console errors + contract + budget.
   The fast feedback loop is the only reason this whole project works.

---

## Engineering axioms (recurring bugs distilled)

### E1. Verify primitive API signatures before invoking

When you import a shared class (from `runtime/` or any library), **grep one
other world** that uses it. Constructor arg shapes are not obvious from the import.

```bash
grep -rn "new ScreenShake\b" worlds/ | head
```

Real bugs caused by skipping this check:
- `new ScreenShake({ camera })` — should be `new ScreenShake(camera)`. Silent
  until first `.tick()`, then blank canvas (E3).
- `new Cooldown({ time: 0.45 })` — should be `new Cooldown(0.45)`. Silent
  until `.use()` is called (`.use` is undefined, throws). Bullets never fire.
- `new Resource({ start: 70, ... })` — config field is `current`, not `start`.
  Silently ignored, defaulting to `max`.

The 5-second `grep` would have saved 20-minute debug each time.

### E2. Render at least once before the animation loop starts

```js
fx.render(0)   // first paint — even if loop crashes, user sees something
loop()         // then start animation
```

If `fx.render(0)` itself throws, you see the error immediately instead of
shipping a "works in dev, blank in prod" bug.

### E3. First-frame loop errors disappear behind transparent canvas

A WebGL canvas with no draw calls is **transparent**, not "default-color".
The page background shows through. The HUD (DOM) survives. The user sees
a serene white void with controls floating over it.

When the user reports "blank page" → first thing to check is the console
error stack. The crash will be in the loop body, usually in something
called on the first `tick`.

Full recipe: `skills/three/blank-canvas.md`.

### E4. Share geometry; never `new Geometry()` inside a loop

```js
// ❌ 36 trees → 36 LatheGeometry buffers
function buildPalm() { new LatheGeometry(...) }

// ✅ 36 trees → 1 LatheGeometry buffer
const PALM_GEO = new LatheGeometry(...)
function buildPalm() { new Mesh(PALM_GEO, mat) }
```

If you wrote `new THREE.X(...)` inside a function called in a loop, that
allocation is suspect. Default to lifting it out. Audit at runtime:

```js
const geoSet = new Set()
scene.traverse(o => { if (o.geometry) geoSet.add(o.geometry.uuid) })
console.log('unique geos:', geoSet.size)   // healthy: < 40 for a hand-built scene
```

Full recipe: `skills/three/shared-resources.md`.

### E5. Bloom + bright sky + ACES tone mapping = washed-white screen

For bright daytime scenes (tropical, candy, cartoon):

```js
renderer.toneMapping = THREE.NoToneMapping     // not ACES
// NO bloom (UnrealBloomPass)
scene.background = new THREE.Color(brightColor) // not ProceduralSky w/ near-white horizon
materials.forEach(m => m.emissive = new THREE.Color(0x000000))  // no emissive on Lambert
```

Bloom multiplies bright pixels. Bright scene + bloom = all pixels bloom = white.

Full recipe: `skills/craft/render-recipes.md`.

### E6. Single source of truth for cell/grid state

When the same conceptual thing has two representations (visual mesh AND
collision data; level string AND tile object), the bug is always: one of
them gets updated and the other doesn't.

The fix: collision check the LIVE state, not the source string.

Real bug: a side-scroller's breakable blocks. The level string had `?`.
Collision code read the string. The bump animation hid the mesh. The player
walked through the bumped block, because the string still said `?` but the
mesh was gone.

Fix: collision checks `tileGrid[key].alive` (live state) not the static
level string.

Full discussion: `skills/three/update-order.md`
section "Data coherence".

### E7. Mesh "forward" convention must match physics "forward" convention

If you build a mesh with its nose at local `+Z`, then physics uses a
forward vector convention like `(-sin θ, 0, -cos θ)`, you'll get cars
driving rear-first.

Fix: wrap-inner pattern. Outer group is what physics rotates; inner group
contains the visual mesh pre-rotated 180° so its nose aligns with physics
forward.

```js
function buildCar() {
  const wrap = new THREE.Group()
  const inner = new THREE.Group()
  // ... build visuals in inner ...
  inner.rotation.y = Math.PI    // pre-rotate so nose aligns with physics fwd
  wrap.add(inner)
  return wrap
}
```

Same lesson applies for `dirAngle({dx, dz})` mapping to mesh `rotation.y`:
mesh barrel at local `+Z` → `rotation.y = π/2` points world `+X`, NOT `-π/2`.
Top-down view hides the mistake. First-person view exposes it.

### E8. Snap-turn movement is incompatible with cameras that rotate with the player

4-direction grid games (Pacman / Bomberman / FC Tank Battle / Battle City)
have the player snap-turn 90° many times per second. **Any camera that
tracks the player's facing rotation will whip-pan 90° at the same rate.**
Result: motion sickness within 10 seconds.

Even smoothing the camera's facing via lerp does not save it — you trade
strobe for nausea.

Fix: in snap-turn games, camera modes must use **fixed world orientation**.
Camera position can follow the player (top-down / iso / chase) but the
rotation must not rotate with player.dir. The player still spins (you see
the turret turn), but the world stays put.

See `skills/game/axioms/camera-coupling.md`.

### E9. A palette authored on an older three.js renders wrong on a new one

three r128 fed raw hex straight to the shader and sRGB-encoded on output, so
every color rendered **lighter and more pastel** than its hex. A scene whose
look was tuned on that pipeline, opened under r15x+ with default color
management, renders the same hexes darker and more saturated — a faithful port
that looks wrong.

Do NOT flip `ColorManagement` globally (tried; it makes it worse). After ALL
materials exist, run a one-time shim:

```js
scene.traverse(o => { for (const m of mats(o)) {
  m.color?.convertLinearToSRGB(); m.emissive?.convertLinearToSRGB();
}});
// and: leave authored CanvasTextures WITHOUT texture.colorSpace = SRGBColorSpace
```

That reproduces the old appearance exactly, for one scene, without poisoning the
global pipeline. New worlds must NOT copy the shim — author true hex instead.
And always A/B against a reference render; never port colors by theory alone.

### E10. A hand-built index buffer faces the wrong way half the time

Any mesh you index yourself — a terrain grid, a ribbon, a lofted hull — has a
50% chance of facing away from you, and **every gate stays green when it does**.
Back-face culling makes it invisible, so: no console error, contract complete,
budget fine, `luma` fine (the sky and fog fill the frame), and the capture looks
like a hazy scene rather than an empty one.

`gorge` built a 2.9 km canyon that was invisible for five review rounds. The
tell that broke it was not a screenshot — it was a raycast returning `null`
everywhere the ground should have been.

```js
// rows advance along -Z, columns along +X:
idx.push(a, c, b, b, c, d)   // ❌ normal is -Y. Invisible from above.
idx.push(a, b, c, b, d, c)   // ✅
```

Check it the moment the mesh exists, in one of two ways — both take a minute
and neither depends on your eyes:

```js
// 1. does a ray from above hit it at all?
raycaster.set(new THREE.Vector3(x, 500, z), new THREE.Vector3(0, -1, 0));
console.log(raycaster.intersectObject(mesh).length);       // 0 = wrong winding
// 2. or just look at the first normal after computeVertexNormals()
console.log(mesh.geometry.attributes.normal.getY(0));      // < 0 = wrong winding
```

**Symptom to remember**: "the world looks empty / washed out and I cannot find
the geometry" is a winding bug far more often than it is a lighting bug.

### E11. A world's own autopilot cannot validate its controls

`bot-drivable ≠ player-tested`, and the gap is not a small one.

`gorge` shipped a build where `D` turned the aircraft **left**. It survived every
check because the only thing that ever flew it was the autopilot inside
`main.js`, and that autopilot wrote the internal input struct directly using the
same inverted sign. Two mistakes that cancel, one player who cannot steer.

Underneath it was a second bug of the same family: `act()` set the input struct
and `readKeys()` overwrote it on the very next frame, so the entire playable
contract was implemented, reported `interactive: true`, and was **completely
inert**. Both are invisible from inside.

The rule: **the thing that drives a playable world must live outside it and use
only the published contract** — `observe()` describes, `act()` commands, and a
loop closed between the two is the only thing that proves they agree. That is
what `worlds/<name>/pilot.js` is for, and why it may not import from the world.

```bash
node harness/botplay.mjs <name>     # flies the whole course through pilot.js
```

`verify` runs three seconds of it and warns when a playable world has no pilot;
a wrong control convention takes a corner to appear, so it needs the full run.
Corollary for any world where both a bot and a human write one input struct:
decide which wins, in code, on purpose (`gorge` gates the keyboard read behind a
`botUntil` timestamp).

### E12. A form authored below the mesh's sampling rate does not exist

If a feature is not at least ~3 samples across, it is not in the picture no
matter how correct the maths is. `gorge` spent four rounds on sandstone ledges
that were exactly one quad tall: the terracing function was right, the strata
were right, and the wall rendered perfectly smooth.

Before authoring a form, divide: **feature size ÷ quad size**. Under 3, you have
two honest choices — make the feature bigger, or spend the vertices where it
goes. Do not tune it; it cannot appear.

The same arithmetic applies to textures (a 4-pixel feature in a 256² map is
noise, not detail) and to the reverse case: `gorge`'s first rock map put its
top octave on a 4-texel span and the whole canyon shimmered like television
static from 400 m away.

---

## Game design axioms (already enforced via workflow)

- **Step 0 — fantasy test** (`skills/game/fantasy-test.md`). 5 questions.
  Don't start without passing. A game can score 9/10 on every structural audit
  and still be built on a fantasy nobody wants to play — the audit cannot catch
  that, the test can.
- **Step 0.5 — genre playbook** (`skills/game/playbooks/`). If the
  game is a known genre (TD / survivors / platformer / deckbuilder / ...),
  load the matching `designing-<genre>/SKILL.md` BEFORE drafting the
  design doc. It encodes genre conventions (TD needs 2x speed + wave
  preview; survivors needs evolution pairs; platformer needs coyote time)
  and the death-traps that kill 90% of AI-generated games in that genre.
  Use `genre-router.md` if genre is ambiguous.
- **Forcing-function workflow** (`skills/game/workflow.md`).
  6 steps, design doc first, audit each milestone. Skipping = "toy not a game".
- **Fun compiler gate** (`skills/game/quality/fun-compiler.md`).
  AI defaults to feature soup. Before code, force MDA target, 10-second toy,
  decision spine, peak map, visual/performance contract, and playtest proof.
- **Risky pickups are opt-in** (`skills/game/mechanics/pickup-consent.md`).
  Brushing into a one-shot-die powerup is bad design. The canonical fix is a
  pickup you must deliberately step onto and can walk past.

---

## Architecture rules of thumb

| Question | Rule |
|---|---|
| Should this go in `worlds/<name>/` or `runtime/`? | **Three worlds need it** → runtime. Otherwise inline. |
| Should this game be split into multiple files? | **3000+ line single file OR 3+ distinct modes** → split. Otherwise single file. |
| Should I add real-time shadows? | **< 100 dynamic meshes + camera shows depth (iso / 3/4)** → real shadows. Otherwise drop-shadow or none. See shadow-strategy skill. |
| Should I add PostFX bloom? | **Default no.** Add only if the scene is intentionally dark/moody with isolated bright accents. Bright scenes never. |
| Should I add fog? | **Only when atmosphere is the point.** Snap to "atmospheric", never to "obscuring gameplay". |
| Where do I put a new constant/threshold? | **Top of the file** as a `const`, with a comment explaining *why this value* (cite the design doc trade-off). |
| Where do I put per-stage data? | **Single `STAGES` array** at top of file. Each entry is a config object. `buildStage(idx)` reads from it. |

---

## Workflow discipline

1. **Before coding a new game**: decide the soul (who/where/core verb) and run
   it past the Step 0 fantasy test in `skills/game/fantasy-test.md`. A
   design scratchpad inside the world's directory is useful but optional — there
   is no audit gate. The real check is `harness/capture.mjs`: build both halves, look
   at the frame, fix the worst thing, repeat until it looks alive AND plays well.
2. **Before judging anything that exists outside this repo**: put a reference in
   the frame. **Memory is not a reference.** If the subject is a real thing — an
   animal, a machine, a place, a light — your idea of it is smooth, symmetrical
   and missing the two features that make it recognisable, and every iteration
   against it optimises a target that does not exist. `capture --ref` and
   `inspect --ref` put a photograph in the same sheet as your frames; drop the
   images in `worlds/<name>/refs/`, which is git-ignored, so a reference can
   never quietly become an asset (D4 still holds: copy the form, never the
   pixels). This is scar tissue from a bird that went through six honest
   review rounds and came out generic, because every round was scored against
   the same wrong memory.
3. **Before extracting to lib**: count how many existing scenes have the same
   pattern. **Three or more** = extract. Two = wait.
4. **Before invoking an unfamiliar primitive**: `grep -rn "new <Name>" worlds/`
   to see how others use it.
5. **After every code change visible in browser**: `node harness/capture.mjs
   <world>` → look at the frames (plus `verify.mjs` for console/contract/budget).
6. **When a bug shows up**: ask "is this a new instance of an old axiom?"
   before writing a one-off fix. If yes, the fix is "apply axiom E_N".
   If no, you may have found a new axiom — write it down.

---

## When to add to this file

A new entry belongs here when:
- A bug recurred (you fixed it once, then a few weeks later fixed the same
  shape again) → write the axiom that prevents both
- A primitive extraction taught you about API design at this scale → distill
- A design decision recurred across games → write the rule

What does NOT belong here:
- "In world X, function Y does Z" — that's documentation for one work, and it
  lives in that world's own header comment
- Three.js trivia — that's `skills/three/`
- General game design — that's `skills/game/axioms/`

This file is the bridge: **engineering axioms specific to this codebase's
patterns**, distilled from real mistakes.

## Index of recurring engineering bugs and their fix-axioms

| Symptom | Fix-axiom |
|---|---|
| Blank canvas, only HUD visible | E1 → API verify · E3 → loop crash trace |
| Cars / players move sideways with mesh facing wrong way | E7 → mesh/physics convention align |
| 80+ unique geometries in scene, slow warm-up | E4 → share geometry |
| Whole-screen washes white | E5 → bloom hygiene |
| Player walks through bumped/destroyed obstacle | E6 → single source of truth |
| Bullets never spawn but enemies fire fine | E1 → Cooldown API mismatch |
| First-person camera spins 90° on every move | E8 → snap-turn ≠ rotating cam |
| Scene ported from an older three.js renders dark / oversaturated | E9 → colour shim + A/B vs reference |
| World looks "empty / hazy", raycasts hit nothing, every gate green | E10 → index winding |
| Controls feel wrong, or `act()` seems to do nothing | E11 → drive it from outside, `botplay` |
| A form is mathematically there and invisible in the render | E12 → feature size ÷ quad size |
| New game feels like a "tech demo" not a game | Game design Step 0 fail — re-read fantasy-test.md |
