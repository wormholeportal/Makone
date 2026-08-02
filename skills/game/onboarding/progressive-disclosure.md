# Progressive disclosure — one new idea per level, then combine

> **Level 1 teaches move.
> Level 2 teaches jump.
> Level 3 teaches move + jump combo.
> Never dump all mechanics level 1. One concept per segment.**

## One-liner

Introduce one mechanic per 2-3 minutes.
Let player master it before adding next.
Spiral complexity: each later level builds on previous, never starts from scratch.

## Why

Human working memory: 5-9 items max.
Dump 10 mechanics at once → player forgets all of them.

Learning curve = introduction density:
- Too fast = overwhelmed
- Too slow = bored
- Just right = flow

**Pacing examples**:
- Celeste: level 1 = jump. Level 2 = jump + dash. Level 3 = jump + dash + wall-climb.
- Mario: level 1-1 = walk + jump. Level 1-2 = walk + jump + koopa. Level 1-3 = walk + jump + koopa + pipe.
- Dark Souls: tutorial = walk. Then attack. Then block. Then parry. Each is separate zone.

## Quantified standards

**Mechanic introduction spacing**:
- New mechanic every 2-3 minutes
- 5 minutes of practice before next mechanic
- 10 minutes total for first level (max 3 mechanics)

**Skill gate**:
- Can player execute mechanic 90%+ of attempts before next intro?
- If < 80% success → level too hard, add more practice
- If > 95% success → level too easy, next can be harder

## 4 progressive layers

### Layer 1: Introduction

Teach **one concept** in isolation.
- Clear goal
- Single mechanic
- Safe environment (no pressure)

**Example**: tutorial level with jump, no enemies, slow pacing

### Layer 2: Practice

Repeat concept in varied situations.
- Multiple attempts
- Different angles
- Still safe (fail = retry, not restart)

**Example**: 5 platforms of increasing distance, each requires same jump skill

### Layer 3: Application

Concept becomes tool in larger challenge.
- Combine with prior mechanics
- Real stakes (fail = lose progress)
- Player chooses when to use mechanic

**Example**: navigate room with platforms + moving hazards, player decides when to jump

### Layer 4: Mastery

Mechanic becomes second nature.
- Advanced challenges assume it works
- New concept is introduced
- Player references old mechanic to understand new

**Example**: introduce wall-jump, which requires jump mastery already established

## Classic examples

### Portal

Level 1 = move, look. Level 2 = first portal. Level 3 = two portals. Level 20 = complex puzzles combining all prior concepts.
Never confusing because each introduction is isolated, practiced, then combined.

### Celeste

Chapter 1 = walk + jump (established from Mario). Chapter 2 = dash (new). Chapter 3 = jump + dash combo.
Difficulty rises by environment, not mechanic dump.

### Hollow Knight

Early game: walk, jump, basic slash. Boss teaches parry. Later: chain abilities together.
Every new move is introduced as your own discovery, not dumped as tutorial.

## Antipatterns

- **Mechanic dump**: tutorial throws 10 moves at once → player forgets → frustration
- **Tutorial never ends**: practicing one mechanic for 30 minutes → boredom
- **Uneven difficulty**: level 1 trivial, level 2 impossible → no learning curve
- **Mechanics taught then abandoned**: teach wallslide, never ask for it again → player forgets
- **No context for mechanic**: teach parry in vacuum, not versus actual enemies → doesn't stick

## How to implement

**1. Design level around one core mechanic**

```ts
// Tutorial level
const level = {
  mechanic: 'jump',
  scenes: [
    { desc: 'Jump over 1 gap', platforms: 2, hazards: 0 },
    { desc: 'Jump over 2 gaps', platforms: 3, hazards: 0 },
    { desc: 'Jump precisely', platforms: 5, hazards: 0 },
    { desc: 'Walk + jump', platforms: 5, hazards: 0, require: ['walk', 'jump'] },
  ]
}
```

**2. Gate next mechanic behind mastery**

```ts
if (player.jumpMasteryLevel > 80) {
  // Unlock next level introducing dash
} else {
  // Stay in jump practice levels
}
```

**3. Spiral complexity**

```ts
// Level progression
// 1: walk
// 2: walk + jump
// 3: walk + jump + turn
// 4: walk + jump + turn + interact
// 5: all prior + enemy avoidance
```

## Related skills

- `skills/game/axioms/flow-channel.md` — progressive difficulty maintains flow
- `skills/game/axioms/meaningful-choice.md` — new mechanics unlock choices
- `skills/game/mechanics/difficulty-arc.md` — introduction timing part of difficulty

## References

- John Swink, *Game Feel*
- Jane McGonigal, *Reality is Broken*
- Learning science (Bloom's taxonomy)
- Celeste GDC postmortem (Maddy Thorson)
