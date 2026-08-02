# Animation — the Disney 12 principles, applied to action games

> **Disney 1930s distilled 12 animation principles (squash/stretch/anticipation/follow-through/...)
> —the 90-year bible of character animation. Game characters ignoring them look like puppets.
> 7 of 12 directly impact game feel and must be explicitly implemented.**

## One sentence

Games aren't "play prerecorded animation." Every action **procedurally generates extra motion per 12 principles**.
30 lines of code for squash + anticipation > 200 hand-drawn animation frames for "feels alive."

## Why

1930s Disney animators codified 12 principles doing *Snow White* (*The Illusion of Life*).
They're unconscious rules the brain uses to gauge "movement real or fake?":

- Stiff movement → brain says "fake" (robot)
- Movement following 12 principles → brain says "alive" (creature)

Real-time 60fps game characters are more sensitive than film animation. Principle violations stand out.
*Mario*, *Zelda*, *Hades*, *Hollow Knight* all explicitly apply 7+ principles.

## 7 principles most relevant to games

### 1. Squash & Stretch

Acceleration → stretch (longer); deceleration/impact → squash (shorter).
Perceived mass.

```js
// Landing: squash instant, bounce back
function onLanding() {
  player.mesh.scale.set(1.2, 0.8, 1.2)  // squash
  setTimeout(() => player.mesh.scale.set(1, 1, 1), 100)  // recover
}

// Jump: stretch up
function onJump() {
  player.mesh.scale.set(0.9, 1.15, 0.9)
  setTimeout(() => player.mesh.scale.set(1, 1, 1), 80)
}

// Stop: brief stretch in velocity direction
function onMoveStop() {
  // stretch along current velocity vector briefly
  // ... implementation complexity varies
}
```

**Result**: player feels character "alive."

### 2. Anticipation

Slight opposite motion before any action.

- Jump → crouch first
- Attack → pull back
- Turn → eyes turn first

```js
function attack() {
  // Phase 1: anticipation (first 100ms)
  player.mesh.rotation.y -= 0.2  // weapon pulls back
  setTimeout(() => {
    // Phase 2: actual swing (100–200ms)
    player.mesh.rotation.y += 0.4
    dealDamage()
  }, 100)
}
```

**Practical for games**:
1. Looks more real
2. Telegraphing window (see `telegraphing.md`) — skilled players predict
3. "Spool up" feel between press and effect

### 3. Follow Through & Overlapping Action

Body parts don't stop simultaneously.
Character stops, but hair/cape/weapon keep moving from inertia.

```js
// Spring model hair/cape lag
class SpringFollow {
  position = new THREE.Vector3()
  velocity = new THREE.Vector3()
  
  update(target, dt) {
    const force = target.clone().sub(this.position).multiplyScalar(80)  // spring
    this.velocity.add(force.multiplyScalar(dt))
    this.velocity.multiplyScalar(0.85)  // damping
    this.position.add(this.velocity.clone().multiplyScalar(dt))
  }
}

// Apply to cape mesh:
const capeFollow = new SpringFollow()
function tick(dt) {
  capeFollow.update(player.position, dt)
  cape.position.copy(capeFollow.position)
}
```

**Result**: cape/hair/weapon sways naturally.

### 4. Slow In & Slow Out

Objects don't teleport from 0 to max speed.
Acceleration starts slow, peaks, deceleration trails off.

**Easing functions** implement it:

```js
// Don't lerp linearly, use easeOut
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t**3 : 1 - Math.pow(-2*t + 2, 3) / 2
}

// Apply to player acceleration
const targetSpeed = inputDir * MAX_SPEED
const currentSpeed = lerp(currentSpeed, targetSpeed, easeOutCubic(dt * 5))
```

**In games**:
- Movement has "acceleration feel" → not robot-like
- Camera pans smoothly
- UI pop animations

### 5. Exaggeration

Real punch → head tilts slightly.
Game punch → head flies, screen shakes, blood sprays → player says "satisfying hit."

Games need **2–3x exaggeration** to convey correct weight.

```js
// Real gravity -9.81, game might use -22 for snappy jumps
const gravity = -22

// Real knockback cm, game knockback 5–10 m
function knockback(amount = 8) {
  enemy.velocity.add(directionAway.multiplyScalar(amount))
}
```

### 6. Arc

Real motion follows curves, not lines.
Jumps, throws, sword swings all curve.

