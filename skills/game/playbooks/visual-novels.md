# Designing Visual Novels

## When to use this skill

The user wants a game where:
- The primary verb is **reading**
- Visuals are **mostly static** (sprites + backgrounds, occasional animation)
- Player choices **branch the story** (or shape a relationship meter, or both)
- Endings are **multiple and meaningful** — replay value comes from seeing different paths
- Combat / arcade gameplay is **absent or minimal**

If branching is purely cosmetic and the story is linear (kinetic novel), this skill still applies — the differences are noted below.

## The genre in 30 seconds

Visual novels are **the literary form of games**. They strip out everything except character, voice, and choice. Commercially this genre **dominates itch.io's paid charts** (Touchstarved, Scarlet Hollow, A Date with Death all sustained top-5 status). The hook is:
1. A small number of strong characters (typically 3–6)
2. Meaningful choices that **reveal character**, not just branch story
3. **Multiple endings** that recontextualize the journey

The best VNs are read 3–7 times by their fans.

## The core loop (the heartbeat)

```
[Dialogue / narration block (50-300 words)]
  │
  ▼
[Sprite + background changes for mood]
  │
  ▼
[Choice point: 2-4 options]
  │
  ▼
[Branch story or update affinity/route meter]
  │
  ▼
[Continue reading]
```

A typical VN session is **30–90 minutes uninterrupted** — much longer than other genres. Sessions are bookended by save points (auto or manual).

## Required screens / states

1. **Title menu** — new game, load, settings, gallery (CG unlocks)
2. **Main dialogue screen** — sprite(s), background, text box, name plate
3. **Choice screen** — 2–4 buttons
4. **Save / load** with **30+ slots** (genre standard; players collect saves like bookmarks)
5. **Settings** — text speed, auto-advance, voice volume, skip-read
6. **CG gallery / character bio screen** — unlocks as player progresses
7. **Route / chapter select** for replays
8. **Ending list** — shows seen vs unseen endings (often spoiler-coded)
9. **(Optional) Affinity / relationship meters** — visible or hidden depending on design

## The 5 decisions you must make

### 1. Branching depth?
- **Kinetic novel** — no choices, pure linear (Higurashi, Umineko first arcs)
- **Single-axis branching** — choices affect 1 meter, 3–5 endings
- **Multi-axis branching** — choices affect multiple character affinities, 10+ endings
- **Full branching tree** — every choice meaningfully diverges paths (rare, expensive)
- Multi-axis is the commercial sweet spot. **3–6 endings, 3–6 main routes.**

### 2. Choice frequency and cost?
- **Every 5 minutes** (Doki Doki feel) — choices feel constant
- **Every 15 minutes** (Steins;Gate) — choices feel weighty
- **Every chapter** (Slay the Princess) — choices are major story branches
- Frequent choices = engagement, but most have minor effect. Pace the **truly route-defining choices** to feel rare.

### 3. Visual style?
- **Anime sprites** (Doki Doki, otome) — large pre-rendered character art with expression variants
- **Painted illustration** (Slay the Princess) — atmospheric, often horror-aligned
- **Pixel art** (some indie VNs)
- **CG events** — full-screen illustrated moments at key beats (10–30 per game is standard)

### 4. Mechanical layering?
Optional gameplay layered on top:
- **Pure VN** (most efficient, most AI-amenable)
- **VN + investigation** (Ace Attorney — present evidence)
- **VN + relationship management** (dating sim with stat-raising)
- **VN + light puzzle** (Phoenix Wright cross-examinations)
- More layers = more design work. Pure VN is the most shippable scope.

### 5. Tone?
- **Cozy / romantic** — otome, dating sim
- **Horror / psychological** — Slay the Princess, Doki Doki
- **Thriller / mystery** — Ace Attorney, 999
- **Slice of life** — comfy school stories
- Tone determines everything else: choice structure, ending count, character archetypes, art style.

## Reference games and the mechanism that makes each work

**Doki Doki Literature Club** — *meta-narrative betrayal*. Presents itself as a cute dating sim, then breaks its own frame (file corruption, character self-awareness, fourth-wall demolition). The lesson: VNs can do things other genres can't because **the medium itself becomes a tool**. The character files are part of the game.

