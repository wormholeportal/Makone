---
name: skills
description: Index of the knowledge layer - which of the five skill directories to load for a given request. Read this first when you don't already know which page you need.
---

# skills/ — the knowledge layer

Five directories, one job each. **Load the least you need**; nothing here is
mandatory reading.

That is the boundary with `docs/`: everything here is **craft you may take or
leave**, and the worst case for skipping a page is a weaker world. What you may
*not* skip lives in `docs/` — `contract.md` is the interface `harness/verify.mjs`
enforces, and `principles.md` is the set of axioms every session starts by
re-reading. Those are spec and scar tissue, not technique, which is why they are
not pages in here.

| dir | job | when to load |
|---|---|---|
| `world/` | **The master workflow.** Six steps from a brief to a finished world — works for scenes, games and objects alike, and notes where the three diverge. | Every "make me a ..." request. Start here. |
| `craft/` | **Cross-cutting technique.** Form, light, colour, contrast, actors, motion, particles, performance. Applies to every type of world. | While building: pull the one page you need. |
| `game/` | **Game-specific design.** Feel, mechanics, onboarding, narrative, audio, genre playbooks, honesty gates. | Only when the thing is playable. |
| `object/` | **Object-specific practice.** Cutting a thing into parts, the part contract, and reviewing one part alone with `harness/inspect.mjs`. | Only when the work is one thing you could hold. |
| `three/` | **Three.js API reference + engine engineering.** Lookup, not design. | When you hit a "how do I do X in three.js" wall. |

## Why this shape

A world can be a `scene`, a `game`, or an `object` (see `worlds/README.md`).
Skills are deliberately **not** mirrored one-per-type — that would force empty
symmetry. Scenes and objects need no design theory beyond `world/` + `craft/`;
games do, because playability is a separate discipline. So:

- **workflow** (`world/`) is universal → one dir
- **technique** (`craft/`) is universal → one dir
- **domain knowledge** earns a dir only when a type genuinely needs a deep body
  of it → today `game/` (playability is its own discipline) and `object/`
  (part-level practice became real once `runtime/studio.js` + `harness/inspect.mjs`
  existed and a first assembled object proved the loop — not one line was written before that)
- scenes still earn nothing of their own: `world/` + `craft/` is genuinely all they need
- **reference** (`three/`) is lookup, kept apart from design on purpose

Never create a directory for symmetry. Never split a doc that has no second reader.

## Naming

One rule, no exceptions:

- **Every directory has a `SKILL.md`** — its index. YAML frontmatter with
  `name` (= the directory's path in kebab, e.g. `game-feel`) and `description`
  (= when to load it), then a table routing *problem → page*. This is the only
  file you are expected to read before knowing what you want.
- **Every other file is a content page**: kebab-case `.md`, no frontmatter, no
  numeric prefixes. Reading order belongs in the index, not in filenames.
- **A page is named with a noun phrase, at most two words** — the topic, not a
  claim about it. `feedback-latency`, not `feedback-within-100ms`; `timestep`,
  not `fixed-vs-variable-timestep`; `fantasy-test`, not `choose-a-fantasy`. The
  page argues its point in its own body; the filename only has to say what the
  page is *about*, so you can pick it out of an index. Sentences, imperatives
  and `x-vs-y` comparisons are what produce five-word filenames.
- **One word when one word is unambiguous.** `three/` mirrors three.js's own
  vocabulary (`materials`, `textures`, `shaders`) so the mapping is obvious;
  `hitstop`, `juicing`, `roguelikes` are already whole concepts. Padding those
  to two words adds noise, not precision. Two is the ceiling, not the target.
- **No redundant prefix.** The directory is already context: inside
  `playbooks/` a file is `roguelikes.md`, not `designing-roguelikes.md`.
- **A page's H1 is `# Topic — one-line claim`**, and nothing else. No
  `Theorem:` / `Axiom #N:` label: every page here argues something, so saying
  so carries no information, and a number in a title is a debt you pay every
  time you insert or drop a page.
- **No `README.md` anywhere under `skills/`.** An index here is read by an agent
  deciding what to load, not by a human browsing a repo — the name should say so.
- **A directory with no index is a bug.** If a directory isn't worth an index,
  it wasn't worth being a directory.

## Rule for editing

After changing a skill, capture a world that exercises it **before** your change, keep those
frames, then capture again after and put the two sets side by side. If the output is not
visibly better, the change was bloat — revert it. Skills exist to unlock creativity, not to
accumulate checklists.
