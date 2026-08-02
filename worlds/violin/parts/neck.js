// neck — the maple neck and its heel, the ebony fingerboard, the nut, the pegbox with four pegs,
// and the scroll.
// Datum: mounted. Everything is measured from Z.nut and Z.bodyTop, which params derived from the
// 328mm string length.
import * as THREE from 'three';
import { NECK, SCALE, NUT, BODY, Z, PALETTE } from '../params.js';
import { bentTube } from '/runtime/forms.js';

export const params = NECK;
export const datum = 'mounted';

export const inventory = [
  `the neck stop is ${SCALE.neckStop * 1000}mm — nut to the body's edge — which with the `
    + `${SCALE.bodyStop * 1000}mm body stop makes the ${SCALE.vibrating * 1000}mm string`,
  `fingerboard ${SCALE.fingerboard * 1000}mm of ebony, ${SCALE.fbWidthNut * 1000}mm at the nut `
    + `widening to ${SCALE.fbWidthEnd * 1000}mm, and CAMBERED across at the nut's own radius`,
  `pegbox ${params.pegboxL * 1000}mm with four pegs, two a side, alternating`,
  `a scroll: a volute swept round ${Math.round(1.6 * 360)}° of a spiral, not a ball on a stick`,
  'the heel drops into the body\'s top block, which is the joint that carries all the tension',
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'neck';

  const maple = new THREE.MeshPhysicalMaterial({
    color: PALETTE.maple, roughness: 0.30, metalness: 0.02, clearcoat: 0.9, clearcoatRoughness: 0.24 });
  // A clearcoat over black is what varnish looks like on the RIBS; on a 270mm fingerboard facing
  // the key light it turns the whole board white. Ebony is polished, not varnished.
  const ebony = new THREE.MeshStandardMaterial({
    color: PALETTE.ebony, roughness: 0.38, metalness: 0.06, envMapIntensity: 0.7 });
  const bone = new THREE.MeshStandardMaterial({ color: PALETTE.bone, roughness: 0.45 });

  const neckY = BODY.archBack + BODY.ribH + BODY.archTop * 0.55;   // the neck leaves the top block here

  // ---- the neck: a tapered shaft from the heel to the pegbox ----
  const shaft = bentTube([
    [0, neckY - 0.0040, Z.bodyTop - 0.0120],
    [0, neckY + 0.0060, Z.bodyTop + SCALE.neckStop * 0.45],
    [0, neckY + 0.0140, Z.nut - 0.0060],
  ], p.rootT * 0.5, maple, { seg: 24, radial: 16 });
  g.add(shaft);
  const heel = new THREE.Mesh(
    new THREE.CylinderGeometry(p.rootW * 0.62, p.rootW * 0.40, p.heelDrop, 20).rotateX(-0.5), maple);
  heel.position.set(0, neckY - p.heelDrop * 0.42, Z.bodyTop - 0.0080);
  heel.castShadow = true;
  g.add(heel);

  // ---- fingerboard: tapered, and cambered across at the nut's radius ----
  const fb = new THREE.Group();
  fb.name = 'fingerboard';
  const N = 22;
  const pos = [];
  const camber = (x, w) => NUT.radius - Math.sqrt(Math.max(0, NUT.radius ** 2 - x * x)) - (NUT.radius - Math.sqrt(Math.max(0, NUT.radius ** 2 - (w / 2) ** 2)));
  const ring = (t) => {
    const z = Z.nut - t * SCALE.fingerboard;
    const w = SCALE.fbWidthNut + (SCALE.fbWidthEnd - SCALE.fbWidthNut) * t;
    const y = neckY + 0.0140 + t * 0.0090;               // it rises toward the bridge
    const out = [];
    for (let i = 0; i <= 8; i++) {
      const x = -w / 2 + (w * i) / 8;
      out.push([x, y - camber(x, w), z]);
    }
    return { pts: out, y, w, z };
  };
  let prev = ring(0);
  for (let k = 1; k <= N; k++) {
    const cur = ring(k / N);
    for (let i = 0; i < 8; i++) {
      const a = prev.pts[i], b = prev.pts[i + 1], c = cur.pts[i + 1], d = cur.pts[i];
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);                      // the playing surface
      // the sides, dropping to the underside
      const drop = SCALE.fbThick;
      if (i === 0) pos.push(a[0], a[1], a[2], d[0], d[1], d[2], d[0], d[1] - drop, d[2],
        a[0], a[1], a[2], d[0], d[1] - drop, d[2], a[0], a[1] - drop, a[2]);
      if (i === 7) pos.push(b[0], b[1], b[2], b[0], b[1] - drop, b[2], c[0], c[1] - drop, c[2],
        b[0], b[1], b[2], c[0], c[1] - drop, c[2], c[0], c[1], c[2]);
      pos.push(a[0], a[1] - drop, a[2], c[0], c[1] - drop, c[2], b[0], b[1] - drop, b[2],
        a[0], a[1] - drop, a[2], d[0], d[1] - drop, d[2], c[0], c[1] - drop, c[2]);
    }
    prev = cur;
  }
  const fbGeo = new THREE.BufferGeometry();
  fbGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fbGeo.computeVertexNormals();
  const board = new THREE.Mesh(fbGeo, ebony);
  board.castShadow = board.receiveShadow = true;
  fb.add(board);
  g.add(fb);

  // ---- the nut ----
  const nut = new THREE.Mesh(
    new THREE.BoxGeometry(NUT.w, NUT.h, NUT.t), bone);
  nut.position.set(0, neckY + 0.0140 + NUT.h * 0.30, Z.nut);
  g.add(nut);

  // ---- pegbox and scroll ----
  const boxY = neckY + 0.0150;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(p.pegboxW, p.pegboxH, p.pegboxL), maple);
  box.position.set(0, boxY + p.pegboxH * 0.20, Z.nut + p.pegboxL / 2 - 0.0040);
  box.castShadow = true;
  g.add(box);
  const cheek = new THREE.Mesh(
    new THREE.BoxGeometry(p.pegboxW - 0.0110, p.pegboxH * 0.62, p.pegboxL - 0.0140),
    new THREE.MeshStandardMaterial({ color: 0x2a1a0d, roughness: 0.7 }));
  cheek.position.set(0, boxY + p.pegboxH * 0.42, Z.nut + p.pegboxL / 2 - 0.0040);
  g.add(cheek);

  // the scroll: a tube swept round a logarithmic spiral, which is what a volute is
  const spiral = [];
  const cz = Z.nut + p.pegboxL + p.scrollR * 0.35;
  const cy = boxY + p.pegboxH * 0.30;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * Math.PI * 3.2;
    const r = p.scrollR * (1 - 0.62 * t);
    spiral.push([0, cy + Math.cos(a) * r * 0.92 + p.scrollR * 0.30, cz + Math.sin(a) * r]);
  }
  g.add(bentTube(spiral, 0.0075, maple, { seg: 60, radial: 12 }));
  const throat = new THREE.Mesh(
    new THREE.BoxGeometry(p.pegboxW * 0.92, 0.0150, 0.0260), maple);
  throat.position.set(0, cy - p.scrollR * 0.20, cz - p.scrollR * 0.55);
  g.add(throat);

  // ---- four pegs, two a side, alternating ----
  const pegAt = [[-1, 0.020], [1, 0.036], [-1, 0.056], [1, 0.072]];
  for (const [sx, dz] of pegAt) {
    const peg = new THREE.Group();
    peg.position.set(sx * (p.pegboxW / 2 - 0.0020), boxY + p.pegboxH * 0.34, Z.nut + dz);
    const shank = new THREE.Mesh(
      new THREE.CylinderGeometry(p.pegR * 0.72, p.pegR, p.pegLen, 14).rotateZ(Math.PI / 2), ebony);
    shank.position.x = sx * p.pegLen * 0.30;
    peg.add(shank);
    const head = new THREE.Mesh(
      new THREE.LatheGeometry([
        [0, 0], [p.pegHeadR * 0.5, 0], [p.pegHeadR, 0.0040], [p.pegHeadR * 0.92, 0.0090],
        [p.pegHeadR * 0.34, 0.0110], [0, 0.0110],
      ].map(([r, y]) => new THREE.Vector2(r, y)), 18).rotateZ(sx * -Math.PI / 2), ebony);
    head.position.x = sx * (p.pegLen * 0.30 + p.pegLen * 0.5);
    head.castShadow = true;
    peg.add(head);
    g.add(peg);
  }

  return g;
}
