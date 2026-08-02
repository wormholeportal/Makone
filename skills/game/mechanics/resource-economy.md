# Resource economy — competing scarcities are what make depth

> **Game depth doesn't come from "more content," it comes from making players continuously balance 2-4 mutually competing scarce resources.
> Only 1 resource = single optimal solution; > 5 resources = cognitive overload.
> Sweet spot: 2-4 resources that consume each other.**

## One-liner

Infinite resources = no decisions.
Single scarcity = "just earn as much as possible" = boring.
Multiple scarcities = "what am I most short of right now" = interesting.

## Why

The essence of game decisions is **trade-off**.
No scarcity = no trade-off = no decision = not a game (see `meaningful-choice.md`).

Resource economics **structures** trade-offs:
- Give player multiple "desirable things"
- But each consumes a shared scarcity (time, attention, space, money, etc.)
- Player must give up some to get others

This is why *Civilization*, *Slay the Spire*, *Stardew Valley*, *RimWorld* keep players invested for hundreds of hours.

## Quantified standards

**Number of resources**:
- 1 = too simple (players just grind)
- 2-3 = excellent (mutual interaction creates decisions)
- 4-5 = complex but still manageable
- > 5 = cognitive overload

**Mutual consumption relationships**:
- Resource A can convert to B
- Resource B can convert to C
- But A → C must go through B (not direct)
- This structure = middle resource is strategic hub

**Resource generation/consumption rhythm**:
- Player should always be **slightly short** of something (urgency)
- Neither completely wealthy nor completely starving
- Wealthy → bored; starving → frustrated

## Seven "classic resource economy" templates

### 1. Single resource (not recommended alone)

Only money / experience / HP.
*Cookie Clicker* is extreme: only cookies. But sustained by "exponential upgrades + infinite content."

### 2. Dual resource opposition

A vs B (defense vs attack / active vs passive / short-term vs long-term).

```
*Slay the Spire* combat energy vs cards drawn
  3 energy + 5 cards per turn
  more energy → more attacks
  more cards → flexible build
  player balances each turn
```

### 3. Triangular resources (most classic)

A, B, C mutually constrain (rock-paper-scissors extended).

```
*StarCraft* minerals vs gas vs population
  minerals build basic units
  gas builds advanced units
  population sets cap
  pure minerals + no gas + no pop = bad
  pure gas + no minerals = no base units
  pure population = no units
```

### 4. Time as a resource

Time itself is scarce:

```
*Stardew Valley* ~14 game hours per day
  farming, fishing, socializing, mining, festivals — can't do all
  player balances daily
```

### 5. Space as a resource

Slots / inventory / board positions scarce:

```
*Slay the Spire* deck size
  add more cards → dilute draw quality
  keep slim → lack build options
  
*Tetris* board squares
  each block takes space
  must clear or die from height
```

### 6. Information as a resource

Unknown / fog of war:

```
*XCOM* vision range
  battlefield obscured by fog
  scout removes fog = spend turns for info
  shoot or not? must calculate
```

### 7. Risk as a resource

Acceptable failure count:

```
*Hades* deaths per run = 1
  In roguelikes, "health" is both resource and risk counter
```

## Design techniques

### 1. Make resources have non-linear conversion rates

```
1 gold = 1 wood = 1 stone  (linear → not interesting)
1 gold = 3 wood = 5 stone  (non-linear → interesting, players calculate what's cheap)
```

### 2. Let conversion rates vary by context

Shop offers 1 gold = 5 wood in first 5 levels, 1 gold = 2 wood in last 5 levels.
Player must decide "when to buy" — another decision.

### 3. Make highest-value resource scarcest

```
gold - easy to obtain, buy basic items
diamonds - rare, buy rare items  
relics - extremely rare, buy ultimate content
```

Players naturally prioritize by value.

### 4. Give resources "caps"

```
HP 100 cap → can't hoard
energy 10 cap → can't hoard
coins 9999 cap → can't hoard
```

Forces player to "spend" or waste.

### 5. Time as universal scarcity

Any "time-consuming" activity is implicit resource expenditure.

```
* RPG each quest takes 30 min
  player picks quests, doesn't do all
```

## Classic cases

### Civilization

- **Production** (build units / structures)
- **Food** (population)
- **Science points** (research)
- **Gold** (trade, maintenance)
- **Culture** (border expansion)
- **Faith** (religion)

6 resources allocated per turn. Player depth = long-term resource planning.

### Slay the Spire

Each battle has only 2 resources:
- **Energy** (3 per turn)
- **Cards drawn** (5 per turn)

But combined with 200+ cards → emergent complexity. Proves few resources can still be deep.

