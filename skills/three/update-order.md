# Update-loop ordering — why "what runs when" is a correctness concern

> When two systems mutate the same state in one frame, the order they run
> isn't a style choice — it determines whether the output is correct.
> Get it wrong and you get **jitter, missed inputs, one-frame visual
> glitches, or invisible animations**.
>
> This is a class of bug that doesn't show up in unit tests because each
> system works correctly in isolation. It only manifests when they
> interact through shared state across frames.

## The shared-state problem

Most game systems read and write a small set of shared "hot" objects:
the camera transform, the player transform, physics state. If System A
writes to `camera.position` and System B writes to `camera.position`
in the same frame, the order matters AND each system must understand
that the other might have moved things.

```text
SystemA → camera.position = P0 + offsetA
SystemB → camera.position = P1
SystemA next frame → reads camera.position (sees P1, thinks "we got moved")
```

If SystemA assumes it owns the camera, it might "restore" to P0 — undoing
SystemB's update. Result: visible flicker every frame.

## The canonical ordering rule

```
1. INPUT        — sample raw input device state
2. AI / INTENT  — enemies decide actions; player intent computed
3. PHYSICS      — apply forces; integrate velocity → position
4. COLLISION    — resolve overlaps; clamp to bounds
5. GAME LOGIC   — score, triggers, events, win/lose checks
6. CAMERA       — position camera based on resolved positions
7. EFFECTS      — visual additives that piggyback on transforms
                  (screen shake, lens flares, post-fx feedback)
8. RENDER       — finalize frame
```

Each step **reads from the step above**. Each step **writes to its own
domain**. Effects (step 7) read transforms but only ADD; they don't move
objects.

