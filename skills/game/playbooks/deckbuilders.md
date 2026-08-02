# Designing Deckbuilders

## When to use this skill

The user wants a game where:
- The player **starts each run with a small fixed deck** (typically 10 cards)
- After each encounter, the player **adds 1 of 3 offered cards** to their deck
- Combat uses the deck (cards drawn each turn, played for effects)
- The deck shape **defines the build identity** for that run
- Death resets the deck; meta-progression unlocks new starter cards or characters

If the player collects cards permanently across sessions (Hearthstone, MTG Arena), this is a CCG, not a deckbuilder — outside this skill's scope.

## The genre in 30 seconds

Deckbuilders made **drafting** the entire game. Where roguelikes ask "what items did you find?", deckbuilders ask "what cards did you choose to add to your deck?" Every card you add changes how the rest of your run will play. The genre's hook is **deck-as-character**: by hour 1, two players have completely different play experiences because they made different draft picks.

## The core loop (the heartbeat)

```
[Start run with 10-card starter deck]
  │
  ▼
[Combat — draw 5, play cards, end turn] ← repeat per turn
  │
  ▼
[Reward: pick 1 of 3 new cards (or skip)]
  │
  ▼
[Repeat for ~15-25 combats per act]
  │
  ▼
[Boss → win, lose, or continue]
  │
  ▼
[Death or final boss → meta-progression]
```

The **3-card pick** is the genre's signature emotional beat. The combat that follows is the **test of the pick**.

## Required screens / states

1. **Title + meta-progression hub** — character / starter deck unlocks
2. **Character / starter deck select**
3. **Run map** — node-based progression (acts and node types)
4. **Combat screen** — opponent, hand, draw pile, discard pile, energy/mana
5. **Card reward screen** — pick 1 of 3 (or skip for gold)
6. **Card removal / upgrade shops**
7. **Relic / item display** — passive modifiers
8. **Boss combat** — special encounter
9. **Deck view** — searchable, accessible during combat
10. **Run summary on death** — stats, run highlights

## The 5 decisions you must make

### 1. Card resource model?
- **Energy / mana per turn** (Slay the Spire — 3 energy/turn) — predictable
- **Mana-curve over turns** (Hearthstone-style — energy grows each turn) — escalating
- **No resource, just hand limit** (Inscryption — cards are the resource) — eliminates math
- Pick ONE. Hybrid models confuse onboarding.

### 2. Deck size constraint?
- **Forced minimum** (Slay the Spire — no minimum, but cards thin the deck for consistency)
- **Forced maximum** (Inscryption — sometimes 1-card decks!)
- **Flexible** (Monster Train — large decks possible but rare)
- Smaller decks = more consistency, more powerful synergies, easier to AI-balance. Default to **starter 10, target end-of-run 15-25**.

