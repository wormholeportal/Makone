# Designing Roguelikes

## When to use this skill

The user wants a game where:
- Each session is a discrete **run** with a beginning, middle, and end
- Death ends the run (permadeath) — there are no save scumming or mid-run reloads
- Each run is **procedurally varied** so no two are identical
- Most or all progress is lost on death, but **some meta-progression persists**

If the run-and-die loop is missing, this is not a roguelike — route back to `genre-router`.

## The genre in 30 seconds

A roguelike trades **the security of permanent progress for the thrill of run-level surprise**. The player keeps coming back because:
1. Each run promises a new combination they haven't seen
2. Each death is "their fault" (skill or build choice), not bad luck
3. Meta-progression converts every loss into measurable forward motion

Without all three, retention collapses.

## The core loop (the heartbeat)

```
        ┌──────────────────────────────────────────┐
        │                                          │
        ▼                                          │
   [Start Run] ─▶ [Combat / Challenge] ─▶ [Choice / Reward] ─▶ [Death or Win]
                       (loop 10-50x within a run)              │
                                                               │
                              [Meta-progression spend] ◀───────┘
```

The **inner loop** (combat → reward → combat) repeats 10–50 times per run.
The **outer loop** (run → death → meta-spend → new run) repeats dozens to hundreds of times across a player's lifetime.

Both must feel good. A roguelike where combat is great but meta is shallow dies at hour 5. A roguelike where meta is rich but combat is mediocre dies at hour 1.

## Required screens / states

For a Minimum Viable Roguelike, you need:

1. **Title / hub** — the meta-progression spend lives here
2. **Run start** — class / character pick (optional but standard)
3. **In-run map or node selector** — the player's run trajectory
4. **Combat / challenge screen** — the actual gameplay
5. **Reward / choice screen** — "pick 1 of 3 cards / items / upgrades"
6. **Death screen** — shows run stats, awards meta-currency
7. **Unlock screen** — what new content gets added to the next run

Skip any of these and the loop feels broken.

## The 5 decisions you must make

Walk the user through these. Their answers define the specific game.

### 1. Action or turn-based?
- **Action** (Hades, Dead Cells, Risk of Rain): execution matters, twitch reflexes
- **Turn-based** (Slay the Spire, ITB, Caves of Qud): planning matters, no twitch
- The action variant is currently **a red ocean on Steam** (see market data: 2022→2024 saw new Action Roguelike submissions collapse). Turn-based has more room.

### 2. What's the unit of progression within a run?
- **Cards** → it's a deckbuilder, route to `deckbuilders`
- **Items / relics** → Isaac, Hades, Gungeon
- **Stat upgrades** → Risk of Rain, Brotato (also see `survivors-likes`)
- **Spells / abilities** → Noita, Wizard of Legend
- Pick ONE primary. Mixing 3 dilutes the build identity.

### 3. How long is a single run?
- **5–15 min** — high retention, "just one more run" virality (Brotato, Loop Hero)
- **20–45 min** — standard mid-core (Hades, Slay the Spire)
- **1–3 hours** — hardcore (Caves of Qud, classic Nethack)
- AI-generated content has the highest credibility at **10–25 min** runs.

### 4. How permanent is meta-progression?
- **None** — pure roguelike (Spelunky 1, NetHack). Brutal, niche.
- **Cosmetic only** — unlocks new starting characters, no power boost
- **Mild power** — slight stat boosts, new starting items (Slay the Spire ascensions)
- **Heavy power** (roguelite) — substantial permanent upgrades (Hades, Dead Cells, Rogue Legacy)
- Heavier meta = wider audience but more designer work. Default to **mild + cosmetic**.

### 5. What's the "build identity"?
By the end of a run, players should be able to describe their build in 5 words: "ice mage stacking freeze," "bleed rogue with daggers," "shield engineer with turrets." If they can't, you don't have a roguelike — you have a randomizer.

## Reference games and the mechanism that makes each work

**Slay the Spire** — *card synergy as the build identity*. The 3 starting characters each have a deck identity (poison, exhaust, shield) but every run reshapes it. The 3-card pick after each combat is **the** addictive moment: not the combat itself.

**Hades** — *narrative as meta-progression*. Every death triggers new dialogue with NPCs in the hub. Players who don't care about builds keep returning for the *story* that's revealed only through repeated failure. This is the genre's most underused lever.

**Vampire Survivors** — see `survivors-likes`. Listed here because it pioneered the **10-minute run** as a viable roguelike unit. Many "roguelikes" are now actually survivors-likes.

## Death traps to avoid

- **The "randomizer trap"** — Pure randomness without player agency feels unfair. Every choice should be **between 2–4 surfaced options**, not a blind roll.
- **The "stat soup" trap** — 30 different stats that all matter feels deep but reads as noise. Most successful roguelikes have **5–8 stats max**, plus build-defining items.
- **Difficulty curve too steep / too flat** — A run should feel **winnable until minute 15**, then **threatening until minute 25**, then **decisive in the final 5**. If you die in minute 3 or breeze through minute 25, the curve is broken.
- **No "fingerprint" between runs** — If two runs feel identical except for room layouts, you're randomizing geometry but not gameplay. Items / cards / mutators must change what the player **does**, not just where they walk.
- **Forgetting the meta-spend ceremony** — Returning from death without a small reward animation is the genre's biggest emotional whiff. Even +1 coin needs a satisfying flash.

## Recommended scope for AI generation

| Component | AI can do | AI struggles with |
|---|---|---|
| Procedural map layouts | ✅ Yes | — |
| Item / card pool (50–150 items) | ✅ Yes, with strong taxonomy | Balance across full pool |
| Enemy designs (5–15 types) | ✅ Yes | Boss AI behavior trees |
| Run-time balance tuning | ⚠️ Mediocre | Needs human playtest loop |
| Hub / meta UI | ✅ Yes | — |
| Narrative threading (Hades-style) | ✅ Strong | Tonal consistency over hours |

**Realistic v0.1**: One character class, 30 items, 8 enemy types, 1 boss, 10-min run, simple 5-node map structure, 3 meta-unlocks. **Don't try to ship at "Hades scope"** — that's 6 years of human team work.

## MVP scaffold (output this first)

When you have the 5 answers, generate this design doc as the first artifact:

```
# [Game Name] — Roguelike Design Doc v0.1

## Pitch (one sentence)
[A 25-word logline]

## Core loop
- Run length: [N] minutes
- Inner loop unit: combat encounters of [N] seconds each
- Outer loop: [N] runs to first win

## Build identity
- The 3 starting "shapes" a player can become this game
- The 1 "unit of progression" within a run

## Run structure
- [N] nodes per run, [N] node types
- Boss at end of act
- [N] act(s) total

## Item / card / upgrade pool
- Target: [N] items at launch
- Rarity tiers: [Common/Uncommon/Rare/Legendary]
- 5 example items with intended build interaction

## Meta-progression
- Currency name and source
- 5 example unlocks ordered cheapest → most expensive

## What's explicitly OUT of scope for v0.1
- [Multiplayer, alternate characters, additional acts, etc.]
```

This document becomes the brief for the build-layer skill (PICO-8 / Phaser / Godot scaffolders, when they exist).

## See also

- `deckbuilders` if cards become the primary mechanic
- `survivors-likes` for the 10-min auto-aim variant
- `genre-router` to re-triage if the user is wavering between genres
