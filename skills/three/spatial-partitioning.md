# Spatial partitioning — past ~100 entities, neighbour queries need structure

> **Brute-force N² check (each vs each) at 100 entities = 10K checks/frame; 1000 entities = 1M checks/frame = freezes.
> Use Grid / Quadtree / BVH to partition scene by position, queries drop from N² to N log N or N.
> Three.js has Octree built-in, Rapier has BVH built-in. Just use them.**

## One-liner

10 enemies → any code fast enough.
100 enemies → bad code starts lagging.
1000 enemies → no spatial partitioning = certain death.

## Why

Games often need "neighbor queries":

- Which enemy does bullet hit? (each bullet × each enemy)
- Enemies in AOE? (each AOE × each enemy)
- Objects in camera frustum? (each object)
- Pickups within 5m of player? (each frame × each item)

Naive approach:

```js
for (const bullet of bullets) {
  for (const enemy of enemies) {
    if (distance(bullet, enemy) < 1) hit(bullet, enemy)
  }
}
// 100 bullets × 100 enemies = 10K distance calcs / frame
// 60 fps = 600K / sec
```

Distance calc is cheap, 100K/sec is fine. But add *Vampire Survivors* scale (1000+ entities):

- 1000 projectiles × 1000 enemies = 1M calcs/frame × 60fps = **60M/sec**

~16ms/frame can't compute this → frame drop → freeze.

**Solution**: pre-partition scene by position, only check "potentially near" entities.

## Quantified standards

| Entity count | Recommended |
|---|---|
| < 50 | Brute-force N² fine |
| 50-200 | Uniform Grid |
| 200-1000 | Uniform Grid or Quadtree |
| 1000-10000 | Quadtree / Octree |
| > 10000 | BVH / professional engine structure |

## 3 main approaches

### 1. Uniform Grid

Simplest. Divide world into N×N cells, each entity belongs to one cell.

```ts
const CELL_SIZE = 4
const grid = new Map<string, Set<Entity>>()

function cellKey(x: number, z: number): string {
  return `${Math.floor(x / CELL_SIZE)},${Math.floor(z / CELL_SIZE)}`
}

function rebuild(entities: Entity[]) {
  grid.clear()
  for (const e of entities) {
    const key = cellKey(e.pos.x, e.pos.z)
    if (!grid.has(key)) grid.set(key, new Set())
    grid.get(key)!.add(e)
  }
}

function queryRadius(x: number, z: number, radius: number): Entity[] {
  const cells = Math.ceil(radius / CELL_SIZE)
  const cx = Math.floor(x / CELL_SIZE)
  const cz = Math.floor(z / CELL_SIZE)
  const result: Entity[] = []
  
  for (let dx = -cells; dx <= cells; dx++) {
    for (let dz = -cells; dz <= cells; dz++) {
      const set = grid.get(`${cx + dx},${cz + dz}`)
      if (!set) continue
      for (const e of set) {
        const ex = e.pos.x - x, ez = e.pos.z - z
        if (ex*ex + ez*ez <= radius*radius) result.push(e)
      }
    }
  }
  return result
}
```

**Pros**: simple (30 lines). Query O(1) amortized.
**Cons**: uneven distribution wastes space / many empty cells.

### 2. Quadtree (or Octree for 3D)

Subdivide on-demand: dense regions get finer cells, empty regions stay coarse.

```ts
class Quadtree {
  bounds: AABB
  entities: Entity[] = []
  children: Quadtree[] | null = null
  
  constructor(bounds: AABB, public maxEntities = 8, public maxDepth = 6) {
    this.bounds = bounds
  }
  
  insert(e: Entity, depth = 0) {
    if (this.children) {
      // already subdivided, recurse to children
      for (const c of this.children) {
        if (c.bounds.contains(e.pos)) {
          c.insert(e, depth + 1)
          return
        }
      }
    }
    
    this.entities.push(e)
    
    if (this.entities.length > this.maxEntities && depth < this.maxDepth) {
      this.subdivide()
      const old = this.entities; this.entities = []
      for (const e of old) this.insert(e, depth + 1)
    }
  }
  
  subdivide() {
    const { x, z, w, h } = this.bounds
    this.children = [
      new Quadtree({ x, z, w: w/2, h: h/2 }),
      new Quadtree({ x: x + w/2, z, w: w/2, h: h/2 }),
      new Quadtree({ x, z: z + h/2, w: w/2, h: h/2 }),
      new Quadtree({ x: x + w/2, z: z + h/2, w: w/2, h: h/2 }),
    ]
  }
  
  query(area: AABB, result: Entity[] = []): Entity[] {
    if (!this.bounds.intersects(area)) return result
    for (const e of this.entities) {
      if (area.contains(e.pos)) result.push(e)
    }
    if (this.children) {
      for (const c of this.children) c.query(area, result)
    }
    return result
  }
}
```

**Pros**: space-efficient for uneven distribution. Query O(log N).
**Cons**: complex. Per-frame rebuild has cost.

### 3. BVH (Bounding Volume Hierarchy)

Tree built from object bounding boxes. Three.js uses this for Raycaster.

**Pros**: ray-intersection queries super fast. Standard for 3D.
**Cons**: insertion complex. Usually use ready-made (Three.js Octree, bvh-three).

## When to rebuild

Space structure needs updating when entities move. 3 strategies:

### 1. Full rebuild per frame (brute)

