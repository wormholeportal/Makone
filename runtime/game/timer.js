/**
 * Timer primitives — a stopwatch and a cooldown gate.
 *
 * Game time should be driven by your update loop (call .tick(dt) each frame),
 * not by setTimeout (which is throttled in background tabs).
 *
 * A plain countdown is three lines (`t = Math.max(0, t - dt)`), so there is no
 * class for it here — write it where you need it.
 *
 * @example
 *   const dash = new Cooldown(1.5)
 *   function tick(dt) {
 *     dash.tick(dt)
 *     if (input.dash && dash.trigger()) doDash()
 *   }
 */

/**
 * Stopwatch — counts up from 0.
 */
export class Stopwatch {
  constructor() {
    this._elapsed = 0
    this._running = true
  }
  tick(dt) {
    if (this._running) this._elapsed += dt
  }
  start() {
    this._running = true
  }
  stop() {
    this._running = false
  }
  reset() {
    this._elapsed = 0
  }
  get elapsed() {
    return this._elapsed
  }
  get running() {
    return this._running
  }
}

/**
 * Cooldown — used for actions that need a recovery period (e.g., dash, jump).
 * Not a countdown you read: a gate you ask "is this ready?".
 */
export class Cooldown {
  constructor(duration) {
    this.duration = duration
    this._remaining = 0
  }
  tick(dt) {
    if (this._remaining > 0) this._remaining = Math.max(0, this._remaining - dt)
  }
  trigger() {
    if (this._remaining > 0) return false
    this._remaining = this.duration
    return true
  }
  get ready() {
    return this._remaining <= 0
  }
  get remaining() {
    return this._remaining
  }
  /** 1 = just triggered, 0 = ready. Useful for UI bars. */
  get progress() {
    return this.duration > 0 ? this._remaining / this.duration : 0
  }
  forceReady() {
    this._remaining = 0
  }
}
