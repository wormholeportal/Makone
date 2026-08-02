# Reward schedules — variable ratio is the strongest

> **B.F. Skinner 1957: fixed reward < variable interval < variable ratio (most addictive).
> Let player be uncertain when next reward comes, but certain it will come.
> This is the shared psychological foundation of slot machines, loot boxes, roguelikes, and gacha games.**

## One-liner

Give reward every time → player indifferent ("they always give").
Give reward randomly → player obsessed ("will I get it this time?").

This is neutral technology, not moral instruction. Used well = player exploration; used poorly = exploitation.

## Why

B.F. Skinner in 1950s rat-lever experiments discovered 4 reward schedules, ranked by "behavior persistence":

| Schedule | Description | Behavior persistence |
|---|---|---|
| **Fixed Ratio** (every N times give once) | 1 food pellet per 10 presses | Medium |
| **Fixed Interval** (every N seconds give once) | 1 pellet per 60 seconds | Weak |
| **Variable Ratio** (average every N times give once) | Average 1 per 10, but actually 5-15 random | **Strongest (press for hours non-stop)** |
| **Variable Interval** | Average 60 sec, but actually 30-90 random | Strong |

Game rewards follow same rules:
- **Variable Ratio**: enemies drop loot (10% drop rate but which kill is random)
- **Variable Interval**: boss appears (every 30-60 minutes one)

Why *Diablo* gets 100 hours grinding one artifact, *Pokémon* gets 100 hours hunting one shiny.

## Quantified standards

**Perfect variable ratio parameters**:
- Average drop rate: 5-30% (depends on item value)
- Actual distribution: Poisson or geometric (not "guaranteed every 10")
- Drought safety net (pity timer): guarantee 1 after 50-100 attempts (prevents extremely unlucky players quitting)

**Psychology curve**:
```
Player excitement ↑
            /\          /\           /\     ← spike on pull
           /  \        /  \         /  \
          /    \      /    \       /    \
         /      \    /      \     /      \
   ─────╯        \\╱╯        \\╱╯        \────
                                              time
```

No-reward period: player slightly drops, expects "coming soon."
Reward moment: peak.
Then expects next.

This rhythm keeps player **forever waiting for next**, can't stop.

## Design examples

### 1. *Diablo II* artifact drop rate

Each monster 0.01-1% artifact rate. Player grinds 100,000 monsters might see 3-5 artifacts total.
But each monster death: loot on ground → player walks over to check → 99% junk → but 1% isn't.
Exactly this 1% keeps player grinding.

### 2. *Vampire Survivors* upgrade randomness

Each upgrade is pick-1-of-3, randomized from 50+ options pool.
Even after 100 upgrades you don't know what's next.
Player: got exactly what I wanted → "I'm so lucky" → dopamine.
Didn't get it → "next upgrade it'll come" → keep playing.

### 3. *Slay the Spire* card rewards

Each battle end: pick 1 of 3 cards, randomized from 200+ card pool.
Lucky runs → strong build; unlucky → adapt.
Every run is new combo, 1000 runs never repeat.

### 4. Gacha games (mobile)

Each pull 1%-3% for 5-star.
- First 50 pulls no 5-star → anxiety
- Pull 50 gets 5-star → extreme excitement ("almost didn't get it, but got it!" — near-miss effect)
- Even pull 100 without 5-star, pity guaranteed → player doesn't quit

Commercially ultra-successful (also ultra-controversial).

## Different reward types need different schedules

### Big rewards (rare): Variable Ratio

- Artifacts
- 5-star characters
- Key progression items

Drop rate 1-10%, gives players "surprise."

### Medium rewards (common): Fixed Ratio + Variable Quality

- Kill base XP
- Common gear
- Resources

Give every time, but **quality** varies (white/green/blue/purple rarity).

### Small rewards (feedback): Fixed (every time)

- Kill particles
- Screen shake
- Number pop-ups
- Sound effects

Give every time as "feedback" not "surprise."

### Meta rewards (progress): Fixed Interval

- Level ups
- Unlock content
- Story progression

Deterministic progress gives "effort matters," balances randomness chaos.

## 7 common reward mechanisms

