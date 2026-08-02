# Second-order design — simple rules, complex emergence

> **John Conway's Game of Life has 3 rules but can simulate a Turing machine.
> Game depth doesn't come from "more rules," it comes from "combinatorial rule space."
> Add rules = reduce player. Give players few rules but deep space.**

## One-liner

Bad game: 100 rules but players follow script, no exploration space.
Masterpiece: 5 rules but players discover mechanics the designer never imagined.

## Why

**"First-order" design**: Designer directly defines outcomes.
"Add this buff, player damage +50%" — one-to-one mapping.

**"Second-order" design**: Designer defines rules, outcomes emerge from rule interaction (emergence).
"Fire ignites wood, wooden bridge ignites and collapses" — unintended playstyle (player burns bridge to escape) emerges naturally.

Benefits of second-order design:
1. **High replayability**: Each session plays differently
2. **Player-created content**: YouTube videos / community discussions → viral spread
3. **Code efficiency**: Few rules but deep content
4. **Player addiction**: Self-discovery = personal achievement

This is why *Minecraft* / *Zelda BotW* / *Dwarf Fortress* / *RimWorld* keep people playing thousands of hours.

## Quantified standards

**Emergence depth test**:
- Do players discover playstyles you **didn't design** within 10 hours?
- Yes → emergence design successful
- No → scripted game

**Rule count**:
- < 10 core rules → excellent (players can grasp)
- 10-30 → reasonable
- > 50 → too scripted

**Community video variety**:
- Players create 10+ types of "playstyle breakdown" videos → emergence strong
- All repeating same thing → emergence weak

## Four mechanics of emergence

### 1. Combinatorial rules

n abilities → combined create n² outcomes.

```
*Magic: The Gathering*: each card individually simple.
But 60 cards interacting → millions of builds.
30 years later people still discover new strategies.
```

### 2. Physics interaction

Environment objects can "affect each other":

```
*Zelda BotW*:
- Fire ignites grass
- Burning grass creates updraft
- Updraft lifts glider high
- Player discovers: fire + glider = rapid movement
Designer didn't explicitly design this, naturally emerged.
```

### 3. Property system

Property combinations create new effects:

```
*Divinity: Original Sin 2*:
- Water + Lightning = short circuit (damage + buff)
- Fire + Oil = explosion
- Oil + Ice = freeze
- 100+ element combinations possible
Players "invent" strategies using these combinations.
```

### 4. AI interaction

NPCs don't just interact with player, **with each other**:

```
*Dwarf Fortress* / *RimWorld*:
- NPC has needs (hungry, tired, social)
- NPC has personality (irritable / shy / jealous)
- Interaction creates story (jealousy → kills rival → colony collapses)
Designer never "wrote" this story.
```

## Classic cases

### Minecraft Redstone

Only a few basic components (redstone wire, torch, piston, hopper, comparator, repeater).
Players use them to build:
- Calculators
- CPUs
- Computers (that run Minecraft)
- Game systems
- Entire city automation

Mojang never "designed" these. Redstone is just simple rules simply implemented.

### Dwarf Fortress

Each character has:
- 9 body parts
- 50+ personality traits
- 100+ skills
- Arbitrary needs

Undesigned stories naturally emerge:
- "Dwarf alcoholism because favorite cat died"
- "Heartbroken dwarf goes mad, jumps in lava"
- "Newborn becomes legend hero in boss fight"

Every fortress is a unique story.

### Vampire Survivors

5 classes + 50 weapons + 50 upgrades.
Players discover:
- Garlic + Whip = full-screen critical hits
- Bible + Summon = auto-relic
- Some combinations one-shot bosses in certain stages

Game is 4 GB but provides 100+ hours of play.

### Portal 2 tool combination

- Push boxes
- Portals
- Gels (speed gel / bounce gel / conversion gel)
- Lasers
- Funnels

Each simple. Combined, user-created levels exceed millions.

## Antipatterns

- **Most linear AAA games**: each level is essentially "find the designer's solution." Replaying yields no new content.
- **Mobile "auto-battle"**: decisions replaced by algorithm → players don't think → no emergence.
- **Over-scripted RPGs**: each NPC only has fixed dialogue → players can't discover "events."
- **Simple puzzle games**: each level 1 solution → beat it and abandon.

## Design method

