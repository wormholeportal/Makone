// export.mjs — one world, one HTML file you can double-click.
//
//   node harness/export.mjs <world>               # -> worlds/<world>/<world>.html
//   node harness/export.mjs --all                 # every module world
//   node harness/export.mjs <world> --out ~/Desktop
//   node harness/export.mjs --check              # gate: every module world has a bundle, and
//                                                #   every bundle matches the source beside it
//
// Everything is inlined: three, the runtime, the world's own modules, world.json, and —
// when the world uses CSG — manifold.wasm as base64. `file://` forbids fetch, so anything
// left un-inlined would either fail loudly or, worse, degrade silently (a rounded box
// quietly becoming a plain box). Nothing is fetched at runtime.
//
// This is a share/archive artifact, not the dev loop: development stays zero-build
// (serve.mjs + import map). esbuild is a devDependency and never touches runtime/.
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Hoisted above the `await cli()` below, which would otherwise hit them in the TDZ.
const SKIP_DIRS = new Set(['shots', 'refs', 'node_modules']);
const SKIP_FILES = new Set(['pilot.js']);
const STAMP = /<!-- makone:src ([0-9a-f]+) -->/;

// Run as a script, or imported for its exportWorld(). verify.mjs imports it, so the CLI must not
// fire on import — hence the main-module guard instead of top-level statements.
const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) await cli();

