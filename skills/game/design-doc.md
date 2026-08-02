# Game Design Doc — `<game-name>.design.md`

> Copy this file to `worlds/<game-name>.design.md` (next to your scene `.js`)
> and fill EVERY field. Empty fields = design isn't ready = don't write code.
>
> Each field has a test in `workflow.md`. Pass the test before
> moving to the next field.

---

# `<Game Name>` — Design Doc

**Status**: 🔴 Draft · 🟡 Reviewed · 🟢 Implemented

**One-line elevator pitch**:
> *(One sentence a player would say to a friend.)*

---

## 0. Fantasy and market pull

Player fantasy (identity / verb / world):

> *(I am... I repeatedly... inside... so I feel...)*

Five-word pitch:

> *(≤ 5 words, no genre jargon)*

Frame-1 screenshot hook:

> *(What single image makes a stranger click play?)*

Market/audience wedge from `skills/game/quality/market-reality.md`:

> *(Which demand bucket? Why does this have pull now? What is the visible twist?)*

MDA target from `skills/game/quality/fun-compiler.md`:

| Layer | Answer |
|---|---|
| Aesthetics (feeling) | |
| Dynamics (repeated behavior) | |
| Mechanics (rules that create it) | |

10-second toy:

> *(Why the core verb is satisfying with no score, enemies, upgrades, or goals.)*

Peak map:

| Beat | What creates it? |
|---|---|
| "Oh no" tension | |
| "Yes, finally" payoff | |
| "What if" curiosity | |
| "Again" retry reason | |

---

## 0.5. Genre pattern fit (optional, but required for recognizable genres)

Closest profile from `skills/game/playbooks/`:

> *(e.g. `playbooks/survivors-likes.md`; write "none" for genre-less experiments)*

Genre contract this design must not violate:

> *(Copy the profile's contract in your own words.)*

Makone v0.1 scope boundaries from the profile:

> *(What content/system scope is allowed for first playable?)*

Death traps turned into things you'll actually look for while playing:

- *(trap -> check)*
- *(trap -> check)*
- *(trap -> check)*

If the profile requires a simulator, define it before content expansion:

> *(simulator name / inputs / pass condition, or "not required")*

---

## 0.75. Visual and performance contract

Render recipe from `skills/craft/performance.md`:

> *(top-down / third-person / arcade / puzzle / horror / custom; why this supports play readability)*

Budgets:

| Budget | Target for this game | Why this value? |
|---|---:|---|
| Draw calls | | |
| Unique geometries | | |
| Unique materials | | |
| Dynamic shadow casters | | |
| Dynamic lights | | |
| PostFX passes | | |
| DPR cap | | |

Visual hierarchy:

1. Player:
2. Immediate danger:
3. Goal/progress:
4. Interactables:
5. Rewards:
6. Background:

Playtest protocol from `skills/game/quality/playtest-protocol.md`:

> *(What will be tested after design, MVP, and polish? Include first confusing moment / first fun moment / first retry reason.)*

---

## 1. Core decision

The player's central, recurring choice:

> *(Format: "Do X or do Y, where X costs A and Y costs B.")*

What makes it interesting (cite which of: time pressure · risk · resource
scarcity · information asymmetry · irreversibility):

> *(...)*

**Self-test**: If the visuals were stripped, would the decision still feel
worth making?
> *(yes/no — if no, redesign)*

---

## 2. Trade-off matrix

The central choice from #1 broken into a matrix. Each option must give up
something on at least 2 axes.

|       | Time | Risk | Resource | Info | Reversible? |
|-------|------|------|----------|------|-------------|
| Option A: *...* | | | | | |
| Option B: *...* | | | | | |
| Option C: *...* | | | | | |

---

## 3. Second-order interactions

Which 2+ mechanics multiply (not just co-exist)? Describe the emergent
behavior that wasn't directly scripted.

> **Mechanic A**: *(...)*
>
> **Mechanic B**: *(...)*
>
> **Emergent C** (1+1 > 2): *(...)*

At least one pair is required. Two pairs is ideal.

---

## 4. First 30 seconds (teach by doing)

Beat-by-beat what happens from the moment "play" is pressed. The single
mechanic introduced this minute, taught with **zero text** by the
level/world design.

- **t=0s**: *(spawn state)*
- **t=5s**: *(first action the player takes naturally)*
- **t=10s**: *(first feedback that teaches the core mechanic)*
- **t=20s**: *(first decision that uses the trade-off from #1)*
- **t=30s**: *(player has learned: ...)*

**Self-test**: A new player runs this. Pause at t=30s. Can they explain
the core loop back to you?

---

## 5. Failure & retry

What death looks like, what it teaches, and why the player wants to retry.

- **How you die**: *(specific failure condition)*
- **What the post-mortem reveals**: *(the lesson the death teaches)*
- **Restart friction**: *(time from game-over to back-in-action — should be < 3 seconds)*

**Self-test**: After my worst death, do I instinctively click restart?
> *(yes/no — if no, the loss is too punishing or too uninformative)*

---

## 6. Win condition (emotion target)

Target emotion when the player wins:

> *(e.g. "barely held the line"; "outsmarted the system"; "perfect run")*

Win condition that produces that emotion:

> *(specific rule — NOT "reach 100 points")*

**Self-test**: Will the player remember **how** they won?

---

## What this game does NOT include

List 3–5 features you considered but cut, and why. Cutting is part of
design — what you leave out tells the player what to focus on.

- ❌ *(Cut feature)* — *(why)*
- ❌ *(...)*
- ❌ *(...)*

---

## Rules → trade-off citations

After implementation, list each gameplay rule and which design-doc trade-off
it serves. Rules with no citation are decoration — they should be cut.

| Rule (file:line) | Serves which trade-off? |
|------------------|--------------------------|
| *e.g. `lanternMax = 5`* | *#1 — limits how many trees you can bloom without regen* |
| ... | ... |

If you find a rule that doesn't serve any trade-off:
1. First ask: does it serve the **emotion target** in #6?
2. If no: delete it. Decoration in mechanics is friction without payoff.

---

## Lib primitive shopping list

After the design is locked, what primitives from `src/game/lib/` does this
game need? List them with the trade-off they implement.

- `Resource` — implements lantern (trade-off #1, axis: resource)
- `Cooldown` — implements blooming windup (trade-off #1, axis: time)
- ...

**Self-test**: Did you reach for a primitive that doesn't appear on this
list? Why? Either the design missed something (update the doc), or you're
decorating (don't).
