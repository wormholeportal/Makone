# State machines — all character behaviour is an FSM, so model it explicitly

> **Player, enemy, boss, UI, entire game are FSMs.
> Not explicit modeling = implicitly model as pile of `if/else if/else` — always bug breeding ground.
> Explicit FSM makes behavior visualizable, testable, extensible.**

## One-liner

if nested 3 deep, time for state machine.
State machine isn't "advanced technique," it's organized if-chain.

## Why

Game object behavior is essentially **transition between discrete states**:

- Player: idle / walking / jumping / airborne / attacking / dead
- Enemy: patrol / alert / chase / attack / retreat / dead
- Boss: phase 1 / phase 2 / phase 3 / dead
- Game: menu / loading / playing / paused / over

Each state has:
- Enter condition
- Ongoing behavior
- Exit condition → next state

Without FSM, code looks like:

```js
function update(e, dt) {
  if (e.health <= 0) {
    if (!e.isDying) {
      playDeathAnim(); e.isDying = true
    }
    if (e.deathTimer >= 2) destroy(e)
    e.deathTimer += dt
    return
  }
  if (e.health < 30 && !e.fleeing && distance(e, player) < 5) {
    e.fleeing = true
    e.fleeStart = Date.now()
  }
  if (e.fleeing) {
    e.vx = -dirToPlayer.x * 5
    e.vz = -dirToPlayer.z * 5
    if (Date.now() - e.fleeStart > 3000) {
      e.fleeing = false
      // ... where next?
    }
    return
  }
  if (distance(e, player) < 2 && !e.attacking) {
    e.attacking = true
    e.attackTimer = 0
  }
  // ... 50 lines nested
}
```

Reading this requires cross-referencing all `if`s to understand one state.
Adding behavior (e.g., "stunned by electricity") = change 10 places.
Guaranteed bugs.

With FSM:

```js
const enemyFSM = {
  patrol: {
    update(e, dt) { e.move(patrolPath, dt) },
    transitions: [
      { when: e => distance(e, player) < 8, to: 'alert' },
    ],
  },
  alert: {
    enter(e) { e.startle() },
    update(e, dt) { e.lookAt(player) },
    transitions: [
      { when: e => distance(e, player) < 5, to: 'chase' },
      { when: e => distance(e, player) > 12, to: 'patrol' },
    ],
  },
  chase: {
    update(e, dt) { e.moveTo(player, dt) },
    transitions: [
      { when: e => distance(e, player) < 1.5, to: 'attack' },
      { when: e => e.health < 30, to: 'flee' },
    ],
  },
  // ...
}
```

Crystal clear. Add state just adds one entry.

## Quantified standards

**Signals to refactor to FSM**:

- Behavior code uses > 3 boolean flags (`isAttacking`, `isFleeing`, `isStunned`...)
- Same function has > 5 if/else if branches
- Debugging finds weird state combinations (e.g., `isFleeing && isAttacking` both true)
- Adding behavior, don't know where to change

**FSM health**:

- State count < 10 (more → use hierarchical/nested FSM)
- Each state has < 5 transitions
- No bidirectional transitions (A→B and B→A both allowed) — easy loops

## 4 FSM implementation approaches (simple to complex)

### 1. Switch FSM

Simplest:

```js
function update(e, dt) {
  switch (e.state) {
    case 'patrol':
      e.move(patrolPath, dt)
      if (distance(e, player) < 8) e.state = 'alert'
      break
    case 'alert':
      e.lookAt(player)
      if (distance(e, player) < 5) e.state = 'chase'
      break
    // ...
  }
}
```

Works, but switch grows huge with many states.

### 2. Table-driven FSM

```js
const STATE_TABLE = {
  patrol:  { update: doPatrol,  transitions: [...] },
  alert:   { update: doAlert,   transitions: [...] },
  chase:   { update: doChase,   transitions: [...] },
}
function update(e, dt) {
  STATE_TABLE[e.state].update(e, dt)
  for (const t of STATE_TABLE[e.state].transitions) {
    if (t.when(e)) { e.state = t.to; break }
  }
}
```

Modular, easy to visualize.

### 3. Class FSM

```js
class PatrolState {
  enter(e) { e.color = 'green' }
  update(e, dt) { e.move(...) }
  exit(e) { ... }
  checkTransitions(e) {
    if (distance(e, player) < 8) return 'alert'
    return null
  }
}
```

Each state has full lifecycle (enter/update/exit), suits complex logic.

### 4. Hierarchical FSM (HFSM)

States themselves can be FSMs:

```js
// Top level: game state
const game = FSM('menu', 'playing', 'paused', 'over')

// 'playing' state internally is FSM:
const playingFSM = FSM(
  // Sub-states: explore / combat / dialogue
  { explore: ..., combat: ..., dialogue: ... }
)
```

Essential for complex games. Skip for simple ones.

## Classic example: Pac-Man ghosts

Pac-Man's 4 ghosts are all FSMs:

