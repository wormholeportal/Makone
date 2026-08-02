# Difficulty arc — teach → master → pressure → catharsis → new lesson

> **Every game (whether 30 minutes or 100 hours) must follow an undulating curve:
> Learn something new → Apply with confidence → High-pressure challenge → Overcome and exhale → Introduce something new and repeat.
> Linear increasing difficulty ("gets harder and harder") is the most common beginner designer mistake.**

## One-liner

Humans are immune to monotonic increase.
What keeps players hooked isn't high difficulty, it's the **rhythm of difficulty changes**.
Slowly cranking a song's volume from 0 to 100 is not music — the dynamics of rise and fall make it music.

## Why

The human brain is sensitive to **change** and numb to **constancy** (sensory adaptation).
Sustained 1-hour high difficulty → players go numb → treat high difficulty as normal → no longer feel stimulated
Sustained 1-hour low difficulty → players bored → quit

Games need **contrast**:
- Low difficulty zones exist to make high difficulty zones feel high
- High difficulty zones exist so players remember "that was amazing" while resting in low difficulty
- No contrast = no experience

Film uses the same editing principle (slow-fast-slow-fast), games even more so.

## Quantified standards

**"5-Act" structure** (within each chapter / level / zone):

| Phase | Time allocation | Difficulty | Design purpose |
|---|---|---|---|
| 1. **Teaching** | 10-15% | Low | Introduce new mechanic / enemy / rule |
| 2. **Mastery** | 25-30% | Medium-low | Repeated application, build confidence |
| 3. **Synthesis** | 25-30% | Medium-high | New and old mechanics combined test |
| 4. **Climax** | 15-20% | High | Composite boss / ultimate challenge |
| 5. **Catharsis + Transition** | 10-15% | Low | Reward for victory, transition to next chapter |

**Benchmark**: 30-minute level = 3-5 min teach + 8-10 min master + 8-10 min synthesis + 4-6 min boss + 3-5 min outro.

## "Nested Curves" in long games

A 100-hour game is not a single difficulty curve, but **multiple nested layers**:

```
Whole-game curve (100h):
  Chapter 1 (5h) ─→ Chapter 2 (8h) ─→ ... ─→ Endgame (10h)

Each Chapter curve (5-15h):
  Level 1 ─→ Level 2 ─→ ... ─→ Boss

Each Level curve (30min-2h):
  Teach → Master → Synthesis → Climax → Catharsis

Each Combat curve (30s-5min):
  Scout → Engage → Crisis → Reversal → End
```

Every layer follows the 5-act structure. Players experience rhythm at every scale.

## Classic example: Hollow Knight's first region

1. **Forgotten Crossroads teaching** (30 min): basic enemies, jumping, attacking
2. **Greenpath mastery** (1 hour): jump precision increases, new enemies but similar to old ones
3. **Mantis Village synthesis** (45 min): must use all techniques learned so far
4. **Mantis Lords boss** (5-30 min): peak challenge
5. **Unlock deep crossroads** (short): catharsis + transition

Each sub-region has smaller curves within it. The whole game is nested curves within curves.

## Antipattern: Linear increase

Beginner designer's levels:

```
Level 1: 5 minions
Level 2: 10 minions
Level 3: 20 minions
Level 4: 40 minions
...
```

Player's experience:

- Level 1: Interesting!
- Level 5: Getting tedious
- Level 10: Pure mechanical repetition, quit game

**Improved version**:
```
Level 1: 5 minions → teach
Level 2: 10 minions + new enemy (archer) → introduce new mechanic
Level 3: 4 archers + movement puzzle → force practice new mechanic
Level 4: mini-boss → synthesis
Level 5: simple clear → catharsis
Level 6: new mechanic (environmental trap) → restart cycle
```

Player's experience: always learning new things, always surprised.

## Four dimensions of difficulty change

Don't rely only on "enemy thick HP / high attack" to increase difficulty (one-dimensional).
Truly advanced design is multi-dimensional:

### 1. Numerical difficulty

- Enemy HP / attack / speed
- Resource scarcity
- Time pressure
- Most basic, easiest to design, but **most boring** dimension

### 2. Mechanical difficulty