### 3. Combat board shape?
- **1 vs 1** (Slay the Spire — you vs an enemy group, but it's still "you")
- **Multi-character party** (Roguebook — controlled heroes)
- **Lane-based** (Monster Train — 3 vertical floors with units)
- **Sacrifice / placement board** (Inscryption — cards on a 4-square row)
- Lane-based adds tactical positioning at the cost of complexity.

### 4. The "build axis" the deck can take?
Every successful deckbuilder has **3–6 archetypes** the player can shape their deck toward:
- Slay the Spire Ironclad: Strength stacking / Block stacking / Exhaust / Self-damage
- Monster Train: Each clan = 1 archetype
- Balatro: Joker synergies define hand-type focus
- Players should be able to **name their deck in 5 words** by end of run

### 5. Card rarity and pacing?
- **Common / Uncommon / Rare** — Slay the Spire's classic split
- Reward pools should give **mostly Common, with rare uplifts** based on combat performance / boss tier
- **Card removal** must be available — adding cards is fun, but removing bad starter cards is *more* fun

## Reference games and the mechanism that makes each work

**Slay the Spire** — *the 3-card pick as a meaningful choice*. The 3 offered cards must include: one "fits my deck" card, one "tempting but doesn't fit" card, one "trash for this build" card. Without this trio dynamic, every pick is obvious and the choice is dead. Mega-Crit's algorithm explicitly biases reward generation to enforce this trio.

**Inscryption** — *meta-narrative breaking the 4th wall every act*. The "deckbuilder" is the surface mechanic; the actual game is discovering what's happening *outside* the deckbuilder. Demonstrates that the genre is flexible enough to host story experiments.

**Balatro** — *poker hands as the combat resource*. By replacing "fight enemies" with "score points against a target," removed the combat-AI problem entirely. The Joker cards become the synergy engine. This is the cleanest example of "the genre is drafting, the combat is whatever you put under it."

## Death traps to avoid

- **Cards that don't synergize with anything** — every card must combo with at least 2–3 others in the pool. Standalone cards die in deckbuilders.
- **Mandatory pickup of every offered card** — players must be able to **skip** rewards (this is critical and often forgotten). Skipping is sometimes the optimal play.
- **No card removal** — a deck that only grows becomes diluted and unwinnable. Card removal is **the genre's most important shop service**.
- **Random shuffling that punishes the player** — if you draw 5 attacks when you needed defense, that's part of the genre. But if the deck shuffler clumps cards unfairly, players blame RNG and quit. Use **proper randomization with a re-shuffle on each combat**.
- **Combat AI that doesn't reveal its intent** — Slay the Spire's "intent icons" (showing what each enemy will do next turn) are non-negotiable. Without telegraphing, players can't plan, and planning *is* the genre.
- **Too many cards in the starter pool** — 50-card starter pools confuse new players. Start with **10–12 known cards** and add curated additions only.

## Recommended scope for AI generation

| Component | AI quality |
|---|---|
| Card pool design (80–150 cards) | ✅ Strong taxonomy needed; AI can fill |
| Card balance (cost/effect ratio) | ⚠️ Needs simulator |
| Enemy designs + intent patterns | ✅ Good |
| Boss designs | ⚠️ Medium |
| Run-level reward distribution | ⚠️ Needs simulator |
| Synergy detection ("does this combo work?") | ⚠️ Needs run-simulator |
| Run map procedural generation | ✅ Excellent |
| Card art (visual identity) | ✅ Good with AI image gen |

**Critical AI weakness**: balance via simulation. You **must** write a script that auto-plays 10,000 runs with random / heuristic strategies, and tunes card values until average win-rate hits the target (50–70% for a casual deckbuilder, 20–40% for hardcore).

**Realistic v0.1**: 1 character, 60-card pool, 4 archetypes, 1 act with 12 nodes, 1 boss, 8 enemy types, 5 relics. Web playable.

## MVP scaffold (output this first)

```
# [Game Name] — Deckbuilder Design Doc v0.1

## Pitch (one sentence)
[20 words: setting + the unusual mechanical twist]

## Core combat math
- Resource: [energy/turn, fixed at N]
- Hand size: [draw N per turn]
- Discard at turn end? [Y/N]
- Deck cycling: [shuffle on empty draw pile]

## Starter deck (10 cards)
| # | Name | Cost | Effect | Why it's in the starter |
|---|---|---|---|---|

## Archetype axes (4 minimum)
| Axis name | Card families | Win condition |
|---|---|---|

## Card pool (60 cards for v0.1)
| Name | Rarity | Cost | Effect | Archetype | Synergies with |
|---|---|---|---|---|---|

## Enemy roster (8 enemies + 1 boss)
| Name | HP | Intent patterns | Threat level |
|---|---|---|---|

## Run structure
- Act length: 12 nodes
- Node types: [Combat / Elite / Treasure / Shop / Rest / Event / Boss]
- Reward distribution per node type

## Relic / passive pool (15 for v0.1)
| Name | Effect | Rarity | Trigger |
|---|---|---|---|

## Required: balance simulator plan
- Auto-play script: random-draft + greedy-play heuristic
- Target win rate: [N]% on default difficulty
- Card-by-card adjustment loop (cost ↑ if pick-rate > X%)

## What's OUT of scope for v0.1
- Multi-character, multi-act, daily challenges, co-op
```

## See also

- `roguelikes` — for the broader run-based pattern this skill specializes
- `autobattlers` if the player drafts units instead of cards
- Future `economy-curve-tuning` skill (Layer 2) for card/relic value balancing
