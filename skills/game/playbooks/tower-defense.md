# Designing Tower Defense Games

## When to use this skill

The user wants a game where:
- The player **places defensive structures** before enemies arrive
- Enemies move along a **fixed path or lane** toward an objective
- The player has **limited resources** (gold, lives) that determine what they can build
- Waves escalate over time, requiring strategic upgrades and placement
- Most fights play out **without the player's direct input** (similar to autobattlers)

If the player controls a single unit fighting waves, see `survivors-likes`. If the player drafts units for PvP combat, see `autobattlers`.

## The genre in 30 seconds

Tower defense is **interactive strategy + watching dominoes fall**. The player's job:
1. **Predict** what enemy waves are coming
2. **Place** towers to optimize coverage and synergy
3. **Upgrade** during gaps between waves
4. **Watch** the carnage and adjust between rounds

The genre is **cognitively rich but physically restful** — great for casual + tactical audiences. PvZ proved the formula scales to 50M+ players.

## The core loop (the heartbeat)

```
[Map loads — see path, lives, starting gold]
  │
  ▼
[Wave preview — what enemies are coming?]
  │
  ▼
[Build phase — place towers, upgrade existing]
  │
  ▼
[Wave plays — enemies spawn, walk path, fight towers]
  │
  ├─▶ Enemies killed: gold earned, build phase repeats
  │
  └─▶ Enemies reach end: lives lost
  │
  ▼
[Repeat for 15-30 waves, then boss / endgame]
```

The build-watch alternation is **the genre's metronome**. Skipping the preview or removing the build phase breaks the loop.

## Required screens / states

1. **Title + level select** (campaign progression)
2. **Level brief** — map preview, starting resources, wave count, objective
3. **Build / play screen** — the primary play screen
4. **Tower select / radial menu** for placement
5. **Tower detail / upgrade panel** when selected
6. **Wave indicator** with next-wave timer and preview
7. **Pause + speed controls** (2x and sometimes 4x are mandatory)
8. **Win / lose screen** with stars or score
9. **Meta-progression** — unlocks for next levels

## The 5 decisions you must make

### 1. Path structure?
- **Single fixed path** (Bloons TD pre-modern) — simple, classic
- **Multiple branching paths** (Kingdom Rush) — strategic choice
- **Lanes** (Plants vs. Zombies) — discrete rows
- **Free placement maze** (Element TD, Dungeon Warfare) — player builds the path
- Free placement adds depth but raises difficulty for new players.

### 2. Tower categories?
A good TD has **4–6 tower archetypes** with clear role identity:
- **Single-target high damage** (sniper)
- **AOE / splash** (cannon, fire)
- **Slow / debuff** (ice, tar)
- **Support / buff** (radar, amplifier)
- **Resource generator** (farm in BTD)
- **Anti-air / special-target** (when enemy types vary)
- Each tower should have **one clear "I exist for this enemy type" role.**

### 3. Enemy variety?
- **5–8 enemy types** for v0.1, each requiring a different tower response
- **Modifiers**: armored (resists physical), shielded (immune until shield breaks), fast, regenerating, flying
- **Bosses**: large, multi-phase, drop big rewards
- Enemy roster IS the puzzle. Diverse enemies prevent single-tower spam strategies.

### 4. Upgrade system?
- **Linear upgrades** (Bloons TD: each tower has 3-5 upgrade levels)
- **Branching upgrades** (Bloons TD 6: each tower has 3 distinct paths)
- **Combine towers** (Element TD)
- **Permanent meta-upgrades** in addition to per-level
- Branching paths are now the genre standard for depth.

### 5. Real-time or wave-based gameplay?
- **Wave-based pause-friendly** (Kingdom Rush) — explicit wave starts, pause to build
- **Continuous wave** (BTD style auto-start) — pace pressure
- **Real-time with no pause** (rare) — high stakes, hardcore
- Wave-based with optional auto-start is the most accessible.

## Reference games and the mechanism that makes each work

**Bloons TD 6** — *upgrade path commitment as build identity*. Each tower has 3 paths; you can only fully upgrade ONE path per tower. This single rule creates 100s of viable strategies and forces players to **commit to a tower's identity**. Demonstrates depth comes from constraint, not options.

