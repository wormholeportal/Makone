---
name: object
description: Making one complex object out of parts — decompose, do the arithmetic in params, build each part as a pure function, review it alone with harness/inspect.mjs, then assemble. Use when the work is a thing you could hold, not a place you could stand in.
---

# object — one thing, built from parts

`world/` is still the master workflow: step 0 (commit to a brief) and step 5 (finish honestly)
are the same here. This skill replaces steps 1–4, because an object diverges from a scene in one
way that changes everything: **the iteration unit is a part, not the world.**

A gramophone written as one 800-line `main.js` cannot converge. Changing the horn means re-running
the whole world and squinting at one wide shot. Split it, and each piece gets its own closed loop.

## The loop

```
decompose → arithmetic in params.js → build one part → inspect it alone → next part
                                          ↑______ sheet not clean? fix here ______|
                                                                    ↓ all parts clean
                                                    assemble → check joints → light → finish
```

**Gate: `main.js` does not import a part until that part's sheet is clean.** Downstream never
consumes an unreviewed upstream. This is the whole reason the split pays for itself.

## Steps

### 1. Decompose, and write the brief

Name the **identity-defining features** first — the handful of things that, if wrong, make it not
that object. Cap it at five. A gramophone is a brass flare, a wooden box, a spinning record and an
arm reaching over it; the moulding profile is not on that list.

Split by **how it is made and how it moves**, never by what your eye groups together.
See `parts.md`.

Put the reference in `worlds/<name>/refs/` in the same sitting (git-ignored — a reference can
never become an asset). Name the identity-defining features **off the photograph**, not off your
idea of the thing: what your memory hands you is a generic member of the category, and the two
features that make it *that* object are exactly the ones it drops. From here on, `inspect --ref`
and `capture --ref` put it in the same sheet as your frames — see `review.md`, and
docs/principles.md workflow 2 for why this is scar tissue rather than advice.

### 2. Do the arithmetic before any geometry

Write `params.js` first, with named values in metres, and **check the relationships numerically**.
On the gramophone the tonearm post sits 0.184 m from the platter centre and the arm is 0.185 m —
so at the wrong swing angle the head lands off the back edge, and with the wrong drop angle the
needle passes *through* the record. Both were arithmetic, not aesthetics:

```
postH − armLen · sin(drop) = record surface height + needle drop
```

Reach, clearance and contact are algebra. Do them in `params.js` where they stay checkable, not by
nudging numbers until a screenshot looks acceptable.

### 3. Build one part, review it alone

```bash
node harness/inspect.mjs <world> --part horn
```

Four viewpoints plus the numbers a screenshot cannot tell you. Read the sheet before writing the
next part — see `review.md`. Do not batch five parts and then look.

### 4. Assemble, then look at the joints

Joints are where procedural objects fall apart: two pieces that each look right meet in a crease
and read as glued-together primitives. Check every seam from at least two angles.

### 5. Light and finish

Metals are black without an environment; `runtime/studio.js` generates one (no downloaded HDRI —
D4 holds). Wood under that environment turns to plastic below roughness ~0.7.

Then finish per `world/` step 5, plus the honesty rules in `review.md`. **A sheet that passes is
not the same as the brief being delivered** — say which one you have.

## What this skill is not

Not manufacturing. We build **form**, not parts you could machine: no STEP, no tolerances, no
wall-thickness checks. If the user actually wants to print it, that is a different tool
(`docs/architecture.md` D3).

And when matching a reference photo: we copy the **form**, never the pixels. Projecting a
photograph onto the mesh is the highest-fidelity trick in the image-to-3D world and it is exactly
what D4 forbids. Reference images are for comparison only.
