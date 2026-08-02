# Designing Match-3 Games

## When to use this skill

The user wants a game where:
- The board is a grid of colored tiles
- The player **swaps adjacent tiles** to form lines of 3+ same-color
- Matched tiles disappear, tiles above **cascade down**, new tiles spawn from the top
- Each level has a **move limit** and an **objective** (collect N blue, clear N blockers, etc.)
- Failure costs a **life** (life-regeneration economy)

If the player moves a single tile freely (Bejeweled-style continuous), it's still match-3. If the puzzle is logic-grid based (picross, sudoku), see `puzzle-games`.

## The genre in 30 seconds

Match-3 monetizes the **frustration of running out of moves on the 3rd-to-last objective tile**. The mechanic is trivially learnable; the economy is the actual game. Top earners (Royal Match $1.4B in 2024) succeed not through novel mechanics but through:
1. Painstakingly tuned difficulty curves
2. Soft-fail moments that drive boosters/lives purchases
3. Meta-progression (renovate a mansion, decorate a town) that gives the puzzle *meaning*

A match-3 without meta-narrative is Bejeweled — fun but uncommercial.

## The core loop (the heartbeat)

```
[Map / hub screen with progress nodes]
  │
  ▼
[Level N — see objectives + move count]
  │
  ▼
[Make moves until cleared or out of moves]
  │
  ├─▶ Cleared: stars (1-3), reward, advance node
  │             │
  │             ▼
  │   [Meta-screen: spend stars on renovation / story]
  │
  └─▶ Failed: lose 1 life, offer 5 extra moves for $0.99
```

The **soft-fail moment** ("you needed just 1 more move!") is the genre's revenue driver. Design every level to reach that state for the median player.

## Required screens / states

1. **Map screen** — sequential level nodes (NEVER an open world; sequential is the genre)
2. **Pre-level brief** — objectives, move count, boosters available
3. **Gameplay board** — 7×7 to 9×9 grid typical
4. **In-level pause** — quit, settings, hints
5. **Win screen** — stars + currency + animation
6. **Fail screen with retry / +5 moves for currency** — the monetization moment
7. **Meta-screen** — renovation, story scene, mansion progress
8. **Life timer / shop** — lives regen every 30 minutes (5 max)
9. **Booster shop** — pre-level powerups

## The 5 decisions you must make

### 1. What's the meta-narrative?
- **Renovation** (Royal Match, Homescapes) — clear levels to remodel rooms
- **Town building** (Toon Blast) — restore a town
- **Story progression** (Empires & Puzzles RPG meta) — progress a fantasy plot
- **No narrative** (classic Bejeweled) — bad commercial choice; only ship if it's a portfolio piece

### 2. Tile-swap or tap-to-clear?
- **Swap two adjacent tiles** (Candy Crush) — classic
- **Tap groups of same-color** (Toon Blast, Royal Match) — newer trend, more forgiving
- Tap-to-clear has overtaken swap in 2023+ mobile market share

### 3. Special tiles ladder?
- **3 in a row** → just clear
- **4 in a row** → striped tile (clears whole row/column)
- **5 in a row** → bomb / color-clear
- **L/T shape** → square-blast variant
- **Special + Special combinations** must be defined explicitly (Candy Crush has 15+ combo permutations)

### 4. Level objective types?
At least 4 different objectives keep content fresh:
- Collect N of a color
- Clear blockers (jelly, frosting, locked tiles)
- Drop items to the bottom
- Hit a score within move limit
- Spread/contain a hazard

Single-objective games die after level 50.

### 5. Life economy parameters?
- Lives: typically **5 max, regen 30 min each**
- Cost to refill: **$0.99 typical**
- Move-extension cost: **gem currency, ~$0.49 equivalent for 5 moves**
- Hard paywalls: **none** (genre etiquette — every level should be theoretically beatable for free)

## Reference games and the mechanism that makes each work

