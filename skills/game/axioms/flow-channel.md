# Flow channel — players must stay between boredom and anxiety

> **Challenge ≈ skill → flow; challenge > skill → anxiety/quit; challenge < skill → boredom/quit.
> Keep players walking the centerline of the flow channel throughout.**

## One sentence

Game pacing is fundamentally **keeping difficulty slightly ahead of player growth**—
high enough that winning feels "almost there," but never high enough to feel impossible.

## Why

Mihály Csikszentmihalyi proposed "flow" state in *Beyond Boredom and Anxiety* (1975):
when **challenge matches ability perfectly**, humans enter total immersion, lose time awareness.

Visualized:
```
Challenge ↑
        ┌────────────────────┐
        │ Anxiety            │
        │     ╲              │
        │      ╲ Flow Channel│
        │       ╲            │
        │        ╲           │
        │         ╲          │
        │ Boredom  ╲         │
        └────────────────────→ Skill
```

- Player skill grows constantly (always practicing)
- Fixed difficulty → players drift from "challenge ≈ skill" into "challenge < skill," boring
- Sudden difficulty spike → players jump into "challenge >> skill," anxious
- Perfect design: difficulty curve **always slightly ahead** of skill, player always feels "almost there"

Games (unlike films) core feature is **active learning**. Flow is learning's ideal state.
Keep players learning, keep them playing.

## Quantified criteria

**Death-success ratio tracking**: for each level/zone, monitor death count against pass rate.

| Deaths | Meaning | Action |
|---|---|---|
| 0 deaths | Too easy | raise difficulty or complexity |
| 1–3 deaths | **flow channel** | maintain |
| 4–8 deaths | a bit hard | monitor for burnout |
| >10 deaths + <70% pass | stuck / anxious zone | lower difficulty or add guidance |

*Celeste* designed for 5–20 deaths per level; *Dark Souls* boss 10–30 deaths normal;
*Cuphead* one boss 50 deaths normal because audience skill is high.

**"One more time" test**: how quickly does player retry after death?
- < 1 sec = still in flow (design is working)
- 2–5 sec = borderline (weighing continuation)
- > 10 sec = left flow, entering frustration or fatigue

## Success cases

- **Dark Souls**: boss hard, but each death teaches (attack pattern, distance, timing). Next attempt gets slightly closer. Textbook "challenge slightly above skill."
- **Vampire Survivors**: starts slow/weak (skill 0, challenge 0), at 20 min screen fills but you are a god. Difficulty and power scale together.
- **Tetris**: block fall speed accelerates with score, always slightly faster than reaction.
- **Slay the Spire**: each fight matches your current deck strength. Stronger you → stronger enemy.

## Failure cases

- **Difficulty cliff**: level 5 easy, level 6 instant boss. Player kicked out of flow.
- **Tutorial bloat**: first 30 min teaching, player skill far exceeds challenge, bored, quit.
- **Constant difficulty**: late-game arcade "infinite enemies" feels hard but is mechanical repetition; player skill not growing, challenge not evolving, enters "numb" (not flow).
- **MMO endless grinding**: 100 hours killing same enemy, skill plateau reached long ago, pure time tax.

## How to implement in Makone / Three.js

**1. Difficulty parameters scale with time/progress**

```js
// in GameRuntime onUpdate
const difficulty = 1 + game.elapsed / 60        // +1 per minute
const enemyHP = 30 * difficulty
const enemySpeed = 3 + difficulty * 0.3
const spawnInterval = 3 / (1 + difficulty * 0.2)
```

**2. Difficulty also adapts to player performance**

```js
// track recent deaths
const recentDeaths = deathLog.filter(t => game.elapsed - t < 60).length
if (recentDeaths > 5) difficultyMultiplier *= 0.92  // quietly lower
if (recentDeaths === 0 && elapsedSinceDeath > 120) difficultyMultiplier *= 1.05  // quietly raise
```

Don't announce it; let players think "I'm getting better!" or "this is tough but fair!"

**3. Always deliver "almost won" moments**

- Death at HP 0, not -50. One-shot feels unfair
- Enemy range just reaches you, not guaranteed hit
- Jump just reaches platform, not 50% extra buffer

**4. Distinguish challenge from unfair**

- Challenge = player skill improves outcome
- Unfair = random or unavoidable

Random one-shot isn't challenge, it's unfair. Design so "I died because I made a mistake."

**5. Provide small-win anchors**

Even when overall hard, every 30 sec–1 min give "I won a round" feedback:
- Enemy kill
- Item pickup
- Checkpoint passed
- Level up

Games without small wins (even if big win is ahead) lose players.

## Common anti-flow design mistakes

- **Heavy death penalties** (drop gear / XP): player afraid to risk, stops attempting
- **Long runbacks** (10 min to boss): one failure costs 10 min, discourages retry
- **Only perfect works**: no "almost won," just "won or lost"
- **Memorization-based**: first try dies, repeat succeeds. Tests memory, not skill.

## Related skills

- `skills/game/axioms/retry-latency.md` — must lower failure cost to sustain flow
- `skills/game/mechanics/difficulty-arc.md` — concrete difficulty curve design
- `skills/game/mechanics/interesting-decisions.md` — decision carries challenge
- `skills/game/mechanics/reward-schedules.md` — reward timing for small-win anchors

## Sources

- Mihály Csikszentmihalyi, *Flow: The Psychology of Optimal Experience* (1990)
- Mihály Csikszentmihalyi, *Beyond Boredom and Anxiety* (1975)
- Jenova Chen, *Flow in Games* (thesis + foundation of *flOw* and *Journey*)
- Jesse Schell, *The Art of Game Design* (chapter 14, *The Lens of Flow*)