**Slay the Princess** — *every choice rewrites the world*. Players who try to "be good" find every choice is morally compromised. The branching isn't tree-shaped; it's a graph that **rewrites prior choices** based on current ones. Demonstrates choice design beyond "pick A or B."

**A Date with Death** — *the chat-app interface as the entire game*. Story unfolds through fake messaging app screens. Players choose how to text a character; the visual novel is reframed as a romance simulator via the interface. Interface innovation matters as much as story.

## Death traps to avoid

- **Walls of text without sprite changes** — every 100 words minimum, the sprite expression, background, or speaker should change. Players read with their **eyes** as much as their minds.
- **Meaningless choices** — "Do you say 'hi' or 'hello'?" feels insulting unless it later pays off. Every choice must either: (a) reveal character (player's or NPC's), (b) shift an affinity, or (c) branch story. **None of the above = cut the choice.**
- **No skip-read function** — replays are the genre's main retention loop. Players MUST be able to **skip already-read text instantly** (hold Ctrl). Without skip, replay dies.
- **Hidden affinity meters that cause no-win states** — if players unknowingly lock themselves out of a route, they feel cheated. Either **show affinity transparently** or **avoid one-way locks** until the final act.
- **Stretching word count for "value"** — players measure VN quality by **emotional density per minute**, not by total word count. A tight 4-hour VN beats a bloated 20-hour one.
- **Bad sprite expression range** — each character needs **6+ facial expressions minimum**. Otherwise emotional beats fall flat.

## Recommended scope for AI generation

**This is one of the two most AI-amenable genres** (along with survivors-likes). Reasons:
- Content is text — LLMs are great at text
- Visuals are static — image gen handles sprites + backgrounds well
- Logic is straightforward (choice → variable change → branch)
- No real-time systems, no physics, no AI behavior

| Component | AI quality |
|---|---|
| Dialogue writing | ✅ Excellent (with strong character voice prompts) |
| Choice design | ✅ Good |
| Branching logic | ✅ Excellent (clear state machines) |
| Character sprites (anime style) | ✅ Excellent with current models |
| Background art | ✅ Good |
| CG events | ✅ Good |
| Music | ⚠️ Medium |
| Voice acting | ⚠️ Variable (TTS quality dependent) |
| Continuity / character voice consistency across long stories | ⚠️ Medium — needs prompt scaffolding |

**Realistic v0.1**: 5 characters, 3 main routes, 6 endings, 50,000 words, 30 sprite expression sets, 10 backgrounds, 8 CG events. **2-week ship target with strong tooling.**

## MVP scaffold (output this first)

```
# [Game Name] — Visual Novel Design Doc v0.1

## Pitch (one sentence)
[20 words: setting + tone + the central conflict]

## Tone & inspiration
- Reference works (games / books / films, 3 minimum)
- Tonal one-liner ("Persona meets Yellowjackets" style)

## Cast (5 characters for v0.1)
| Name | Role | Personality (3 traits) | Sprite expressions needed | Route? |
|---|---|---|---|---|

## Story spine
- Act 1: introduction (~10,000 words)
- Act 2: branching point (~25,000 words)
- Act 3: route-specific resolution (~15,000 words per route)

## Routes (3 minimum)
| Route | Triggered by | Themes | Ending count |
|---|---|---|---|

## Ending list (6 minimum for v0.1)
| Ending | Conditions | Tone | Words |
|---|---|---|---|

## Choice cadence
- Major choices: [N] total, at points X, Y, Z
- Minor choices: [N] total, affecting affinity
- Affinity variables tracked: [list]

## Visual asset list
- Backgrounds: [N] for v0.1
- Sprite expression sets: [N characters × ~6 expressions]
- CG events: [N], one per major scene

## Engine recommendation
- Ren'Py (Python, free, industry standard)
- Twine (browser, simpler, less control)
- Godot + Dialogic (more flexible)

## What's OUT of scope for v0.1
- Voice acting, mini-games, mature content, sequel hooks
```

## See also

- `puzzle-games` if mystery/investigation gameplay layers in
- `roguelikes` for narrative roguelikes (story-driven roguelite hybrids)
- Future `dialogue-voice-consistency` skill (Layer 2)
