// create.mjs — scaffold a module world at worlds/<name>/ and refresh the catalog.
//
//   node harness/create.mjs <name> [--type scene|game|object] [--brief "..."]
//
// No capability flag: capabilities are not declared, they are probed from what main.js
// implements (docs/architecture.md D6). Implement seekTo and you have a timeline.
//
// Names are single words (no hyphens/underscores).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const name = args[0];
if (!name || !/^[a-z0-9]+$/.test(name)) {
  console.error('usage: node harness/create.mjs <one-word-name> [--type scene|game|object]'
    + ' [--brief "..."] [--key natural|low|high]');
  process.exit(1);
}
const opt = (flag, dflt) => { const i = args.indexOf(flag); return i > 0 ? args[i + 1] : dflt; };
const type = opt('--type', 'scene');
if (!['scene', 'game', 'object'].includes(type)) { console.error(`unknown type "${type}"`); process.exit(1); }
const brief = opt('--brief', '');
// The lighting key is scaffolded as `natural` on purpose, so leaving it dark is a decision you
// have to make and write down rather than one you drift into (skills/world/SKILL.md step 3).
const key = opt('--key', 'natural');
if (!['natural', 'low', 'high'].includes(key)) { console.error(`unknown key "${key}"`); process.exit(1); }
const dir = path.join(ROOT, 'worlds', name);

await fs.mkdir(dir, { recursive: false }).catch(() => { console.error(`worlds/${name} already exists`); process.exit(1); });

await fs.writeFile(path.join(dir, 'world.json'), JSON.stringify({
  name, title: name[0].toUpperCase() + name.slice(1), type, format: 'module',
  entry: 'main.js', brief, key,
  budget: { tris: 300000, drawCalls: 300 },
}, null, 2) + '\n');

await fs.writeFile(path.join(dir, 'main.js'), `import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default function createWorld(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Blocking starts neutral and mid-range: grey masses you can actually read, and a frame
  // that satisfies the natural key it declares. Darkness is a decision you make later,
  // on purpose — not the state you inherit from the scaffold.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6f7684);
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 500);
  camera.position.set(6, 4, 8);
  const controls = new OrbitControls(camera, renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a1410, 0.8));
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.4);
  sun.position.set(5, 8, 3);
  scene.add(sun);
  const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0x8899ff, roughness: 0.6 }));
  box.position.y = 1;
  scene.add(box);
  scene.add(new THREE.Mesh(new THREE.CircleGeometry(12).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 1 })));

  return {
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getCanvas: () => renderer.domElement,
    getOrbitControls: () => controls,
    resize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    },
    renderFrame(dt) {
      box.rotation.y += dt * 0.5;
      renderer.render(scene, camera);
    },
    dispose() {
      renderer.dispose();
      scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    },
  };
}
`);


await import('./catalog.mjs');   // regenerates worlds/index.json
console.log(`created worlds/${name}/  (type: ${type})`);
console.log(`next: node harness/capture.mjs ${name}`);
