// export.mjs — one world, one HTML file you can double-click.
//
//   node harness/export.mjs <world>               # -> worlds/<world>/<world>.html
//   node harness/export.mjs --all                 # every module world
//   node harness/export.mjs <world> --out ~/Desktop
//
// Everything is inlined: three, the runtime, the world's own modules, world.json, and —
// when the world uses CSG — manifold.wasm as base64. `file://` forbids fetch, so anything
// left un-inlined would either fail loudly or, worse, degrade silently (a rounded box
// quietly becoming a plain box). Nothing is fetched at runtime.
//
// This is a share/archive artifact, not the dev loop: development stays zero-build
// (serve.mjs + import map). esbuild is a devDependency and never touches runtime/.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
    const missing = [];
    for (const w of modules) {
      const file = path.join(ROOT, 'worlds', w.path, `${w.path}.html`);
      if (!(await fs.stat(file).catch(() => null))) missing.push(w.path);
    }
    if (missing.length) {
      console.error(`no exported bundle for: ${missing.join(', ')}\n`
        + `run: node harness/export.mjs --all`);
      process.exit(1);
    }
    console.log(`all ${modules.length} module worlds have a bundle`);
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
  const meta = JSON.parse(await fs.readFile(path.join(ROOT, 'worlds', w.path, 'world.json'), 'utf8'));
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

  const html = shell({ meta, bundle, wasmPrelude });
  const dir = outFlag ? path.resolve(ROOT, outFlag) : path.join(ROOT, 'worlds', w.path);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${w.path}.html`);
  await fs.writeFile(file, html);
  const kb = Math.round(Buffer.byteLength(html) / 1024);
  return `${path.relative(ROOT, file)}  (${kb} KB${wasmPrelude ? ', csg inlined' : ''})`;
}

function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

function shell({ meta, bundle, wasmPrelude }) {
  const title = `${meta.title || meta.name} — Makone`;
  return `<!doctype html>
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

