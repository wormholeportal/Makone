# Color grammar — color that means something instead of decorating

> **Each color must map to a fixed semantic.
> Red = danger, Blue = friendly/resource, Gold = objective, Green = healing/correct, Purple = mysterious/rare.
> Inconsistent color = visual grammar error = players "can't read" the game.**

## One-liner

Games don't write text, but color is text.
Player sees screen 5 seconds and must know which are enemies, which allies, where to go, where to hide.
Inconsistent color coding is like a grammatical error in prose — even if each word is right, you can't read it.

## Why

Humans have cross-cultural consistency in color emotional association (some variation but games can standardize):

| Color | Psychological association | Source |
|---|---|---|
| **Red** | Blood, fire, warning, enemy | Evolution (blood = danger signal) |
| **Orange** | Flame, explosion, warning | Secondary red |
| **Yellow/Gold** | Sunlight, treasure, value, attention | Gold, sun |
| **Green** | Plants, life, health, safety | Nature |
| **Cyan** | Water, calm, technology, future | Water, ice |
| **Blue** | Sky, ocean, friendly, stable | Nature, safety |
| **Purple** | Mystery, rare, magic, nobility | History (purple dye scarcity) |
| **White** | Purity, player, sacred, void | Culture (multi) |
| **Black** | Death, unknown, evil, night | Nature (night danger) |

Games leverage these associations = players understand without learning.
Games reverse them = players must relearn, high cognitive load.



## Quantified standards

**Color consistency test**: Screenshot all game elements, group by color.
- Same hue elements should have same semantic (all red = danger)
- Different semantic elements should have different hues

**Minimum 5 semantic slots**: player, enemy, objective, danger, reward.
Each semantic has fixed color. Doesn't change all game.

**Colorblind compatible**: Check with colorblind filter.
8% males, 0.5% females are colorblind.
Red-green colorblind can't distinguish red/green → can't only use red/green for faction distinction, must combine with shape/brightness.



## Standard game color table

After 30 years game culture accumulation, players' subconscious color mappings:

```
═══════ Player-Related ═══════
Player self           White/Blue/Orange (player theme, consistent all game)
Player HP             Green (full) → Yellow (warning) → Red (critical)
Player mana           Blue
Player stamina        Yellow

═══════ Enemy-Related ═══════
Common enemy          Red
Elite enemy           Purple
Boss                  Dark red / Black-red
Enemy faction marker  Red

═══════ Ally-Related ═══════
Friendly NPC          Blue
Quest giver           Yellow ! / Yellow ?
Ally unit             Blue (with player border)

═══════ Resource-Related ═══════
Gold coin             Gold
Gem / Diamond         Cyan / Purple
Experience            Purple / Blue
Ammo                  Orange / Green (depends on game)

═══════ Environment-Related ═══════
Healing item          Green + cross OR red cross (medical symbol)
Trap                  Red / Orange flashing
Exit / Objective      Bright yellow / Bright gold (high contrast)
Background            Neutral gray / Brown / Blue (unobtrusive)

═══════ UI-Related ═══════
Positive message      Green
Negative message      Red
Warning               Orange / Yellow
Info                  Blue
```

## Good example: World of Warcraft

WoW strict color semantic system:

- **Quest marks**: Gold ! = accept, Gold ? = turn-in, Gray = underleveled
- **Equipment quality**: White → Green → Blue → Purple → Orange (trajectory fixed, players instantly judge)
- **Enemy healthbar color**: Gray = non-hostile / Red = hostile / Blue = friendly / Green = faction / Purple = PVP
- **Chat channels**: White = general, Yellow = system, Blue = guild, Green = yelling

15 years this system unchanged. New players instantly get it.

## Good example: Slay the Spire

- **Characters**: each has theme color (Ironclad = red, Silent = green, Defect = blue, Watcher = purple)
- **Cards**: attack red, skill green, power purple, no exceptions
- **Relic rarity**: White / Green / Purple / Orange
- **Enemy intent**: Red sword = attack, Green shield = defend, Purple spiral = buff
- Player sees 1 second, knows what next turn does

## Good example: Mirror's Edge

Rare "use one color as sole guidance" design:

- Entire city 95% white + gray
- **Only red** = climbable / runnable / jumpable object
- Players naturally follow red, need no UI

Color grammar simplified to extreme.



## Bad examples

- **Early MMO battlefields**: Player + enemy + NPC similar colors → screen chaos indistinguishable, group fights purely by UI nameplate.
- **Nintendo's *Splatoon* Blue/Orange teams (before colorblind option)**: colorblind players couldn't distinguish team ink. Later added optional Orange/Purple swap.
- **Colorful but semantically muddled puzzle games**: Red key opens blue door / Blue key opens green door → must memorize, no intuition.
- **Novice designer makes "enemies blue"**: violates player subconscious, every blue means "stop and identify."



## How to implement in Makone / Three.js

**1. Define global color enum**

