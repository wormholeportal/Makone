// fittings — bridge, tailpiece and its gut, the chinrest, and the four strings that tie the whole
// instrument together.
// Datum: mounted. The bridge stands at Z.bridge (derived from the string length), and the strings
// run from its curve to the pegs.
import * as THREE from 'three';
import { BRIDGE, NUT, FITTINGS, SCALE, BODY, NECK, Z, PALETTE } from '../params.js';

export const params = FITTINGS;
export const datum = 'mounted';

export const inventory = [
  `bridge ${BRIDGE.h * 1000}mm tall at z = ${Math.round(Z.bridge * 1000)}mm — the position the `
    + `${SCALE.vibrating * 1000}mm string length puts it at, with its feet on the belly's arch`,
  `four strings ${BRIDGE.spacing * 1000}mm apart at the bridge and ${NUT.spacing * 1000}mm at the `
    + `nut, all sitting on ONE ${BRIDGE.radius * 1000}mm curve`,
  'the two lower strings are wound and the E is plain steel — a violin whose strings are all the '
    + 'same colour reads as a toy',
  `tailpiece ${params.tailLen * 1000}mm of ebony on a gut loop over the saddle`,
  `chinrest ${params.chinW * 1000}mm clamped over the lower bout, left of the tailpiece`,
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'fittings';

  const ebony = new THREE.MeshPhysicalMaterial({
    color: PALETTE.ebony, roughness: 0.24, metalness: 0.04, clearcoat: 0.8, clearcoatRoughness: 0.18 });
  const maple = new THREE.MeshStandardMaterial({ color: 0xd8b47a, roughness: 0.42 });
  const plain = new THREE.MeshStandardMaterial({ color: PALETTE.string, roughness: 0.22, metalness: 0.9 });
  const wound = new THREE.MeshStandardMaterial({ color: PALETTE.stringWound, roughness: 0.32, metalness: 0.85 });
  const gut = new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 0.7 });

  const bellyY = BODY.archBack + BODY.ribH;
  const bridgeFoot = bellyY + BODY.archTop * 0.72;          // the arch under the bridge's feet

  // ---- the bridge: an outline with the two heart cut-outs and the feet ----
  const s = new THREE.Shape();
  const W = BRIDGE.w / 2, H = BRIDGE.h;
  s.moveTo(-W, 0);
  s.lineTo(-W, H * 0.20);
  s.quadraticCurveTo(-W * 0.80, H * 0.42, -W * 0.62, H * 0.52);
  s.quadraticCurveTo(-W * 0.40, H * 0.88, 0, H);
  s.quadraticCurveTo(W * 0.40, H * 0.88, W * 0.62, H * 0.52);
  s.quadraticCurveTo(W * 0.80, H * 0.42, W, H * 0.20);
  s.lineTo(W, 0);
  s.lineTo(W * 0.62, 0);
  s.lineTo(W * 0.62, H * 0.16);
  s.quadraticCurveTo(W * 0.30, H * 0.30, W * 0.22, H * 0.55);
  s.quadraticCurveTo(0, H * 0.60, -W * 0.22, H * 0.55);
  s.quadraticCurveTo(-W * 0.30, H * 0.30, -W * 0.62, H * 0.16);
  s.lineTo(-W * 0.62, 0);
  s.closePath();
  const bridge = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, { depth: BRIDGE.t, bevelEnabled: false, curveSegments: 16 }), maple);
  bridge.position.set(0, bridgeFoot, Z.bridge + BRIDGE.t / 2);
  bridge.castShadow = true;
  g.add(bridge);

  // ---- where each string crosses the bridge and the nut: one curve, four seats (rule 2) ----
  const seat = (i, spacing, radius, baseY, z) => {
    const x = (i - (BRIDGE.strings - 1) / 2) * spacing;
    const y = baseY - (radius - Math.sqrt(radius * radius - x * x));
    return new THREE.Vector3(x, y, z);
  };
  const nutY = BODY.archBack + BODY.ribH + BODY.archTop * 0.55 + 0.0140 + NUT.h * 0.6;

  // ---- tailpiece ----
  const tailZ = -BODY.len / 2 + 0.0620;
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(p.tailW, p.tailT, p.tailLen), ebony);
  tail.position.set(0, bellyY + BODY.archTop * 0.42, tailZ - p.tailLen * 0.16);
  tail.rotation.x = -0.10;
  tail.scale.set(1, 1, 1);
  tail.castShadow = true;
  g.add(tail);
  const loop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0016, 0.0016, p.tailGut, 8).rotateX(Math.PI / 2), gut);
  loop.position.set(0, bellyY + BODY.archTop * 0.30, -BODY.len / 2 + 0.0130);
  g.add(loop);

  // ---- the strings ----
  for (let i = 0; i < BRIDGE.strings; i++) {
    const atBridge = seat(i, BRIDGE.spacing, BRIDGE.radius, bridgeFoot + BRIDGE.h, Z.bridge);
    const atNut = seat(i, NUT.spacing, NUT.radius, nutY, Z.nut);
    const atTail = new THREE.Vector3(
      (i - 1.5) * 0.0075, bellyY + BODY.archTop * 0.42 + p.tailT * 0.5, tailZ - p.tailLen * 0.62);
    const mat = i === 3 ? plain : wound;
    const run = (a, b, r) => {
      const d = b.clone().sub(a);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), mat);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      m.castShadow = true;
      return m;
    };
    const r = p.stringR * (i === 3 ? 0.8 : 1 + (2 - i) * 0.22);
    g.add(run(atTail, atBridge, r), run(atBridge, atNut, r));
    // and on past the nut into the pegbox, where the peg winds it
    const pegSide = i % 2 ? 1 : -1;
    const atPeg = new THREE.Vector3(pegSide * 0.0070,
      nutY + 0.0060, Z.nut + 0.020 + i * 0.017);
    g.add(run(atNut, atPeg, r * 0.9));
  }

  // ---- chinrest, over the lower bout to the left of the tailpiece ----
  const chin = new THREE.Group();
  chin.position.set(-0.0380, bellyY + BODY.archTop * 0.55, -BODY.len / 2 + 0.0480);
  const cup = new THREE.Mesh(
    new THREE.SphereGeometry(p.chinW * 0.52, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), ebony);
  cup.scale.set(1, 0.34, 0.72);
  cup.position.y = 0.0060;
  cup.castShadow = true;
  chin.add(cup);
  for (const dx of [-0.0230, 0.0230]) {
    const clamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0035, 0.0035, 0.0280, 12), ebony);
    clamp.position.set(dx, -0.0090, -0.0100);
    chin.add(clamp);
  }
  g.add(chin);

  return g;
}
