# Diagnosing the "blank canvas, only HUD shows" failure

## The signature symptom

You open the scene. The DOM HUD elements (title, hint text, hunger bar, score
counter) are visible at the corners of the screen — but the central canvas
area is **pure white / off-white / page-background color**. Not black, not
the sky color you set. Just the empty document background.

The user's screenshot will look like this:

```
┌──────────────────────────────────────────────────┐
│  TITLE                              SCORE        │
│  subtitle                                        │
│  ▓▓▓▓▓▓▓▓ resource bar                          │
│                                                  │
│                                                  │
│         (the canvas area is blank,               │
│          showing only the page background)       │
│                                                  │
│                                                  │
│       hint text · controls · etc.                │
└──────────────────────────────────────────────────┘
```

This is **distinct** from:
- "Black canvas" → renderer ran but scene.background is dark or unset
- "White flash / washed out" → bloom-hygiene violation (see `skills/craft/render-recipes.md`)
- "Stuck on loading screen" → async import never resolved

## What's actually happening

**The canvas is attached to the DOM, but `renderer.render()` was never called
even once.** WebGL canvas defaults to transparent; a transparent canvas
shows the page background through it.

The HUD is plain HTML/CSS, so it renders independently — that's why it
still appears even when the WebGL pipeline is dead.

## The 3 root causes (in order of frequency)

### 1. The animation loop body threw synchronously on the first frame

`loop()` is defined and called at the bottom of `createScene`. Its first
iteration runs system updates (input, physics, AI, camera, shake) and
THEN calls `renderer.render()` (or `composer.render()` / `fx.render()`).

If **any** system update throws, execution unwinds out of `loop()` and the
render call never happens. `requestAnimationFrame(loop)` was already
queued at the top of the iteration, but on the next frame the same throw
happens again — infinite blank.

**Most common culprits inside the first frame:**

- **Primitive constructor arg-shape mismatch**. `new ScreenShake(camera)`
  vs `new ScreenShake({ camera })`. If the primitive stores
  `this.camera = arg` and then does `this.basePos.copy(this.camera.position)`,
  the wrapped-object version reads `undefined.position` → TypeError.
  Identical-looking code, silent at construction, dies on first `.tick()`.
- **Undefined mesh part referenced in animation**. `hero.parts.armR.rotation.x`
  works only if you actually built `parts.armR`. A typo (`armRr`) succeeds at
  construction but crashes the first time you animate it.
- **`getDelta()` returning huge dt** that overflows a clamp or array index.
  Rare, but happens when `clock.start()` was skipped and the first delta
  is the time-since-page-load.

### 2. The renderer was never actually appended to the DOM

`container.appendChild(renderer.domElement)` was conditionalized, skipped,
or run before `container` was a real element. The render call succeeds
silently; you just can't see the result because there's no canvas.

Check: does `container.querySelector('canvas')` find anything?

### 3. The canvas was appended but has zero size

`renderer.setSize(container.clientWidth, container.clientHeight)` was called
when the container hadn't been laid out yet (display: none, height: 0,
React mounted before CSS applied). The canvas is 0×0; render runs but
paints nothing.

Check: `canvas.width` and `canvas.height` — both should be > 0.

## The 60-second diagnosis recipe

1. **Open browser devtools console.** If there's a red error, stop reading
   this — fix that. The error stack trace will name the culprit.

2. **If console is clean**, run this in the console:

   ```js
   const c = document.querySelector('canvas')
   console.log({
     exists: !!c,
     w: c?.width, h: c?.height,
     ctx: c?.getContext('webgl2') ? 'gl2' : c?.getContext('webgl') ? 'gl1' : 'none',
     parent: c?.parentElement?.tagName,
   })
   ```

   - `exists: false` → root cause #2 (renderer not appended)
   - `w: 0, h: 0` → root cause #3 (container zero-sized)
   - `exists: true, w/h > 0` → root cause #1 (loop crashing). Continue.

3. **For root cause #1**, dynamically re-import the scene and capture the
   error:

   ```js
   (async () => {
     const mod = await import('/worlds/<scene>.js?t=' + Date.now())
     const div = document.createElement('div')
     div.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99999'
     document.body.appendChild(div)
     try { await mod.default(div) }
     catch (e) { console.error('SCENE FAILED:', e); console.error(e.stack) }
   })()
   ```

   The stack trace will name the file:line:column. Read 3 lines above and
   below that line in the source.

## Why this fails silently

Three independent properties stack:
1. WebGL canvas with no draws is **transparent**, not "default-color".
2. The page background shows through transparency.
3. The HUD is **DOM, not WebGL** — it survives a dead render pipeline.

Result: the user sees a "page" that looks half-correct (chrome is
there) but content is missing. There's no error dialog, no flashing
"WebGL Error" banner. Just a serene white void.

## Prevention

### Always verify primitive constructor signatures before calling

When importing a shared runtime primitive (v2: `runtime/`), check ONE other world
that uses it. If `worlds/*.js` show 9 scenes calling `new Foo(arg)` and
you wrote `new Foo({ arg })`, you're the wrong one.

```bash
grep -n "new ScreenShake" worlds/*.js | head -5
```

This is a 5-second check. Skipping it cost ~20 minutes in the
adventure-island incident.

### Wrap your loop body in a one-shot try/catch around the FIRST iteration

If you're paranoid (or shipping):

```js
let firstFrameOk = false
function loop() {
  raf = requestAnimationFrame(loop)
  if (!firstFrameOk) {
    try { updateAll(dt); fx.render(dt); firstFrameOk = true }
    catch (e) {
      console.error('[scene] first-frame error — disabling loop', e)
      cancelAnimationFrame(raf)
      // Show a fallback overlay so the user sees SOMETHING is wrong
      const o = document.createElement('div')
      o.style.cssText = 'position:absolute;inset:0;background:#400;color:#fff;padding:24px;font:600 14px monospace'
      o.textContent = 'Scene failed: ' + e.message
      container.appendChild(o)
      return
    }
  } else {
    updateAll(dt); fx.render(dt)
  }
}
```

Optional — most scenes don't need it. But for shipped builds it converts
the "serene white void" into "obvious red error block", which is
infinitely more debuggable for users.

### Render at least once BEFORE the loop starts

Trivial change with high payoff:

```js
fx.render(0)   // initial paint — even if loop crashes, user sees the scene
loop()         // then start the animation
```

If `fx.render(0)` itself throws, you find out before the user does.

## See also

- `skills/three/update-order.md` — the canonical order
  (input → physics → AI → camera → shake → render) and why ordering bugs
  are common.
- `skills/craft/render-recipes.md` — the *opposite*
  problem (over-rendered → white screen via bloom + bright sky).
