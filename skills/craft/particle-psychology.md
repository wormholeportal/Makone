# Particle psychology — particles announce that something important happened

> **Particles aren't decoration, they're visual extension of events.
> Hit = spark; death = burst; pickup = sparkle; level up = rising light.
> Game without particles feels "cheap" in all events; excessive particles drown truly important events.**

## One-liner

Particles are free dopamine.
Add 30 lines code, every action feels 2x better.
But stratify — big events big particles, small events small particles.

## Why

Human vision most sensitive to **transient, multiple, high-contrast** visual changes (survival instinct: things falling from sky could be danger).

Game particles exploit this:
- Multiple particles = "big event happened"
- Transient = no cost (doesn't block view)
- High contrast = easy to see

Particle psychology:
- **Hit particles** = feedback "I did right"
- **Death particles** = completion / celebration
- **Pickup particles** = reward marker
- **Level-up particles** = self-enhancement feeling
- **Environmental particles** (snow / rain / dust) = immersion

Each satisfies player "I did something meaningful in this game."

## Quantified standards

**Particle tier**:

| Event level | Particle count | Duration | Purpose |
|---|---|---|---|
| Micro (footstep, light tap) | 3-8 | 0.3 sec | feedback "action occurred" |
| Small (kill minion, pickup) | 10-25 | 0.6 sec | feedback "success" |
| Medium (explosion, elite kill) | 30-60 | 1-2 sec | feedback "big event" |
| Major (boss death, level complete) | 100-500 | 3-5 sec | celebration |

**Visual density**: simultaneously active particles on screen < 1000 (performance + readability).
More = InstancedMesh or GPU particle system.

## 6 particle "modes"

### 1. Burst

Event moment: N particles fly in all directions.

```ts
function burst(pos, color, count = 15, speed = 5) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const elev = Math.random() * Math.PI / 2
    const p = createParticle(pos, color)
    p.userData.velocity = new THREE.Vector3(
      Math.cos(angle) * Math.cos(elev) * speed,
      Math.sin(elev) * speed,
      Math.sin(angle) * Math.cos(elev) * speed,
    )
    p.userData.life = 0.6 + Math.random() * 0.4
  }
}
```

Purpose: kill, explosion, impact.

### 2. Smoke

Particles rise + diffuse + fade.

```ts
function smoke(pos, color = 0x666666, count = 10) {
  for (let i = 0; i < count; i++) {
    const p = createParticle(pos, color)
    p.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      1 + Math.random() * 1,  // mainly up
      (Math.random() - 0.5) * 0.5,
    )
    p.userData.life = 1.5 + Math.random()
    p.userData.scale = 2  // grow as rising
  }
}
```

Purpose: after explosion, engine exhaust, smoke.

### 3. Rising

Particles drift up from ground, slow:

```ts
function aura(pos, color = 0xffaa44, count = 30) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * 1
    const p = createParticle(
      new THREE.Vector3(pos.x + Math.cos(angle) * r, pos.y, pos.z + Math.sin(angle) * r),
      color
    )
    p.userData.velocity = new THREE.Vector3(0, 1 + Math.random(), 0)
    p.userData.life = 2 + Math.random()
  }
}
```

Purpose: level-up, buff activation, sacred objects.

### 4. Trail

Object leaves particles as it moves:

```ts
function emitTrail(entity) {
  if (entity.lastTrail && now - entity.lastTrail < 50) return
  entity.lastTrail = now
  
  const p = createParticle(entity.position.clone(), entity.trailColor)
  p.userData.velocity = new THREE.Vector3(0, 0, 0)
  p.userData.life = 0.4
  p.userData.fadeOnly = true
}
```

Purpose: bullets, dash, whirlwind.

### 5. Fall

Snow / rain / ash:

```ts
function startSnow(area) {
  for (let i = 0; i < 200; i++) {
    const p = createParticle(
      new THREE.Vector3(
        Math.random() * area.width - area.width / 2,
        20,  // fall from sky
        Math.random() * area.depth - area.depth / 2,
      ),
      0xffffff,
    )
    p.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,  // slight drift
      -1 - Math.random(),  // mainly down
      (Math.random() - 0.5) * 0.5,
    )
    p.userData.life = 20  // long life
    p.userData.loop = true  // reset height on ground
  }
}
```

Purpose: weather, atmosphere.

### 6. Ring expansion

Planar circle expansion (best visual for AOE trigger):

```ts
function ringExpand(pos, color, maxRadius = 5, duration = 0.5) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.2, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, side: THREE.DoubleSide }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.copy(pos)
  scene.add(ring)
  
  const startTime = performance.now()
  function update() {
    const t = (performance.now() - startTime) / (duration * 1000)
    if (t >= 1) {
      scene.remove(ring)
      return
    }
    const r = maxRadius * t
    ring.geometry.dispose()
    ring.geometry = new THREE.RingGeometry(r * 0.9, r, 32)
    ring.material.opacity = 1 - t
    requestAnimationFrame(update)
  }
  update()
}
```

Purpose: AOE expression, shockwave, force field.

## Classic examples

### Hades

Each attack layers 4-5 particle types:
- Weapon trail
- Hit burst
- Enemy impact particles (small burst)
- Kill reward particles (fountain)
- Screen corner reward number
Makes "hitting enemies" visual feast.

### Vampire Survivors

Hundreds particles per second on screen.
- Character trail
- Weapon trajectory
- Enemy death burst
- Experience orb trail to player
Makes "no action" extremely satisfying.

### Geometry Wars

Entire screen is particles.
Each enemy death = geometric explosion.
Player enters flow state.

### Cuphead

Hand-drawn style, but each attack has custom particles:
- Bullet trails
- Fireball residue
- Hit stars
Art + particles perfect blend.

## Antipatterns

- **AAA game no particles** (rare but exists) → feels cheap.
- **Indifferent particles** (all events same burst) → player numb.
- **Particles block view** (full screen snow in boss fight) → can't see boss → angry.
- **Particles unoptimized** (each new THREE.Mesh) → 1000 particles frame rate crashes.

## Makone implementation

**1. InstancedMesh particle system**

```ts
class ParticleSystem {
  private mesh: THREE.InstancedMesh
  private particles: Array<{
    active: boolean
    pos: THREE.Vector3
    vel: THREE.Vector3
    life: number
    maxLife: number
    color: THREE.Color
    scale: number
  }> = []
  private dummy = new THREE.Object3D()
  
  constructor(scene, capacity = 1000) {
    const geo = new THREE.PlaneGeometry(0.2, 0.2)
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,  // glow feel
    })
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false
    scene.add(this.mesh)
    
    for (let i = 0; i < capacity; i++) {
      this.particles.push({
        active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        life: 0, maxLife: 0, color: new THREE.Color(), scale: 1,
      })
    }
  }
  
  emit(pos, vel, color, life, scale = 1) {
    const p = this.particles.find(p => !p.active)
    if (!p) return  // pool full
    p.active = true
    p.pos.copy(pos)
    p.vel.copy(vel)
    p.color.copy(color)
    p.life = life
    p.maxLife = life
    p.scale = scale
  }
  
  burst(pos, color, count = 15, speed = 5, life = 0.6) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const e = Math.random() * Math.PI / 2
      this.emit(
        pos,
        new THREE.Vector3(
          Math.cos(a) * Math.cos(e) * speed,
          Math.sin(e) * speed,
          Math.sin(a) * Math.cos(e) * speed,
        ),
        new THREE.Color(color),
        life + Math.random() * life * 0.5,
      )
    }
  }
  
  tick(dt, camera) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      if (!p.active) {
        this.dummy.position.set(0, -1000, 0)
        this.dummy.scale.set(0, 0, 0)
        this.dummy.updateMatrix()
        this.mesh.setMatrixAt(i, this.dummy.matrix)
        this.mesh.setColorAt?.(i, new THREE.Color(0, 0, 0))
        continue
      }
      
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        continue
      }
      
      // physics
      p.vel.y -= 9 * dt  // gravity
      p.vel.multiplyScalar(0.95)  // drag
      p.pos.addScaledVector(p.vel, dt)
      
      // fade
      const t = p.life / p.maxLife
      const alpha = t
      const scale = p.scale * (1 + (1 - t) * 0.5)
      
      this.dummy.position.copy(p.pos)
      this.dummy.scale.setScalar(scale)
      this.dummy.quaternion.copy(camera.quaternion)  // billboard
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
      
      const c = p.color.clone().multiplyScalar(alpha)
      this.mesh.setColorAt?.(i, c)
    }
    this.mesh.instanceMatrix.needsUpdate = true
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }
}

// Usage:
const ps = new ParticleSystem(scene, 2000)

// In onHit, onDeath, onPickup etc:
ps.burst(enemy.position, 0xff4400, 20, 6, 0.8)

// Each frame tick
function tick(dt) {
  ps.tick(dt, camera)
}
```

**2. Texture-based particles**

```ts
// Use radial gradient canvas for soft particles
const canvas = document.createElement('canvas')
canvas.width = 64; canvas.height = 64
const ctx = canvas.getContext('2d')
const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
grad.addColorStop(0, 'white')
grad.addColorStop(1, 'transparent')
ctx.fillStyle = grad
ctx.fillRect(0, 0, 64, 64)
const texture = new THREE.CanvasTexture(canvas)

const mat = new THREE.MeshBasicMaterial({
  map: texture,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})
```

Soft particles look 10x better than hard-edge particles.

## Antipatterns

### 1. new Mesh per frame

```js
// ❌ Each particle gets new
function burst() {
  for (let i = 0; i < 50; i++) {
    const p = new THREE.Mesh(geo, mat)
    scene.add(p)
  }
}
```

Big GC pressure, stalls in seconds.
**Correct**: use InstancedMesh + pooling.

### 2. No max limit

Heavy events → thousands particles accumulate → frame rate crashes.
**Correct**: particle pool has capacity cap, exceeds → overwrite oldest.

### 3. Mesh + high-poly geometry

Particles use SphereGeometry(8 subdivisions) → waste GPU.
**Correct**: PlaneGeometry 1x1 + Billboard.

### 4. Block view

Large opaque smoke particles → player can't see enemy.
**Correct**: alpha 0.3 + short lifetime.

### 5. Color conflict with scene

Particle color too close to background → invisible.
**Correct**: use contrast color + AdditiveBlending (self-emissive).

## Related skills

- `skills/game/feel/juicing.md` — particles one form of juice
- `skills/game/axioms/feedback-latency.md` — particles instant feedback
- `skills/three/object-pooling.md` — particles must be pooled
- `skills/craft/color-grammar.md` — particle color encodes event type

## References

- *Real-Time Rendering* (4th ed) (particle system chapter)
- Three.js official docs InstancedMesh
- *The Art of Screenshake* — Vlambeer
- Mike Acton, *Data-Oriented Design and C++* (particles as SOA example)
- *Hades* visual effects GDC
