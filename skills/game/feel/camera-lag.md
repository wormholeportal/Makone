# Camera lag — the camera predicts intent, it doesn't just observe

> **Chase cameras must: lead at speed / lag in drifts / snap to center on stop.
> Static camera = player leaves frame; hard follow = player "pinned to center" can't see ahead.
> Excellent cameras disappear.**

## One sentence

Camera's job = show players **where they're going**, not **where they stand**.
Centering player is worst camera design.

## Why

Player decisions depend on **information about incoming terrain**:

- Running needs to see **ahead** for obstacles / items / enemies
- Sharp turns need to see **new direction** environment
- Big jumps need to see **landing zone**

Centering player → player sees "where they've been + current position" → **insufficient decision data**.
Feels "floaty" or "unresponsive," but root cause: camera, not controls.

## Quantified criteria

**"Forward information ratio"**: how far ahead vs behind player can you see?
- 1:1 (centered) = worst
- 2:1 (1x ahead) = OK
- 3:1 (2x ahead) = excellent (racing / high-speed running)

**Lerp smoothness**: camera can't snap to player (hard follow) needs 100–500ms lag.
- <50ms = too stiff, feels glued
- 100–300ms = excellent, natural
- >500ms = too soft, "floaty"

## 5 camera behavior modes

### 1. Static

Camera fixed, player moves within frame.

Use: small levels / puzzles / room-based games (top-down RPG)
Avoid: open world / platformers / racing

### 2. Hard Follow

`camera.position = player.position + offset`

Use: top-down ARPG (Diablo, Path of Exile)
Avoid: first-person / high-speed motion

### 3. Smooth Follow

```js
camera.position.lerp(targetPos, 0.1)
```

Use: most 3D games
Tip: lerp coeff 0.05–0.15, smaller = softer

### 4. Lead Camera

```js
// offset along player velocity direction
const lead = playerVelocity.clone().multiplyScalar(0.3)
const targetPos = player.position.clone().add(lead).add(baseOffset)
camera.position.lerp(targetPos, 0.1)
```

Use: high-speed games (racing, parkour, platformers)
Tip: lead distance scales with speed

### 5. Look-Ahead

Position lead + **lookAt** lead:

```js
const lookTarget = player.position.clone().add(playerVelocity.normalize().multiplyScalar(5))
camera.lookAt(lookTarget)
```

Use: third-person action / flight
Tip: on sharp turn, camera lags, player "leads" camera (weight feel)

## Case studies

### Super Mario

Classic "camera window" mode:

- Mario center = camera still
- Mario at 2/3 screen = camera starts following
- Mario sudden stop = camera catches up

Gives player "lead space" to read ahead.

### Celeste

Perfect camera:

- Idle: player centered
- Sprint: camera **lags** (player "rushes" forward in frame)
- Jump: camera drifts upward (see landing)
- Death: camera **zoom in** + shake + red flash

Every detail serves information needs.

### NFS / Forza

High-speed car cameras:

- Slow: bumper cam
- Fast: rear cam backs up + leans + edge blur (speed feel)
- Sharp turn: camera lags car ("whips" ahead then catches)
- Drift: lateral shift + tilt

Not "effects," these let players **see the turn**.

### Hades

Top-down but subtle dynamics:

- Zagreus move: camera micro-follows (not centered)
- Combat: camera zoom-out (see all enemies)
- Boss: zoom-out more
- Big hit: micro zoom-in + shake

## Failure cases

- **Most novice 3D games**: camera hard-pinned behind player → sharp turn, can't see new direction.
- **Some MOBAs**: camera locks to hero, looking away requires button → split controls.
- **First-person too stiff**: FOV snap / instant follow → motion sickness for some (VR sensitive).
- **Free camera (no follow)**: player hand-controls + walks + attacks → input overload.

## Camera rig: 5 control parameters

```ts
type CameraRig = {
  followLerp: number       // 0.05–0.20, smaller = softer
  baseDistance: number     // default distance
  baseHeight: number       // default height
  lookAhead: number        // lookahead distance (0–10)
  velocityLead: number     // speed lead coeff (0–0.5)
  
  // dynamic:
  speedDistance: number    // rear on speed (0–3)
  fovBoost: number         // FOV boost at speed (0–15)
  shakeOnImpact: boolean
}
```

Recommended values by type:

