# Screen shake — a physics quantity, not random noise

> **Screen shake must have: amplitude / frequency / decay curve / anisotropy / trigger throttling = 5 parameters.
> Simple `randomOffset` makes half of players dizzy, the other half feels nothing.
> Well-tuned shake is game feel's cheapest and most powerful tool.**

## One-liner

Shake right = player says "that hits hard."
Shake wrong = player says "dizzy" or "nothing."
Difference is 50 lines of code, but 10x the experience.

## Why

Human eyes are hypersensitive to **whole-screen movement**. Good and bad:
- **Good**: tiny offset (< 1% screen) conveys "something big just happened"
- **Bad**: excess offset causes vertigo (vestibular system conflict)

Vlambeer's *Nuclear Throne* and *Hotline Miami* used minimal code + shake to make players obsessed.
Same code untweaked makes players want to vomit after 10 minutes.

## Quantified standards

**5 shake parameters**:

```ts
type ShakeConfig = {
  amplitude: number       // amplitude (pixels / units)
  frequency: number       // frequency (Hz, oscillations per second)
  duration: number        // duration (ms)
  decayCurve: 'linear' | 'exp' | 'cubic'  // decay curve
  axes: { x: boolean, y: boolean, z: boolean }  // anisotropy
}
```

**Recommended presets**:

| Event | amplitude | frequency | duration | decay |
|---|---|---|---|---|
| Light tap | 0.05 | 30 | 80 | exp |
| Normal hit | 0.15 | 25 | 150 | exp |
| Heavy hit | 0.30 | 20 | 250 | exp |
| Explosion | 0.50 | 15 | 400 | cubic |
| Boss ultimate | 0.80 | 10 | 600 | cubic |
| Earthquake / climax | 1.50 | 8 | 1500 | linear |

**Critical thresholds**:
- amp < 0.05 = invisible
- amp > 1.0 = regular player feels dizzy
- duration > 2000ms = player will intentionally close the game

## 5 core principles

### 1. Decay is mandatory

Shake without decay = someone shaking you continuously → dizzy.
Correct shake is **big at start, decay quickly**.

```ts
function getShakeOffset(elapsed, duration, amplitude) {
  const t = elapsed / duration  // 0 → 1
  if (t >= 1) return { x: 0, y: 0 }
  
  // Exponential decay (recommended)
  const decay = Math.pow(1 - t, 2)
  const x = (Math.random() - 0.5) * amplitude * decay
  const y = (Math.random() - 0.5) * amplitude * decay
  return { x, y }
}
```

### 2. Frequency must be high (≥15Hz)

Low frequency (5Hz) = looks like wobble / sway → makes dizzy.
High frequency (20-30Hz) = looks like vibration / tremor → not dizzy, feels forceful.

But pure random each frame = too noisy.
Correct: **use sin/cos + noise**:

```ts
function shakeOffset(elapsed, freq, amp, decay) {
  // sin wave + noise perturbation
  const phaseX = elapsed * freq * Math.PI * 2 + Math.random() * 0.5
  const phaseY = elapsed * freq * Math.PI * 2 * 1.7 + Math.random() * 0.5  // different frequency
  const x = Math.sin(phaseX) * amp * decay
  const y = Math.cos(phaseY) * amp * decay
  return { x, y }
}
```

### 3. Anisotropy (shake in the right direction)

Generic "random up/down/left/right" → abstract, meaningless.
**Directional** shake → player perceives "that's bullet direction / attack direction."

```ts
// Bullet from right → shake mainly in x direction (mimics impact)
shake({
  amplitude: 0.3,
  axes: { x: true, y: false, z: false },
  direction: bulletDir,  // shake along bullet direction
})

// Explosion at feet → vertical shake (earthquake feel)
shake({
  amplitude: 0.4,
  axes: { x: false, y: true, z: false },
})
```

### 4. Throttling (multiple shakes simultaneously)

3 particles hit 3 enemies → 3 shakes stacked = shake explodes.

```ts
// ❌ Bad
function onHit() { shake(0.3, 100) }  // add every time

// ✓ Good: take max, don't accumulate
function shake(amp, dur) {
  if (currentShake.amp < amp) {
    currentShake = { amp, dur, startTime: now }
  }
}
```

### 5. Don't affect game logic

Shake is **visual effect**, can't affect physics / input / hit detection.
Player can't miss something because screen was shaking.

```ts
// ✓ Only modify camera.position (visual)
camera.position.add(shakeOffset)

// ❌ Don't shake player.position (affects physics)
// Also don't shake mouse cursor position
```

## 6 shake modes

### 1. Translational (displacement)

Most basic, camera shifts slightly along x/y axes.

```ts
camera.position.add(shakeOffset)
```

### 2. Rotational (rotation)

More subtle, but more "dizzy"-sensitive. Use cautiously.

```ts
camera.rotation.z += shakeAngle  // roll
```

### 3. Zoom Punch

Instant zoom in then recover, mimics "got hit" vision contraction.

```ts
async function zoomPunch() {
  const orig = camera.fov
  camera.fov = orig - 5
  camera.updateProjectionMatrix()
  await wait(60)
  await tweenTo(camera, 'fov', orig, 200)
}
```

### 4. Chromatic Aberration (color separation)

