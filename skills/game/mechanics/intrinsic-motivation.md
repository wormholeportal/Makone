# Intrinsic motivation — autonomy, mastery, relatedness

> **Self-Determination Theory: people sustain an activity because 3 intrinsic needs are met:
> Autonomy, Mastery, Relatedness.
> Extrinsic rewards (coins, badges) only provide short-term push.**

## One-liner

Players come for extrinsic rewards → rewards stop, they leave.
Players come for intrinsic motivation → you can't kick them out.
Designer's job: make "play" itself the reward, not "rewards" the reason to play.

## Why

Psychologists Edward Deci & Richard Ryan (1985) introduced Self-Determination Theory (SDT):
Human wellbeing and sustained engagement come from 3 intrinsic needs:

1. **Autonomy**: I have choices, not forced
2. **Competence/Mastery**: I'm growing stronger, visible progress
3. **Relatedness**: I connect with others or contribute to something larger

Games that satisfy all three = players invest hundreds of hours.
Games that lack them = players quit after tasks finish.

**Daniel Pink** popularized SDT for workplaces in *Drive* (2009).
**Jane McGonigal** brought SDT to game design in *Reality is Broken* (2011).

## Quantified standards

**Autonomy check**: can players decide what to do next?
- Strict linear / forced quests = low autonomy
- Sandbox / free choice = high autonomy

**Mastery check**: is player stronger at hour 10 than hour 1?
- Stronger on paper (equipment/level) = surface mastery
- **Stronger in skill** (you respond better, timing is sharp, decisions improve) = real mastery

**Relatedness check**: do players remember NPCs / team / community?
- Yes → relatedness established
- No → no emotional investment

## Design techniques for the 3 intrinsic needs

### 1. Autonomy

#### a. Multiple paths

Any main objective must have ≥ 2 ways to complete it.

```
Zelda BotW: after opening, player can
- Sprint straight to final boss (4h speedrun)
- Free all 4 Divine Beasts
- Explore all shrines
- Fish/cook for 100h
Player defines "what is this game."
```

#### b. Allow "wrong" decisions

Don't enforce optimal solutions.

```
Dark Souls allows terrible builds.
Player chooses wrong, no hint → player owns consequence → autonomy maximized
```

#### c. Offer "customization"

UI color / keybinds / difficulty / playstyle (casual / hardcore / story mode).
Let players **shape experience** instead of accept it.

### 2. Mastery

#### a. Visible progress curve

At hour 10, player should do what was impossible at hour 1.

```
Celeste chapter 1: player only jumps.
Chapter 7: player chains dash + wall-jump + stamina + corner-correction combos.
Progress is tangible and felt.
```

#### b. Difficulty follows skill

Player levels up → difficulty rises (see `flow-channel.md`).
Player not progressing → dynamic difficulty adjusts.

#### c. "I figured it out" feedback

Right after learning a new skill, game provides an immediate application.

```
Teach dash, then force "must dash" mini-section.
Player passes → "I learned it!" → mastery satisfied
```

#### d. Make failure learnable

Death reveals "next time do X" = learning.
Random death = can't learn = mastery unsatisfied.

### 3. Relatedness

#### a. Memorable NPCs

Not just "quest dispenser", but personality.

```
Hades: every NPC has full personality, story, relationships.
Players care about their fates → 100+ hours chasing story threads.
```

#### b. Player's "team"

```
Hollow Knight: collect "soul allies"
XCOM: soldiers have names, appearances, growth
RimWorld: colonists named, players give each a nickname
```

Dead soldier = players genuinely grieve → relatedness power.

#### c. Multiplayer relatedness

```
Among Us: cooperate/suspect with friends
Stardew Valley: marry villagers
MMOs: guild becomes real social circle
```

#### d. Player community

Reddit / Discord / wikis / YouTube outside the game.
Players don't just play, they discuss = relatedness extends outside play.

## Extrinsic vs intrinsic motivation