```ts
// src/game/colors.ts
export const SemanticColors = {
  PLAYER: 0x66ddff,
  PLAYER_HP: 0x44ff66,
  PLAYER_HP_LOW: 0xff4444,
  ENEMY_BASIC: 0xff4444,
  ENEMY_ELITE: 0xaa44ff,
  ENEMY_BOSS: 0x880000,
  ALLY: 0x4466ff,
  RESOURCE_GOLD: 0xffcc44,
  RESOURCE_MANA: 0x44aaff,
  HEALING: 0x44ff66,
  DANGER: 0xff6622,
  WARNING: 0xffaa22,
  TARGET: 0xffff88,
  NEUTRAL: 0x888888,
}
```

Entire game pulls from this table only, **never hardcode colors**.
```ts
// ❌
const enemy = M(0xff0000)  // who knows what this red means?

// ✓
const enemy = M(SemanticColors.ENEMY_BASIC)  // obviously clear
```

**2. Auto-apply color to entities**

```ts
function createEnemy(type) {
  const color = {
    basic: SemanticColors.ENEMY_BASIC,
    elite: SemanticColors.ENEMY_ELITE,
    boss: SemanticColors.ENEMY_BOSS,
  }[type]
  
  const mesh = new THREE.Mesh(geo, M(color, { emissive: color, emissiveIntensity: 0.3 }))
  return mesh
}
```

**3. Change color on state change**

```ts
// Player turns red when HP low
function updatePlayerColor(hpPct) {
  const color = hpPct > 0.5 ? SemanticColors.PLAYER
              : hpPct > 0.25 ? SemanticColors.WARNING
              : SemanticColors.PLAYER_HP_LOW
  playerMesh.material.emissive.setHex(color)
}
```

**4. AOE warning uses red decal**

```ts
const aoeWarning = new THREE.Mesh(
  new THREE.RingGeometry(radius * 0.9, radius, 32),
  new THREE.MeshBasicMaterial({
    color: SemanticColors.DANGER,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  })
)
aoeWarning.rotation.x = -Math.PI / 2
// Player naturally dodges when seeing red circle
```

**5. Pickups use corresponding resource color**

```ts
function spawnPickup(type) {
  const colors = {
    health: SemanticColors.HEALING,
    gold: SemanticColors.RESOURCE_GOLD,
    mana: SemanticColors.RESOURCE_MANA,
    powerup: SemanticColors.RESOURCE_MANA,
  }
  // ... use these colors for glowing spheres
}
```



## Color + Shape Dual Encoding (colorblind compatible)

Don't **only** use color, combine with shape / brightness / effects:

| Element | Color | Shape | Effect |
|---|---|---|---|
| Healing | Green | Cross / Heart | Floating |
| Attack buff | Red | Sword / Triangle | Rotating |
| Defense buff | Blue | Shield / Square | Still |
| Speed buff | Yellow | Lightning / Wings | Flashing |

Colorblind players still identify via shape. This is why *Overwatch* made healing bottle Green + Cross + Floating.

## Theme Color vs Semantic Color

Game can have "theme tone" (cyberpunk purple-cyan, western orange-yellow), but **semantic color can't change by theme**.

- Western theme + red enemies ✓
- Western theme + change to "sand-yellow enemies" to match theme ✗ → players don't understand

Solution: **Background theme yields to semantic colors**. If enemies must be red, background can't also be red — use contrast color (cyan/blue) for background.

```ts
// Desert driving: background orange-yellow → enemies can't be orange-yellow
// Let BANDIT enemies use red headwrap + brown clothes (red-dominant but brown fits theme)
// Checkpoint use gold (eye-catching but echoes desert)
```



## Anti-patterns

### 1. "Pretty" overrides "function"

Artist makes monster "glowing gold super cool" → player thinks it's reward → collides → dies.
**Fix**: Function first. "Ensure color conveys info correctly, then worry about pretty."

### 2. Color conflicts with culture

Red in West = danger/warning, in China = festive/auspicious.
**Fix**: Game establishes internal semantics. Whole game says "red = enemy," players accept.

### 3. Too many colors

10+ colors → players can't learn them all.
**Fix**: Core semantic slots < 8. Secondary can use brightness variants of existing colors.

### 4. Color changes with environment

Night level: everything turns dark purple → red enemies become dark purple → invisible.
**Fix**: Use emissive / self-glow to keep key elements always bright, unaffected by environment light.

## Related skills

- `skills/game/feel/frame-readability.md` — color is foundation of 1-frame readability
- `skills/craft/silhouette.md` — color + silhouette double safety
- `skills/craft/contrast-hierarchy.md` — color contrast hierarchy
- `skills/craft/affordance-design.md` — color hints at function

## References

- *Color Theory in Game Design* — Mark Brown (GMTK)
- *The Art of Game Design* — Jesse Schell (Lens of Visual Communication)
- *Color and Light* — James Gurney
- *The Designer's Dictionary of Color* — Sean Adams
- *Universal Principles of Design* — Lidwell, Holden, Butler
