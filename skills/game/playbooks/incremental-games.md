# Designing Incremental Games

## When to use this skill

The user wants a game where:
- A primary number (currency, score) grows **exponentially**, not linearly
- Player choices affect **growth rate**, not finite resources
- Progress continues while the game is closed (idle) or active (clicker)
- The player periodically **resets** for permanent multipliers (prestige)
- Unlocks reveal **new mechanics** every doubling-period

If progress is bounded (e.g., complete N levels), it's not incremental — see other genres.

## The genre in 30 seconds

Incremental games turn the **dopamine of seeing numbers go up** into a structural mechanic. The player's role is not to "play" in the traditional sense, but to:
1. **Optimize the growth rate** (which upgrade is best ROI?)
2. **Decide when to prestige** (sacrifice current progress for a permanent multiplier)
3. **Discover the next layer** (each doubling reveals new content)

The genre's secret is that **gameplay = math curiosity**. Players who love spreadsheets love this genre.

## The core loop (the heartbeat)

```
[Tap / wait for primary currency to accumulate]
  │
  ▼
[Buy upgrades that increase currency-per-second]
  │
  ▼
[Unlock new generator / mechanic at next milestone]
  │
  ▼
[Eventually: prestige → reset, gain permanent multiplier]
  │
  ▼
[Repeat with faster growth]
```

The loop has **three nested timescales**:
- **Seconds**: tap or watch number tick up
- **Minutes**: buy next upgrade, unlock next generator
- **Hours/Days**: prestige reset for permanent boost

A successful incremental hits all three timescales within the first hour.

## Required screens / states

1. **Main screen** — primary number prominent, big tap button (clicker) or watch-it-grow display
2. **Generators / upgrades panel** — what you can buy, sorted by ROI
3. **Prestige screen** — when unlocked, shows current vs. post-prestige projection
4. **Achievements panel** — provides micro-goals between major unlocks
5. **Stats / lifetime metrics** — total earned, time played, prestiges completed
6. **Settings** with **offline progress toggle** and **notation switcher** (1.5M / 1.5e6 / 1.5 million)
7. **(Optional) Story / lore feed** that unlocks with milestones (Universal Paperclips style)

## The 5 decisions you must make

### 1. Idle, Clicker, or Hybrid?
- **Pure idle** (Melvor Idle, NGU Idle) — no required tapping, optimize from a dashboard
- **Clicker** (Cookie Clicker early, Tap Titans) — tapping is the primary input
- **Hybrid** (most modern: Adventure Capitalist, AFK Arena) — tap for early boost, idle for late game
- Hybrid is the safe commercial default. Pure idle has a cult audience.

### 2. Currency / dimension count?
- **1 currency** (Cookie Clicker — cookies only at v1.0)
- **2 currencies** (one active, one prestige)
- **N currencies / dimensions** (Antimatter Dimensions — each tier produces the next)
- More currencies = more decision depth, but onboarding gets harder. Default to **1 + 1 prestige**.

### 3. Prestige design?
- **Symmetric** — prestige resets *most* progress, multiplier scales with what you reset
- **Asymmetric / tiered** — multiple prestige layers, each more powerful
- **Story-gated** — prestiges reveal narrative beats
- First prestige should be reachable in **2–4 hours** of fresh play. Too early feels meaningless; too late and players quit before discovering it.

### 4. The "endgame" content reveal cadence?
The genre's deepest hook is **"oh god there's MORE?"** moments. Plan **5–8 layer reveals** for the player's first 50 hours:
- Layer 1: Basic currency + generators
- Layer 2: First prestige (multiplier)
- Layer 3: Second prestige currency (challenges, achievements, etc.)
- Layer 4: A whole new mechanic (auto-clickers, AI, factories)
- Layer 5: Meta-prestige
- Layer 6: ???

Each reveal should arrive **just as** the previous loop becomes boring.

### 5. Notation strategy?
Numbers will get massive (10^308 typical, 10^10000 possible). Decide:
- **Scientific** (1.5e+12) — clearest for math people
- **Engineering suffixes** (1.5T = trillion) — clearest for casual
- **Custom dictionaries** (Antimatter Dimensions: "Vigintillion") — community in-joke
- **Always provide a switcher** in settings — it's a low-effort, high-goodwill feature.

## Reference games and the mechanism that makes each work

