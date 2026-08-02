# actors — bring people into the world

`runtime/actors.js` = mannequin-js figures + grid A* pathfinding + routine DSL + pose library.
People are the strongest signal of "living": a patron who sits down to eat noodles brings more life than a hundred particles.

## Usage

```js
import { World as ActorWorld } from '/runtime/actors.js';

const actors = ActorWorld({
  scene,                                       // required (no globals)
  zone: { x0: -6, z0: -4, x1: 8, z1: 9 },      // walkable rectangle
  obstacles: [{ x0, z0, x1, z1 }, ...],        // axis-aligned obstacles (table/stall/wall)
  radius: 0.32, cell: 0.3, speed: 1.2,         // optional
});

actors.spawn({
  kind: 'm' | 'f', height: 1.72, x, z, yaw, tint: 0x8a4a3a,
  routine: [                                   // loops; empty array = free wander
    { go: [x, z] },                            // A* walk there
    { face: [x, z] },                          // turn to face
    { wait: 3, pose: 'operate', face: [x,z] }, // hold (operate = hands-on-counter work)
    { sit: { x, z, yaw, hold: 9 } },           // sit (turn first then fold, prevents leg twist)
    { grab: mesh }, { put: [x, y, z] },        // pick up/put down (mesh.userData.hold defines grip pose)
  ],
});

// in renderFrame:
actors.tick(dt);
```

Tested in anger: a food-stall scene — an operator working the pot, seated patrons, and
passers-by wandering through.

## Scar rules

1. **mannequin-js on import auto-creates fullscreen canvas + animation loop** — actor-engine neutralizes it at module top level,
   world code doesn't touch it. But never bypass actor-engine with a direct `import 'mannequin-js/src/scene.js'` stage.
2. **Grounding via bbox**: figure origin is not at feet. Engine's `footY` / sit-grounding handled; when placing figures yourself
   use `Box3.setFromObject` to compute foot offset (v1 chase-run groundOffset pattern).
3. **sit pose leg lift < 90°** (85°) — 90° triggers Euler gimbal lock, legs twist into spirals.
4. **Turn first, sit second** (engine has built-in order) — turning while folding = leg spiral.
5. **Pose values are tuned** (walkPose knee timing, arm swing phase) — need new poses, write new functions.
   Don't "tweak two numbers" and break the walk cycle.
6. **Don't forget stool/small objects in obstacles** — A* only sees obstacles; miss them and figures walk through.
7. **Dynamic obstacles (vehicles) via `addCollider({x,z,r})`**, update x/z each frame — pedestrians pathfind around and get pushed out.

## Crowd feeling

- 3 people + different routines ≈ living scene; 10 people same routine ≈ uncanny valley. Stagger wait times and tints.
- Wanderers (empty routine) are cheapest background life.
- Each mannequin ≈ 30 draw calls — count it in budget (noodles: 3 people ≈ 90 calls).
