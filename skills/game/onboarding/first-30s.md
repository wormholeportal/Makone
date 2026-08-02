# First 30 seconds — they determine retention

> **Within 30 seconds of player clicking "start" must:
> 1) Use core verb 5+ times independently, 2) experience complete feedback loop, 3) complete one micro-victory.
> Fail → 50%+ player churn.**

## One-liner

Game's "impression" solidifies in first 30 seconds.
After 30 seconds player either "want one more" or "never mind."
No third state between.

## Why

Attention economy:
- Player has 100 games to choose from
- First launch = decide whether to give "sustained attention"
- First 30 seconds both tutorial and sales pitch

Industry data:
- Mobile D1 retention usually < 30% (70% uninstall within 24 hours)
- Churn peaks: before tutorial end / first failure
- Tutorial > 5 minutes: churn doubles

Console/PC players more tolerant, but **first 5 minutes determines remaining hours** still holds.

## Quantified standards

**7 elements in first 30 seconds**:

1. **0-3 sec**: Game starts (no logo ocean, direct enter)
2. **3-10 sec**: Player instinctively tries controls → immediate feedback
3. **10-15 sec**: Core verb used repeatedly, feels stable
4. **15-20 sec**: First small challenge (resolvable in seconds)
5. **20-25 sec**: Overcome, immediate feedback (particles, score, unlock)
6. **25-30 sec**: Second challenge introduced, difficulty ramps = "I got stronger"
7. **30 sec**: Player's hands on screen/keyboard, can't stop

If player stares at logo / load / text popup 15 sec → already lost 30%.

## Classic example: Super Mario 1-1

Nintendo's "zero-text teaching" textbook. First 30 seconds:

```
0:00  Screen shows 1-1, blue sky + grass + Mario center
0:01  Player tries arrow keys → Mario walks
0:05  Player reaches first ? block (yellow, obvious) → jumps → gets mushroom
0:08  Mushroom rolls ground → player instinct dodge → hits → grows!
0:12  Continue right, meet first Goomba
0:14  Try touching → die. Or try jump over → land on Goomba head → kill
0:18  First successful "stomp enemy" → dopamine spike
0:22  Reach first pipe → player instinct jumps over
0:25  Second Goomba → player now confident → stomp dead
0:30  Player enters first deep flow, can't stop
```

Entire process **zero text**. All teaching embedded in level geometry.

## Classic example: Vampire Survivors

Aggressive "direct entry" design:

```
0:00  Main menu pick character (5 sec)
0:05  Enter game, character auto-attacking
0:08  Player discovers self just moves
0:15  First enemy wave, player just walks away
0:20  Upgrade menu pops → pick buff (30+ options, random 3)
0:25  Buff active, damage visibly climbs
0:30  Another upgrade wave, player already thinking "which build"
```

Core verb (movement) + decision (upgrade pick) both experienced in 30 sec.
Game sold 10 million copies.

## Antipatterns

- **Some AAA games open with 15 minutes cutscene**: player thinks bought movie.
- **MMORPG 5 minutes "race choice + appearance customize"**: fatigued before playing.
- **Forced 30-minute tutorial level**: equals "school" → not entertainment.
- **First challenge instant death**: player frustrated → quits.
- **Text popup + must read to continue**: breaks flow.

## 6-step design method

### Step 1: Delete all deletable opening content

- ❌ Logo sequence (10+ sec)
- ❌ "Press any key to start"
- ❌ Warning text (headphones / seizure etc)
- ❌ Options menu hints
- ❌ Main menu (direct to first level)

Game can keep logo, but **skip by default** or **click skips immediately**.

### Step 2: Let player control at second one

```
Level loads → player can move immediately → no opening cutscene first
```

If must have cutscene, accept input during (many Nintendo games cutscene accelerates with A).

### Step 3: First action must succeed

New player first press W, must work (walk). Absolutely never design "must nail controls" before 10 sec.

### Step 4: First "wow" moment

Player does right thing → huge burst feedback:
- Screen shake
- Particles
- Sound
- Slow-mo
- "+10" score flies

Make brain release dopamine. This is "one more run" physiology.

### Step 5: Introduce interesting choice