Screen splits RGB channels, mimics glass vibration. Needs post-processing shader.

```ts
// Use RGBShiftShader post-processing
chromaPass.uniforms.amount.value = 0.005  // on hit set to 0.005
setTimeout(() => chromaPass.uniforms.amount.value = 0, 200)
```

### 5. Time Stretch (time distortion)

Slow-motion + shake, more impactful than pure shake.

```ts
function bigImpact() {
  shake(0.5, 300)
  timeScale = 0.3  // slow-mo
  setTimeout(() => timeScale = 1, 500)
}
```

### 6. Distortion Shake

Warp screen (wave / blur) + shake.
Suits superpowers / magic.

```ts
// Screen distortion post-processing
distortionPass.uniforms.amount.value = 0.05
setTimeout(() => distortionPass.uniforms.amount.value = 0, 400)
```

## Implementation in Three.js / Makone

**Complete shake system**:

```ts
class CameraShake {
  private camera: THREE.Camera
  private originalPos = new THREE.Vector3()
  private active: Array<{
    amp: number
    freq: number
    duration: number
    startTime: number
    direction: THREE.Vector3
  }> = []
  
  constructor(camera) {
    this.camera = camera
  }
  
  shake(config) {
    // Concurrent shakes: pick strongest
    const existing = this.active.find(s => s.startTime + s.duration > performance.now())
    if (existing && existing.amp >= config.amp) return
    
    this.active.push({
      ...config,
      startTime: performance.now(),
      direction: config.direction ?? new THREE.Vector3(1, 1, 0),
    })
  }
  
  update(camera) {
    const now = performance.now()
    let totalOffset = new THREE.Vector3()
    
    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i]
      const elapsed = now - s.startTime
      if (elapsed >= s.duration) {
        this.active.splice(i, 1)
        continue
      }
      
      const t = elapsed / s.duration
      const decay = Math.pow(1 - t, 2)
      
      const phaseX = (elapsed / 1000) * s.freq * Math.PI * 2 + Math.random() * 0.3
      const phaseY = (elapsed / 1000) * s.freq * Math.PI * 2 * 1.7 + Math.random() * 0.3
      
      totalOffset.x += Math.sin(phaseX) * s.amp * decay * s.direction.x
      totalOffset.y += Math.cos(phaseY) * s.amp * decay * s.direction.y
    }
    
    camera.position.add(totalOffset)
  }
}

// Usage:
const shaker = new CameraShake(camera)

// Different events:
function onLightHit() {
  shaker.shake({ amp: 0.05, freq: 30, duration: 80 })
}
function onExplosion(impactPos) {
  const dir = camera.position.clone().sub(impactPos).normalize()
  shaker.shake({ amp: 0.3, freq: 15, duration: 400, direction: dir })
}
function onBossSlam() {
  shaker.shake({ amp: 0.8, freq: 10, duration: 600, direction: new THREE.Vector3(0, 1, 0) })
}

// In render loop:
function tick(dt) {
  // ... update camera base position ...
  shaker.update(camera)
  renderer.render(scene, camera)
}
```

## User settings

**Always provide "shake intensity" slider**:

```html
<input type="range" min="0" max="100" id="shake-intensity">
```

```ts
const userShakeMultiplier = userSettings.shakeIntensity / 100
function shake(config) {
  shaker.shake({ ...config, amp: config.amp * userShakeMultiplier })
}
```

Let vestibular-sensitive players dial to 0, give players control.

## Anti-pattern

### 1. Continuous shake

Tiny vibration all game (e.g., "dynamic camera") → cumulative dizziness.
**Correct**: only on events. Idle completely still.

### 2. Major event = 0 shake

Boss death / level complete → no shake → no impact.
**Correct**: major events must have **max** shake + slow-mo + flash.

### 3. Shake duration exceeds event

Bullet hits 0.1s → shake lasts 2s → mismatch.
**Correct**: duration ≤ 1.5x event intensity.

### 4. Shake interferes with precision aim

Boss fight shake too intense → player can't aim precisely.
**Correct**: reduce shake in boss (player sees clearly), enhance in normal combat.

### 5. Isotropic always

Always x/y random → abstract.
**Correct**: directional shake based on event direction.

## Test method

**Motion sickness test**: have motion-prone player play 5 minutes.
- Complains of dizziness → shake too strong / frequent / low-frequency
- Fine → pass

**Impact feel test**: player closes eyes, hears audio + sees shake, asks "what just happened?"
- Answers correctly ("got hit" / "explosion" / "boss attack") → shake communicates
- Wrong or unknown → shake meaningless

## Related skills

- `skills/game/feel/juicing.md` — shake is one form of juice
- `skills/game/feel/hitstop.md` — shake + hitstop combo strongest
- `skills/game/feel/camera-lag.md` — camera foundation + shake stacks
- `skills/craft/contrast-hierarchy.md` — shake intensity conveys event importance

## References

- Jan Willem Nijman, *The Art of Screenshake* (INDIGO 2013)
- *Game Feel* — Steve Swink (shake chapter)
- *Real-Time Rendering* — post-processing chapter
- Vlambeer design postmortem (*Nuclear Throne*, *Luftrausers*)
- Nintendo *Animal Crossing* cautious shake design principles
