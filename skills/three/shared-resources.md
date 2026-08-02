# Share geometries & materials — don't allocate them per-instance

## The recurring failure mode

You write a `buildPalmTree()` helper that calls `new THREE.LatheGeometry(...)`
inside it. You call `buildPalmTree()` 36 times to scatter trees. You just
allocated **36 separate LatheGeometry objects** that compute identical
vertex buffers and live in 36 separate GPU buffers.

```javascript
// ❌ Anti-pattern: every call allocates a new geometry + material
function buildPalmTree() {
  const trunk = new THREE.Mesh(
    new THREE.LatheGeometry(trunkPoints, 10),                       // alloc
    new THREE.MeshLambertMaterial({ color: 0x6b3a1a }),              // alloc
  )
  const leafGeo = new THREE.PlaneGeometry(2.4, 0.55, 6, 1)           // alloc
  // ...bend leafGeo vertices...
  for (let i = 0; i < 7; i++) {
    g.add(new THREE.Mesh(leafGeo, leafMat))   // 7 meshes per tree share leafGeo (good!)
  }                                            // but each tree gets its own leafGeo (bad)
  return g
}
for (let i = 0; i < 36; i++) scene.add(buildPalmTree())
// → 36 trunk-geos + 36 leaf-geos + 36 trunk-mats + 36 leaf-mats
```

Each unique geometry costs ~1KB minimum (vertices + normals + UVs + index),
allocates a WebGL buffer, and adds bookkeeping. **You don't notice on a fast
machine** — it ships, the user opens it on a mid-range laptop, and the scene
takes 800ms to warm up while the GPU uploads all those identical buffers.

## The fix: lift the constants out

```javascript
// ✅ Build geometries/materials ONCE, share them across all instances
const TREE_TRUNK_GEO = new THREE.LatheGeometry(trunkPoints, 10)
const TREE_LEAF_GEO  = (() => {
  const g = new THREE.PlaneGeometry(2.4, 0.55, 6, 1)
  // bend vertices once, save the result
  bendLeafVertices(g)
  return g
})()
const TREE_TRUNK_MAT = new THREE.MeshLambertMaterial({ color: 0x6b3a1a })
const TREE_LEAF_MAT  = new THREE.MeshLambertMaterial({ color: 0x3fa84a, side: THREE.DoubleSide })

function buildPalmTree(x, z) {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(TREE_TRUNK_GEO, TREE_TRUNK_MAT)
  trunk.rotation.z = (Math.random() - 0.5) * 0.18  // per-instance lean is fine
  g.add(trunk)
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(TREE_LEAF_GEO, TREE_LEAF_MAT)
    leaf.rotation.y = (i / 7) * Math.PI * 2
    g.add(leaf)
  }
  g.position.set(x, 0, z)
  return g
}
for (let i = 0; i < 36; i++) scene.add(buildPalmTree(x, z))
// → 1 trunk-geo + 1 leaf-geo + 2 materials, total. 36 trees still render.
```

**Per-instance variation goes on the Mesh transform** (position, rotation,
scale), not on the geometry. The geometry is the shape; the transform is
where you put it.

### What can vary per-instance with shared geometry?

- ✅ position, rotation, scale (on the Mesh or its parent Group)
- ✅ material (different mesh can use a different material with same geo)
- ✅ visibility / castShadow / receiveShadow / renderOrder
- ❌ vertex positions, normals, UVs — those are geometry. If you change them,
  every mesh using that geometry changes. To vary shape per-instance,
  build N geometry variants and share each.

## When to step up to InstancedMesh

If you have **many objects with identical geometry+material that only differ
by transform**, `THREE.InstancedMesh` collapses N draw calls into 1.

Threshold:
- < 20 instances → use shared geometry + N Meshes (simpler, debugging-friendly)
- 20–200 instances → consider InstancedMesh if profiler shows draw calls dominating
- 200+ instances → InstancedMesh almost always wins