Don't still be "press W walk" at 30 sec.
20-30 sec give player **first interesting decision** (upgrade / path / resource).

Make player feel "game has depth."

### Step 6: Naturally transition to challenge

By 30 sec player should already:
- Continuously press action key
- Think next decision
- Anticipate next upgrade

Then introduce "first proper enemy / level / puzzle." Player **already invested** → willing to challenge.

## Makone / Three.js implementation

**Anti-pattern**: current Makone games (neonserpent, sweetdefense) open:

```
1. showMessage('NEON SERPENT', 'A/D STEER · SPACE BOOST · COLLECT ORBS')
2. setTimeout(hideMessage, 3000)  // 3 sec text
3. Then wait Wave 1 spawn (2-3 sec)
4. Total 5-6 sec player reading + waiting
```

**Improvement**:

```js
// 1. Don't 3 sec text. Fade in 1 sec, game starts simultaneously
showMessage('NEON SERPENT', 1000)

// 2. Player can control immediately
//    Enemy wave 0: 1 weakest enemy, practice target

// 3. Player moves → orb appears immediately ahead (not far)
//    Walk 2m get → big feedback

// 4. 5 sec first upgrade (earlier than normal)

// 5. 10 sec first proper wave
//    Player felt: movement, orb, upgrade, attack
//    Each verb experienced → knows what game does
```

**Template code**:

```js
function setupOnboarding() {
  // T+0: player can move immediately
  // T+0: one orb 2m ahead of player
  spawnOrb(playerPos.x, playerPos.z - 2)
  
  // T+3: first weakest enemy (with telegraphing warning)
  setTimeout(() => {
    showWarning('Enemy approaching!')
    spawnEnemy('weakest', someDistance)
  }, 3000)
  
  // T+8: first upgrade opportunity
  setTimeout(() => {
    showUpgradeChoice(['attack +30%', 'speed +30%', 'health +50'])
  }, 8000)
  
  // T+12: first wave
  setTimeout(() => {
    startWave(1)
  }, 12000)
}
```

## Test method

Let stranger play 30 sec, observe:

- 0-5 sec: trying controls?
- 5-15 sec: self-exploring?
- 15-30 sec: feel "I did right"?
- 30 sec end: still playing? (key metric)

If stops confused at any point → redesign there.

## Longer games "first hour"

30 sec minimum window. Long games (>10 hours) have second level: first hour.

First hour:
- Introduce all **core mechanics** (not necessarily all used)
- Set up story / world (maintain interest)
- Give player "first character build"
- Introduce first **truly hard** challenge

If first hour still "teaching," 60% players quit.

## Antipatterns

### 1. Tutorial as separate level

Forced 30-minute tutorial level → equals "school."
**Correct**: embed teaching **in first level**.

### 2. Popups everywhere

"Press W move! Space jump! E pickup!" → player doesn't read, forgets after close.
**Correct**: level design itself is teaching.

### 3. First challenge instant death

Player doesn't know dodge → dies → frustrated → quits.
**Correct**: first challenge allows 1-2 failures but non-lethal.

### 4. Too-long opening dialogue

NPC 5 minutes monologue explaining world → player wants skip → skips so doesn't understand.
**Correct**: explain while playing. Important story **shown in level** not dialogue.

### 5. Wait for Wave 1

My recent Makone games often "open 5 sec waiting for enemy spawn."
**Correct**: open with interactive object (item / weak enemy / exploration goal).

## Related skills

- `skills/game/axioms/play-teaching.md` — teaching methodology
- `skills/game/axioms/core-loop.md` — core verb must feel good in 30 sec
- `skills/game/axioms/feedback-latency.md` — 30-sec feedback can't delay
- `skills/game/onboarding/progressive-disclosure.md` — concept reveal pacing

## References

- *The Game Outcomes Project* data (D1 retention)
- Mark Brown, *Super Mario 3D World's 4-Step Level Design* (GMTK)
- Multiple deep analyses *Super Mario 1-1* (Eurogamer / Polygon)
- Edmund McMillen, *The Binding of Isaac* design postmortem
- *Vampire Survivors* design interview (Luca Galante)
