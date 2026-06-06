import { useEffect, useRef, useState } from 'react'
import type { CreateScene } from '../games/registry'
import type { SceneControls } from '../types/scenes'

interface GameCanvasProps {
  /** Lazy loader for the game module. */
  load: () => Promise<{ default: CreateScene }>
  /** Re-mount the game when this changes (e.g. switching games on one route). */
  gameId: string
  /** Hands the live controls to the parent once the game is ready (null on unmount). */
  onControls?: (controls: SceneControls | null) => void
}

type Status = 'loading' | 'ready' | 'error'

/**
 * Mounts a single gallery game into a full-bleed container and owns its
 * lifecycle: load the module, call createScene(container), keep it sized via a
 * ResizeObserver, and dispose on unmount. The games drive their own RAF loop
 * and input handling, so there is nothing to "play" here — we just give them a
 * canvas host and clean up after them.
 */
export function GameCanvas({ load, gameId, onControls }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let controls: SceneControls | null = null

    setStatus('loading')
    setError('')

    load()
      .then(mod => {
        if (disposed) return
        const create = mod.default
        if (typeof create !== 'function') {
          throw new Error(`Game "${gameId}" has no default createScene export`)
        }
        return Promise.resolve(create(host))
      })
      .then(ctrl => {
        if (disposed) {
          ctrl?.dispose()
          return
        }
        controls = ctrl ?? null
        controls?.setOrbitMode?.()
        onControls?.(controls)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (disposed) return
        console.error(`[GameCanvas] Failed to start "${gameId}":`, err)
        setError(err instanceof Error ? err.message : String(err))
        setStatus('error')
      })

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        controls?.resize?.(width, height)
      }
    })
    ro.observe(host)

    return () => {
      disposed = true
      ro.disconnect()
      onControls?.(null)
      try {
        controls?.dispose()
      } catch (err) {
        console.warn(`[GameCanvas] Dispose error for "${gameId}":`, err)
      }
      // Belt-and-braces: drop any game-owned DOM the game left behind.
      host.replaceChildren()
    }
  }, [load, gameId])

  return (
    <div className="game-canvas">
      <div className="game-canvas__host" ref={hostRef} />
      {status === 'loading' && (
        <div className="game-canvas__overlay">
          <div className="spinner" />
          <p>载入中…</p>
        </div>
      )}
      {status === 'error' && (
        <div className="game-canvas__overlay game-canvas__overlay--error">
          <p>这个游戏没能启动</p>
          <code>{error}</code>
        </div>
      )}
    </div>
  )
}
