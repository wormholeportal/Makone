// sheet.mjs — compose images + facts into ONE picture.
//
// Both review paths land here: inspect.mjs (one part, four viewpoints, facts table) and
// capture.mjs --ref (a whole world beside a reference). One image per review keeps looking
// cheap, and a reference sitting in the same frame beats comparing against memory.
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * @param {object} o
 * @param {string} o.outDir        directory the sheet is written into (image srcs resolve from here)
 * @param {string} o.title         header line
 * @param {{label:string, file:string}[]} o.cells     images, in reading order
 * @param {Array<{table?:[string,string][], title?:string, items?:string[], tone?:string}>} [o.blocks]
 * @param {number} [o.cellWidth]   px width of one cell in the grid
 * @param {number} [o.aspect]      cell aspect (w/h); images letterbox inside it so a reference
 *                                 photo of a different shape does not stretch the rows
 * @returns {Promise<string>} path to the written png
 */
export async function composeSheet({ outDir, title, cells, blocks = [], cellWidth = 900, aspect = 1.5, file = 'sheet.png' }) {
  const { chromium } = await import('playwright');
  const dir = path.resolve(outDir);                 // callers pass relative paths; file:// needs absolute
  const src = (f) => path.relative(dir, path.resolve(f)).split(path.sep).join('/');

  const blockHtml = (b) => {
    if (b.table) return `<table>${b.table
      .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
    if (!b.items?.length) return '';
    return `<div class="${b.tone || ''}"><b>${b.title}</b><ul>${
      b.items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`;
  };

  const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin:0; background:#0d1117; color:#c9d1d9;
         font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace; }
  h1 { font-size:14px; margin:10px 12px 6px; color:#e6edf3; font-weight:600; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; padding:0 6px; }
  figure { margin:0; position:relative; aspect-ratio:${aspect}; background:#161b22; }
  img { width:100%; height:100%; display:block; object-fit:contain; }
  figcaption { position:absolute; left:6px; top:6px; padding:2px 7px; border-radius:3px;
               background:rgba(13,17,23,.78); color:#e6edf3; letter-spacing:.09em; font-size:11px; }
  .facts { display:flex; gap:22px; padding:10px 12px 14px; flex-wrap:wrap; align-items:flex-start; }
  table { border-collapse:collapse; }
  td { padding:1px 12px 1px 0; vertical-align:top; }
  td:first-child { color:#8b949e; }
  .bad { color:#ff7b72; } .warn { color:#e3b341; } .ok { color:#7ee787; }
  ul { margin:0; padding-left:16px; }
  </style>
  <h1>${title}</h1>
  <div class="grid">${cells.map((c) =>
    `<figure><img src="${src(c.file)}"><figcaption>${c.label}</figcaption></figure>`).join('')}</div>
  <div class="facts">${blocks.map(blockHtml).join('')}</div>`;

  // The html is scaffolding for the screenshot, not an artifact. It used to be left behind,
  // silting up every world's shots/ with files nobody reads — so it goes out with the browser,
  // in a finally, even when the shot itself throws.
  const htmlPath = path.join(dir, file.replace(/\.png$/, '.html'));
  await fs.writeFile(htmlPath, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: cellWidth * 2 + 18, height: 400 } });
    await page.goto(`file://${htmlPath}`);
    const out = path.join(dir, file);
    await page.screenshot({ path: out, fullPage: true });
    return out;
  } finally {
    await browser.close();
    await fs.rm(htmlPath, { force: true });
  }
}
