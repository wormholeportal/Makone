# Coyote time — temporal indulgence for the player

> **Allow jumping within 100-150ms after leaving a platform.
> The player perceives "I didn't fall," but the game is quietly forgiving him.
> A platformer without coyote time always feels like "the controls are broken."**

## One-liner

There's a ~100ms gap between the physics ("feet left the platform") and psychology ("I thought I was still on it").
The game serves psychology, not physics. **Give players a few free frames to jump.**

## Why

The name comes from the classic Looney Tunes scene where Wile E. Coyote runs off a cliff but doesn't fall until he "realizes" it.

This mechanism was standardized by *Celeste* and other modern platformers, but all great platformers since the 1960s have used it implicitly.
*Super Mario Bros.* in 1985 already had ~6 frames (~100ms@60fps) of coyote.

**Human perception has latency**:
- Visual signal to brain: ~100ms
- Decision-making (press Space): ~100-200ms
- Neural signal to fingers: ~50ms
- Total latency from "decide to jump" to "press": 200-350ms

When a player *visually* sees himself at the platform edge, if he presses jump, his feet are already physically gone.
Without coyote time, he falls every time, frustrated: "But I pressed the button!"

## Quantified standards

**Coyote window**:
- 100-150ms (6-9 frames@60fps) = standard
- < 50ms = player can't perceive it, might as well not exist
- > 200ms = player senses "floaty," physics feels wrong

**Test method**:
Player walks to platform edge → spams Space → measure how far he can walk before jumping stops working.
- 1-2 pixels: too strict, add coyote
- 5-10 pixels: just right
- 20+ pixels: too lenient, floaty

**Celeste numbers** (from Maddy Thorson's published data):
- Coyote time: a few frames
- Jump buffering: a few frames
- Wall-jump 2 pixels tolerance (advanced moves) / 5 pixels tolerance (normal)
- Half-gravity at jump apex (extends hang time at the top)

## Good examples

- **Celeste**: coyote + jump buffering + corner correction + half-gravity. The whole game feels "I can make this jump" even when physics would say otherwise.
- **Hollow Knight**: all jumps have coyote + buffer. Boss fights feel responsive even when you're off by a frame.
- **Most Nintendo platformers**: Mario through *Super Mario Odyssey* all have it, they just don't announce it.
- **N++ / Super Meat Boy**: high-precision platformers still use coyote, or they'd be controller-shattering.

## Antipatterns

- **Physics-engine platformers by novice programmers**: check only `isGrounded`, disable jump the instant `isGrounded = false`. Players fall off edges repeatedly, cursing "controls suck."
- **Some *Super Mario 64* ROM hacks with pixel-perfect jumps and no coyote**: the mismatch between in-game control precision and player hardware latency makes them feel broken.
- **VR platformers without coyote**: doubly fatal in VR, because visual latency is already higher.

## How to implement in Makone / Three.js

```js
const COYOTE_TIME = 0.12   // 120ms
let coyoteTimer = 0
let isGrounded = false

function tick(dt) {
  const grounded = checkGrounded()  // your ground detection

  if (grounded) {
    coyoteTimer = COYOTE_TIME  // on ground: reset timer
  } else {
    coyoteTimer -= dt
  }

  if (input.justPressed('Space') && coyoteTimer > 0) {
    jump()
    coyoteTimer = 0  // consume on jump, prevent double-jump
  }
}
```

**Critical points**:
1. Check `coyoteTimer > 0`, not `isGrounded`, to allow jumps
2. Consume `coyoteTimer = 0` immediately after jump to prevent mid-air second jump
3. Decrement timer every frame; timestamp on liftoff is also valid

## Paired technique: Jump Buffering

Coyote's mirror: player presses Space **before** landing (100-150ms early), and jumps automatically on landing.

```js
const JUMP_BUFFER = 0.12
let bufferTimer = 0

function tick(dt) {
  if (input.justPressed('Space')) bufferTimer = JUMP_BUFFER
  else bufferTimer -= dt

  if ((grounded || coyoteTimer > 0) && bufferTimer > 0) {
    jump()
    bufferTimer = 0
  }
}
```

**These two mechanisms must work together**:
- Coyote = player thinks he's on ground, but actually left 100ms ago
- Buffer = player thinks he just pressed jump, but actually pressed 100ms early
- Combined: perceived "ground/liftoff" window is 250ms wide, physics unchanged

## Generalization: all "edge" actions need tolerance windows

The essence of coyote time is **"enlarge success windows because human perception has latency"**. This principle extends to:

| Action | Standard window |
|---|---|
| Jump (leaving platform) | Coyote 100-150ms |
| Jump (press before landing) | Buffer 100-150ms |
| Attack (hit detection before/after) | Hitbox slightly larger than visual / slightly after animation |
| Dodge (invincibility frames) | 50ms grace before start + 50ms grace after end |
| Platform landing (jump one square over) | Snap inward 1-2 pixels on landing |
| Wall grab (wall-slide) | Grab if within 2-5 pixels of wall (Celeste data) |
| Corner jump (bonk and bounce) | 5-pixel offset auto-lets you pass (Celeste corner correction) |

## Cultural meaning

Coyote time is the flagship of **humanistic game design**:
games serve **human perception and decision-making**, not the other way around.
Designers who ignore coyote time typically believe "players should play precisely" — they're building exams, not toys.

## Related skills

- `skills/game/feel/input-buffering.md` — The flip side of jump buffering
- `skills/game/axioms/feedback-latency.md` — Feedback has the same physical latency
- `skills/game/axioms/retry-latency.md` — Even without coyote, fail fast and respawn quick
- `skills/game/axioms/flow-channel.md` — Tolerance windows keep flow unbroken

## References

- Maddy Thorson, *Celeste & Forgiveness* (Medium, 2020)
- Mark Brown, *Why Does Celeste Feel So Good to Play?* (GMTK 2018)
- Steve Swink, *Game Feel*
- Looney Tunes (Wile E. Coyote, cultural archetype)
