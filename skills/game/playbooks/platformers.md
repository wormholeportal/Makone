# Designing Platformers

## When to use this skill

The user wants a game where:
- The player **jumps and runs through 2D environments**
- Most challenges are about **movement and timing**, not combat
- Levels are **designed by hand** (not procedurally — see `roguelikes` for proc-gen platformers)
- Death is **frequent but cheap** (instant respawn typical)
- Player progression is mostly **skill-based**, with optional ability gating (metroidvania)

If combat dominates the experience, consider hybrid genres. If levels are procedurally generated and runs are permadeath, see `roguelikes`.

## The genre in 30 seconds

A platformer's quality lives entirely in **the feel of the jump**. Mechanically, the genre hasn't changed in 30 years — move, jump, land. What differentiates great platformers from forgettable ones is **how the jump feels in the first 5 seconds**:

- Acceleration curve of the run
- Apex hang-time of the jump
- Coyote time (forgiveness after walking off a ledge)
- Jump buffering (forgiveness for early presses)
- Variable jump height (hold = higher)

If these aren't tuned right, no amount of beautiful level design saves the game.

## The core loop (the heartbeat)

```
[Movement input]
  │
  ▼
[Traversal challenge (gap, spike, moving platform)]
  │
  ├─▶ Success: progress 50–200 pixels forward
  │           │
  │           ▼
  │     [Next challenge, slightly harder]
  │
  └─▶ Death: respawn at last checkpoint (<2 sec)
```

The loop must reset in **under 2 seconds**. Celeste's death-to-respawn is 1.2 seconds. Super Meat Boy is 0.5 seconds. Slow respawns kill the genre.

## Required screens / states

1. **Title** with chapter / level select
2. **Chapter select / overworld**
3. **Level screen** — the actual platformer
4. **Pause** — with retry option
5. **Death / respawn** (often instant, no screen)
6. **Collectible tracking** (strawberries, coins, hearts) overlay
7. **End-of-level summary** — time, deaths, collectibles
8. **(Optional) Ability menu** for metroidvania variants

## The 5 decisions you must make

### 1. Linear levels or metroidvania?
- **Linear stages** (Celeste, Super Meat Boy, Mario) — discrete levels, ~2 min each
- **Interconnected map** (Hollow Knight, Pseudoregalia, Ori) — one big world gated by abilities
- Linear is easier to design and scope. Metroidvania has higher retention but **3–5x the design work**.

### 2. Precision or expression?
- **Precision** (Celeste, Super Meat Boy) — tight challenges with one correct path
- **Expression** (Pizza Tower, Sonic) — many ways to traverse, speed/style matter
- The two have completely different design rules. **Precision** centers on hand-placed hazards; **expression** centers on momentum systems.

