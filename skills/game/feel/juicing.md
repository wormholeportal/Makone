# Juicing — stack feedback channels to make ordinary actions euphoric

> **Every significant action must trigger simultaneously: visual flash + screen shake + particle burst + sound + time freeze + debris trail.
> Single-channel feedback is "sound"; six-channel stacked is "music."**

## One-liner

Transform "press Space to attack" into "press Space and watch the whole screen tremble" — players feel like they're in a completely different game.
Code change <50 lines, subjective euphoria multiplier ×10.

## Why

Human sensation is multi-channel (vision, hearing, proprioception), each with limited resolution.
Spread the same message across multiple channels → sensory redundancy → brain flags "this matters" → dopamine release.

Jan Willem Nijman of Vlambeer demonstrated this in his 2013 INDIGO talk *The Art of Screenshake*:
a plain 2D shooter, incrementally stacked with 30 micro-feedback tricks,
audience reaction pivoted from "meh" to "YES!" — **core code unchanged, just layered feedback**.

Why *Vampire Survivors* (top-down sprite + auto-attack) plays like a AAA shooter.
Nuclear Throne, Enter the Gungeon, Hades are all juice masterclass.

## Quantified standards

**Nijman's 30-item checklist** (top 12 by impact-to-effort, ranked):

| # | Technique | Dev cost | Euphoria gain |
|---|---|---|---|
| 1 | Screen shake on hit 50-100ms (amp 0.1-0.3) | 5 lines | ⭐⭐⭐⭐⭐ |
| 2 | Hitstop on hit (freeze 50-100ms) | 10 lines | ⭐⭐⭐⭐⭐ |
| 3 | Hit target flash white 100ms | 10 lines | ⭐⭐⭐⭐ |
| 4 | Particle burst on hit (10-30 particles) | 30 lines | ⭐⭐⭐⭐ |
| 5 | Weapon/bullet smoke/shell casing trails | 30 lines | ⭐⭐⭐ |
| 6 | Screen slight flash on attack | 5 lines | ⭐⭐⭐ |
| 7 | Character squash/stretch frame on attack | 5 lines | ⭐⭐⭐ |
| 8 | Enemy corpse remains + fade out | 20 lines | ⭐⭐⭐ |
| 9 | Kill bonus mega-burst (special particles + stronger shake) | 20 lines | ⭐⭐⭐ |
| 10 | Attack layered low + high-freq sound | 1 audio file | ⭐⭐⭐⭐ |
| 11 | Slow-mo (last enemy kill: full stage 0.5x speed 1s) | 30 lines | ⭐⭐⭐⭐ |
| 12 | Camera lead on player speed / ease on decel | 20 lines | ⭐⭐⭐ |

**Stacking rule**: any single technique in isolation has limited impact.
**5+ techniques compound exponentially**. Why many Hotline Miami imitations miss the "unhinged euphoria" — they added screen shake but skipped hitstop + slow-mo + corpse physics + layered audio.


## Good examples

- **Hades**: every attack has hitstop + particles + screen shake + corpse ragdoll + sound. Hitting minions feels like defeating a boss.
- **Vampire Survivors**: pure top-down sprite, but each level-up triggers full-screen hitstop + blue flash + solemn SFX, players can't quit for dozens of hours.
- **DOOM 2016 / Eternal**: every glory kill is slow-mo + screen shake + blood spray + sound + health-restore particles. Id Software treats juice as a first-class citizen.
- **Slay the Spire**: each card draw has micro-animation + sound; hits pop big damage numbers + shake.
- **Geometry Wars**: every shot trails particles; every enemy death blooms a geometric flower; combo counters fly up.

## Antipatterns

- **Unity Asset Store default demo**: punch enemy, HP -10, zero visual feedback. Looks "feature complete," plays dead.
- **Early Roblox combat games**: hit target flashes red, done. Hollow.
- **Any "looks right but feels wrong" game**: 99% juice deficit.

## How to implement in Makone / Three.js

**1. Screen Shake**

