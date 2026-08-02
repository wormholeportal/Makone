# Opt-in vs auto-pickups — give the player consent over risky changes

## The principle

> **Pickups that materially shift the player's risk profile must require a
> deliberate input. Anything you brush into and instantly become trapped in
> is bad design.**

| Pickup type | Default behavior | Why |
|---|---|---|
| **Heal / ammo / coins / XP** | Auto-pickup on touch ✅ | Pure upside. Player has no reason to refuse. |
| **Temporary buff with no downside** | Auto ✅ | Same. |
| **Equipment swap** (replaces current loadout) | Opt-in ⚠️ | Player may not want to lose the current gun. |
| **Locked-in state** (vehicle, transformation, board) | Opt-in 🛑 | Player can't undo for N seconds. |
| **One-shot-die powerup** (speed boost with no recovery) | Opt-in 🛑 | Brushing into one = surprise death. |
| **Permanent effect** (cursed item, story flag) | Opt-in with confirmation 🛑 | Player must consent. |

## The skateboard case

In Adventure Island we put down skateboards (2× speed but one-hit-die). V1
made them auto-pickup on touch. **Result**: player runs forward, brushes a
skateboard, instantly mounts it, snail two meters ahead → dead.

The player didn't choose to mount. They didn't even know the board was there
until they were on it. The game gave them a knife and stabbed them with it.

V2 fix:
1. Walking past a board does nothing (still floats / bobs / animates).
2. When the player is **within range AND standing on ground**, the board
   visually responds: lifts up 0.18m, scales to 1.12×.
3. A floating prompt appears: **"↓ to mount"** in pink to match the board.
4. Pressing the dedicated mount key (Down/S) actually mounts.

Now the board is **available** instead of **automatic**. If the player wants
the speed, they take it. If they want to play safe, they walk past.

This is the same pattern as:
- Dark Souls bonfires (rest only when you press X)
- GTA cars (enter only when you press triangle)
- Mario kart powerups (use only when you press item button)
- Vampire Survivors chest-opens (collect first, level-up screen pauses)

## The 3 affordance components for opt-in pickups

Every opt-in pickup needs all three. Skip any and players get confused.

### 1. Proximity indicator (visual)

The pickup must visibly **respond when the player enters its activation
range**. Without this, players don't know they're close enough.

Common patterns:
- **Lift** (the object rises 0.1–0.3m)
- **Scale pulse** (1.0 → 1.1×)
- **Glow** (emissive blip — careful with bloom)
- **Outline** (post-process selective outline, or shell mesh)
- **Color tint** (the object's own color brightens)

The change must be **immediate and obvious**, not subtle. The player needs
to see it in their peripheral vision while focused elsewhere.

### 2. Action prompt (UI)

A floating element that says **what key to press**. Place it near the pickup
(world-space billboard) or above the player (screen-space following).

The prompt:
- States the exact key: "↓ mount" not "interact"
- Names what will happen: "↓ to mount" not just "↓"
- Hints at consequences: "↓ mount (1-hit die)" for risky pickups
- Hides when out of range or when the action isn't available

### 3. Deliberate input (controls)

Bind the action to a key the player **wouldn't accidentally press while
moving**. Bad choices:
- ❌ Movement keys (W/A/S/D) — pressed constantly
- ❌ Jump (Space) — pressed constantly
- ❌ Attack (often X) — also used to throw axes etc.

Good choices for opt-in:
- ✅ Dedicated interact (E or F)
- ✅ Down/Up arrow when not used for movement
- ✅ A separate button on gamepad (Y)

If your layout doesn't have a free key, **add modifier requirement**: "Hold
Shift + X to mount" — friction stops accidents.

## When opt-in is wrong

Auto-pickup is correct when:
- The pickup is **pure upside** (no scenario where the player would refuse)
- Refusing is impossible anyway (e.g. health regen orb on a one-life run)
- The pickup is part of a **flow state** (Tetris piece drops, you can't
  refuse, you arrange them)

Don't add prompts where they aren't needed — interaction friction has real
cost. The rule applies specifically to **risky / lock-in / equipment-swap**
pickups.

## Quick checklist before shipping any pickup

For each pickup type in your game:

1. **What does it do?** Write it in 5 words. ("Mounts skateboard, 2× speed, 1-hit die.")
2. **Is brushing it OK?** Imagine the player walking past at full speed,
   distracted by something else. Touching it should not surprise them.
3. **If brushing isn't OK, is it opt-in?** If no, add the 3 components above.
4. **Is the prompt visible from the camera distance the player actually plays at?**
   Test, don't assume.

## Anti-pattern: "the player will learn after the first death"

This is a real argument people make. *"Once they die from the skateboard,
they'll know to avoid it next time."*

This is bad design. The player's first death **teaches them the controls
are unfair**, not "be careful". Roguelikes can get away with it because
death is part of the genre contract. Most games can't.

In Adventure Island the contract is: "fair side-scrolling platformer where
the hunger meter is the real pressure". A surprise one-hit-die from
geometry contact breaks that contract.

## Cross-references

- `skills/craft/affordance-design.md` — how to make the proximity
  indicator readable.
- `skills/game/axioms/feedback-latency.md` — the prompt must appear within 1 frame of
  range entry; lag of even 100ms breaks the feel.
- `skills/game/onboarding/tutorial-types.md` — opt-in prompts are
  micro-tutorials; they teach without text.
