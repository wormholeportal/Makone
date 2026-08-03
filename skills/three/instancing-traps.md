# InstancedMesh — the four traps

`InstancedMesh` is the workhorse of this repo: grass, rocks, flowers, branches,
leaves, bricks, crowds. It is also where the nastiest class of bug lives, because
**every one of these renders as "too dark" or "black"** — which reads like a
lighting problem and sends you off tuning lights, exposure and fog for hours.

They are all statically detectable. `node harness/verify.mjs <world>` reports
them under `warnings`. Read that list before you touch a light.

---

## 1. `vertexColors: true` with no `color` attribute → everything is black

```js
// WRONG — the field renders as black spikes
const mat = new THREE.MeshStandardMaterial({ vertexColors: true })
const grass = new THREE.InstancedMesh(bladeGeo, mat, 15000)
grass.setColorAt(i, colour)
```

`vertexColors: true` sets the `USE_COLOR` define, and three's `color_vertex`
chunk then does `vColor *= color` — where `color` is a **geometry attribute**.
Your geometry doesn't have one, so WebGL supplies the default `(0,0,0)` and
every fragment is multiplied by zero.

**Per-instance colour needs no flag at all.** `setColorAt` creates
`instanceColor`, the renderer sets `USE_INSTANCING_COLOR` by itself, and a
separate `vColor *= instanceColor` line does the work.

```js
// RIGHT
const mat = new THREE.MeshStandardMaterial({})     // no vertexColors
grass.setColorAt(i, colour)
if (grass.instanceColor) grass.instanceColor.needsUpdate = true
```

Set `vertexColors: true` **only** when the geometry really carries a `color`
attribute — a displaced terrain, a hand-coloured cliff mesh. The two mechanisms
are independent and can be combined; they just multiply (see trap 2).

## 2. `material.color` multiplies `instanceColor` → everything is muddy

```js
// WRONG — scrub comes out as lumps of coal
new THREE.MeshStandardMaterial({ color: 0x51682f })   // dark green
bushes.setColorAt(i, new THREE.Color(0x445a28))       // also dark green
// result: 0x51682f × 0x445a28 ≈ near-black
```

Two dark tints multiplied give you a third, much darker one. It is not obvious
in code review because *both values look reasonable on their own*.

**Decide where colour lives and keep the other end white.** If the instances
carry it, `color: 0xffffff`. The same rule applies to `map`: a tinted detail
texture multiplied by a tinted vertex colour halves your ground's value — this
is what turns a green plain into a black one.

> This trap was hit three separate times while building `erdtree`, including
> once *after* writing the warning about it. That is why verify checks for it.

## 3. `DoubleSide` flips back-face normals

Grass, leaves and petals are usually authored with normals tilted **skyward**
rather than along the true surface — a vertical blade lit from above is black
otherwise, and a field of them is a bed of spikes.

`side: THREE.DoubleSide` inverts the normal on back faces. Half your instances
then have normals pointing at the ground and go dark, which looks exactly like
the problem the skyward normals were fixing.

```js
// RIGHT — author both faces into the geometry, keep FrontSide
for (let i = 0; i < SEGS; i++) {
  const a = i * 2
  idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)   // front
  idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)   // back, same normals
}
const mat = new THREE.MeshStandardMaterial({ side: THREE.FrontSide })
```

`DoubleSide` is still right for flat things whose true normal is the one you
want — a petal disc, a banner, a leaf card.

## 4. Vertex displacement is in LOCAL space

Wind, sway and growth animations get written in the vertex shader against
`transformed`, which is in the **instance's local space** — where a unit blade
is exactly `1.0` tall, whatever the instance matrix scales it to.

```glsl
// WRONG — amp reaches 1.35 on a blade that is 1.0 tall: the whole field lies flat
float amp = (0.30 + gust * 1.05) * pow(uv.y, 1.7);
transformed.x += amp;
```

The field renders as pale horizontal streaks and reads as dead stubble, not as
wind. Keep displacement well under `1.0` — a lean is `0.05`–`0.3`:

```glsl
float amp = (0.05 + gust * 0.26) * pow(uv.y, 1.8);
```

To read the instance's world position inside the shader (for a wind field that
travels across the ground rather than moving everything in unison):

```glsl
vec3 iPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
```

---

## Two more worth knowing

- **`needsUpdate` after bulk writes.** After a `setMatrixAt` / `setColorAt`
  loop: `mesh.instanceMatrix.needsUpdate = true` and, if you coloured,
  `if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true`.
- **`count` is the live instance count.** Allocate for the worst case, place as
  many as pass your density test, then set `mesh.count = n`. Instances beyond
  `count` are not drawn — this is also the cheap way to pool and cull.
- **Frustum culling is per-mesh, not per-instance.** A single InstancedMesh
  spanning the whole world is either fully drawn or fully skipped. For anything
  built procedurally around the camera, `frustumCulled = false` avoids the
  pop-out when the mesh's computed bounds are wrong.

---

Sources: three.js `WebGLProgram` / `color_vertex.glsl.js` / `begin_vertex.glsl.js`;
scar tissue from `erdtree`, where traps 1–4 each cost at least one build cycle.