### Cookie Clicker

Only 1 resource (cookies), but combined with 300+ buildings + 100+ upgrades.
Player continuously decides "which building has best ROI."

### Stardew Valley

- **Time** (~14 hours per day)
- **Energy** (each action costs it)
- **Money**
- **Season** (what grows when)
- **Affection** (NPC relationships)

5 perfectly balanced resources, keeps players invested 100+ hours.

## Antipatterns

- **Most mobile games**: only resource is "gems" (pay currency) → all decisions reduce to "pay or not."
- **Some MMORPGs**: 100+ currencies, players don't know which matters → design failure.
- **Over-reward games**: each monster drops 10 things → player numb, nothing feels precious.

## How to implement in Makone / Three.js

**1. Resource manager**

```ts
class ResourceManager {
  private resources: Map<string, { current: number, max: number, regen?: number }> = new Map()
  
  define(name: string, initial: number, max: number, regenPerSec?: number) {
    this.resources.set(name, { current: initial, max, regen: regenPerSec })
  }
  
  add(name: string, amount: number) {
    const r = this.resources.get(name)
    r.current = Math.min(r.max, r.current + amount)
  }
  
  spend(name: string, amount: number): boolean {
    const r = this.resources.get(name)
    if (r.current < amount) return false
    r.current -= amount
    return true
  }
  
  tick(dt: number) {
    for (const r of this.resources.values()) {
      if (r.regen) r.current = Math.min(r.max, r.current + r.regen * dt)
    }
  }
}

const player = new ResourceManager()
player.define('hp', 100, 100, 1)      // auto-regen hp
player.define('mana', 50, 50, 5)      // auto-regen mana
player.define('stamina', 100, 100)    // no regen
player.define('gold', 0, 9999)
```

**2. Conversion / shop**

```ts
function shop() {
  return [
    { name: 'Heal Potion', cost: { gold: 50 }, effect: () => player.add('hp', 30) },
    { name: 'Mana Potion', cost: { gold: 50 }, effect: () => player.add('mana', 30) },
    { name: 'Upgrade Sword', cost: { gold: 200, ironOre: 5 }, effect: () => damage += 10 },
  ]
}

function buy(item) {
  // Check all resources are enough
  for (const [res, amt] of Object.entries(item.cost)) {
    if (player.get(res) < amt) return false
  }
  // Deduct all
  for (const [res, amt] of Object.entries(item.cost)) {
    player.spend(res, amt)
  }
  item.effect()
  return true
}
```

**3. Time as resource**

```ts
// N action points per day
let actionPoints = 5
function performAction(cost) {
  if (actionPoints < cost) return false
  actionPoints -= cost
  return true
}
// Reset at end of day
function endDay() {
  actionPoints = 5
}
```

## Anti-patterns

### 1. Resources completely independent

3 resources unrelated → each has optimal solution → actually 3 parallel games → not strategy.
**Fix**: Make resources consume / convert / constrain each other.

### 2. Always wealthy

After 100 hours player has 9999 gold with nothing to spend on → no decisions.
**Fix**: High-tier items cost exponentially more / add "sinks" (capacity limits, consumables).

### 3. Always starving

Player never has enough for anything → frustrating.
**Fix**: Let player occasionally "splurge," reignite hope.

### 4. Hidden costs

Item costs 100 gold → but maintenance costs 10 gold/day → player feels tricked.
**Fix**: All costs transparent, player can calculate.

### 5. Resource imbalance

Of 5 resources, 1 is always oversupply → actually only 4 resources matter.
**Fix**: Regular balance testing, make every resource "desirable."

## Testing methods

**Resource tension**: After 30 min, does player frequently feel "just a bit short of buying what they want"?
- Yes → tension is right
- No (always short / always enough) → rebalance

**Decision density**: How many resource decisions does player make per minute?
- 1-3 = right
- < 1 = resources not interesting
- > 5 = overload

**Memorability**: After 30 min, does player remember what resources they have?
- Yes → right number
- No → too many

## Related skills

- `skills/game/mechanics/interesting-decisions.md` — resources are medium for decisions
- `skills/game/mechanics/risk-reward.md` — resource scarcity = risk pressure
- `skills/game/mechanics/reward-schedules.md` — resources are medium for rewards
- `skills/game/axioms/meaningful-choice.md` — resource scarcity creates choices

## References

- *Game Mechanics: Advanced Game Design* — Adams & Dormans
- Sid Meier, *Civilization* design notes
- Frank Lantz, *The Beauty of Poker as a Game*
- Daniel Cook, *Loops and Arcs* (Lostgarden)
- *Slay the Spire* mechanics design talks (Mega Crit)