```js
function tick() {
  grid.rebuild(allEntities)  // rebuild from scratch each frame
  for (const e of entities) {
    const nearby = grid.queryRadius(e.pos, 5)
    // ...
  }
}
```

Simple. 100 entities ~1ms rebuild. Sufficient up to 1000 entities.

### 2. Incremental updates

Only update when entity moves to new cell.
Saves CPU but code complex.

### 3. Double-buffer

Frame A builds using frame B's data; switch next frame.
Avoids read-write conflicts (multi-threaded ECS).

## Classic examples

### Vampire Survivors

1000+ enemies on screen + thousands projectiles.
All collision checks via grid. Otherwise impossible 60fps.

### Minecraft

Chunk system is spatial partitioning taken to extremes:
- World split into 16×16×256 chunks
- Render only nearby N chunks
- Physics simulate only nearby chunks
- Far chunks unload to disk

Makes "infinite world" possible.

### Three.js Octree

```js
import { Octree } from 'three/addons/math/Octree.js'

const octree = new Octree()
octree.fromGraphNode(scene)  // build from scene

// Ray intersection test (several times faster than naive raycast)
const result = octree.rayIntersect(ray)
```

## Implementation in Makone / Three.js

**Makone status**: GameRuntime `_updateAI` and `_pickupSweep` are both O(N²):

```ts
private _pickupSweep(): void {
  const player = this._cameraTarget
  for (const e of this.entities) {  // O(N)
    if (!e.alive || !e.collectible) continue
    // ... distance check
  }
}

private _updateAI(dt: number): void {
  for (const e of this.entities) {  // O(N) × ... 
    // each AI calculates distance to player
  }
}
```

Fine for < 50 entities. For "thousand-enemy wave survivor" style, refactor needed.

**Minimal invasive refactor**:

```ts
class SpatialGrid {
  private cellSize: number
  private cells = new Map<string, GameEntity[]>()
  
  constructor(cellSize = 4) {
    this.cellSize = cellSize
  }
  
  rebuild(entities: GameEntity[]) {
    this.cells.clear()
    for (const e of entities) {
      if (!e.alive) continue
      const key = this.key(e.mesh.position.x, e.mesh.position.z)
      if (!this.cells.has(key)) this.cells.set(key, [])
      this.cells.get(key)!.push(e)
    }
  }
  
  queryRadius(x: number, z: number, r: number, tag?: string): GameEntity[] {
    const result: GameEntity[] = []
    const cells = Math.ceil(r / this.cellSize)
    const cx = Math.floor(x / this.cellSize)
    const cz = Math.floor(z / this.cellSize)
    
    for (let dx = -cells; dx <= cells; dx++) {
      for (let dz = -cells; dz <= cells; dz++) {
        const bucket = this.cells.get(this.key((cx + dx) * this.cellSize, (cz + dz) * this.cellSize))
        if (!bucket) continue
        for (const e of bucket) {
          if (tag && !e.tags.has(tag)) continue
          const ex = e.mesh.position.x - x
          const ez = e.mesh.position.z - z
          if (ex*ex + ez*ez <= r*r) result.push(e)
        }
      }
    }
    return result
  }
  
  private key(x: number, z: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`
  }
}

// In GameRuntime:
private spatial = new SpatialGrid(4)

private _loop = () => {
  // ...
  if (this._state === 'playing') {
    this.spatial.rebuild(this.entities)  // rebuild each frame
    this._updateController(dt)
    this._updateAI(dt)
    // ...
  }
}

private _pickupSweep() {
  const player = this._cameraTarget
  if (!player) return
  const nearby = this.spatial.queryRadius(player.mesh.position.x, player.mesh.position.z, 1.4)
  for (const e of nearby) {
    if (!e.collectible) continue
    // pickup
  }
}
```

## Performance budget

16.67ms/frame budget:
- Rebuild grid (100 entities): 0.1ms
- AOE query (10 AOEs × 50 affected entities): 0.5ms
- Render + physics: 10ms
- Buffer: 6ms

**100-entity grid done right has zero frame impact**.

## Antipatterns

### 1. Grid but rebuild each query

```js
// ❌ Build grid each query
function query(...) {
  const grid = buildGrid(entities)
  return grid.queryRadius(...)
}
```

**Solution**: Reuse grid, rebuild once per frame.

### 2. Cell too large or too small

- Too large (CELL_SIZE=100, avg query radius 5) → returns many irrelevant → no gain
- Too small (CELL_SIZE=0.1, avg radius 5) → scans 1000 cells → slow

**Solution**: CELL_SIZE ≈ avg query radius.

### 3. Complex structure for few entities

10 enemies in quadtree → tree overhead > brute force.
**Solution**: Confirm > 100 entities before spatial structure.

### 4. Ignore 3D

Only 2D grid (x,z) but flying objects (y height) → returns all heights → slow.
**Solution**: 3D use octree or add y-dimension grid.

## Related skills

- `skills/three/object-pooling.md` — many entities need object pooling too
- `skills/game/architecture/entity-composition.md` — ECS + spatial structure is golden combo
- `skills/three/timestep.md` — spatial queries should be in fixed timestep

## References

- *Real-Time Collision Detection* — Christer Ericson
- *Game Programming Patterns* — Spatial Partitioning chapter
- *Real-Time Rendering* (4th ed) — Acceleration Structures
- Three.js Octree implementation
- bvh-three (mrdoob)
