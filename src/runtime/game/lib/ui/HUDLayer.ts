/**
 * HUDLayer — A DOM overlay on top of the canvas for game UI.
 *
 * For: score, HP bar, ammo, timer, controls hint, damage flash, kill feed.
 * 3D-in-canvas UI is hard. Use DOM. It's faster, easier to style, accessible.
 *
 * See: skills/games/04-visual-language/ui-information-architecture.md
 *
 * @example
 *   const hud = new HUDLayer(container)
 *
 *   const score = hud.text({ top: 16, right: 16, font: '24px sans', color: '#fff' })
 *   score.set('Score: 0')
 *
 *   const hpBar = hud.bar({ bottom: 24, left: 24, width: 260, height: 16, color: '#e23' })
 *   hpBar.setValue(0.8)
 *
 *   hud.flash('#f44', 0.18)   // red damage flash
 *
 *   hud.dispose()             // on game end
 */

export type HUDPlacement = {
  top?: number
  right?: number
  bottom?: number
  left?: number
  /** Centered horizontally if true. */
  hCenter?: boolean
  /** Centered vertically if true. */
  vCenter?: boolean
}

export type HUDTextConfig = HUDPlacement & {
  font?: string
  color?: string
  shadow?: string
  className?: string
}

export type HUDBarConfig = HUDPlacement & {
  width: number
  height: number
  color: string
  background?: string
  border?: string
  /** Animate value changes over `transition` seconds. Default 0.18. */
  transition?: number
}

export class HUDLayer {
  readonly root: HTMLDivElement
  private elements: HTMLElement[] = []
  private flashEl: HTMLDivElement | null = null

  constructor(public container: HTMLElement) {
    this.root = document.createElement('div')
    Object.assign(this.root.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: '10',
      fontFamily: 'system-ui, sans-serif',
    })
    container.appendChild(this.root)
  }

  text(config: HUDTextConfig = {}) {
    const el = document.createElement('div')
    this._place(el, config)
    el.style.font = config.font ?? '16px system-ui, sans-serif'
    el.style.color = config.color ?? '#fff'
    el.style.textShadow = config.shadow ?? '0 1px 3px rgba(0,0,0,0.6)'
    if (config.className) el.className = config.className
    this.root.appendChild(el)
    this.elements.push(el)
    return {
      el,
      set: (text: string) => {
        el.textContent = text
      },
      setHTML: (html: string) => {
        el.innerHTML = html
      },
      hide: () => {
        el.style.display = 'none'
      },
      show: () => {
        el.style.display = ''
      },
    }
  }

  bar(config: HUDBarConfig) {
    const wrap = document.createElement('div')
    this._place(wrap, config)
    Object.assign(wrap.style, {
      width: `${config.width}px`,
      height: `${config.height}px`,
      background: config.background ?? 'rgba(0,0,0,0.4)',
      border: config.border ?? '1px solid rgba(255,255,255,0.3)',
      borderRadius: `${config.height / 4}px`,
      overflow: 'hidden',
      boxSizing: 'border-box',
    })
    const fill = document.createElement('div')
    Object.assign(fill.style, {
      width: '100%',
      height: '100%',
      background: config.color,
      transformOrigin: 'left center',
      transition: `transform ${config.transition ?? 0.18}s ease-out`,
    })
    wrap.appendChild(fill)
    this.root.appendChild(wrap)
    this.elements.push(wrap)
    return {
      el: wrap,
      fill,
      setValue: (v: number) => {
        fill.style.transform = `scaleX(${Math.max(0, Math.min(1, v))})`
      },
      setColor: (c: string) => {
        fill.style.background = c
      },
      hide: () => {
        wrap.style.display = 'none'
      },
      show: () => {
        wrap.style.display = ''
      },
    }
  }

  /** Add a custom DOM element with placement. */
  custom(el: HTMLElement, placement: HUDPlacement = {}) {
    this._place(el, placement)
    this.root.appendChild(el)
    this.elements.push(el)
    return el
  }

  /** Briefly flash the whole screen (damage hit, item pickup, level up). */
  flash(color = '#fff', duration = 0.15): void {
    if (!this.flashEl) {
      this.flashEl = document.createElement('div')
      Object.assign(this.flashEl.style, {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity 0.08s ease-out',
        zIndex: '100',
      })
      this.root.appendChild(this.flashEl)
    }
    this.flashEl.style.background = color
    this.flashEl.style.transition = 'opacity 0.04s ease-out'
    this.flashEl.style.opacity = '0.6'
    setTimeout(() => {
      if (!this.flashEl) return
      this.flashEl.style.transition = `opacity ${duration}s ease-out`
      this.flashEl.style.opacity = '0'
    }, 40)
  }

  dispose(): void {
    for (const el of this.elements) el.remove()
    if (this.flashEl) this.flashEl.remove()
    this.root.remove()
    this.elements = []
  }

  private _place(el: HTMLElement, p: HUDPlacement): void {
    el.style.position = 'absolute'
    if (p.hCenter) {
      el.style.left = '50%'
      el.style.transform = (el.style.transform ?? '') + ' translateX(-50%)'
    } else {
      if (p.left !== undefined) el.style.left = `${p.left}px`
      if (p.right !== undefined) el.style.right = `${p.right}px`
    }
    if (p.vCenter) {
      el.style.top = '50%'
      el.style.transform = (el.style.transform ?? '') + ' translateY(-50%)'
    } else {
      if (p.top !== undefined) el.style.top = `${p.top}px`
      if (p.bottom !== undefined) el.style.bottom = `${p.bottom}px`
    }
  }
}
