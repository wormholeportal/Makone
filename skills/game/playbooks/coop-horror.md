# Designing Co-op Horror Games

## When to use this skill

The user wants a game where:
- **2–6 players play together** in voice chat (proximity voice or external)
- The goal is to **complete an objective** (scavenge items, perform rituals, escape)
- A **threat** (monster, environment, time) makes failure likely
- The fun comes from **shared panic** — players watching friends die screaming
- Sessions are **20–45 minutes**, designed for streaming and clip-sharing

If the game is single-player horror without friends, this skill doesn't apply.

## The genre in 30 seconds

The genre exploded in 2023–2025 because it solves several problems at once:
1. **Low content cost** — players generate emotional content (their panic)
2. **Streamer-perfect** — Twitch / TikTok / YouTube viral by default
3. **Replayability** — different player combinations = different chaos
4. **Cheap art is fine** — even janky visuals work when the audience is laughing/screaming

Lethal Company sold 11M+ copies as a solo-dev project. R.E.P.O. and PEAK followed the formula. **This is the most lucrative AI-amenable pattern available right now.**

## The core loop (the heartbeat)

```
[Lobby — friends join]
  │
  ▼
[Objective brief: scavenge X items / complete Y ritual]
  │
  ▼
[Deploy to location]
  │
  ▼
[Explore + collect — proximity voice chat means
 friends drift apart, sometimes deliberately]
  │
  ▼
[Threat encounter — monster, hazard, timer pressure]
  │
  ├─▶ Survive: extract with loot
  │
  └─▶ Death: spectate teammates, voice often blocked
  │
  ▼
[Earn currency → upgrade gear → next mission]
```

The **separation moment** (when one friend wanders off and is now alone) is the genre's emotional core.

## Required screens / states