### 1. Start from "verbs," not from "content"

```
❌ Design 100 levels → players finish with no new content
✓ Design 5 core verbs → players combine verbs infinitely
```

### 2. Let rules interact "openly"

When designing each rule, ask "what can it interact with?"
- Fire → can ignite **any** flammable (grass, wood, oil, cloth, paper)
- Not → fire can only ignite **preset** flammables (few key props)

Latter is scripted, former is emergent.

### 3. Physics consistency

If something burns in Scene A, it should burn in Scene B too.
Players use this **consistency expectation** to discover new playstyles.

```
Zelda BotW:
Player thinks "grass burns" → everything burns → exploit updraft flying
Player thinks "metal conducts" → any metal conducts → dangerous to wear metal in thunderstorm
```

### 4. Provide "high-level verbs" (meta verbs)

Not just basic verbs, give players **composition tools**:
- Blueprint system (build devices)
- Editor (create levels)
- Script (player-defined logic)

Make game **player's canvas**.

### 5. Failure is also emergence

Let player failure produce interesting consequences, not just "retry":

```
*RimWorld* colony collapse = epic failure story
*Dwarf Fortress* "Losing is fun" is core philosophy
```

## How to implement in Three.js / Makone

**1. Make properties composable**

```ts
const properties = {
  fire: { damages: ['burnable'], creates: 'smoke' },
  water: { extinguishes: 'fire', conducts: 'lightning' },
  lightning: { damages: ['conductor'], chains: true },
  oil: { burnable: true, slippery: true },
  ice: { slippery: true, melts: 'water' },
}

const objects = [
  { name: 'wood', tags: ['burnable'] },
  { name: 'water_puddle', tags: ['water', 'conductor'] },
  { name: 'metal', tags: ['conductor'] },
  { name: 'oil_barrel', tags: ['burnable', 'oil'] },
]

// Player sets fire + oil barrel + water + metal weapon
// = oil explodes + water turns steam + lightning conducts through metal = chain reaction
// nobody explicitly designed this playstyle
```

**2. AI agents have autonomous goals**

```ts
class NPC {
  needs = { hunger: 0, sleep: 0, social: 0 }
  goals = []  // auto-generated
  
  tick(dt) {
    this.needs.hunger += dt * 0.01
    this.needs.sleep += dt * 0.005
    
    // Pick most urgent need as goal
    const top = Object.entries(this.needs).sort((a, b) => b[1] - a[1])[0]
    this.goals.unshift(`satisfy_${top[0]}`)
    
    // Then NPC goes find food / sleep / socialize
    // Multiple NPCs interacting may compete for food / beds → emergent storylines
  }
}
```

**3. Physics objects have persistent state**

```ts
// Not "kill boss and disappear"
// But "boss dies, corpse remains, gets eaten by wildlife, bones persist"
// Player returns and sees bones → "I won here"
```

## Anti-patterns

### 1. Use rule count instead of rule depth

Add 100 special items → looks "content-rich" → players actually use first 5.
**Fix**: 5 rules that interact to produce 100 outcomes.

### 2. Block emergent playstyles

Discover players beat undesigned method → patch it out.
**Fix**: Allow, even encourage. These are goldmines for community videos.

### 3. Everything is scripted

Each level has "correct solution."
**Fix**: Each level has multiple solutions, including ones designer never imagined.

### 4. No "system," only "content"

Game = pile of task lists.
**Fix**: Game = few deep rules + big world for players to apply rules.

## Testing method

Have a stranger play 10 hours, ask: "What surprised you that you did?"
- Can answer → emergence design successful
- Can't answer → still scripted

## Related skills

- `skills/game/mechanics/interesting-decisions.md` — emergence = large decision space
- `skills/game/mechanics/resource-economy.md` — resource systems are emergence incubators
- `skills/game/axioms/meaningful-choice.md` — emergence makes choices truly meaningful
- `skills/game/axioms/core-loop.md` — core verbs should be "composable"

## References

- John Conway, *Game of Life* (1970)
- Will Wright, *Possibility Space* (GDC talks)
- *The Witness* design notes (Jonathan Blow)
- *Dwarf Fortress* dev interviews (Tarn Adams)
- *Minecraft* development history (Notch / Mojang)
- Steve Swink, *Game Feel* (emergence chapter)
