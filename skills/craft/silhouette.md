# Silhouette — shape before detail

> **Player spends 99% zoomed out, not closeup.
> If silhouette reads at distance, details will read.
> If silhouette is muddy, detail doesn't matter — player squints and misses the character.**

## One-liner

Design shape first. Add detail second.
A clear bad silhouette + perfect details = worse than clear silhouette + no details.

## Why

At typical play distance, player sees silhouette, not triangles.
Camera is 5-10 meters away, moving fast.
Player must instantly recognize: ally / enemy / interactive / hazard.

Add detail to support silhouette, never replace it.

**Bad silhouette examples**:
- Rounded blob = is this enemy or pillar?
- Spiky but no clear form = what even is this?
- Symmetrical shape = can't tell front from back

**Good silhouette examples**:
- Clearly humanoid = player knows it's AI
- Sharp pointed top = instant "dangerous"
- Distinct base = instantly "solid object"

## Quantified standards

**Silhouette test**:
1. Convert character to solid black
2. Zoom out to game distance (1000px tall on screen = 10% actual size)
3. Can you tell what it is? If yes → silhouette good

**Readable distance**: 
- At 50 meters away (typical gameplay), shape still distinct
- At 100 meters away, still recognizable (even if details lost)
- Tested solid black + no texture, shape alone

## 2 checkpoints

### Checkpoint 1: Horizontal silhouette

Look from the side. Player should instantly know:
- Humanoid (pose readable)
- Animal (posture distinguishable)
- Object (shape obvious)

**Test**: does it still read at half its size?

### Checkpoint 2: Vertical silhouette

Look from above. Player should instantly know:
- This is game entity (not just terrain)
- Head vs body distinguishable
- Facing direction clear

**Test**: if upside-down, does pose still read?

## Exemplars

### Dark Souls character design

Each boss has silhouette you recognize from across the arena.
Knight ≠ Caster ≠ Beast even zoomed out.
Detail enhances, doesn't define.

### Hollow Knight

Main character is white dot, but silhouette (rounded top, thin base) is unmistakable.
Enemies have distinct shapes: round hoppers vs tall mantis.
Works at any zoom level.

### Minecraft

Blocks are simple geometry but silhouettes perfectly readable.
Player, Creeper, Zombie, Spider — all recognizable instantly.
Proves detail is not required; silhouette is.

## Antipatterns

- **Feathered edges on silhouette**: looks soft but reads muddy → avoid
- **Multiple characters same silhouette**: player can't tell allies from enemies quickly
- **Symmetrical design**: player can't tell front from back at distance
- **Silhouette broken by clipping**: cape or hair pokes through geometry → confusing outline
- **Detail fights silhouette**: intricate texture but unclear form → visual noise

## How to implement

**1. Design in black first**

```js
// Ignore colors, just use black material
const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
mesh.material = blackMat
// Does shape read? If no, redesign geometry.
```

**2. Add detail after**

```js
// Only then add:
// - Texture
// - Color variation
// - Lighting detail
// But never change core silhouette
```

**3. Test at game distance**

```js
// Render at typical camera distance
// Shrink window to 10% original size
// Can you still identify the entity?
// If no → silhouette failed
```

## Related skills

- `skills/craft/affordance-design.md` — silhouette signals what entity does
- `skills/craft/narrative-light.md` — lighting emphasizes silhouette
- `skills/craft/contrast-hierarchy.md` — silhouette is highest contrast

## References

- James Gurney, *Color and Light*
- Mike Mignola, *Hellboy* (graphic design)
- Animation production (Disney, Studio Ghibli) silhouette principles
- Game Art Tricks blog (silhouette analysis)
