# Palette and key — choosing a value range and being honest about it

> Applies to **every** world: a scene, a game and an object all have a key.
> (This page used to be written for games only, and referred to a `game/lib`
> toolbox that no longer exists. Both were why it stopped being read.)

## The one decision

Before you place a light, commit to a **key** and write it into `world.json`:

```json
"key": "natural"
```

It is a claim about the **value range**, not the hour: a night scene under a full aurora measures
`natural`, because most of the frame is genuinely bright.

| key | where the pixels sit | the frame's job |
|---|---|---|
| `natural` | across the middle | not crushed, not blown — usually daylight or a lit room |
| `low` | in the bottom, on purpose | **carry a real highlight** — night, deep water, a cellar, space |
| `high` | in the top | hold shape without shadows — snow, fog, a studio |

`verify` measures the rendered frame and reports `luma`; it fails when the picture contradicts the
key. So this is a promise you keep, not a label you apply.

## Why `natural` is the default

Not because bright is prettier. Because **dark is the cheapest fake atmosphere available.**

Turn the lights down and three problems vanish at once: form you did not resolve, materials that
are one flat colour, and detail density you never added. The frame then reads as "moody" when it is
actually just *empty*, and you get the credit for a mood you did not build. Bright daylight has
nowhere to hide — every silhouette, every material and every shadow has to be right — which is
exactly why it is the honest default.

Two symptoms that you took the cheap route:

- your `brief` line contains *dusk / night / rain / neon / lantern / last light* and the subject
  did not require any of them;
- you fixed a blown highlight by **turning the key light down** instead of fixing the material or
  the exposure. That lowers the top without lifting the bottom, and the whole range collapses.

## Going low, properly

`low` is a real choice and some subjects demand it — a hydrothermal vent at 2500 m has no ambient
light, and pretending otherwise is the lie. What you owe in exchange:

1. **A bright focal subject.** Limbo and Inside are near-black and never mud, because there is
   always a lit silhouette. This is the measured `bright` statistic: some of the frame has to be
   genuinely light.
2. **Fill on the shadow side.** Dead black is lazy; dark ≠ mood. A hemisphere light at 0.4–0.6 with
   a *cool* ground colour costs nothing and keeps backlit forms readable.
3. **Something to see the light IN.** Beams, dust, haze, wet ground. A point light in a vacuum
   lights nothing; a point light in a lane of dust is the whole picture.
4. **Restraint on fog.** `FogExp2` above ~0.02 eats the mid-ground and leaves you with near objects
   floating in black. Halve it and re-look.

## Palette families

Pick one and stay inside it. Three main hues maximum, plus neutrals to glue them, plus **one
"scream" hue** — a single saturated accent the eye lands on, which marks the important thing.

| family | hues | good for |
|---|---|---|
| **Candy pop** | `#FF4D8D` pink · `#50E3C2` mint · `#FFD60A` yellow on `#FEF3F8` | arcade, puzzle, casual, children |
| **Neon synth** | `#FF006E` · `#00F5FF` · `#FFEE32` on `#0F0F23` | racing, rhythm, night city — a `low` key with hot accents |
| **Tropical** | `#FF6B35` orange · `#00C2D1` turquoise · `#FFE66D` on `#FFFBF0` | water, sport, summer |
| **Pixel joy** | `#71C5FF` sky · `#6BCB77` grass · `#FFB400` · `#E94560` | platformers, adventures, anything outdoors |
| **Sherbet** | `#6A4C93` · `#FF9F43` · `#FFD93D` clouds `#FFE5F1` | flying, exploring, dusk that is still bright |
| **Earth + ember** | `#8C7458` · `#C9451F` · `#D9A020` on `#2E2317` | souks, forges, interiors lit by fire |

Saturation rules of thumb:

- no primary hue below ~60% saturation in a bright palette — faded reads as tired, not moody;
- background near 95% lightness **or** near 10% with bright accents. Mid-grey kills energy;
- if you need a fourth hue, you probably need a hierarchy instead.

## Implementation, in the three.js this repo actually uses

There is no `PostFX`, no `ProceduralSky`, no `StudioLighting`. Worlds hand-roll their rig. These
are the values the worlds in this repo settled on after looking at the frames:

```js
// ---- natural: an outdoor scene ----
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const sun = new THREE.DirectionalLight(0xffd9a0, 2.3);     // key, warm, casts
scene.add(sun, new THREE.HemisphereLight(0x9fb4e0, 0x2e2a20, 0.85));   // sky/ground fill
scene.fog = new THREE.Fog(0x5a5a6a, 34, 96);               // linear, matched to the horizon

// ---- low: night, interior, underwater ----
renderer.toneMappingExposure = 1.15;                       // lift, do NOT drop the key
scene.add(new THREE.HemisphereLight(0x2e405e, 0x141410, 0.6));   // cool fill, never zero
scene.fog = new THREE.FogExp2(0x0a1526, 0.008);            // gentle; 0.02+ eats the mid-ground
// and then EARN it: emissive accents, a lit silhouette, beams with something in them

// ---- high: snow, overcast, studio ----
renderer.toneMappingExposure = 0.95;                       // headroom, or the whites clip
scene.add(new THREE.HemisphereLight(0xdfe8f5, 0xb9c2cf, 1.4));
const rim = new THREE.DirectionalLight(0xffffff, 0.9);     // shape survives on rim, not shadow
```

A dark background colour is **not** a lighting design: `scene.background = 0x07090e` plus one
point light is a tech demo. Give the sky a gradient (a back-side sphere with a two-colour shader
costs nothing) so the horizon is not a hard line.

## Anti-patterns

- ❌ reaching for night because the subject felt "not atmospheric enough"
- ❌ `HemisphereLight(..., 0.2)` and a black shadow side — dark ≠ mood
- ❌ `FogExp2(dark, 0.03)` in a `low` world — the mid-ground disappears and only the near props read
- ❌ fixing a blown highlight by lowering the key light
- ❌ bloom on a bright scene (docs/principles.md E5 — bright + bloom = white)
- ❌ a flat `scene.background` colour with no sky

## Related

- `skills/world/SKILL.md` step 3 — where the key is committed
- `skills/craft/contrast-hierarchy.md` — where the eye lands once the range is right
- `skills/craft/narrative-light.md` — what the light is *saying*
- `skills/craft/render-recipes.md` — tone mapping / bloom / fog by mood
