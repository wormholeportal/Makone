# Event bus — decouple systems by emitting, not calling

> **Don't let "enemy dies" directly call "add score + play sfx + drop item + update achievement".
> Let "enemy dies" emit an event; each system subscribes to what it cares about.
> Tightly coupled code: add 1 feature → modify 10 places. Decoupled: add 1 feature → modify 1 place.**

## One-liner

Each system only cares about its own business.
Let events flow through systems rather than systems calling each other.
Reduce code changes by 90%.

## Why

Games consist of multiple systems (combat, UI, audio, achievements, statistics, quests, saving).
Each system reacts to "enemy dies":

```js
// ❌ Tightly coupled
function killEnemy(enemy) {
  enemy.die()
  score += enemy.value          // scoring system
  player.gold += enemy.gold     // currency system
  ui.showFloatingText('+10')    // UI system
  audio.play('enemy-death')     // audio system
  achievements.checkKills()     // achievement system
  questManager.notify('kill')   // quest system
  stats.totalKills++            // stats system
  saveGame()                    // persistence system
  particleSystem.explosion()    // effects system
}
```

Problems:
- Add new system ("enemy death triggers blood rain") → must modify `killEnemy`
- Change any system → might break others
- Unit tests must mock all dependencies
- Combat system knows too much

**Event bus version**:

```js
// ✓ Decoupled
function killEnemy(enemy) {
  enemy.die()
  events.emit('enemy:died', { enemy, killer: player })
}

// Each system subscribes independently:
events.on('enemy:died', e => { score += e.enemy.value })
events.on('enemy:died', e => { player.gold += e.enemy.gold })
events.on('enemy:died', e => { ui.showFloating('+10') })
events.on('enemy:died', e => { audio.play('enemy-death') })
events.on('enemy:died', e => { achievements.check() })
// ...
```

Combat system **doesn't know** 7 listeners exist.
Add new feature = add one `events.on(...)`, modify no old code.

## Quantified standards

**Signals to use event bus**:

- Same function called by > 3 systems → decouple it
- One action triggers > 5 side effects → use events
- Direct cross-module imports → should use events

**Event bus health**:
- Event names consistent (`namespace:action` like `player:moved`, `enemy:died`)
- Event data is plain objects, no functions
- Don't emit events from handlers (avoid infinite loops) — or cap depth
- Mock event bus in tests

## 3 implementation tiers for event bus

### 1. Simple Pub/Sub (< 50 lines)

```ts
class EventBus {
  private listeners = new Map<string, Set<Function>>()
  
  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event).add(handler)
    return () => this.off(event, handler)  // return unsubscribe function
  }
  
  off(event: string, handler: Function) {
    this.listeners.get(event)?.delete(handler)
  }
  
  emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach(h => h(...args))
  }
}

const events = new EventBus()
```

Works for 99% of games.

### 2. Typed events (TypeScript)

```ts
type GameEvents = {
  'player:moved': { from: Vector3, to: Vector3 }
  'player:died': { cause: string }
  'enemy:died': { enemy: GameEntity, killer: GameEntity }
  'item:collected': { item: Item, by: GameEntity }
}

class TypedEventBus<E> {
  on<K extends keyof E>(event: K, handler: (data: E[K]) => void) { ... }
  emit<K extends keyof E>(event: K, data: E[K]) { ... }
}

const events = new TypedEventBus<GameEvents>()

events.on('enemy:died', (data) => {
  // TypeScript knows types of data.enemy / data.killer
})
```

### 3. Event queue (async / cross-frame)

```ts
class EventQueue {
  private queue: Array<{ event: string, data: any }> = []
  
  emit(event: string, data: any) {
    this.queue.push({ event, data })  // doesn't fire immediately
  }
  
  flush() {
    const events = this.queue
    this.queue = []
    for (const { event, data } of events) {
      this.listeners.get(event)?.forEach(h => h(data))
    }
  }
}

// Flush at end of game loop
function tick(dt) {
  updateSystems(dt)
  events.flush()  // all events this frame handled together
  render()
}
```

Benefit: prevents event-triggers-event recursion.

## Naming convention

```
namespace:action[:detail]

✓ player:moved
✓ player:died
✓ enemy:spawned
✓ enemy:died
✓ item:collected
✓ wave:started
✓ wave:cleared
✓ ui:shopOpened
✓ achievement:unlocked

✗ playerDied (no namespace)
✗ death (too generic)
✗ ENEMY_DIED (inconsistent caps)
```

## Classic examples

### Phaser (JS game engine)

Built-in EventEmitter used globally. Each object inherits EventEmitter, can `obj.on('eventName', handler)`.
Community built countless plugins on this; each plugin self-contained.