| Genre | followLerp | distance | lookAhead | velocityLead |
|---|---|---|---|---|
| Top-down ARPG | 0.08 | 12 | 0 | 0 |
| Third-person action | 0.10 | 6 | 3 | 0.2 |
| Platformer | 0.08 | 8 (side) | 2 | 0.15 |
| Racing | 0.15 | 6 | 5 | 0.4 |
| Parkour | 0.18 | 4 | 6 | 0.35 |
| Flight | 0.20 | 8 | 8 | 0.5 |

## How to implement in Three.js / Makone

**Generic ChaseCamera**:

```ts
class ChaseCamera {
  followLerp = 0.1
  baseDistance = 8
  baseHeight = 4
  lookAhead = 3
  velocityLead = 0.3
  speedDistance = 1.5  // rear on speed
  
  constructor(public camera, public target) {}
  
  update(dt, targetVelocity) {
    // 1. player facing (from velocity)
    const speed = targetVelocity.length()
    const speedFactor = Math.min(speed / 10, 1)
    const forward = speed > 0.1 ? targetVelocity.clone().normalize() : new THREE.Vector3(0, 0, -1)
    
    // 2. dynamic distance (rear on speed)
    const distance = this.baseDistance + speedFactor * this.speedDistance
    
    // 3. velocity lead (camera offset toward player direction)
    const lead = forward.clone().multiplyScalar(speed * this.velocityLead)
    
    // 4. compute target position
    const targetPos = this.target.position.clone()
      .add(lead)
      .add(forward.clone().multiplyScalar(-distance))
      .add(new THREE.Vector3(0, this.baseHeight, 0))
    
    // 5. smooth follow
    this.camera.position.lerp(targetPos, this.followLerp)
    
    // 6. look-ahead
    const lookTarget = this.target.position.clone()
      .add(forward.clone().multiplyScalar(this.lookAhead))
    this.camera.lookAt(lookTarget)
  }
}
```

**Dynamic FOV (speed feel)**:

```ts
function updateFOV(camera, currentSpeed) {
  const baseFOV = 60
  const speedRatio = currentSpeed / MAX_SPEED
  const targetFOV = baseFOV + speedRatio * 15  // +15° at max
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.05)
  camera.updateProjectionMatrix()
}
```

**Screen shake (on impact)**:

```ts
let shakeTime = 0, shakeAmp = 0
function shake(amp, durationMs) {
  shakeAmp = amp
  shakeTime = durationMs / 1000
}
function applyShake(camera) {
  if (shakeTime > 0) {
    shakeTime -= dt
    const factor = shakeTime / 0.1  // decay
    camera.position.x += (Math.random() - 0.5) * shakeAmp * factor
    camera.position.y += (Math.random() - 0.5) * shakeAmp * factor
  }
}
```

## Camera anti-patterns

### 1. Clipping

Camera phases through walls / objects → see inside / black.
**Fix**: raycast detect, shorten distance or raise angle when hitting walls.

```ts
const ray = new THREE.Raycaster(target.position, cameraToTarget)
const hits = ray.intersectObjects(walls)
if (hits.length > 0) {
  camera.position = hits[0].point  // snap to wall
}
```

### 2. Excess shake (motion sickness)

Shake on every minor event / continuous → nausea for some.
**Fix**:
- Offer "reduce camera shake" option
- shake decays fast (settle in 200ms)
- major events shake big, minor events don't

### 3. FOV snap

Sprint: FOV jumps 60→90 instant → disorienting.
**Fix**: lerp over 0.5–1 sec.

### 4. Camera can't catch up

Soft follow too small (0.02), player disappears in high speed.
**Fix**: clamp, force snap when camera-player distance exceeds threshold.

```ts
const maxDist = 15
if (camera.position.distanceTo(player.position) > maxDist) {
  camera.position.copy(targetPos)  // force snap
}
```

### 5. Camera locked

Can't look up / down → platformers can't see landing zones.
**Fix**: allow ±80° pitch, but soft limit (drag increases near edges).

## Related skills

- `skills/game/axioms/feedback-latency.md` — camera feedback must be fast too
- `skills/game/feel/juicing.md` — shake/zoom are juice
- `skills/craft/contrast-hierarchy.md` — camera frames visual hierarchy

## Sources

- *Real-Time Cameras* — Mark Haigh-Hutchinson (2009)
- Jonathan Blow, *Camera Design in Braid* (GDC 2007)
- *Game Camera Toolkit* — Mark Brown (GMTK)
- Naughty Dog, *Uncharted Cameras* (GDC)
- *Hades* design postmortem (Supergiant)
