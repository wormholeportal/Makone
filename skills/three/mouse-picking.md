# 3D mouse interaction — click-vs-drag, hover, item-targeting

> Any Three.js scene with both **camera control by mouse** AND **clickable
> objects in the scene** must distinguish "the user is clicking" from
> "the user is dragging the camera". Get this wrong and clicks silently
> disappear, leaving the player thinking the game is broken.
>
> This is the #1 reason 3D scene games get reported as "I can't interact
> with anything."

## The conflict

In a 3D scene with both orbit camera AND clickable objects:
- `pointerdown` could be the start of an orbit-drag
- `pointerdown` could be the start of a click
- The browser does NOT distinguish — both are the same event

Your code must decide by examining what happens between `pointerdown`
and `pointerup`.

## The naive (wrong) attempt

```js
let dragging = false
function onPointerDown() { dragging = true }
function onPointerMove(e) {
  if (dragging) orbit.rotate(e.movementX, e.movementY)
}
function onPointerUp(e) {
  if (dragging && totalMovementWasZero) handleClick(e)
  dragging = false
}
```

Two problems:
1. **"Zero movement" rarely happens.** Natural cursor jitter during a
   click is 1-5 pixels. Treating any movement as a drag silently swallows
   most clicks.
2. **The camera orbits during click attempts.** Even before the user has
   committed to dragging, every micro-movement rotates the camera. Players
   see the camera "twitch" whenever they try to click.

## The correct pattern: drag-commit threshold

```js
const DRAG_COMMIT_PX = 8   // pixels of cumulative movement before "committing" to drag

let dragging = false
let dragDelta = 0
let dragCommitted = false
let dragStart = null

function onPointerDown(e) {
  dragging = true
  dragDelta = 0
  dragCommitted = false
  dragStart = { x: e.clientX, y: e.clientY }
}

function onPointerMove(e) {
  if (!dragging) {
    // Pure hover when no button held
    updateHover(e)
    return
  }
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  dragDelta += Math.abs(dx) + Math.abs(dy)
  if (dragCommitted || dragDelta > DRAG_COMMIT_PX) {
    if (!dragCommitted) dragCommitted = true
    orbit.rotate(-dx * sensitivity, -dy * sensitivity)
  }
  dragStart.x = e.clientX
  dragStart.y = e.clientY
}

function onPointerUp(e) {
  if (!dragging) return
  const wasClick = !dragCommitted
  dragging = false
  if (wasClick) handleClick(e)
}
```

### Why this works

1. **Below the threshold, the camera doesn't move.** Players see "click"
   feedback unambiguously.
2. **Above the threshold, the orbit takes over and click is canceled.**
   Players see "drag" feedback unambiguously.
3. The threshold (~8 pixels) is large enough to ignore jitter but small
   enough that intentional drags feel responsive.

### Recommended threshold

- **8 pixels** total cumulative movement is a battle-tested value.
- Lower (4-5) starts swallowing intentional clicks.
- Higher (15+) makes drags feel sluggish to start.

## Hover state pattern

Hover detection runs on `pointermove` when NOT dragging. The hover state
should be cached and only re-checked on actual mouse movement, not every
frame:

```js
let hoveredId = null
function updateHover(e) {
  const picked = raycast(e)
  const newId = picked ? picked.id : null
  if (newId === hoveredId) return    // no change — skip work
  hoveredId = newId
  showHoverUI(newId)
}
```

## Inventory + targeting pattern

When the player has items they can "use on" scene objects, two patterns
work:

### Pattern A: select-then-target (recommended for keyboard/mouse)

```
1. Player clicks inventory slot → that item becomes "active" (visual highlight)
2. Player clicks a scene object → if active item is valid for target, use it
3. Otherwise → trigger the no-item interaction (inspect, open, etc.)
```

Pros: works without drag mechanics; clear visual state of "what's held"
Cons: requires two clicks per use

