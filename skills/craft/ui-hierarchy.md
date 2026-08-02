# UI hierarchy — the HUD is two layers: persistent display and event notification

> **HUD must split into two layers:
> 1) Always-on (player constantly references: HP / time / resources) — corner of screen, doesn't block view
> 2) Event notifications (brief, attention-grabbing: level up / achievement / warning) — center fade in/out
> Mixing them = high info density = player distracted**

## One-liner

HUD is not "show all info", it's **"show the right thing at the right time"**.
Information overload worse than underload.

## Why

UI is player's interface to game. Bad design = even deep game unenjoyable.

Brain working memory 4±1 chunks (Miller's Law, see `progressive-disclosure.md`).
HUD displays 7+ numbers/icons simultaneously → players **ignore most**.
Important (HP) mixed with unimportant (FPS count) → player can't tell what's urgent.

**Good HUD = key info pops, secondary recedes, events capture attention**.

## Quantified standards

**Persistent HUD element count**:
- < 5 = excellent (player reads all at glance)
- 5-8 = borderline (start making tradeoffs)
- > 8 = information overload

**Screen real estate**: HUD shouldn't occupy > 20% of screen (player must see game world).

**Response time**: UI elements must reflect change within 100ms (see `feedback-latency.md`).
HP drops → HUD HP bar moves instantly, don't lerp 1 second.



## HUD's 5-layer structure

### Layer 1: Persistent Key (Always-on)

**Screen 4 corners**, always visible, player perceives in peripheral:

| Position | Content | Example |
|---|---|---|
| Top-left | Player health / primary resource | HP bar, mana |
| Top-right | Progress / time / score | Wave count, score, time |
| Bottom-left | Control hints / secondary resource | Boost meter, controls hint |
| Bottom-right | Context info / map | Mini-map, next checkpoint |

Center **always stays empty** (core game space).

### Layer 2: Contextual

Only appears in relevant context:
- **Item in pickup range** → show "E to pick up"
- **Enemy about to attack** → show warning icon
- **Quest progress update** → show "+1 enemy killed"

Disappears 1-3 seconds after appearing.

### Layer 3: Event Notifications

Briefly occupies center or large:
- **Level up** → screen center large "LEVEL UP"
- **Achievement unlock** → corner toast "Achievement Unlocked!"
- **Boss appears** → full-screen text "<BOSS NAME>"

Fades out 1-3 seconds later.

### Layer 4: Menu / Pause (Modal)

Game-interrupting UI:
- Pause menu
- Settings
- Choose build / upgrade
- Death screen

Open via player button press, game pauses.

### Layer 5: Debug / Dev UI

Dev mode only: FPS counter, entity count, position display.
Should not appear in player version.



## Classic examples

### Diablo II

Classic of classics:

- **Bottom-left**: HP (red orb) + buff icons
- **Bottom-right**: Mana (blue orb) + skills
- **Center-bottom**: skill bar + experience bar
- **Center**: always preserves game world
- All info visible at glance, player never moves eyes

20+ years later all ARPGs still copy it.

### Skyrim

Minimal HUD:

- HP / Mana / Stamina only during combat
- Otherwise just compass and crosshair
- Quest updates fade in at corner
- Player focuses on world exploration

### Hollow Knight

Center-top one row: HP (geo icon) + Mana (blue bottle) + Money (number).
That's it. Minimal. Player focuses on screen.

### Counter-Strike

- Center: crosshair (always)
- Top-left: HP / armor (small)
- Bottom-right: ammo (small)
- Top-right: score / time
- Center events: kill notification, site callout
All HUD yields to "see enemies clearly."



## Bad examples

- **MMO screen full of UI**: 100 buff icons + quest list + guild window + chat + shop → game window only 30% of screen.
- **Mobile pops "Congrats!" every second**: player numb → real important notifications ignored.
- **HUD occupies 50% screen**: player can't see enemies, how to play?
- **Key info small text** (HP display 8pt) → can't see → dies not knowing why.
- **UI blocks view above game**: common in "full-screen UI" from novice designers.

## Design principles

### 1. Important = large + high contrast

HP bar 5x larger than achievements + color prominent.
Player **perceives via peripheral** when HP critical.

### 2. Urgent = flashing / animation

```ts
// Flash when HP low
if (player.hp < 30) {
  hpBar.style.animation = 'pulse 0.5s infinite'
}
```

### 3. Unchanging hidden

Full HP = bar color stable → player ignores (saves attention).
Taking damage = color turns red + shakes → immediately noticed.

```ts
// Default green, turns red + shakes on damage
hpBar.style.background = `hsl(${120 * hpPct}, 80%, 50%)`  // 120 green → 0 red
if (hpJustDropped) hpBar.classList.add('shake')
```

### 4. Information hierarchy consistency

Font size, spacing, color all follow design system:
- Large (24px) = key numbers (HP, time)
- Medium (14px) = secondary (control hint)
- Small (11px) = auxiliary (FPS, version)

Don't mix randomly.

### 5. UI doesn't block core zone

```
Screen center 60% area ≈ player eye focus zone
→ persistent HUD must be outer 20%
→ center only on major events (boss name, level up, message)
```



## How to implement in Makone / Three.js

**Glassmorphism HUD template** (Makone uses this):

```ts
function createHUDPanel(opts: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
  content: string  // HTML
  width?: string
}) {
  const panel = document.createElement('div')
  const positions = {
    'top-left':     'top:16px;left:16px;',
    'top-right':    'top:16px;right:16px;text-align:right;',
    'bottom-left':  'bottom:16px;left:16px;',
    'bottom-right': 'bottom:16px;right:16px;text-align:right;',
    'top-center':   'top:16px;left:50%;transform:translateX(-50%);',
    'bottom-center':'bottom:16px;left:50%;transform:translateX(-50%);',
  }
  panel.style.cssText = `
    position:absolute;
    ${positions[opts.position]}
    ${opts.width ? `width:${opts.width};` : ''}
    background:rgba(20,12,8,0.32);
    backdrop-filter:blur(18px) saturate(160%);
    -webkit-backdrop-filter:blur(18px) saturate(160%);
    border:1px solid rgba(255,255,255,0.10);
    border-radius:12px;
    box-shadow:0 8px 24px rgba(0,0,0,0.3);
    padding:12px 16px;
    pointer-events:none;
    user-select:none;
    color:#fff;
    font:13px -apple-system,sans-serif;
  `
  panel.innerHTML = opts.content
  return panel
}

// Usage:
const hpPanel = createHUDPanel({
  position: 'top-left',
  content: `
    <div style="font-size:10px;letter-spacing:3px;opacity:0.5;text-transform:uppercase;">HP</div>
    <div id="hp-bar" style="width:120px;height:8px;background:#333;border-radius:4px;">
      <div id="hp-fill" style="width:100%;height:100%;background:#44ff44;border-radius:4px;"></div>
    </div>
  `
})
container.appendChild(hpPanel)

// Update:
function updateHP(pct) {
  document.querySelector('#hp-fill').style.width = `${pct * 100}%`
  // Color by health
  const color = pct > 0.5 ? '#44ff44' : pct > 0.25 ? '#ffaa44' : '#ff4444'
  document.querySelector('#hp-fill').style.background = color
}
```

**Event notification system**:



```ts
function showNotification(text, duration = 2000, style: 'info' | 'success' | 'warning' = 'info') {
  const colors = {
    info: '#88ddff',
    success: '#88ff88',
    warning: '#ff8844',
  }
  
  const notif = document.createElement('div')
  notif.style.cssText = `
    position:absolute;
    top:30%;
    left:50%;
    transform:translateX(-50%);
    font:200 40px sans-serif;
    color:${colors[style]};
    text-shadow:0 0 20px ${colors[style]}66;
    pointer-events:none;
    opacity:0;
    transition:opacity 0.3s;
  `
  notif.textContent = text
  container.appendChild(notif)
  
  // Fade in
  requestAnimationFrame(() => notif.style.opacity = '1')
  
  // Fade out + remove
  setTimeout(() => {
    notif.style.opacity = '0'
    setTimeout(() => notif.remove(), 300)
  }, duration - 300)
}

// Usage:
showNotification('LEVEL UP', 1500, 'success')
showNotification('Boss approaching!', 2000, 'warning')
```

## Anti-patterns

### 1. UI steals the show

UI higher contrast than game world → player stares at UI not game.
**Fix**: UI semi-transparent + edges + desaturated.

### 2. Information overload

Display every possible number (FPS, ping, HP/maxHP, HP%, shield, armor, resist, buff countdown...)
**Fix**: Only show info player "must decide on."

### 3. UI always in center

Every UI in screen middle → blocks game.
**Fix**: Keep center clear for game. UI in corners.

### 4. Excessive flashing

Every icon animating → player dizzied.
**Fix**: Only "pending" items flash, safe states stable.

### 5. Inconsistent style

Different panels use different fonts / colors / rounded corners → looks pieced-together.
**Fix**: Define design system, unified style.

## Testing methods

**5-second glance**: screenshot 5 sec, ask player "How much HP?"
- Says instantly → HP UI success
- Has to look → not prominent enough

**Movement test**: Does player eye need to leave game world to check UI?
- Yes → UI too far / too hidden
- No (peripheral perception) → design success

## Related skills

- `skills/craft/contrast-hierarchy.md` — UI elements follow contrast hierarchy
- `skills/craft/color-grammar.md` — UI color coding
- `skills/craft/affordance-design.md` — button / link affordance
- `skills/game/axioms/feedback-latency.md` — UI response must be instant
- `skills/game/axioms/play-teaching.md` — less UI is better



## References

- *The Design of Everyday Things* — Don Norman
- *About Face* — Alan Cooper
- *Designing Interfaces* — Jenifer Tidwell
- *The User Experience Team of One* — Leah Buley
- Mark Brown, *Game UI* episodes (GMTK)
- *Diablo II* UI breakdown (Blizzard postmortem)