### 3. The "verb set" — what moves can the player do?
Pick **3–5 movement verbs** total. More than 5 overwhelms the player. Classics:
- Run, jump, double-jump
- Dash (Celeste's iconic verb)
- Wall-jump / wall-slide
- Grab / climb
- Stomp / dive
- Slide / crouch
- The verb set IS the game. Choose carefully.

### 4. Difficulty philosophy?
- **Brutal** (Super Meat Boy) — accept high death counts as feedback
- **Forgiving + skill-rewarding** (Celeste) — accessible by default, hardcore for completionists
- **Casual** (early Mario) — broadly accessible, low death
- **Assist mode** (Celeste's slow-mo + invincibility) is now genre-standard. Ship it.

### 5. Collectibles strategy?
- **Mandatory** (Super Mario 64 stars) — progress gating
- **Optional skill challenges** (Celeste strawberries) — bragging rights
- **Currency** (Hollow Knight geo)
- **Lore** (Hollow Knight charms, story tablets)
- Optional + skill-based is the modern default and rewards mastery.

## Reference games and the mechanism that makes each work

**Celeste** — *every chapter teaches one variant of the dash*. Madeline's air-dash is introduced in chapter 1; each subsequent chapter introduces a single mechanic that recontextualizes it (wind, dream blocks, feathers). By chapter 7 the dash means something completely different than chapter 1. **Teach by recombination, not by adding new verbs.**

**Super Meat Boy** — *the "instant retry as iteration"*. Sub-second respawn turns "I died" into "I just learned." 1000 deaths feel like an iteration of skill, not a punishment. The genre's most studied design choice.

**Pizza Tower** — *momentum as the core verb*. The character accelerates the more you move. Stopping is the worst thing you can do. Demonstrates that platformers can be about **continuous flow** rather than discrete challenges.

## Death traps to avoid

- **Slow respawn** — anything over 2 seconds is unacceptable. Test from day 1.
- **Inconsistent collision boxes** — players need to *trust* the hitboxes. Make spike hitboxes **slightly smaller** than visual, and player hitbox **slightly smaller** than visual. The opposite (visual smaller than hitbox) is the genre's #1 player rage trigger.
- **Forgetting coyote time** — even 4 frames of post-ledge jump-grace transforms feel from "unfair" to "competent." Most beginner platformers skip this.
- **No jump buffering** — if a player presses jump 2 frames before landing, the jump should still execute on landing. Without this, players feel sluggish.
- **Hidden tutorials** — platformers should teach mechanics through **level design**, not text popups. Celeste's chapter-1 dash tutorial doesn't use a single word.
- **Camera issues** — bad cameras (especially in metroidvanias) ruin platformers. Show **what's coming next**, not the player's center.

## Recommended scope for AI generation

This is the genre where **AI assistance is most uneven**.

| Component | AI quality |
|---|---|
| Movement physics design | ⚠️ Medium — needs iteration |
| Level layout (precision platformer) | ⚠️ Weak — humans still do this better |
| Level layout (sandbox/metroidvania) | ⚠️ Very weak — global coherence is hard |
| Art (tilesets, character) | ✅ Good with image gen + cleanup |
| Music | ⚠️ Medium |
| Story / dialogue | ✅ Excellent |
| Hitbox tuning | ❌ Must be done by humans + playtesters |

**Honest assessment**: AI-generated platformers are usually *bad* because level design quality compounds. Each screen needs to be **deliberately authored**. AI is best at:
- Generating dialogue, story, character art
- Building level **archetypes / templates** that humans assemble
- Iterating on tuning once a human identifies the issue

**Realistic v0.1**: 10 hand-designed levels, 3 movement verbs, 1 boss, simple respawn system. AI helps with art, music, dialogue. **Do not attempt metroidvania for v0.1** — too much global design work.

## MVP scaffold (output this first)

```
# [Game Name] — Platformer Design Doc v0.1

## Pitch (one sentence)
[20 words: setting + the one unusual movement verb]

## The jump (tune these first, before anything else)
- Run acceleration: [N px/s²]
- Max run speed: [N px/s]
- Jump initial velocity: [N px/s upward]
- Gravity: [N px/s²]
- Variable jump height: hold extends to [N% taller]
- Coyote time: [N frames] (default: 4)
- Jump buffer: [N frames] (default: 6)

## Verb set (3-5 verbs total)
| Verb | Input | Effect | Cooldown / cost |
|---|---|---|---|

## Level structure
- 10 levels for v0.1
- 90 seconds optimal-path target per level
- Death-to-respawn: <1.5 seconds

## Hazards / enemies (6 minimum)
| Name | Behavior | Damages how | Player response |
|---|---|---|---|

## Collectibles
- Required: [type, N per level]
- Optional skill: [type, N per level, harder paths]

## Boss design
- Appears at level 10
- 3-phase fight, 90 seconds intended duration
- Uses only abilities the player has learned in levels 1-9

## Assist mode
- Adjustable speed (50-100%)
- Infinite air-dash toggle
- Invincibility toggle

## What's OUT of scope for v0.1
- Metroidvania structure, multiple characters, branching paths, voice acting
```

## See also

- `roguelikes` if levels become procedural and runs become permadeath
- Future `game-feel-juice` skill (Layer 2) — critical for this genre
- Future `level-design-templates` skill (Layer 2)