### Pattern B: drag-and-drop (touch / VR feel)

```
1. Player drags item from inventory slot
2. While dragging, a ghost follows the cursor
3. Drop on scene object → use
```

Pros: feels physical
Cons: harder to implement correctly with 3D raycasting; conflicts with orbit

**For desktop 3D puzzle games, pattern A is almost always the right call.**

## Reject double-trigger by structuring as if/return chain

A common bug pattern: same click triggers TWO actions because handler
fell through:

```js
function handleClick(role) {
  if (role === 'box' && opened && itemInside.visible) {
    // pickup item ...
  }
  if (role === 'box') {
    openPanel()   // ⚠️ runs even when we just picked up an item!
  }
}
```

Always `return` from each branch:

```js
function handleClick(role) {
  if (role === 'box') {
    if (opened && itemInside.visible && clickedItem(picked)) {
      pickup(); return
    }
    openPanel(); return
  }
  if (role === 'jar') { ... return }
}
```

## Panel-open guard

When a UI panel (modal, combination lock UI) is open, the 3D scene should
NOT process clicks. Otherwise clicking through a transparent panel area
triggers scene interactions you didn't see.

```js
function onPointerDown(e) {
  if (panelIsOpen()) return    // ← scene input is gated by UI state
  dragging = true
  ...
}
```

## Interactables must not be GEOMETRICALLY HIDDEN inside other meshes

When an interactable rests "inside" a container (a tool in a box, a coin
on a table), make sure the interactable's geometry **does not occupy the
same volume** as the container body. The raycaster will hit the container
first (or report ambiguous intersections), and your "pickup" click won't
register as the tool — it'll register as the container.

```js
// ❌ WRONG — tool is INSIDE the box body's volume
boxBody.position.y = 0.35      // body spans y=[0, 0.7]
tool.position.y = 0.36         // tool is inside the body — clicks hit body
// ✅ RIGHT — tool sits ABOVE the body
tool.position.y = 0.72         // tool is above the body top
```

Visually, both look like "the tool is in the box" because the box has
walls and a lid framing it. Geometrically, only the second one lets
clicks reach the tool.

### Visual indicator: emissive on interactables

Pair the geometric fix with an emissive boost on small interactables
inside dim containers:

```js
// The tool is small and partially hidden in shadow → make it pop
tool.material = makeBrassEmissive(0.6)  // glows under PostFX bloom
```

This solves both "the player can't see it" and "the player doesn't know
it's interactable".

## Hover affordance — always provide ONE of these

If a clickable object doesn't visually respond to hover, players don't
know it's clickable. Pick one (or both):

1. **Scale boost on hover** — `obj.scale.set(1.04, 1.04, 1.04)` is enough
   to read as "this is interactive" without being garish.
2. **Cursor change** — `canvas.style.cursor = hovered ? 'pointer' : 'default'`
3. **(Optional) Emissive boost** — slight brightness increase, requires
   walking the mesh tree to mutate materials. More work, more polish.

Without hover affordance, the player must hunt-and-peck-click everywhere
to find interactables. Frustrating in dim/dense scenes.

## Quick checklist for any 3D scene with mouse interaction

- ☐ Drag-commit threshold ~8 pixels
- ☐ Orbit doesn't start moving until commit
- ☐ Hover only updates on movement (not per-frame)
- ☐ Hover state cached; UI redraw skipped on no-change
- ☐ **Hover provides visual affordance (scale, cursor, or emissive)**
- ☐ Click handler has `return` after each branch (no double-trigger)
- ☐ Scene clicks gated by `if (panelOpen) return`
- ☐ Click cooldowns either not used, or properly ticked per frame
- ☐ Inventory uses select-then-target (not drag-drop) for desktop
- ☐ **Interactables are NOT geometrically inside container bodies**
- ☐ **Small interactables in dim scenes carry emissive boost for visibility**

Run this checklist before shipping any 3D scene with both camera control
and clickable objects.
