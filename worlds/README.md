# worlds/ — the works library

**Flat: one world = one directory.** The category is not a directory, it's the `type` field in `world.json`.

```
worlds/
├── index.json          ← GENERATED: node harness/catalog.mjs (the sole data contract)
└── <name>/
    ├── world.json      ← the hand-written record: name, title, type, brief, budget
    ├── main.js         ← the entry point; createWorld(container) → WorldModule
    ├── params.js       ← objects: every dimension, in metres, in one place
    ├── parts/          ← objects: one reviewable part per file
    ├── cover.png       ← the gallery's thumbnail
    ├── cover.gif       ← a looping turntable on a transparent background (README, hover previews)
    ├── shots/          ← GENERATED: harness/capture.mjs (whole world)
    │   └── parts/<part>/  and harness/inspect.mjs (one part: 4 views + a facts table)
    └── <name>.html     ← GENERATED: harness/export.mjs — self-contained, double-clickable
```

**Everything about one work lives in its own directory, and all of it is committed** —
source, review sheets, and the shareable single file. You can read the code and look at the
frames it actually produced without running anything, and `cp -r worlds/<name> ~/somewhere`
hands someone the whole work. The cost is real and worth knowing: a capture is a diff, and the
exports are 0.5–3.5 MB each (three, the runtime and manifold's wasm are inlined). Re-capture
because something changed, not to have another look.

## One shot format for every world

```bash
node harness/capture.mjs <name> --shots 4 --sheet     # az*.png ×4 + sheet.png, every world
node harness/inspect.mjs <name>                       # objects: shots/parts/<part>/ ×4 + sheet.png
```

Same two commands everywhere, so any two worlds are comparable and nobody has to remember a
per-world incantation. A walled world is the exception that would break that, and it is handled
by the world rather than by the invocation:

```json
"capture": { "arc": [-15, 105] }
```

Without it the orbit is a full circle. With it, the four frames stay inside an arc that is
actually open — noodles rendered **pitch black** from 12 of 24 azimuths (the camera sits behind
the alley's back wall in an unlit night scene) and cafe and kitchen put a wall or a floor slab
across half their frames. The three arcs in this repo were picked by measuring the information
density of each azimuth, not by taste, and then confirmed on the sheet.

## world.json

```json
{
  "name": "lighthouse",          // must equal the directory name, a single lowercase word, no - or _
  "title": "First Light",        // display name (may contain spaces / any language)
  "type": "scene",               // what it is: scene | game | object (open set, extensible)
  "format": "module",            // how it runs
  "entry": "main.js",
  "cover": "cover.png",          // optional
  "brief": "...",                // north star: one line of what it should be like to be there
  "key": "natural",              // lighting key: natural | low | high — verify measures the frame
  "budget": { "tris": 120000, "drawCalls": 80 }
}
```

After editing any `world.json` → `node harness/catalog.mjs` to regenerate index.json.

## One format

Every world is a **module**: a directory with a `world.json` and a `main.js` that
exports `createWorld(container)`. Open it at `/play.html?world=<name>`; the harness can
capture and verify it.

Adapting an existing three.js scene to this contract is wiring only — entry point, loop,
controls. Geometry, materials and tuning are the author's and get carried over verbatim.
If the original was authored on an older three.js, its palette will need
`docs/principles.md` axiom E9.

## Creating one

```bash
node harness/create.mjs <name> --type scene --brief "..."
```
