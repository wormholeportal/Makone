// paper — one sheet, curled around the platen and standing up behind it, with a few lines
// already typed on it. The brief in world.json lives here as much as in the brass-work:
// an empty machine is a product shot, a machine with a half-typed sheet is somebody's afternoon.
// Datum: mounted (floor coordinates). Pivot: `freeend` — the sheet feeds up out of the roller.
import * as THREE from 'three';
import { PAPER, PAPER_WRAP, CARRIAGE, PLATEN, PALETTE } from '../params.js';

export const params = PAPER;
export const datum = 'mounted';

const LINES = [
  'the machine is not the point. the sheet is.',
  'MAKONE  —  worlds, made out of code',
  'a b c d e f g 1 2 3 4 5 6 7 8 9 0',
];

export const inventory = [
  `${params.w * 1000}mm sheet, ${CARRIAGE.platenLen * 1000}mm platen — it fits, with `
    + `${Math.round((CARRIAGE.platenLen - params.w) * 500)}mm of roller showing at each end`,
  `wrapped ${PAPER_WRAP.length}° of the roller: from the type point up over top dead centre and `
    + `${params.wrapBack}° down the back`,
  `free end stands ${params.rise * 1000}mm up, leaning ${params.lean}° back`,
  `bowed ${params.bow * 1000}mm at the top, so it reads as paper and not as card`,
  `${LINES.length} typed lines on the front face only, per-character baseline and ink jitter (generated, D4)`,
  'front and back are separate meshes off one geometry, so the typing shows on one side only',
];

/** Typed text, drawn. The jitter is the whole reason this reads as typewriting rather than as
 *  a font: a real machine puts every letter slightly off the baseline and inks it unevenly.
 *  Deterministic (a tiny LCG), so two captures of this world are comparable. */
function sheetTexture(p) {
  const W = 1024, H = Math.round(W * (p.rise / p.w));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#f4f1e8';
  x.fillRect(0, 0, W, H);

  let seed = 20260730;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

  const size = Math.round(W * 0.030);
  x.font = `${size}px ui-monospace, "Courier New", monospace`;
  x.textBaseline = 'alphabetic';
  const lineH = size * 1.75;
  const left = W * 0.13;
  // lines sit at the BOTTOM of the free end: that is where a sheet is, mid-page, when the
  // carriage is halfway across — the most recently typed line is nearest the roller
  let y = H - lineH * 0.9;
  for (const line of LINES) {
    let cx = left;
    for (const ch of line) {
      x.fillStyle = `rgba(38,34,32,${(0.74 + 0.26 * Math.abs(rnd())).toFixed(2)})`;
      x.fillText(ch, cx + rnd() * 1.2, y + rnd() * 1.6);
      cx += size * 0.60;
    }
    y -= lineH;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'sheet';

  const blank = new THREE.MeshStandardMaterial({
    color: PALETTE.paper, roughness: 0.92, side: THREE.DoubleSide });
  // FrontSide + a blank backing sheet, NOT DoubleSide: a double-sided map paints the typed lines
  // on the back of the sheet as well, mirrored, which the back orbit shot caught immediately
  const typed = new THREE.MeshStandardMaterial({
    map: sheetTexture(p), roughness: 0.92, side: THREE.FrontSide });
  const backing = new THREE.MeshStandardMaterial({
    color: PALETTE.paper, roughness: 0.94, side: THREE.BackSide });

  const rad = (d) => (d * Math.PI) / 180;
  const R = CARRIAGE.platenR + 0.0007;                 // hugging the roller, not floating off it

  // ---- the wrapped part: an open partial cylinder about the platen axis ----
  // three's cylinder puts theta=0 at +Z and its axis along +Y; rotating −90° about Z lays the
  // axis along X and leaves the radial direction at theta as (0, −sinθ, cosθ).
  const wrap = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, p.w, 56, 1, true, rad(PAPER_WRAP.start), rad(PAPER_WRAP.length))
      .rotateZ(-Math.PI / 2),
    blank);
  wrap.position.set(0, PLATEN.y, PLATEN.z);
  wrap.castShadow = wrap.receiveShadow = true;
  g.add(wrap);

  // ---- the free end: it leaves the roller where the wrap ends, at the back ----
  const exitDir = new THREE.Vector3(0, -Math.sin(rad(PAPER_WRAP.start)), Math.cos(rad(PAPER_WRAP.start)));
  const exit = new THREE.Vector3(0, PLATEN.y, PLATEN.z).addScaledVector(exitDir, R);

  const freeGeo = new THREE.PlaneGeometry(p.w, p.rise, 1, 16);
  const pos = freeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + p.rise / 2) / p.rise;      // 0 at the roller, 1 at the top edge
    pos.setZ(i, -p.bow * t * t);                        // bow away from the operator, quadratic
  }
  freeGeo.computeVertexNormals();

  const free = new THREE.Mesh(freeGeo, typed);
  free.position.copy(exit).addScaledVector(
    new THREE.Vector3(0, Math.cos(rad(p.lean)), -Math.sin(rad(p.lean))), p.rise / 2);
  free.rotation.x = -rad(p.lean);
  free.castShadow = free.receiveShadow = true;
  const back = new THREE.Mesh(freeGeo, backing);          // same geometry, other side (E4)
  back.position.copy(free.position);
  back.rotation.copy(free.rotation);

  // The free end is its own pivot: the sheet FEEDS — it slides up out of the roller line by line
  // while the wrapped part stays wrapped. main.js drives `freeend` along PAPER_FEED_DIR.
  const freeEnd = new THREE.Group();
  freeEnd.name = 'freeend';
  freeEnd.add(free, back);
  g.add(freeEnd);

  return g;
}
