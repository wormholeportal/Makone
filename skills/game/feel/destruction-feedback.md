# Destruction feedback stack

## The principle

> **Any destruction event (enemy dies, wall breaks, player dies) must
> trigger ≥3 simultaneous feedback channels. Fewer than 3 reads as
> "the object just disappeared". Three+ reads as "the object was destroyed".**

This is not "more is better" maximalism — it's a perceptual threshold.
The brain interprets a thing's disappearance as either:
- *"It moved out of my view"* — boring, no feedback
- *"It was eaten by the system"* — broken, no feedback
- *"It was DESTROYED"* — satisfying, only if you provide enough simultaneous
  evidence that destruction happened

Each missing channel weakens the read. One channel alone (just particles, or
just shake, or just a sound) feels "okay" but not "satisfying". Three+
channels firing within the same 100ms window cross the perceptual threshold.

## The 5 channels

### 1. Particle burst (visible debris)

The destroyed thing must shed pieces of itself. The pieces' colors should
match the thing (orange tank → orange-fragment burst; red brick → red-fragment
burst). Burst size scales with the destroyed thing's importance.

```js
fxPS.burst({
  position: { x, y, z },
  count: 28,                          // weak: 5, medium: 15, big: 30+, boss: 60+
  speed: [3, 7],                      // radial outward
  lifetime: [0.4, 0.8],
  sizeOverLife: [1.5, 0.2],           // shrinks as it ages
  color: [C.thingColor, C.thingAccent], // match the destroyed thing
  gravity: -3,
  spread: Math.PI,
})
```

### 2. Screen shake (felt impact)

Brief, sharp shake. Amplitude scales with importance.

```js
shake.add({ amplitude: 0.18, frequency: 22, duration: 0.22 })
// Small enemy: 0.08–0.15  ·  Big enemy: 0.25–0.35  ·  Boss / player death: 0.45+
```

Without shake, particle bursts feel "weightless" — like a graphic effect
rather than a physical impact.

### 3. Light flash (illumination spike)

A brief point light at the destruction site, fading over 0.2–0.4s. Even
in lit scenes this adds energy; in moody scenes it's the difference between
"a thing died" and "an explosion happened".

```js
const flash = new THREE.PointLight(0xff8830, 4, 8)
flash.position.set(x, 1.2, z)
scene.add(flash)
let t = 0
const tick = setInterval(() => {
  flash.intensity *= 0.7
  if ((t += 0.05) > 0.3) { clearInterval(tick); scene.remove(flash) }
}, 30)
```

### 4. Sound (audio impact)

Not implemented in many of our scenes yet (audio is the last polish layer),
but in practice this is the strongest single channel. Even bad MP3 explosion
sounds carry massive feel. When we get audio in, this becomes channel #1.

### 5. Persistent mark (the world remembers)

After the burst fades, leave something behind:

- **Scorch mark**: dark circle on the ground where it exploded
- **Rubble**: small dark patches where bricks were
- **Crater**: an actual indent in the terrain (expensive — use sparingly)
- **Body that fades**: the dying mesh stays for ~0.4s with squish-down
  scale animation, THEN disappears

The persistent mark is what turns "fight" into "battlefield". After 5 minutes
of play, a Battle City map with scorch marks and rubble patches *looks like
something happened there*. Without persistent marks, the map looks pristine
no matter how much you fought — breaks immersion.

## The stack in code (reference implementation)

This is the `bigExplosion()` pattern, extracted into a reusable helper:

```js
function explode(scene, { x, y, z }, opts = {}) {
  const scale = opts.scale ?? 1
  const { fxPS, shake } = opts

  // 1. Core particle burst (hot fragments)
  fxPS?.burst({ position: { x, y: y + 0.7, z },
    count: 28 * scale, speed: [4, 9], lifetime: [0.35, 0.7],
    sizeOverLife: [1.5 * scale, 0.2],
    color: [0xfff5a0, 0xff8030, 0xffffff],
    gravity: -4, spread: Math.PI })

  // 1b. Secondary slow fireball
  fxPS?.burst({ position: { x, y: y + 0.9, z },
    count: 20 * scale, speed: [1.5, 3.5], lifetime: [0.5, 1.0],
    sizeOverLife: [2.2 * scale, 0.4],
    color: [0xff5018, 0xa83018, 0xff8030],
    gravity: -1, spread: Math.PI })

  // 1c. Smoke ring
  fxPS?.burst({ position: { x, y: y + 0.5, z },
    count: 16 * scale, speed: [1, 2.5], lifetime: [0.8, 1.5],
    sizeOverLife: [2.5 * scale, 1.0],
    color: [0x707078, 0x404048, 0x909098],
    gravity: 0.8, spread: Math.PI })

  // 2. Screen shake
  shake?.add({ amplitude: 0.28 * scale, frequency: 22, duration: 0.32 })

  // 3. Light flash
  const flash = new THREE.PointLight(0xff8830, 4 * scale, 8 * scale)
  flash.position.set(x, y + 1.2, z)
  scene.add(flash)
  // ... fade out over 0.3s ...

  // 5. Scorch mark
  const scorch = new THREE.Mesh(/* dark circle on ground */)
  // ... place + fade after 3s ...
}
```

## Tuning by importance

| Destruction event | Particle count | Shake amplitude | Light intensity | Mark size | Total channels |
|---|---|---|---|---|---|
| Small enemy | 14 | 0.10 | 2 | small | 4 |
| Tank / vehicle | 28 | 0.28 | 4 | medium | 5 |
| Player death | 36 | 0.40 | 5 | large | 5 + brief slow-mo |
| Boss / structure | 60+ | 0.55 | 8 | huge | 5 + multi-stage |

The scaling matters: a small enemy with the same explosion as a boss feels
absurd; a boss with the same as a small enemy feels anticlimactic.

## Anti-patterns

### A1. "I'll add particles and call it done"

Particles alone read as "graphics" not "destruction". The thing visually
disappears AND a graphic plays. The brain doesn't connect them as cause-effect.

### A2. "I'll just shake the screen harder if it doesn't feel impactful"

Shake without other channels feels like a bug ("why did my screen jitter?").
The user attributes the shake to a glitch, not a destruction event.

### A3. "Same effect for every destruction"

If a grunt enemy and the final boss explode identically, both feel cheap.
Tune by importance.

### A4. "No persistent marks — they slow down rendering"

A flat plane decal is essentially free. Skipping them is leaving 20% of the
feel on the table. The world feels static without them.

## When you can use fewer channels

Two acceptable cases for ≤2-channel destruction:

1. **The destruction is unimportant** — a passive cosmetic (bird flies off,
   leaf falls) where you don't want player attention. Use 1 channel.
2. **The destruction is the *consequence* of another event you already gave
   full feedback for** — e.g. player hits enemy with sword: the sword swing
   has full impact feedback (slash effect + hitstop + shake); the enemy's
   subsequent death animation can be quieter (just a particle puff +
   fade-out) because the impact already registered.

Outside these cases, use the full stack.

## Cross-references

- `skills/game/axioms/feedback-latency.md` — channels must fire within the same
  ~100ms window to register as one event
- `skills/game/feel/screen-shake.md` — shake parameter tuning
- `skills/game/feel/hitstop.md` — pairs with destruction for player-caused kills
- `runtime/game/particlesystem.js` — the instanced pool the debris channel draws from
- `docs/principles.md` E5 — bloom-hygiene constraint on the light-flash channel
  (don't crank flash so high it triggers bloom washout in bright scenes)