**Royal Match** — *king-rescue micro-cutscene as the carrot*. Every 5 levels triggers a 5-second animation of the king escaping a trap. This non-gameplay moment is what players actually return for. The puzzle is the toll booth between cutscenes.

**Candy Crush Saga** — *the difficulty oscillation pattern*. Levels alternate easy / medium / hard / hard / brick wall. The brick wall is the monetization choke point. King's data shows the median revenue level is between 200–400, where players hit walls repeatedly.

**Homescapes / Gardenscapes** — *renovation as the meta narrative*. Each level earns 1 star; stars unlock renovation tasks. Connecting *every* level to a tangible visual reward (room piece installed) doubled retention vs. pure-puzzle predecessors.

## Death traps to avoid

- **Skipping the meta-narrative** — match-3 without renovation/story has 70% lower D7 retention. The puzzle alone is not enough.
- **Hand-tuning every level** — by level 500 you can't sustain this. Bake **level archetypes** (15–20 templates) and parametrize them.
- **Hard paywalls** — even one level that can't be beaten without paying tanks store ratings. Every level must have a non-zero free win rate.
- **Move limits that punish over-thinking** — players who pause to plan are good players; they shouldn't run out of *time*. Move-limited (not time-limited) is correct.
- **Cascades that solve themselves** — if a board can clear its own objective via cascade chains, the player feels uninvolved. Design boards so cascades **set up** wins but don't auto-win.
- **Booster overuse making puzzles trivial** — if pre-level boosters guarantee a win, the puzzle stops being one. Cap boosters at 2 per level for normal levels.

## Recommended scope for AI generation

| Component | AI quality |
|---|---|
| Level templates (10–20 archetypes) | ✅ Excellent |
| Auto-generated levels from templates | ✅ Excellent — with solver validation |
| Renovation art (rooms, decor) | ✅ Good with generation tooling |
| Meta-narrative text | ✅ Excellent |
| Cascade physics tuning | ⚠️ Medium — needs engine playtest |
| Live-ops content treadmill (200+ levels) | ⚠️ Excellent in theory, fatigues in practice |

**The hard part is not making 1 level. It's making level 1 through 200 with monotonically tuned difficulty.** AI should generate candidates; a **solver** must validate that each level has a non-trivial win-path that takes the median number of attempts intended by the difficulty target.

**Realistic v0.1**: 50 levels, 4 objective types, 6 special-tile combos, basic life system, simple renovation meta (10 rooms). Web playable; mobile follows.

## MVP scaffold (output this first)

```
# [Game Name] — Match-3 Design Doc v0.1

## Pitch (one sentence)
[20 words: meta-theme + key mechanical twist]

## Core mechanics
- Swap or tap-to-clear?
- Board size: [N x M]
- Special tiles: [list with creation conditions and effects]
- Combo table: [special + special interactions, 5+ rows]

## Objective types (4 minimum for v0.1)
| Type | How player wins | Difficulty knobs |
|---|---|---|

## Level archetypes (10 minimum for v0.1)
| # | Objective | Blockers | Move count band | Solver-validated win rate |
|---|---|---|---|---|

## Difficulty curve plan
- Easy / Medium / Hard / Brick-wall ratio
- First brick wall at level [N]
- Levels 1-20: tutorial pacing
- Levels 20-50: variety introduction
- Levels 50-100: monetization onset

## Meta-progression
- Theme: [renovation / story / town]
- Reward unit: [stars, coins, tasks]
- 10 renovation milestones for v0.1

## Economy
- Lives: 5 max, 30-min regen
- Booster prices: [list]
- Move-extension price after fail
- No hard paywalls (confirmed)

## What's OUT of scope for v0.1
- Online events, leaderboards, social features, animated cutscenes
```

## See also

- `puzzle-games` for logic-grid puzzles (picross, sokoban)
- `incremental-games` if the renovation meta becomes the primary mechanic
- Future `economy-tuning` skill (Layer 2) for life/booster pricing models
