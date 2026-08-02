# Contributing

Two kinds of contribution, two different bars.

## Contributing a world

A world is a directory under `worlds/`. Scaffold it, build it, and — this is the part
that matters — **look at it**:

```bash
npm run create -- <world> --type scene --brief "4am at the fishing harbour, wet light"
npm run capture -- <world> --shots 4      # look at every frame
npm run verify -- <world>                 # must pass
```

Checklist before you open a pull request:

- `npm run verify -- <world>` passes: no console errors, the contract is complete, the
  world stays inside its declared budget.
- **The PR includes frames.** A change you can see arrives with the screenshots that
  show it. "It looks better now" is not reviewable.
- `world.json` has a `brief` — one specific sentence, concrete enough to smell. It is
  the thing your own review is judged against.
- The name is one lowercase word, no hyphens or underscores, and matches the directory.
- Pure code only: procedural geometry, CSG, shaders. **Nothing binary is an input** — no
  imported meshes, no texture packs, no baked maps. The only binaries a world ships are
  ones its own code produced: `cover.png` (plus `cover.gif` if you shot one) and the
  single-file export.
- `npm run check` passes (the generated catalog is up to date).

## Contributing a skill

Skills live in `skills/` and change how every future world gets built, so the bar is
higher than "this reads well":

- Pick an existing world the skill touches, rebuild it **before** your change, then again
  **after**, and put both sets of frames in the PR.
- If the output is not visibly better, the change is bloat. That is a real outcome, not
  a failure — say so and close it.
- Keep the voice: terse, opinionated, drawn from something that actually went wrong.
  A skill that reads like a generic tutorial is a skill nobody loads twice.
- One directory per job. Do not add a directory for symmetry (see `skills/SKILL.md`).

## Fixing the harness or runtime

- `harness/` scripts are one verb, one job. Shared, non-command code gets its own module
  and a noun name — `lib.mjs` for the browser bring-up, `sheet.mjs` for the composer.
- `runtime/` is the browser-side contract. Changing `world.js` changes every world, so
  verify the whole library before and after — there is no `--all`, loop it:

  ```bash
  for w in worlds/*/; do node harness/verify.mjs "$(basename "$w")" || echo "FAIL $w"; done
  ```
- Extract into `runtime/` only when **three** worlds need the same thing. Two is a
  coincidence (see `docs/principles.md`).

## House rules

- **English only** in code, comments and docs.
- **Frames go in the pull request, not in the repository.** `capture` and `inspect` write
  into `worlds/<name>/shots/`, which is where you review them — but a review packet is
  hundreds of near-identical PNGs, and that is not what a git history is for. Post the
  handful that show the change; leave `shots/` out of the commit.
- The single-file export **is** committed: it is one artifact, it is the work, and it lets
  anyone open the world by double-clicking without cloning or installing a thing.
- Adapting an existing work is wiring only — entry point, loop, contract. Its geometry,
  materials and tuning are the author's; carry them over verbatim.
- If a bug repeats, do not just fix it twice — write the axiom that prevents both in
  `docs/principles.md`.

## Reporting a bug

Include the world name, the exact command you ran, the JSON that `verify` printed, and
a frame. A blank canvas is almost always a first-frame exception — check the console
first (`docs/principles.md`, axiom E3).
