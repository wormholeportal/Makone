---
name: game-architecture
description: Code structure for games that keep growing - composition over inheritance, state machines, event bus, save systems. Use when adding a feature keeps breaking unrelated ones, or before committing to a data model.
---

# architecture/ — structure that survives the fifth feature

Small games don't need this. Reach here the moment a new feature starts
breaking an old one — or before you decide what a save file contains, because
that decision is expensive to change later.

| page | what it fixes |
|---|---|
| `entity-composition.md` | `class Snake extends Enemy extends Entity` — build component bundles instead |
| `state-machines.md` | behaviour spread across a pile of `if/else` — model it as an explicit FSM |
| `event-bus.md` | "enemy dies" hard-wired to score + sfx + drop + achievement — emit, subscribe |
| `save-systems.md` | save bolted on at the end — it shapes the data model, so decide on day one |

Engine-level performance (pooling, spatial partitioning, timestep, update order)
lives in `skills/three/`, not here.
