# Game Genre Router

This is the **entry point** for AI-driven game generation. Its job is to figure out, in 60 seconds, which genre skill should take over.

## When to use this skill

- User wants to "make / generate / design / build" a game and genre is ambiguous
- User describes a game in vague terms ("like Vampire Survivors but with cats")
- User asks "what genre should I build" or "what's the easiest game to AI-generate"
- Multiple genre skills could apply and you need to disambiguate

Do **not** invoke when the user already named a clear genre — go straight to that skill.

## The routing decision

Ask these in order. Stop as soon as the genre is determined.

### 1. "What does the player DO every 5–30 seconds?"

This single question disambiguates 80% of cases. Match the answer to the table:

| Player action every few seconds | Likely genre | Hand off to |
|---|---|---|
| Dodges enemies while attacks fire automatically | Survivors-like | `survivors-likes` |
| Picks one of 3 cards / upgrades, then fights | Deckbuilder or Roguelike | ask follow-up Q2 |
| Swaps two tiles to make a match | Match-3 | `match-3` |
| Watches numbers grow, taps to accelerate | Incremental / Idle | `incremental-games` |
| Reads text, picks a dialogue choice | Visual Novel | `visual-novels` |
| Jumps, runs, avoids spikes | Platformer | `platformers` |
| Drags units onto a board, then watches autofight | Autobattler | `autobattlers` |
| Solves a discrete logic problem (sokoban-like) | Puzzle | `puzzle-games` |
| Weaves through bullet patterns | Shmup | `shmups` |
| Plays cooperatively while a monster threatens | Co-op horror | `coop-horror` |
| Places towers on a map, watches creeps die | Tower defense | `tower-defense` |
| Auto-runs forward, dodges left/right | Endless runner | `endless-runners` |

### 2. Disambiguators

**Deckbuilder vs Roguelike**: "Is the deck the primary mechanic, or just one of several mechanics?"
- Deck IS the game → `deckbuilders`
- Combat / exploration / items dominate, deck is optional → `roguelikes`

**Survivors-like vs Shmup**: "Does the player aim manually?"
- Auto-aim → `survivors-likes`
- Manual aim with bullet patterns → `shmups`

**Platformer vs Roguelike (action variant)**: "Does death restart the level or the entire run?"
- Restart the level → `platformers`
- Restart the run (permadeath) → `roguelikes`

**Idle vs Clicker vs Incremental**: All three live in `incremental-games`. The skill itself disambiguates internally.

### 3. Cross-cutting confirmation questions

Once a genre is matched, confirm with these before handoff:

1. **Session length target**: 2 min / 10 min / 30 min / "1 hour+"?
2. **Target platform**: web / mobile / Steam / itch.io?
3. **Two reference games the user already loves** in this genre.
4. **Tone**: cozy / brutal / funny / horror / abstract?

These four answers become the genre skill's input brief.

## What to NOT do

- Do not propose a genre the user did not gesture toward. If they say "something like Animal Crossing," do not push them into a roguelike because it's "easier to generate."
- Do not invent hybrid genres before validating the base genre. "Roguelike-deckbuilder-survivors" is not a real brief — pick the primary loop first.
- Do not skip the session-length question. It's the most important constraint for AI-generated scope.
- Do not load multiple genre skills at once. Route to ONE.

## After routing

Hand off the four cross-cutting answers (session length, platform, reference games, tone) and any genre-specific notes to the chosen `designing-*` skill. That skill takes over from there.

## When no genre fits

If the user describes something that doesn't fit any of the 13 listed genres (e.g., MMORPG, 4X grand strategy, racing sim, sports sim), say so clearly:

> "This bundle currently covers 13 small-to-medium-scope genres that are realistically AI-generatable. Your idea is bigger / different. Want to (a) pick the closest small-scope adjacent genre, or (b) wait for a future expansion?"

Do **not** stretch an existing skill to cover a genre it wasn't designed for. The genres in this bundle were chosen because they have **tight core loops** that AI can credibly generate end-to-end.
