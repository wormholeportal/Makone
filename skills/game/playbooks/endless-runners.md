# Designing Endless Runners

## When to use this skill

The user wants a game where:
- The player character **moves forward automatically**, no input needed for motion
- The player's only input is **avoidance** (swipe lanes, jump, slide, tap)
- The level is **procedurally generated as the player runs**
- Sessions are **short (1–5 minutes)** and end in death
- **Distance / score** is the only success metric

If the player controls full 2D movement, see `platformers`. If runs have discrete combat, see `roguelikes`.

## The genre in 30 seconds

Endless runners are **the purest form of mobile gameplay**. One thumb, sub-minute sessions, no learning curve. The genre dominated mobile 2010–2018 and continues to ship reliable revenue. The hook:
1. **Anyone can play in 3 seconds**
2. **Sessions fit any gap** (elevator, queue, ad break)
3. **Score progression** + **collectible currency** drives compulsive replay
4. **Cosmetics + characters** monetize without affecting gameplay

Subway Surfers is the most-downloaded mobile game ever (4B+ downloads). The genre still works.

## The core loop (the heartbeat)

```
[Tap to start]
  │
  ▼
[Character auto-runs forward]
  │
  ├─ Swipe left/right (lanes)
  ├─ Swipe up (jump)
  ├─ Swipe down (slide)
  ├─ Collect coins, powerups
  │
  ▼
[Obstacle approach — 200-500ms to react]
  │
  ├─▶ Avoided: continue, speed slowly increases
  │
  └─▶ Hit: death animation, end screen
  │
  ▼
[Score + coin total → upgrade shop → next run]
```

A typical run lasts **45 seconds early on, 3+ minutes once skilled**.

## Required screens / states

1. **Title** with prominent "Tap to play"
2. **Character / costume select**
3. **In-game** — minimal HUD: distance, coins, current powerups
4. **Death + revive offer** (watch ad / spend currency for second chance — genre standard)
5. **End screen** — total distance, coins, run highlights
6. **Shop** — costumes, characters, gameplay upgrades (mild)
7. **Mission / daily challenge tracker** — drives D7 retention
8. **Settings / sound**
9. **(Mobile)** Ad placement points (interstitial post-run, rewarded for revive/double-coins)

## The 5 decisions you must make

### 1. Movement plane?
- **3-lane swipe** (Subway Surfers, Temple Run) — discrete left/center/right
- **Free 2D** (Vector, Geometry Dash) — analog precision
- **One-button jump** (Canabalt, Tiny Wings) — single input
- **Lateral + altitude** (Jetpack Joyride) — vertical position
- Lane-based is the most accessible. One-button is the most elegant.

### 2. Speed progression?
- **Constant speed, increasing obstacle density** (some classic runners)
- **Speed slowly increases over run** (most modern runners — feels like escalation)
- **Powerup-driven speed bursts** (Subway Surfers — temporary boosts)
- Linear speed ramp (e.g., +1% per 10 seconds) is the standard.

### 3. Procedural generation method?
- **Hand-authored chunks shuffled randomly** (most runners) — quality control
- **Fully procedural** (rare; harder to ensure fairness)
- **Wave-based difficulty bands** (early/mid/late chunks)
- Chunk-shuffling is the industry standard. Each chunk is **a hand-tested 5-second segment**.

### 4. Powerup system?
- **Magnets** (auto-collect coins) — universal
- **Hoverboard / shield** (one-hit save) — extends average run
- **Jetpack / boost** (skip section)
- **Multipliers** (2x, 3x score)
- 4–6 powerups is the sweet spot. More dilutes their power moments.

### 5. Monetization mix?
- **Ad-driven** (most successful runners) — interstitials + rewarded
- **F2P + cosmetics** — character / costume unlocks
- **Battle pass** (Subway Surfers added this in 2020+) — seasonal events
- **Premium** ($1.99 / no ads) — niche
- The genre's golden combination is **ad-driven + battle-pass cosmetics**.

## Reference games and the mechanism that makes each work

**Subway Surfers** — *seasonal world tours as the live-ops engine*. Every 2–3 weeks the entire visual setting changes (Tokyo, Paris, Marrakech). Same gameplay, fresh wrapper. Sustains retention for **a decade**. Demonstrates that endless runners thrive on **cosmetic refreshing, not mechanical depth**.

