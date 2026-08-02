/**
 * GlassPanel — Reusable frosted-glass DOM panels for menus, dialogs, banners.
 *
 * Most "menu screens" look bad because they reuse default browser styles.
 * One styled primitive removes that excuse.
 *
 * @example
 *   const menu = new GlassPanel({
 *     title: 'Paused',
 *     buttons: [
 *       { label: 'Resume', onClick: () => game.resume() },
 *       { label: 'Restart', onClick: () => game.restart() },
 *       { label: 'Quit', onClick: () => game.quit(), style: 'danger' },
 *     ],
 *   })
 *   container.appendChild(menu.el)
 *   // Later:
 *   menu.dispose()
 *
 *   // Or just a banner:
 *   const banner = GlassPanel.banner('Level Complete!', container, { duration: 2.5 })
 */

/**
 * GlassButton:
 *   label:   string
 *   onClick: () => void
 *   style?:  'primary' (default) | 'secondary' | 'danger'
 *
 * GlassPanelConfig:
 *   title?:           string
 *   subtitle?:        string
 *   body?:            string | HTMLElement
 *   buttons?:         GlassButton[]
 *   closable?:        Show a close X in top-right.
 *   onClose?:         () => void
 *   backdropCloses?:  Backdrop click closes (default true if closable).
 *   width?:           Width in px (default 360).
 */

const STYLE_ID = 'makone-glass-panel-style'

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    .makone-glass-backdrop {
      position: absolute; inset: 0;
      background: rgba(61, 58, 66, 0.24);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      z-index: 100;
      animation: makone-glass-fadein 0.18s ease-out;
    }
    @keyframes makone-glass-fadein {
      from { opacity: 0 } to { opacity: 1 }
    }
    .makone-glass-panel {
      background: rgba(255, 250, 240, 0.88);
      border: 1px solid rgba(61,58,66,0.1);
      box-shadow: 0 30px 80px rgba(61,58,66,0.28), inset 0 1px 0 rgba(255,255,255,0.65);
      border-radius: 14px;
      padding: 28px 32px;
      color: #3d3a42;
      font-family: system-ui, -apple-system, sans-serif;
      backdrop-filter: blur(10px);
      animation: makone-glass-pop 0.22s cubic-bezier(.2,1.4,.4,1);
      position: relative;
    }
    @keyframes makone-glass-pop {
      from { transform: scale(0.92); opacity: 0 }
      to   { transform: scale(1);    opacity: 1 }
    }
    .makone-glass-title  { font-size: 22px; font-weight: 700; margin: 0 0 4px; letter-spacing: 0; color: #27232d; }
    .makone-glass-sub    { font-size: 13px; opacity: 0.7; margin: 0 0 20px; }
    .makone-glass-body   { font-size: 14px; line-height: 1.5; margin: 0 0 22px; }
    .makone-glass-btns   { display: flex; gap: 10px; flex-direction: column; }
    .makone-glass-btn {
      pointer-events: auto;
      border: none; cursor: pointer;
      padding: 11px 18px; border-radius: 8px;
      font-size: 14px; font-weight: 500; letter-spacing: 0.3px;
      transition: transform 0.08s, background 0.15s;
      font-family: inherit;
    }
    .makone-glass-btn:hover { transform: translateY(-1px); }
    .makone-glass-btn:active { transform: translateY(0); }
    .makone-glass-btn.primary   { background: #4c6a58; color: #fffaf0; }
    .makone-glass-btn.primary:hover   { background: #5a7a66; }
    .makone-glass-btn.secondary { background: rgba(76,106,88,0.12); color: #3d3a42; }
    .makone-glass-btn.secondary:hover { background: rgba(76,106,88,0.18); }
    .makone-glass-btn.danger    { background: #cf6a58; color: #fffaf0; }
    .makone-glass-btn.danger:hover    { background: #d97765; }
    .makone-glass-close {
      position: absolute; top: 10px; right: 12px;
      width: 28px; height: 28px; border: none;
      background: transparent; cursor: pointer;
      color: #3d3a42; opacity: 0.6; font-size: 18px;
      pointer-events: auto;
    }
    .makone-glass-close:hover { opacity: 1; }
    .makone-glass-banner {
      position: absolute; left: 50%; top: 18%;
      transform: translateX(-50%);
      background: rgba(255,250,240,0.9);
      border: 1px solid rgba(61,58,66,0.1);
      backdrop-filter: blur(8px);
      padding: 14px 28px; border-radius: 10px;
      color: #27232d; font-family: system-ui, sans-serif;
      font-size: 22px; font-weight: 600;
      letter-spacing: 0.8px;
      box-shadow: 0 16px 50px rgba(61,58,66,0.28);
      animation: makone-banner-in 0.3s cubic-bezier(.2,1.4,.4,1);
      z-index: 90;
      pointer-events: none;
    }
    @keyframes makone-banner-in {
      from { transform: translate(-50%, -20px); opacity: 0 }
      to   { transform: translate(-50%, 0);     opacity: 1 }
    }
  `
  document.head.appendChild(s)
}

export class GlassPanel {
  constructor(config) {
    this.config = config
    this.closed = false

    injectStyle()

    this.el = document.createElement('div')
    this.el.className = 'makone-glass-backdrop'
    this.el.style.pointerEvents = 'auto'

    if (config.closable && config.backdropCloses !== false) {
      this.el.addEventListener('click', (e) => {
        if (e.target === this.el) this.close()
      })
    }

    this.panel = document.createElement('div')
    this.panel.className = 'makone-glass-panel'
    if (config.width) this.panel.style.width = `${config.width}px`
    this.el.appendChild(this.panel)

    if (config.title) {
      const t = document.createElement('h2')
      t.className = 'makone-glass-title'
      t.textContent = config.title
      this.panel.appendChild(t)
    }
    if (config.subtitle) {
      const s = document.createElement('p')
      s.className = 'makone-glass-sub'
      s.textContent = config.subtitle
      this.panel.appendChild(s)
    }
    if (config.body) {
      const b = document.createElement('div')
      b.className = 'makone-glass-body'
      if (typeof config.body === 'string') b.textContent = config.body
      else b.appendChild(config.body)
      this.panel.appendChild(b)
    }
    if (config.buttons) {
      const btns = document.createElement('div')
      btns.className = 'makone-glass-btns'
      for (const b of config.buttons) {
        const btn = document.createElement('button')
        btn.className = `makone-glass-btn ${b.style ?? 'primary'}`
        btn.textContent = b.label
        btn.onclick = () => b.onClick()
        btns.appendChild(btn)
      }
      this.panel.appendChild(btns)
    }
    if (config.closable) {
      const x = document.createElement('button')
      x.className = 'makone-glass-close'
      x.textContent = '×'
      x.onclick = () => this.close()
      this.panel.appendChild(x)
    }
  }

  close() {
    if (this.closed) return
    this.closed = true
    this.config.onClose?.()
    this.dispose()
  }

  dispose() {
    this.el.remove()
  }

  /** Quick non-blocking banner. Auto-dismisses after `duration` seconds. */
  static banner(text, container, opts = {}) {
    injectStyle()
    const el = document.createElement('div')
    el.className = 'makone-glass-banner'
    el.textContent = text
    container.appendChild(el)
    const t = opts.duration ?? 2
    setTimeout(() => {
      el.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out'
      el.style.opacity = '0'
      el.style.transform = 'translate(-50%, -10px)'
      setTimeout(() => el.remove(), 420)
    }, t * 1000)
    return el
  }
}
