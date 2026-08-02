# Core loop — the core verb must feel good on its own first

> **Every game has exactly one core verb. It must feel satisfying within a 30-second isolation test.
> Everything else (story, art, levels, scoring) exists only to extend that verb's appeal.**

## One sentence

If a player can do **one thing** and play for 5 minutes without stopping, you have earned the right to talk about "content."
Otherwise you have not made a game—you have made an interactive video.

## Why

Raph Koster says in *A Theory of Fun*: "Fun is the act of mastering a problem mentally."
Players keep playing because **practicing a verb** creates tiny moments of mastery.

Each successful action → small endorphin burst → want to do it again.
This is the bedrock mechanism from slot machines through Tetris to Doom, unchanged.

**Key observation**: every great game's core verb can be described in 5 seconds:
- *Super Mario*: **jump**
- *Tetris*: **rotate and fall**
- *Doom*: **move and shoot**
- *Vampire Survivors*: **walk** (attacks are automatic; player only walks)
- *Hollow Knight*: **jump + slash**
- *Slay the Spire*: **pick a card**
- *Cookie Clicker*: **click**

If describing your game takes more than one sentence, either the core verb is missing or you have designed not one game but several glued together.

## Quantified criteria

**Isolation verb test**: strip all levels, enemies, score, UI, and story. Leave only player + empty scene + one verb.
Ask an unfamiliar player after 30 seconds: "Do you want to keep playing?"

- Answer **yes** → you have a game
- Answer **no** → no amount of "content" will save it

Examples:
- *Mario* with only mario + flat ground + jump → jumping feels good on its own ✓
- *Vampire Survivors* with only character + walk → walk + invulnerability + hit feedback is enough ✓
- Generic "WASD walk" character + empty scene → not fun ✗ (verb too boring, no game feel)

**5-minute rule**: the core verb with no external rewards (score / level-up / unlock) should let players play 5 minutes without boredom. If it cannot, more rewards are just a Skinner box; players will sense the emptiness and quit.

## Success cases

- **Doom (1993)**: move and shoot, each shot thunderous BOOM and gore, enemies ragdoll out. Core verb satisfies in frame one.
- **Hotline Miami**: throw weapon + pick weapon + one-hit kill, every success is 0.5s slow-mo.
- **Geometry Wars**: dual-stick shooting, no story no levels, pure "fly and shoot" lets players burn dozens of hours.
- **Mario 1-1**: first 30 seconds teach nothing, just let the player jump on flat ground, confirm "jumping feels great."

## Failure cases

- **Most LLM-generated "games"**: stack UI, enemies, levels, but core verb is just "WASD walk + space attack" with no craft applied (no input feel, no hit feedback, no sound, no screen shake). Player quits after two steps.
- **No Man's Sky launch**: core verb "gather and craft" has no satisfying moment in 30 seconds, so 18 quintillion planets could not fix it (until years later Foundation updates rebuilt the loop).
- **Any marketing claiming "our game has X characters and Y stories"**: usually means the core verb was never polished.

## How to implement in Makone / Three.js

**When you (agent or human) begin designing a new game**, the first step is **not** finding reference art, building models, or writing GameRuntime config.

Do this:

```js
// Step 0: empty scene + player + one verb
// Do not make enemies, UI, or levels
// Only iterate on: does pressing W feel good?

const scene = new THREE.Scene()
const player = createPlayer()
// Iterate until satisfying:
//   1. Input response: < 100ms (see skills/game/axioms/feedback-latency.md)
//   2. Visual feedback: particles / screen shake / stretch animation (see skills/game/feel/juicing.md)
//   3. Sound (even placeholder)
```

Only after this 30-second test passes, add enemies / UI / levels.

**Anti-pattern**: write 800 lines of SUV model and terrain shader, then discover "pressing W feels bad." Pivoting the core verb now costs too much; you will ship an unsatisfying game instead.

## Related skills

- `skills/game/axioms/feedback-latency.md` — core verb must have instant feedback
- `skills/game/feel/juicing.md` — concrete techniques for satisfying feedback
- `skills/game/mechanics/interesting-decisions.md` — how to extend core verb into choices
- `skills/game/onboarding/first-30s.md` — teach the verb via level design in first 30 seconds

## Sources

- Raph Koster, *A Theory of Fun for Game Design* (2004)
- Edmund McMillen — *Designing Around a Core Mechanic* (GDC talk)
- Mark Brown — *What Makes a Good Combat System* (GMTK)
- Steve Swink, *Game Feel: A Game Designer's Guide to Virtual Sensation* (2008)
