# Feedback sound — sound is not background music

> **Every important game event needs its own sound.
> No sound = game feels cold.
> Sound = game has personality and impact.
> Audio is 50% of the game feel.**

## One-liner

Silence = death to gameplay feel.
Footstep → jump → land → each is a separate sound cue, not ambience.

## Why

Human hearing is fast (reaction < 100ms).
Eyes need 200ms to process, but ears process instantly.
This is why audio feedback dominates game feel.

Sound communicates:
- **Status** (health low = warning beep)
- **Causality** (hit = impact sound)
- **Emotion** (sad music = melancholy)
- **Direction** (gunshot left = attacker left)
- **Urgency** (alarm = act now)

Games without sound feedback feel dead. Same game with sound feels alive.

## Quantified standards

**Essential sounds**:
- Footstep (every movement)
- Jump (every jump)
- Land (every collision)
- Attack (every action)
- Hit (every damage taken / dealt)
- Death (permanent state change)
- Pickup (every reward)
- UI (every menu interaction)

**Audio hierarchy**:
- High priority = loud + distinct (boss roar)
- Medium priority = clear + directional (enemy grunt)
- Low priority = subtle + ambient (wind)

**Mixing rule**: most important sounds should be loudest. In doubt, player should hear feedback.

## 6 uses of sound

### 1. Immediate feedback (< 100ms)

Player presses button → immediate audio response.
No delay. If delayed > 200ms, player feels latency even if visual is fast.

✓ Button press → click sound instantly
✗ Button press → 500ms later sound plays

### 2. Status indicator

Audio tone indicates player state without screen look.

✓ Health low = warning beep pattern
✓ Stamina depleted = sharp "no" sound
✗ Only visual UI shows status

### 3. Spatial awareness

Audio direction tells player where threat is.

✓ Enemy behind → sound from behind
✓ Footsteps approaching = gets louder
✗ Omnidirectional sound loses positional info

### 4. Emotional narrative

Music sets mood for scene.

✓ Boss battle = intense orchestral
✓ Safe zone = gentle ambient
✗ Flat audio = flat emotions

### 5. Rewards

Victory, pickup, achievement all need distinct audio reward.

✓ Level clear = triumphant chord
✓ Pickup = chime sound
✗ No audio = less satisfying

### 6. Warning / alert

Danger approaching has signature sound.

✓ Boss about to attack = audio telegraph
✓ Trap armed = warning beep
✗ Unexpected hazard = player blindsided

## Classic examples

### Celeste

Every jump has distinct "pop" sound. Landing has impact.
Dashing has whoosh. Collecting berries has chime.
Entire game feel comes from layered audio.

### Dark Souls

Sword clang = combat feedback. Boss roars = direction + threat.
Bonfire kindle has satisfying sound. Mimics "sound different" alerts player.
Audio telegraphs attacks players can't see.

### Hollow Knight

Every slash has impact. Healing has soothing tone.
Benches have welcoming sound. Ascending notes = hope.
Audio reinforces game tone perfectly.

### Hades

Weapon hits have satisfying impact. Boon pickup has celebratory chime.
Enemy death has crunchy sound. Dialogue has character audio cues.
Sound makes combat feel responsive and weighty.

## Antipatterns

- **No hit feedback**: punch enemy, nothing → feels weak
- **Delayed audio**: 500ms late response → feel latency
- **Uniform sounds**: all hits sound same → no distinction
- **Loud ambient drowns action**: footsteps inaudible → lose spatial awareness
- **No contrast**: everything equally loud → nothing stands out
- **Music doesn't match gameplay**: cheerful music in horror scene → tone-deaf

## How to implement

**1. Layer sounds on important events**

```ts
function onHit(target, damage) {
  // Visual + audio + haptic all fire simultaneously
  target.getHit()  // visual
  playSound('hit', hitPosition)  // audio
  // haptic feedback if available
}
```

**2. Use distinct sounds for distinct actions**

```ts
const sounds = {
  jump: 'jump-pop.wav',
  land: 'land-thud.wav',
  hit: 'sword-clang.wav',
  pickup: 'chime-ding.wav',
}
```

**3. Spatial audio for direction**

```ts
// Vary volume by distance
const distance = player.distanceTo(soundSource)
audio.volume = 1 / (1 + distance * distance)

// Pan left/right by angle
const angle = calcAngle(player, soundSource)
audio.pan = angle / 180  // -1 left, 0 center, 1 right
```

**4. Audio telegraphs threats**

```ts
// Boss about to attack? Play warning sound first
if (boss.aboutToAttack) {
  playSound('boss-windup', bossPos)
  await wait(1000)  // gives player reaction time
  boss.attack()
}
```

## Related skills

- `skills/game/feel/juicing.md` — audio is core component of juice
- `skills/game/feel/telegraphing.md` — audio telegraphs incoming threats
- `skills/game/axioms/feedback-latency.md` — audio is fastest feedback

## References

- Steve Swink, *Game Feel*
- Richard Stevens, *Wwise certification*
- Audio design in *Celeste* (Lena Raine)
- Game audio best practices (GDC talks)