```js
// add to GameRuntime
let shakeTime = 0, shakeAmp = 0
function shake(amp, durationMs) {
  shakeAmp = amp
  shakeTime = durationMs / 1000
}
// in updateCamera:
if (shakeTime > 0) {
  shakeTime -= dt
  const factor = shakeTime / 0.1
  camera.position.x += (Math.random() - 0.5) * shakeAmp * factor
  camera.position.y += (Math.random() - 0.5) * shakeAmp * factor
}

// call on hit:
function onHit() { shake(0.3, 80) }
```

**2. Hitstop (impact freeze)**

```js
let frozenUntil = 0
function hitstop(durationMs) {
  frozenUntil = performance.now() + durationMs
}
function tick(now) {
  const dt = now < frozenUntil ? 0 : actualDt  // dt = 0 while frozen
  // physics, animation, AI all use this dt
}
function onHit() { hitstop(80) }
```

**3. Hit white flash**

```js
function flashWhite(mesh, durationMs) {
  const orig = []
  mesh.traverse(c => {
    if (c.isMesh) {
      orig.push([c, c.material])
      c.material = whiteMat
    }
  })
  setTimeout(() => {
    for (const [c, m] of orig) c.material = m
  }, durationMs)
}
```

**4. Particle burst**

```js
function explode(pos, color, count = 15) {
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(particleGeo, makeMat(color))
    p.position.copy(pos)
    const a = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 4
    activeParticles.push({
      mesh: p,
      vx: Math.cos(a) * speed,
      vy: 2 + Math.random() * 3,
      vz: Math.sin(a) * speed,
      life: 0.6 + Math.random() * 0.3,
    })
    scene.add(p)
  }
}
```

**5. Squash & Stretch**

```js
function pulseScale(mesh, axis, amount, durationMs) {
  const original = mesh.scale[axis]
  mesh.scale[axis] = original * amount
  setTimeout(() => mesh.scale[axis] = original, durationMs)
}
// on attack:
pulseScale(playerMesh, 'y', 1.2, 50)  // stretch
pulseScale(playerMesh, 'x', 0.9, 50)  // squash
```

**6. Slow Motion**

```js
let timeScale = 1, slowMoUntil = 0
function slowMo(scale, durationMs) {
  timeScale = scale
  slowMoUntil = performance.now() + durationMs
}
function tick(now) {
  if (now > slowMoUntil) timeScale = 1
  const dt = baseDt * timeScale
  // physics uses this dt
}
// on final enemy kill:
function onLastEnemyKilled() { slowMo(0.3, 600); shake(0.4, 200) }
```

## Antipattern: over-juicing

Good juice in excess becomes **sensory fatigue**:

- Every action hitstops → constant stuttering feel
- Screen shakes constantly → dizziness, can't read
- Particles everywhere → can't see enemy
- Permanent slow-mo → loses rhythm

**Hierarchy principle**: juice should have **tiers**:
- Walk, jump → light juice (small particles, soft SFX)
- Hit enemy → medium juice (screen shake + particles + flash)
- Kill enemy → heavy juice (hitstop + big burst + corpse)
- Boss kill / stage clear → max juice (slow-mo + screen flash + numbers fly + screen crack)

Players perceive importance through juice intensity.

## Scope

Not every game needs max juice.

- **Action / shooter / platformer**: must have high juice
- **Puzzle / simulation / building**: low juice; excess interferes with thought
- **Narrative / interactive fiction**: barely any juice (except key moments)

But even in low-juice games, "significant moments" must juice — otherwise they drown.

## Related skills

- `skills/game/axioms/feedback-latency.md` — juice is feedback's advanced form
- `skills/game/feel/hitstop.md` — hitstop deep-dive
- `skills/craft/animation.md` — squash/stretch's 12 principles
- `skills/craft/contrast-hierarchy.md` — juice hierarchy

## References

- Jan Willem Nijman (Vlambeer), *The Art of Screenshake* (INDIGO Classes 2013)
- Steve Swink, *Game Feel* (especially Polish chapter)
- Mark Brown, *Secrets of Game Feel and Juice* (GMTK 2018)
- Martin Jonasson & Petri Purho, *Juice it or lose it* (Forest Moon, 2012)
