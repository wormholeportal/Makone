# Camera-movement coupling — the snap-turn / orbit-cam incompatibility

## The axiom

> **A camera that rotates with the player must NOT follow a player whose
> facing snaps to discrete angles. The mismatch creates motion sickness
> within seconds.**

This applies regardless of engine, era, or genre. Pac-Man (1980), Bomberman,
FC Battle City, Zelda 1, Frogger, Wario Land, Hotline Miami — none of them
use a "third-person chase" camera, even where one would seem natural. The
axiom is older than 3D.

## What "snap-turn" means

Player facing is constrained to a small finite set of angles (typically
4-dir: ±X, ±Z) and transitions between them in a single frame. The input
"press right while facing up" produces an instant 90° heading change.

Contrast with **continuous-turn** movement (cars, planes, twin-stick
shooters with analog input): facing changes smoothly at a bounded rate
(degrees per second), giving the camera time to follow.

## Why it breaks

A "follow camera" derives its orientation from `player.facing`:

```js
const fwd = vecFromAngle(player.facing)
camera.position = player.pos.sub(fwd.scale(7)).add(up.scale(4))
camera.lookAt(player.pos.add(fwd.scale(6)))
```

When `player.facing` snaps 90° in one frame, the camera's `position` and
`lookAt` snap with it. The view whip-pans. The player's vestibular system
expects the world to stay still when their head doesn't move; getting a
90° rotation from a key tap is the same sensation as someone forcibly
turning your head. Repeated 2-3 times per second (normal play frequency)
= nausea within 10-20 seconds.

**Smoothing the camera's rotation does not fix it.** It trades "instant
strobe" for "constant slow spin". The latter is just as disorienting.
You're still telling the player's brain that the world rotates whenever
they press a key.

## The fix: orientation decoupling

Camera position can follow the player. Camera orientation must be
**world-relative and fixed** (or at least not coupled to player facing).

### Pattern A: Top-down

Camera at high altitude, looks straight down (or with fixed near-vertical
pitch). Position tracks the player's x/z but never rotates.

Used by: every 2D game in 3D. Pacman, Bomberman, Battle City, Hades, Hotline
Miami, Diablo.

### Pattern B: Fixed isometric

Camera at a constant compass direction (e.g. always SE), tilted ~30-45°
toward the ground. Position follows player; orientation is locked.

Used by: SimCity, classic isometric RPGs, modern indie like Hades / Bastion.
The view of the player tank "rotates" because the *tank model* turns;
the camera doesn't.

### Pattern C: Cinematic (no follow)

Camera holds at a scripted position, looks at the action area. Player
moves within the frame. When they leave, the camera cuts (not pans) to
the next scripted position.

Used by: Resident Evil 1-3, classic Final Fantasy, Another World.

### What's banned

- **3rd person chase cam** (Mario 64 style) — REQUIRES continuous-turn
  player facing
- **First-person from the player's head** — REQUIRES continuous-turn
- **Camera that "leads" the player's facing direction** — REQUIRES continuous-turn

## The exception that proves the rule

Some snap-turn games DO use a rotating camera — but only in special modes:

- **Bomberman puzzle stages** in some 3D entries (BombermanWorld) used a
  fixed angle. Boss fights sometimes switched to a chase cam, but those
  bosses had **continuous** player movement (analog stick) instead of
  4-dir snap.
- **Smash TV** style twin-stick shooters use 4-dir-FIRE but 8-dir or
  continuous MOVEMENT. Camera tracks movement direction, not fire direction.

Notice the workaround in both cases: when a designer wants a rotating
camera, they first change the input to continuous-turn. They don't try
to make a rotating camera survive snap-turn input.

## How to verify

You can detect a violation by sitting still and pressing direction keys
in rapid alternation. If the camera spins 90° on each press, you have the
bug. Time-to-nausea is usually under 15 seconds.

## Where this gets violated in practice

A common LLM mistake: user asks "make this game more immersive with first
person view", LLM adds a 1st-person camera mode to a snap-turn game (e.g.
a tank battle clone) and ships it. The user reports nausea. Adding camera
smoothing doesn't help. The only fix is to either:

1. Remove the rotating camera mode (replace with static top/iso/close).
2. Change the player input to continuous-turn (analog steering instead of
   4-dir snap) — but that changes the entire game feel.

The right answer is almost always #1.

## Cross-references

- `skills/craft/render-recipes.md` — picks camera type
  per genre. Grid/strategy games → ortho-top or iso. Always.
- `skills/game/feel/camera-lag.md` — for continuous-turn games, camera leading
  the movement direction is good. For snap-turn games, it's the bug above.
- `docs/principles.md` E8 — concrete recurrence in this codebase
  (Battle City first/3rd person modes).
