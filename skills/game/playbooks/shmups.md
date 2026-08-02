# Designing Shmups

## When to use this skill

The user wants a game where:
- The player **manually aims** and shoots
- Enemies fire **complex bullet patterns** the player weaves through
- A run is **5–30 minutes** of continuous play through scrolling stages
- Death takes a **life** (limited stock) or restarts the level
- Mastery is measured in **scoring**, deaths, or 1-credit clears (1CC)

If aim is automatic and enemies are swarms, see `survivors-likes`.

## The genre in 30 seconds

Shmups are **3D chess at 60 FPS**. The player's brain plans paths through dozens of bullets while their fingers execute. The genre's hook:
1. The "in the zone" flow state — better than almost any other genre achieves
2. Mastery through repetition (run the same stage 50+ times)
3. **Score-chasing** as a permanent metagame

Shmups have small but **deeply devoted** audiences (Cave's Steam ports sell modest numbers to extremely loyal fans).

## The core loop (the heartbeat)

```
[Start stage]
  │
  ▼
[Continuous play, 3-5 min per stage]
  │
  ├─ Move (4-way or 8-way)
  ├─ Shoot (autofire or tap)
  ├─ Bomb (panic clear, limited stock)
  ├─ Special / focus mode (slows player, narrows hitbox)
  │
  ▼
[Mid-boss → stage continues → boss]
  │
  ▼
[Death: life lost, respawn or game over]
  │
  ▼
[Score / 1CC / continue]
```

Sessions are short (15–30 minutes). Mastery happens across **hundreds of sessions**.

## Required screens / states

1. **Title + score table** (high scores are central to the genre)
2. **Difficulty + ship select** (Easy / Normal / Hard / Lunatic typical)
3. **Stage screens** (vertically or horizontally scrolling)
4. **Pause / continue**
5. **Game over** with continue prompt
6. **Score breakdown** at end of each stage
7. **Replay save / playback** — genre-standard for sharing runs
8. **Practice mode** — select individual stages, especially boss-only

## The 5 decisions you must make

### 1. Scrolling direction?
- **Vertical** (Touhou, DoDonPachi) — narrower playfield, slower bullets, more dense
- **Horizontal** (Gradius, R-Type, Hyper Demon) — landscape view, terrain interaction
- **Top-down free-flight** (rare; Tyrian) — full 360° movement
- Vertical is the genre standard and the easier to design.

### 2. Player hitbox size?
- **Visible ship-sized hitbox** (arcade Gradius) — punishing
- **Tiny hidden hitbox** (modern Touhou — a 2-pixel dot at ship center) — enables threading
- **Switchable** (focus mode shrinks hitbox + slows player) — Touhou standard
- Tiny hitbox is non-negotiable for **bullet-hell** (danmaku) subgenre.

### 3. Power-up vs power-down on death?
- **Keep power-ups** (forgiving) — most modern shmups
- **Lose all power on death** (Gradius style) — punishing, classic
- **Lose 1 tier of N** — middle ground
- Lose-all-on-death is a **legacy mechanic** that frustrates modern players. Default to keep-on-death.

### 4. Scoring complexity?
- **Simple cumulative** — enemies killed = points
- **Chain / combo systems** (DoDonPachi: keep hitting enemies to multiply)
- **Risk-reward** (Ikaruga's polarity matching, Crimzon Clover's break gauge)
- **Graze / proximity scoring** (Touhou's near-miss bonus)
- Score chasers are the genre's hardcore audience. **At least one of the last three is required** for serious shmup players.

### 5. Difficulty + Lives count?
- **3 lives, 3 continues** is arcade standard
- **Higher difficulties unlock denser bullet patterns** (not faster enemies)
- **"Lunatic" or equivalent top difficulty** is a brand expectation
- Lower difficulty isn't "fewer bullets" — it's **simpler patterns**.

## Reference games and the mechanism that makes each work

**Touhou** — *bullet patterns as boss personalities*. Each boss has signature spell-card patterns that double as character expression. The player learns the boss by name through the pattern shape. Demonstrates that bullets are **the genre's primary language**.

**ZeroRanger** — *minimalist 4-color aesthetic + Buddhist plot twist*. Shows that shmups can be **literary**. A small team made a genre-defining work by treating story and mechanics as one. Lesson: scope down to ship.

**Hyper Demon** — *aggression as the score mechanic*. Standing still loses points. Forces players to **dive into bullets** for scoring, inverting the genre's instinct (avoid bullets). Best modern example of "the score system IS the design."

## Death traps to avoid

- **Patterns that aren't readable** — bullets must be visually distinct from background, with high contrast and predictable speed. Many bad shmups have beautiful art that obscures the actual gameplay.
- **Slow respawn after death** — must be **under 1 second**. Lose a life, respawn mid-screen with brief invuln.
- **No autofire** — players hold the fire button for 30 minutes per session. Autofire is non-negotiable; tap-fire is a hidden bonus mode.
- **Wide spreads from the player** that obscure the bullets coming at them — many indie shmups fail this. Shot patterns must **not occlude incoming danger**.
- **Bombs that don't feel impactful** — bombs are the player's panic button. They must clear the screen, look spectacular, and feel like spending a real resource.
- **Stage length over 6 minutes** — fatigue compounds. Most great shmups have **3–5 minute stages**.
- **No practice mode** — players replay each stage 30+ times to master. Without practice mode, that experience is locked behind "start over."

## Recommended scope for AI generation

| Component | AI quality |
|---|---|
| Bullet pattern design | ⚠️ Medium — needs playtesting |
| Stage layout (enemy waves) | ⚠️ Medium |
| Boss design (multi-phase patterns) | ⚠️ Weak — boss design is hard |
| Art (ships, bullets, backgrounds) | ✅ Good with image gen |
| Audio (chiptune / arrangements) | ⚠️ Medium |
| Scoring system | ✅ Good |
| Replay system | ✅ Engineering, mostly straightforward |

**Critical AI weakness**: bullet pattern **playability**. Generated patterns often look pretty but are unfair (gaps too narrow, speed mismatch, occlusion). **Build a pattern-testability validator** — automatically check that each pattern has at least one survivable path for a default player movement profile.

**Realistic v0.1**: 1 stage, 1 boss, 1 ship (3 weapon variants), 3 difficulties, replay save. Steam Deck friendly resolution. **Don't try arcade-perfect feel for v0.1 — that's a 2-year tuning project.**

## MVP scaffold (output this first)

```
# [Game Name] — Shmup Design Doc v0.1

## Pitch (one sentence)
[20 words: setting + the one mechanical twist]

## Format
- Scrolling: [vertical / horizontal]
- Resolution: [target, e.g. 320×480 portrait]
- Frame rate: 60 FPS locked

## Player ship
- Hitbox visualization: [tiny dot at center / ship outline]
- Speed: [normal] / [focus mode slower]
- Weapons: [main shot] / [bomb stock, 3 typical]
- Lives: [3 default] + [3 continues]

## Stage 1 design
- Length: [N seconds]
- Enemy waves: [number and pattern variety]
- Mid-boss at [N seconds]
- End boss with 3 phases

## Bullet pattern library (10 minimum)
| Name | Visual | Speed | Density | Required ability |
|---|---|---|---|---|

## Boss design
- Phase 1: pattern set + transition trigger
- Phase 2: pattern set + transition trigger
- Phase 3: pattern set + defeat condition

## Scoring system
- Base: points per enemy
- Bonus: [chain / graze / risk]
- Stage clear bonus: [formula]

## Difficulty matrix
- Easy / Normal / Hard / Lunatic
- Difference: pattern density, not speed

## Pattern playability validator
- Auto-test: can default-movement profile survive 30 seconds of each pattern?
- Fail criterion: gap < [player hitbox + N pixels]

## What's OUT of scope for v0.1
- Multiplayer, level editor, additional stages
```

## See also

- `survivors-likes` for the auto-aim variant
- `tower-defense` if enemies move on fixed paths
- Future `game-feel-juice` skill (Layer 2) — critical for shmup hit-feedback
