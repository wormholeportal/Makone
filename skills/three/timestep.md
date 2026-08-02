# Timestep — fixed for physics, variable for rendering

> **Physics must be simulated with fixed dt (usually 1/60), else behavior differs by framerate.
> Rendering uses real dt (variable), interpolating between physics steps.
> Mixing physics and rendering into one variable-dt loop is the rookie mistake.**

## One-liner

Unfixed physics dt → players jump lower on 30fps machines, higher on 144fps.
Game behavior depends on hardware = bugs never fixed.

## Why

Physics integration (e.g., Euler) precision depends on dt size:

```js
// Simple gravity
v.y -= 9.81 * dt
y += v.y * dt

// dt = 1/60: 60 steps to ground, smooth trajectory
// dt = 1/30: 30 steps to ground, jump higher (large step, overshoot)
// dt = 1/144: 144 steps to ground, jump lower (numerical dissipation)
```

Worse: collision detection pierces at large dt.
Player can phase through walls at 30fps, stuck outside at 144fps.

**This is why early PC games often "run faster on new machines"** — programmers wrote game loop as `while(true) { update(); render(); }`, faster CPU = more frames, faster physics.
*Quake* had to add "framerate capping" because of this.

## Quantified standards

**Physics timestep**:
- 60 Hz (dt = 16.67ms) = standard. Most games.
- 120 Hz (dt = 8.33ms) = high precision. Racing / physics sandbox.
- 240 Hz (dt = 4.17ms) = extreme. VR / special needs.

**Rendering timestep**:
- Use `requestAnimationFrame` real dt (variable)
- Usually 60fps, but can be 30-240fps
- Must decouple from physics step

## Classic solution: Fix Your Timestep

Template popularized by Glenn Fiedler in 2004:

```js
const FIXED_DT = 1 / 60  // physics timestep
let accumulator = 0
let lastTime = performance.now()

function frame(now) {
  requestAnimationFrame(frame)
  
  let frameTime = (now - lastTime) / 1000
  lastTime = now
  
  // Prevent "spiral of death" (chasing too many steps after stall)
  if (frameTime > 0.25) frameTime = 0.25
  
  accumulator += frameTime
  
  // Physics: fixed step, catch up by accumulated time
  while (accumulator >= FIXED_DT) {
    physicsStep(FIXED_DT)
    accumulator -= FIXED_DT
  }
  
  // Render: interpolate prevState and currentState
  const alpha = accumulator / FIXED_DT
  render(alpha)
}
```

**Key points**:

1. `physicsStep` always receives `FIXED_DT` — behavior is repeatable, testable
2. High framerate = `physicsStep` called 1x per frame; low framerate = maybe 2-3x (catch up)
3. Render uses interpolation (`alpha`) for smooth transition
4. `0.25` cap prevents crazy catch-up after stall

## Interpolation

Physics steps at 60Hz but screen may be 120fps.
Rendering directly looks "stuttery". Interpolation smooths it.

```js
let prevPos = new THREE.Vector3()
let currentPos = new THREE.Vector3()

function physicsStep(dt) {
  prevPos.copy(player.position)
  // physics...
  currentPos.copy(player.position)
}

function render(alpha) {
  // alpha is 0~1: accumulator / FIXED_DT
  player.mesh.position.lerpVectors(prevPos, currentPos, alpha)
}
```

This way 144Hz screen sees 144 smooth interpolated frames, physics still 60Hz.

## Rapier and Makone status

Rapier supports explicit timestep:

```js
physicsWorld.timestep = 1/60
physicsWorld.step()
```

Makone's `GameRuntime._loop`:

```ts
private _loop = (): void => {
  const dt = Math.min(this._clock.getDelta(), 0.05)
  if (this._state === 'playing') {
    // ...
    this.physics.step(dt)  // ❌ using variable dt
    // ...
  }
}
```

`PhysicsWorld.step()`:

```ts
step(deltaTime?: number): void {
  if (deltaTime !== undefined) {
    this.world.timestep = deltaTime
  }
  this.world.step(this.eventQueue)
}
```

**Problem**: variable dt fed to Rapier, physics behavior differs by framerate.

**Improvement** (recommended future refactor):

