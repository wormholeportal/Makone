# Meaningful choice — a game is a series of interesting decisions

> **Sid Meier 1989: "A game is a series of interesting decisions."
> If player decisions aren't interesting, you didn't make a game, you made an experience.**

## One sentence

The core difference between games, films, videos, and art is **players make choices with consequences**.
If choices have no consequences, or the best choice is obvious, or purely random, it isn't a game.

## Why

Sid Meier at GDC 1989, refined in 2012:
> "A game is a series of interesting decisions."

More precisely: **what makes a decision interesting?**
Meier's reverse definition: "Identify what isn't interesting is easier."
- If players **always pick option 1** → not interesting (A dominates)
- If players **pick randomly** → not interesting (no info guides choice)
- **Interesting = player pauses, weighs options, feels potential regret**

Why is this an axiom? Because player delight comes from "I made a smart choice."
No choice means no "I'm clever," just "press Enter, watch next cutscene."

## Quantified criteria

**3-1-X rule** (promoted by Schell):
- Any key decision needs **at least 3** visible options
- Must have **at least 1** obviously bad and **at least 1** obviously good as calibration anchors
- But **best choice depends on player's additional knowledge or prediction**—the X truly hard choices

**"5-second think" test**: present choice → does player pause or vocalize reasoning 5+ seconds?
- Yes → interesting decision ✓
- No → fake decision (no regret possible) ✗

**"I chose wrong" rate**: good decision systems give 20–40% chance players later think "should've picked the other," but not total regret.
0% regret = decision meaningless; 100% regret = unfair design.

## What makes decisions interesting

Typically one or more of these mechanisms:

1. **Risk/reward tradeoff**: A safe for 5 pts, B risky for 0 or 15 pts. Similar EV makes player hesitate.
2. **Resource scarcity**: only 3 bullets; spend on minions or boss?
3. **Time pressure**: must decide in 3 sec
4. **Incomplete info**: fog of war / unknown boss attacks
5. **Opportunity cost**: choose path A, never see path B
6. **Short vs long term**: this round loses value but compounds into advantage
7. **Character differentiation**: 5 classes with different tradeoffs
8. **Opponent psychology**: rock-paper-scissors meta
9. **Style expression**: no best choice, but aesthetic preferences

Great games hit multiple dimensions at each decision point.

## Success cases

- **XCOM**: display hit % but force tradeoff: full-health 60% vs injured 95%. Every square is a bet.
- **Slay the Spire**: pick cards—damage, defense, or fish for rare boss key? Pick 1 of 30+, every choice real.
- **Civilization**: research tech tree—cavalry or bronze? Depends on neighbors, terrain, plan. World-class interesting decisions throughout.
- **Dark Souls**: level up, allocate soul—life, dexterity, or intelligence? No respecs makes this real.
- **Pac-Man**: pellet direction—this path to food but ghosts here, that safe but fewer pellets. Yes, Pac-Man is full of interesting decisions.

## Failure cases

- **Most "press Space attack" LLM games**: player's only "decision" is "press Space?" That's a reaction test, not a decision.
- **JRPG one-button optimal**: 99% of fights, mash A for "Attack" is best. Decision design stripped out.
- **Parkour left/right equally good**: random dodge works, no info to guide choice rationally.
- **Beginner D&D fighter**: only one option per turn, "Attack." This is why later editions add maneuvers/superiority dice.
- **Any game with obvious dominant choice**: once players discover A always beats B, B vanishes.

## How to implement in Makone / Three.js

**1. Even action games need micro-decisions**

Not just "press attack," but:
- Which enemy first? (threat priority vs cleanup priority)
- Attack or dodge? (stamina resources)
- Which direction dodge? (other enemies approaching)

Achieve via multiple enemies + multiple attack modes + resource cost.

**2. Items/upgrade trees must avoid obvious best**

```js
// ✗ bad: 3 upgrades, "+50% damage" obviously wins
const upgrades = [
  { name: '+50% damage' },
  { name: '+25% damage' },
  { name: '+10% damage' },
]

// ✓ good: 3 upgrades, each constrains the others
const upgrades = [
  { name: '+50% damage, -20% speed' },     // heavy build
  { name: '+30% speed, fire rate up' },    // rush build
  { name: 'AOE on kill, smaller bullets' },// clear build
]
```

**3. Design "regret or it's not interesting" tradeoffs**

After each decision, player should wonder "what if I'd chosen the other?"
Means build effects must compound in perceivable ways.

**4. Risk/reward mechanism**

```js
// Path choice: safe vs high reward
const safePath = { reward: 100, danger: 'low' }
const riskyPath = { reward: 300, danger: 'high', deathChance: 0.5 }
// EV: safe = 100, risky = 150 — mathematically risky wins
// but players hesitate due to loss aversion
```

**5. Separate operation from decision**

Many things that look like decisions are just operations:
- "aim for enemy head" = operation (mechanical execution)
- "which enemy first" = decision (cognitive judgment)

Need both, but **interesting decisions** anchor player retention.

## Decision density

Ideal games have interesting decision every 5–30 seconds.
- Real-time strategy: every 5 sec (unit orders, resource save, tech choice)
- Platformer: every 10 sec (route pick, jump timing, skill use)
- Turn-based tactics: every 30 sec–3 min (one big decision per turn)
- Roguelike: after each fight choose buff, every 5 min

Below this density, players feel hollow ("press Space, watch animation").
Above it, players fatigue (decision overload).

## Related skills

- `skills/game/axioms/core-loop.md` — decisions are "seasoning" around core verb
- `skills/game/mechanics/risk-reward.md` — most common "material" for decisions
- `skills/game/mechanics/resource-economy.md` — multiple scarce resources carry decisions
- `skills/craft/affordance-design.md` — decision options must be clear

## Sources

- Sid Meier, "Interesting Decisions" (GDC 1989, 2012)
- Sid Meier, *Sid Meier's Memoir!* (2020)
- Jesse Schell, *The Art of Game Design* (multiple lenses touch this)
- Soren Johnson — *Why Interesting Decisions Matter* (Game Developer article)
