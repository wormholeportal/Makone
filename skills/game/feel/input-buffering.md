# Input buffering — press early, still execute

> **Cache any action input for 100-200ms and trigger it at the next legal moment.
> Don't punish players for pressing a few frames early — that's the game's job, not the player's.**

## One-liner

If the player presses Space while jumping is illegal, the game shouldn't ignore it.
Remember it, **trigger it at the next legal moment**. Then the player never loses to "but I pressed it."

## Why

Human button-press precision is ±100ms.
Even pro players can't hit "exactly the frame of landing."
Games without buffering force players to "press late to be safe" → violates natural prediction/reaction → impossible to learn.

Concrete example:
- Player presses Space mid-air (illegal)
- Landing happens 50ms later
- Player pressed 30ms early → no buffer = input discarded → lands without jumping → fails → curses "controls suck"

With buffer:
- Player presses 30ms early → buffer records "wants to jump"
- 50ms later lands → buffer consumed → automatic jump
- Player feels: perfect-timing jump
- Actual difference: <50ms, imperceptible

## Quantified standards

**Buffer window size**:
- 100ms: minimum, covers most players
- 150ms: standard (Celeste, Hollow Knight)
- 250ms: generous (OK for casual games)
- >400ms: player senses "delayed trigger"

**Test method**:
Press continuously during illegal window → enter legal window → verify auto-trigger.
Reverse test: press during legal window → trigger → press again immediately → verify it triggers at the next legal window (no duplicate firings).

## Application scenarios

Beyond jumping — **any action requiring "press at a keyframe" needs buffering**:

| Scenario | Illegal window | Legal window | Buffer save |
|---|---|---|---|
| Jump | airborne | landed | early press → immediate jump |
| Dodge | already dodging | dodge ends | early press → chain dodge |
| Combo | previous move plays | previous move tail | early press → next move chains |
| Getup | knocked down | getup available | early press → instant standup |
| Restart level | death fade animation | respawn | early press → respawn accepts input |
| Grab object | not in range / passed | contact moment | early press → auto-grab on contact |

## Good examples

- **Celeste**: jump, dash, wall-grab all buffered. Player never feels "I pressed but it didn't register."
- **Fighting games** (Street Fighter, KOF): cancel windows are buffer's advanced form — move endings allow early next-move input, making combos impossible in physics but perfect in buffer time.
- **Bayonetta**: dodge window starts 50ms after press, buffers 50ms of prior input.
- **Hades**: dodge-to-attack window is 200ms, players chain smoothly at any rhythm.

## Antipatterns

- **Early rhythm games**: tolerance ±30ms, player presses slightly early → miss. Intentional (demands precision), but even *Taiko no Tatsujin* relaxed to ±100ms for casual play.
- **Some hack-n-slash games with no cancel windows**: press attack 4 times, triggers 1 move + wait + 1 move = "controls unresponsive."
- **MOBAs with no ability buffer**: ability comes off CD in 100ms, player pressed early → no effect. Brutally demands players predict CD timers.

## How to implement in Makone / Three.js

**Generic buffer system**:

```js
class BufferedInput {
  constructor() {
    this.buffers = new Map()  // action → { time, ttl }
  }

  press(action, ttl = 0.15) {
    this.buffers.set(action, { time: performance.now(), ttl: ttl * 1000 })
  }

  tryConsume(action) {
    const buf = this.buffers.get(action)
    if (!buf) return false
    if (performance.now() - buf.time > buf.ttl) {
      this.buffers.delete(action)
      return false
    }
    this.buffers.delete(action)
    return true
  }

  has(action) {
    const buf = this.buffers.get(action)
    if (!buf) return false
    return performance.now() - buf.time <= buf.ttl
  }
}

const input = new BufferedInput()
window.addEventListener('keydown', e => {
  if (e.code === 'Space') input.press('jump')
  if (e.code === 'ShiftLeft') input.press('dash')
})

// in tick:
if (input.has('jump') && (grounded || coyoteTimer > 0)) {
  input.tryConsume('jump')
  jump()
}
if (input.has('dash') && dashCooldown <= 0) {
  input.tryConsume('dash')
  dash()
}
```

**Design points**:
- `press()` enqueues input
- `tryConsume()` fires at legal window (prevents duplicate trigger)
- `has()` checks without consuming

**Priority-buffering**:
Some games (fighting) need to pick highest-priority action when multiple pressed:

```js
// Space + Punch both pressed → prioritize Punch (if both legal)
const priority = ['punch', 'kick', 'jump']
for (const action of priority) {
  if (input.has(action) && canDo(action)) {
    input.tryConsume(action)
    perform(action)
    break
  }
}
```

## Symmetry with Coyote Time

| | Coyote Time | Input Buffer |
|---|---|---|
| Direction | tolerance **after** (still allow 100ms after leaving legal window) | tolerance **before** (accept input 100ms before legal window) |
| Player feel | "I thought I was still on ground" | "I thought I just pressed it" |
| Physics fact | already left | hasn't arrived yet |
| Combined effect | action window 200-300ms wide | but visually indistinguishable |

Both must ship together. Only one is doing half the job.

## Antipattern: buffer too wide

- **Buffer >500ms**: player senses "delayed trigger" — presses and wishes to take it back, already fired
- **Permanent buffer**: input from 5 seconds ago still executing → out-of-control feel
- **Same action buffers multiple times**: press Space 5 times, jump 5 times, can't stop jumping

Correct: `tryConsume()` pattern ensures one input = one trigger.

## Related skills

- `skills/game/feel/coyote-time.md` — Flip side, must ship together
- `skills/game/axioms/feedback-latency.md` — buffer makes "pressed" feedback immediate
- `skills/game/feel/hitstop.md` — in combat, buffer + hitstop smooths combos

## References

- Maddy Thorson, *Celeste & Forgiveness*
- Street Fighter / KOF series design docs (cancel window concept)
- Mark Brown, *Game Maker's Toolkit* — combo chapter
- Tom Francis, *Heat Signature postmortem* (buffer design)
