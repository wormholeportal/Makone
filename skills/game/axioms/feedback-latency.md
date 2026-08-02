# Feedback latency — 100ms is the hard limit

> **Latency from keypress to any screen/speaker/controller change must be < 100ms.
> Beyond 100ms players perceive "lag"; beyond 250ms "broken"; beyond 500ms they give up.**

## One sentence

The human brain's window for perceiving "I acted → world responded" is about 100ms.
Miss it and players blame the game, not themselves.

## Why

This is a hard constraint from human factors and neuroscience, not game design preference.

- **<10ms**: perceived as instant, imperceptible lag (target for wireless mice)
- **~50ms**: perceived as "snappy," but sensitive players notice (competitive FPS target)
- **~100ms**: causality still clear, but "sluggish" feeling begins
- **~250ms**: lower bound of conscious reaction time. Players start "waiting" for feedback, rhythm breaks
- **>500ms**: players assume input dropped, mash the button, causing ghost inputs and missed walls

Games are not Word, not websites. Players perceive every 16.7ms on 60Hz screens.
One-second latency is ignorable online; it is disaster in games.

## Quantified criteria

Break "press button" into three phases, each with its own budget:

| Phase | Budget | Notes |
|---|---|---|
| **Input detection** (keydown → state change) | < 16ms | read within one frame |
| **First-frame feedback** (animation startup / particle / flash / sound) | < 50ms | before full action plays, tell player "received" |
| **Full action completion** | < 250ms | swing to impact / jump to peak |

**Key trick**: full actions can be slow (heavy attack hits at 800ms) but **startup feedback** must happen in 50ms.
Concretely: on frame 0, play anticipation + sound + screen twitch.
Player perceives not "pressed for 800ms before moving" but "pressed, immediately started, heavy swing takes 800ms to land."

## Success cases

- **Hollow Knight** slash: startup frame flashes sword, plays sound, screen twitches. Hitstop on impact. Whole swing 0.3s but every frame has feedback.
- **Fighting games** universally: startup 1–3 frames (17–50ms) announces the move to opponent. Miss this window and you get hit.
- **Doom Eternal** weapon switch: gun change animation < 100ms, player never feels the swap cost.
- **Celeste** death: respawn at checkpoint 0.3s after death. Player no time to feel sad before retrying.

## Failure cases

- **Early online games** universally: movement 200–500ms latency (network-dependent). Players call it "floaty."
- **UE/Unity default Input.GetKey() in FixedUpdate**: FixedUpdate 50Hz = worst case 20ms latency. Competitive games must read input in Update, forward to physics.
- **Any vsync + triple-buffered game**: can introduce 50ms+ input latency (one render frame + two buffer frames).
- **Menu clicks without instant visual feedback** (button not darkened / no sound): users double-click causing bugs.

## How to implement in Three.js / Makone

**1. Read input in `requestAnimationFrame`, not `setInterval`**

```js
// ✓ good
const keys = new Map()
window.addEventListener('keydown', e => keys.set(e.code, true))
function tick(now) {
  if (keys.get('Space')) attack()  // immediate
  requestAnimationFrame(tick)
}
```

**2. Input handling → physics setLinvel completes in same frame**

GameRuntime already does this: `_updateController` called before `physics.step`.
But ensure setLinvel uses fresh input, not cached from previous frame.

**3. Startup feedback on frame 0 (same frame)**

```js
// Moment attack key is pressed:
function attack() {
  player.state = 'attacking'
  // Even if impact doesn't come until frame 12, do this at frame 0:
  spawnSpark(player.pos)              // weapon flash
  audio.play('whoosh')                // startup sound
  screenShake(0.1, 80)                // micro-twitch
  player.mesh.scale.y = 1.15          // stretch one frame
}
```

**4. Use `pointerdown` not `click`**

`click` fires on mouseup, 100–300ms delayed.
`pointerdown` fires on press.

```js
// ✗ slow
canvas.addEventListener('click', handleAttack)
// ✓ fast
canvas.addEventListener('pointerdown', handleAttack)
```

**5. Don't gate next input on animation completion**

Novice trap: "wait for animation."
Correct: accept next input immediately after animation starts (can interrupt, queue, etc).
See `skills/game/feel/input-buffering.md`.

## Test method

Record gameplay, frame-analyze (OBS 60fps → DaVinci Resolve slow-mo):
- Count frames from keydown to first visible screen change
- < 3 frames (50ms) = excellent
- 3–6 frames (50–100ms) = acceptable
- > 6 frames (100ms+) = must fix

## Related skills

- `skills/game/axioms/core-loop.md` — core verb must have instant feedback
- `skills/game/feel/juicing.md` — concrete satisfying-feedback techniques
- `skills/game/feel/input-buffering.md` — let players hit without perfect timing
- `skills/game/feel/hitstop.md` — extend visual feedback on impact

## Sources

- Raph Koster, *A Theory of Fun*
- Steve Swink, *Game Feel* (especially Input Layer chapter)
- Jakob Nielsen, *Response Times: The 3 Important Limits* (HCI classic)
- Mark Brown, *Why Does Celeste Feel So Good to Play?* (GMTK 2018)
