# Telegraphing — every threatening attack shows a windup

> **Enemy attacks / trap triggers / AOE impacts must show a visible signal 0.5-2 seconds before landing.
> Player has time to react → "I dodged" is a skill victory. No telegraph → "I died" is unfair design.
> Telegraph transforms luck into skill.**

## One-liner

Instant-death = player thinks game sucks.
Instant-death but you saw the warning and didn't dodge = player thinks they suck.
Same outcome, completely different attribution.

## Why

The core of challenge is **player feels agency**.
No agency ("I died for unknown reasons") = frustration = quit.
Agency ("I should have backed up when that red circle appeared") = learning = retry.

Telegraph gives players **information**:
- "Damage incoming in 1 second"
- "This area will take damage"
- "If you stay here, you get hit"

With that info → even death is "I didn't dodge" → self-blame, not rage-quit → retry more carefully → flow channel.

## Quantified standards

**Telegraph duration** (scales with threat):

| Attack type | Telegraph time | Example |
|---|---|---|
| Light melee | 0.3-0.6s | Wind-up punch |
| Heavy hit | 0.8-1.5s | Charge-up |
| AOE | 1-2s | Red ground ring |
| Instant-kill | 1.5-3s | Boss ult |
| Hidden trap | 0.1-0.3s (subtle) | Floor crack before collapse |
| Ranged bullet | 0.5s (highlighted) | Bright projectile |

**Telegraph intensity**:
- High threat = high contrast + screen shake + SFX
- Low threat = subtle visual hint

## Five telegraph forms

### 1. Visual (most common)

**Anticipation animation**: enemy prep move before attack (see `skills/craft/animation.md`)

```js
async function bossSlam() {
  // 1. Anticipation — fist raises (800ms)
  await tween(boss.fist, { y: +5 }, 800)
  
  // 2. Attack — slam down (200ms)
  await tween(boss.fist, { y: 0 }, 200)
  dealAOEDamage()
}
```

**Ground indicator**: AOE range as red ring

```js
function aoeWarning(pos, radius, durationMs) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.9, radius, 32),
    new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 })
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.copy(pos)
  scene.add(ring)
  
  // Ramp up (intensity 0.3 → 1.0)
  let t = 0
  const interval = setInterval(() => {
    t += 50
    ring.material.opacity = 0.3 + 0.7 * (t / durationMs)
    if (t >= durationMs) {
      clearInterval(interval)
      scene.remove(ring)
      dealAOE(pos, radius)
    }
  }, 50)
}
```

### 2. Audio

```js
// Play wind-up sound before enemy attack
function bossAttack() {
  playSound('boss-windup', { volume: 1 })  // 1.5s sustained tone
  setTimeout(() => actualAttack(), 1500)
}
```

Classic: Dark Souls boss roars are pure telegraph.

### 3. Color shift

```js
// Enemy about to attack → whole body flashes red
function enemyPreAttack(enemy) {
  enemy.material.emissive.setHex(0xff0000)
  setTimeout(() => {
    enemy.material.emissive.setHex(0x000000)
    attack()
  }, 600)
}
```

### 4. Particle warning

```js
// Bullet about to fire → particle burst at origin
function projectileWarning(origin) {
  spawnParticles(origin, 0xff4400, 20)
  setTimeout(() => fireProjectile(origin), 400)
}
```

### 5. Screen effect

```js
// Boss ult → screen shake + red vignette
function bigBossAttack() {
  screenVignette(0xff0000, 0.3)
  cameraShake(0.3, 1500)
  setTimeout(() => {
    actualAttack()
    cameraVignetteReset()
  }, 1500)
}
```

## Telegraph hierarchy

Not all threats warrant equal telegraph. Tier them:

```
Threat level 5 (instadeath)    → intense visual + audio + screen effects
Threat level 4 (high damage)    → visual + audio telegraph
Threat level 3 (medium damage)  → visual telegraph
Threat level 2 (low damage)     → subtle visual hint
Threat level 1 (no damage, obstacle) → no telegraph
```

Full-screen telegraph = visual noise = player can't focus.
Hierarchy trains players to "read" important tells.

## Exemplars

### Dark Souls Bosses

Every boss move has a learnable telegraph:

- **Iudex Gundyr**: sword overhead = incoming downward slash
- **Ornstein**: spear glows gold = incoming thrust
- **Pontiff Sulyvahn**: twin-blade arc = sweep
- **Manus**: body twist = dark wave AOE

Skilled players "read" the boss → perfect dodge → flow.
No telegraph = pure luck, nothing to practice.

### World of Warcraft raids

Every boss ult has:
- Red circle on ground (drop location)
- Screen text ("Boss will cast...")
- SFX cue
- Overhead animation
- Countdown

10 players coordinate dodge. This is why WoW raid design refined for 15 years.

### Hollow Knight charge attack