**Extrinsic motivation** (effective short-term, fails long-term):
- Coins / gems
- Experience points
- Badges / achievements
- Leaderboards
- Unlocks

**Intrinsic motivation** (sustained long-term):
- Autonomy (choice)
- Skill growth
- Character investment

**Trap**: feed extrinsic rewards, players engage fast initially, but inner drought → quit within hours.
*Cookie Clicker* is the exception: pure extrinsic (number grows) but satisfies mastery through "possibility space."

## Antipatterns

- **Most mobile games**: pure extrinsic (pay to unlock) → "tacky" → players bored fast.
- **Forced-linear RPG**: player railroaded, no autonomy → complete and discard.
- **Unlearnable difficulty spikes**: pure randomness → no mastery → quit.
- **NPCs are strangers**: no relatedness → why care about story?

## Classic examples

### Dark Souls

- **Autonomy**: open world, explore freely. Boss order flexible.
- **Mastery**: each death teaches something; eventual mastery.
- **Relatedness**: player community shares secrets/builds/lore → active for 15 years.

### Stardew Valley

- **Autonomy**: farming / fishing / mining / dating / cooking self-selected.
- **Mastery**: every system has depth (fishing minigame refines; cooking recipes unlock).
- **Relatedness**: 30+ villagers with full arcs; player marries, has children.

### Minecraft

- **Autonomy**: pure sandbox.
- **Mastery**: from digging dirt to building redstone computers; infinite progression.
- **Relatedness**: multiplayer servers / creative sharing / YouTube community.

## Implementation in Makone

**1. Offer build choices**

```ts
// Don't gate progression into single path
// Let player pick "build path"
const buildTrees = {
  attack: ['+damage', '+crit', '+attack_speed'],
  defense: ['+hp', '+armor', '+regen'],
  utility: ['+speed', '+jump', '+dash_cooldown'],
}
// Player chooses → different playstyle → autonomy
```

**2. Visualize skill growth**

```ts
// Don't just level numbers
// Show "how many did you pull off right"
const stats = {
  perfect_dodges: 47,
  combo_record: 23,
  no_hit_runs: 3,
}
// Player sees "perfect_dodges 47 → 50" = true skill growth
```

**3. Give NPCs personality**

```ts
// Even simple game: NPCs need depth
const npcs = {
  shopkeeper: { name: 'Greta', mood: 'sarcastic', backstory: '...' },
  questGiver: { name: 'Old Pete', mood: 'mysterious', backstory: '...' },
}
// Not just 'shop NPC' generic label
```

**4. Death doesn't erase everything**

```ts
// Permadeath makes player care → but preserve meta progression
function onDeath() {
  // This run's equipment lost
  // But unlocked abilities, cosmetics, knowledge stay
  // Player "learns from every death"
}
```

## What not to do

### 1. Mandatory daily quests

"Login daily for reward" = turns intrinsic into extrinsic → player becomes laborer.

### 2. Paywall for free players

"Pay to access this level" = autonomy stolen.

### 3. Delete old content

"New patch removes old stages" = mastery investment erased → players leave.

### 4. Leaderboard as sole goal

Only "climb ranking" = relatedness becomes competition → losers quit.

### 5. Hand-hold tutorial to end

"Tutorial system babysits until completion" = no autonomy → player is spectator.

## Related skills

- `skills/game/axioms/meaningful-choice.md` — Autonomy in practice
- `skills/game/axioms/flow-channel.md` — Mastery psychology
- `skills/game/mechanics/difficulty-arc.md` — Mastery design form
- `skills/game/mechanics/reward-schedules.md` — Intrinsic vs extrinsic

## References

- Edward Deci & Richard Ryan, *Self-Determination Theory* (1985)
- Daniel Pink, *Drive: The Surprising Truth About What Motivates Us* (2009)
- Jane McGonigal, *Reality is Broken* (2011)
- Mihály Csikszentmihalyi, *Flow* (1990)
- Scott Kim, *Designing Puzzles with a Theme* (GDC)
- Mark Brown, *The World Design of Breath of the Wild* (GMTK)