```ts
private _loop = () => {
  this._animId = requestAnimationFrame(this._loop)
  const now = performance.now()
  let frameTime = (now - this._lastTime) / 1000
  this._lastTime = now
  if (frameTime > 0.25) frameTime = 0.25
  
  this._accumulator += frameTime
  
  // Fixed 60Hz physics
  while (this._accumulator >= this.FIXED_DT) {
    this._updateController(this.FIXED_DT)
    this._updateAI(this.FIXED_DT)
    this.physics.step()  // Rapier uses its internal timestep
    this._accumulator -= this.FIXED_DT
  }
  
  // Render: interpolation + real dt for visual effects
  const alpha = this._accumulator / this.FIXED_DT
  this._interpolateVisuals(alpha)
  this._updateCamera()
  this.renderer.render(this.scene, this.camera)
}
```

## Dt choice by module

| Module | Which dt |
|---|---|
| **Physics (collision, rigidbody)** | FIXED_DT (required) |
| **Game logic (HP, AI FSM)** | FIXED_DT (recommended) |
| **Particles, animation, UI** | Real dt or FIXED_DT × accumulator alpha |
| **Audio** | Real-time (system handles) |
| **Visual FX (screenshake)** | Real dt |
| **Input** | Read latest in rAF, send to physics step |

**Rule**: anything that changes **game state** uses FIXED_DT; anything that changes **visual appearance** uses real dt.

## Antipatterns

### 1. Using `setInterval(update, 16)`

```js
// ❌
setInterval(update, 16)
```

- Browser doesn't guarantee exact 16ms
- Won't sync with vsync → tearing
- Throttles to 1000ms in background

**Solution**: requestAnimationFrame.

### 2. Framerate capping

```js
// ❌ Lock to 30fps
setTimeout(() => requestAnimationFrame(frame), 33)
```

Adds latency. If hardware can 144Hz, render at 144Hz but keep physics at 60Hz.

### 3. Physics depends on rAF dt

```js
// ❌ Feed rAF dt directly to physics
function frame(now) {
  const dt = (now - lastTime) / 1000
  physics.step(dt)
  render()
}
```

= our current Makone approach = different behavior by framerate.

### 4. Perfectionism: per-object interpolation

Interpolate every object → code complexity explodes.
**Practical**: only interpolate camera, player, key enemies. Skip particles.

### 5. No accumulator cap

```js
// ❌ Stall 5s then chase 300 physics steps → spiral death
while (accumulator >= FIXED_DT) { ... }
```

**Solution**: `if (frameTime > 0.25) frameTime = 0.25`.

## Testing

**1. Framerate stress test**: artificially throttle to different framerates

```js
// Pretend to run physics at 30fps
let frameCount = 0
function frame() {
  frameCount++
  if (frameCount % 2 === 0) actualFrame()  // simulate half-dropped
  requestAnimationFrame(frame)
}
```

Observe: does player jump height, enemy speed, collision detection change?
- Changes = bug
- Unchanged = correct

**2. Cross-device testing**: 120Hz displays, 60Hz displays, mobile low-framerate.
Player should jump to same height, enemies move at same speed on all devices.

## Historical lessons

- **Doom (1993)**: internal fixed 35Hz tick. Plays same on faster PCs, no chaos.
- **Quake 1**: early versions had physics-depends-on-fps, abused by high-fps speedrunners ("trick jumps") → Carmack later added independent tick rate.
- **GTA IV PC**: physics depends on vsync, locked 60Hz → 144Hz players cars felt unstable.
- **Skyrim**: physics depends on fps, > 60Hz lets you "wall-jump to sky".

Rookie designers repeat these lessons until reading Glenn Fiedler's article.

## Related skills

- `skills/game/axioms/feedback-latency.md` — input response should be in rAF, not physics step
- `skills/game/architecture/state-machines.md` — state transitions with fixed dt are more repeatable
- `skills/game/axioms/retry-latency.md` — death checks should be repeatable

## References

- Glenn Fiedler, *Fix Your Timestep!* (2004) — classic article
- Robert Nystrom, *Game Programming Patterns* — Game Loop pattern
- *Real-Time Collision Detection* — Christer Ericson
- John Carmack interviews on Quake tick rate
- Rapier3D documentation: timestep API
