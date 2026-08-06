// lib.mjs — shared bring-up for capture/verify: server + headless browser + loaded world.
import { readFileSync, promises as fsp } from 'node:fs';
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

/** Shrink the viewport for a stretch of work nobody is going to look at, and put it
 *  back before anybody does. Headless GL is fill-rate bound, so simulated time costs
 *  real time in proportion to the pixels; 320 px wide is ~16x fewer of them and the
 *  simulation is identical. Returns a restore function.
 *
 *  Never wrap anything that MEASURES pixels in this — verify's luma samples read the
 *  framebuffer, so they run at the size the world was opened at. */
async function shrunk(page, on) {
  const vp = on ? page.viewportSize() : null;
  if (!vp) return async () => {};
  await page.setViewportSize({ width: 320, height: Math.max(2, Math.round(320 * vp.height / vp.width)) });
  await page.evaluate(() => window.__world.resize());
  return async () => {
    await page.setViewportSize(vp);
    await page.evaluate(() => { window.__world.resize(); window.__world.renderFrame(0); });
    await page.evaluate(() => new Promise(requestAnimationFrame));
  };
}

/** Advance the world by `seconds` of simulated time (fixed 30 fps steps).
 *  The trailing rAF yield is load-bearing: a long synchronous `__step` leaves the page
 *  busy enough that Playwright's next locator query can time out waiting for the canvas
 *  (`--after N` with a single shot failed 100% of the time without it).
 *
 *  `{ shrink: true }` renders the journey small — opt-in, and never used where the frames
 *  themselves are the measurement. */
export async function step(page, seconds, { shrink = false } = {}) {
  const restore = await shrunk(page, shrink && seconds > 3);
  const SLICE = 4;
  for (let done = 0; done < seconds; done += SLICE) {
    const chunk = Math.min(SLICE, seconds - done);
    await page.evaluate((s) => window.__step(1 / 30, Math.round(s * 30)), chunk);
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
  await restore();
}

/** Advance the world to `toSeconds` of simulated time — PLAYING it if it can be played.
 *
 *  `step` simulates a world with nobody at the controls, which is the whole truth for a
 *  scene and almost none of it for a game: every review frame of a playable world comes out
 *  as "the first moment, standing still". Two of this repo's games have a complete visual
 *  record consisting of four shots of their own title card, and nobody noticed, because
 *  those were the only frames anything ever produced.
 *
 *  So: if `worlds/<name>/pilot.js` exists, the world is driven through the published
 *  contract exactly as `botplay` drives it (observe → act → renderFrame). No pilot, or no
 *  `act`, and this degrades to `step`, which is the right answer for a scene.
 *
 *  Time is cumulative across calls (`window.__driveT`), so a caller can walk a list of
 *  moments forward without replaying from zero. Work goes out in ~2 s slices: one long
 *  synchronous evaluate would blow Playwright's timeout on any run over about half a
 *  minute of simulated time. */
export async function drive(page, name, toSeconds, { hz = 30, quiet = false, shrink = true } = {}) {
  const pilotPath = path.join(ROOT, 'worlds', name, 'pilot.js');
  const hasPilot = !!(await fsp.stat(pilotPath).catch(() => null));
  const playable = await page.evaluate(() => typeof window.__world.act === 'function');
  const usePilot = hasPilot && playable;
  if (!usePilot && !quiet && playable) {
    console.error(`note: worlds/${name}/pilot.js does not exist — driving it as a scene instead`);
  }
  const SLICE = 2;
  let at = await page.evaluate(() => window.__driveT || 0);

  // Travelling costs one rendered frame per simulated frame, so getting to minute two of
  // a world at 1280x720 takes minutes of wall clock. Nobody looks at the frames on the
  // way. (botplay already runs its whole course at 256x144 for the same reason.)
  const restore = await shrunk(page, shrink && toSeconds - at > 8);
  while (at < toSeconds - 1e-6) {
    const until = Math.min(toSeconds, at + SLICE);
    await page.evaluate(async ({ n, target, rate, pilot }) => {
      const w = window.__world;
      if (pilot && !window.__pilot) window.__pilot = (await import(`/worlds/${n}/pilot.js`)).default;
      const dt = 1 / rate;
      window.__driveT = window.__driveT || 0;
      const frames = Math.round((target - window.__driveT) * rate);
      for (let i = 0; i < frames; i++) {
        if (pilot) {
          const cmd = window.__pilot(w.observe(), w.getState(), window.__driveT);
          if (cmd) w.act(cmd);
        }
        w.renderFrame(dt);
        window.__driveT += dt;
      }
    }, { n: name, target: until, rate: hz, pilot: usePilot });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    at = until;
  }
  await restore();
  return { played: usePilot, at };
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