- Introduce new mechanic (new attack, new terrain, new rule)
- Force player to learn new technique
- Example: suddenly appears enemy that "can only be defeated with dodge"

### 3. Synthesis difficulty

- Multiple old mechanics tested simultaneously
- Example: jump + timer + dodge bullets all at once
- Significantly raises difficulty without any new mechanics

### 4. Psychological difficulty

- Information scarcity (darkness, fog, unknown boss)
- Time urgency (countdown, must save someone)
- Investment risk ("game over if you die means progress reset")
- Example: *Zelda* Divine Beast boss length itself is psychological pressure

Use all four dimensions so difficulty increases don't feel like "number padding".

## Common mistakes

### Mistake 1: Start too hard

New player skill = 0, give them high difficulty → quit.
**Fix**: Opening difficulty = 0 (any input "wins"), let player get dopamine hit first.

### Mistake 2: Teaching too long

Teaching > 20% of total time → veteran players bored, newcomers frustrated.
**Fix**: Embed teaching into first real level, don't have "standalone tutorial mode."

### Mistake 3: No catharsis

Defeat boss → immediately enter next high difficulty → player doesn't get to feel "victory."
**Fix**: After every climax, must have 1-3 min low difficulty "reward phase" — can be unlock animation, loot collection, story cutscene.

### Mistake 4: No nested curves

Only "whole-game curve" no "small curves" → mid-game hours feel numb.
**Fix**: Every 30 minutes should have its own small peaks and valleys.

### Mistake 5: Constant high difficulty ("challenge mode")

Mistakenly think constant high difficulty = hardcore → actually just boring.
**Fix**: Even hardcore games need low difficulty transitions (Sekiro has trash mobs between bosses so players relax).

## How to implement in Makone / Three.js

**1. Wave design should have rhythm**

```js
const waves = [
  { wave: 1, enemies: { gummy: 3 }, intensity: 'teach' },       // teach
  { wave: 2, enemies: { gummy: 5 }, intensity: 'practice' },    // master
  { wave: 3, enemies: { gummy: 4, slime: 2 }, intensity: 'introduce_slime' },  // new mechanic
  { wave: 4, enemies: { slime: 5 }, intensity: 'practice' },
  { wave: 5, enemies: { gummy: 3, slime: 3 }, intensity: 'combo' },  // synthesis
  { wave: 6, enemies: { boss: 1 }, intensity: 'climax' },       // climax
  { wave: 7, enemies: { reward_chest: 5 }, intensity: 'reward' }, // catharsis
]
```

**2. Parameterize difficulty scaling**

```js
function getDifficulty(wave) {
  return {
    enemyHpMult: 1 + wave * 0.15,
    enemyDamageMult: 1 + wave * 0.10,
    enemyCount: 3 + Math.floor(wave * 1.2),
    newMechanic: wave % 3 === 0 ? introduceNew() : null,
  }
}
```

**3. Give players breathing moments**

```js
// Every 5 waves, spawn a reward wave (no enemies, just items)
if (waveNumber % 5 === 0) {
  spawnRewardWave()  // no threat, pure collection
  showMessage('REST. UPGRADE. CONTINUE.', 5000)
}
```

**4. Dynamic difficulty adjust (hidden)**

```js
// Monitor player death frequency
let recentDeaths = 0
function onPlayerDeath() {
  recentDeaths++
  if (recentDeaths > 3) {
    // Quietly nerf enemies, don't tell player
    enemyHpMult *= 0.92
    setTimeout(() => recentDeaths--, 30000)  // slowly recover
  }
}
```

## Related skills

- `skills/game/axioms/flow-channel.md` — flow is the physics of difficulty curves
- `skills/game/mechanics/risk-reward.md` — risk is difficulty's advanced expression
- `skills/game/mechanics/reward-schedules.md` — difficulty curve + reward rhythm synergy
- `skills/game/onboarding/progressive-disclosure.md` — specific design of teaching phase

## References

- Jesse Schell, *The Art of Game Design* (Lens of Challenge)
- Mihály Csikszentmihalyi, *Flow*
- Mark Brown, *Game Maker's Toolkit* — Difficulty episode
- Soren Johnson, *Designer Notes*
- Will Wright lectures on "possibility space"
- *Half-Life 2* dev commentary (classic pacing design case study)