1. **Main menu** with **Host / Join** (lobby code or Steam invite)
2. **Lobby** — visible players, voice test
3. **Mission select / brief**
4. **In-game** with proximity voice indicator
5. **Inventory / gear screen** between missions
6. **Death / spectate** (often constrained — can't always speak to alive players)
7. **End-of-mission summary** — survived/dead, loot, currency earned
8. **Persistent ship / hub** between runs (Lethal Company's ship is iconic)

## The 5 decisions you must make

### 1. Threat type?
- **Patrolling monster** (Lethal Company's various entities, R.E.P.O.) — players must hide / evade
- **Environmental hazard** (PEAK's mountain itself, Pacific Drive's anomalies) — terrain is the threat
- **Time pressure + objective complexity** (GTFO's missions) — no monster, just relentless waves
- **Supernatural / ritual** (Phasmophobia, Devour) — ghost identification, ritual completion
- Pick ONE primary. Multiple threats compete for player attention.

### 2. Proximity voice or radio voice?
- **Proximity** (Lethal Company default) — players only hear each other when close
- **Radio always on** — like normal voice chat
- **Walkie-talkie / radio with battery** — strategic communication
- **Proximity is the genre's defining feature.** Without it, the separation panic doesn't work.

### 3. Death consequences?
- **Permadeath this mission** — common, spectate only
- **Lose loot / progress on death** — significant penalty
- **Players can revive teammates** — adds rescue gameplay
- **Persistent character death** (GTFO style) — rare, hardcore
- Spectate-only with **voice blocked or distorted** is the genre standard.

### 4. Content footprint?
- **1 location with procedural variation** (Lethal Company moons) — low art cost, high replay
- **5–10 hand-crafted locations** — higher art cost
- **Open world** (PEAK's mountain) — single space, traversed differently
- AI generation favors **procedural variation of a small location set**.

### 5. Monetization?
- **Premium / buy-once** (Lethal Company, PEAK) — $10–20
- **Free with DLC** — riskier
- **Free-to-play + cosmetics** — only viable at huge scale
- Premium at low price is **the genre's commercial pattern**.

## Reference games and the mechanism that makes each work

**Lethal Company** — *the proximity voice + procedural moons combination*. Zeekerss (solo dev) made $50M+ by leveraging proximity voice to turn co-op horror into a *streaming format*. The game's "monsters" are mostly simple — the player reactions are the show. **This is the template.**

**R.E.P.O.** — *physics-based loot carrying as a comedy engine*. Players carry fragile items together; one slip and everyone yells. Physics turns scavenging into slapstick. Demonstrates that the **objective mechanic itself** can produce laughter, not just the horror.

**PEAK** — *the mountain as the enemy*. No monsters, just climbing. The fear is environmental — heights, weather, getting lost. **Massive success on a tiny content footprint**. Shows that "horror" can mean unease, not just monsters.

## Death traps to avoid

- **No proximity voice or distance attenuation** — kills the genre's primary mechanic
- **Forgetting the "what now" moment after a teammate dies** — design so a 2-player run is still scary; some games collapse to "just exfil" once one dies
- **Threats that always kill** — players need **near-misses**. A monster that always insta-kills is a slot machine. A monster that almost catches you 5 times per mission is a story.
- **Loadouts that solve the threat** — if optimal gear trivializes the danger, retention dies. Threats should escalate **with the player's gear**, not be solved by it.
- **Locations too small** — players need **separation distance**. A 1-room dungeon defeats proximity voice.
- **Lobby friction** — joining a friend's game must be 1-click. Steam invite + lobby code is mandatory.
- **No clip-shareable moments** — design **specific funny / scary set pieces** that work as out-of-context 30-second clips for TikTok.

## Recommended scope for AI generation

This genre is **surprisingly AI-amenable**:

| Component | AI quality |
|---|---|
| Monster designs (visual + simple AI) | ✅ Good |
| Location / room generation | ✅ Good |
| Items / loot variety | ✅ Excellent |
| Networking / lobby | ❌ Hard — use middleware (Mirror, Photon, Steam P2P) |
| Voice chat infra | ❌ Use Steam Voice or middleware |
| Threat AI behavior trees | ⚠️ Medium — needs care |
| Audio (ambient + stings) | ⚠️ Medium |
| Procedural maze/dungeon | ✅ Excellent |

**Realistic v0.1**: 4-player co-op, 1 location with procedural variation, 3 monster types, 8 item types, simple mission objective, Steam P2P networking. **A skilled team can ship this in 6–10 weeks** with strong tooling.

## MVP scaffold (output this first)

```
# [Game Name] — Co-op Horror Design Doc v0.1

## Pitch (one sentence)
[20 words: setting + the central panic source + tone]

## Core promise
- "What does a 30-second clip from this game look like?"
- "Why would my friends play with me on a Friday night?"

## Player count + voice
- Supported: 2-4 players (or 2-6)
- Voice: proximity (mandatory) + optional radio
- Voice attenuation: distance + walls

## Setting / location
- 1 primary location with procedural variation
- Theme references
- 5+ "zones" within the location with distinct visuals

## Threat design (3 monster types or environment hazards)
| Name | Behavior | Detection | Counter-play |
|---|---|---|---|

## Objective
- Primary: [collect / extract / ritual]
- Failure: [death cap / time limit / monster kills]
- Success measure: [items extracted / objective completed]

## Loot / item design
- 8 item types for v0.1
- Categories: [valuable / utility / consumable]
- Carry mechanics (physics? slots? weight?)

## Death rules
- Spectate after death (yes/no)
- Voice availability after death (yes/no/distorted)
- Revivable by teammates? (yes/no)

## Persistent meta
- Ship / hub between missions
- Currency: [name]
- Permanent upgrades: [3-5 for v0.1]

## Networking
- P2P or dedicated server: [P2P recommended for v0.1]
- Library: [Mirror / Steam Networking / Photon]
- Lobby creation: 1-click via Steam invite

## Clip-shareable set pieces
- 3 "this is the kind of moment that will go viral" sequences

## What's OUT of scope for v0.1
- Crossplay, mod support, additional locations, ranked / competitive
```

## See also

- `survivors-likes` for solo horde-survival
- `roguelikes` if individual runs become permadeath single-player
- Future `streamer-bait-design` skill (Layer 2) — virality optimization
