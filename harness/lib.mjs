// lib.mjs — shared bring-up for capture/verify: server + headless browser + loaded world.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Launch server + chromium, open the player in capture mode, wait until the
 *  world's first frame has rendered. Returns handles + collected console errors.
 *  Pass `{ part: '<world>/parts/<part>.js' }` to open one part in the studio instead
 *  of a whole world — same page, same hooks, same screenshot path (D7). */
export async function openWorld(worldName, { width = 1280, height = 720, part = null } = {}) {
  const { chromium } = await import('playwright');
  const { server, port } = await startServer({ port: 0 });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));
  const subject = part ? `part=${encodeURIComponent(part)}` : `world=${worldName}`;
  await page.goto(`http://localhost:${port}/play.html?${subject}&capture=1`);
  await page.waitForFunction('window.__ready === true', null, { timeout: 20000 })
    .catch(() => { throw new Error(`"${part || worldName}" never became ready.\nconsole: ${errors.join('\n')}`); });
  const close = async () => { await browser.close(); server.close(); };
  return { page, errors, close };
}

/** Advance the world by `seconds` of simulated time (fixed 30 fps steps).
 *  The trailing rAF yield is load-bearing: a long synchronous `__step` leaves the page
 *  busy enough that Playwright's next locator query can time out waiting for the canvas
 *  (`--after N` with a single shot failed 100% of the time without it). */
export async function step(page, seconds) {
  await page.evaluate((s) => window.__step(1 / 30, Math.round(s * 30)), seconds);
  await page.evaluate(() => new Promise(requestAnimationFrame));
}

/** Resolve a CLI arg to a world directory name. Accepts "<world>" or "worlds/<world>".
 *  capture/verify drive module worlds only (page/classic worlds have no WorldModule to step). */
export function worldNameFromArg(arg) {
  if (!arg) { console.error('usage: <script> <world-name>'); process.exit(1); }
  const name = arg.replace(/^worlds\//, '').replace(/\/$/, '');
  const { worlds } = JSON.parse(readFileSync(path.join(ROOT, 'worlds/index.json'), 'utf8'));
  const w = worlds.find((w) => w.path === name);
  if (!w) { console.error(`"${name}" not in worlds/index.json — run: node harness/catalog.mjs`); process.exit(1); }
  if (w.format !== 'module') { console.error(`"${name}" is format "${w.format}" — capture/verify only drive module worlds`); process.exit(1); }
  return name;
}
