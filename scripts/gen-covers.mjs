/*
 * Auto-generate kiosk/card cover images by actually running each game and
 * screenshotting a frame. Output: games/covers/<id>.jpg (16:10), picked up
 * automatically by the registry's import.meta.glob.
 *
 * Run with:  npm run gen-covers
 * (builds the site, serves dist/ via vite preview, drives it with Playwright)
 *
 * Covers are rendered from THIS project's own game code — not imported art —
 * so the "pure code, no external assets" spirit holds.
 */
import { chromium } from 'playwright'
import { preview } from 'vite'
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(root, 'games', 'covers')
const PORT = 4178
const W = 1200
const H = 750 // 16:10, matches the kiosk cover plane
const JPEG_QUALITY = 82 // photographic game frames: JPEG keeps covers tiny

// Game ids are auto-discovered from games/*.js, so a new game gets a cover with
// no edits here. Only override capture timing when the defaults don't work:
//   settle      — wait for the world to spawn before the shot
//   start       — press Space first to skip a simple intro
//   clickCenter — dismiss an in-canvas Start/Begin overlay before shooting
const DEFAULT_CAPTURE = { settle: 4200, start: true, clickCenter: false }
const CAPTURE = {
  pacman3d: { settle: 5200, clickCenter: true },
  dontstarve: { settle: 5200, clickCenter: true },
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Every games/<id>.js is one game; the filename (minus .js) is its id.
async function discoverGameIds() {
  const files = await fs.readdir(path.join(root, 'games'))
  return files
    .filter(f => f.endsWith('.js'))
    .map(f => f.slice(0, -3))
    .sort()
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  const server = await preview({ root, preview: { port: PORT, strictPort: true } })
  const base = `http://localhost:${PORT}`
  console.log(`[gen-covers] preview server on ${base}`)

  const ids = await discoverGameIds()
  console.log(`[gen-covers] ${ids.length} game(s): ${ids.join(', ')}`)

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })

  for (const id of ids) {
    const cfg = { ...DEFAULT_CAPTURE, ...CAPTURE[id] }
    process.stdout.write(`[gen-covers] ${id} … `)
    await page.goto(`${base}/#/play/${id}`, { waitUntil: 'load' })
    try {
      await page.waitForSelector('.game-canvas__host canvas', { timeout: 15000 })
    } catch {
      console.log('no canvas, skipped')
      continue
    }
    await sleep(1500)
    if (cfg.clickCenter) {
      // dismiss an in-canvas Start/Begin overlay (and any DOM button on top)
      for (const sel of ['button:has-text("Start")', 'button:has-text("Begin")', '.play-btn']) {
        const b = page.locator(sel)
        if (await b.count()) {
          await b.first().click().catch(() => {})
          break
        }
      }
      await page.mouse.click(W / 2, H / 2)
    }
    if (cfg.start) {
      await page.keyboard.press('Space')
      await page.keyboard.down('KeyW')
      await sleep(600)
      await page.keyboard.up('KeyW')
    }
    await sleep(cfg.settle)

    // some games add a secondary canvas (minimap/HUD); the first/largest one
    // is always the main WebGL view.
    const canvas = page.locator('.game-canvas__host canvas').first()
    const out = path.join(OUT_DIR, `${id}.jpg`)
    await canvas.screenshot({ path: out, type: 'jpeg', quality: JPEG_QUALITY })
    console.log(`saved ${path.relative(root, out)}`)
  }

  await browser.close()
  await server.httpServer?.close?.()
  process.exit(0)
}

main().catch(err => {
  console.error('[gen-covers] failed:', err)
  process.exit(1)
})
