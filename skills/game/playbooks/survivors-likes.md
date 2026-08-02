# Designing Survivors-likes

## When to use this skill

The user wants a game where:
- The player **moves but never aims** — attacks fire automatically
- Hundreds to thousands of enemies are on screen at once
- A run lasts **8–30 minutes** with rapidly escalating pressure
- The player picks **one of 3–4 upgrades** every 30–60 seconds
- The run ends in **death or timer-clear**

If the player aims manually, see `shmups`. If runs are 30+ minutes with discrete combat encounters, see `roguelikes`.

## The genre in 30 seconds

Vampire Survivors removed *aiming* from action games and **replaced it with build-crafting**. The player's only physical input is movement; all complexity moves into the upgrade pick screen. This makes the genre:
- Insanely accessible (3-year-old can play)
- AI-amenable (no AI opponent, just spawning patterns)
- Mobile-first viable (one thumb)

The hook is **the synergy moment** — when two weapons combine in a way the player didn't expect.

## The core loop (the heartbeat)

```
[Spawn]
  │
  ▼
[Move + auto-attack for 30-60s] ──┐
  │                                │
  ▼                                │
[XP gem collected → level up]     │ ← repeat 15-30 times
  │                                │
  ▼                                │
[Pick 1 of 4 upgrades] ───────────┘
  │
  ▼
[Death or 20-min clear] ──▶ [Meta-currency / unlocks]
```

The pick-screen pause is **the entire emotional payload**. The combat between picks is texture, not climax.

## Required screens / states

1. **Title with meta-shop** (unlock new characters / starting items)
2. **Character select** (3–8 characters with different starting weapons)
3. **Stage select** (1–5 maps, each with different visuals + enemy pool)
4. **In-game** (the survival arena)
5. **Level-up pause overlay** — picks
6. **Boss appearance / mini-boss popups** at fixed timer marks
7. **Death screen** with run summary (gold earned, time survived, kill count)
8. **Pause / quit menu**

## The 5 decisions you must make

### 1. Active aim or full auto?
- **Pure auto** (Vampire Survivors, Holocure) — weapons fire in patterns/AOE
- **Auto-target nearest** (Magic Survival, Brotato) — weapons aim at closest enemy
- **Hybrid** (20 Minutes Till Dawn) — character aim, weapons fire automatically toward cursor
- Pick ONE. Don't mix.

### 2. Run length target?
- **8–12 min** — mobile-friendly, fits commute (Magic Survival)
- **15–20 min** — the default (Vampire Survivors)
- **30 min** — risks pacing fatigue
- Shorter is harder to design (curve must be tighter) but better for retention.

### 3. Weapon evolution system?
- **None** — weapons just level up to 8 (simple, can feel flat)
- **Evolution pairs** (Vampire Survivors) — two specific weapons + passive item = new ultimate weapon
- **Hybrid trees** (Brotato) — weapons combine on dropped items
- Evolution pairs are **the** genre signature. Without them, the build crescendo is missing.

### 4. Enemy spawn pacing?
- **Fixed timer waves** (Vampire Survivors at 1-min marks)
- **Pure scaling DPS** (Magic Survival smooth ramp)
- **Discrete encounters** (Brotato — 20 timed waves with breaks)
- Discrete-wave is most beginner-friendly. Smooth is hardest to balance.

### 5. Meta-progression flavor?
- **Permanent stat shop** (Vampire Survivors) — XP gain, max HP, etc.
- **Character unlocks** with new starting kits
- **Cosmetics / map unlocks**
- All three should ship. Stat shop is the most engagement-positive.

## Reference games and the mechanism that makes each work

**Vampire Survivors** — *the evolution pair as a hidden combinatorial puzzle*. Players don't know which weapon+passive combos exist until they discover them. The "I just made King Bible into Unholy Vespers" moment is the genre's purest dopamine. Without these hidden combos, the genre collapses into a stat shop.

