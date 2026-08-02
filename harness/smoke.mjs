// smoke.mjs — does the loop itself still work? Run this after touching harness/ or runtime/.
//
//   node harness/smoke.mjs
//
// Scaffolds a throwaway world, drives every step of the agent loop against it, and
// deletes it. Each case exists because it broke once:
//   · capture with --after and a single shot     (a busy page made Playwright's locator time out)
//   · a world with no tint on its figures        (a mannequin `map()` method landed in material.map)
//   · catalog --check after create               (a hand-edited index.json goes stale silently)
// Exit 0 = the loop is intact.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'smoketest';
const OUT = path.join(ROOT, 'worlds', NAME, 'smoke');   // inside the throwaway world, deleted with it

const run = (args, label) => new Promise((resolve) => {
  const p = spawn('node', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  p.stdout.on('data', (d) => { out += d; });
  p.stderr.on('data', (d) => { err += d; });
  p.on('close', (code) => resolve({ label, code, out, err }));
});

const results = [];
async function step(label, args, check) {
  const r = await run(args, label);
  const problem = r.code !== 0 ? `exit ${r.code}: ${(r.err || r.out).trim().split('\n').slice(-3).join(' ')}`
    : (check ? await check(r) : null);
  results.push({ label, ok: !problem, problem });
  console.log(`${problem ? 'FAIL' : ' ok '}  ${label}${problem ? `\n      ${problem}` : ''}`);
}

await fs.rm(path.join(ROOT, 'worlds', NAME), { recursive: true, force: true });
await fs.rm(OUT, { recursive: true, force: true });

try {
  await step('create scaffolds a world', ['harness/create.mjs', NAME, '--type', 'scene', '--brief', 'smoke test'],
    async () => (await fs.stat(path.join(ROOT, 'worlds', NAME, 'main.js')).catch(() => null)) ? null : 'no main.js');

  await step('catalog --check is current after create', ['harness/catalog.mjs', '--check']);

  await step('verify passes on a fresh world', ['harness/verify.mjs', NAME],
    (r) => JSON.parse(r.out).pass ? null : `verify said: ${r.out}`);

  // The regression: --after with a single shot. Do not "fix" this by adding --shots.
  await step('capture --after with one shot', ['harness/capture.mjs', NAME, '--after', '2', '--out', `worlds/${NAME}/smoke`],
    async () => (await fs.stat(path.join(OUT, 'shot-0.png')).catch(() => null)) ? null : 'no png written');

  await step('capture --shots orbits', ['harness/capture.mjs', NAME, '--shots', '2', '--out', `worlds/${NAME}/smoke`],
    async () => (await fs.readdir(OUT)).filter((f) => f.startsWith('az')).length === 2 ? null : 'expected 2 orbit frames');

  await step('export writes a self-contained page', ['harness/export.mjs', NAME, '--out', `worlds/${NAME}/smoke`],
    async () => {
      const html = await fs.readFile(path.join(OUT, `${NAME}.html`), 'utf8').catch(() => '');
      if (!html) return 'no html written';
      // Only things that would actually hit the network at run time. A namespace URI
      // (w3.org/1999/xhtml) and the paper citations inside three's source are not fetches.
      const fetches = [
        [/<script[^>]+src=["']https?:/i, 'external <script src>'],
        [/<link[^>]+href=["']https?:/i, 'external <link href>'],
        [/\bfetch\s*\(\s*["'`]https?:/i, 'a runtime fetch()'],
        [/\bimport\s*\(\s*["'`](?!data:|blob:)[^"'`]*["'`]\s*\)/, 'a dynamic import of a path'],
        [/<script[^>]+type=["']importmap/i, 'an import map (means bare specifiers survived)'],
      ].filter(([re]) => re.test(html)).map(([, what]) => what);
      return fetches.length ? `bundle still loads ${fetches.join(', ')}` : null;
    });
} finally {
  await fs.rm(path.join(ROOT, 'worlds', NAME), { recursive: true, force: true });
  await fs.rm(OUT, { recursive: true, force: true });
  await run(['harness/catalog.mjs'], 'catalog');
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} steps ok`);
process.exit(failed.length ? 1 : 0);