```
scatter → chase → frightened → eaten → scatter
   ↑        ↓        ↓           ↓
   └────────┴────────┴───────────┘
```

- **Scatter**: go to own corner (4 ghosts each have target corner)
- **Chase**: chase player (4 ghosts each use different algorithm — Blinky direct chase, Pinky predicts 4 ahead)
- **Frightened**: after power pellet, flee (blue, slow, can be eaten)
- **Eaten**: eaten by player, return home respawn (eyes only)

Whole game's emergence stems from these 4 FSMs' different **chase algorithms** + different **Scatter targets**.
Minimal state machine, complex gameplay.

## Classic example: Mario character states

```
small → big → fire/cape → small (hit) → dead (hit) → spawn
```

Plus airborne states (jumping / falling / wall_sliding / swimming) and horizontal states (idle / running / sliding).
Nintendo code has explicit FSMs.

## Makone current state

GameRuntime currently almost no explicit FSM:

```ts
private _state: 'playing' | 'paused' | 'gameover' | 'victory' = 'playing'
```

Only top-level 4 states. Each entity behavior is hardcoded in `_updateController`, `_updateAI`.

**Signs needing refactor**:
- `entity.alive` + `entity._invincible` + `entity._stunTimer` + `entity._lastAttackTime` already 4 implicit state variables
- AI `chase / patrol / idle` is enum, but no explicit enter/exit

## How to introduce FSM in Makone

**Step 1: Convert AI behavior to explicit FSM**

```ts
// types.ts
export interface AIConfig {
  states: {
    [name: string]: {
      enter?: (e: Entity) => void
      update?: (e: Entity, dt: number) => void
      exit?: (e: Entity) => void
      transitions: Array<{ when: (e: Entity) => boolean; to: string }>
    }
  }
  initial: string
}

// Add currentState to GameEntity
interface GameEntity {
  // ...
  aiState: string  // current state name
}
```

**Step 2: _updateAI dispatches with FSM**

```ts
private _updateAI(dt: number) {
  for (const e of this.entities) {
    if (!e.ai) continue
    const state = e.ai.states[e.aiState]
    state.update?.(e, dt)
    for (const t of state.transitions) {
      if (t.when(e)) {
        state.exit?.(e)
        e.aiState = t.to
        e.ai.states[t.to].enter?.(e)
        break
      }
    }
  }
}
```

**Step 3: Playerify state machine**

```ts
const playerStates = {
  idle: {
    update: (e, dt) => { /* receive input */ },
    transitions: [
      { when: e => input.direction != 0, to: 'moving' },
      { when: e => input.attack, to: 'attacking' },
      { when: e => e.health <= 0, to: 'dying' },
    ],
  },
  moving: { /* ... */ },
  attacking: {
    enter: e => playAnim('attack'),
    update: (e, dt) => { /* wait for anim end */ },
    transitions: [
      { when: e => animDone, to: 'idle' },
    ],
  },
  dying: {
    enter: e => playAnim('death'),
    transitions: [
      { when: e => animDone, to: 'gameOver' },
    ],
  },
}
```

## FSM debugging techniques

**1. Display current state**

```js
// Show each entity's current state string (dev mode)
const text = createTextSprite(entity.aiState)
text.position.copy(entity.mesh.position).add(new Vector3(0, 2, 0))
```

Visually see enemy patrol/alert/chase transitions, debug super fast.

**2. State transition logging**

```js
function changeState(e, newState) {
  console.log(`[${e.id}] ${e.aiState} → ${newState}`)
  // ...
}
```

Replay log shows full AI decision chain.

**3. Forbid certain transitions**

```js
// Dying state can't transition to any alive state
if (e.aiState === 'dying' && newState !== 'dying') {
  throw new Error('Cannot resurrect from dying state')
}
```

Force constraints prevent accidents.

## Antipatterns

**1. Too many states (>20)**
Becomes spaghetti state graph, might as well not use.
**Correct**: hierarchical FSM, or rethink if really need that many.

**2. Blurry state boundaries**
"Mid-attack but can also dodge" → should be sub-state not outside.
**Correct**: define clear "mutually exclusive" states.

**3. State depends on external data**
State transitions depend on globals, other entity states → hard to test.
**Correct**: pass info via events (see `event-bus.md`).

**4. Forgotten states**
Forgot "just spawned, not initialized" or "destroying" → rare bugs.
**Correct**: add `'spawning'` and `'destroying'` states covering full lifecycle.

## Related skills

- `skills/game/architecture/entity-composition.md` — FSM can be component
- `skills/game/architecture/event-bus.md` — state transitions triggered by events
- `skills/game/mechanics/interesting-decisions.md` — Boss phase switches are design choices

## References

- Robert Nystrom, *Game Programming Patterns* — State pattern
- Ian Millington, *Artificial Intelligence for Games* — FSM chapter
- *AI Game Programming Wisdom* series
- David Harel, *Statecharts: A Visual Formalism* (1987) (hierarchical FSM pioneer)
