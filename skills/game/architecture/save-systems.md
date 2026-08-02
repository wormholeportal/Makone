# Save systems — plan them on day one, they shape the data model

> **Save is not a "add after game ships" feature — it shapes the entire data model.
> Decide what's saveable (state), what's not (references / functions / DOM), when to save (auto / explicit), where (local / cloud).
> These decisions must happen week one. Retrofitting is enormously expensive.**

## One-liner

Add save late = must rebuild data model.
Plan save day one = every datum has serializable properties = frictionless.

## Why

Saves require data be **serializable** (JSON-compatible):
- Numbers / strings / booleans / null
- Arrays
- Plain objects

Not serializable:
- Functions (callbacks)
- Class instances (with prototype)
- THREE.Mesh / THREE.Geometry / DOM elements
- Circular references
- Map / Set (unless custom serialization)

If game data is mixed (player = `{ hp: 100, mesh: THREE.Mesh, onDeath: fn }`), save must:

1. Extract mesh
2. Reconnect onDeath
3. Untangle circular refs
4. ...do this for every class

Add save late = 100 hours restructuring.

## Quantified standards

**Signals you need to plan saves**:
- Player needs > 30 minutes to "reach current state"
- Game crash → player loses progress → direct churn
- Need "resume from checkpoint" (mobile)
- Any **RPG / management / sandbox**

**Save hierarchy**:

1. **Settings save**: volume / keybinds / difficulty → tiny, save each change
2. **Run save**: player position / health / killed enemies → every 30s or checkpoint
3. **Meta save**: unlocks / achievements / statistics → save immediately
4. **Snapshot save**: player manual save → full game state

Different tiers use different storage / rhythm.

## 4 save timing strategies

### 1. Auto-save

Save every N seconds.
- Pros: player doesn't worry
- Cons: enables "cheat reload" (delete save, restart)

```ts
setInterval(() => {
  if (game.state === 'playing') save()
}, 30000)
```

### 2. Checkpoint save

Save on reaching zone / defeating boss.
- Pros: clear pacing
- Cons: player quits → loses some progress

### 3. Manual save

Player presses "save."
- Pros: player control
- Cons: player forgets → lost progress

### 4. Immediate save

Any state change triggers save.
- Pros: never loses data
- Cons: performance overhead / frequent IO

**Recommended in practice**: hybrid
- Meta (unlocks) → immediate
- Run (current session) → every 30s + checkpoint
- Snapshot (manual) → player keystroke

## Save storage location

### Browser games

| Option | Capacity | Speed | Persistence |
|---|---|---|---|
| **localStorage** | 5-10 MB | sync fast | device local |
| **sessionStorage** | 5 MB | sync fast | this tab only |
| **IndexedDB** | hundreds MB–GB | async fast | device local |
| **Cloud / API** | unlimited | network slow | cross-device |

**Makone choice**:
- Simple settings / high scores: localStorage
- Large progress / multiple slots: IndexedDB
- Cross-device: v2 has no backend; localStorage is limit (export/import JSON is upgrade path)

### Browser save template

```ts
class SaveManager {
  private key: string
  
  constructor(gameName: string) {
    this.key = `makone_save_${gameName}`
  }
  
  save(data: any) {
    try {
      const serialized = JSON.stringify(data)
      localStorage.setItem(this.key, serialized)
      return true
    } catch (e) {
      console.error('Save failed', e)
      return false
    }
  }
  
  load(): any | null {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  }
  
  clear() {
    localStorage.removeItem(this.key)
  }
}
```

## Data model planning

### 1. Separate "game data" from "runtime objects"

```ts
// ❌ Don't mix
class Player {
  hp: number
  mesh: THREE.Mesh   // not serializable
  onDeath: () => void // not serializable
}

// ✓ Separate
type PlayerState = {  // serializable
  hp: number
  position: [number, number, number]
  inventory: ItemState[]
}

class PlayerEntity {
  state: PlayerState  // only this serialized
  mesh: THREE.Mesh    // runtime
  onDeath?: () => void
  
  toJSON(): PlayerState { return this.state }
  fromJSON(state: PlayerState) { this.state = state }
}
```

### 2. Use IDs, not references

```ts
// ❌ Not serializable (circular + object refs)
type Quest = {
  giver: NPC  // NPC ref → NPC.activeQuests = [quest] = circular
}

// ✓ Use IDs
type Quest = {
  giverId: string
}

// On deserialize, look up by ID
function rehydrate(saveData) {
  const npcs = saveData.npcs.map(s => createNPC(s))
  const quests = saveData.quests.map(s => ({
    ...s,
    giver: npcs.find(n => n.id === s.giverId),
  }))
}
```

