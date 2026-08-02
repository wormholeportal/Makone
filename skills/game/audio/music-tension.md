# Music tension — music is the player's emotional conductor

> **Music tells player "what to feel now" — calm / explore / tense / danger / climax / victory.
> Dynamic music (adapts to game state) beats static BGM 10x over.
> Great music turns mediocre game into masterpiece; bad music turns masterpiece into mediocre.**

## One-liner

Player emotion 90% follows music not story.
Music changes = player psychology changes.
Designer uses music layers to control player's feeling every moment.

## Why

Music acts directly on brain's limbic system (emotion center), **bypasses reason**.
You don't need to "understand" music, just hear it and feel (horror-movie music vs comedy-music instantly distinguishable).

Games need adaptive music more than film:
- Film music fixed (director timed it)
- Game player speed varies, events happen unknown
- Must use **dynamic music** (horizontal/vertical remixing)

Classic *Halo*, *Doom*, *Hades* success half due to music design.



## Quantified standards

**Music layers** (recommend 4-8 cues per game):

| Cue | Purpose | Example |
|---|---|---|
| **Main Theme** | Title screen / main menu | Main melody shows game spirit |
| **Exploration** | Normal play | Slow rhythm, loopable non-annoying |
| **Combat Lo** | Encounter enemy | Rhythm builds |
| **Combat Hi** | Intense battle | High intensity + drums |
| **Boss** | Boss fight | Thematic + signature |
| **Victory** | Victory | Short melody |
| **Failure** | Death | Short deep |
| **Stinger** | Key moment | Few sec sharp note |

**Transition time**: crossfade ≤ 2 sec.
Longer = player notices "music switch bug."



## Three ways to implement dynamic music

### 1. Horizontal Re-sequencing

Game switches from one cue to another.

```
[Exploration loop] → [Combat Hi] → [Victory] → [Exploration loop]
```

**Pros**: simple, works for most games.
**Cons**: switch can be abrupt.

**Implementation**:

```ts
const tracks = {
  exploration: new Howl({ src: '/music/explore.mp3', loop: true, volume: 0.5 }),
  combat: new Howl({ src: '/music/combat.mp3', loop: true, volume: 0 }),
  boss: new Howl({ src: '/music/boss.mp3', loop: true, volume: 0 }),
}

tracks.exploration.play()
tracks.combat.play()  // play simultaneously but volume 0
tracks.boss.play()

function transitionTo(name: string) {
  for (const [key, track] of Object.entries(tracks)) {
    track.fade(track.volume(), key === name ? 0.5 : 0, 1500)
  }
}

// Trigger:
events.on('combat:started', () => transitionTo('combat'))
events.on('combat:ended', () => transitionTo('exploration'))
events.on('boss:appeared', () => transitionTo('boss'))
```

### 2. Vertical Re-orchestration

Same music has layers (drums, bass, melody, brass), add/remove layers by game state.

```
Calm → strings only
Low combat → strings + drums
High combat → strings + drums + bass
Boss → all + brass
```

**Pros**: ultra-smooth, no gaps between cues.
**Cons**: complex composing, needs dedicated composer.

**Classics**: *Halo*, *Hades*, *Doom Eternal*.

**Implementation** (each stem plays independently):

```ts
const stems = {
  strings: new Howl({ src: '/music/strings.mp3', loop: true, volume: 0.5 }),
  drums:   new Howl({ src: '/music/drums.mp3', loop: true, volume: 0 }),
  bass:    new Howl({ src: '/music/bass.mp3', loop: true, volume: 0 }),
  brass:   new Howl({ src: '/music/brass.mp3', loop: true, volume: 0 }),
}

// All stems play simultaneously, synchronized
Object.values(stems).forEach(s => s.play())

function setIntensity(level: 0 | 1 | 2 | 3) {
  const volumes = [
    { strings: 0.5, drums: 0,    bass: 0,    brass: 0    },  // 0
    { strings: 0.5, drums: 0.5,  bass: 0,    brass: 0    },  // 1
    { strings: 0.5, drums: 0.5,  bass: 0.5,  brass: 0    },  // 2
    { strings: 0.5, drums: 0.5,  bass: 0.5,  brass: 0.5  },  // 3
  ][level]
  for (const [k, v] of Object.entries(volumes)) {
    stems[k].fade(stems[k].volume(), v, 1000)
  }
}

// Trigger:
events.on('combat:intensified', () => setIntensity(2))
```

### 3. Procedural / Generative

Code generates music, real-time synthesis by game state.

**Pros**: Infinite, never repeats.
**Cons**: Quality hard to control, usually worse than human composer.

**Good for**: Simulators, roguelikes, special experiences.
**Bad for**: Story-driven games.

**Classics**: *No Man's Sky* (65daysofstatic), *Spore* (Brian Eno).



## Emotion curve design

Over 30 min game, music mood should rise and fall:

```
Emotion ↑
       │     Climax(boss)
       │      ╱╲
       │     ╱  ╲
       │    ╱    ╲      Victory
       │   ╱      ╲    ╱
       │  ╱        ╲╱
       │ ╱  Calm
       │╱
       └──────────────────→ Time
       Explore → Tense → Combat → Release
```

