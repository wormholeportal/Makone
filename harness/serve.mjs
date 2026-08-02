// serve.mjs — zero-dependency static dev server for the whole repo.
// CLI:   node harness/serve.mjs [--port 5180]
// Module: import { startServer } from './serve.mjs'
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};

export function startServer({ port = 5180 } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let filePath = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
      if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      let stat = await fs.stat(filePath).catch(() => null);
      if (stat?.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        stat = await fs.stat(filePath).catch(() => null);
      }
      if (!stat) { res.writeHead(404).end('not found: ' + url.pathname); return; }
      const body = await fs.readFile(filePath);
      res.writeHead(200, {
        'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  });
  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, port: server.address().port, root: ROOT }));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[process.argv.indexOf('--port') + 1]) || 5180;
  const { port: p } = await startServer({ port });
  console.log(`Makone serving ${ROOT}`);
  console.log(`  gallery  http://localhost:${p}/`);
  console.log(`  player   http://localhost:${p}/play.html?world=<name>`);
}
