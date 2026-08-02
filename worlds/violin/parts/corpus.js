// corpus — the belly, the back, the ribs between them, the purfling round both, and the f-holes.
// Datum: y=0 is the table; the instrument lies on its back, so the back's crown rests on it and
// the belly faces up. +Z is the neck end.
import * as THREE from 'three';
import { BODY, FHOLE, Z, PALETTE } from '../params.js';
import { plateGeo, ribGeo, outlineShape } from '../outline.js';

export const params = BODY;

export const inventory = [
  `${Math.round(params.len * 1000)}mm body: ${params.upper * 2000}mm across the upper bout, `
    + `${params.waist * 2000}mm at the waist, ${params.lower * 2000}mm at the lower — with the two `
    + 'pairs of corners a violin is nothing without',
  `the plates are ARCHED, ${params.archTop * 1000}mm on the belly and ${params.archBack * 1000}mm `
    + `on the back, lofted in ${params.rings} rings from the outline itself`,
  `ribs ${params.ribH * 1000}mm standing on a 98.5% outline, so the plates overhang them`,
  'purfling: a black line inlaid a few millimetres inside the edge, following the same curve',
  `two f-holes ${FHOLE.len * 1000}mm long, their notches on the bridge line at `
    + `z = ${Math.round(Z.bridge * 1000)}mm — that is what the notches are FOR`,
];

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'corpus';

  const spruce = new THREE.MeshPhysicalMaterial({
    color: PALETTE.spruce, roughness: 0.28, metalness: 0.02, clearcoat: 0.9,
    clearcoatRoughness: 0.22, envMapIntensity: 1.0 });
  const maple = new THREE.MeshPhysicalMaterial({
    color: PALETTE.maple, roughness: 0.30, metalness: 0.02, clearcoat: 0.9,
    clearcoatRoughness: 0.24, envMapIntensity: 1.0 });
  const dark = new THREE.MeshStandardMaterial({ color: PALETTE.purfling, roughness: 0.5 });
  const hole = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.95 });

  const backCrown = 0;                                   // it rests on its own arch
  const ribBottom = p.archBack;
  const bellyY = ribBottom + p.ribH;

  // ---- back, ribs, belly ----
  const back = new THREE.Mesh(plateGeo(p.archBack, -1), maple);
  back.position.y = ribBottom;
  back.castShadow = back.receiveShadow = true;
  g.add(back);

  const ribs = new THREE.Mesh(ribGeo(p.ribH), maple);
  ribs.position.y = ribBottom;
  ribs.castShadow = ribs.receiveShadow = true;
  const ribsInner = new THREE.Mesh(ribGeo(p.ribH), maple);
  ribsInner.position.y = ribBottom;
  ribsInner.scale.set(0.985, 1, 0.985);
  ribsInner.material = new THREE.MeshStandardMaterial({
    color: PALETTE.mapleDark, roughness: 0.5, side: THREE.BackSide });
  g.add(ribs, ribsInner);

  const belly = new THREE.Mesh(plateGeo(p.archTop, 1), spruce);
  belly.position.y = bellyY;
  belly.castShadow = belly.receiveShadow = true;
  g.add(belly);

  // ---- purfling: one line just inside each plate's edge ----
  for (const [y, s] of [[bellyY + 0.0012, 0.955], [ribBottom - 0.0012, 0.955]]) {
    const pts = outlineShape(s).getSpacedPoints(120)
      .map((q) => new THREE.Vector3(q.x, 0, q.y));
    const line = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'),
        160, p.purfW * 0.5, 4, true), dark);
    line.position.y = y;
    g.add(line);
  }

  // ---- the f-holes ----
  // Built as what they ARE: two round eyes and the S-shaped slot between them. The first cut was
  // one extruded outline and it read as a keyhole — the eyes have to be circles you can point at.
  //
  // They are dark inlays following the belly's arch, not holes cut through it: the plate is a
  // lofted surface of ~7,000 triangles and cutting two f-curves out of it needs a CSG pass this
  // world does not carry. Said out loud, because from a low angle you can tell.
  const fY = bellyY + p.archTop * 0.86;
  for (const sx of [-1, 1]) {
    const x0 = sx * FHOLE.fromCentre;
    const eye = (dz, r) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.0030, 20), hole);
      m.position.set(x0 + sx * (dz > 0 ? -0.0030 : 0.0030), fY, Z.bridge + dz);
      g.add(m);
    };
    eye(FHOLE.len * 0.5, FHOLE.upperR);
    eye(-FHOLE.len * 0.5, FHOLE.lowerR);
    // the slot: an S from one eye to the other, swept as a flat bar
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const z = Z.bridge + FHOLE.len * (0.5 - t);
      const bend = Math.sin((t - 0.5) * Math.PI) * FHOLE.waist * 2.2;
      pts.push(new THREE.Vector3(x0 + sx * bend, fY, z));
    }
    const slot = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 40, 0.0026, 6, false),
      hole);
    slot.scale.y = 0.5;
    g.add(slot);
    // the notch that marks the bridge line, cut into the inner edge
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.0090, 0.0025, 0.0026), hole);
    notch.position.set(x0 - sx * 0.0050, fY, Z.bridge);
    g.add(notch);
  }

  // ---- the button and the endpin at the bottom block ----
  const button = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0090, 0.0090, 0.0060, 20).rotateX(Math.PI / 2), maple);
  button.position.set(0, ribBottom + p.ribH * 0.5, -p.len / 2 - 0.0020);
  g.add(button);
  const endpin = new THREE.Mesh(
    new THREE.LatheGeometry([
      [0, 0], [0.0038, 0], [0.0060, 0.0060], [0.0052, 0.0110], [0, 0.0120],
    ].map(([r, y]) => new THREE.Vector2(r, y)), 20).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: PALETTE.ebony, roughness: 0.35 }));
  endpin.position.set(0, ribBottom + p.ribH * 0.5, -p.len / 2 - 0.0010);
  g.add(endpin);

  return g;
}