Enemy winds up: body glows + sound → player knows "can't melee right now."

### Vampire Survivors warning beam

Before boss arrives: golden beam indicates direction + 3s countdown.

## Antipatterns

- **"Enemy kills with no telegraph"**: player dies → doesn't know why → quits.
- **Trap looks like regular floor**: player dies → replays and still falls.
- **Ranged bullet has no visual tell**: hit from off-screen → feels "cheated."
- **Invisible enemy gives no hint**: walking, HP drops without warning → confused.
- **Beginner game, boss has no telegraph**: player thinks boss "AI too strong," actually no reaction window designed.

## Telegraph intensity vs. difficulty curve

Harder games telegraph more subtly:

| Game style | Telegraph intensity |
|---|---|
| Casual (5m/session) | large red ring + warning sound + screen shake |
| Medium (1h/day) | moderate visual + audio |
| Hard (Dark Souls) | animation anticipation only, no UI |
| Extreme (rhythm / speedrun) | minimal anticipation, player memorizes |

**Critical**: even hardcore games **always telegraph** (animation minimum).
Zero telegraph = unfair = unlearnable.

## Three.js / Makone implementation

**1. Generic Warning system**

```ts
class WarningSystem {
  warnings: Array<{
    mesh: THREE.Mesh,
    fireTime: number,
    onFire: () => void,
  }> = []
  
  warnAOE(pos: THREE.Vector3, radius: number, delayMs: number, onFire: () => void) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.9, radius, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff0000, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
      })
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.copy(pos)
    scene.add(ring)
    
    this.warnings.push({
      mesh: ring,
      fireTime: performance.now() + delayMs,
      onFire,
    })
  }
  
  tick(now: number) {
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const w = this.warnings[i]
      const remaining = w.fireTime - now
      if (remaining <= 0) {
        scene.remove(w.mesh)
        w.onFire()
        this.warnings.splice(i, 1)
      } else {
        // Ramp up + blink
        const total = w.fireTime - (w.fireTime - 1500)  // assume 1.5s
        w.mesh.material.opacity = 0.3 + 0.5 * (1 - remaining / 1500)
        if (remaining < 500) {
          // Last 500ms: rapid flash
          w.mesh.material.opacity *= 0.5 + 0.5 * Math.sin(now * 0.02)
        }
      }
    }
  }
}
```

**2. Enemy attack telegraph helper**

```ts
async function enemyAttack(enemy, target) {
  // 1. Telegraph — visual/audio
  enemy.material.emissive.setHex(0xff4400)
  playSound('enemy-windup', enemy.position)
  
  // 2. Anticipation animation
  await tween(enemy.scale, { y: 1.3, x: 0.85 }, 200)
  
  // 3. Wait (player reaction time)
  await wait(400)
  
  // 4. Attack
  enemy.material.emissive.setHex(0x000000)
  await tween(enemy.scale, { y: 1, x: 1 }, 100)
  
  if (distance(enemy, target) < enemy.attackRange) {
    dealDamage(target, enemy.damage)
  }
}
```

**3. AOE warning**

```ts
function aoeAttack(pos, radius) {
  warningSystem.warnAOE(pos, radius, 1200, () => {
    // Actual damage
    const hits = entitiesIn(pos, radius)
    for (const h of hits) dealDamage(h, 50)
    // Explosion effect
    spawnExplosion(pos)
  })
}
```

## Antipatterns

### 1. Telegraph too long

3s telegraph → player perceives "slow AI."
**Fix**: threat intensity matches duration. Light melee 0.5s, boss ult 1.5s.

### 2. Telegraph invisible

Red AOE ring on red lava background = can't see.
**Fix**: desaturate background or use contrasting color to make telegraph pop.

### 3. Multiple telegraphs overlap

3 enemies telegraph simultaneously → full screen red → can't parse.
**Fix**: limit concurrent telegraphs, stagger them.

### 4. Telegraph inconsistency

Same action sometimes telegraphs, sometimes doesn't.
**Fix**: establish rules, enforce strictly so players learn.

### 5. False telegraph (lies)

Red circle appears but no attack.
**Fix**: always honor telegraph promise. Otherwise player stops trusting.

## Related skills

- `skills/craft/animation.md` — anticipation is animation telegraph
- `skills/craft/color-grammar.md` — red = danger (telegraph color)
- `skills/game/axioms/meaningful-choice.md` — telegraph enables "dodge or take hit" decision
- `skills/game/axioms/flow-channel.md` — telegraph creates learnable difficulty curve

## References

- *AI Game Programming Wisdom* series (enemy AI volumes)
- Mark Brown, *What Makes a Good Boss Fight?* (GMTK)
- Dark Souls design interview (Miyazaki)
- *Cuphead* GDC postmortem (Studio MDHR)
- *World of Warcraft* raid design interview (Blizzard)