### Unity Event System

Unity's UnityEvent + EventSystem. Developers can drag-connect:
- "Button clicked" → "play sfx" + "deduct gold" + "open UI"
Zero code, still decoupled.

### Hades

Supergiant publicly uses event bus extensively:
- Character behavior emits events
- Boons / status effects / achievements are subscribers
- Add new boon = add one file + one listener, zero existing code changed

## Antipatterns

- **Newbie OOP games**: all logic shoved in update function → 1000-line update, unreadable and unmaintainable.
- **Over-coupled components**: component A calls component B directly → removing B breaks A.
- **Global variables**: `window.gameState.score++` scattered everywhere → no idea who changes it.
- **Callback hell**: nested callbacks (old Node.js style) → hard to trace.

## Implementation in Makone

**Step 1: build simple EventBus**

```ts
// src/game/EventBus.ts
export class EventBus {
  private listeners = new Map<string, Set<Function>>()
  
  on(event: string, handler: (data: any) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(handler)
    return () => this.listeners.get(event)?.delete(handler)
  }
  
  emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach(h => {
      try { h(data) } catch (e) { console.error(`[EventBus] handler error for ${event}`, e) }
    })
  }
  
  clear() {
    this.listeners.clear()
  }
}
```

**Step 2: add one to GameRuntime**

```ts
export class GameRuntime {
  events = new EventBus()
  
  dealDamage(target, amount, source) {
    if (!target.alive) return
    target.health -= amount
    
    // emit event instead of calling directly
    this.events.emit('entity:damaged', { entity: target, amount, source })
    
    if (target.health <= 0) {
      this.events.emit('entity:died', { entity: target, killer: source })
      this.destroy(target)
    }
  }
}
```

**Step 3: business code subscribes**

```ts
// in world file
const game = await GameRuntime.create(container, {...})

game.events.on('entity:died', ({ entity, killer }) => {
  if (entity.tags.has('enemy')) {
    game.score += enemyValues[entity.data.type] ?? 10
    spawnDustBurst(entity.mesh.position.x, entity.mesh.position.z)
  }
  if (entity === player) {
    game.gameOver('You died!')
  }
})

game.events.on('entity:damaged', ({ entity, amount }) => {
  if (entity === player) {
    cameraShake(0.2, 100)
    hud.updateHealth(entity.health)
  }
})
```

**Step 4: cleanup on dispose**

```ts
dispose() {
  this.events.clear()
  // ...
}
```

## Anti-patterns

### 1. Event naming chaos

`'kill'` vs `'killed'` vs `'entityKilled'` vs `'OnKill'` → inconsistent → easy typos.
**Solution**: define constants or enum, enforce consistency.

```ts
const EVENTS = {
  PLAYER_DIED: 'player:died',
  ENEMY_DIED: 'enemy:died',
} as const
```

### 2. Events carry too much data

```js
events.emit('enemy:died', { enemy, player, allEnemies, world, time, ... })  // kitchen sink
```

**Solution**: carry only the minimal data subscribers need.

### 3. Event recursion

```js
events.on('enemy:died', () => {
  events.emit('player:gainedXP', xp)
})
events.on('player:gainedXP', (xp) => {
  if (xp > threshold) events.emit('player:leveledUp', ...)
})
events.on('player:leveledUp', () => {
  events.emit('enemy:died', strongerEnemy)  // infinite loop!
})
```

**Solution**: use event queue (async flush) to avoid sync recursion, or cap depth.

### 4. No cleanup

Subscribe but don't unsubscribe when scene changes → stale handlers → memory leak / double-fire.
**Solution**: `eventBus.clear()` on dispose, or save unsubscribe function.

### 5. Global singleton vs layered

```js
// ✗ Global singleton
const globalEvents = new EventBus()
// Anyone can listen to anything → hard to trace

// ✓ Layered
class GameRuntime { events = new EventBus() }
class HUD { events = new EventBus() }
// Subscribe to game.events for game events
// Subscribe to hud.events for HUD events
```

## When NOT to use event bus

- Simple two-object interaction (direct call clearer)
- Performance-critical inner loop (event dispatch has overhead)
- 1 sender + 1 fixed receiver (callback more direct)

## Related skills

- `skills/game/architecture/entity-composition.md` — ECS + event bus is classic combo
- `skills/game/architecture/state-machines.md` — state transitions triggered by events
- `skills/three/object-pooling.md` — pool lifecycle events

## References

- Robert Nystrom, *Game Programming Patterns* — Observer / Event Queue patterns
- *Design Patterns: Elements of Reusable Object-Oriented Software* — GoF
- Unity Event System documentation
- Phaser EventEmitter documentation
- *Hades* design talk (Supergiant)
