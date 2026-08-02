# Entity composition — component bundles, not an inheritance tree

> **Don't build inheritance tree `class Snake extends Enemy extends Entity`.
> Build component bundle `entity = { transform, velocity, health, collider, sprite }`.
> Game object complexity comes from component composition, not class hierarchy.**

## One-liner

Inheritance says "Snake is-a Enemy" — add behavior means modify base class, hierarchy explodes.
Composition says "Snake is Entity with Movement + Health + Spawner" — add behavior is add component, zero intrusion.

## Why

Game objects are essentially **combination of orthogonal capabilities**:

- "Flying shooting robot": has movement + health + flight + shooting + animation + AI
- "Ground-crawling boss": has movement + health + no flight + melee + animation + different AI + phase-switch

With inheritance:
```
class Entity
class Mobile extends Entity { velocity }
class FlyingMobile extends Mobile { altitude }
class ShootingFlyingMobile extends FlyingMobile { shoot() }
class AnimatedShootingFlyingMobile extends ShootingFlyingMobile { animate() }
...
```

Each ability doubles class count. Two years later: 200 classes, none reusable.
**This is OOP's biggest failure pattern in game dev.**

ECS (Entity-Component-System) solution:

```
const flyingBot = {
  transform: { x, y, z },
  velocity: { dx, dy, dz },
  health: 100,
  shooter: { cooldown, projectile },
  flier: { altitude, hover },
  animator: { clip, frame },
  ai: { state: 'patrol' },
}

const groundBoss = {
  transform: { x, y, z },
  velocity: { dx, dy, dz },
  health: 5000,
  meleeAttack: { range, damage },
  animator: { clip, frame },
  ai: { phases: [...] },
}
```

Two objects **no shared base class**, but share multiple component types.
Systems (Systems) iterate by component type:

```
// MovementSystem: all entities with transform + velocity
for (const e of world.with('transform', 'velocity')) {
  e.transform.x += e.velocity.dx * dt
}

// HealthSystem: all entities with health
for (const e of world.with('health')) {
  if (e.health <= 0) world.destroy(e)
}

// ShootingSystem: all entities with shooter
for (const e of world.with('shooter')) {
  if (--e.shooter.cooldown <= 0) shoot(e)
}
```

Add ability = add component + system. Other objects unaffected.

## Quantified standards

**Signals you need refactor**:

- Inheritance depth > 3 → inevitable collapse
- One base class has > 5 subclasses → subclasses must hack base
- Changing base class breaks 10+ subclasses → refactor urgent
- "Checking type via instanceof" everywhere → you're already using components, just wrong architecture

**ECS health**:

- Each component < 10 fields
- Each system < 200 lines
- Entity definitions are data (JSON), not classes
- Any component can add to any entity without error

## Exemplar: Unity DOTS

Starting 2018, Unity pushes hard into ECS (data-oriented):

```csharp
// Traditional OOP
class Enemy : MonoBehaviour {
    public float health;
    public float speed;
    void Update() { Move(); }
}

// ECS
public struct Health : IComponentData { public float Value; }
public struct Speed : IComponentData { public float Value; }
public struct EnemyTag : IComponentData {}
// System
public class MoveSystem : SystemBase {
    protected override void OnUpdate() {
        Entities.ForEach((ref Translation t, in Speed s) => {
            t.Value.x += s.Value * Time.DeltaTime;
        }).Schedule();
    }
}
```

ECS performs 10-100x better on large entity counts (>1000) over OOP because cache-friendly.

## Exemplar: Minecraft redstone

Minecraft's block component design: each block has `BlockState` (data) + multiple `BlockEntity` (behavior).
"Redstone repeater" and "piston" don't inherit from a common base; they're independent components interacting via event bus.
Result: players build Turing-complete redstone computers because components compose freely.

## Makone current state

`src/game/GameRuntime.ts` is currently **semi-ECS**:

```ts
interface GameEntity {
  mesh: THREE.Object3D
  body: PhysicsBody | null
  tags: Set<string>
  health: number
  speed: number
  damage: number
  controller: string | null
  ai: AIConfig | null
  collectible: boolean
  // ... heap of fields
}
```

