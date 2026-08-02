# Affordance — visual readability is the first language of interaction

> **Don Norman 1988: affordance is the visual clue that suggests how an object works.
> If it looks pressable, press it. If it looks climbable, climb it. If it glows, it matters.
> Violate affordance = player trial-and-error = learning curve collapses.**

## One-liner

All interactive objects must **look interactive**.
All non-interactive objects must **look decorative**.
Reverse this = players miss jumps, hit walls, blame game.

## Why

Don Norman (1988) in *The Design of Everyday Things*:
> "Affordances provide strong clues to the operations of things... When affordances are taken advantage of, the user knows what to do just by looking; no picture, label, or instruction needed."

Visual characteristics **suggest** function:
- Door handle protrudes → pull
- Flat push plate → push
- Button indent → press

Games inherit this (virtual objects build intuition from real):
- Button-shaped → press
- Platform-shaped → step
- Handle-shaped → grab

**Reverse affordance** = player intuition breaks:
- Decorative-looking chest with treasure → 90% players miss
- Platform-looking block is solid → player falls, dies
- Button-looking object not pressable → player wastes time

## Quantified standards

**5-second recognition test**: show screenshot to newcomer 5 seconds. Ask:
- Where can I walk?
- Where's danger?
- Where are items / goals?
- Which NPC can I talk to?

If they guess 80%+ → affordance design good.
If < 50% → players lost, must redesign.

## 5 classic affordances

### 1. Standable

Characteristics: horizontal surface, evenly-spaced relative to head, worn edges

✓ Flat tile (standable)
✗ Tilted ramp (unclear if slidable)

Implementation: all standable surfaces need clear horizontal silhouette + edge wear (grass, scuffs).

### 2. Pushable

Characteristics: distinct from background, shadow, regular shape, slightly raised

✓ Wooden crate (distinct from floor, clearly separate object)
✗ Sculpture merged with wall (looks decorative)

Implementation: pushable objects need **subtle float / color contrast / rim light**.

### 3. Interactive

Characteristics: flicker, glow, button shape, sound cue

✓ Red glowing button + circular indent
✗ Plain screw on wall (player won't think to press)

Implementation: interactive objects need **emissive** + **subtle animation** (pulse / rotate).

### 4. Pickable

Characteristics: floats above ground + rotates + glows + particles

✓ Floating sword (pulses up/down)
✗ Sword flush with ground (looks decorative)

Implementation:

```js
function tick(t) {
  pickup.position.y = baseY + Math.sin(t * 2) * 0.15
  pickup.rotation.y += dt * 1.5
}
```

### 5. Dangerous

Characteristics: red / orange, sharp shape, flicker, warning texture (yellow-black stripes)

✓ Spikes glowing red with sharp geometry
✗ Lava that looks like regular ground

Implementation: hazard must be **high-contrast color + sharp silhouette + animated**.

## Classic examples

### The Legend of Zelda (NES)

Every interactable is obvious: doorways are door-shaped, chests glow, pots have distinct shape.
Players never wonder "can I interact with this?"

### Portal

White platforms = safe. Orange platforms = moving. Dark = walls. Emitters glow.
Visual language so consistent players instantly read complex setups.

### Dark Souls

Doors have distinctive arches. Ladders are climbable geometry. Levers stick out.
Item drops have distinct sparkle + float. Boss fog is unmistakable.

## Antipatterns

- **Hidden treasures in scenery**: chest looks identical to background → player misses loot
- **Invisible walls**: solid-looking gaps actually block → frustration
- **Interactive items that don't look interactive**: button texture but not glowing → player skips
- **Too much affordance**: every object glows → visual noise → player can't prioritize
- **Affordance inconsistency**: sometimes glowing means hazard, sometimes means item → confusion

## How to implement

**1. Use color to signal interaction**

```js
// Interactive = high-saturation + glow
material.emissive = 0xff6600
material.emissiveIntensity = 0.5

// Decorative = desaturated + no glow
material.emissive = 0x000000
```

**2. Add slight float to pickables**

```js
if (isPickable) {
  mesh.position.y += Math.sin(time * 2) * 0.1
}
```

**3. Use shape language**

```
Platforms = horizontal rectangles
Hazards = sharp angles
Interactives = buttons / protrusions
```

## Related skills

- `skills/craft/silhouette.md` — affordance starts with readable shape
- `skills/craft/narrative-light.md` — light guides attention to affordances
- `skills/game/axioms/meaningful-choice.md` — affordances enable meaningful interaction
- `skills/game/feel/telegraphing.md` — affordances telegraph what's about to happen

## References

- Don Norman, *The Design of Everyday Things* (1988)
- William Lidwell, *Universal Principles of Design*
- Naomi Oreskes, *The Collapse of Western Civilization*
- Mark Brown, *Why Your Game Feels Bad* (GMTK)