**Brotato** — *the 20-wave structure as a built-in difficulty curve*. Discrete waves give the player a clear emotional arc (start panic → mid mastery → late chaos) that smooth ramps miss. Also pioneered the **20+ character roster** as content multiplier.

**Holocure** — *fan-IP + character skill identity*. Each character has a unique special move that defines their build path. Demonstrates that survivors-likes can carry strong character identities, not just generic warriors.

## Death traps to avoid

- **Too many weapon slots** — Vampire Survivors caps at 6 weapons + 6 passives for a reason. More slots dilute each pick decision. Default to **5+5 or 6+6**, never more.
- **Pick screen with 6+ options** — If players have 6 upgrades to choose from, the decision fatigues. **3–4 options is the sweet spot.**
- **Boss spike that kills run-builds** — If a boss at minute 10 instantly kills all glass-cannon builds, players feel cheated. Bosses should reward *good positioning*, not specific build choices.
- **Lack of "build crescendo"** — by the final 3 minutes, the player should feel **godlike**, not still struggling. The catharsis of overpowered late-game is the genre's promise.
- **No on-screen feedback for hits** — survivors-likes need **massive visual noise**: damage numbers, screen shake, particles. A "quiet" survivors-like feels broken.
- **Forgetting the "vacuum" pickup** — XP gems must be eventually auto-collected by some item, or the player's hands cramp from manual pickup.

## Recommended scope for AI generation

This is **the most AI-amenable genre on the list**. Reasons:
- No NPC dialogue
- No complex AI behavior (enemies walk toward player)
- Content is highly tabular (weapons, passives, characters as data)
- Procedural variation comes from pick combinations, not procedural levels

| Component | AI quality |
|---|---|
| Weapon set (20–40 items) | ✅ Excellent |
| Passive item set (15–30 items) | ✅ Excellent |
| Evolution recipe table | ✅ Excellent |
| Enemy designs (15–25 types) | ✅ Good |
| Boss designs (3–8 bosses) | ⚠️ Medium — boss AI needs care |
| Stage backgrounds / tilesets | ✅ Good |
| Music | ⚠️ Medium |
| Game feel (juice / hit-stop) | ⚠️ Medium — needs craft skills |

**Realistic v0.1**: 1 character, 1 stage, 10 weapons, 8 passives, 5 evolution recipes, 6 enemy types, 1 boss, 12-min run, 3 meta-unlocks. **This is genuinely shippable to itch.io in 2 weeks of agent work.**

## MVP scaffold (output this first)

```
# [Game Name] — Survivors-like Design Doc v0.1

## Pitch (one sentence)
[A 20-word logline naming the twist on Vampire Survivors]

## Core stats
- Run length: [N] minutes
- Player slots: [N] weapons + [N] passives
- Pick screen size: [N] options
- Level-up rate: every [N] XP, scaling [linear/quadratic]

## Weapon roster (10 minimum for v0.1)
| Name | Type | Pattern | Level 1 → Level 8 progression | Evolution pair |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Passive item roster (8 minimum for v0.1)
| Name | Stat affected | Per-level effect | Evolution role |
|---|---|---|---|

## Evolution recipes (3-5 minimum for v0.1)
- [Weapon] + [Passive] @ weapon max level = [Evolved Weapon]

## Enemy roster (6 minimum)
| Name | HP scaling | Speed | Spawn time | Behavior |
|---|---|---|---|---|

## Boss
- Appears at minute [N]
- 3 attack patterns
- HP and intended fight duration

## Meta-progression
- Currency: [name] earned [N] per run
- 3 unlocks for v0.1 launch

## What's OUT of scope for v0.1
- Multiple characters, multiple stages, online leaderboards
```

## See also

- `roguelikes` if runs become longer and contain discrete combat
- `shmups` if the player aims manually
- `incremental-games` for the meta-currency shop curves
