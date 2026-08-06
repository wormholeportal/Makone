// verify.mjs — contract + health check for a world. Exit 0 = pass.
//
//   node harness/verify.mjs worlds/<name>
//   node harness/verify.mjs <name> --quick     # ~10s: does it still LOAD, does the console
//                                              #   stay clean, is the exported bundle current.
//                                              #   No luma, no budget, no pilot, no export.
//
// Checks (pass/fail): loads cleanly, WorldModule contract complete (assertContract runs
// inside loadWorld — base methods plus whole-or-nothing method families), 6 simulated
// seconds without console errors, triangle/draw-call budget, and — for a world that
// implements a timeline — that seekTo actually changes the frame.
//
// `--quick` exists because the full run costs a minute (more if the world declares late
// moments), which is a perfectly rational thing to skip during a tight edit loop — and
// skipping it is how a world sat BROKEN for a whole round of "fixed it": a string replace
// whose anchor had drifted left a reference undefined, the world threw on construction, and
// nothing said a word because nothing had loaded it. The cheap tier is the fix: it answers
// only "does it still come up, and is the file a human would open still the current one".
//
// Reports (facts, not gates): the probed capabilities and `animated`. Nothing is declared
// in world.json any more (D6), so nothing here can contradict a declaration; these are
// measurements for the author to read against their own intent.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openWorld, step, drive as playTo, worldNameFromArg } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Share of the frame that has to change over 6 seconds to call a world *visibly* animated.
 *  Calibrated on the worlds in this repo (see the table in docs/architecture.md D6).
 *  Deliberately a visibility bar, not a "does anything move at all" bar: a record player's
 *  platter spins 7.8 turns in those 6 seconds and moves 0.1% of the pixels, because a record
 *  is rotationally symmetric. `animated: false` with a non-zero `motion` is the honest report —
 *  something moves, and you cannot see it. */
const MOTION = 0.005;

/** What each declared `key` promises about the rendered frame.
 *
 *  Darkness was the one quality property in this repo with no number attached to it, so it was the
 *  one that drifted: ten scenes in a row came out night/dusk/underground and nothing complained,
 *  while draw calls — which DO have a number — were caught five times in the same run. Every
 *  quality bar that held here held because it was measured.
 *
 *  This is deliberately NOT "bright is better". A vent field at 2500 m has no ambient light and
 *  must be black; it declares `low` and is judged on whether it carries a highlight. What the
 *  gate catches is the cheap version: a world that went dark to hide unfinished form, and a
 *  `natural` world that quietly collapsed into the bottom of the range.
 *
 *  Calibrated on every world in this repo that could be measured (one heavy object world times
 *  out under load and was skipped). The population separates cleanly, thresholds sit in the gap:
 *
 *      median   0.02 0.02 0.04 0.04 0.05 0.05 0.08 0.14 0.16 0.17 0.17 0.25 │ 0.45 0.50 … 0.86
 *      dark     0.84 0.78 0.66 0.63 0.55 0.50 0.42 0.40 0.33 0.29 0.27 0.15 │ 0.01 0.00 … 0.00
 *
 *  Thirteen worlds sit on the left of that line and declare `low`. `high` has none yet; it is
 *  here so a snow scene has somewhere to land, the same reason `format` survives with one value
 *  (architecture D2). */
const LUMA = {
  natural: { maxDark: 0.12, minMedian: 0.25 },
  low: { minBright: 0.008 },
  high: { minMedian: 0.42 },
};

const name = worldNameFromArg(process.argv[2]);
const quick = process.argv.includes('--quick');
const record = JSON.parse(await fs.readFile(path.join(ROOT, 'worlds', name, 'world.json'), 'utf8'));
const { bundleStatus } = await import('./export.mjs');
// The cheap tier's whole job is "does it still come up", so a world that does NOT come up
// has to be an answer in the same shape as every other answer, not a stack trace.
let opened;
try {
  opened = await openWorld(name);
} catch (err) {
  if (!quick) throw err;
  console.log(JSON.stringify({
    world: name, quick: true, pass: false,
    problems: [`world failed to load: ${String(err.message || err).split('\n').join(' · ')}`],
  }, null, 2));
  process.exit(1);
}
const { page, errors, close } = opened;

