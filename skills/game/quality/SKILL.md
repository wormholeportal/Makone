---
name: game-quality
description: Pushing a game from "runs" to "good" - concept viability, finding the missing decision when it plays flat, and disproving "this is fun" with playtest evidence. Optional aids, not gates.
---

# quality/ — production quality

Reference for pushing a game from "runs" to "good." These are **optional aids,
not gates** — pull the one that matches the problem in front of you:

- [`market-reality.md`](market-reality.md) — when choosing a concept or
  deciding whether the fantasy has a real audience.
- [`fun-compiler.md`](fun-compiler.md) — when the game runs but plays flat and
  you need to find the missing decision.
- [`skills/craft/performance.md`](../../craft/performance.md)
  — when choosing renderer, lights, postFX, particles, instancing, or assets.
- [`playtest-protocol.md`](playtest-protocol.md) — when you want to disprove
  "this is fun" with evidence instead of hope.

## What "good" means here

Two things, equal weight: it **looks alive** and it **plays well**. Useful
questions to interrogate either one:

1. **Audience pull**: who clicks the first screenshot, and why now?
2. **Aesthetic target**: what feeling should the player get?
3. **Dynamics → Mechanics**: what repeated behavior creates that feeling, and
   what exact rules produce it?
4. **Visual contract**: what Three.js recipe keeps play readable inside budget?
5. **Proof loop**: what playtest evidence shows it's fun, not just pretty?

## The real check

There is no audit script. The check is your eyes and your hands: `node harness/capture.mjs <world>`
and look at the frame, then play it. Fix the single worst thing, capture again,
repeat until it looks alive and plays well. That loop catches everything a
keyword audit never could.
