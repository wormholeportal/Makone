/**
 * ScreenShake — Camera shake primitive ("game feel" essential).
 *
 * ⚠️ ORDERING REQUIREMENT
 *   Call `shake.tick(dt)` AFTER your camera-positioning code, not before.
 *   ScreenShake is a "piggyback effect" that adds an offset on top of
 *   a transform another system owns. If you tick shake first and then
 *   overwrite camera.position via follow-cam, the shake offset is lost
 *   AND on next frame shake "restores" to a stale snapshot → jitter.
 *
 *   The library detects external camera movement between ticks (via
 *   compare-to-expected) and adapts, but the correct call order is still:
 *
 *     updateCamera(dt)   // follow-cam / orbit / cinematic
 *     shake.tick(dt)     // adds offset on top
 *     render()
 *
 * Jan Willem Nijman ("The Art of Screenshake"): shake amplifies impact.
 * Used for: hits, explosions, big jumps, deaths, low-HP heartbeat.
 *
 * See: skills/game/feel/screen-shake.md
 *
 * Five parameters define a shake:
 *   - amplitude:  how far the camera moves (meters / degrees)
 *   - frequency:  how fast it oscillates (Hz)
 *   - duration:   how long it lasts (seconds)
 *   - decay:      how amplitude falls over duration (linear / smooth / instant)
 *   - axes:       which axes shake (translational xyz + rotational roll)
 *
 * @example
 *   const shake = new ScreenShake(camera)
 *
 *   // In game loop:
 *   shake.tick(dt)
 *
 *   // On hit:
 *   shake.add({ amplitude: 0.15, frequency: 30, duration: 0.18 })
 *
 *   // On explosion:
 *   shake.add({ amplitude: 0.6, frequency: 18, duration: 0.6, decay: 'smooth' })
 *
 *   // Continuous (low HP heartbeat):
 *   const id = shake.addContinuous({ amplitude: 0.04, frequency: 6 })
 *   // ... later when HP refilled:
 *   shake.removeContinuous(id)
 */

import { Vector3 } from 'three'

/**
 * ShakeDecay: 'linear' | 'smooth' | 'instant'
 *
 * ShakeConfig:
 *   amplitude:  Peak displacement, meters (or radians for rotation).
 *   frequency?: Oscillation frequency in Hz (default 25).
 *   duration:   Total duration in seconds.
 *   decay?:     How amplitude decays over duration (default 'smooth').
 *   axes?:      Translational axes to shake (default {x:1,y:1,z:0}). z is depth — usually skip.
 *   roll?:      Roll amplitude in radians (default 0). Tiny values feel best — 0.01–0.04.
 */

export class ScreenShake {
  constructor(camera) {
    this.camera = camera
    this.active = []
    this.continuous = new Map()
    this.nextId = 1
    this.basePos = new Vector3()
    this.offset = new Vector3()
    this.baseRoll = 0
    this.rollOffset = 0
    this.hasBase = false
    /** Where we expected the camera to be after our last tick — used to detect
     *  external camera moves (chase cam, orbit cam, etc.) between ticks. */
    this._expectedPos = new Vector3()
    this._expectedRoll = 0
  }

  /** Add a one-shot shake. */
  add(config) {
    this.active.push({
      ...config,
      elapsed: 0,
      seedX: Math.random() * 1000,
      seedY: Math.random() * 1000,
      seedZ: Math.random() * 1000,
      seedR: Math.random() * 1000,
    })
  }

  /** Add a never-ending shake (heartbeat, engine rumble). Returns id for removal. */
  addContinuous(config) {
    const id = this.nextId++
    this.continuous.set(id, { ...config, duration: Infinity })
    return id
  }

  removeContinuous(id) {
    this.continuous.delete(id)
  }

  /** Stop everything. */
  clear() {
    this.active = []
    this.continuous.clear()
  }

  /**
   * Tick the shake. Call BEFORE camera-look code that uses camera.position,
   * or AFTER and have the post-process restore base position.
   */
  tick(dt) {
    // Detect whether the camera was moved externally (e.g., by a chase cam)
    // since our last tick. If yes, accept the new position as base; if no,
    // restore our base before computing the new offset (so it doesn't accumulate).
    if (this.hasBase) {
      const moved =
        this.camera.position.distanceToSquared(this._expectedPos) > 0.0001 ||
        Math.abs(this.camera.rotation.z - this._expectedRoll) > 0.0001
      if (!moved) {
        // Pure-shake setup — restore previous base before recomputing offset
        this.camera.position.copy(this.basePos)
        this.camera.rotation.z = this.baseRoll
      }
      // else: external cam moved it; accept current as new base (no restore)
    }

    // Compute total offset from all active + continuous
    this.offset.set(0, 0, 0)
    this.rollOffset = 0

    // One-shot shakes
    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i]
      s.elapsed += dt
      if (s.elapsed >= s.duration) {
        this.active.splice(i, 1)
        continue
      }
      this._apply(s, s.elapsed / s.duration)
    }

    // Continuous shakes (never decay)
    for (const c of this.continuous.values()) {
      this._applyConfig(c, performance.now() / 1000, 1)
    }

    // Snapshot base, then apply offset
    this.basePos.copy(this.camera.position)
    this.baseRoll = this.camera.rotation.z
    this.hasBase = true
    this.camera.position.add(this.offset)
    this.camera.rotation.z += this.rollOffset
    this._expectedPos.copy(this.camera.position)
    this._expectedRoll = this.camera.rotation.z
  }

  _apply(s, progress) {
    const decay = this._decay(s.decay ?? 'smooth', progress)
    this._applyConfig(s, s.elapsed, decay, s.seedX, s.seedY, s.seedZ, s.seedR)
  }

  _applyConfig(c, time, decay, seedX = 0, seedY = 13, seedZ = 31, seedR = 71) {
    const freq = c.frequency ?? 25
    const ax = c.axes?.x ?? 1
    const ay = c.axes?.y ?? 1
    const az = c.axes?.z ?? 0
    const amp = c.amplitude * decay
    // Sinusoidal noise with random phase per axis — looks more organic than pure random
    const t = time * freq
    this.offset.x += Math.sin(t + seedX) * Math.cos(t * 1.3 + seedX) * amp * ax
    this.offset.y += Math.sin(t * 1.1 + seedY) * Math.cos(t * 0.9 + seedY) * amp * ay
    this.offset.z += Math.sin(t * 0.7 + seedZ) * amp * az
    if (c.roll) {
      this.rollOffset += Math.sin(t * 0.85 + seedR) * c.roll * decay
    }
  }

  _decay(kind, progress) {
    if (kind === 'instant') return 1
    if (kind === 'linear') return 1 - progress
    // 'smooth' — cubic ease-out
    const t = 1 - progress
    return t * t * t
  }
}
