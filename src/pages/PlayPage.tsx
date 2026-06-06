import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GameCanvas } from '../components/GameCanvas'
import { findGame } from '../games/registry'
import type { SceneControls } from '../types/scenes'

interface LiveStats {
  score?: number
  lives?: number
}

/**
 * The single-game screen. The world.html reference defines the island portal,
 * not an in-game frame, so this stays minimal and in the same cozy language:
 * full-bleed game, a soft back button, a controls hint, and a pause card (Esc)
 * that reuses the sheet/modal styling.
 */
export function PlayPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const game = findGame(id)

  const controlsRef = useRef<SceneControls | null>(null)
  const [paused, setPaused] = useState(false)
  const [, setStats] = useState<LiveStats | null>(null)

  // Chrome (back button + hint) auto-hides so it never sits over the game's
  // own in-canvas HUD. Mouse-move (or pause toggle) brings it back for 2.4s.
  const [chromeVisible, setChromeVisible] = useState(true)
  const chromeTimerRef = useRef<number | null>(null)
  const revealChrome = useCallback(() => {
    setChromeVisible(true)
    if (chromeTimerRef.current) window.clearTimeout(chromeTimerRef.current)
    chromeTimerRef.current = window.setTimeout(() => setChromeVisible(false), 2400)
  }, [])
  useEffect(() => {
    chromeTimerRef.current = window.setTimeout(() => setChromeVisible(false), 3200)
    return () => { if (chromeTimerRef.current) window.clearTimeout(chromeTimerRef.current) }
  }, [])
  useEffect(() => {
    const onMove = () => revealChrome()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchstart', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchstart', onMove)
    }
  }, [revealChrome])

  const handleControls = useCallback((c: SceneControls | null) => {
    controlsRef.current = c
  }, [])

  const pause = useCallback(() => {
    setPaused(p => {
      if (p) return p
      try {
        controlsRef.current?.pause?.()
      } catch {
        /* best effort — some games gate their own loop, others ignore it */
      }
      return true
    })
    setChromeVisible(true)
    if (chromeTimerRef.current) window.clearTimeout(chromeTimerRef.current)
  }, [])

  const resume = useCallback(() => {
    setPaused(p => {
      if (!p) return p
      try {
        controlsRef.current?.play?.()
      } catch {
        /* best effort */
      }
      return false
    })
  }, [])

  // Esc toggles pause.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      paused ? resume() : pause()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paused, pause, resume])

  // Light polling for games that expose serializable state (none of the current
  // gallery scenes do — they draw their own in-canvas HUD — so no fake numbers).
  useEffect(() => {
    const tick = () => {
      const get = controlsRef.current?.getState
      if (typeof get !== 'function') return
      try {
        const s = get()
        if (s && (typeof s.score === 'number' || typeof s.lives === 'number')) {
          setStats({ score: s.score, lives: s.lives })
        }
      } catch {
        /* ignore */
      }
    }
    const h = window.setInterval(tick, 500)
    return () => window.clearInterval(h)
  }, [])

  if (!game) {
    return (
      <div className="play">
        <div className="world--missing">
          <p>Game not found: {id}</p>
          <button className="play-btn" onClick={() => navigate('/')}>
            Back to the island
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="play">
      <div className="play__viewport">
        <GameCanvas key={game.id} gameId={game.id} load={game.load} onControls={handleControls} />
      </div>

      <button
        className={`play__back${chromeVisible ? ' play__back--visible' : ''}`}
        onClick={() => navigate('/')}
        aria-label="Back to the island"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="play__back-label">Island</span>
      </button>

      {paused && (
        <div className="play__overlay">
          <div className="pause-card">
            <h2>Paused</h2>
            <p>{game.title}</p>
            <div className="pause-card__actions">
              <button className="play-btn" onClick={resume}>
                <span className="play-btn__tri" />
                Resume
              </button>
              <button className="ghost-btn" onClick={() => navigate('/')}>
                Back to the island
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