if (quick) {
  await step(page, 0.5);
  const caps0 = await page.evaluate(() => ({
    timeline: typeof window.__world.seekTo === 'function',
    interactive: typeof window.__world.act === 'function',
  }));
  await close();
  const bundle = await bundleStatus(name);
  const problems0 = errors.map((e) => `console: ${e}`);
  if (bundle === 'stale') {
    problems0.push('the exported bundle is older than its source — worlds/'
      + `${name}/${name}.html is not what this code builds. Run: node harness/export.mjs ${name}`);
  }
  console.log(JSON.stringify({
    world: name, quick: true, ...caps0, bundle,
    pass: problems0.length === 0, problems: problems0,
  }, null, 2));
  process.exit(problems0.length ? 1 : 0);
}

const caps = await page.evaluate(() => ({
  timeline: typeof window.__world.seekTo === 'function',
  interactive: typeof window.__world.act === 'function',
}));

/** One moment is three luma samples: a frame can be caught mid-flash (a lighthouse is dark for
 *  26 of every 30 seconds), so the median is averaged and the highlight is taken at its PEAK —
 *  "does this world ever show you something bright" is the question, not "right now". */
async function sample(spacing) {
  const shots = [];
  for (let i = 0; i < 3; i++) {
    if (i) await step(page, spacing);
    shots.push(await page.evaluate(() => window.__luma()));
  }
  const mean = (k) => shots.reduce((a, s) => a + s[k], 0) / shots.length;
  return {
    luma: {
      median: Number(mean('median').toFixed(3)),
      dark: Number(mean('dark').toFixed(3)),
      bright: Number(Math.max(...shots.map((s) => s.bright)).toFixed(3)),
    },
    // The other axis. `luma` says where the pixels sit; `chroma` says whether there is more than
    // one colour among them — see play.html's probe for why. Facts, never gates.
    chroma: {
      sat: Number(mean('sat').toFixed(3)),
      spread: Number(mean('spread').toFixed(3)),
    },
  };
}

// A world with a long cycle — a day, a tide, a season — was only ever measured over its first
// six seconds, so the half of it that is most likely to be mud (the night) never reached the
// gate at all. `world.json` can now name the moments that have to be judged, each carrying its
// OWN key, because a game that is `natural` at noon really is `low` at midnight and one number
// cannot be honest about both:
//
//     "verify": { "at": [ { "s": 4, "key": "natural", "name": "day" },
//                         { "s": 62, "key": "low", "name": "night by the fire" } ] }
//
// Declared moments REPLACE the default — list the opening one explicitly if you still want it.
// Reaching a late moment means playing the world, so this drives `pilot.js` when there is one:
// a game left standing still until midnight is measuring its own death screen.
const MOMENTS = (record.verify?.at || []).map((m, i) => (typeof m === 'number'
  ? { s: m, name: `t${m}s` }
  : { s: Number(m.s ?? m.at ?? 0), key: m.key, name: m.name || `t${m.s ?? m.at}s` }))
  .sort((a, b) => a.s - b.s);

await page.evaluate(() => window.__motion());          // baseline
const moments = [];
if (MOMENTS.length) {
  for (const m of MOMENTS) {
    await playTo(page, name, m.s, { quiet: true });
    moments.push({ ...m, ...(await sample(0.7)) });
  }
} else {
  await step(page, 2);
  moments.push({ s: 6, name: 'opening', ...(await sample(2)) });
}
const motion = await page.evaluate(() => window.__motion());
const { luma, chroma } = moments[0];

// A world that implements a timeline claims time is an addressable coordinate. Check it.
let timelineMoves = null;
if (caps.timeline) {
  await page.evaluate(() => { window.__world.seekTo(0); window.__motion(); window.__world.seekTo(1); });
  timelineMoves = await page.evaluate(() => window.__motion());
}

// And a world that implements `act` claims to be PLAYABLE. That claim used to be a `typeof` and
// nothing else, which is how `gorge` shipped a build where every command handed to `act()` was
// overwritten by the keyboard read on the next frame: the whole playable contract implemented,
// reported green, and completely inert.
//
// Three seconds through the world's own `worlds/<name>/pilot.js` is enough to catch that, and a
// missing pilot is enough to catch "nobody has ever driven this". It is NOT enough to catch a
// wrong control convention — an inverted yaw sign takes a corner to show up — so this warns you
// to go and run `botplay`, which flies the whole course. Cheap check here, real one there.
let drive = null;
const driveWarnings = [];
if (caps.interactive) {
  const hasPilot = await fs.stat(path.join(ROOT, 'worlds', name, 'pilot.js')).then(() => true, () => false);
  if (!hasPilot) {
    driveWarnings.push(`implements act() but has no worlds/${name}/pilot.js — the playable `
      + 'contract has never been exercised (harness/botplay.mjs)');
  } else {
    drive = await page.evaluate(async (n) => {
      const pilot = (await import(`/worlds/${n}/pilot.js`)).default;
      const w = window.__world;
      const first = JSON.stringify(w.getState());
      let acted = 0, moved = false;
      for (let i = 0; i < 90; i++) {
        const cmd = pilot(w.observe(), w.getState(), i / 30);
        if (cmd) { w.act(cmd); acted++; }
        w.renderFrame(1 / 30);
        if (!moved && JSON.stringify(w.getState()) !== first) moved = true;
      }
      const st = w.getState();
      return { acted, moved, terminal: !!(st.terminal ?? st.dead ?? st.won) };
    }, name).catch((err) => ({ error: String(err) }));
  }
}

