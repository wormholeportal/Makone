# Designing Autobattlers

## When to use this skill

The user wants a game where:
- The player **drafts units** from a randomized shop each round
- Units are **placed on a board** before combat starts
- Combat **runs automatically** — no real-time input during fights
- Rounds alternate: **shop phase** (player decisions) and **combat phase** (watch)
- Multiple opponents (PvP or simulated) compete in parallel

If the player gives orders during combat, it's a tactics RPG, not an autobattler. If there's no shop/draft loop, see `deckbuilders`.

## The genre in 30 seconds

Autobattlers separate **drafting decisions** from **combat execution**. The player's job is to:
1. Spend limited gold on units in a randomized shop
2. Combine 3 identical units to upgrade (the "stack-up" mechanic)
3. Build **synergies** (warriors + dragons, etc.)
4. Position units on a grid for combat
5. Adapt strategy based on opponents' visible boards

The genre is essentially **a poker hand made of units** — you're playing against the shop randomness AND against other players.

## The core loop (the heartbeat)

```
[Shop phase, ~30 seconds]
  │
  ├─ Buy units (gold limited)
  ├─ Sell or reroll
  ├─ Place / reposition on board
  └─ Combine 3-of-a-kind for upgrade
  │
  ▼
[Combat phase, ~30 seconds]
  │
  └─ Watch units auto-fight opponent's units
  │
  ▼
[Result: win/lose HP, earn gold]
  │
  ▼
[Repeat 15-30 rounds; eliminate by HP loss]
```

A typical game is **6–8 elimination rounds** in a lobby of 8 players, lasting 30–45 minutes total.

## Required screens / states

1. **Main menu** — quickplay, ranked, custom
2. **Lobby / matchmaking**
3. **Shop + board screen** — the primary screen
4. **Combat screen** — same board, animated combat
5. **Opponent board scout** — see what others are building (with cooldown)
6. **Synergy / trait tracker** — shows which traits are active and at what tier
7. **Round result** — damage dealt/taken
8. **Post-game** — placement, XP, rewards
9. **Unit collection / progression** — meta meta-game

## The 5 decisions you must make

### 1. PvP, single-player, or hybrid?
- **8-player PvP** (TFT, Battlegrounds) — the genre standard
- **Single-player vs AI / simulated opponents** (Super Auto Pets — PvP via async)
- **Single-player with shop puzzle** (Backpack Battles — actually PvP but feels solo)
- PvP is the genre's intended form. Single-player variants are **easier to launch** but harder to retain.

### 2. Unit upgrade mechanic?
- **3-of-a-kind combines into upgraded unit** (TFT, Underlords) — classic
- **Items / equipment on units** (TFT items, Backpack Battles)
- **Tags / synergies / traits** that activate at unit counts (TFT origins + classes)
- All three layered together is the genre standard.

### 3. Shop economy?
- **Reroll cost** (TFT: 2 gold per shop refresh)
- **Locking shop** (one card kept for next round)
- **Interest** (TFT: +1 gold per 10 gold saved, capped)
- **Streak bonuses** (consecutive wins/losses earn bonus gold)
- The interplay creates strategic depth. **All four mechanics are now considered standard.**

### 4. Board size?
- **Small grid** (TFT: 4 rows × 7 columns, 9 active spots max)
- **Lane-based** (Hearthstone Battlegrounds: single line of 7)
- **Free placement** (Super Auto Pets: 5 slots, no grid positioning)
- Board complexity scales game depth and design cost.

### 5. Unit / synergy count for launch?
- **20–40 units, 8–12 synergies** for v0.1
- TFT launches sets with **~50 units and 20 traits**, rotating every 6 months
- More content = better retention but **massive balance cost**

## Reference games and the mechanism that makes each work

**Teamfight Tactics (TFT)** — *the "set rotation" content treadmill*. Every 6 months Riot replaces ~80% of units and synergies. This avoids the genre's biggest threat (solved meta) by forcing players to re-learn. Demonstrates the genre **must rotate content** to survive.