async function cli() {
  const args = process.argv.slice(2);
  const opt = (flag, dflt) => { const i = args.indexOf(flag); return i > 0 ? args[i + 1] : dflt; };
  // No --out: the export lands in the world's own directory, next to the source it was built
  // from. Pass --out to send it somewhere else (a desktop, a release folder).
  const outFlag = opt('--out', null);
  const { worlds } = JSON.parse(await fs.readFile(path.join(ROOT, 'worlds/index.json'), 'utf8'));
  const modules = worlds.filter((w) => w.format === 'module');

  // --check is the gate: a module world with no bundle beside it is a world nobody outside this
  // repo can open. It exists because ten of them were built, reviewed and committed without one,
  // and nothing said a word (the workflow already told me to export — nothing enforced it).
  if (args.includes('--check')) {
    // "Has a bundle" was only half the gate. A bundle is built from source and then the source
    // keeps moving: edit main.js, skip verify, commit, and the .html beside it silently becomes
    // a picture of an older world. Every bundle now carries a hash of the sources it was built
    // from, so the gate can tell the difference between absent and stale.
    const missing = [];
    const stale = [];
    const unstamped = [];
    for (const w of modules) {
      const dir = path.join(ROOT, 'worlds', w.path);
      const file = path.join(dir, `${w.path}.html`);
      if (!(await fs.stat(file).catch(() => null))) { missing.push(w.path); continue; }
      const stamped = await readStamp(file);
      if (!stamped) unstamped.push(w.path);
      else if (stamped !== await sourceHash(dir)) stale.push(w.path);
    }
    const bad = [];
    if (missing.length) bad.push(`no exported bundle for: ${missing.join(', ')}`);
    if (stale.length) bad.push(`bundle is older than its source for: ${stale.join(', ')}`);
    if (bad.length) {
      console.error(`${bad.join('\n')}\nrun: node harness/export.mjs --all`);
      process.exit(1);
    }
    console.log(`all ${modules.length} module worlds have a bundle`
      + (unstamped.length
        ? `\n${unstamped.length} built before this check existed and carry no source stamp `
          + `(${unstamped.join(', ')}) — one \`node harness/export.mjs --all\` arms them`
        : ', and every one matches its source'));
    return;
  }

  const wanted = args.includes('--all') ? modules
    : worlds.filter((w) => w.path === (args[0] || '').replace(/^worlds\//, '').replace(/\/$/, ''));

  if (!wanted.length) {
    console.error('usage: node harness/export.mjs <world>|--all|--check [--out dir]\n'
      + `module worlds: ${modules.map((w) => w.path).join(', ')}`);
    process.exit(1);
  }
  for (const w of wanted) {
    if (w.format !== 'module') {
      console.error(`"${w.path}" is format "${w.format}" — page worlds are already self-contained, `
        + `classic ones need the v1 toolkit; only module worlds export`);
      process.exit(1);
    }
  }
  for (const w of wanted) console.log(await exportWorld(w, outFlag));
}

// ---------------------------------------------------------------------------

/** Bundle one world into a single HTML file. Returns the one-line report.
 *  @param {{path: string}} w  a row from worlds/index.json (only `.path` is read) */
export async function exportWorld(w, outFlag = null) {
  const srcDir = path.join(ROOT, 'worlds', w.path);
  const meta = JSON.parse(await fs.readFile(path.join(srcDir, 'world.json'), 'utf8'));
  const entry = `/worlds/${w.path}/${meta.entry || 'main.js'}`;

  const esbuild = await import('esbuild');
  const { outputFiles } = await esbuild.build({
    stdin: {
      contents: `import createWorld from '${entry}';\nwindow.__createWorld = createWorld;\n`,
      resolveDir: ROOT,
      sourcefile: `${w.path}-entry.js`,
    },
    bundle: true, write: false, format: 'esm', platform: 'browser',
    target: 'es2022', minify: true, legalComments: 'none',
    external: ['node:module'],                    // manifold probes for node; the branch never runs
    // Bare specifiers that play.html serves through its import map. Real packages (three,
    // manifold-3d, mannequin-js, rapier) esbuild finds in node_modules on its own; `makone/game`
    // is repo-internal and has to be spelled out, or --all dies on every game world.
    alias: { 'makone/game': path.join(ROOT, 'runtime/game/index.js') },
    plugins: [{
      name: 'repo-root',                          // worlds import '/runtime/...' — root-absolute, not FS-absolute
      setup(build) {
        build.onResolve({ filter: /^\/(runtime|worlds)\// }, (a) => ({ path: path.join(ROOT, a.path) }));
      },
    }],
  });
  const bundle = outputFiles[0].text;

  // manifold fetches its wasm relative to itself; under file:// that fails and every CSG
  // helper degrades. Inline the binary and hand it over through a global.
  let wasmPrelude = '';
  if (/manifold/i.test(bundle)) {
    const wasm = await fs.readFile(path.join(ROOT, 'node_modules/manifold-3d/manifold.wasm'));
    wasmPrelude = `<script>window.__MANIFOLD_WASM=Uint8Array.from(atob("${wasm.toString('base64')}"),`
      + `c=>c.charCodeAt(0)).buffer;</script>\n`;
  }

  const html = shell({ meta, bundle, wasmPrelude, stamp: await sourceHash(srcDir) });
  const dir = outFlag ? path.resolve(ROOT, outFlag) : path.join(ROOT, 'worlds', w.path);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${w.path}.html`);
  await fs.writeFile(file, html);
  const kb = Math.round(Buffer.byteLength(html) / 1024);
  return `${path.relative(ROOT, file)}  (${kb} KB${wasmPrelude ? ', csg inlined' : ''})`;
}

function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

/** A fingerprint of everything the bundler could have read out of the world's directory.
 *
 *  `pilot.js` is deliberately excluded: nothing imports it (it may not import the world — see
 *  docs/principles.md E11), so editing it cannot make the bundle wrong, and counting it would
 *  mark every bundle stale every time somebody tuned a bot. `shots/` and `refs/` are review
 *  artifacts. What is NOT covered is `runtime/` — a runtime change ages all 59 bundles at once,
 *  which is true but too noisy to be an actionable gate. */
async function sourceHash(dir) {
  const h = createHash('sha1');
  const walk = async (d, rel = '') => {
    const entries = (await fs.readdir(d, { withFileTypes: true }))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) await walk(path.join(d, e.name), `${rel}${e.name}/`);
        continue;
      }
      if (SKIP_FILES.has(e.name)) continue;
      if (!e.name.endsWith('.js') && e.name !== 'world.json') continue;
      h.update(rel + e.name);
      h.update(await fs.readFile(path.join(d, e.name)));
    }
  };
  await walk(dir);
  return h.digest('hex').slice(0, 12);
}

async function readStamp(file) {
  const fh = await fs.open(file, 'r');
  const buf = Buffer.alloc(256);
  await fh.read(buf, 0, 256, 0);
  await fh.close();
  return buf.toString('utf8').match(STAMP)?.[1] || null;
}

function shell({ meta, bundle, wasmPrelude, stamp }) {
  const title = `${meta.title || meta.name} — Makone`;
  return `<!doctype html>
<!-- makone:src ${stamp} -->
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>
  html, body { margin: 0; height: 100%; background: #05060a; overflow: hidden; }
  #stage { position: fixed; inset: 0; }
  #hud { position: fixed; left: 14px; bottom: 12px; color: #cbd5e1; opacity: .72;
         font: 12px/1.5 ui-monospace, monospace; pointer-events: none; white-space: pre; }
  #err { position: fixed; inset: auto 14px 44px 14px; color: #fca5a5;
         font: 12px ui-monospace, monospace; white-space: pre-wrap; }
  #boot { position: fixed; inset: 0; display: grid; place-items: center; color: #64748b;
          font: 13px ui-monospace, monospace; }
</style>
</head>
<body>
<div id="stage"></div>
<div id="boot">loading ${esc(meta.title || meta.name)}…</div>
<div id="hud"></div>
<div id="err"></div>
${wasmPrelude}<script type="module">
${bundle}
const meta = ${JSON.stringify(meta)};
const stage = document.getElementById('stage');
try {
  const world = await window.__createWorld(stage, meta);
  window.__world = world;                 // so a console (or a harness) can poke at it
  document.getElementById('boot').remove();
  document.getElementById('hud').textContent = meta.name + (meta.brief ? '\\n' + meta.brief : '');
  world.renderFrame(0);
  let last = performance.now();
  const loop = (now) => {
    world.renderFrame(Math.min((now - last) / 1000, 0.05));
    last = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  addEventListener('resize', () => world.resize());
} catch (err) {
  document.getElementById('boot').remove();
  document.getElementById('err').textContent = String(err.stack || err);
  console.error(err);
}
</script>
</body>
</html>
`;
}