**Crossy Road** — *the perfect "one more try" loop*. Tap-to-hop forward, never holds the camera back, character collection adds joke variety (Pikachu-like easter eggs). Pioneered the **"free with cosmetic gacha"** mobile model.

**Alto's Adventure** — *atmosphere as the differentiator*. By layering serene visuals and music over standard endless-runner mechanics, captured an audience that didn't see itself as "mobile gamers." Lesson: **the genre is a vessel for tone**.

## Death traps to avoid

- **Obstacles that can't be seen in time** — reaction time must be **300ms minimum**. Test by placing obstacles 350ms ahead of current player speed.
- **Random-feeling deaths** — every death must feel like the player's fault, not the game's. Telegraph obstacles clearly.
- **Slow respawn / loading** — must be **under 2 seconds**. Players quit if the next run takes too long to start.
- **No revive offer** — every modern runner offers a "watch an ad / spend currency to continue your run." Forgetting this kills retention AND revenue.
- **Powerups that feel mandatory** — if winning requires powerup spamming, the gameplay becomes a slot machine. Powerups should **extend**, not enable.
- **Skipping the daily mission system** — without daily/weekly missions, the genre has zero retention scaffolding past day 3.
- **Cluttered HUD** — minimum HUD: distance + coin count. Move powerup indicators to small icons.
- **No haptic feedback** (on mobile) — vibration on coin collect, jump, and death is **essential** on mobile.

## Recommended scope for AI generation

**This is one of the most AI-friendly mobile genres.** Reasons:
- Content is small (one character running, one environment)
- Generation is chunk-based (highly tabular)
- Audio is one music loop + sound effects
- Visual style supports stylized / low-poly aesthetics

| Component | AI quality |
|---|---|
| Chunk generation (procedural segments) | ✅ Excellent |
| Character / costume design (cosmetic gacha) | ✅ Excellent |
| Environment art (3D-low-poly or 2D-stylized) | ✅ Good |
| Powerup design | ✅ Good |
| UI / HUD | ✅ Good |
| Music (single energetic loop) | ⚠️ Medium |
| Live-ops content treadmill | ✅ Good for cosmetics, weak for gameplay variety |

**Realistic v0.1**: 1 character, 1 environment, 30 hand-authored chunks (~15 minutes of unique gameplay), 5 powerups, 10 unlockable costumes, daily mission system. **2-week ship target with strong tooling.**

## MVP scaffold (output this first)

```
# [Game Name] — Endless Runner Design Doc v0.1

## Pitch (one sentence)
[20 words: character / setting + the central twist]

## Movement
- Style: [3-lane / free-2D / one-button]
- Base speed: [N units/sec]
- Speed ramp: +X% per [Y] seconds
- Reaction window: [N ms minimum to all obstacles]

## Inputs
- [Swipe left/right / Jump up / Slide down]
- (Mobile) haptic feedback on: [coin collect / jump / death]

## Chunk system
- Chunk length: [N seconds at base speed]
- 30 chunks for v0.1
- Difficulty bands: Easy (1-10) / Mid (11-20) / Hard (21-30)
- Shuffling rules: no two same chunks back-to-back, escalating difficulty band over time

## Obstacles (8-10 types)
| Obstacle | Lane | Avoidance | Telegraph time |
|---|---|---|---|

## Collectibles
- Coins: 1-coin trails along optimal paths
- Powerup pickups: spaced every 30-60 seconds
- Mystery boxes: rare, contain bonuses

## Powerups (5 minimum)
| Name | Duration | Effect | Stacking? |
|---|---|---|---|

## Death + revive
- Death animation: <1 second
- Revive offer: 1x per run, costs [ad / N currency]
- Continue spawns invuln 1.5 seconds

## Daily / weekly missions
- 3 active dailies
- 1 weekly with bigger reward
- Categories: distance / coins / specific actions

## Cosmetics (10 for v0.1)
- 5 character skins
- 5 board / vehicle skins
- Gacha or direct purchase

## Monetization plan
- Rewarded ads: revive, 2x coins, mission skips
- Interstitial: every 3 runs (Mobile)
- IAP: remove-ads $1.99, costume packs $2.99-4.99
- (Optional) Battle pass post-launch

## What's OUT of scope for v0.1
- Multiplayer, leaderboards (could add later), additional environments
```

## See also

- `platformers` if the player gets analog control
- `incremental-games` for the meta-progression and cosmetic shop curves
- `survivors-likes` if combat with auto-aim replaces obstacle avoidance