**Hearthstone Battlegrounds** — *the lane simplification*. By removing positioning depth (one lane only), reduced complexity 50% and tripled audience. Lesson: **less placement complexity broadens audience but loses hardcore depth.**

**Super Auto Pets** — *async PvP with full free-to-play access*. Players queue against historical board snapshots, not live opponents. Eliminates skill-gap problems and queue times. The most accessible variant.

## Death traps to avoid

- **Combat where the result is obvious** — if you can predict the winner before combat starts, the combat phase is dead time. Variance must be **enough to surprise but not enough to feel random**.
- **Snowballing leaders** — if the player ahead at round 5 wins 90% of games, the genre dies. Tune **comeback mechanics**: streaks, bonus gold for losing, scaling synergy power for low-HP players.
- **Solved metas** — if a single composition dominates, the genre dies. Either: rotate content (TFT), constant patches (Battlegrounds), or design with **rock-paper-scissors** at the synergy level.
- **No scouting** — players must be able to see opponent boards. Without this, the genre loses **adaptive strategy** (genre's deepest hook).
- **Bad synergy explanations** — players need to understand traits at a glance. Cluttered UI sinks the genre.
- **Long shop animations** — players want to decide fast. Shop reroll, unit buy, and unit place must all happen in **under 0.5 seconds each**.

## Recommended scope for AI generation

| Component | AI quality |
|---|---|
| Unit design (stats + abilities) | ✅ Good with strong taxonomy |
| Synergy / trait design | ✅ Good |
| Balance via auto-play simulation | ⚠️ CRITICAL — must build simulator |
| Combat AI (target selection, ability triggers) | ⚠️ Medium |
| Art (unit portraits, board) | ✅ Good |
| Animation (attacks, hit feedback) | ⚠️ Medium |
| Online netcode / matchmaking | ❌ Out of scope for AI gen |

**Critical AI weakness**: PvP balance. The genre **demands** a balance simulator that auto-plays 100,000+ matches with varied strategies to identify dominant compositions. Without this, the meta gets solved in 24 hours of public play.

**Realistic v0.1**: **Single-player vs simulated opponents** (skip live PvP). 30 units, 10 synergies, 1 board shape, simple combat AI. Async or solo only.

## MVP scaffold (output this first)

```
# [Game Name] — Autobattler Design Doc v0.1

## Pitch (one sentence)
[20 words: theme + the unusual mechanical twist]

## Mode for v0.1
- Single-player vs simulated opponents (confirmed)
- Lobby size: 8 (simulated)
- Game length: 20-30 minutes

## Board
- Grid: [N × M, frontline / backline split if applicable]
- Active unit cap by player level

## Economy
- Starting gold: [N]
- Gold per round: [N + win bonus + interest at 10/20/30/40/50]
- Reroll cost: [N]
- XP / level cost: [N]

## Units (30 minimum for v0.1)
| Name | Tier (1-5) | Cost | HP | DMG | AS | Traits | Ability |
|---|---|---|---|---|---|---|---|

## Synergies / traits (10 minimum)
| Trait | 2-unit effect | 4-unit effect | 6-unit effect |
|---|---|---|---|

## Round structure
- Rounds 1-3: gold ramp, tutorial-ish opponents
- Rounds 4-8: synergy formation
- Rounds 9-15: late game scaling
- Rounds 16+: endgame

## Combat AI rules
- Target selection: [closest / lowest HP / by class]
- Ability triggers: [mana bar / random / cooldown]

## Required: balance simulator
- Auto-play 10,000 games per balance pass
- Track win rate per synergy at each tier
- Flag dominant compositions (>52% win rate)

## What's OUT of scope for v0.1
- Live PvP, ranked ladder, seasonal rotation, item/equipment system
```

## See also

- `deckbuilders` if cards replace units as the draft target
- `tower-defense` for the related "watch your defense execute" pattern
- Future `pvp-balance-simulator` skill (Layer 4)