```js
// ❌ straight line to apex, straight down (mechanical)
// ✓ parabolic (natural, gravity exists)
function jump() {
  vy = 8  // upward initial velocity
  // gravity auto-curves into parabola
}

// Attack swing is also arc
function attackArc(t) {
  const angle = -Math.PI/3 + (Math.PI*2/3) * t  // t: 0→1 means -60° → +60°
  weapon.rotation.z = angle
}
```

### 7. Timing

Action duration determines perceived weight:

- Fast short action = light / nimble
- Slow long action = heavy / powerful

```js
// Light attack - quick
const lightAttack = { windup: 60, hit: 30, recovery: 100 }  // ms

// Heavy attack - slow, high damage
const heavyAttack = { windup: 300, hit: 100, recovery: 400 }
```

**Key**: windup / hit / recovery are independently tunable.

## Case studies

### Mario 64

Every action uses 12 principles:

- **Running**: body lean + limb alternation + hat flutter (overlapping)
- **Jump**: crouch (anticipation) + stretch → apex → land squash
- **Triple jump**: each higher/longer, third wildly exaggerated
- **Punch**: body twists back (anticipation) → punch → follow-through

Mario 64 remains 3D platformer animation gold standard.

### Hollow Knight

2D but full principles:

- **Dash**: body leans back (anticipation) → rapid forward (stretch) → ghost trail
- **Downslash**: sword overhead (anticipation) → fast swing (arc) → land squash
- **Cape**: always lags knight motion (follow through)

Team Cherry explicitly referenced Disney principles.

### Hades

Supergiant documented their use:

- Zagreus dash: anticipation + stretch + ghost trail
- Artifact casts: wind-up animation
- Hits: both parties follow through (enemy flies, Zag recovers)

## How to implement in Three.js / Makone

**1. Generic Animator helper**

```ts
class Animator {
  squash(mesh, axis: 'x'|'y'|'z', amount: number, durationMs: number) {
    const original = mesh.scale[axis]
    mesh.scale[axis] = original * amount
    setTimeout(() => mesh.scale[axis] = original, durationMs)
  }
  
  anticipation(mesh, action: () => void, prepMs: number, ...prepTransform) {
    // apply prep transform
    setTimeout(() => action(), prepMs)
  }
  
  springFollow(mesh, target, stiffness = 80, damping = 0.85) {
    // spring model
  }
}
```

**2. Attack animation three-stage**

```ts
async function performAttack(player) {
  // Stage 1: Anticipation (100ms)
  await tween(player.mesh.rotation, { y: -0.3 }, 100)
  
  // Stage 2: Attack arc (60ms)
  await tween(player.mesh.rotation, { y: 0.5 }, 60)
  detectHits()
  
  // Stage 3: Recovery (200ms)
  await tween(player.mesh.rotation, { y: 0 }, 200)
}
```

**3. Spring physics for all attachments**

```ts
const cape = new SpringFollowMesh(capeMesh, player)
const hair = new SpringFollowMesh(hairMesh, head, { stiffness: 120 })
// auto-sways when player moves
```

## Anti-patterns

### 1. Static idle

Character stands motionless → puppet.
**Fix**: always idle breathing (subtle vertical bob) + occasional blink/twitch.

### 2. Instant rotation

Press D, face right instantly → NPC bug.
**Fix**: ease rotation over 100–200ms.

### 3. No recovery

Attack hits, immediately next attack ready → unreal.
**Fix**: 100–300ms recovery (also prevents button mashing).

### 4. Full-body sync

Running, all parts same tempo → mechanical.
**Fix**: limb alternation, body sway, attachments lag.

### 5. Linear lerp

Direct `lerp(a, b, t)` → mechanical.
**Fix**: use easeOut / easeInOut.

## Quantified criteria

**Idle test**: does character micro-move when idle?
- Yes → alive
- No → puppet

**Action test**: does each action have anticipation + arc + recovery?
- All three → weight
- Missing → floaty

**Follow test**: do attachments keep moving after stop?
- Yes → physics feel
- No → fake

## Related skills

- `skills/game/feel/juicing.md` — 12 principles + juice synergy
- `skills/game/axioms/feedback-latency.md` — anticipation as feedback
- `skills/game/feel/telegraphing.md` — anticipation = player warning
- `skills/game/feel/hitstop.md` — hit phase of action syncs with hitstop

## Sources

- Frank Thomas & Ollie Johnston, *The Illusion of Life: Disney Animation* (1981) — original 12 principles
- Richard Williams, *The Animator's Survival Kit* (2001)
- *AlanBeckerTutorials* YouTube — principle breakdowns
- *Hades* animation GDC postmortem (Supergiant)
- *Hollow Knight* art design talk (Team Cherry)
