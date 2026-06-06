import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createIsland, type IslandHandle } from '../island/world'
import { PROJECT, PROJECT_LINKS } from '../config/project'
import { games, type GameMeta } from '../games/registry'

const STORE = 'makone_world_v2'

interface Saved {
  found?: string[]
  pos?: [number, number]
}

function loadSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORE) || '{}')
  } catch {
    return {}
  }
}

type Dir = 'up' | 'down' | 'left' | 'right'

/**
 * The island portal home: a 3D explorable world (see src/island/world.ts) with
 * a React HUD layered on top — logo, discovery counter, intro toast, the
 * approach prompt, a controls hint, a mobile d-pad, and the game detail sheet.
 */
export function HomePage() {
  const navigate = useNavigate()
  const hostRef = useRef<HTMLDivElement>(null)
  const islandRef = useRef<IslandHandle | null>(null)
  const savedRef = useRef<Saved>(loadSaved())

  const [loading, setLoading] = useState(true)
  const [toastHidden, setToastHidden] = useState(false)
  const [approached, setApproached] = useState<GameMeta | null>(null)
  const [modalGame, setModalGame] = useState<GameMeta | null>(null)
  const [discovered, setDiscovered] = useState<Set<string>>(() => new Set(savedRef.current.found || []))

  const persist = useCallback((found: Set<string>) => {
    const pos = islandRef.current?.getPosition()
    localStorage.setItem(STORE, JSON.stringify({ found: [...found], pos }))
  }, [])

  // Mount the 3D world once.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const handle = createIsland(host, {
      games,
      spawn: savedRef.current.pos,
      onApproach: game => {
        setApproached(game)
        if (game) {
          setDiscovered(prev => {
            if (prev.has(game.id)) return prev
            const next = new Set(prev)
            next.add(game.id)
            persist(next)
            return next
          })
        }
      },
      onEnter: game => setModalGame(game),
    })
    islandRef.current = handle
    setLoading(false)

    // First interaction dismisses the intro toast.
    const dismiss = () => setToastHidden(true)
    window.addEventListener('keydown', dismiss, { once: true })
    const toastTimer = window.setTimeout(() => setToastHidden(true), 8000)

    // Persist position periodically so Mo is where you left them.
    const saveTimer = window.setInterval(() => persist(discoveredRef.current), 2500)

    return () => {
      window.removeEventListener('keydown', dismiss)
      window.clearTimeout(toastTimer)
      window.clearInterval(saveTimer)
      persist(discoveredRef.current)
      handle.dispose()
      islandRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep a ref of discovered for the unmount/interval persist.
  const discoveredRef = useRef(discovered)
  discoveredRef.current = discovered

  // d-pad wiring
  const press = (dir: Dir, on: boolean) => islandRef.current?.setKey(dir, on)
  const dpadBtn = (dir: Dir, glyph: string, cls: string) => (
    <button
      className={cls}
      onPointerDown={e => {
        e.preventDefault()
        press(dir, true)
        setToastHidden(true)
      }}
      onPointerUp={e => {
        e.preventDefault()
        press(dir, false)
      }}
      onPointerLeave={() => press(dir, false)}
      onPointerCancel={() => press(dir, false)}
    >
      {glyph}
    </button>
  )

  const closeModal = useCallback(() => setModalGame(null), [])

  return (
    <div className="world-page">
      <div className="island-host" ref={hostRef} />

      {loading && (
        <div className="loading">
          <div className="loading__inner">
            <div className="loading__spin" />
            Building the island…
          </div>
        </div>
      )}

      <div className="hud">
        {/* top bar */}
        <div className="topbar">
          <a className="logo pe" href={PROJECT.siteUrl} aria-label={PROJECT.name}>
            <span className="logo__mark" />
            <b>makone</b>
          </a>
          <div className="topbar__right pe">
            <div className="social-links" aria-label="Project links">
              <a className="social-link" href={PROJECT.repoUrl} target="_blank" rel="noreferrer" aria-label="GitHub">
                <GitHubIcon />
              </a>
              <a className="social-link" href={PROJECT.xUrl} target="_blank" rel="noreferrer" aria-label="X">
                <XIcon />
              </a>
            </div>
            <div className="counter">
              Discovered <b>{discovered.size}</b> / {games.length}
            </div>
          </div>
        </div>

        {/* intro toast */}
        <div className={`toast${toastHidden ? ' toast--hide' : ''}`}>
          Roam the island with <b>Mo</b> · <span className="k">↑ ↓ ← →</span> / <span className="k">WASD</span> to move · <span className="k">Space</span> to enter
        </div>

        <div className="contrib pe">
          <b>Submit your game</b>
          <span>Add one JS game, one catalog entry, then open a PR.</span>
          <div className="contrib__links">
            <a href={PROJECT_LINKS.contributing} target="_blank" rel="noreferrer">
              Guide
            </a>
            <a href={PROJECT_LINKS.pullRequests} target="_blank" rel="noreferrer">
              PRs
            </a>
          </div>
        </div>

        {/* approach prompt */}
        <div className={`prompt${approached ? ' prompt--show' : ''}`}>
          <span
            className="prompt__cover"
            style={{ background: approached && !approached.cover ? coverStyle(approached) : undefined }}
          >
            {approached?.cover ? <img src={approached.cover} alt="" /> : approached?.title.charAt(0)}
          </span>
          <div>
            <div className="prompt__title">{approached?.title ?? ''}</div>
            <div className="prompt__sub">{approached?.cat ?? ''}</div>
          </div>
          <div className="prompt__key">Space</div>
        </div>

        {/* controls hint */}
        <div className="hint pe">
          <span>WASD</span> / <span>Arrows</span> move · <span>Space</span> enter · or <b>click</b> a stand
        </div>

        {/* mobile d-pad */}
        <div className="dpad pe">
          {dpadBtn('up', '▲', 'dpad__up')}
          {dpadBtn('left', '◀', 'dpad__left')}
          <button
            className="dpad__act"
            onPointerDown={e => {
              e.preventDefault()
              islandRef.current?.triggerEnter()
            }}
          >
            GO
          </button>
          {dpadBtn('right', '▶', 'dpad__right')}
          {dpadBtn('down', '▼', 'dpad__down')}
        </div>
      </div>

      {/* detail sheet */}
      {modalGame && (
        <div className="modal modal--show" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="sheet">
            <div className="sheet__cover" style={modalGame.cover ? undefined : { background: coverStyle(modalGame) }}>
              {modalGame.cover ? (
                <img className="sheet__cover-img" src={modalGame.cover} alt={modalGame.title} />
              ) : (
                <span className="sheet__glyph">{modalGame.title.charAt(0)}</span>
              )}
              <button className="sheet__close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>
            <div className="sheet__body">
              <h2>{modalGame.title}</h2>
              <div className="sheet__tags">
                {[modalGame.cat, ...modalGame.tags].map(tag => (
                  <b key={tag}>{tag}</b>
                ))}
              </div>
              <p>{modalGame.tagline}</p>
              <div className="sheet__cta">
                <button className="play-btn" onClick={() => navigate(`/play/${modalGame.id}`)}>
                  <span className="play-btn__tri" />
                  Play now
                </button>
                <button className="ghost-btn" onClick={closeModal}>
                  Keep roaming
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Procedural cover gradient from a game's accent — no image assets. */
function coverStyle(game: GameMeta): string {
  return `radial-gradient(120% 120% at 25% 12%, ${game.accent}, transparent 60%), linear-gradient(150deg, ${game.accent}, #4c6a58 85%)`
}

function GitHubIcon() {
  return (
    <svg className="social-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.38-1.34-1.75-1.34-1.75-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.48.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.4 11.4 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z"
      />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="social-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.9 2h3.35l-7.32 8.37L23.54 22h-6.74l-5.28-6.9L5.48 22H2.12l7.83-8.95L1.7 2h6.91l4.77 6.31L18.9 2Zm-1.17 17.95h1.86L7.6 3.94h-2l12.13 16.01Z"
      />
    </svg>
  )
}