Problems:
1. All possible "abilities" crammed in one interface → field explosion
2. Unused fields must be null / 0 → hard to read
3. Add new ability (e.g., "can fly") → modify interface + all construction sites

## Recommended refactor direction

**Phase 1: Componentize fields**

```ts
type Entity = {
  id: string
  components: Map<string, any>
}

// Add component
entity.components.set('transform', { x, y, z })
entity.components.set('velocity', { dx: 0, dy: 0, dz: 0 })
entity.components.set('health', { current: 100, max: 100 })

// Query
function hasComponent(entity: Entity, name: string): boolean { ... }
function getComponent<T>(entity: Entity, name: string): T | null { ... }
```

**Phase 2: Systematize updates**

```ts
class System {
  requires: string[]    // which components needed
  update(entity: Entity, dt: number) {}
}

class MovementSystem extends System {
  requires = ['transform', 'velocity']
  update(e: Entity, dt: number) {
    const t = e.components.get('transform')
    const v = e.components.get('velocity')
    t.x += v.dx * dt
    t.y += v.dy * dt
    t.z += v.dz * dt
  }
}

// Run:
for (const sys of systems) {
  for (const e of entities) {
    if (sys.requires.every(c => e.components.has(c))) sys.update(e, dt)
  }
}
```

**Phase 3: Use Miniplex or similar lib**

[Miniplex](https://github.com/hmans/miniplex) is a lightweight TypeScript ECS:

```ts
import { World } from 'miniplex'
const world = new World<Entity>()

const player = world.add({
  transform: { x: 0, y: 0, z: 0 },
  velocity: { dx: 0, dy: 0, dz: 0 },
  health: { current: 100, max: 100 },
  player: true,
})

const enemies = world.with('transform', 'velocity', 'enemyAI')
for (const e of enemies) {
  // Auto-includes all entities with those 3 components
}
```

Miniplex is a good reference for this shape of ECS thinking, whether or not you pull it in.

## Antipatterns

**1. Pure componentism (Entity = data only)**

Overcorrection: all logic in Systems, entities become inert data → hard to reason locally about one entity.

**Correct**: entities can have small methods (`onDeath`, `onCollect` callbacks), systems handle generic update.

**2. Component granularity too fine**

```
PositionXComponent, PositionYComponent, PositionZComponent  // three components for x/y/z
```

Not worth it. One `Transform` component holding x/y/z suffices.
**Granularity rule**: fields that logically appear/disappear together = one component.

**3. Circular dependency between components**

System A accesses component B, system B accesses component A.
**Correct**: systems should be unidirectional data flow, or decouple via event bus (see `event-bus.md`).

**4. Treating components as classes (inheriting)**

```
class MovementComponent
class FlyingMovementComponent extends MovementComponent  ❌
```

Backsliding. **Components never inherit**; express differences only via composition.

## When NOT to use ECS

ECS isn't a silver bullet. Simple games might not need it:

- <50 entities → OOP fine
- Single-player + static scenes → unnecessary
- Learning project / prototype → overkill

**Threshold**: when you're writing the 3rd Enemy subclass, consider ECS.

## Makone implementation path

1. **Don't bulldoze GameRuntime immediately** — too risky
2. New features componentized: next "flying enemy" doesn't add `flying: boolean` to `GameEntity`,
   but creates `FlyingComponent`, check `entity.components.flying` in `_updateAI`
3. Gradual: each new component uses ECS pattern, old code stays
4. After 5th component, consider Miniplex or similar

## Related skills

- `skills/game/architecture/state-machines.md` — state can be a component
- `skills/three/object-pooling.md` — ECS naturally suits pooling
- `skills/game/architecture/event-bus.md` — alternative decoupling for components

## References

- Robert Nystrom, *Game Programming Patterns* — Component pattern chapter
- Unity DOTS / Unity ECS docs
- *Data-Oriented Design* — Richard Fabian
- Adam Martin, *Entity Systems are the future of MMOs* (seminal blog series)
- Miniplex GitHub — `hmans/miniplex`
