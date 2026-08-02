# Frame readability — one frame must answer who, what, and what will hurt me

> **From any single frame of gameplay (including screenshots), you must be able to identify within 50ms:
> Who is the player, who is the enemy, what is the objective, what will hurt me, what will save me.
> Games where players can't see this end up with "died for no reason."**

## One-liner

Games are not reading comprehension. In 60fps combat, each object is visible for only 16ms.
If a pixel / shape / color can't convey function in that 16ms, it shouldn't appear.

## Why

How fast the brain processes vision:
- Shape recognition: **< 13ms** (MIT research)
- Color recognition: < 20ms
- Complex object recognition (with memory): 100-200ms

Games require the player to **simultaneously** track multiple objects (multiple enemies + multiple bullets + items + self).
Each object gets only tens of milliseconds.

If enemies and friendlies look similar, players shoot friendlies first;
If items and decoration look similar, players miss items;
If deadly traps and terrain look similar, players "die for no reason" — actually the designer failed to show them.

## Quantified standards

**Silhouette test**: compress all objects to pure black silhouettes, can you distinguish them?
- Player vs Enemy: must have **completely different silhouettes** (tall / short / wide / narrow / pointed / round / protruding parts)
- Enemy vs Enemy: different types have different silhouettes (small = sphere, heavy = cube)
- Item vs Decoration: decoration static, items have effects / floating / glow

**Screenshot test**: random screenshot, ask someone who hasn't played: "Who will win?"
- Can answer → visual communication passes
- "Can't tell" → must redesign

**Colorblind test**: view screenshot with red-green colorblind filter (available in most design tools). Are critical details still distinguishable?
- 7% of males are colorblind. If you only use red/green to distinguish factions, they can't play.

## Three-layer structure

Visual information from near to far should have clear hierarchy:

1. **Key actors (player / enemy / Boss)**: largest, brightest, most vivid, unique silhouette
2. **Interactable objects (items / switches / traps)**: medium brightness, has effects / rim lighting
3. **Background / Decoration**: low contrast, grayscale, unobtrusive, static

**Reverse test**: squint at the image, key elements still stand out, decoration blends into background → correct.

## Good examples

- **Pac-Man**: yellow circle = player, 4 different-colored ghosts = enemies, white dots = food, large white dot = power-up. 3 object types, 3 distinct shapes+colors, never confused.
- **Slay the Spire**: each enemy has a clear "next move" intention icon (sword / shield / buff) overhead. New players instantly understand.
- **Super Mario Bros**: Mario red-blue, Goomba brown, Koopa green, coin gold. Silhouette, color, behavior differentiated to the extreme.
- **DOOM**: each demon type has a unique silhouette. Imp is a skinny fireball-thrower, Cacodemon is a flying ball, Pinky is a charging pig. One glance and you know.
- **Among Us**: crewmembers are one color (player-selected), task points yellow-lit, bodies have distinct shape. Minimal but clear.

## Bad examples

- **Realistic-style games with fog combat**: player can't tell NPC from enemy.
- **Some MMO raids**: 30 players + 30 monsters + 30 buff icons + pile of ground AOEs → screen filled with effects, can't see anything.
- **Color-monotone level design**: trap is gray spikes, ground is also gray → players only learn by stepping on it.
- **MMORPG decoration overload**: chests mixed into tree leaves, NPCs mixed into bystanders.

## Tools & Techniques

**1. Color coding (see skills/craft/color-grammar.md)**

| Category | Recommended Color | Psychology |
|---|---|---|
| Player | Blue / White / Theme color | "That's me" |
| Ally | Blue / Green | Alliance |
| Neutral NPC | Yellow / Brown | Uncertain |
| Enemy | Red / Purple | Danger |
| Boss | Dark red / Black | More danger |
| Objective / Reward | Gold / Bright yellow | Desirable |
| Healing | Green | Safety |
| Trap / Hazard | Red / Orange / Flashing | Warning |

**2. Rim Light**

Use rim lighting on interactable objects to make them pop from background.

```js
// Shader trick: rim light
const rimMat = new THREE.MeshStandardMaterial({
  color: 0x444444,
  emissive: 0xffcc00,
  emissiveIntensity: 0.3,
})
// Or use EdgesGeometry + LineBasicMaterial to add bright outline
```

**3. Floating / Rotation**

```js
// Item floating + rotation → brain naturally recognizes "not terrain"
function tick(t) {
  item.position.y = baseY + Math.sin(t * 2) * 0.2
  item.rotation.y += dt * 1.5
}
```

**4. Size differentiation**

Player / Enemy / Boss should have at least 2x size differences.
Items at least 0.3x (won't dominate).

**5. Shadow / Highlight contrast**

Important elements use reverse lighting (dark background → bright object, bright background → dark object).

## Specific techniques for Three.js implementation

**Emissive + Bloom makes key elements glow**

```js
// Item self-luminous, bloom makes it "float" out of scene
const itemMat = new THREE.MeshStandardMaterial({
  color: 0xffcc44,
  emissive: 0xffaa22,
  emissiveIntensity: 1.5,  // high emissive = very bright in bloom
})
```

**Outline pass adds edge highlight to important objects**

```js
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
const outline = new OutlinePass(...)
outline.selectedObjects = [enemy1, enemy2, importantItem]
outline.edgeColor.setHex(0xff0000)  // red edge for enemies
```

**Decals / Marker annotate ground danger zones**

```js
// AOE warning circle
const warning = new THREE.Mesh(
  new THREE.RingGeometry(2, 2.2, 32),
  new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 })
)
warning.rotation.x = -Math.PI / 2
warning.position.copy(aoeCenter)
// Player has 2 seconds to dodge
```

**Contrasting background colors**

If enemies are red, don't make the level red walls and floor. Need gray / blue / green background to make red enemies pop.

## Anti-pattern: excessive detail

Novice designers often do this: make every mesh extremely polished, result: **everything is polished** → key elements get buried.

Correct approach:
- Player is most detailed (the player sees themselves)
- Important enemies very detailed
- Regular enemies medium detail
- Decoration **intentionally low-fidelity** (fewer polygons, darker color)

This is why *Hades* has ultra-detailed character portraits but intentionally simplified backgrounds — makes characters stand out.

## Testing checklist

Before releasing each level, self-check:

- [ ] Screenshot lets a stranger identify the player in 5 seconds
- [ ] Enemies visually distinct from allies / decoration
- [ ] Items have effects (floating, rotating, glowing)
- [ ] Deadly traps have red / warning mark / visible shape
- [ ] Colorblind filter doesn't obscure critical info
- [ ] Far elements blend into background, near elements pop out
- [ ] Boss visually clearly larger / more detailed / more threatening than minions

## Related skills

- `skills/craft/color-grammar.md` — color semantics system
- `skills/craft/silhouette.md` — silhouette test
- `skills/craft/contrast-hierarchy.md` — contrast hierarchy
- `skills/craft/affordance-design.md` — looks like you can do it, so you can

## References

- *MIT Picture Recognition* research (13ms shape recognition)
- Don Norman, *The Design of Everyday Things*
- Scott Rogers, *Level Up!: The Guide to Great Video Game Design*
- Nintendo internal "3-meter test" guideline
- *Hearthstone* visual design GDC talk
