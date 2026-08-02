# Contrast hierarchy — visual hierarchy is the allocation of contrast

> **Important elements must have highest contrast. Secondary elements medium contrast. Decoration low contrast.
> Everything same contrast = player's eye doesn't know where to look = design failure.**

## One-liner

Design isn't piling up "everything looks good," it's **allocating attention**.
The most important 5% you want player to see must be pushed to eye level with contrast; remaining 95% must **actively retreat**.

## Why

Human eye is attention tool, not equal scanner.
Contrast (value, color, size, motion, isolation) = visual syntax.
High-contrast elements get **automatically** noticed (no conscious effort), low-contrast elements **automatically** ignored.

Game designer has two levers:
- **Raise something** → player will see
- **Lower something** → player will ignore

Visual success whole game = right lever allocation.

## 5 contrast dimensions

Each creates hierarchy:

### 1. Value Contrast

Strongest contrast dimension. Eye most sensitive to value difference.

```
Dark background + bright character = character pops
Bright background + dark character = character pops
Background-character value similar = character invisible
```

**Rule**: Important element value ≠ background value, gap at least 30%.

### 2. Hue Contrast

Complementary strongest (red vs green, blue vs orange, yellow vs purple).
Same hue contrast weak (red vs red-orange).

```
Cool background + warm character = character jumps out (red hero on blue street)
```

### 3. Saturation Contrast

Gray background + vivid foreground = foreground pops
Vivid full screen = all fighting for attention

**Rule**: Background **desaturate** (gray tone), key elements **saturate**.

### 4. Size Contrast

Large objects seen first.
**Boss > elite > normal enemy** must differ in size.

### 5. Motion Contrast

Moving object in still background seen first.
**Key NPC subtle motion, NPC background completely still** → vision naturally leads to key NPC.

## Classic example: MOBA hero select screen

10+ hero characters in a row. How to make player see your hero ("protagonist") first?

- Protagonist center (composition) + 1.2x bigger (size) + full-color body (saturation) + other heroes half-transparent gray (value+saturation) + slight breathing motion (motion)

All 5 contrasts at once = protagonist 100% steals show.

## Classic example: Limbo

Entire game only black + white + gray + minimal silhouette difference.
Story tension from **minimal contrast carrying maximum info**:

- One black boy silhouette = player
- Black environment + boy slightly brighter = visible
- Key traps (spider, saw) one stop **brighter than boy** = always see threat first

Minimalist contrast use, but perfectly correct.

## Classic example: Hades

- **Protagonist Zagreus** full body glow + high saturation (red-blue)
- **Weapons and abilities**: high saturation glowing effects
- **Enemies**: medium saturation, gray-purple tone
- **Background**: desaturated, deep purple-blue (hell theme)

Clear visual hierarchy: player always sees self first → then enemies → background just atmosphere.

## Antipatterns

- **Early MMO full-screen effects**: skills, enemies, UI, buffs, items, all high saturation + high contrast → player can't see anything.
- **Beginner "everything pretty"**: every object finely detailed → protagonist drowned in decoration.
- **Realistic puzzle game**: key looks like other table objects → player can't find.
- **Cluttered UI**: every button primary color → player doesn't know which is main action.

## 5-tier visual hierarchy (for game levels)

```
Tier 1 — Player self          [highest contrast, always pop]
Tier 2 — Current enemy / goal  [second-highest contrast]
Tier 3 — Interactive (items, switches, NPCs)  [medium contrast + affordance]
Tier 4 — Level geometry (floor, walls)        [low contrast, primary]
Tier 5 — Decoration / distant                 [very low contrast, blend]
```

Each Tier should have 30%+ contrast gap.

Test method: **squint** at scene (or scale to 10%). Which elements still clear?
- Clear elements = current hierarchy
- Compare to intent → adjust contrast

## Implementation in Three.js / Makone

**1. Give protagonist self-emission**

```ts
const playerMat = new THREE.MeshStandardMaterial({
  color: PLAYER_COLOR,
  emissive: PLAYER_COLOR,
  emissiveIntensity: 0.3,  // self-emissive keeps player bright in shadow
})
```

**2. Give enemies rim light**

```ts
// player in dark, enemy in shadow
// use emissive to keep enemy contour clear
const enemyMat = M(ENEMY_COLOR, {
  emissive: ENEMY_COLOR,
  emissiveIntensity: 0.2,
})
```

**3. Decorations use vertex color + desaturate**

```ts
// grass, walls, these "background"
const decorMat = M(0x6a5a4a, { roughness: 0.95 })  // dark + desaturated
```

**4. Important NPCs use OutlinePass**

```ts
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'

const outline = new OutlinePass(...)
outline.selectedObjects = importantNPCs
outline.edgeColor.setHex(0xffcc00)  // yellow edge
outline.edgeStrength = 3
```

**5. Key objects use Bloom**

```ts
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// Only objects with emissive > threshold bloom
const bloom = new UnrealBloomPass(size, 0.4, 0.5, 0.85)
// threshold 0.85 = only emissiveIntensity > ~0.85 blooms
// → items self-emit, decoration doesn't → items auto-pop via bloom
```

**6. Depth of field (DOF) blur background**

```ts
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'

const dof = new BokehPass(scene, camera, {
  focus: 10,    // focal distance: player distance
  aperture: 0.025,
  maxblur: 0.01,
})
// player distance sharp, far naturally blurry → distant contrast lowers
```

## Antipatterns

### 1. Egalitarianism

"Every mesh as polished as possible" → no hierarchy → visual chaos.
**Correct**: protagonist 100% detail, enemies 80%, items 70%, background 30%.

### 2. Everything glowing

Full screen emissive + bloom → everything equally bright → lose hierarchy.
**Correct**: only "important" glows. More = less.

### 3. High saturation full screen

Cyberpunk theme everything vivid → player eye fatigue.
**Correct**: 80% desaturated (cold night), key 20% vivid (neon).

### 4. Camera no contrast

Top-down + all objects flat → no depth hierarchy.
**Correct**: perspective angle + near large far small + near sharp far blurry → natural hierarchy.

### 5. Everything moving

Full screen particles + drifting decoration + spinning UI → visual overload.
**Correct**: background still, foreground subtle motion, key objects obvious.

## Design checklist

- [ ] Squint → player still locate protagonist?
- [ ] Screenshot 10% scale → main threats still identifiable?
- [ ] 5-second glance → important NPC icon first visible?
- [ ] Combat full screen effects → player health bar still clear?
- [ ] Level far view → path hint (exit) brightest?

## Related skills

- `skills/game/feel/frame-readability.md` — hierarchy is foundation of 1-frame readability
- `skills/craft/color-grammar.md` — color one contrast dimension
- `skills/craft/silhouette.md` — silhouette also contrast
- `skills/craft/affordance-design.md` — important interactive objects use high contrast

## References

- *Color and Light* — James Gurney
- *Framed Ink* — Marcos Mateu-Mestre (composition and contrast)
- *The Art of Game Design* — Jesse Schell
- Pixar internal staging training (multiple Animator's Survival Kit references)
- *Real-Time Rendering* — technical chapters on bloom / depth-of-field