1. **Loot drop**: monster death random chance drop
2. **Gacha**: spend resource for one random pull
3. **Chest**: find chest → contents random
4. **Roguelike upgrade**: upgrade is pick-1-of-N
5. **Quest reward**: complete quest → specific (deterministic)
6. **Achievement**: complete challenge → specific (deterministic)
7. **Daily**: variable interval (once per day)

Best design = mix multiple. Both deterministic + random.

## Anti-pattern

### 1. Excessive variable ratio (addiction design)

```
Player keeps investing but returns diminish (manipulation)
Eventually emotional burnout → quit + negative reviews → business failure
Example: early EA Star Wars Battlefront 2 loot box backlash
```

**Correct**: variable ratio gives player **progress feeling**, not extraction.
Ensure 100-hour player is genuinely stronger than 10-hour player (even with random in between).

### 2. Fake randomness

```
"10% drop rate" actually 1%
Player discovers, reputation craters
```

Numbers must be honest public (Chinese law requires disclosure).

### 3. Pure random, no pity

```
50 pulls, still no 5-star
Player quits
```

Variable ratio must pair with pity timer.

### 4. Reverse: 100% drop

```
Every kill guarantees artifact
Player collects all in 5 minutes → no goal
```

Becomes *Cookie Clicker* style pure number clicking, lacks mystery.

### 5. Reward disconnected from gameplay

```
"Kill 100 monsters → get one gear"
Player doesn't care about gear, just "need to reach 100"
```

Reward should **feed back into gameplay**, make player think "now stronger, can challenge harder content."

## Implementation in Makone / Three.js

**1. Loot system**

```js
const lootTable = [
  { item: 'gold_coin', weight: 60 },      // 60% chance
  { item: 'health',    weight: 20 },
  { item: 'rare_gem',  weight: 15 },
  { item: 'epic_item', weight: 4 },
  { item: 'legendary', weight: 1 },
]

function rollLoot() {
  const totalWeight = lootTable.reduce((s, x) => s + x.weight, 0)
  let r = Math.random() * totalWeight
  for (const entry of lootTable) {
    r -= entry.weight
    if (r <= 0) return entry.item
  }
}
```

**2. Pity system**

```js
let runsSinceLegendary = 0
function rollLootWithPity() {
  runsSinceLegendary++
  if (runsSinceLegendary >= 50) {
    runsSinceLegendary = 0
    return 'legendary'  // pity guarantee
  }
  return rollLoot()
}
```

**3. Upgrade option randomness**

```js
function showUpgradeOptions() {
  // Not fixed pick-1-of-3, randomize 3 from large pool
  const all = getAllUpgrades()
  const offered = pickRandomN(all, 3)
  return offered
}
```

**4. Dopamine feedback loop**

```js
function onItemDrop(item) {
  // Drop moment gets multiple juice layers
  if (item.rarity === 'legendary') {
    screenFlash(0.5, 'gold')
    hitstop(300)
    playSound('legendary_drop')
    showBigText(item.name)
    spawnGoldParticles(50)
  }
  // Common drops still get small feedback
  else {
    showFloatingText('+' + item.name)
    playSound('pickup')
  }
}
```

## Ethical responsibility

Powerful tool carries abuse risk. Designers must proactively avoid:

1. **Don't design forced-loss-for-reward** (gambling)
2. **Don't exploit "sunk cost fallacy"** to keep players investing
3. **Publish real drop rates**
4. **Don't use variable ratio as primary progression in children's games**
5. **Give player obvious "stop here" milestone**

Games should **delight** player, not **addict** them. Designer's professional ethics.

## Related skills

- `skills/game/mechanics/interesting-decisions.md` — reward options must be interesting choices
- `skills/game/mechanics/risk-reward.md` — risk for reward
- `skills/game/mechanics/difficulty-arc.md` — reward rhythm matches difficulty rhythm

## References

- B.F. Skinner, *Schedules of Reinforcement* (1957)
- Jamie Madigan, *Getting Gamers: The Psychology of Video Games* (2015)
- Jesse Schell, *The Art of Game Design* (Lens of Reward)
- Daniel Cook, *Loops and Arcs* (Lostgarden)
- Adrian Hon, *You've Been Played: How Corporations, Governments, and Schools Use Games to Control Us All* (2022) — ethical critique of variable ratio
