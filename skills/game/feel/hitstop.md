# Hitstop — burn "I hit it" into the player's nerves

> **Freeze all motion for 50-120ms on impact.
> Players don't perceive it as lag; they feel "I connected, and it packed weight."
> Attacks without hitstop always feel like swinging at air.**

## One-liner

Fighting games come in two flavors: ones with hitstop, and ones that feel like your fists are phasing through enemies.
This single technique turns an ordinary punch into something that feels heavy.

## Why

Real physics of fighting: fist hits something, **instant deceleration** (reaction force from target).
Games lack real mass → punch animates through weightless enemy → feels like swinging air.

Hitstop artificially freezes 50-120ms to simulate "recoil delay":
- Attacker freezes: feels "I connected, my fist got stopped by meat."
- Target freezes: feels "enemy suspended mid-flight right after impact."
- Both frozen together = the moment your brain perceives "that was the punch."

Action cinema does this — slow-mo on knuckle-to-face contact reads heavier than speed alone.

30 years of fighting-game practice has tuned hitstop into exact science:
- Light punch: 5-10 frames (~83-167ms)
- Heavy hit: 10-20 frames
- Ultimate move: 20-30 frames + screen flash + slow-mo

## Quantified standards

**Scaled by impact strength**:

| Attack type | Hitstop duration | Companion effects |
|---|---|---|
| Light hit / bullet | 30-60ms | Slight screen shake |
| Normal kill | 60-100ms | + particle burst |
| Heavy hit / crit | 100-150ms | + screen flash + large particles |
| Ultimate / boss kill | 200-500ms | + slow-mo + full-screen effect |
| Stage clear | 500-2000ms | + camera cut + music swell |

**Stacking rules**: longer hitstop ≠ better.
Long hitstop for "moment of significance," short hitstop for "rapid combos."
Long hitstop throughout feels laggy; no hitstop feels toothless.
**Vary rhythmically** — that's the design.

## Implementation

Hitstop is not "pause the game" — it's **time scaling**:

```js
let timeScale = 1
let hitstopUntil = 0

function tick(realDt) {
  if (performance.now() < hitstopUntil) {
    timeScale = 0  // complete freeze
  } else {
    timeScale = 1  // resume
  }
  const dt = realDt * timeScale

  physics.step(dt)
  updateAnimations(dt)
  updateAI(dt)
  // ...
}

function onHit() {
  hitstopUntil = performance.now() + 80  // 80ms freeze
}
```

**Critical points**:
- Input handling: **exclude from time scaling** (player can queue next punch)
- Visual effects (particles, screen shake, flash): **exclude from time scaling** (these happen *during* hitstop, must play)
- Audio: **don't freeze** (impact sound plays normally)

## Hard freeze vs gradual freeze

**Hard freeze**: `timeScale = 0` → `timeScale = 1`
- Pros: simple, immediate
- Cons: might feel like a brief hitch

**Gradual freeze**: ease 0 → 0.3 → 0.7 → 1
- Pros: feels like "slow-motion replay"
- Cons: complex, might interfere with precise control

Indie games use hard freeze. AAA action (Devil May Cry, Bayonetta) uses gradual.

## Good examples

- **Mortal Kombat series**: every heavy hit gets hitstop; X-Ray attacks are 4+ seconds of slow-mo.
- **Bayonetta**: perfect dodge activates *Witch Time* (5s at 0.3x speed) — hitstop taken to its logical extreme.
- **DOOM Eternal**: every Glory Kill freezes, plays slow-mo, screen shakes, adds blue flash.
- **Hollow Knight nail hit**: 60ms hitstop + knockback + particle effect.
- **Super Smash Bros.**: every K.O. has "pause + explosion scale" — everything freezes.

## Antipatterns

- **Early Unity FPS**: bullet hits enemy, zero freeze, enemy HP -10 silently. Feels like shooting straw.
- **MMORPG arrows**: projectile hits, no feedback, player stares at UI damage number to verify it landed.
- **"Fighting game without hitstop"**: basically doesn't exist; no one ships one.

## Relationship to Hitlag / Hitstun / Knockback

Fighting-game terminology gets precise:

- **Hitlag**: both attacker and target **frozen** for X duration (the formal term for hitstop)
- **Hitstun**: target remains **locked in recovery** (can't act) after hitstop ends
- **Knockback**: speed + distance target travels during hitstun

Full sequence:
```
Attack connects → Hitlag (both freeze 80ms) → Hitstun (target locked 400ms) + Knockback (travels 5m)
                └ attacker now free → can chain next move
```

## Adding hitstop to Makone GameRuntime

Modify `GameRuntime.ts`:

```ts
private _hitstopUntil = 0
hitstop(durationMs: number) {
  this._hitstopUntil = performance.now() + durationMs
}

private _loop = () => {
  if (this._disposed) return
  this._animId = requestAnimationFrame(this._loop)
  const realDt = Math.min(this._clock.getDelta(), 0.05)

  // during hitstop, dt = 0, but visual still advances
  const inHitstop = performance.now() < this._hitstopUntil
  const dt = inHitstop ? 0 : realDt

  if (this._state === 'playing') {
    this._elapsed += dt
    this._updateController(dt)  // input still responsive (physics frozen)
    this._updateAI(dt)
    this.physics.step(dt)
    // ...
  }
  // visual effects (particles, flash, shake) run normally, not frozen
  this.renderer.render(...)
}

// call from dealDamage:
dealDamage(target, amount, source) {
  // ...
  this.hitstop(60)  // normal hit
  if (target.health <= 0) this.hitstop(150)  // kill
}
```

## Antipatterns

**1. Hitstop blocks input**
Player presses next move, but freeze swallows it → player: "controls froze!"
**Fix**: decouple input from time scaling; inputs always queue to buffer.

**2. Hitstop too long (>300ms)**
Rapid-fire combat feels "always stuttering."
**Fix**: short hitstop for fast attacks (30-60ms), long for heavy attacks (150ms+).

**3. Multiple hitstops stack explosively**
3 projectiles hit 3 enemies → 3 hitstops triggered = 240ms total. Looks like a freezeframe bug.
**Fix**: cap one hitstop per frame; overlaps take the max.

```js
hitstop(ms) {
  const newEnd = performance.now() + ms
  this._hitstopUntil = Math.max(this._hitstopUntil, newEnd)
}
```

## Related skills

- `skills/game/feel/juicing.md` — hitstop is the most effective juicing tool
- `skills/game/axioms/feedback-latency.md` — hitstop is "feedback extended," not "feedback delayed"
- `skills/game/feel/input-buffering.md` — inputs during hitstop captured by buffer
- `skills/craft/contrast-hierarchy.md` — long hitstop = significant moment

## References

- Daisuke Ishiwatari, *Guilty Gear* design interview
- *Super Smash Bros.* series GDC talk
- Mark Brown, *Why Does Hollow Knight Feel So Good?* (GMTK)
- Steve Swink, *Game Feel*
- Yoshinori Ono, *Street Fighter IV* postmortem
