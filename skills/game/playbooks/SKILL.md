---
name: game-playbooks
description: Per-genre design playbooks - conventions, the decisions that define a genre, the death traps that kill it, and reference games. Load one AFTER the fantasy is clear and BEFORE the design doc, or load the router when the genre is unclear.
---

# playbooks/ — per-genre design

> Use AFTER `game/fantasy-test.md` confirms a clear fantasy, BEFORE
> `game/workflow.md` Step 1. The playbook fills in the genre-specific
> knowledge (death traps, required screens, the 5 decisions, reference games +
> their canonical mechanism) so your design doc isn't generic.

## When to use this layer

Two entry conditions, either is sufficient:

1. **You know the genre.** User says "tower defense" / "vampire-survivors-like" /
   "platformer". Read the matching `designing-*.md` directly.
2. **You DON'T know the genre.** Read `genre-router.md` first — it asks
   "what does the player DO every 5–30 seconds?" and routes to one of the 13.

## Where this slots into the workflow

```
Step 0 — Fantasy test     (skills/game/fantasy-test.md)
  │  pass 5/5
  ▼
Step 0.5 — Genre lock     (this layer)
  │  produces: genre name + the 5 decisions answered + death-trap awareness
  ▼
Step 1-6 — Forcing-function workflow   (skills/game/workflow.md)
  │  produces: design doc, MVP
  ▼
Implementation            (worlds/<name>/ + docs/principles.md)
```

The genre playbook is **input** to the design doc — its "5 decisions" become
your design doc's "core decision", "trade-off matrix", and "what this game does
NOT include" sections.

## The 13 playbooks

| page | load it when the user says / means |
|---|---|
| `genre-router.md` | genre unclear — triages by core loop, then routes to one below |
| `roguelikes.md` | run-based, permadeath, procedural, meta-progression, "one more run" — Hades, Slay the Spire, Isaac, Dead Cells |
| `survivors-likes.md` | bullet heaven, auto-attack, dodge-don't-aim, swarm/horde — Vampire Survivors, Brotato. Most AI-amenable genre: tight scope, small content footprint |
| `tower-defense.md` | place towers, wave / lane / creep defense — Bloons, Kingdom Rush, PvZ, Mindustry |
| `platformers.md` | 2D jump-and-run, precision platformer, metroidvania traversal — Celeste, Super Meat Boy, Pizza Tower |
| `shmups.md` | bullet hell, danmaku, STG, scrolling shooter, manual aim — Touhou, Ikaruga, Gradius |
| `deckbuilders.md` | build a deck across a run, card synergy, draft — Slay the Spire, Balatro, Inscryption. Not CCG/TCG |
| `match-3.md` | tile swap, cascades, limited moves, casual mobile puzzle — Candy Crush, Royal Match |
| `incremental-games.md` | idle, clicker, prestige, exponential growth, AFK — Cookie Clicker, Universal Paperclips |
| `autobattlers.md` | draft and position units, then watch them fight — TFT, Battlegrounds, Super Auto Pets |
| `puzzle-games.md` | discrete logic puzzle with a deterministic solution — Sokoban, Baba Is You, picross, Snakebird |
| `endless-runners.md` | auto-run, swipe lanes, one-tap, infinite runner — Subway Surfers, Crossy Road, Alto's |
| `coop-horror.md` | co-op / proximity-chat / scavenge horror — Lethal Company, PEAK, Phasmophobia. Not a fit for our solo arcade focus |
| `visual-novels.md` | branching narrative + sprites, dating sim, interactive fiction — DDLC, Ace Attorney. Not a fit for our 3D arcade focus |

The four that fit this repo best: **survivors / tower-defense / platformers /
endless-runners** (plus puzzle for cozy stuff). No world in `worlds/` is one of
these yet — the games that exist predate this layer, so there is no local
example to copy. Read the playbook, not a sibling world.

## How playbooks compose with the rest of `game/`

The playbook says **WHAT** the genre's conventions are. The rest of `game/` says
**WHY** they work and **HOW** to engineer them.

| Genre playbook says... | The axiom says... |
|---|---|
| "Survivors-likes: the pick-screen pause is the entire emotional payload" | `game/axioms/meaningful-choice.md` — choices need real trade-offs |
| "TD: enemy waves must be readable before they arrive" | `game/feel/telegraphing.md` — visible windups |
| "Platformer: 4 frames of coyote-time changes feel from unfair to competent" | `game/feel/coyote-time.md` — the exact pattern |
| "Survivors: weapon-evolution pairs are the genre signature" | `game/mechanics/second-order.md` — emergent combos |

**Cross-reference both directions.** A playbook saying "needs telegraphing" is
your cue to open `game/feel/telegraphing.md` for HOW; an axiom you're about to
apply is worth checking against the playbook for *whether this genre wants it*.

## How to use a playbook in practice

1. **Read it top-to-bottom once.** ~200 lines, three minutes.
2. **Answer the "5 decisions"** in your design doc's section 1. They map onto
   `game/design-doc.md`: map structure → First 30s; death traps →
   "what this game does NOT include"; reference games → the 5-word pitch.
3. **Use the MVP scaffold** at the bottom of each playbook as a starting point.
4. **Cross-link** the death traps to concrete `runtime/` helpers — and extract a
   new helper only at rule-of-three.

## What NOT to do

- **Don't pick a genre to fit a playbook.** Fantasy first, genre after.
- **Don't blend genres for v0.1.** "Survivors-like deckbuilder rogue-TD" is not
  a brief. Pick ONE primary loop.
- **Don't skip the playbook because you "know how TD works".** The death-traps
  section catches what you forget under time pressure.
- **Don't translate them to Chinese.** The English vocabulary is the standard
  design vocabulary; design docs communicate better in it.

## Attribution

These playbooks originated from a separate game-design bundle, licensed CC-BY
4.0, and were copied here for tight integration with the Makone workflow. The
only modification so far is structural: each was a `designing-<genre>/SKILL.md`
directory and is now a single `designing-<genre>.md`, with its frontmatter
`description` folded into the routing table above. The prose is unchanged.

If you modify a playbook's content, flag it (e.g. a `## Modifications for
Makone` section at the bottom) so the divergence from upstream stays visible.
