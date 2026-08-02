# review — reading the sheet, and reporting it honestly

```bash
node harness/inspect.mjs <world>                          # every part
node harness/inspect.mjs <world> --part horn              # one
node harness/inspect.mjs <world> --part horn --ref a.jpg  # with a reference beside it
node harness/capture.mjs <world> --shots 3 --ref a.png    # the assembled world, same idea
```

`--ref` takes any image: a photograph, a design frame, or **the previous capture**. Pointing it at
your own last frame is the cheapest regression check there is — comparing against memory is how a
regression survives a review. On the gramophone the A/B sheet is what showed the record rendering
white at two azimuths and black at a third; no single frame would have said anything was wrong.

## The four viewpoints, and what each is for

| view | catches |
|---|---|
| `iso` | the shot you would show someone |
| `isoback` | deliberately opposed to `iso`, so **every face appears in at least one of the two** — back, left and underside are covered by default, not when you get suspicious |
| `top` | symmetry, repetition, and joints (a crease between two pieces shows here first) |
| `front` | the profile, with the graduated staff beside it for absolute size |

**Multi-angle or it didn't happen.** A form that holds from one angle and collapses to a flat plane
when orbited is the single most common failure of procedural modelling. Two angles minimum,
always.

## The facts table

The numbers exist because the eye reads a wrong-sized object as "fine".

| field | what a bad value means |
|---|---|
| `size w×h×d` | compare against the real thing in metres. A 0.9 m tabletop gramophone is wrong however good it looks |
| `aspect w/h` | proportion drift — the number the eye is worst at |
| `datum` | `off datum` means it will float or sink when assembled |
| `centered xz` | fine to be false for a part that reaches (a horn); suspicious for a body |
| `triangles` | a 40k-triangle knob is a segment count nobody chose on purpose |
| `geometries (reuse ×n)` | repeated pieces that each built their own geometry (E4) |
| `pivots` | a moving piece with no name cannot be driven by the assembly |
| `inventory` | read every line against the pictures. A line you cannot point at in the image is a line that was never built |

## Order of operations: deterministic first, looking last

1. Run `inspect`. If `problems` is non-empty, or a number is wrong, **fix that first** — do not
   spend a look on it.
2. Then look at the sheet, for the things numbers cannot hold: does it read as the object, does the
   silhouette work, do the joints look like one piece.
3. **Turn every visual concern into a number before it becomes a conclusion.** "The horn looks too
   wide" is not a finding; "bell 0.42 m against a 0.34 m cabinet, reference is about 1.0:1" is. The
   number goes into `params.js` and stays checkable; the impression evaporates.

Numbers never lose to an impression. An impression can send you looking for a number that is not
being measured yet — that is what it is for.

## Do not loop on screenshots

Re-render when a source change altered visible geometry, or to confirm one specific finding.
Re-rendering to "have another look" is how a review turns into a slot machine. One sheet per part
per change is normally enough; add `--views ...,side` only when a specific face is in question.

## Reporting

Say what changed, with the numbers. Say what still does not match. Never round the second one up.

- **"Improved" is not "done".** If the flare is closer but still wrong, say it is still wrong.
- **A passing gate is not a delivered brief.** `verify` green + a clean sheet means the contract
  and the geometry hold. Whether the thing carries the brief in `world.json` is a separate claim
  and needs its own sentence. On the gramophone: sheets clean, budget fine, and the brief
  ("brass catching a single window's light") was *not* delivered — studio three-point lighting is
  not one window. Both facts get said.
- **Explain what a check is blind to** when it passes and your eye disagrees. `top` cannot see
  material; the facts table cannot see whether it looks like a gramophone.
- **Pick one next action** and name it: keep going, change the params, change the code, ask the
  user, or stop. Not three at once.

The reason is not modesty. The user has to be able to debug the *process*, not just the output —
an opaque pass forces a restart, a transparent one can be refined.
