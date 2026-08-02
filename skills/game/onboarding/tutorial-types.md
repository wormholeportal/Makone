# Tutorial types — five kinds, and mixing them fails

> **Tutorial is not "show UI popup." There's implicit (level design), explicit (popup), contextual (first trigger), optional (player clicks), mandatory (can't skip).
> Each fits different situations, mixing = player frustrated.**

## One-liner

Games need "teaching," but not "open tutorial mode make player watch 30 minutes."
Identify what teaching needed, use only that.



## Why

Tutorial goal = let player **learn to play** + **stay interested**.
Different contexts need different intensity:

- **Simple core verbs** (move / jump) → implicit (level guide)
- **Important but rare** (special skill) → contextual (hint when used)
- **Complex systems** (crafting / shop) → optional (player clicks to learn)
- **Brand new mechanic** (first time) → explicit (short popup)
- **Absolutely must learn** (can't play without) → mandatory (pause to teach)

Mixing = player interrupted by different teaching styles → frustrated.



## Five tutorial types

### 1. Implicit Teaching

No "tutorial" text, **teach via level design** let player self-learn.

**Applies to**: Core verbs (move / jump / attack).

**Example**: Mario 1-1 (see `skills/game/axioms/play-teaching.md`).
Player exits left side of screen → naturally walks right → meets Goomba → naturally tries jump.

**Pros**: Completely immersive, player doesn't know they're learning.
**Cons**: High design cost (level must be carefully crafted).
**When to use**: Core mechanic + you're willing to spend time on level design.

### 2. Contextual Teaching

**Brief hint** when action becomes available, disappears after 1-2 uses.

**Applies to**: Occasional actions (pickup / interact / switch weapon).

**Example**:
```
Player walks near chest → screen center briefly shows "Press E to open"
Player presses E once → hint never reappears
```

**Pros**: Player focuses on game, hint only when needed.
**Cons**: Player forgets action later without review.



**Implementation**:

```ts
const shownHints = new Set<string>()

function showContextHint(key: string, text: string) {
  if (shownHints.has(key)) return  // show only once
  shownHints.add(key)
  
  const hint = createHintElement(text)
  document.body.appendChild(hint)
  setTimeout(() => hint.remove(), 3000)
}

// Trigger:
function onApproachInteractable(obj) {
  showContextHint(`pickup_${obj.type}`, 'Press E to interact')
}
```

### 3. Optional Teaching

Player **actively seeks** when they want (menu / help / NPC).

**Applies to**: Complex systems (crafting tree / economy / skill points).

**Examples**:
- Shop NPC says "want to learn trading?" → player clicks "yes" to start
- Settings menu has "Tutorial Mode" button
- Pause menu "How to Play" section

**Pros**: Doesn't interrupt core play. Veterans not bothered.
**Cons**: Newcomers might miss the option.

**Implementation**:
```ts
// Add "Help" to pause menu
function openHelp() {
  // Show categorized visual tutorials
  // Player can close
}
```

### 4. Explicit Teaching

Proactive popup / text tells player "this key does what."

**Applies to**: First time unlocking new mechanic.

**Example**:
```
Player levels up, gets dash → screen pops
  ┌─────────────────────────┐
  │   DASH UNLOCKED          │
  │   Press SHIFT to dash    │
  │   [OK]                   │
  └─────────────────────────┘
```

**Pros**: Clear, player won't miss.
**Cons**: Breaks immersion; too many = annoying.

**Implementation notes**:
- Text < 20 chars
- One image beats thousand words (animated demo)
- Don't force player to read fully (auto-disappear or X)

### 5. Mandatory Teaching

Player **must** learn or can't continue.

**Applies to**: Game core mechanic player never encountered (VR, special controls).

**Examples**:
- *Portal* level 1: teach portals
- First GTA mission: teach driving
- Ring Fit Adventure: teach controller

**Pros**: Guarantees player learns.
**Cons**: Drags veteran players / speedrunners / replay.

**Improvements**:
- Make mandatory teaching also **normal level** (looks like regular play)
- Offer "skip tutorial" option (good for second run)
- Teaching < 5 minutes



## Decision matrix

| Player "must learn" | Player "will encounter" | Complexity | Recommended |
|---|---|---|---|
| Yes | Yes | Simple | Implicit (level design) |
| Yes | Yes | Complex | Mandatory + Implicit |
| Yes | No (rare) | Simple | Contextual |
| Yes | No | Complex | Explicit |
| No (advanced) | No | Any | Optional |



## Classic examples

### Portal 2 teaching

Perfect combination:
- Implicit (level shape tells you where to open door)
- Explicit (GLaDOS narrates new mechanic)
- Mandatory (must use mechanic to pass level)

60% of game is teaching + testing, but player feels "difficulty increasing."

### Hollow Knight

- Mainly **implicit** (level design)
- Occasional contextual (small hints picking up new items)
- **Almost no** explicit popups
- No optional tutorial menu

Player learns through exploration, gets lost if they don't like it (design choice).

### Civilization

- Heavy **optional teaching** (advisor system)
- Player has question → click advisor → pops explanation
- Veterans turn off advisor

Standard for complex games.

### Genshin Impact

Bad example:
- First 30 min **mandatory teaching** (can't skip)
- Teaches 5 mechanics simultaneously (violates `progressive-disclosure.md`)
- Popups + character dialogue + quest list all at once
- Veterans have to re-experience with second character

Caused lots of player complaints.



## Bad examples

- **30-min tutorial on new game** (mandatory can't skip) → player quits.
- **Every action pops hint** ("Press W to walk / Press A to turn / Press Space to jump") → player annoyed.
- **No teaching at all** (except "press ? for help") → player doesn't know where ?.
- **Teaching text too long** (200 words explaining one mechanic) → player skips.

## Design principles

### 1. Use least-disruptive method

By "disruption level":
- Implicit (0 disrupt) > Contextual > Optional > Explicit > Mandatory

Use implicit if possible, contextual if not, etc.

### 2. Teach only what's **necessary**

Game has 100 systems, don't teach all.
Player figures out 80% on their own OK.
Teaching covers only "die if we don't teach" core mechanics.

### 3. Teaching language ultra-minimal

```
✗ "Press the SHIFT key on your keyboard to perform a quick dash maneuver that allows you to..."
✓ "SHIFT → Dash"
```

### 4. Image > text

Animated GIF showing "press SHIFT character dashes" = player instantly gets it.
Text description = player might not read.

### 5. Player can skip on replay

Game has "skip tutorial" / "I've played before" option.

```ts
// Check localStorage for first launch
if (!localStorage.getItem('played_before')) {
  showMandatoryTutorial()
  localStorage.setItem('played_before', 'true')
}
```



## How to implement in Makone

**Generic hint system**:

```ts
class HintSystem {
  private shown = new Set<string>()
  
  contextHint(key: string, text: string, durationMs = 3000) {
    if (this.shown.has(key)) return
    this.shown.add(key)
    
    const el = document.createElement('div')
    el.style.cssText = `
      position:absolute;
      bottom:30%;
      left:50%;
      transform:translateX(-50%);
      background:rgba(0,0,0,0.6);
      color:white;
      padding:8px 16px;
      border-radius:8px;
      font:14px sans-serif;
      opacity:0;
      transition:opacity 0.3s;
      pointer-events:none;
    `
    el.textContent = text
    document.body.appendChild(el)
    requestAnimationFrame(() => el.style.opacity = '1')
    setTimeout(() => {
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 300)
    }, durationMs)
  }
  
  // Player forgot mechanic 30 sec unused? hint again
  reminder(key: string, text: string, conditionFn: () => boolean) {
    // ...
  }
}

const hints = new HintSystem()

// Contextual: in pickup range
if (distance(player, pickup) < 2) {
  hints.contextHint('pickup', 'Walk into items to collect')
}

// Explicit: unlock new ability
function unlockDash() {
  player.abilities.dash = true
  showBigText('DASH UNLOCKED — Hold SHIFT', 2500)
}
```

## Anti-patterns

### 1. Use dialogue for teaching

NPC's several screens of dialogue teaching controls → player skips.
**Fix**: Have NPC demonstrate, player follows.

### 2. Teach then don't let play

Teach 5 min play 30 sec → player feels "in school."
**Fix**: Teach 30 sec play 5 min.

### 3. No review after teaching

Player learns dash → 100 levels don't need dash → player forgets → can't use when needed.
**Fix**: After teaching, each level gives chance to use once.

### 4. Assume player read complete

Popup "press [icon] enter..." → icon fails to load → player confused.
**Fix**: Teaching needs fallback (text description + icon).

### 5. Repeat teaching

Veteran player second character must repeat tutorial → angry.
**Fix**: "You've played before! Skip tutorial?"

## Testing method

Newcomer test: let someone who never played 30 min.
- Does he use all basic mechanics within 5 min?
- Does he feel "tutorial too long" by 30 min?
- Can he figure out next step without hints?

Any "no" = teaching needs tweaking.

## Related skills

- `skills/game/axioms/play-teaching.md` — core teaching methodology
- `skills/game/onboarding/first-30s.md` — first 30 sec crucial
- `skills/game/onboarding/progressive-disclosure.md` — pacing
- `skills/craft/affordance-design.md` — affordance is strongest implicit teaching

## References

- *Universal Principles of Design* — progressive disclosure
- *The Design of Everyday Things* — Don Norman
- *Designing Better Tutorials* — Mark Brown (GMTK)
- *Portal* / *Half-Life 2* dev commentary
- Nintendo internal "3 step learning" guideline


