# Object pooling — high-frequency create/destroy must be pooled

> **Bullets, particles, enemies, UI elements: any object created > 5 times per second must be pooled.
> No pooling → GC pressure → frame drop → player feels stutter.
> In Three.js stricter: mesh creation involves GPU buffer upload.**

## One-liner

`new` is for "immortal" objects; high-frequency birth/death use pre-allocated pools.
Game at 60 FPS can't tolerate GC pauses.

## Why

JavaScript (including Three.js) memory model:

1. `new Mesh()` allocates heap (geometry buffer + material + uniforms)
2. Object loses reference, waits for GC
3. GC trigger **main thread pauses 5-50ms** (one frame is 16.7ms)
4. Continuous creation → frequent GC → frame stutter / lag

Game requirement: < 16.7ms per frame.
One GC pause drops frame. Lose 5 frames/sec, noticeably felt.

Three.js has extra cost:
- New Geometry → upload vertices to GPU
- New Material → compile shader (maybe tens of milliseconds!)
- New Texture → upload texture

Bullet game / particle system / danmaku no pooling → thousands objects/sec → almost certainly freezes.

## Quantified standards

**Pool trigger line**:

| Object type | No-pool threshold (count/sec) | Impact |
|---|---|---|
| Simple JS objects | > 1000 | GC pressure increases |
| THREE.Mesh | > 50 | Frame rate starts jittering |
| THREE.Geometry | > 10 | GPU upload stutter |
| THREE.Material with shader | > 1 | Tens of ms compile stall |
| THREE.Texture | > 1 | Upload stall |

**Typical scenarios needing pooling**:
- Bullets (FPS 100 shots/sec)
- Particles (explosion 30 per event)
- Floating damage numbers (one per hit)
- Enemy waves (spawn/despawn per sec)
- UI tooltip / message

## Core pooling pattern

```js
class Pool<T> {
  private free: T[] = []
  private inUse: Set<T> = new Set()
  
  constructor(
    private factory: () => T,
    private reset: (item: T) => void,
    initialSize = 32,
  ) {
    for (let i = 0; i < initialSize; i++) {
      this.free.push(factory())
    }
  }
  
  acquire(): T {
    let item = this.free.pop()
    if (!item) {
      // pool empty, expand
      item = this.factory()
    }
    this.inUse.add(item)
    return item
  }
  
  release(item: T) {
    if (!this.inUse.has(item)) return
    this.reset(item)
    this.inUse.delete(item)
    this.free.push(item)
  }
}
```

Usage:

```js
// Bullet pool
const bulletPool = new Pool(
  () => {
    const m = new THREE.Mesh(bulletGeo, bulletMat)
    m.visible = false
    scene.add(m)
    return m
  },
  (m) => {
    m.visible = false
    m.position.set(0, -1000, 0)  // move out of view
  },
  100,  // pre-allocate 100
)

// Fire
function fire() {
  const bullet = bulletPool.acquire()
  bullet.visible = true
  bullet.position.copy(playerPos)
  bullet.userData.vx = forward.x * 30
  bullet.userData.vy = forward.y * 30
  bullet.userData.vz = forward.z * 30
  bullet.userData.life = 2
}

// Per-frame update
function updateBullets(dt) {
  for (const b of bulletPool.inUse) {
    b.position.x += b.userData.vx * dt
    // ...
    b.userData.life -= dt
    if (b.userData.life <= 0) bulletPool.release(b)
  }
}
```

**Never** do `scene.remove(bullet); scene.add(newBullet)` creating per shot.

## Three.js special considerations

**1. Share Geometry and Material**

```js
// ❌ Each particle new Geo / Mat → upload 1000x to GPU
for (let i = 0; i < 1000; i++) {
  const p = new THREE.Mesh(
    new THREE.SphereGeometry(0.1),  // new Geo
    new THREE.MeshStandardMaterial(),  // new Mat
  )
}

// ✓ Share one → upload once only
const sharedGeo = new THREE.SphereGeometry(0.1)
const sharedMat = new THREE.MeshStandardMaterial()
for (let i = 0; i < 1000; i++) {
  const p = new THREE.Mesh(sharedGeo, sharedMat)
}
```