```javascript
const TUFT_GEO = new THREE.ConeGeometry(0.12, 0.28, 5)
const tuftCount = 130
const tufts = new THREE.InstancedMesh(TUFT_GEO, grassMat, tuftCount)
const dummy = new THREE.Object3D()
for (let i = 0; i < tuftCount; i++) {
  dummy.position.set(scatterX(i), 0.14, scatterZ(i))
  dummy.rotation.y = Math.random() * Math.PI
  dummy.scale.y = 0.85 + Math.random() * 0.4
  dummy.updateMatrix()
  tufts.setMatrixAt(i, dummy.matrix)
}
tufts.instanceMatrix.needsUpdate = true
scene.add(tufts)
// 130 tufts, 1 draw call.
```

If you need **per-instance color**, set `instancedMesh.setColorAt(i, color)`
and `instanceColor.needsUpdate = true`. The material has to support
`vertexColors` or you need to use the built-in `instanceColor` attribute.

### InstancedMesh gotchas

- **Frustum culling**: by default, an InstancedMesh is culled as a whole.
  If half your tufts are off-screen, they still cost draw time unless you
  disable the InstancedMesh's culling and accept the trade.
- **No per-instance materials**: all instances share one material. For
  swappable colors, use `setColorAt`.
- **Updating matrices is O(N)**: if you move every instance every frame,
  InstancedMesh helps draw cost but not update cost. For static scatter
  (trees, grass, rocks) this is fine.
- **Raycasting works** but is slower than regular meshes. Skip raycast if
  you don't need clicks on these objects.

## The pre-build self-check

Before you write `new THREE.<Geometry>(...)` inside a `buildX()` function,
ask:

> *"If I call this builder 50 times, am I building 50 identical buffers or
> 50 actually-different ones?"*

If **identical**: lift the `new X()` calls to module scope (or to module-level
constants inside `createScene`, above the builder). Pass the shared instance
into the builder.

If **actually different** (different sizes, different vertex deformations):
either build N variants once and pick from them randomly, or accept the
cost — but make sure the difference is meaningful at viewing distance.
Background trees that the player will never look closely at don't need
unique vertex deformation.

## Audit your scene at runtime

A quick console-paste audit after the scene loads:

```javascript
const ctl = window._sceneCtl  // whatever your handle is
const scene = ctl.getScene()
let mesh = 0, inst = 0, instInstances = 0, group = 0
const geoSet = new Set(), matSet = new Set()
scene.traverse(o => {
  if (o.isInstancedMesh) { inst++; instInstances += o.count }
  else if (o.isMesh) mesh++
  if (o.type === 'Group') group++
  if (o.geometry) geoSet.add(o.geometry.uuid)
  if (o.material) matSet.add(Array.isArray(o.material) ? o.material[0]?.uuid : o.material.uuid)
})
console.log({mesh, inst, instInstances, group, uniqueGeos: geoSet.size, uniqueMats: matSet.size})
```

**Healthy ratios** for a hand-built ~10-minute scene:

| Metric | Healthy | Warning sign |
|---|---|---|
| `uniqueGeos` | ≤ 30–40 | > 80 (probably allocating per-instance) |
| `uniqueMats` | ≤ 20 | > 50 |
| `instInstances / inst` | 30–200 | < 10 (instancing didn't help — overhead) |
| `mesh` | varies | > 1000 (consider merging or instancing) |

If `uniqueGeos > 80` you almost certainly have a per-instance allocation
bug. Search for `new THREE.` inside any function called in a loop.

## How this composes with other perf skills

- **`lighting-budget.md`** — dynamic lights also scale with mesh count. Sharing
  geometries doesn't reduce N×M light shading; reduce light count first.
- **`render-recipes.md`** — material choice (Basic vs Lambert
  vs Standard) is orthogonal to sharing. Share whatever class you picked.
- **`update-order.md`** — InstancedMesh `setMatrixAt` updates are
  cheap; don't fear animating ~1000 instances per frame, but profile.

## The 1-minute rule

> *"If you wrote `new THREE.X(...)` and you're inside a `for` loop or a
> function called in a loop, that allocation is suspect. Default to lifting
> it out. Only inline it if the X must genuinely differ per iteration."*
