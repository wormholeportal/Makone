# Fun Compiler

The fun compiler converts a player fantasy into rules, then rejects anything
that cannot be proven through play.

## Pipeline

1. **Fantasy**
   - Player identity: "I am..."
   - Verb: "I repeatedly..."
   - World: "inside..."
   - Promise: "so I feel..."

2. **MDA target**
   - Aesthetics: choose 1 primary feeling, 1 secondary feeling.
   - Dynamics: describe the repeated behavior that creates those feelings.
   - Mechanics: write the exact rules that cause the dynamics.

3. **Decision spine**
   - Every 5-10 seconds the player chooses between A and B.
   - Each option pays on one axis and costs on at least two axes.
   - If the player always chooses the same option, the choice is dead.

4. **Peak map**
   - "Oh no" moment: tension before loss.
   - "Yes, finally" moment: mastery or payoff.
   - "What if" moment: curiosity or build discovery.
   - "Again" moment: the retry reason after failure.

5. **10-second toy**
   - The core verb alone must be fun for 10 seconds.
   - No score, no enemies, no upgrades. Just motion/interaction.

6. **First 30 seconds**
   - Teach one rule through placement and feedback.
   - No tutorial text.
   - End at the first real trade-off.

7. **Proof**
   - `node harness/capture.mjs <world>` and look at the frame after each visual change — your eyes
     are the audit.
   - Play the slice: is the core verb fun for 10 seconds with no score attached?
   - Fix the single worst thing (look or feel), capture again, repeat.

MDA source: [Hunicke, LeBlanc, Zubek — MDA](https://aaai.org/papers/ws04-04-001-mda-a-formal-approach-to-game-design-and-game-research/)

## The 4 Fun Proofs

A design must provide all four:

| Proof | Question |
|---|---|
| Verb proof | Is the most repeated action satisfying without objectives? |
| Decision proof | Can a skilled player explain why they chose differently this time? |
| Readability proof | Can a spectator understand danger, goal, and progress in 1 second? |
| Retry proof | Does failure teach the next attempt? |

Missing one proof usually means the game is a toy, demo, or screensaver.

## AI Failure Modes

- **Theme-first**: beautiful world, no decision. Fix by cutting theme words
  from the core decision sentence.
- **Feature soup**: many systems, no peak. Fix by writing the peak map first.
- **Fake choice**: upgrade A strictly dominates B. Fix with opposing costs.
- **Delayed fun**: "it gets good after..." Fix by making the 10-second toy fun.
- **Unreadable spectacle**: particles hide danger. Fix visual hierarchy before
  adding more effects.
- **Balance-by-vibes**: content-heavy game without simulation. Fix with a
  simulator or shrink scope.

## Output Contract For Agents

Before coding, the agent must write these into the design doc:

- 5-word pitch.
- MDA target.
- 10-second toy description.
- Decision spine.
- Peak map.
- First-30-second beat list.
- Visual/performance contract.
- Playtest protocol.
