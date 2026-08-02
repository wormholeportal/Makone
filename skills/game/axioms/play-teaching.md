# Play teaching — teach through play, never through text

> **Level design = instruction design.
> First 30 seconds, first room, first NPC—let players learn core verbs by playing.
> A "press W to move" tooltip = design failure.**

## One sentence

If you need to tell players "jump here," your level isn't designed.
The level's shape, enemy placement, visual cues should make players feel they **must** jump and **want** to jump.

## Why

Learning research:
- **Passive text input → forget 80% in 5 min**
- **Active hands-on discovery → remember 80% in 5 min**

That's why IKEA makes you assemble furniture—assemble once, never forget the part names.

Games are **interactive**. "Do it once, understand forever" beats reading 50-word tooltips.
Players start game one exploring "what does this key do?" You just guide exploration, don't replace it.

Text interrupts discovery flow, switching players from "I'm playing" to "I'm reading a manual."

## Quantified criteria

**"30-second verb test"**: 30 seconds after start, player must have:
1. Used core verb at least 5 times independently (no prompts)
2. Seen visual feedback from core verb (discovered "oh, pressing W does that")
3. Solved at least one obstacle using core verb

**"Zero text" test**: hide all UI text, can new player still beat level 1?
- Yes → excellent (level is the teacher)
- No → design depends on text crutches

**"Watch and understand" test**: show 30 sec of someone playing to a newcomer. Ask "what's the goal?"
If they answer → visual communication works.

## Case study: Super Mario 1-1

Nintendo 1985 opening is page one of game design. First screen has **zero text** but teaches every core verb:

1. **Mario on left side** → implies "go right"
2. **Koopa walks toward you** → player tries to dodge (dies) / jumps over (succeeds)
3. **Jumping on Koopa kills it** → learns "stomp"
4. **? block looks different** → oddness sparks curiosity → jump and hit → mushroom drops
5. **Mushroom rolls** → player instinct to dodge → hit → grow → "oh eat it"
6. **First pipe is short, jumpable** → learns "up" is valid
7. **Next pipes get taller** → test new jump skill

Zero "press X to jump" prompts. Player trial-and-errors all mechanics in 30 seconds.

## Success cases

- **Zelda: Breath of the Wild opening**: open world but only 4 shrines reachable. Learn sneak/slash/cook/glide in small area first.
- **Portal**: each level introduces one concept, next level tests it, next combines two. No "tutorial mode," level design is teaching.
- **Half-Life 2 gravity gun**: pick up small safe items, then boxes, then sawblade, then boss use. Teaching scales from harmless to lethal.
- **Inside / Limbo**: totally wordless. One death teaches mechanic (dog bites / water drowns).
- **Hollow Knight opening**: first falling animation forces player input (avoid death), immediately encounter enemy forcing slash.

## Failure cases

- **Any "press W move, A/D turn, Space jump, E attack" tooltip**: 90% close and forget.
- **Loading screen tips**: player staring at progress bar, not in learning mindset.
- **Mandatory 20-min tutorial** (some MMOs): told what to do, no chance to make mistakes and learn.
- **"Talk to village elder, then talk to smith"** tasks: not teaching, just guide through NPC directory.
- **"Watch video tutorials to play"**: sign of doomed commerce.

## How to implement in Makone / Three.js

**1. First scene is a "safe practice zone"**

```js
// ✓ good opening
// empty ground + target dummies + player
// player discovers "press W moves" + "Space hits target"
// hit dummy: tons of particles → encourages repeating

// ✗ bad opening
// UI-covered scene + immediate enemy wave
// no time to experiment, learn only through being hit
```

**2. Guide with level geometry**

```js
// want player to learn "climb wall"
// don't write "press Space to climb"
// instead: wall with enemy chasing player from below
// player instinct: back away, blocked by wall → jump → climbing triggers

// want player to learn "activate switch"
// don't write "press E to activate"
// instead: switch surrounded by bright lights
// player approaches, tap interact → immediately lights up
```

**3. Teach with enemy placement**

```js
// want player to discover "roll dodges"
// right after learning movement, send slow ranged enemy
// player instinct: dodge → walk not fast enough → try Shift → roll → "wow!"
```

**4. Feedback intensity escalates**

```js
// first successful attack: basic particles + sound
// third attack: unlock combo hint (visual, not text)
// tenth: player discovers combo rhythm alone
```

**5. Text only in "necessary UI"**

- Numbers (HP 100 / 100) ✓
- Time (45.0s) ✓
- Checkpoint count (3/12) ✓
- Control hint ("WASD Drive") ✗ teach in level design

If text is needed, tuck in corner, small font; game playable without it.

**6. Make failure the fastest teacher**

```js
// wrong move → instant death
// respawn < 1 sec
// second attempt, same mistake doesn't happen
// failure = most powerful feedback
```

## Anti-pattern: tutorial stickers

Most common failure: finish game, realize newcomers can't play, slap tutorial tooltips:
- Center popup "Tip: press E to pickup"
- Task bar flash "Press W to move forward"
- First NPC says 50-word combat explanation

**Correct fix**: redesign levels. Make level 1 no-text-yet playable.
High cost, doubles retention.

## Related skills

- `skills/game/axioms/feedback-latency.md` — learning needs instant feedback
- `skills/game/axioms/retry-latency.md` — failed attempts teach fastest
- `skills/game/onboarding/first-30s.md` — detailed first-30-second design
- `skills/game/onboarding/progressive-disclosure.md` — introduce one concept at a time
- `skills/craft/affordance-design.md` — looks doable = should work

## Sources

- Mark Brown, *Super Mario 3D World's 4 Step Level Design* (GMTK 2015)
- *The Half-Life 2 Episodes - The Art of Half-Life* (dev commentary)
- Anna Anthropy, *Rise of the Videogame Zinesters*
- Don Norman, *The Design of Everyday Things* (affordance, discoverability)
- *Nintendo Differences* (Nintendo internal design guidelines)
