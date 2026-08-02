# Risk/reward — the core engine of game tension

> **At any moment, two options must coexist: "safe small reward" and "risky big reward."
> The player's internal struggle between them is "tension."
> Games without this tug have no pacing.**

## One-liner

Tension doesn't come from making a game hard; it comes from letting players **choose how much to risk**.
He voluntarily risks and wins = climax; he gets greedy and crashes = lesson.
Both outcomes make him want another run.

## Why

Decision psychology (Kahneman, Tversky) discovered:
- Loss aversion: people hate losing about **2x more** than they enjoy equivalent gains
- People overestimate small probabilities (lottery), underestimate big ones (refuse seatbelts)
- "Almost won" drives replay more than "guaranteed win" (near-miss effect)

Game designers can exploit these cognitive biases:
- Offer risky options → player fantasizes "one big win = I'm back"
- Risky choices occasionally succeed → memorable, want to retry
- Greed occasionally crashes → "if I'd played it safe" → next time more careful

**Key**: player **chooses** to risk. Forced risk (unavoidable death) = unfair.

## Quantified design

Classic risk/reward curve:

```
Reward ↑
     │       💀 (death line)
     │      ╱
     │     ╱  ← player's optional "greedy zone"
     │    ╱
     │   ╱
     │  ╱ ← main reward curve
     │ ╱
     │╱  ← start (no risk, no reward)
     └──────────────────→ Risk
```

**Good design**: player can stop anywhere on curve. Stop early = low reward, stop late = high reward but near "death line."
**Bad design**: both ends forced — early section mandatory tedium (must complete easy part), late section no choice (forced high risk).

## Classic case: Pac-Man

Each power pellet gives player brief invincibility.

- **Safe play**: eat pellets → flee ghosts
- **Risky play**: eat power pellet → counter-kill ghosts (high score but must approach)
- **extreme play**: gather 4 ghosts while invincible, chain-eat them (4x multiplier mega-score but ultra-risky)

Player decides which tier fits their skill.

## 7 classic risk/reward mechanics

### 1. Combo system

Higher combo = bigger multiplier, but hit breaks it to zero.

```
Devil May Cry: kills build SSS rank
  - Safe: low rank clear
  - Risky: maintain SSS but must stay unhit
```

### 2. Time-limited resource

```
BioShock: plasmids drain special ammo
  - Safe: regular gun only
  - Risky: plasmid spam clear (efficient but runs dry, then vulnerable)
```

### 3. Investment setup

```
Slay the Spire: power-card turns
  - Safe: attack cards each turn, steady output
  - Risky: spend 2 turns on power cards (zero output + wasted turns), then all future damage +200%
```

### 4. Boss recovery window

```
Dark Souls: heavy boss attack, 2s recovery
  - Safe: wait for next turn
  - Risky: backstab once and retreat (if recovery shorter, catch hit)
  - extreme: chain 3 backstabs betting recovery is long
```

### 5. Speedrun paths

```
Mario 64: castle has 70 stars, clear needs only 70 → but 70-star, 16-star, 0-star routes
  - Safe: 70 stars (grab everything)
  - Risky: 16 stars (skip stages, need skill)
  - extreme: 0 stars (extreme BLJ glitch)
```

### 6. Doubling down

```
Blackjack: stand vs hit.
  - Now at 17: stand (no risk)
  - Hit: maybe reach 20 (win more), maybe bust
```

### 7. Status risk

```
Hades: glass cannon blessing (one-shot death, +200% attack)
  - Risky: accept blessing + accept fragility
  - Player chooses accept or decline
```

## Three anti-patterns

### Anti-pattern 1: False risk

```
"Risky path" has <5% death rate
After players discover, everyone takes it because reward is high
```

No real risk = no tradeoff = devolves to "must take optimal path."

### Anti-pattern 2: Guaranteed loss

```
"Risky path" is nearly unwinnable (90% failure)
Players quickly abandon this route
```

Also devolves to single choice.

**Sweet spot**: risky path's **expected value roughly equals** safe path, but **high variance**. Let risk-seeking and risk-averse players find their playstyle.

### Anti-pattern 3: Risk independent of skill

```
"Risky path" is pure random (coin flip)
Player thinks "luck" not "my play quality"
```

Risk must be reducible by skill, otherwise it's gambling and player learns nothing.

## Implementation in Makone / Three.js

**1. Give player branching choices**

```js
// Two types of items
const items = [
  { type: 'heal', amount: 20, location: 'safe' },           // safe
  { type: 'powerful', effect: 'damage+30%', location: 'in_danger_zone' },  // risky
]
// Let player decide whether to brave the danger zone
```

**2. Resource management + decision point**

```js
// Player has limited "special ammo"
const player = { specialAmmo: 3 }
// Current scene has:
// - 5 weak enemies (normal ammo 1 each)
// - 1 boss (special ammo 1 = half boss HP)
// Player decides: save ammo for boss? or use 1 to speed-clear trash?
```

**3. Combo system**

```js
let combo = 0, comboTimer = 0
function onKill() {
  combo++
  comboTimer = 3  // must kill again within 3s, else reset
  score += baseScore * (1 + combo * 0.2)  // more combo = more score
}
function onHit() {
  combo = 0  // hit breaks combo
}
// Player tempted to greed combo, but greed = potential hit
```

**4. Show risk level**

```js
// Warn player "next is hard"
showWarning('Boss in 100m. Bring full HP.')
// Player can choose turn back / proceed
// Never "mysterious death"
```

## Pacing curve across run

Entire game should have peaks and valleys, not constant tension:

```
Tension ↑
      │     boss⭐
      │      ╱╲
      │     ╱  ╲    ⭐boss
      │    ╱    ╲   ╱╲
      │   ╱      ╲ ╱  ╲
      │  ╱        V    ╲___ clear
      └──────────────────────→ time
        weak --- tense --- weak --- boss --- safe
```

- High tension = player pushed to skill ceiling
- Low tension = player recovers / levels / organizes gear
- **No valleys** = can't have peaks (constant tension = numbness)
- **No peaks** = no memorable moments

Design each area asking "is this a peak or valley?"

## Related skills

- `skills/game/mechanics/interesting-decisions.md` — risk/reward is most common decision template
- `skills/game/mechanics/reward-schedules.md` — risky rewards should be variable ratio
- `skills/game/mechanics/difficulty-arc.md` — whole-game tension curve
- `skills/game/axioms/flow-channel.md` — tension is the fuel of flow

## References

- Daniel Kahneman, *Thinking, Fast and Slow* (loss aversion / near-miss)
- Jesse Schell, *The Art of Game Design* (Lens of Risk)
- Raph Koster, *A Theory of Fun*
- Frank Lantz, *The Beauty of Poker as a Game* (classic risk design talk)
- Mark Brown, *What Makes a Good Risk-Reward Game?* (GMTK)
