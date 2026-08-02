# Retry latency — death to respawn must be under 3 seconds

> **The total length of the fail-retry loop (all UI / animation / loading) must be < 3 seconds.
> Beyond this point players switch from "one more time" to "I'm done."
> This is the hard boundary between turning frustration into challenge.**

## One sentence

Difficult games are addictive not because they are hard but because **the cost of retrying is nearly zero**.
Remove that cost and even the hardest game keeps players for 100 hours.
Keep that cost (even with easy difficulty) and one death ends the session.

## Why

The brain during failure:
- Failure moment (0-200ms): disappointment surges
- 0-2 seconds: evaluating "is it worth trying again?"
- 2-5 seconds: decision "try or quit?"
- 5-30 seconds: if not in flow, attention drifts outward (phone, room, other tasks)

**3 seconds** is where most players shift from "frustrated" to "motivated to retry."
Beyond that window, attention turns to waiting, loss becomes "real," and momentum collapses.

This is the physics that lets *Hotline Miami*, *Super Meat Boy*, *Celeste*, *Mario Maker* sustain players through hundreds of deaths.
Conversely, old JRPGs forcing 30 seconds of load screen before respawn at the last save (maybe 20 minutes back) is why players quit after one death.

## Quantified criteria

**Respawn timer**: from player death to **meaningful control** (not just seeing the screen, but pressing W moves) total time:

| Duration | Player feeling | Design grade |
|---|---|---|
| < 1 sec | "I respawned before I could react" | S (Celeste tier) |
| 1-3 sec | "Okay, again" | A (solid) |
| 3-8 sec | "Bit annoyed" | C (borderline) |
| 8-20 sec | "Bored" | D (engagement lost) |
| > 20 sec | "Closing the game" | F |

**Minimize death penalties**:
Death should cost only **progress** (replay this section), never **resources** (money, XP, gear).
Resource-punishing deaths (Dark Souls souls, MMO deleveling) only work under specific design pillars and need recovery mechanics to compensate.

## Case study: Super Meat Boy

Death → respawn = **0.5 seconds**. No cutscene, no loading, no UI.
Instant reappear at start, one invincible frame to let you input.
Dying 1000 times is the design goal. Each death teaches one thing: when does that spike come?

Result: millions sold, players accumulated over 1 billion deaths across all copies.

## Success cases

- **Celeste**: death to respawn < 0.5 sec, music never stops. Keeping music through death is *deliberate* design (Maddy Thorson documented this).
- **Mario Maker 2**: die, respawn in 1 second. World-record players die thousands of times on hard levels.
- **Hotline Miami**: die, press R, instant restart, whole level 30 seconds, 30 deaths is 15 minutes.
- **Inside**: black screen < 1 sec, back to previous checkpoint.
- **Trackmania**: die, press Enter to reset. World champions die hundreds of times per run.
- **Returnal**: roguelite, but < 5 sec restart after death (AAA upper limit).

## Failure cases

- **Old JRPGs**: die → 5 sec "Game Over" animation → 10 sec load screen → back to last save (maybe 20 min ago) → replay 20 min → reach dead boss again. Result: player quits.
- **Early Souls clones**: die → 15 sec load → run 5 min back to boss → re-engage. From Software later shortened runback distances significantly.
- **Some mobile games "revive via ad"**: die → 15 sec forced ad → continue. Sky-high churn.
- **Penalty 50% XP**: player, via loss aversion (Kahneman), stops attempting content slightly above skill. Entire flow channel collapses.
- **Sparse checkpoints in hard games**: die, lose 5 min progress. Player avoids all risk.

## Design patterns

**Checkpoint density**: every 30 sec–2 min. Boss fights checkpoint right before boss.
**Auto-save**: never manual save. Die, auto-restore from most recent checkpoint.
**Restart hotkey**: R / Esc → "retry level" one step away.
**Skip death animation**: skip unnecessary death sequences.
**Preserve progress**: collectibles / unlocked abilities do not drop on death.
**Session rewards can drop**: create tension without frustration.

## How to implement in Makone / Three.js

**1. Reset must be instant**

```js
// ✓ good
function resetPlayer() {
  player.body.setTranslation(spawnPoint, true)
  player.body.setLinvel({x:0, y:0, z:0}, true)
  player.health = player.maxHealth
  // done. no scene reload, no modal
}

// ✗ bad
function resetPlayer() {
  showDeathScreen()  // 2 sec animation
  await fadeBlack()  // 1 sec
  await reloadScene()  // tear down and rebuild → 3+ sec
  // ...
}
```

**2. Checkpoint is state snapshot**

```js
let checkpoint = { pos: ..., resources: ..., progress: ... }
function reachedCheckpoint() {
  checkpoint = snapshot(playerState)
}
function onDeath() {
  restore(checkpoint)  // instant
}
```

**3. Death → respawn transition: no fade-to-black**

Black screen feels long. Instead:
- **Red full-screen flash 100ms** (hit feedback)
- Player appears instantly at checkpoint
- Brief invulnerability 500ms for re-orientation
- Total < 1 sec

**4. Don't let "Game Over" screen own the tempo**

```js
// ✗ "You died. Press any key to retry."
//   Player enters negative mindset → quits

// ✓ instant respawn + death counter quietly +1
//   Player has no decision moment
```

**5. Make death count a badge, not shame**

```js
// Death counter shown with pride
// Celeste: "You died 1234 times! You made it!"
// Trackmania: "Restart count: 89"
```

Turn many deaths into a trophy, not a scar.

## When death penalties are necessary

Some design pillars demand weight to death (roguelite, permadeath). Then:
- **One run takes 15–30 min total**: dying and restarting is acceptable (*Hades* / *Slay the Spire*)
- **Every death earns meta-progress**: death itself is an asset (*Hades* boons)
- **Restart decision is meaningful**: not just "replay," but "change build and replay"

But even in roguelites, "die → restart run" should be **one click + 1 sec transition**, not a 30 sec menu.

## Related skills

- `skills/game/axioms/flow-channel.md` — flow requires low-cost retry
- `skills/game/mechanics/difficulty-arc.md` — hard games need fast retry more
- `skills/game/feel/juicing.md` — explosive feedback on death makes "dying" satisfying
- `skills/game/architecture/state-machines.md` — death/respawn state machine must be clean

## Sources

- Edmund McMillen, *Super Meat Boy* design postmortem
- Maddy Thorson, *Celeste & Forgiveness* (Medium, 2020)
- Mark Brown, *Why Are You Dying So Much in Hollow Knight?* (GMTK)
- *Hotline Miami* design commentary
- Don Norman, *The Design of Everyday Things* (feedback and frustration chapters)
