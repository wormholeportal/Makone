# Interesting decisions — every choice must have trade-offs

> **When designing any choice point, ensure at least 2 options have incomparable trade-offs (apples vs oranges),
> making the optimal solution depend on player's additional info, long-term plan, or style preference.
> A choice without true trade-off is a false choice.**

## One-liner

"3 options + 1 obvious best" = 1 option;
"3 options + each has strengths/weaknesses" = player hesitates = design succeeds.

## Why

See `skills/game/axioms/meaningful-choice.md`.
This covers **how to concretely design** decisions with trade-offs.

Trade-off essence is **information asymmetry or short/long-term conflict**:
- No mathematical optimal solution (pareto frontier)
- Or optimal depends on future info (unknowable)
- Or optimal depends on player style (no objective answer)

If your options let you math out "best," it's not a choice—it's a math problem.
Player solves math once, then mechanically repeats = not a game.

## Quantified standards

**3D test** (any choice must differ in at least one dimension):

1. **Power difference** (direct comparative force)
2. **Trigger condition difference** (when to use / how to use)
3. **Side-effect difference** (what consequence follows)

If all three identical → don't need option, keep one
If different only in 1 → high value obviously best, false choice
If different in 2 → player picks by situation, true trade-off
If different in 3 → player picks by long-term plan, deep trade-off

## 7 trade-off design templates

### 1. Risk-Reward

Most common. Similar expected value but different variance.

```
A: 100% get 50 points
B: 50% get 0, 50% get 150 points
```
Both expect ~75 points, but B is riskier. Player chooses by risk tolerance.

Examples:
- *Pac-Man*: eat power-up and chase ghosts (high score but risky) vs safe pellet eating
- *Slay the Spire* events: usually offer players 2-3 risky options

### 2. Specialization (Strong/Weak Niche)

Each option excels in one context, fails in others.

```
A: Fire weapon (300% vs ice enemies, 30% vs fire enemies)
B: Ice weapon (opposite)
C: Physical weapon (constant 100%)
```

Player must pick by current enemy type. Diverse enemies → pick C; all-ice map → pick A is godlike.

Examples:
- *Pokémon* type matchups
- *Slay the Spire* deck building (damage vs defense vs draw cards)
- *Zelda BotW* weapon variety

### 3. Immediate vs Delayed

Short-term vs long-term.

```
A: +50 HP now
B: +0.5 HP/sec for next 5 min (150 HP total)
```

Under fire → pick A; just cleared a room → pick B.

Examples:
- MOBA items (attack vs attack speed vs crit)
- *Civilization* tech choice (short-term units vs long-term wonders)
- *Hades* boon upgrades (instant buff vs stacking bonus)

### 4. Mutually Exclusive Paths

Choose A and never see B.

```
A: Enter red door → fight boss
B: Enter blue door → explore secret
You can only enter one
```

Examples:
- *Slay the Spire* map branching
- *Zelda BotW* "memories" exploration order
- *Witcher 3* main quest branches

Deepest trade-off because player must imagine "what if I chose the other?"

### 5. Opportunity Cost

Resources scarce. Give A means can't give B.

```
You have 3 upgrade picks from:
- Attack +50%
- Speed +30%
- Max HP +100
- Defense +50%
- Crit rate +25%
Choose 3.
```

Examples:
- *Diablo* stat allocation
- *Path of Exile* skill tree
- *Slay the Spire* relics

### 6. Tempo Choice (Pace)

Let player decide "fast or slow."

```
A: Rush to goal (fast but risky)
B: Collect all items first (slow but safe)
```

Examples:
- *Super Mario Bros*: rush flag vs collect all coins
- *Pac-Man*: cross maze vs take long route
- *Zelda BotW*: straight to boss vs level up first

### 7. Aesthetic Preference (Style)

No objective best, pure personal taste.

```
A: Fireball (flashy)
B: Lightning arrow (elegant)
C: Summon wolf (companionship)
All deal identical damage
```

Examples:
- *Bayonetta* weapon choice
- *Overwatch* hero choice
- *Death Stranding* route planning

Lowest strategically (doesn't deepen tactics) but highest expressively (player self-expression).

## Anti-pattern: False choices

**1. One obvious best**
```
A: +10 attack
B: +20 attack     ← obviously pick B
C: +5 attack
```

**2. Completely equivalent**
```
A: +20 attack power
B: +20 attack damage   ← same meaning
C: +20 combat strength
```
Just padding options into meaninglessness.

**3. Math instantly solves it**
```
A: 5 damage/sec
B: 4 damage/sec but 30% crit (2x)
```
B expected = 4 × 1.3 = 5.2 > A's 5. Obviously pick B. Always.

Fix: make math unsolvable. E.g., add "crit triggers health restore 5" (depends if build needs it).

**4. Insufficient info to judge**
```
Unknown boss room, pick attack / defense / speed
Don't know who boss is, just guessing
```
Becomes pure luck, not strategy.

Fix: give hints ("boss rumored to fear fire," "map shows fire pits").

## Decision density design

Ideal: one interesting decision every 5-30 seconds (see `meaningful-choice.md`).

| Game type | Decision frequency | Example |
|---|---|---|
| Real-time strategy (RTS) | every 5-10 sec | *StarCraft* resource allocation |
| Platformer action | every 10-20 sec | which path / which item |
| Roguelike battle | every 30 sec | *Slay the Spire* each card |
| Turn-based strategy | every 1-3 min | *Civilization* each turn |
| MMORPG | per-fight + daily + weekly | gear / dungeon choice |

Below this frequency players feel empty.

## Implementation in Makone / Three.js

**1. Upgrade system template**

```js
function rollUpgradeOptions() {
  // Don't randomize 3 "best" picks, randomize 3 different dimensions
  const dimensions = [
    () => ({ name: 'Attack +30%', effect: 'damage', value: 0.3 }),
    () => ({ name: 'Speed +20%', effect: 'speed', value: 0.2 }),
    () => ({ name: 'Range +50%', effect: 'range', value: 0.5 }),
    () => ({ name: 'Health regen', effect: 'regen', value: 1 }),
    () => ({ name: 'AOE but -50% single target', effect: 'aoe', value: 1 }),
    // Match build styles
  ]
  return pickN(dimensions, 3).map(f => f())
}
```

**2. Path branching**

```js
// Show two paths clearly on map for player
const left = { difficulty: 'easy', reward: 'small chest' }
const right = { difficulty: 'hard', reward: 'boss + big loot' }
// Player must see both before deciding
```

**3. Resource scarcity**

```js
// Don't give player infinite resources
const player = { mana: 100 }
const spells = [
  { cost: 30, damage: 20 },   // small spell multiple times
  { cost: 80, damage: 60 },   // big spell once
]
// Player decides: chain 3 small spells (90 mana, 60 total damage) or 1 big spell (80, 60 damage)?
// Math equivalent → add side effects to distinguish
// Small: scattered damage has lifesteal proc chance
// Big: single-point high damage has knockback
```

## Related skills

- `skills/game/axioms/meaningful-choice.md` — this concretizes it
- `skills/game/mechanics/risk-reward.md` — template #1 detailed
- `skills/game/mechanics/resource-economy.md` — template #5 detailed
- `skills/game/mechanics/difficulty-arc.md` — decision intensity scales with difficulty

## References

- Sid Meier, "Interesting Decisions" (GDC 1989, 2012)
- Jesse Schell, *The Art of Game Design* (Lens of Meaningful Choice)
- Daniel Cook, *Loops and Arcs* (Lostgarden blog)
- Soren Johnson, *Designer Notes* podcast
- *Slay the Spire* design postmortem