This isn't dogma; it's the consequence of two principles:
- **Data dependencies** dictate order (you can't camera-follow a player
  whose position isn't yet resolved this frame).
- **Effects are visual icing**, not gameplay; they go last so they don't
  interfere with logic.

## The "piggyback effects" trap

Screen shake, camera bob, walk-cycle camera, breathing animation, lens
distortion — all of these are **effects layered on top of a camera
position someone else owns**.

The naive implementation:
```js
shake.tick(dt)         // mutates camera.position with shake offset
updateCamera(dt)       // OVERWRITES camera.position to follow player
                       // ⇒ shake never visible!
```

Or worse:
```js
shake.tick(dt)         // saves camera.position as base, then adds offset
updateCamera(dt)       // overwrites with new position
shake.tick(dt) (next frame) → "restore" to previous base (now stale)
                       // ⇒ camera flickers to old position every frame
```

### The fix: piggybacks run AFTER

```js
updateCamera(dt)       // camera positions itself
shake.tick(dt)         // adds offset on top of camera's new position
render()
```

### And: the piggyback system must detect external mutation

If the piggyback system has internal state (e.g., shake stores `basePos`
to restore to), it must check **whether the value it sees this frame
matches what it left last frame**. If they differ, an external system
moved the transform — accept the new value as the new base, don't
"restore" to the old base.

```js
tick(dt) {
  if (this.hasBase) {
    const moved = camera.position.distanceTo(this.expectedPos) > 0.001
    if (!moved) {
      // External system didn't touch it — safe to restore base + reapply offset
      camera.position.copy(this.basePos)
    }
    // else: someone else moved it — accept current as new base
  }
  this.basePos.copy(camera.position)
  this.applyOffset()
  this.expectedPos.copy(camera.position)
}
```

This pattern (compare-to-expected) makes the piggyback robust to ordering
mistakes AND to other systems with which it intentionally shares the
transform.

## Other common ordering bugs

### A. AI deciding from stale physics

```js
ai.tick(dt)            // AI reads enemy.position
physics.tick(dt)       // physics resolves enemy.position to new value
                       // ⇒ AI made decisions based on stale positions
```

Fix: physics resolves first, AI decides on resolved positions. In
practice, this often means TWO physics passes (intent → broad-phase →
AI → narrow-phase) — common in 2D platformers.

### B. Trigger events firing before collision resolution

```js
checkTriggers(...)     // checks "did Mario enter the goal?"
physics.tick(dt)       // moves Mario, now he's IN the goal but trigger missed it
```

Fix: resolve positions FIRST, then evaluate triggers on resolved state.

### C. UI reading stale game state

```js
updateGame(dt)         // game tick, advances score
ui.render()            // displays score, but might race because score updated
                       // mid-frame in a callback
```

Fix: UI reads at the END of the frame, never during game logic.

### D. Particles spawning at "old" positions

A common particle pattern: "spawn particles at player position". If
particles are emitted DURING player update (before physics resolution),
the particles spawn at the player's pre-resolved position. Result: a
one-frame visual lag in particle origin (e.g., footstep particles trail
behind the player).

Fix: emit particles AFTER the entity finishes moving for this frame.

## Hitstop / time-scale interactions with this

When you introduce time-scaling (hitstop, slow-mo, bullet-time), the
update order takes on a new dimension: **which systems use scaled-dt
and which use real-dt?**

```js
const realDt = clock.getDelta()
hitstop.tick(realDt)           // hitstop itself uses real time
const gameDt = realDt * hitstop.scale

ai.tick(gameDt)                // AI freezes during hitstop ✓
physics.tick(gameDt)           // physics freezes ✓
particles.tick(realDt)         // particles keep playing (look stuck if scaled)
input.poll(realDt)             // input always responsive
ui.tick(realDt)                // UI keeps animating
camera.tick(realDt)            // camera keeps moving (subtle: feels alive)
shake.tick(realDt)             // shake plays through the freeze
render()
```

The rule: **gameplay-affecting systems use scaled-dt; player-feedback
systems use real-dt**. Mixing them produces frozen UI or frozen particles
during slow-mo, which feels broken.

## The "all systems share `dt`" antipattern

Tempting:
```js
function tick(dt) {
  for (const sys of systems) sys.tick(dt)
}
```

This is fine when systems are independent. Not fine when they share
mutable state. The moment you add shake / hitstop / camera-follow, the
loop must become explicit about order.

**You will eventually need explicit order**. Build the loop expecting it
from day one rather than retrofitting when bugs appear.

## Data coherence — single source of truth

> The other class of "ordering"-flavored bug: not WHEN you query, but
> WHICH copy of the data you query. When the same conceptual state has
> two representations (one static, one mutable), queries hitting the
> wrong one produce ghosts.

### The pattern that breaks

Many engines store entity data twice:
- **Static / authoring data** — the level file, the spawn config, the
  scene graph at load time. Designed to never change.
- **Runtime state** — the actual entity objects holding "alive", "health",
  "destroyed" flags, mutated by gameplay.

The bug appears when gameplay code MUTATES the runtime state (sets
`alive = false`, removes the mesh) but **collision / interaction code
queries the static data** (re-reads the level file, the spawn array).
The entity is visually gone but its "ghost" still blocks the player.

### Why it's so easy to hit

Reading the static data is fast and convenient:
```js
function tileSolid(x, y) {
  return LEVEL[y][x] !== '.'   // ← static; never updates
}
```

Whereas reading the runtime state requires an indirection:
```js
function tileSolid(x, y) {
  const tile = tileGrid[`${x},${y}`]   // runtime
  return tile ? tile.alive : false
}
```

The static form is shorter, often written first. The bug surfaces only
after the FIRST gameplay event that mutates state — destroyed terrain,
killed enemy, opened door — and even then, only when something tries to
collide with the now-invisible ghost.

### The rule

**One canonical source for each piece of state. Every query goes through
it. The other representation, if it exists, is read-only initialization
data and gets cited only at load time.**

```js
// Load — static is read ONCE to populate runtime
for (const def of STATIC_LEVEL) {
  runtimeEntities.push(makeEntity(def))
}

// Forever after — only runtime is queried
function isSolid(x, y) {
  const e = lookup(runtimeEntities, x, y)
  return e?.alive ?? false
}
```

### Common manifestations of this bug

- **Smashed wall still blocks** — destroyed mesh removed from scene; collision
  function reads the original level layout.
- **Killed enemy still damages on contact** — enemy mesh removed; AI list
  filters dead enemies; **but collision lookup still iterates the spawn array**.
- **Picked-up item respawns next room** — item collected (runtime flag),
  but room state read from level file on load → item placed again.
- **Opened door re-closes after save/load** — runtime state lost; static
  state restored.

### Fixes by manifestation

| Bug | Fix |
|---|---|
| Static-vs-runtime collision mismatch | All collision queries go through the runtime grid/list. Static data is touched ONLY at level load. |
| State lost on save/load | Serialize the runtime mutations into the save; replay on load. |
| Multiple systems mutate same field independently | Single owning system; others read but don't write. |

### Diagnostic

After implementing a gameplay event that destroys or transforms world state
(destruction, death, pickup, door, switch), **immediately test**:
- After the event, can the player move through where the thing was?
- After the event, do queries about "what's at that location" return the
  new state?

If either is no — you have a static-vs-runtime mismatch. Fix it by
re-pointing the query to the runtime source.

This is one of the highest-recurrence bug classes in tile-based and
entity-based games. **Spend 30 seconds at load time to verify** that
every "is this here / alive / present" query goes through the runtime
state, not the static authoring data.

## A diagnostic: when something visual flickers

If you see a one-frame flicker (camera snap-back, particle position lag,
HUD update on wrong frame), the cause is almost certainly an ordering bug.
Walk the data dependency graph:
1. What's flickering reads from what state?
2. What writes to that state in the frame?
3. In what order? Is there a stale read?
4. Should the reader be later in the loop, or should the writer be earlier?

90% of the time the fix is **moving one system call to a different point
in the loop** — no code changes inside any system.
