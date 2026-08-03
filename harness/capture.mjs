// capture.mjs — headless screenshots of a world, for the agent's visual feedback loop.
//
//   node harness/capture.mjs worlds/<name>            # 1 shot; how to shoot is picked from what the
//                                                     #   world implements — a timeline world gets
//                                                     #   sampled at 0/0.5/0.9, everything else gets
//                                                     #   2 simulated seconds first (D6)
//   node harness/capture.mjs <name> --shots 4         # orbit: 4 azimuths around the target
//   node harness/capture.mjs <name> --arc -60,60      # limit orbit to an azimuth arc (deg) —
//                                                     #   for walled/interior scenes where 360° hits
//                                                     #   walls. Persist it as "capture": {"arc": [...]}
//                                                     #   in world.json and every run picks it up.
//   node harness/capture.mjs <name> --at 0,0.5,0.9    # override: seek these timeline positions (0..1)
//   node harness/capture.mjs <name> --after 6         # override: simulate N seconds first
//   node harness/capture.mjs <name> --size 1280x720 --out <dir>
//   node harness/capture.mjs <name> --ref ref.jpg     # comparison sheet: the reference sits in the
//                                                     #   same frame as the shots. Point it at a photo,
//                                                     #   a design frame, or the PREVIOUS capture to
//                                                     #   get a before/after — comparing against memory
//                                                     #   is how a regression survives a review.
//   node harness/capture.mjs <name> --sheet           # same sheet, no reference
//   node harness/capture.mjs <name> --hero            # ONE frame at 1920×1080, not in any sheet
//
// --hero exists because a contact sheet is a comparison tool and a bad verification tool, and
// the difference is not obvious until it costs you. On the clipper every gate was green and all
// six part sheets were clean while the masts were passing straight THROUGH the canvas of six
// sails and every sail was self-shadowing into black ragged patches. Both were invisible in a
// 900×600 review cell and both were unmissable the first time a frame was rendered at full size.
// A thumbnail can tell you which of two frames is better. It cannot tell you whether either one
// is finished. Shoot one of these and actually look at it before you call a world done.
//
// Output: PNG paths on stdout (one per line) + console-error summary. Exit 1 on errors.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openWorld, step, worldNameFromArg } from './lib.mjs';
import { composeSheet } from './sheet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const name = worldNameFromArg(args[0]);
const opt = (flag, dflt) => { const i = args.indexOf(flag); return i > 0 ? args[i + 1] : dflt; };
const shotsFlag = opt('--shots', null);
const atsFlag = opt('--at', null);
const afterFlag = opt('--after', null);
// A hero frame defaults BIG. The whole point of it is the resolution, so making the caller
// remember --size would defeat it on exactly the runs where it matters.
const hero = args.includes('--hero');
const [width, height] = opt('--size', hero ? '1920x1080' : '1280x720').split('x').map(Number);
// A world's shots land WITH the world (worlds/<name>/shots/), so the frames sit next to the
// code that made them while you review. They are review artifacts, not history — look, then
// keep them out of the commit; the ones that matter belong in the pull request.
const outDir = opt('--out', `worlds/${name.split('/').pop()}/shots`);
// A reference is resolved against the world first, so the workflow's own convention —
// `worlds/<name>/refs/` (git-ignored, see docs/principles.md workflow 2) — can be written the
// short way: `--ref refs/gull.jpg`. Anything else is taken as an ordinary path.
let ref = opt('--ref', null);
if (ref && !(await fs.stat(ref).catch(() => null))) {
  const inWorld = path.join(ROOT, 'worlds', name, ref);
  if (await fs.stat(inWorld).catch(() => null)) ref = inWorld;
}
const wantSheet = !!ref || args.includes('--sheet');

if (ref && !(await fs.stat(ref).catch(() => null))) {
  console.error(`--ref: no such file "${ref}" — a reference photo (worlds/${name}/refs/...), `
    + 'a design frame, or an earlier capture');
  process.exit(1);
}

// A walled world cannot be shot from 360°: half the frames end up inside a wall or under the
// floor. That is a property of the WORLD, not of the invocation, so it lives in its world.json
// as `capture.arc` and one identical command shoots every world correctly:
//     node harness/capture.mjs <name> --shots 4 --sheet
// An explicit --arc still wins, and a world without the field gets the full circle.
const record = JSON.parse(await fs.readFile(path.join(ROOT, 'worlds', name, 'world.json'), 'utf8'));

const { page, errors, close } = await openWorld(name, { width, height });
await fs.mkdir(outDir, { recursive: true });
const canvas = page.locator('canvas').first();
const saved = [];

// Pick how to shoot from what the world actually implements (D6) — nothing is declared.
// A world with a timeline gets sampled along it; anything else gets a couple of simulated
// seconds first, so a living world is never caught on frame zero. Explicit flags always win.
const caps = await page.evaluate(() => ({ timeline: typeof window.__world.seekTo === 'function' }));
const ats = hero ? null
  : atsFlag ? atsFlag.split(',').map(Number)
    : (caps.timeline && !shotsFlag ? [0, 0.5, 0.9] : null);
const shots = Number(shotsFlag ?? 1);
const after = Number(afterFlag ?? (ats ? 0 : 2));

async function shoot(tag) {
  const file = path.join(outDir, `${tag}.png`);
  await canvas.screenshot({ path: file });
  saved.push({ label: tag, file });
}

if (hero) {
  // The world's own camera, held, at full size. No orbit and no timeline sampling: a hero frame
  // is the shot the author framed, rendered big enough to be judged. An --arc or --at is a
  // different question and gets a different run.
  if (after > 0) await step(page, after);
  const az = opt('--arc', null)?.split(',').map(Number)?.[0];
  if (az !== undefined) await page.evaluate((a) => window.__orbit(a), az);
  await shoot('hero');
} else if (ats) {
  for (const t of ats) {
    await page.evaluate((tt) => { window.__world.seekTo(tt); window.__world.renderFrame(0); }, t);
    await shoot(`t${t}`);
  }
} else {
  if (after > 0) await step(page, after);
  if (shots <= 1) {
    await shoot('shot-0');
  } else {
    const arc = opt('--arc', null)?.split(',').map(Number) ?? record.capture?.arc;
    const [a0, a1] = arc ?? [0, 360 - 360 / shots];          // no arc anywhere = the full circle
    for (let i = 0; i < shots; i++) {
      const az = a0 + ((a1 - a0) / Math.max(1, shots - 1)) * i;
      await page.evaluate((a) => window.__orbit(a), az);
      await shoot(`az${Math.round(az)}`);
    }
  }
}

const info = await page.evaluate(() => {
  const r = window.__world.getRenderer().info.render;
  return { brief: window.__meta?.brief ?? null, triangles: r.triangles, drawCalls: r.calls };
});
await close();
for (const f of saved) console.log(f.file);

if (wantSheet) {
  const cells = ref ? [{ label: 'REFERENCE', file: ref }, ...saved] : saved;
  console.log(await composeSheet({
    outDir, cellWidth: width, aspect: width / height,
    title: name + (ref ? `  —  vs ${path.basename(ref)}` : ''),
    cells,
    blocks: [
      { table: [
        ['shots', saved.map((s) => s.label).join(', ')],
        ['triangles', info.triangles.toLocaleString()],
        ['drawCalls', info.drawCalls],
      ] },
      { title: 'brief', items: info.brief ? [info.brief] : [] },
      { title: 'console errors', items: errors, tone: 'bad' },
    ],
  }));
}

if (errors.length) {
  console.error(`\nconsole errors (${errors.length}):\n` + errors.join('\n'));
  process.exit(1);
}
