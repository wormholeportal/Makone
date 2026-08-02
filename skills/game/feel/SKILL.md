---
name: game-feel
description: Game feel - the moment-to-moment tactile layer: juice, hitstop, coyote time, input buffering, screen shake, telegraphing, camera lead/lag, readability. Use when the rules are right but the game feels mushy, unfair, or flat.
---

# feel/ — the tactile layer

The rules can be correct and the game still feel dead. Feel is what happens in
the 100ms around an input. Pull one page; stacking all nine at once is how a
game turns into a fireworks show.

| page | what it fixes |
|---|---|
| `juicing.md` | actions land flat — stack visual + shake + particles + sound + freeze |
| `hitstop.md` | hits have no weight — freeze motion 50–120ms on impact |
| `coyote-time.md` | jumps feel unfair — allow the jump 100–150ms after leaving the ledge |
| `input-buffering.md` | "I pressed it!" — cache input 100–200ms, fire at the next legal moment |
| `screen-shake.md` | shake reads as noise or nausea — amplitude/frequency/decay/anisotropy/throttle |
| `telegraphing.md` | deaths feel cheap — every threat shows a 0.5–2s windup |
| `frame-readability.md` | one frame doesn't say who's the player, the threat, the goal |
| `camera-lag.md` | the player leaves frame, or is pinned and can't see ahead |
| `destruction-feedback.md` | things break without feeling broken — the full destruction layer stack |