// ── hands ────────────────────────────────────────────────────────────────────
// `act()` is one of a world's two interfaces, and the harness only ever drove that one.
// Three bugs shipped through the other seam in a single build of `dontstarve2`, each
// invisible to `botplay` because the pilot calls `act({interact})` and never presses
// anything: a click that walked to the target and then stood there forever, a crafting
// panel that rebuilt itself ten times a second so no `click` event could ever fire, and
// a handler that read `e.buttons` — which synthetic events do not set.
//
// A generic checker cannot know what a click SHOULD do. It can check two things that are
// wrong in every world:
//
//   1. Real input must not throw. Playwright's mouse and keyboard generate the same events
//      a person's do, including the ones an author never dispatches by hand.
//   2. **A control must survive being pressed.** A browser only fires `click` when down and
//      up land on the same node, so any element that rebuilds itself while the button is
//      held is a button that cannot be pressed. This is checked while the world is TICKING,
//      because that is when a HUD redraws — a test that holds the button with the world
//      paused passes against the broken build, which is exactly what my first attempt did.
const HOLD = 4;                     // frames the world advances while the button is down
const hands = { pressed: 0, swallowed: [], errorsBefore: errors.length };
{
  const box = await page.locator('canvas').first().boundingBox();
  if (box) {
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.evaluate((n) => window.__step(1 / 30, n), HOLD);
    await page.mouse.move(cx + 40, cy + 24);
    await page.mouse.up();
    await page.keyboard.press('Space');
    await page.keyboard.press('KeyW');
    await page.evaluate(() => window.__step(1 / 30, 6));
  }

  // Every control the world put on screen, pressed the way a person presses one.
  //
  // Scanned one at a time, immediately before each press, and that ordering is the
  // whole check. Scanning them all up front does not work in either direction: an
  // earlier press can dismiss a later control (a title card's Begin button takes its
  // own panel with it — that is the control WORKING), and a panel that rebuilds itself
  // has already replaced the rest of the list before the first press lands, so the
  // evidence is gone by the time you look. Freshly scanned, still there when the button
  // goes down: if it is gone when the button comes up, it was replaced, and no click
  // event can ever have fired on it.
  const tally = {};
  for (let n = 0; n < 12; n++) {
    const c = await page.evaluate((mark) => {
      // the WORLD's controls, not the player page's chrome: everything a world
      // draws lives inside the container it was handed
      const root = document.getElementById('stage') || document.body;
      for (const el of root.querySelectorAll('*')) {
        if (el.tagName === 'CANVAS' || el.dataset.dsProbe) continue;
        const st = getComputedStyle(el);
        if (st.pointerEvents !== 'auto' || st.display === 'none' || st.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8 || r.width > 900 || r.height > 700) continue;
        if (r.x < 0 || r.y < 0) continue;
        el.dataset.dsProbe = mark;
        return { x: r.x + r.width / 2, y: r.y + r.height / 2,
          tag: (el.className || el.tagName).toString().split(' ')[0] };
      }
      return null;
    }, `p${n}`);
    if (!c) break;
    tally[c.tag] = (tally[c.tag] || 0) + 1;
    if (tally[c.tag] > 3) continue;                    // three of a kind is enough
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.evaluate((f) => window.__step(1 / 30, f), HOLD);
    const alive = await page.evaluate((id) => !!document.querySelector(`[data-ds-probe="${id}"]`), `p${n}`);
    await page.mouse.up();
    hands.pressed++;
    if (!alive) hands.swallowed.push(c.tag);
  }
  hands.errors = errors.length - hands.errorsBefore;
  delete hands.errorsBefore;
}