**Universal Paperclips** — *narrative as the entire game*. The numerical progression maps to a story arc: paperclip company → AI → universe-conquering machine. Each prestige is a story beat. Demonstrates incrementals can be **literary**, not just spreadsheets.

**Cookie Clicker** — *the "grandma apocalypse" mid-game*. Around 30 hours in, the meta-narrative gets weird and self-aware. Players who pushed through pure-grind phases are rewarded with absurdist humor. This is the genre's "stick with it" payoff.

**Antimatter Dimensions** — *each prestige layer adds an entire new game*. By layer 5 the player is playing a fundamentally different game than at hour 1. The "I'm not playing the same game anymore" feeling is the genre's most addictive lever and the hardest to design.

## Death traps to avoid

- **Linear growth** — if numbers grow linearly, players quit at hour 1. **Exponential or doubling is the baseline**, super-exponential (tetration) for late game.
- **Idle time mismatched to player schedule** — if it takes 8 hours to unlock the next thing but players check in twice a day, every check feels wasted. Tune so something interesting happens **every 30 minutes of active play and every 4 hours of idle**.
- **Reset shock at first prestige** — if the first prestige doesn't immediately make growth visibly faster (within 30 seconds of resetting), players quit forever. Show the **post-prestige preview** before they commit.
- **No goals between milestones** — the gap between layers must be filled with **achievements**, micro-upgrades, lore drops, ANYTHING. Empty exponential grind is misery.
- **Mobile + ads done badly** — if every prestige triggers an unskippable ad, retention dies. Ads should be **opt-in for double-rewards**, never blocking.
- **No offline progress** — idle games that don't accrue while closed feel broken. Default to **80% efficiency offline up to 8 hours**.

## Recommended scope for AI generation

This genre is **mathematically deep but content-light**, which suits AI well.

| Component | AI quality |
|---|---|
| Generator names + themes (50–200) | ✅ Excellent |
| Curve tuning (cost, output, scaling) | ⚠️ Needs simulator |
| Achievement list (50–100) | ✅ Excellent |
| Narrative beats (Universal Paperclips-style) | ✅ Strong |
| Visual identity (often spreadsheet-y is fine) | ✅ Easy |
| Prestige formula design | ⚠️ Medium — math validation needed |

**Critical AI weakness**: balance tuning. The curves must be **simulated**, not just designed. A misplaced exponent makes the game finish in 10 minutes or take 10,000 years.

**Realistic v0.1**: 1 currency, 8 generators, 1 prestige layer, 30 achievements, scientific notation. **Browser playable, single HTML file**. Add layers in updates.

## MVP scaffold (output this first)

```
# [Game Name] — Incremental Design Doc v0.1

## Pitch (one sentence)
[20 words: theme + the one weird hook]

## Core math
- Primary currency: [name]
- Currency-per-second formula: [generator outputs summed]
- Base growth rate: [target doubling time = N seconds early game]
- Prestige multiplier formula: [based on what variable]

## Generators (8 minimum for v0.1)
| # | Name | Base cost | Cost growth | Base output | Theme |
|---|------|-----------|-------------|-------------|-------|
| 1 | ...  | 10        | x1.15       | 0.1/s       | ...   |
| ... |

## Upgrades layer
- Per-generator upgrades (2-3 per generator)
- Global multipliers (5+)
- Conditional unlocks (3+)

## Prestige
- Trigger: at [N] primary currency
- Resets: [list]
- Awards: [N] prestige currency = [formula]
- Permanent boost: each prestige currency = +X% to [stat]

## First-prestige projection
- Target: player reaches first prestige in [N] hours
- Second prestige: [N] hours after first
- Third: feels like a different game

## Achievements (30 for v0.1)
| Tier | Trigger | Reward |
|---|---|---|

## Offline progress
- Yes, [N]% efficiency, max [N] hours

## What's OUT of scope for v0.1
- Multiple prestige layers, multiplayer leaderboards, microtransactions
```

## Required validation step

Before shipping, **simulate the entire game with a script** assuming a "default-decision" player. The simulation must answer:
- Time to first prestige (target: 2–4h)
- Time to feel "stuck" (target: never within 50h)
- Number-of-decisions per hour at hour 1, 10, 50 (should NOT be near 0 at any point)

## See also

- `match-3` — if level progression replaces pure number-go-up
- `autobattlers` — if combat replaces tapping as the "active" mode
- Future `economy-curve-tuning` skill (Layer 2)
