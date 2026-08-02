# Narrative light — light tells the story, it doesn't just expose the scene

> **Light doesn't mean "let player see"; it means "guide where player looks."
> Dark = player lost. Dim = direction known. Bright = goal known.
> Light tells the story before dialogue does.**

## One-liner

Lighting is invisible direction.
Player looks where it's brightest, walks toward highlights, fears shadows.
Designer controls player attention entirely through light.

## Why

Human eyes are drawn to:
- Highest brightness (draws attention)
- Highest contrast (signals importance)
- Warm color (safety) vs cool/red (danger)

Games use light for narrative:
- Safe area = warm, even lighting
- Boss entrance = harsh shadow + spot light
- Trap = sudden darkness before danger
- Goal = golden glow

Lighting does in seconds what dialogue takes minutes to say.

## Quantified standards

**Lighting intensity hierarchy**:
- Brightest = player target (100% brightness)
- Medium = traversable (70% brightness)
- Dim = optional (40% brightness)
- Dark = off-limits (< 20% brightness)

**Test**: close eyes, then open. Where do eyes go first? That's your visual hierarchy.

## 4 layers of light design

### 1. Spatial light (where am I?)

Ambient light fills the scene so player can navigate.

✓ Even ambient + one key light = player knows their position
✗ Pitch black = player lost

### 2. Functional light (what can I do?)

Highlights interactive objects.

✓ Button glows warm
✓ Door frame lit bright
✗ All walls same brightness = can't tell doors from walls

### 3. Narrative light (what should I feel?)

Color and mood convey story state.

✓ Safe area = warm yellow light
✓ Horror section = cold blue + harsh shadows
✗ Flat lighting = no emotional weight

### 4. Attention light (where should I go?)

Spotlight or brightest area guides direction.

✓ Golden glow on exit
✓ Beam through doorway toward goal
✗ Multiple equally-bright areas = player confused

## Classic examples

### Resident Evil 4

Tight spotlights create claustrophobia. Shadows hide threats. Sudden brightness = safe room.
Lighting alone conveys "you are being hunted."

### Journey

Golden light guides path. Darkness = danger. Sand glow = emotional crescendo.
Player follows light naturally without markers or UI.

### Half-Life 2

Directional light + shadows create depth. Enemy shadows reveal position before seeing them.
Lighting is core to both navigation and threat communication.

### Dishonored

Shadow = stealth possible. Lit = exposed. Player reads entire encounter from lighting alone.

## Antipatterns

- **Uniform lighting**: everything same brightness → no hierarchy → player lost
- **Too much contrast**: some areas too dark, others too bright → eye strain
- **Mood vs navigation conflict**: spooky dark lighting but player needs to see → frustration
- **Inconsistent lighting**: sometimes bright = danger, sometimes bright = safety → confusion
- **Lighting doesn't match gameplay**: stealth game but everything lit → no hiding spots

## How to implement in Three.js

**1. Directional light for key areas**

```ts
const keyLight = new THREE.DirectionalLight(0xffd89b, 1.5)
keyLight.position.set(5, 10, 7)
keyLight.castShadow = true
// Light and shadow draw attention
```

**2. Ambient for readability**

```ts
const ambient = new THREE.AmbientLight(0xffffff, 0.3)
// Let player navigate without shadows dominating
```

**3. Point lights for interactives**

```ts
const pickup = new THREE.PointLight(0xff9900, 1, 15)
pickup.position.set(0, 1, 0)
// Warm glow signals "take me"
```

**4. Color for narrative**

```ts
// Safe area
ambientLight.color = new THREE.Color(0xffd89b)

// Danger zone
ambientLight.color = new THREE.Color(0x4488ff)
```

## Related skills

- `skills/craft/affordance-design.md` — light highlights affordances
- `skills/craft/silhouette.md` — lighting emphasizes silhouette
- `skills/game/axioms/flow-channel.md` — light guides pacing through level

## References

- Denis Dutton, *The Art Instinct*
- James Gurney, *Color and Light*
- Real-time rendering papers on lighting
- Journey postmortem (Thatgamecompany)
