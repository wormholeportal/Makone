// inspect.mjs — single-part review packet: a contact sheet plus the numbers a
// screenshot cannot tell you (D7). Screenshots catch semantic errors; the facts table
// catches the ones the eye reads as "fine" — wrong absolute size, off datum, no reuse.
//
//   node harness/inspect.mjs <world>                 # every part in worlds/<world>/parts/
//   node harness/inspect.mjs <world> --part horn     # just one
//   node harness/inspect.mjs <world> --part horn --ref refs/horn.jpg   # side by side
//   node harness/inspect.mjs <world> --views iso,isoback,top,front,side --size 900x600
//
// Output: worlds/<world>/shots/parts/<part>/{view}.png + sheet.png, facts JSON on stdout.
// Exit 1 on console errors or empty geometry.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openWorld } from './lib.mjs';
import { composeSheet } from './sheet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (flag, dflt) => { const i = args.indexOf(flag); return i > 0 ? args[i + 1] : dflt; };

const world = (args[0] || '').replace(/^worlds\//, '').replace(/\/$/, '');
if (!world) { console.error('usage: node harness/inspect.mjs <world> [--part <name>] [--ref <img>]'); process.exit(1); }

const partsDir = path.join(ROOT, 'worlds', world, 'parts');
const only = opt('--part', null)?.replace(/\.js$/, '');
const views = opt('--views', 'iso,isoback,top,front').split(',');
const [width, height] = opt('--size', '900x600').split('x').map(Number);
const ref = opt('--ref', null);

const files = (await fs.readdir(partsDir).catch(() => {
  console.error(`no parts dir: worlds/${world}/parts/ — a part is a pure build(params) -> Object3D (D7)`);
  process.exit(1);
})).filter((f) => f.endsWith('.js') && (!only || f === `${only}.js`)).sort();

if (!files.length) { console.error(`no part matched ${only ?? '*'} in worlds/${world}/parts/`); process.exit(1); }

const report = [];
for (const file of files) {
  const part = file.replace(/\.js$/, '');
  const outDir = path.join(ROOT, 'worlds', world, 'shots', 'parts', part);
  await fs.mkdir(outDir, { recursive: true });

  const { page, errors, close } = await openWorld(null, { width, height, part: `${world}/parts/${file}` });
  const canvas = page.locator('canvas').first();
  const shots = [];
  for (const v of views) {
    await page.evaluate((name) => { window.__world.setView(name); window.__world.renderFrame(0); }, v);
    const f = path.join(outDir, `${v}.png`);
    await canvas.screenshot({ path: f });
    shots.push({ view: v, file: f });
  }
  const facts = await page.evaluate(() => ({
    ...window.__world.getFacts(),
    datum: window.__meta.datum,
    params: window.__meta.params,
    inventory: window.__meta.inventory,
  }));
  await close();

  const problems = errors.map((e) => `console: ${e}`);
  if (!facts.triangles) problems.push('no geometry: build() returned nothing renderable');
  const warnings = [];
  if (facts.datum !== 'mounted' && !facts.grounded)
    warnings.push(`not grounded: bbox.minY = ${facts.bbox.minY} (D7 datum: y=0 is the contact face; `
      + `export const datum = 'mounted' if this part hangs off another)`);
  if (facts.inventory && !facts.inventory.length) warnings.push('inventory is empty');

  const sheet = await renderSheet({ world, part, outDir, shots, facts, problems, warnings, ref, width });
  report.push({ part, facts, sheet: path.relative(ROOT, sheet), problems, warnings });
}

console.log(JSON.stringify({ world, parts: report }, null, 2));
for (const r of report) console.log(`\n${r.sheet}`);
if (report.some((r) => r.problems.length)) process.exit(1);

// ---------------------------------------------------------------------------

/** The shots (plus an optional reference) in one picture, with the facts underneath. */
async function renderSheet({ world, part, outDir, shots, facts, problems, warnings, ref, width }) {
  const cells = [];
  if (ref) cells.push({ label: 'REFERENCE', file: ref });
  for (const s of shots) cells.push({ label: s.view, file: s.file });

  return composeSheet({
    outDir, cellWidth: width, aspect: width / height,
    title: `${world}/parts/${part}`,
    cells,
    blocks: [
      { table: [
        ['size w×h×d', `${facts.size.w} × ${facts.size.h} × ${facts.size.d} m`],
        ['aspect w/h', facts.aspect.wh],
        ['datum', facts.datum === 'mounted' ? 'mounted'
          : facts.grounded ? '<span class="ok">grounded</span>'
            : `<span class="warn">off datum (minY ${facts.bbox.minY})</span>`],
        ['centered xz', facts.centeredXZ ? '<span class="ok">yes</span>' : '<span class="warn">no</span>'],
      ] },
      { table: [
        ['triangles', facts.triangles.toLocaleString()],
        ['meshes', facts.meshes],
        ['geometries', `${facts.geometries} (reuse ×${facts.sharedGeometry})`],
        ['materials', facts.materials],
        ['pivots', facts.pivots.length ? facts.pivots.join(', ') : '—'],
      ] },
      { title: 'inventory', items: facts.inventory ?? [] },
      { title: 'problems', items: problems, tone: 'bad' },
      { title: 'warnings', items: warnings, tone: 'warn' },
    ],
  });
}