// Budget is measured by WALKING THE SCENE, not by reading `renderer.info`.
//
// info.render is reset on every renderer.render() call, and a world that renders through an
// EffectComposer calls it once per pass — so info holds only the LAST pass, a full-screen quad.
// Measured on erdtree: 181 meshes and ~614k triangles reported as `{triangles: 1, calls: 1}`.
// Four worlds in this repo render through a composer, two of them declare budgets, and all of
// them passed this gate unconditionally. The gate documented (architecture D-budget) as the one
// number that resisted drift was silently dead exactly where scenes get heavy enough to need it.
//
// Walking the graph decouples the gate from how a world chooses to render. It counts scene
// CONTENT rather than what the frustum drew, so it is an upper bound — which is the right bias
// for a budget: you are promising what you built, not what happened to be on screen.
const info = await page.evaluate(() => {
  const scene = window.__world.getScene();
  const isWhite = (c) => !c || (c.r > 0.99 && c.g > 0.99 && c.b > 0.99);
  let triangles = 0, drawCalls = 0;
  const audit = [];
  const say = (o, msg) => audit.push(`${o.name || o.type}: ${msg}`);

  scene.traverse((o) => {
    if (!o.visible || !(o.isMesh || o.isPoints || o.isLine)) return;
    const g = o.geometry;
    if (g) {
      const verts = g.index ? g.index.count : (g.attributes.position?.count || 0);
      triangles += Math.round((verts / 3) * (o.isInstancedMesh ? o.count : 1));
    }
    drawCalls += 1;

    // Material traps: every one of these renders as "too dark" or "black", which reads
    // like a lighting problem and sends you off tuning lights for hours. They are all
    // statically detectable, so detect them.
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (!m) continue;
      if (m.vertexColors === true && !g?.attributes.color) {
        say(o, 'material.vertexColors is true but the geometry has no `color` attribute — the '
          + 'shader multiplies by an undefined attribute (= 0) and the mesh renders black. '
          + "An InstancedMesh's instanceColor needs no flag at all.");
      }
      if (o.isInstancedMesh && o.instanceColor && !isWhite(m.color)) {
        say(o, `material.color (#${m.color.getHexString()}) MULTIPLIES instanceColor — tinting `
          + 'both crushes the result. Let the instances carry the colour and keep the material white.');
      }
      // DoubleSide alone is fine — a petal disc wants it. The bug is DoubleSide over
      // AUTHORED normals (grass blades whose normals are tilted skyward rather than
      // along the surface): back faces get those normals inverted and go black. Detect
      // it by comparing the first face's geometric normal against its vertex normals —
      // they only disagree when someone authored them by hand.
      if (m.side === 2 /* DoubleSide */ && g?.attributes.normal && g.attributes.position.count >= 3) {
        const P = g.attributes.position, N = g.attributes.normal;
        const i0 = g.index ? g.index.getX(0) : 0;
        const i1 = g.index ? g.index.getX(1) : 1;
        const i2 = g.index ? g.index.getX(2) : 2;
        const at = (A, i) => [A.getX(i), A.getY(i), A.getZ(i)];
        const [ax, ay, az] = at(P, i0), [bx, by, bz] = at(P, i1), [cx, cy, cz] = at(P, i2);
        const ux = bx - ax, uy = by - ay, uz = bz - az;
        const vx = cx - ax, vy = cy - ay, vz = cz - az;
        let fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
        const fl = Math.hypot(fx, fy, fz);
        if (fl > 1e-9) {
          fx /= fl; fy /= fl; fz /= fl;
          const [nx, ny, nz] = at(N, i0);
          if (Math.abs(fx * nx + fy * ny + fz * nz) < 0.8) {
            say(o, 'DoubleSide over authored normals: this geometry\'s vertex normals do not '
              + 'match its surface (deliberately, e.g. grass blades tilted skyward), and '
              + 'DoubleSide inverts them on back faces — so half of them point at the ground '
              + 'and render black. Author the back faces into the geometry and use FrontSide.');
          }
        }
      }
      if (m.map && m.map.colorSpace !== 'srgb') {
        say(o, 'material.map is a colour texture but its colorSpace is not SRGBColorSpace — '
          + 'it will render desaturated and dark.');
      }
    }
  });

  return {
    triangles, drawCalls, audit: [...new Set(audit)],
    budget: window.__meta.budget || null,
    key: window.__meta.key || 'natural',
  };
});