### 3. Version numbers

Extend data structure later without breaking old saves:

```ts
type SaveFile = {
  version: number
  data: any
}

function load(rawJSON: string) {
  const save: SaveFile = JSON.parse(rawJSON)
  
  // Migrate old versions
  if (save.version < CURRENT_VERSION) {
    save.data = migrate(save.data, save.version, CURRENT_VERSION)
  }
  
  return save.data
}

function migrate(data: any, from: number, to: number) {
  if (from === 1) {
    // v1 → v2: new field
    data.newField = defaultValue
    from = 2
  }
  if (from === 2) {
    // v2 → v3: rename field
    data.newName = data.oldName
    delete data.oldName
    from = 3
  }
  return data
}
```

### 4. Checksums (optional)

Prevent players tampering with saves:

```ts
import { createHash } from 'crypto'  // or browser crypto API

function sign(data: any, secret: string): string {
  return createHash('sha256').update(JSON.stringify(data) + secret).digest('hex')
}

function save(data: any) {
  const signature = sign(data, GAME_SECRET)
  localStorage.setItem(KEY, JSON.stringify({ data, signature }))
}

function load() {
  const raw = JSON.parse(localStorage.getItem(KEY))
  if (sign(raw.data, GAME_SECRET) !== raw.signature) {
    throw new Error('Save file tampered!')
  }
  return raw.data
}
```

But browser secret can never be truly secure → cheat prevention requires cloud saves + server.

## Classic examples

### Stardew Valley

Auto-save at end of each day (day = one save slot).
Player can "revert to yesterday" (reload) → intentional design (forgiving).

### Hades

Roguelike with "quick resume":
- Leave game → run state before death is saved
- Restart → continue run (if alive) / run fail count +1

Lets player "step away" without losing run.

### Minecraft

Entire world serialized as chunk files.
Player power-loss doesn't lose world (chunks written every few seconds).

### Dark Souls

Each action (pickup / death / level-up) triggers save.
"Can't load during boss fight to escape" is by design.

## Antipatterns

- **Crash loses 1h progress** → player quits
- **Save file huge (tens of MB)** → player thinks game bloated
- **Save not cross-device** → mobile user uninstalls = reset → recommend cloud save
- **Version update breaks old saves** → player complains

## Implementation in Makone

GameRuntime currently has no built-in save. If added later:

**1. Add toJSON / fromJSON to GameEntity**

```ts
interface SerializableEntity extends GameEntity {
  toJSON(): EntityState
  fromJSON(state: EntityState): void
}
```

**2. Add save / load to GameRuntime**

```ts
class GameRuntime {
  save(): GameState {
    return {
      version: 1,
      elapsed: this._elapsed,
      score: this.hud.score,
      entities: this.entities
        .filter(e => e.alive)
        .map(e => ({
          tag: [...e.tags][0],
          position: [e.mesh.position.x, e.mesh.position.y, e.mesh.position.z],
          health: e.health,
          data: e.data,
        })),
    }
  }
  
  load(state: GameState) {
    // Clear existing
    for (const e of [...this.entities]) this.destroy(e)
    this._flushDestroy()
    
    // Rebuild
    this._elapsed = state.elapsed
    this.hud.score = state.score
    for (const es of state.entities) {
      this.spawnFromTemplate(es.tag, es.position, es)
    }
  }
}
```

**3. Auto-save hook**

```ts
const saveManager = new SaveManager('sweetdefense')

// Auto-save
setInterval(() => {
  const state = game.save()
  saveManager.save(state)
}, 30000)

// On startup, check
const previous = saveManager.load()
if (previous && confirm('Resume previous game?')) {
  game.load(previous)
}
```

## Related skills

- `skills/game/architecture/entity-composition.md` — ECS pure data is easier to serialize
- `skills/game/architecture/event-bus.md` — "auto-save trigger" implemented with events
- `skills/game/architecture/state-machines.md` — on serialize, only save state name

## References

- *Game Programming Patterns* — Service Locator / Singleton chapters
- *Game Engine Architecture* — Jason Gregory (serialization chapter)
- MDN: Storage / IndexedDB documentation
- *RimWorld* save game internals (open dev blog)
- *Stardew Valley* dev postmortem (ConcernedApe)