**2. InstancedMesh (>100 same model)**

```js
const count = 1000
const mesh = new THREE.InstancedMesh(geo, mat, count)
const m = new THREE.Matrix4()
for (let i = 0; i < count; i++) {
  m.setPosition(x, y, z)
  mesh.setMatrixAt(i, m)
}
mesh.instanceMatrix.needsUpdate = true
```

InstancedMesh = 1 draw call renders 1000 objects.
Best solution for particles / enemy swarms / grass.

**3. Points + PointsMaterial (>10000 particles)**

```js
const geo = new THREE.BufferGeometry()
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.1 }))
```

Lighter but limited (points only, can't rotate, no occlusion).

**4. Never call `dispose()` in loop**

```js
// ❌ Destroy syncs GPU immediately
function release(mesh) {
  scene.remove(mesh)
  mesh.geometry.dispose()
  mesh.material.dispose()
}

// ✓ Pool → reuse, never dispose
function release(mesh) {
  mesh.visible = false
  pool.return(mesh)
}
```

dispose is GPU operation, forces main thread sync. Dispose all at game end.

## Pool sizing

**Pool capacity formula**:

```
max requests per second × object lifetime = pool size
Example:
  100 shots/sec × 2 sec lifetime = 200 bullet pool
```

**Headroom**: add 50% buffer for waves.

**Pool exhausted? Three strategies**:

1. **Expand**: allocate new objects (unpredictable workloads)
2. **Reject**: return null, fire fails (not recommended, player feels it)
3. **Steal**: recycle oldest (recommended, player won't notice one bullet vanish)

```js
acquire(): T {
  if (this.free.length === 0) {
    if (this.policy === 'expand') return this.factory()
    if (this.policy === 'steal') {
      const oldest = [...this.inUse][0]
      this.inUse.delete(oldest)
      return oldest
    }
    return null
  }
  // ...
}
```

## Classic examples

- **_Geometry Wars_**: thousands bullets/particles per sec, all InstancedMesh + pooled.
- **_Vampire Survivors_**: hundreds enemies on screen + thousands projectiles, all pooled.
- **_Hades_**: every boon effect is pooled particles, never stutters.
- **_FromSoftware_ games**: boss AOE danmaku all pooled, else PS4 can't handle.

## Antipatterns

- **Beginners `Array.push` then `splice` delete**: splice is O(n), many per frame = disaster
- **Each bullet `new Mesh + scene.add`**: first wave OK, stutter after 500
- **Use `setTimeout` to destroy**: timer pile-up, GC pressure

## Makone implementation

GameRuntime currently creates/destroys entities without pooling.
High spawn rate (>10/sec) causes:
- `physics.removeBody` involves Rapier internal cleanup
- THREE add/remove involves matrix updates
- Accumulates, may drop frames

**Future refactor direction**:

```ts
class EntityPool {
  private templates: Map<string, EntityDef> = new Map()
  private pools: Map<string, GameEntity[]> = new Map()
  
  registerTemplate(name: string, def: EntityDef) { /* warm up N */ }
  spawn(name: string, position: [number, number, number]): GameEntity {
    const free = this.pools.get(name)
    let e = free.pop() ?? createNew(this.templates.get(name))
    resetEntity(e, position)
    return e
  }
  recycle(e: GameEntity) {
    // not true delete, move out of view + return to pool
    e.mesh.visible = false
    e.body.setEnabled(false)  // Rapier API
    this.pools.get(e.template).push(e)
  }
}
```

## Related skills

- `skills/game/architecture/entity-composition.md` — ECS naturally suits pooling
- `skills/game/feel/juicing.md` — particle effects biggest beneficiary of pooling
- Performance anti-pattern see Memory: `bug_collider_double_rotation`

## References

- Robert Nystrom, *Game Programming Patterns* — Object Pool pattern
- Three.js official InstancedMesh docs
- *Real-Time Rendering* (4th ed.) — GPU resource lifecycle
- Mike Acton, *Data-Oriented Design and C++* (CppCon 2014)
