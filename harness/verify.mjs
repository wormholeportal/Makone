// verify.mjs — contract + health check for a world. Exit 0 = pass.
//
//   node harness/verify.mjs worlds/<name>
//
// Checks (pass/fail): loads cleanly, WorldModule contract complete (assertContract runs
// inside loadWorld — base methods plus whole-or-nothing method families), 6 simulated
// seconds without console errors, triangle/draw-call budget, and — for a world that
// implements a timeline — that seekTo actually changes the frame.
//
// Reports (facts, not gates): the probed capabilities and `animated`. Nothing is declared
// in world.json any more (D6), so nothing here can contradict a declaration; these are
// measurements for the author to read against their own intent.
import { openWorld, step, worldNameFromArg } from './lib.mjs';

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
const { page, errors, close } = await openWorld(name);

const caps = await page.evaluate(() => ({
  timeline: typeof window.__world.seekTo === 'function',
  interactive: typeof window.__world.act === 'function',
}));

// Six seconds, sampled three times: one frame can be caught mid-flash (a lighthouse is dark for
// 26 of every 30 seconds), so the median is averaged and the highlight is taken at its PEAK —
// "does this world ever show you something bright" is the question, not "right now".
await page.evaluate(() => window.__motion());          // baseline
const shots = [];
for (let i = 0; i < 3; i++) {
  await step(page, 2);
  shots.push(await page.evaluate(() => window.__luma()));
}
const motion = await page.evaluate(() => window.__motion());
const mean = (k) => shots.reduce((a, s) => a + s[k], 0) / shots.length;
const luma = {
  median: Number(mean('median').toFixed(3)),
  dark: Number(mean('dark').toFixed(3)),
  bright: Number(Math.max(...shots.map((s) => s.bright)).toFixed(3)),
};

// A world that implements a timeline claims time is an addressable coordinate. Check it.
let timelineMoves = null;
if (caps.timeline) {
  await page.evaluate(() => { window.__world.seekTo(0); window.__motion(); window.__world.seekTo(1); });
  timelineMoves = await page.evaluate(() => window.__motion());
}

const info = await page.evaluate(() => {
  const r = window.__world.getRenderer().info.render;
  return {
    triangles: r.triangles, drawCalls: r.calls,
    budget: window.__meta.budget || null,
    key: window.__meta.key || 'natural',
  };
});
await close();

const problems = [...errors.map((e) => `console: ${e}`)];
if (info.budget?.tris && info.triangles > info.budget.tris)
  problems.push(`triangles ${info.triangles} > budget ${info.budget.tris}`);
if (info.budget?.drawCalls && info.drawCalls > info.budget.drawCalls)
  problems.push(`drawCalls ${info.drawCalls} > budget ${info.budget.drawCalls}`);
if (timelineMoves !== null && timelineMoves < MOTION)
  problems.push(`timeline: seekTo(0) and seekTo(1) render the same frame (motion ${timelineMoves.toFixed(4)})`);

// The key is a promise about the frame. Check it against the frame.
const bar = LUMA[info.key];
if (!bar) {
  problems.push(`key "${info.key}" is not one of ${Object.keys(LUMA).join(' / ')}`);
} else if (info.key === 'natural') {
  if (luma.dark > bar.maxDark)
    problems.push(`key "natural" but ${(luma.dark * 100).toFixed(0)}% of the frame is below 5% `
      + `luminance (max ${bar.maxDark * 100}%) — raise the fill, cut the fog, or declare "low"`);
  else if (luma.median < bar.minMedian)
    problems.push(`key "natural" but the median pixel is ${luma.median.toFixed(3)} `
      + `(min ${bar.minMedian}) — the whole range has collapsed into the bottom`);
} else if (info.key === 'low' && luma.bright < bar.minBright) {
  problems.push(`key "low" but nothing in the frame is bright (${(luma.bright * 100).toFixed(1)}% `
    + `above 55% luminance, min ${bar.minBright * 100}%) — a dark world still needs a lit focal `
    + 'subject, or it is mud rather than mood');
} else if (info.key === 'high' && luma.median < bar.minMedian) {
  problems.push(`key "high" but the median pixel is ${luma.median.toFixed(3)} (min ${bar.minMedian})`);
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

console.log(JSON.stringify({
  world: name,
  ...caps,
  animated: motion > MOTION,
  motion: Number(motion.toFixed(4)),
  luma,
  ...info,
  pass: problems.length === 0,
  problems,
  bundle,
}, null, 2));
process.exit(problems.length ? 1 : 0);
