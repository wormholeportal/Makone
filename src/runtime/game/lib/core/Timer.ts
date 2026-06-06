/**
 * Timer primitives — Countdown, stopwatch, and scheduled callbacks.
 *
 * Game time should be driven by your update loop (call .tick(dt) each frame),
 * not by setTimeout (which is throttled in background tabs).
 *
 * @example
 *   const reload = new Countdown(1.5) // 1.5 second reload
 *   function tick(dt) {
 *     reload.tick(dt)
 *     if (reload.done && input.fire) {
 *       fire()
 *       reload.reset()
 *     }
 *   }
 */

/**
 * Countdown timer — decreases from `duration` to 0.
 */
export class Countdown {
  private _remaining: number
  constructor(public duration: number) {
    this._remaining = duration
  }
  tick(dt: number): void {
    if (this._remaining > 0) this._remaining = Math.max(0, this._remaining - dt)
  }
  reset(newDuration?: number): void {
    if (newDuration !== undefined) this.duration = newDuration
    this._remaining = this.duration
  }
  get remaining(): number {
    return this._remaining
  }
  /** 0..1, where 1 = just started, 0 = done. */
  get progress(): number {
    return this.duration > 0 ? this._remaining / this.duration : 0
  }
  get done(): boolean {
    return this._remaining <= 0
  }
}

/**
 * Stopwatch — counts up from 0.
 */
export class Stopwatch {
  private _elapsed = 0
  private _running = true
  tick(dt: number): void {
    if (this._running) this._elapsed += dt
  }
  start(): void {
    this._running = true
  }
  stop(): void {
    this._running = false
  }
  reset(): void {
    this._elapsed = 0
  }
  get elapsed(): number {
    return this._elapsed
  }
  get running(): boolean {
    return this._running
  }
}

/**
 * Cooldown — used for actions that need a recovery period (e.g., dash, jump).
 * Different from Countdown in that it's designed for "is this ready?" queries.
 */
export class Cooldown {
  private _remaining = 0
  constructor(public duration: number) {}
  tick(dt: number): void {
    if (this._remaining > 0) this._remaining = Math.max(0, this._remaining - dt)
  }
  trigger(): boolean {
    if (this._remaining > 0) return false
    this._remaining = this.duration
    return true
  }
  get ready(): boolean {
    return this._remaining <= 0
  }
  get remaining(): number {
    return this._remaining
  }
  /** 1 = just triggered, 0 = ready. Useful for UI bars. */
  get progress(): number {
    return this.duration > 0 ? this._remaining / this.duration : 0
  }
  forceReady(): void {
    this._remaining = 0
  }
}

/**
 * Scheduler — fire callbacks at specific delays.
 * Replaces setTimeout — uses your game's tick loop so it pauses with the game.
 */
export class Scheduler {
  private pending: Array<{ at: number; fn: () => void; id: number }> = []
  private elapsed = 0
  private nextId = 1

  tick(dt: number): void {
    this.elapsed += dt
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (this.pending[i].at <= this.elapsed) {
        const fn = this.pending[i].fn
        this.pending.splice(i, 1)
        try {
          fn()
        } catch (e) {
          console.error('[Scheduler] callback error:', e)
        }
      }
    }
  }

  /** Schedule a callback to fire after `delaySeconds`. Returns an id for cancel(). */
  in(delaySeconds: number, fn: () => void): number {
    const id = this.nextId++
    this.pending.push({ at: this.elapsed + delaySeconds, fn, id })
    return id
  }

  /** Cancel a scheduled callback by id. */
  cancel(id: number): boolean {
    const idx = this.pending.findIndex((p) => p.id === id)
    if (idx < 0) return false
    this.pending.splice(idx, 1)
    return true
  }

  clear(): void {
    this.pending = []
  }
}

/**
 * Repeater — fire a callback every `interval` seconds.
 */
export class Repeater {
  private acc = 0
  constructor(public interval: number, public fn: () => void) {}
  tick(dt: number): void {
    this.acc += dt
    while (this.acc >= this.interval) {
      this.acc -= this.interval
      try {
        this.fn()
      } catch (e) {
        console.error('[Repeater] callback error:', e)
      }
    }
  }
  reset(): void {
    this.acc = 0
  }
}