**Contrast** = tension.
Maximum volume all time = player numb.
Set "music low points" to make "climax" stand out.



## Classic examples

### Halo: Combat Evolved

Marty O'Donnell uses horizontal re-sequencing:
- Exploration: mysterious choir
- Combat: rhythm picks up
- Boss: signature melody
- Death: fade out

Became game music history's textbook case.

### Doom Eternal

Mick Gordon uses vertical re-orchestration:
- Player takes damage → drums decrease
- Player kills spree → drums double + heavy metal guitar layers
- Player uses chainsaw → choir joins

Makes metal music the carrier of player "achievement feeling."

### Hades

Darren Korb uses horizontal + thematic variation:
- Each room has unique BGM cue
- Boss fights have dedicated BGM
- Death has dedicated exit song ("Good Riddance")
- After restart quietly swaps different cue

100 hours without repeating (players specifically praise music).

### Journey

Austin Wintory uses dynamic music to support emotion curve:
- Player exits desert moment → music shifts from desolate → majestic
- Game's emotional climax = music's emotional climax

Oscar nomination (first game music ever).

## Bad examples

- **Same BGM loops 100 hours** → player mutes music.
- **Combat music never stops** → no tense-release rhythm → numb.
- **Abrupt music switch** (direct stop then play) → breaks immersion.
- **All situational music "epic"** (max intensity) → key moments lose power.



## How to implement in Makone

**Minimal dynamic music system**:

```ts
import { Howl } from 'howler'  // recommend howler.js for audio

class MusicManager {
  private current: Howl | null = null
  private cues = new Map<string, Howl>()
  
  load(name: string, src: string, volume = 0.5) {
    this.cues.set(name, new Howl({
      src: [src],
      loop: true,
      volume,
    }))
  }
  
  transition(name: string, fadeMs = 1500) {
    const next = this.cues.get(name)
    if (!next) return
    
    if (this.current === next) return  // already playing
    
    if (this.current) {
      const old = this.current
      old.fade(old.volume(), 0, fadeMs)
      setTimeout(() => old.stop(), fadeMs)
    }
    
    next.volume(0)
    next.play()
    next.fade(0, 0.5, fadeMs)
    this.current = next
  }
  
  stinger(src: string) {
    new Howl({ src: [src], volume: 0.8 }).play()
  }
}

// Usage:
const music = new MusicManager()
music.load('menu',        '/music/menu.mp3')
music.load('exploration', '/music/explore.mp3')
music.load('combat',      '/music/combat.mp3')
music.load('boss',        '/music/boss.mp3')

music.transition('menu')

// Trigger:
events.on('game:started',   () => music.transition('exploration'))
events.on('combat:started', () => music.transition('combat'))
events.on('boss:appeared',  () => music.transition('boss'))
events.on('boss:defeated',  () => {
  music.stinger('/music/victory-sting.mp3')
  setTimeout(() => music.transition('exploration'), 3000)
})
```



## Music design principles

### 1. Theme melody = game DNA

Game starts with signature melody (theme).
Then various cues are variations of theme (different rhythm, orchestration, key).
Player subconsciously feels "this is this game" unified feeling.

### 2. Silence

Moments without music more powerful than with.
**3 seconds silence** before key turning point hits harder than "epic music."

### 3. Let gameplay guide rhythm

Combat rhythm ≈ drum beat rhythm.
Player "hits to the beat" → flow explosion.

```ts
// 120 BPM combat music → attack rhythm suggests 0.5s intervals
// Let player naturally hit to beat
```

### 4. Don't make loop obvious

If music loops every 30 sec → player tired after 5 min.
**Fix**: Loop at least 2-3 min, or add random variation.

### 5. Player control

Offer independent "BGM volume" control.
Some players just want their own Spotify.

## Anti-patterns

### 1. One BGM whole game

Same loop 100 hours → player goes insane.
**Fix**: At least 5-8 cues rotating + switch by context.

### 2. Combat music never stops

Every enemy is boss-level → no tension-release.
**Fix**: Small enemies use lo combat, bosses use hi.

### 3. Abrupt switching

Direct stop + play → breaks immersion.
**Fix**: Fade 1-2 sec.

### 4. Music overpowers SFX

Player can't hear own footsteps / attacks → loses game feel.
**Fix**: BGM ≤ 60%, SFX 80-90%.

### 5. No emotion anchor

Every music section style different → no unified feeling.
**Fix**: All cues share thematic motif (leitmotif).

## Related skills

- `skills/game/audio/feedback-sound.md` — SFX and BGM coordination
- `skills/game/mechanics/difficulty-arc.md` — difficulty curve = music emotion curve
- `skills/game/feel/juicing.md` — music in juice

## References

- *A Composer's Guide to Game Music* — Winifred Phillips
- *Composing Music for Games* — Chance Thomas
- *Game Music Connect* years of talks
- *Halo* music design (Marty O'Donnell, GDC)
- *Doom (2016)* / *Doom Eternal* (Mick Gordon, GDC)
- *Hades* music postmortem (Darren Korb)
- *Journey* OST analysis (Austin Wintory)