**Plants vs. Zombies** — *charming character design as the mainstream entry point*. PvZ outsold every other TD by 10x because the towers were lovable characters, not abstract turrets. **Character > mechanic for mass-market TD.**

**Kingdom Rush** — *hero units as the player's avatar*. Beyond placed towers, a movable hero unit gives the player something to *do* during waves. Solves the "watch and wait" passivity problem. **The hero unit innovation is now genre standard.**

## Death traps to avoid

- **Single dominant tower** — if one tower / upgrade path is strictly better, players spam it. Aggressive playtest balance is mandatory.
- **Unreadable enemy waves** — players must be able to see what's coming. Wave previews must show: enemy types, count, special modifiers, gold reward.
- **No 2x / 4x speed** — modern players will not play at 1x speed once they've mastered. **2x minimum, 4x for skilled.**
- **Resource starvation in late game** — if the player runs out of money for upgrades right when waves spike, the difficulty curve feels broken. Tune so upgrades are always **affordable for the player who killed all previous waves**.
- **Tower placement frustration** — placement must be forgiving (snap-to-grid OR generous radius). Bad placement UX kills hours of player time.
- **No "auto-start next wave" option** — players who know what's coming want to skip the wait. Make the inter-wave timer **skippable for bonus gold**.

## Recommended scope for AI generation

| Component | AI quality |
|---|---|
| Map design (paths, terrain) | ✅ Good |
| Tower designs (5-8 types) | ✅ Good |
| Enemy designs (5-10 types) | ✅ Good |
| Wave composition | ✅ Good with templates |
| Tower upgrade trees | ✅ Good |
| Balance via simulation | ⚠️ CRITICAL — needs auto-play simulator |
| Visual polish | ⚠️ Medium |
| Music | ⚠️ Medium |

**Critical AI requirement**: a **wave-simulator** that auto-plays each level with multiple strategy heuristics (single-tower spam, balanced spread, late-pivot) to identify dominant strategies. Aim for **multiple viable strategies per level**.

**Realistic v0.1**: 1 character/faction, 6 towers, 8 enemy types, 10 levels, 3 difficulties, branching upgrades. **3–6 week ship target.**

## MVP scaffold (output this first)

```
# [Game Name] — Tower Defense Design Doc v0.1

## Pitch (one sentence)
[20 words: theme + the unusual twist]

## Map structure
- Path: [single / branching / lanes / free-placement]
- Tile grid resolution: [N x M]
- 10 maps planned for v0.1

## Tower roster (6 towers minimum)
| Tower | Role | Base cost | DPS | Range | Targeting | Upgrade paths |
|---|---|---|---|---|---|---|

## Enemy roster (8 enemies + 2 bosses)
| Enemy | HP | Speed | Modifier | Killed by | Reward gold |
|---|---|---|---|---|---|

## Wave structure
- 20 waves per level (default)
- Wave preview: enemies + count visible
- Inter-wave: 10s, skippable for +20 gold
- Boss wave: every 5 waves
- Final wave: boss + escort

## Upgrade trees per tower
- 3 paths, max 5 upgrades each
- Only 1 path can reach max (path commitment rule)
- Each path has clear identity (single-target / AOE / utility)

## Economy
- Starting gold: [N]
- Per-kill: [N base, scaled by enemy tier]
- Per-wave-clear: [N bonus]
- Sell value: [60-80% of investment]

## Difficulty curves
- Easy: 75% of intended HP, 1.2x player gold
- Normal: baseline
- Hard: 130% HP, 0.85x gold

## Balance simulator
- Auto-play heuristics: single-tower spam, balanced, late-pivot, eco-focus
- Target: 2+ heuristics succeed at Normal per level
- Fail flag: if 1 heuristic dominates >70%

## What's OUT of scope for v0.1
- Multiplayer, level editor, daily challenges, hero units (could add v0.2)
```

## See also

- `autobattlers` for PvP variant where two players' towers compete
- `incremental-games` for the meta-progression model (gold farm + tower unlocks)
- `survivors-likes` for the "single player vs waves" variant
