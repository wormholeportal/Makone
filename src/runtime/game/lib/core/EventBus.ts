/**
 * EventBus — Pub/sub primitive for decoupling game systems.
 *
 * 不要让"敌人死亡"直接调用"加分数 + 播音效 + 掉道具 + 更新成就"。
 * 让"敌人死亡"发出事件，每个系统自己订阅自己关心的。
 *
 * See: skills/games/03-architecture/event-bus.md
 *
 * @example
 *   const events = new EventBus<{
 *     'enemy:died': { enemy: Entity, killer: Entity }
 *     'item:collected': { item: Item }
 *   }>()
 *
 *   events.on('enemy:died', ({ enemy, killer }) => {
 *     score += enemy.value
 *   })
 *
 *   events.emit('enemy:died', { enemy: badGuy, killer: player })
 */
export class EventBus<EventMap extends Record<string, any> = Record<string, any>> {
  private listeners = new Map<keyof EventMap, Set<(data: any) => void>>()

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(handler as (data: any) => void)
    return () => this.off(event, handler)
  }

  /**
   * Subscribe to an event once (auto-unsubscribes after first call).
   */
  once<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void {
    const wrapped = (data: EventMap[K]) => {
      handler(data)
      this.off(event, wrapped as any)
    }
    return this.on(event, wrapped as any)
  }

  /**
   * Unsubscribe a specific handler.
   */
  off<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
    this.listeners.get(event)?.delete(handler as (data: any) => void)
  }

  /**
   * Emit an event to all subscribers.
   * Handlers are called synchronously. Errors in one handler don't affect others.
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    // Copy to array to allow handlers to unsubscribe during iteration
    for (const h of [...handlers]) {
      try {
        h(data)
      } catch (e) {
        console.error(`[EventBus] handler error for "${String(event)}":`, e)
      }
    }
  }

  /**
   * Number of active listeners for an event.
   */
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.listeners.get(event)?.size ?? 0
  }

  /**
   * Remove all listeners for one event, or all events if no argument.
   */
  clear<K extends keyof EventMap>(event?: K): void {
    if (event !== undefined) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}

/**
 * EventQueue — Async variant of EventBus.
 * Events emitted during a frame are batched and dispatched at flush()
 * (typically end of frame). Prevents recursive event chains.
 */
export class EventQueue<EventMap extends Record<string, any> = Record<string, any>> {
  private bus = new EventBus<EventMap>()
  private queue: Array<{ event: keyof EventMap; data: any }> = []

  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void {
    return this.bus.on(event, handler)
  }

  off<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
    this.bus.off(event, handler)
  }

  /** Queue an event for later dispatch (call flush() to fire). */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.queue.push({ event, data })
  }

  /** Dispatch all queued events. Typically called once per frame at end of loop. */
  flush(): void {
    const queued = this.queue
    this.queue = []
    for (const { event, data } of queued) {
      this.bus.emit(event, data)
    }
  }

  clear(): void {
    this.queue = []
    this.bus.clear()
  }
}
