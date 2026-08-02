# Designing Puzzle Games

## When to use this skill

The user wants a game where:
- Each level has **one or a small number of correct solutions**
- The state is **discrete** (grid cells, tokens, predicate values)
- The player **thinks before acting** (no twitch, no time pressure)
- Solving a level is **a moment of insight**, not skill execution
- Players progress level-by-level with no run-based structure

Excludes:
- Match-3 (see `match-3`)
- Physics puzzles (Cut the Rope, Angry Birds)
- Action-puzzles with time pressure

## The genre in 30 seconds

True logic puzzles are **interactive theorems**. The player solves by:
1. Building a mental model of the rules
2. Searching the state space
3. Recognizing a key insight
4. Executing the solution

The genre's emotional payload is **the "aha!" moment**. Without it, you're just making the player do work. Great puzzle designers don't make puzzles harder — they make insights more surprising.

## The core loop (the heartbeat)

```
[Level loads — clean state]
  │
  ▼
[Player observes, plans, makes moves]
  │
  ▼
[Move resolves — state updates deterministically]
  │
  ├─▶ "Aha!" → level solved → next
  │
  └─▶ Stuck → undo / restart / hint
```

The undo button is **essential**. Genre players will try 50 wrong solutions per puzzle. Without one-key undo, frustration kills the game.

## Required screens / states

1. **Title** with level select grid
2. **Level select** — show solved / unsolved / locked
3. **Puzzle screen** — minimal UI, board dominates
4. **Undo / restart / hint buttons** — always visible
5. **Solve animation** — small celebration on completion
6. **Solution playback** (optional but classy) — shows player's solving moves
7. **End-of-pack / world transitions** — introduce new mechanic

## The 5 decisions you must make

### 1. Core puzzle primitive?
- **Grid + pushable blocks** (Sokoban family)
- **Cell-marking** (Picross / nonogram, Sudoku-like)
- **Rule manipulation** (Baba Is You — rules ARE objects)
- **Path drawing** (Snakebird, Cosmic Express)
- **Stacking / building** (Bonfire Peaks)
- Pick ONE primitive. Hybrid primitives confuse onboarding.

### 2. How does difficulty scale?
- **Add a mechanic** every 5–10 levels (most common)
- **Combine 2 existing mechanics** in unexpected ways
- **Reverse / invert a learned rule** (advanced; Baba Is You does this masterfully)
- The genre's longevity depends on **how many recombinations** the primitive supports. Sokoban has lasted 40+ years because pushables are infinitely recombinable.

### 3. Hint / accessibility system?
- **No hints** — purist
- **Reveal one mistake** (Picross's wrong-cell penalty system)
- **Skip after N attempts**
- **Solution playback after a long wait time**
- Modern indie players expect **at least skip-after-failure**.

### 4. Aesthetic minimalism?
The genre rewards aesthetic restraint:
- **Pure abstract** (Patrick's Parabox, Stephen's Sausage Roll)
- **Cozy diorama** (A Monster's Expedition, Bonfire Peaks)
- **Charming character** (Snakebird, Cosmic Express)
- Detailed environments often *hurt* puzzles by hiding state.

### 5. Level count + difficulty cap?
- **40–80 levels** is the indie sweet spot
- **3–5 difficulty bands** with a "graduation" final puzzle each band
- **Bonus / expert levels** unlocked after the main set
- Don't ship more than 100 unless you have a procedural generator.

## Reference games and the mechanism that makes each work

**Baba Is You** — *the rules themselves are pushable objects*. The "WALL IS STOP" sentence on the board can be broken, rearranged, and the rules change. By making the rule system **the puzzle**, achieved infinite recombinability. The genre's most-studied design innovation of the last decade.

**Stephen's Sausage Roll** — *the smallest possible mechanic, maximally explored*. Sausages roll when pushed, cook on grills, can fall off the world. Hundreds of puzzles emerge from these 3 rules. **Constraint breeds depth.**

**Picross / nonogram (Picross S, etc.)** — *the genre that AI generates best*. Levels can be **algorithmically generated** from any image, with guaranteed unique solutions. The Steam Picross series ships 300+ puzzles by auto-generating from pixel art.

## Death traps to avoid

- **Multiple solutions per puzzle** — kills the "aha!" because players can brute-force. Every puzzle must have **exactly one elegant solution** (or a tiny family of equivalent ones).
- **Trial-and-error solvable** — if the player can solve by random moves, you don't have a puzzle, you have a maze. Design **forces** thinking by making moves expensive (per-level move limit, undo as the only safety net).
- **Hidden state / fog of war** — puzzles must be **fully observable**. Hidden information is for other genres.
- **Slow animations** — every move must resolve in **under 200ms**. Players will solve 50 puzzles per session; 1-second moves equal hour-long sessions.
- **Skipping the level editor / sharing** — modern puzzle games gain enormous longevity from user-generated content. Without a level editor, you cap your retention.
- **Puzzles that REQUIRE notes/external paper** — fine for hardcore audience (Sudoku), but bad for casual. Most modern indie puzzlers limit to **what's tractable in the player's head**.

## Recommended scope for AI generation

**This is the most reliably AI-generatable genre on the list**, especially for picross/nonogram and pure logic puzzles, because:
- Levels can be **procedurally generated**
- A **solver** can verify uniqueness and difficulty
- Visual style can be minimalist
- No real-time logic, no AI behavior, no PvP

| Component | AI quality |
|---|---|
| Procedural puzzle generation (picross) | ✅ Excellent |
| Hand-authored puzzles (Sokoban-style) | ⚠️ Medium — solver helps |
| Difficulty curation | ⚠️ Needs solver |
| Visual minimalism | ✅ Easy |
| Tutorial design (teaching via levels, not text) | ✅ Good with care |

**Critical AI requirement**: a **solver script** that runs on every generated level to verify:
1. Has exactly one solution (or proves uniqueness)
2. Required moves count matches difficulty target
3. No trivial brute-force solution exists

**Realistic v0.1**: For picross — 60 procedurally generated levels from a curated image set. For Sokoban-like — 30 hand-authored levels with 3 mechanic introductions. Both fit a 2-week build.

## MVP scaffold (output this first)

```
# [Game Name] — Puzzle Design Doc v0.1

## Pitch (one sentence)
[20 words: the core primitive + the unusual twist]

## The primitive
- One sentence describing the core verb / mechanic
- What's pushable / clickable / drawable
- What rules govern state change

## Mechanic introduction schedule
| Level # | New mechanic | First-use level | Combination level |
|---|---|---|---|

## Level pack structure
- World 1: levels 1-15, mechanic A
- World 2: levels 16-30, mechanic A + B
- World 3: levels 31-45, recombination
- World 4: levels 46-60, mastery

## Solver requirements
- Generation method: [procedural / hand / hybrid]
- Solver verifies: unique solution, move count, difficulty band
- Auto-rejection threshold: [criteria]

## UX essentials
- Undo: any number of steps (memory-permitting)
- Restart: 1-button
- Hint: [policy]
- Move counter: visible
- Best-solution tracking: yes/no

## Aesthetic direction
- Visual references: [3 games / artists]
- Color palette: [chosen]
- Audio: [single instrument? sparse? full track?]

## What's OUT of scope for v0.1
- Level editor, online sharing, achievements beyond pack completion
```

## See also

- `match-3` for tile-cascade puzzles
- `visual-novels` for narrative-puzzle hybrids
- `platformers` for action-puzzles where movement is the verb