// Frame cost. Headless chromium renders in software, so the ABSOLUTE number means nothing
// about a real GPU — but it is measured identically for every world, so it compares them
// honestly and catches a world that got 10x heavier. readPixels forces the GPU to finish;
// without it this times how fast we can queue work, not how long the frame takes.
const frameMs = await page.evaluate(() => {
  const w = window.__world, gl = w.getRenderer().getContext(), px = new Uint8Array(4);
  const tick = () => {
    w.renderFrame(1 / 60);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  for (let i = 0; i < 5; i++) tick();                       // warm up shaders and caches
  const t = [];
  for (let i = 0; i < 25; i++) { const a = performance.now(); tick(); t.push(performance.now() - a); }
  return Number(t.sort((a, b) => a - b)[12].toFixed(1));    // median
});
await close();

const problems = [...errors.map((e) => `console: ${e}`)];
if (info.budget?.tris && info.triangles > info.budget.tris)
  problems.push(`triangles ${info.triangles} > budget ${info.budget.tris}`);
if (info.budget?.drawCalls && info.drawCalls > info.budget.drawCalls)
  problems.push(`drawCalls ${info.drawCalls} > budget ${info.budget.drawCalls}`);
if (timelineMoves !== null && timelineMoves < MOTION)
  problems.push(`timeline: seekTo(0) and seekTo(1) render the same frame (motion ${timelineMoves.toFixed(4)})`);

// The key is a promise about the frame. Check it against the frame — once per declared moment,
// against that moment's own key.
function keyProblems(key, l, where) {
  const at = where ? ` at "${where}"` : '';
  const bar = LUMA[key];
  if (!bar) return [`key "${key}"${at} is not one of ${Object.keys(LUMA).join(' / ')}`];
  if (key === 'natural') {
    if (l.dark > bar.maxDark) {
      return [`key "natural"${at} but ${(l.dark * 100).toFixed(0)}% of the frame is below 5% `
        + `luminance (max ${bar.maxDark * 100}%) — raise the fill, cut the fog, or declare "low"`];
    }
    if (l.median < bar.minMedian) {
      return [`key "natural"${at} but the median pixel is ${l.median.toFixed(3)} `
        + `(min ${bar.minMedian}) — the whole range has collapsed into the bottom`];
    }
  } else if (key === 'low' && l.bright < bar.minBright) {
    return [`key "low"${at} but nothing in the frame is bright (${(l.bright * 100).toFixed(1)}% `
      + `above 55% luminance, min ${bar.minBright * 100}%) — a dark world still needs a lit focal `
      + 'subject, or it is mud rather than mood'];
  } else if (key === 'high' && l.median < bar.minMedian) {
    return [`key "high"${at} but the median pixel is ${l.median.toFixed(3)} (min ${bar.minMedian})`];
  }
  return [];
}
for (const m of moments) {
  m.key = m.key || info.key;
  m.problems = keyProblems(m.key, m.luma, MOMENTS.length ? m.name : null);
  problems.push(...m.problems);
}

// A world that passes gets its single-file bundle refreshed, right here. Exporting used to be a
// separate step the workflow asked for and nothing enforced — ten objects were built, reviewed
// and committed without one. It costs ~0.2s (0.6s with manifold's wasm) against verify's own
// eight seconds, and it means the artifact a human can actually open is never older than the
// last green run. A world that FAILS keeps its old bundle: a broken build should not ship.
// `--no-export` for the tight loop, and for CI, which checks the committed bundle instead.
let bundle = null;
if (problems.length === 0 && !process.argv.includes('--no-export')) {
  const { exportWorld } = await import('./export.mjs');
  bundle = (await exportWorld({ path: name })).trim();
}

if (hands.swallowed.length) {
  problems.push(`a control is rebuilt while the pointer is held, so it can never be clicked: `
    + `${[...new Set(hands.swallowed)].join(', ')} — a browser only fires click when mousedown `
    + 'and mouseup land on the same node. Rebuild the DOM only when its shape changes.');
}
if (drive?.error) problems.push(`pilot.js threw: ${drive.error}`);
else if (drive && drive.acted > 0 && !drive.moved && !drive.terminal)
  problems.push('act() was called and getState() never changed — the playable contract is inert');

const { audit, ...facts } = info;
console.log(JSON.stringify({
  world: name,
  ...caps,
  animated: motion > MOTION,
  ...(caps.interactive ? { piloted: !!drive } : {}),
  motion: Number(motion.toFixed(4)),
  hands,
  frameMs,
  luma,
  chroma,
  ...(MOMENTS.length ? { moments: moments.map(({ s, name, key, luma, chroma }) => ({ s, name, key, luma, chroma })) } : {}),
  ...facts,
  pass: problems.length === 0,
  problems,
  // Heuristics, not gates: each one is a real trap this repo has hit, but a world is allowed
  // to do any of them on purpose. They warn, they never fail a build.
  warnings: [...audit, ...driveWarnings],
  bundle,
}, null, 2));
process.exit(problems.length ? 1 : 0);
